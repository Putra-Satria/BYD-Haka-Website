import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, FileText, Building2, Users } from "lucide-react";
import { format } from "date-fns";
import { maskNik } from "@/lib/securityHardening";

export interface RecruitmentReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applications?: Array<{
    id?: string;
    position?: string;
    branch?: string;
    created_at?: string;
    status?: string;
    education_level?: string;
    profiles?: {
      full_name?: string | null;
      nik?: string | null;
    } | null;
  }>;
  stats?: {
    total?: number;
    pending?: number;
    interviewing?: number;
    offering?: number;
    accepted?: number;
    rejected?: number;
  };
  filters?: {
    branch?: string;
    position?: string;
  };
}

export function RecruitmentReportModal({
  open,
  onOpenChange,
  applications = [],
  stats = { total: 0, pending: 0, interviewing: 0, offering: 0, accepted: 0, rejected: 0 },
  filters,
}: RecruitmentReportModalProps) {
  const currentDate = format(new Date(), "dd MMMM yyyy, HH:mm");

  // Group applications per branch safely
  const branchMap: Record<string, number> = {};
  (applications || []).forEach((app) => {
    const b = app?.branch || "Head Office";
    branchMap[b] = (branchMap[b] || 0) + 1;
  });

  const handlePrint = () => {
    const printContent = document.getElementById("recruitment-pdf-report-container");
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>BYD HAKA AUTO - Recruitment Performance Report</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 10px; font-size: 11px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #16a34a; padding-bottom: 10px; margin-bottom: 15px; }
          .brand-title { font-size: 20px; font-weight: 800; color: #0f172a; }
          .brand-subtitle { font-size: 10px; color: #16a34a; font-weight: bold; text-transform: uppercase; }
          .stats-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; margin-bottom: 15px; }
          .stat-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px; text-align: center; }
          .stat-num { font-size: 16px; font-weight: 800; }
          .stat-lbl { font-size: 8px; color: #64748b; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10px; }
          th, td { border: 1px solid #cbd5e1; padding: 5px 6px; text-align: left; }
          th { background: #f1f5f9; font-weight: bold; text-transform: uppercase; font-size: 9px; }
          .footer { margin-top: 25px; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 9px; color: #64748b; }
          .sig-space { height: 40px; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      try {
        printWindow.print();
      } catch (e) {
        console.warn("Print error:", e);
      }
    }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-900 border-slate-800 text-slate-100">
        {/* Top Control Bar */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <DialogTitle className="text-base font-bold text-white">
              PDF Recruitment Performance Report Preview
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4"
            >
              <Printer className="w-4 h-4" />
              Print / Save to PDF
            </Button>
          </div>
        </div>

        {/* Printable Report Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 text-slate-900">
          <div
            id="recruitment-pdf-report-container"
            className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-md border border-slate-200"
          >
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-emerald-600 pb-4 mb-6">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-wider">BYD HAKA AUTO</h1>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
                  Careers Hub - Executive Recruitment Performance Report
                </p>
              </div>
              <div className="text-right text-[10px] text-slate-500 space-y-0.5">
                <div><strong>Generated Date:</strong> {currentDate}</div>
                <div><strong>Branch Filter:</strong> {filters?.branch || "All Dealerships"}</div>
                <div><strong>Classification:</strong> CONFIDENTIAL / INTERNAL ONLY</div>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4">
              📊 Recruitment Funnel Summary & Candidate Metrics
            </h2>

            {/* Stats Cards */}
            <div className="grid grid-cols-6 gap-2 mb-6 text-center">
              <div className="p-2 bg-slate-50 border border-slate-200 rounded-md">
                <div className="text-lg font-black text-slate-900">{stats.total || 0}</div>
                <div className="text-[9px] text-slate-500 font-bold uppercase">Total Applicants</div>
              </div>
              <div className="p-2 bg-amber-50 border border-amber-200 rounded-md">
                <div className="text-lg font-black text-amber-700">{stats.pending || 0}</div>
                <div className="text-[9px] text-amber-600 font-bold uppercase">Screening</div>
              </div>
              <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                <div className="text-lg font-black text-blue-700">{stats.interviewing || 0}</div>
                <div className="text-[9px] text-blue-600 font-bold uppercase">Interview</div>
              </div>
              <div className="p-2 bg-purple-50 border border-purple-200 rounded-md">
                <div className="text-lg font-black text-purple-700">{stats.offering || 0}</div>
                <div className="text-[9px] text-purple-600 font-bold uppercase">Onboarding</div>
              </div>
              <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-md">
                <div className="text-lg font-black text-emerald-700">{stats.accepted || 0}</div>
                <div className="text-[9px] text-emerald-600 font-bold uppercase">Hired</div>
              </div>
              <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                <div className="text-lg font-black text-red-700">{stats.rejected || 0}</div>
                <div className="text-[9px] text-red-600 font-bold uppercase">Rejected</div>
              </div>
            </div>

            {/* Branch Breakdown */}
            <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Applicant Distribution by Dealership Branch
            </h3>
            <table className="w-1/2 mb-6 text-xs">
              <thead>
                <tr className="bg-slate-100">
                  <th className="p-2 text-left">Dealership Branch</th>
                  <th className="p-2 text-right">Applicant Count</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(branchMap).length === 0 ? (
                  <tr><td colSpan={2} className="p-2 text-center text-slate-400">No branch data available</td></tr>
                ) : (
                  Object.entries(branchMap).map(([branch, count]) => (
                    <tr key={branch} className="border-t">
                      <td className="p-2 font-medium">{branch}</td>
                      <td className="p-2 text-right font-bold">{count} applicants</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Candidate List */}
            <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Candidate Data Details & Pipeline Status
            </h3>
            <table className="w-full text-xs mb-6">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="p-2 text-center w-8">#</th>
                  <th className="p-2 text-left">Candidate Name & NIK</th>
                  <th className="p-2 text-left">Applied Position</th>
                  <th className="p-2 text-left">Branch</th>
                  <th className="p-2 text-left">Pipeline Status</th>
                  <th className="p-2 text-left">Applied Date</th>
                </tr>
              </thead>
              <tbody>
                {applications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-slate-400">
                      No candidate data found.
                    </td>
                  </tr>
                ) : (
                  applications.map((app, idx) => (
                    <tr key={app?.id || idx} className="border-t">
                      <td className="p-2 text-center">{idx + 1}</td>
                      <td className="p-2">
                        <div className="font-bold text-slate-900">{app?.profiles?.full_name || "Candidate"}</div>
                        <div className="text-[10px] text-slate-500">NIK: {maskNik(app?.profiles?.nik)}</div>
                      </td>
                      <td className="p-2 font-semibold text-slate-800">{app?.position || "Staff"}</td>
                      <td className="p-2 text-slate-600">{app?.branch || "Head Office"}</td>
                      <td className="p-2">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                          {(app?.status || "submitted").replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-2 text-slate-500">
                        {app?.created_at ? format(new Date(app.created_at), "yyyy-MM-dd") : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Footer Signature */}
            <div className="flex justify-between items-end border-t pt-4 text-[10px] text-slate-500">
              <div>
                <p className="font-bold text-slate-700">BYD HAKA Auto Human Capital Division</p>
                <p>Cyber 2 Tower, Jl. H. R. Rasuna Said No.13, Jakarta Selatan</p>
              </div>
              <div className="text-center w-44">
                <p>Approved By:</p>
                <div className="h-12"></div>
                <p className="font-bold text-slate-900 border-t pt-1">Head of HR & Recruitment</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
