import { useEffect, useMemo, useState } from "react";
import TopNav from "@/components/TopNav";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { supabase } from "@/integrations/supabase/client";
import { getWazuhAlerts, WazuhAlert } from "@/services/wazuhAlertService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle2, FileSearch, Lock, RefreshCw, ShieldCheck, UserCheck } from "lucide-react";

interface SecurityAuditLog {
  id: string;
  created_at: string;
  actor_email: string | null;
  action: string;
  target_user_id: string | null;
  target_application_id: string | null;
  document_path: string | null;
  status: string;
  description: string | null;
  user_agent: string | null;
}

const fallbackLogs: SecurityAuditLog[] = [
  {
    id: "dummy-1",
    created_at: new Date().toISOString(),
    actor_email: "admin@hakaauto.com",
    action: "VIEW_DOCUMENT",
    target_user_id: "applicant-user-id",
    target_application_id: "application-id",
    document_path: "applicant/cv/secure-file.pdf",
    status: "success",
    description: "Admin opened the applicant's document using a 2-minute signed URL.",
    user_agent: "Demo Browser",
  },
  {
    id: "dummy-2",
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    actor_email: "admin@hakaauto.com",
    action: "EXPORT_APPLICATIONS",
    target_user_id: null,
    target_application_id: null,
    document_path: null,
    status: "success",
    description: "Admin exported data with masked NIK.",
    user_agent: "Demo Browser",
  },
];

const hardeningItems = [
  {
    title: "Private Storage for Sensitive Documents",
    desc: "Applicant documents such as CV, certificates, and ID cards are stored in a private bucket so they cannot be accessed using a permanent public URL.",
    icon: Lock,
  },
  {
    title: "Time-limited Signed URL",
    desc: "Admin opens documents through temporary signed URLs. Links expire automatically so they cannot be easily re-shared.",
    icon: ShieldCheck,
  },
  {
    title: "Admin Role-Based Access Control",
    desc: "Security Monitoring, Security Audit pages, and sensitive document access are only available for users with the admin role.",
    icon: UserCheck,
  },
  {
    title: "ID Card NIK Masking",
    desc: "Applicant's NIK is not fully displayed in tables and exports. The system displays a masked format to reduce the risk of personal data leakage.",
    icon: FileSearch,
  },
  {
    title: "File Upload Validation",
    desc: "Document uploads are restricted based on extension, MIME type, file size, and the filename is changed to UUID so the original file name does not leak user identity.",
    icon: CheckCircle2,
  },
  {
    title: "Security Audit Log",
    desc: "Admin activities such as viewing documents, downloading documents, and exporting data are logged to be traceable during security audits.",
    icon: AlertTriangle,
  },
];

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "medium" }).format(date);
}

function statusClass(status: string) {
  if (status === "success") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "blocked") return "bg-red-100 text-red-700 border-red-200";
  return "bg-amber-100 text-amber-700 border-amber-200";
}

function severityBadgeClass(severity: number | string) {
  const value = Number(severity);
  if (value >= 4) return "bg-red-100 text-red-700 border-red-200";
  if (value >= 3) return "bg-orange-100 text-orange-700 border-orange-200";
  if (value >= 2) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-blue-100 text-blue-700 border-blue-200";
}

export default function SecurityAudit() {
  const { loading: roleLoading } = useAdminCheck();
  const [logs, setLogs] = useState<SecurityAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  
  const [wazuhAlerts, setWazuhAlerts] = useState<WazuhAlert[]>([]);
  const [wazuhLoading, setWazuhLoading] = useState(false);
  const [timeRange, setTimeRange] = useState("24h");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase.from("security_audit_logs" as any) as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs((data || []) as SecurityAuditLog[]);
      setUsingFallback(false);
    } catch (error) {
      console.warn("Audit log table not available yet, using demo data:", error);
      setLogs(fallbackLogs);
      setUsingFallback(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuricataAlerts = async () => {
    setWazuhLoading(true);
    try {
      const alerts = await getWazuhAlerts();
      setWazuhAlerts(alerts);
    } catch (error) {
      console.error("Failed to load Wazuh alerts", error);
    } finally {
      setWazuhLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchSuricataAlerts();
  }, []);

  const filteredWazuhAlerts = useMemo(() => {
    const now = new Date().getTime();
    return wazuhAlerts.filter(alert => {
      const alertTime = new Date(alert.timestamp).getTime();
      if (Number.isNaN(alertTime)) return true;
      if (timeRange === "24h") return now - alertTime <= 24 * 60 * 60 * 1000;
      if (timeRange === "7d") return now - alertTime <= 7 * 24 * 60 * 60 * 1000;
      if (timeRange === "30d") return now - alertTime <= 30 * 24 * 60 * 60 * 1000;
      return true;
    });
  }, [wazuhAlerts, timeRange]);


  const stats = useMemo(() => ({
    total: logs.length,
    documentAccess: logs.filter((log) => log.action.includes("DOCUMENT") || log.action.includes("KTP")).length,
    blocked: logs.filter((log) => log.status === "blocked").length,
  }), [logs]);

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <TopNav />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <Skeleton className="h-10 w-80 mb-4" />
          <Skeleton className="h-6 w-96 mb-8" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <TopNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm mb-3">
              <ShieldCheck className="h-4 w-4" />
              Admin Only Access
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Security Hardening & Audit</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              This page shows security controls to prevent leakage of applicant ID cards/documents and logs admin activities for audit purposes.
            </p>
          </div>
          <Button onClick={fetchLogs} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Audit
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">Total Audit Event</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{stats.total}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">Document Access</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-blue-600">{stats.documentAccess}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">Blocked/Failed</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-red-600">{stats.blocked}</div></CardContent>
          </Card>
        </div>

        {usingFallback && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            The <strong>security_audit_logs</strong> table has not been migrated in Supabase, so the page displays demo data. Run the provided SQL migration so real audit logs are stored.
          </div>
        )}

        <Tabs defaultValue="hardening" className="space-y-6">
          <TabsList>
            <TabsTrigger value="hardening">Hardening Control</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
            <TabsTrigger value="suricata">Suricata Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="hardening">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hardeningItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Card key={item.title} className="border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                      <div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></div>
                      <div>
                        <CardTitle className="text-base text-slate-900">{item.title}</CardTitle>
                        <p className="mt-2 text-sm font-normal text-slate-600">{item.desc}</p>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="audit">
            <Card className="overflow-hidden">
              <CardHeader className="border-b bg-white">
                <CardTitle>Security Audit Log</CardTitle>
                <p className="text-sm text-slate-500">Logs document access and sensitive data activities by admins.</p>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          <th className="p-4 text-left">Time</th>
                          <th className="p-4 text-left">Actor</th>
                          <th className="p-4 text-left">Action</th>
                          <th className="p-4 text-left">Status</th>
                          <th className="p-4 text-left">Target</th>
                          <th className="p-4 text-left">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr key={log.id} className="border-t hover:bg-slate-50">
                            <td className="p-4 whitespace-nowrap">{formatTime(log.created_at)}</td>
                            <td className="p-4 whitespace-nowrap">{log.actor_email || "-"}</td>
                            <td className="p-4 font-medium">{log.action}</td>
                            <td className="p-4"><Badge variant="outline" className={statusClass(log.status)}>{log.status}</Badge></td>
                            <td className="p-4 text-xs text-slate-600">
                              <div>App: {log.target_application_id || "-"}</div>
                              <div>User: {log.target_user_id || "-"}</div>
                            </td>
                            <td className="p-4 max-w-md text-slate-600">{log.description || log.document_path || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="suricata">
            <Card className="overflow-hidden">
              <CardHeader className="border-b bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Suricata IDS Alerts</CardTitle>
                  <p className="text-sm text-slate-500">Anomaly detection logs from Suricata via Wazuh.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant={timeRange === "24h" ? "default" : "outline"} size="sm" onClick={() => setTimeRange("24h")}>24h</Button>
                  <Button variant={timeRange === "7d" ? "default" : "outline"} size="sm" onClick={() => setTimeRange("7d")}>7d</Button>
                  <Button variant={timeRange === "30d" ? "default" : "outline"} size="sm" onClick={() => setTimeRange("30d")}>30d</Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {wazuhLoading ? (
                  <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : filteredWazuhAlerts.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No data for the selected time range.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          <th className="p-4 text-left font-semibold">Time</th>
                          <th className="p-4 text-left font-semibold">Signature</th>
                          <th className="p-4 text-left font-semibold">Source</th>
                          <th className="p-4 text-left font-semibold">Severity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredWazuhAlerts.map((alert) => (
                          <tr key={alert.id} className="border-t hover:bg-slate-50">
                            <td className="p-4 whitespace-nowrap">{formatTime(alert.timestamp)}</td>
                            <td className="p-4">
                              <div className="font-medium text-slate-900">{alert.signature}</div>
                              <div className="text-xs text-slate-500 mt-1">{alert.app_proto}</div>
                            </td>
                            <td className="p-4 whitespace-nowrap">{alert.src_ip}</td>
                            <td className="p-4">
                              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${severityBadgeClass(alert.severity)}`}>
                                Level {alert.severity}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
