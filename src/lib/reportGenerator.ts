import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { maskNik } from '@/lib/securityHardening';

// Interface definitions for reports
export interface SecurityReportData {
  auditLogs: Array<{
    id?: string;
    actor_email?: string | null;
    action: string;
    target_user_id?: string | null;
    document_path?: string | null;
    status?: string | null;
    description?: string | null;
    created_at: string;
  }>;
  wazuhAlerts: Array<{
    id?: string;
    signature: string;
    severity: number;
    src_ip?: string;
    dest_ip?: string;
    timestamp: string;
  }>;
  stats: {
    totalLogs: number;
    documentAccessCount: number;
    blockedCount: number;
    highSeverityAlerts: number;
  };
  generatedBy?: string;
}

export interface RecruitmentReportData {
  applications: Array<{
    id: string;
    position: string;
    branch: string;
    province?: string;
    created_at: string;
    updated_at: string;
    status: string;
    admin_notes?: string | null;
    expected_salary?: number;
    education_level?: string;
    work_experience_duration?: string;
    profiles?: {
      full_name?: string | null;
      email?: string | null;
      nik?: string | null;
      whatsapp_number?: string | null;
      residential_address?: string | null;
    } | null;
  }>;
  stats: {
    total: number;
    pending: number;
    interviewing: number;
    offering: number;
    accepted: number;
    rejected: number;
  };
  filters?: {
    branch?: string;
    position?: string;
    month?: string;
    searchTerm?: string;
  };
  generatedBy?: string;
}

// Map severity number to string label
const getSeverityLabel = (sev: number) => {
  if (sev >= 4) return 'CRITICAL';
  if (sev >= 3) return 'HIGH';
  if (sev >= 2) return 'MEDIUM';
  return 'LOW';
};

/**
 * GENERATE SECURITY REPORT - PDF (Printable Styled HTML Window)
 */
export const generateSecurityReportPDF = (data: SecurityReportData) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Pop-up window blocked. Please allow pop-ups for this site.');
    return;
  }

  const currentDate = format(new Date(), 'dd MMMM yyyy, HH:mm:ss');
  const generatedBy = data.generatedBy || 'Administrator';

  const auditLogRowsHtml = data.auditLogs.slice(0, 50).map((log, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${log.created_at ? format(new Date(log.created_at), 'yyyy-MM-dd HH:mm') : '-'}</td>
      <td><strong>${log.actor_email || 'System'}</strong></td>
      <td><span class="badge badge-action">${log.action}</span></td>
      <td>${log.document_path ? log.document_path.split('/').pop() : '-'}</td>
      <td><span class="badge ${log.status === 'blocked' ? 'badge-danger' : 'badge-success'}">${(log.status || 'SUCCESS').toUpperCase()}</span></td>
    </tr>
  `).join('');

  const wazuhAlertRowsHtml = data.wazuhAlerts.slice(0, 50).map((alert, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${alert.timestamp ? format(new Date(alert.timestamp), 'yyyy-MM-dd HH:mm') : '-'}</td>
      <td><strong>${alert.signature}</strong></td>
      <td><span class="badge ${alert.severity >= 3 ? 'badge-danger' : 'badge-warning'}">${getSeverityLabel(alert.severity)} (${alert.severity})</span></td>
      <td>${alert.src_ip || 'N/A'}</td>
      <td>${alert.dest_ip || 'N/A'}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>BYD HAKA AUTO - Security Audit & SIEM Threat Report</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 15mm;
        }
        body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 0;
          font-size: 12px;
          line-height: 1.5;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 3px solid #0284c7;
          padding-bottom: 12px;
          margin-bottom: 20px;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .brand-title {
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: 1px;
        }
        .brand-subtitle {
          font-size: 11px;
          color: #0284c7;
          font-weight: 600;
          text-transform: uppercase;
        }
        .report-meta {
          text-align: right;
          font-size: 10px;
          color: #64748b;
        }
        .report-title {
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 16px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        .stat-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px;
          text-align: center;
        }
        .stat-number {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
        }
        .stat-label {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
          margin-top: 2px;
        }
        .section-header {
          font-size: 13px;
          font-weight: 700;
          color: #0369a1;
          border-bottom: 1px solid #cbd5e1;
          padding-bottom: 4px;
          margin-top: 20px;
          margin-bottom: 10px;
          text-transform: uppercase;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 11px;
        }
        th, td {
          border: 1px solid #e2e8f0;
          padding: 6px 8px;
          text-align: left;
        }
        th {
          background-color: #f1f5f9;
          color: #334155;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 10px;
        }
        tr:nth-child(even) {
          background-color: #f8fafc;
        }
        .badge {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .badge-action { background: #e0f2fe; color: #0369a1; }
        .badge-success { background: #dcfce7; color: #15803d; }
        .badge-danger { background: #fee2e2; color: #b91c1c; }
        .badge-warning { background: #fef3c7; color: #b45309; }

        .hardening-checklist {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 20px;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          padding: 12px;
          border-radius: 6px;
        }
        .checklist-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
        }
        .check-icon {
          color: #16a34a;
          font-weight: bold;
        }

        .footer {
          margin-top: 30px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-top: 1px solid #e2e8f0;
          padding-top: 15px;
          font-size: 10px;
          color: #64748b;
        }
        .signature-box {
          text-align: center;
          width: 180px;
        }
        .signature-space {
          height: 50px;
        }

        @media print {
          .no-print { display: none; }
          body { font-size: 11px; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="background: #0f172a; color: white; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center;">
        <span><strong>Security Audit PDF Report Preview</strong></span>
        <button onclick="window.print()" style="background: #0284c7; color: white; border: none; padding: 8px 16px; border-radius: 4px; font-weight: bold; cursor: pointer;">
          🖨️ Print / Save as PDF
        </button>
      </div>

      <div style="padding: 20px;">
        <div class="header">
          <div class="brand">
            <div>
              <div class="brand-title">BYD HAKA AUTO</div>
              <div class="brand-subtitle">Careers Hub - Security Audit & SIEM Intelligence Report</div>
            </div>
          </div>
          <div class="report-meta">
            <div><strong>Generated On:</strong> ${currentDate}</div>
            <div><strong>Generated By:</strong> ${generatedBy}</div>
            <div><strong>Classification:</strong> CONFIDENTIAL / INTERNAL ONLY</div>
          </div>
        </div>

        <div class="report-title">🛡️ Security Audit & Threat Monitoring Summary</div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">${data.stats.totalLogs}</div>
            <div class="stat-label">Total Audit Logs</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" style="color: #0284c7;">${data.stats.documentAccessCount}</div>
            <div class="stat-label">Document Accesses</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" style="color: #ef4444;">${data.stats.blockedCount}</div>
            <div class="stat-label">Blocked Attempts</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" style="color: #f59e0b;">${data.stats.highSeverityAlerts}</div>
            <div class="stat-label">SIEM High Alerts</div>
          </div>
        </div>

        <div class="section-header">🔐 Security Hardening & Compliance Checklist</div>
        <div class="hardening-checklist">
          <div class="checklist-item"><span class="check-icon">✓</span> NIK Masking Enabled (UU PDP Compliance)</div>
          <div class="checklist-item"><span class="check-icon">✓</span> Temporary Signed URLs (120s Expire Limit)</div>
          <div class="checklist-item"><span class="check-icon">✓</span> Role-Based Access Control (Admin / Recruiter / Candidate)</div>
          <div class="checklist-item"><span class="check-icon">✓</span> Audit Trail Logging (actor_user_id & target tracking)</div>
          <div class="checklist-item"><span class="check-icon">✓</span> Wazuh SIEM Threat Monitoring Active</div>
          <div class="checklist-item"><span class="check-icon">✓</span> Session Inactivity Auto-Timeout (60m Limit)</div>
        </div>

        <div class="section-header">📄 Sensitive Document & Access Audit Logs (Top Recent Events)</div>
        <table>
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th style="width: 110px;">Date & Time</th>
              <th>Actor Email</th>
              <th>Action</th>
              <th>Document Path</th>
              <th style="width: 70px;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${auditLogRowsHtml || '<tr><td colspan="6" style="text-align:center;">No audit log records available.</td></tr>'}
          </tbody>
        </table>

        ${data.wazuhAlerts.length > 0 ? `
          <div class="section-header">🚨 Wazuh SIEM Intrusion & Threat Alerts</div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th style="width: 110px;">Timestamp</th>
                <th>Signature / Threat Description</th>
                <th style="width: 90px;">Severity</th>
                <th style="width: 100px;">Source IP</th>
                <th style="width: 100px;">Dest IP</th>
              </tr>
            </thead>
            <tbody>
              ${wazuhAlertRowsHtml}
            </tbody>
          </table>
        ` : ''}

        <div class="footer">
          <div>
            <div>BYD HAKA Auto Security Intelligence Unit</div>
            <div>Cyber 2 Tower, Jl. H. R. Rasuna Said No.13, Jakarta Selatan</div>
          </div>
          <div class="signature-box">
            <div>Approved By:</div>
            <div class="signature-space"></div>
            <div style="border-top: 1px solid #94a3b8; font-weight: bold; padding-top: 4px;">Head of IT & Security</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    try {
      printWindow.print();
    } catch (e) {
      console.warn("Auto print failed:", e);
    }
  }, 500);
};

/**
 * EXPORT SECURITY REPORT TO EXCEL (.xlsx)
 */
export const exportSecurityReportExcel = async (data: SecurityReportData) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BYD HAKA Auto System';
  workbook.created = new Date();

  // Sheet 1: Audit Logs
  const auditSheet = workbook.addWorksheet('Security Audit Logs');
  auditSheet.columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Timestamp', key: 'timestamp', width: 22 },
    { header: 'Actor Email', key: 'actor_email', width: 28 },
    { header: 'Action', key: 'action', width: 25 },
    { header: 'Target User ID', key: 'target_user_id', width: 30 },
    { header: 'Document Path', key: 'document_path', width: 35 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Description', key: 'description', width: 35 },
  ];

  // Header styling
  auditSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  auditSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0284C7' }, // Sky Blue
  };

  data.auditLogs.forEach((log, index) => {
    auditSheet.addRow({
      no: index + 1,
      timestamp: log.created_at ? format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss') : '-',
      actor_email: log.actor_email || 'System',
      action: log.action,
      target_user_id: log.target_user_id || '-',
      document_path: log.document_path || '-',
      status: (log.status || 'success').toUpperCase(),
      description: log.description || '-',
    });
  });

  // Sheet 2: Wazuh SIEM Alerts
  const siemSheet = workbook.addWorksheet('SIEM Threat Alerts');
  siemSheet.columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: 'Timestamp', key: 'timestamp', width: 22 },
    { header: 'Signature Description', key: 'signature', width: 40 },
    { header: 'Severity Level', key: 'severity_label', width: 15 },
    { header: 'Severity Value', key: 'severity', width: 12 },
    { header: 'Source IP', key: 'src_ip', width: 18 },
    { header: 'Destination IP', key: 'dest_ip', width: 18 },
  ];

  siemSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  siemSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' }, // Dark Slate
  };

  data.wazuhAlerts.forEach((alert, index) => {
    siemSheet.addRow({
      no: index + 1,
      timestamp: alert.timestamp ? format(new Date(alert.timestamp), 'yyyy-MM-dd HH:mm:ss') : '-',
      signature: alert.signature,
      severity_label: getSeverityLabel(alert.severity),
      severity: alert.severity,
      src_ip: alert.src_ip || 'N/A',
      dest_ip: alert.dest_ip || 'N/A',
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  saveAs(blob, `Security_Audit_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};

/**
 * GENERATE RECRUITMENT REPORT - PDF (Printable Styled HTML Window)
 */
export const generateRecruitmentReportPDF = (data: RecruitmentReportData) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Pop-up window blocked. Please allow pop-ups for this site.');
    return;
  }

  const currentDate = format(new Date(), 'dd MMMM yyyy, HH:mm:ss');
  const generatedBy = data.generatedBy || 'HRD Recruiter';

  // Group applications per branch / department for breakdown summary
  const branchMap: Record<string, number> = {};
  data.applications.forEach(app => {
    const b = app.branch || 'Head Office';
    branchMap[b] = (branchMap[b] || 0) + 1;
  });

  const branchBreakdownHtml = Object.entries(branchMap).map(([branch, count]) => `
    <tr>
      <td><strong>${branch}</strong></td>
      <td style="text-align: right;"><strong>${count}</strong> applicants</td>
    </tr>
  `).join('');

  const applicationRowsHtml = data.applications.map((app, idx) => {
    const profile = app.profiles || {};
    const maskedNikVal = profile.nik ? maskNik(profile.nik) : '-';
    return `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${profile.full_name || 'Candidate'}</strong><br><small style="color:#64748b;">NIK: ${maskedNikVal}</small></td>
        <td><strong>${app.position}</strong></td>
        <td>${app.branch}</td>
        <td>${app.education_level || '-'}</td>
        <td><span class="badge badge-status">${(app.status || 'submitted').replace('_', ' ').toUpperCase()}</span></td>
        <td>${app.created_at ? format(new Date(app.created_at), 'yyyy-MM-dd') : '-'}</td>
      </tr>
    `;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>BYD HAKA AUTO - Executive Recruitment Performance Report</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 15mm;
        }
        body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 0;
          font-size: 11px;
          line-height: 1.5;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 3px solid #16a34a;
          padding-bottom: 12px;
          margin-bottom: 20px;
        }
        .brand-title {
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: 1px;
        }
        .brand-subtitle {
          font-size: 11px;
          color: #16a34a;
          font-weight: 600;
          text-transform: uppercase;
        }
        .report-meta {
          text-align: right;
          font-size: 10px;
          color: #64748b;
        }
        .report-title {
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 16px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 8px;
          margin-bottom: 20px;
        }
        .stat-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px;
          text-align: center;
        }
        .stat-number {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
        }
        .stat-label {
          font-size: 9px;
          color: #64748b;
          text-transform: uppercase;
          margin-top: 2px;
        }
        .section-header {
          font-size: 12px;
          font-weight: 700;
          color: #15803d;
          border-bottom: 1px solid #cbd5e1;
          padding-bottom: 4px;
          margin-top: 18px;
          margin-bottom: 10px;
          text-transform: uppercase;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
          font-size: 10px;
        }
        th, td {
          border: 1px solid #e2e8f0;
          padding: 5px 7px;
          text-align: left;
        }
        th {
          background-color: #f1f5f9;
          color: #334155;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 9px;
        }
        tr:nth-child(even) {
          background-color: #f8fafc;
        }
        .badge-status {
          background: #f1f5f9;
          color: #334155;
          padding: 2px 5px;
          border-radius: 3px;
          font-size: 8px;
          font-weight: 700;
        }
        .footer {
          margin-top: 30px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-top: 1px solid #e2e8f0;
          padding-top: 15px;
          font-size: 10px;
          color: #64748b;
        }
        .signature-box {
          text-align: center;
          width: 180px;
        }
        .signature-space {
          height: 45px;
        }
        @media print {
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="background: #0f172a; color: white; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center;">
        <span><strong>Recruitment Performance Report PDF Preview</strong></span>
        <button onclick="window.print()" style="background: #16a34a; color: white; border: none; padding: 8px 16px; border-radius: 4px; font-weight: bold; cursor: pointer;">
          🖨️ Print / Save as PDF
        </button>
      </div>

      <div style="padding: 20px;">
        <div class="header">
          <div>
            <div class="brand-title">BYD HAKA AUTO</div>
            <div class="brand-subtitle">Careers Hub - Executive Recruitment Performance Report</div>
          </div>
          <div class="report-meta">
            <div><strong>Generated On:</strong> ${currentDate}</div>
            <div><strong>Generated By:</strong> ${generatedBy}</div>
            <div><strong>Branch Filter:</strong> ${data.filters?.branch || 'All Branches'}</div>
          </div>
        </div>

        <div class="report-title">📊 Recruitment Pipeline & Funnel Metrics</div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">${data.stats.total}</div>
            <div class="stat-label">Total Applicants</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" style="color: #f59e0b;">${data.stats.pending}</div>
            <div class="stat-label">Screening / Pending</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" style="color: #0284c7;">${data.stats.interviewing}</div>
            <div class="stat-label">Interview Phase</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" style="color: #8b5cf6;">${data.stats.offering}</div>
            <div class="stat-label">Offering / Onboarding</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" style="color: #16a34a;">${data.stats.accepted}</div>
            <div class="stat-label">Accepted / Hired</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" style="color: #ef4444;">${data.stats.rejected}</div>
            <div class="stat-label">Rejected</div>
          </div>
        </div>

        <div class="section-header">🏢 Branch / Dealership Applications Breakdown</div>
        <table style="width: 50%;">
          <thead>
            <tr>
              <th>Dealership Branch</th>
              <th style="text-align: right;">Total Candidates</th>
            </tr>
          </thead>
          <tbody>
            ${branchBreakdownHtml || '<tr><td colspan="2">No branch data available</td></tr>'}
          </tbody>
        </table>

        <div class="section-header">👥 Applicant Summary & Recruitment Status</div>
        <table>
          <thead>
            <tr>
              <th style="width: 25px;">#</th>
              <th>Candidate Name & NIK</th>
              <th>Position Applied</th>
              <th>Branch</th>
              <th>Education</th>
              <th>Current Pipeline Status</th>
              <th style="width: 75px;">Applied Date</th>
            </tr>
          </thead>
          <tbody>
            ${applicationRowsHtml || '<tr><td colspan="7" style="text-align:center;">No candidate data found.</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          <div>
            <div>BYD HAKA Auto Human Capital Division</div>
            <div>Cyber 2 Tower, Jl. H. R. Rasuna Said No.13, Jakarta Selatan</div>
          </div>
          <div class="signature-box">
            <div>Report Approved By:</div>
            <div class="signature-space"></div>
            <div style="border-top: 1px solid #94a3b8; font-weight: bold; padding-top: 4px;">Head of Recruitment & HR</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    try {
      printWindow.print();
    } catch (e) {
      console.warn("Auto print failed:", e);
    }
  }, 500);
};
