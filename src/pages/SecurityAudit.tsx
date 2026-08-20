import { useEffect, useMemo, useState } from "react";
import TopNav from "@/components/TopNav";
import { useRoleCheck } from "@/hooks/useRoleCheck";
import { supabase } from "@/integrations/supabase/client";
import { getWazuhAlerts, WazuhAlert } from "@/services/wazuhAlertService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { AlertTriangle, CheckCircle2, FileSearch, Lock, RefreshCw, ShieldCheck, UserCheck, FileText, FileSpreadsheet, Sparkles, Brain, Send, Bot, Loader2 } from "lucide-react";
import { generateSecurityReportPDF, exportSecurityReportExcel } from "@/lib/reportGenerator";
import { analyzeSecurityLogsAI, askSecurityChatAI, SecurityAIAnalysisResult } from "@/services/aiService";

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
    description: "Admin opened candidate document using a 2-minute signed URL.",
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
    description: "Admin performed data export with masked NIK.",
    user_agent: "Demo Browser",
  },
];

const hardeningItems = [
  {
    title: "Private Storage for Sensitive Documents",
    desc: "Applicant documents such as CVs, certificates, and ID cards are stored in private buckets to prevent unauthorized access via public permanent URLs.",
    icon: Lock,
  },
  {
    title: "Time-Limited Signed URLs",
    desc: "Admins access documents via temporary signed URLs that automatically expire to prevent link sharing.",
    icon: ShieldCheck,
  },
  {
    title: "Role-Based Admin Access Control",
    desc: "Security Monitoring, Security Audit, and sensitive document access are strictly restricted to admin users.",
    icon: UserCheck,
  },
  {
    title: "ID Number (NIK) Masking",
    desc: "Applicant NIKs are masked in tables and exports to reduce personal data exposure risks.",
    icon: FileSearch,
  },
  {
    title: "File Upload Validation",
    desc: "Document uploads are strictly validated by extension, MIME type, and size. Filenames are obfuscated with UUIDs.",
    icon: CheckCircle2,
  },
  {
    title: "Security Audit Logs",
    desc: "Admin activities such as viewing or downloading documents and exporting data are recorded for security auditing.",
    icon: AlertTriangle,
  },
];

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "medium" }).format(date);
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
  const { loading: roleLoading } = useRoleCheck({
    allowedRoles: ["admin", "recruiter"],
    deniedToastMessage: "Akses ditolak: Halaman Security Audit khusus untuk Staff Internal (Admin / HRD)."
  });
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
      console.warn("Audit log table not available, using demo data:", error);
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

  // AI Security States
  const [aiAnalysis, setAiAnalysis] = useState<SecurityAIAnalysisResult | null>(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [chatQuery, setChatQuery] = useState("");
  const [chatAnswer, setChatAnswer] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
    fetchSuricataAlerts();
  }, []);

  useEffect(() => {
    if (logs.length > 0 || wazuhAlerts.length > 0) {
      runAiSecurityAnalysis();
    }
  }, [logs.length, wazuhAlerts.length]);

  const runAiSecurityAnalysis = async () => {
    setAiAnalysisLoading(true);
    try {
      const res = await analyzeSecurityLogsAI(logs, wazuhAlerts);
      setAiAnalysis(res);
    } catch (err) {
      console.error("AI Analysis error:", err);
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  const handleSendChatQuery = async (queryToUse?: string) => {
    const text = queryToUse || chatQuery;
    if (!text.trim()) return;
    setChatLoading(true);
    setChatAnswer(null);
    try {
      const ans = await askSecurityChatAI(text, logs.length, wazuhAlerts.length);
      setChatAnswer(ans);
    } catch (err) {
      setChatAnswer("Sistem AI Security sedang sibuk. Silakan coba kembali.");
    } finally {
      setChatLoading(false);
    }
  };

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
              This page demonstrates security controls to prevent candidate data leakage and logs admin activities for audit compliance.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => generateSecurityReportPDF({
                auditLogs: logs,
                wazuhAlerts: wazuhAlerts,
                stats: {
                  totalLogs: stats.total,
                  documentAccessCount: stats.documentAccess,
                  blockedCount: stats.blocked,
                  highSeverityAlerts: wazuhAlerts.filter(a => a.severity >= 3).length
                }
              })}
              className="gap-2 border-primary text-primary hover:bg-primary/10"
            >
              <FileText className="h-4 w-4" />
              Generate PDF Report
            </Button>
            <Button
              variant="outline"
              onClick={() => exportSecurityReportExcel({
                auditLogs: logs,
                wazuhAlerts: wazuhAlerts,
                stats: {
                  totalLogs: stats.total,
                  documentAccessCount: stats.documentAccess,
                  blockedCount: stats.blocked,
                  highSeverityAlerts: wazuhAlerts.filter(a => a.severity >= 3).length
                }
              })}
              className="gap-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Excel
            </Button>
            <Button onClick={fetchLogs} disabled={loading} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* AI Security Intelligence Component */}
        <Card className="mb-8 border-purple-200 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-lg overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-700/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400 border border-purple-500/30">
                  <Brain className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    AI Security Intelligence & Threat Analysis
                    <Badge className="bg-purple-500/30 text-purple-300 border border-purple-400/40 text-[10px]">
                      OLLAMA AI ENABLED
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-slate-300">Automated risk analysis, anomaly detection, & data protection recommendations</p>
                </div>
              </div>
              {aiAnalysis && (
                <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700">
                  <div className="text-right">
                    <div className="text-xs text-slate-400 font-medium">Security Risk Score</div>
                    <div className="text-2xl font-black text-emerald-400">{aiAnalysis.riskScore}/100</div>
                  </div>
                  <Badge className={aiAnalysis.riskScore >= 80 ? "bg-emerald-500 text-white font-bold" : "bg-amber-500 text-white font-bold"}>
                    {aiAnalysis.riskLevel}
                  </Badge>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {aiAnalysisLoading ? (
              <div className="py-6 flex items-center justify-center gap-3 text-slate-300 text-sm">
                <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                <span>AI is analyzing security audit logs & SIEM threat signals...</span>
              </div>
            ) : aiAnalysis ? (
              <div className="space-y-4">
                {/* Executive Summary */}
                <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/80 text-xs text-slate-200 leading-relaxed">
                  <strong className="text-purple-300 block mb-1">📌 AI Security Executive Summary:</strong>
                  {aiAnalysis.executiveSummary}
                </div>

                {/* Mitigations */}
                <div>
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">🛡️ AI Security Mitigation Recommendations:</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {aiAnalysis.mitigations.map((item, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-800/40 rounded-lg border border-slate-700/50 text-[11px] text-slate-300 flex items-start gap-2">
                        <span className="text-purple-400 font-bold">•</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Interactive AI Chat Assistant */}
                <div className="pt-3 border-t border-slate-700/50">
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5 mb-2">
                    <Bot className="w-4 h-4" /> Ask AI Security Assistant:
                  </span>

                  {/* Suggestion Chips */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <button
                      onClick={() => { setChatQuery("Is there any NIK data leakage today?"); handleSendChatQuery("Is there any NIK data leakage today?"); }}
                      className="text-[10px] bg-purple-950/60 hover:bg-purple-900 text-purple-200 border border-purple-700/50 rounded-full px-2.5 py-1 transition-colors"
                    >
                      💬 Check NIK Data Leakage
                    </button>
                    <button
                      onClick={() => { setChatQuery("What is the security status of CV and KTP files?"); handleSendChatQuery("What is the security status of CV and KTP files?"); }}
                      className="text-[10px] bg-purple-950/60 hover:bg-purple-900 text-purple-200 border border-purple-700/50 rounded-full px-2.5 py-1 transition-colors"
                    >
                      💬 Check File Security
                    </button>
                    <button
                      onClick={() => { setChatQuery("Are there any threats detected by Wazuh SIEM?"); handleSendChatQuery("Are there any threats detected by Wazuh SIEM?"); }}
                      className="text-[10px] bg-purple-950/60 hover:bg-purple-900 text-purple-200 border border-purple-700/50 rounded-full px-2.5 py-1 transition-colors"
                    >
                      💬 Check Wazuh SIEM Threats
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Ask a security question (e.g. Is NIK data secure?)..."
                      value={chatQuery}
                      onChange={(e) => setChatQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendChatQuery()}
                      className="bg-slate-900 border-slate-700 text-xs text-white placeholder:text-slate-500"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSendChatQuery()}
                      disabled={chatLoading || !chatQuery.trim()}
                      className="bg-purple-600 hover:bg-purple-700 text-white shrink-0 gap-1.5"
                    >
                      {chatLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Ask AI
                    </Button>
                  </div>

                  {chatAnswer && (
                    <div className="mt-3 p-3 bg-purple-950/40 border border-purple-800/50 rounded-xl text-xs text-purple-100 flex items-start gap-2">
                      <Bot className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-purple-300 block mb-0.5">AI Response:</strong>
                        {chatAnswer}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">Total Audit Events</CardTitle></CardHeader>
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
            The <strong>security_audit_logs</strong> table has not been migrated in Supabase yet, displaying demo data. Execute the provided migration SQL for real audit logging.
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
                <p className="text-sm text-slate-500">Mencatat aktivitas akses dokumen dan data sensitif oleh admin.</p>
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
                  <p className="text-sm text-slate-500">Log deteksi anomali dari Suricata via Wazuh.</p>
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
                  <div className="p-8 text-center text-slate-500">Tidak ada data untuk rentang waktu yang dipilih.</div>
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
