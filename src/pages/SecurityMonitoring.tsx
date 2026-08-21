import { useEffect, useMemo, useState } from "react";
import TopNav from "@/components/TopNav";
import { useRoleCheck } from "@/hooks/useRoleCheck";
import { supabase } from "@/integrations/supabase/client";
import { getWazuhAlerts, checkWazuhHealth, WazuhAlert, WazuhHealth } from "@/services/wazuhAlertService";
import { ActivityRecord, UserSessionRecord } from "@/services/activityLogger";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, RefreshCw, ShieldAlert, Server, Activity, Globe, Wifi, WifiOff, FileText, FileSpreadsheet, User, Clock, CheckCircle2, XCircle, Info, Filter, Layers, Search, Users, ExternalLink, Radio } from "lucide-react";
import { generateSecurityReportPDF, exportSecurityReportExcel } from "@/lib/reportGenerator";

function formatTime(value?: string | null) {
  if (!value || value === "-") return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date);
}

function formatRelativeTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 10) return "Just now";
  if (diffSec < 60) return `${diffSec} seconds ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  return `${Math.floor(diffMin / 60)} hours ago`;
}

function severityBadgeClass(severity: number | string) {
  const value = Number(severity);

  if (value >= 4) return "bg-red-100 text-red-700 border-red-200";
  if (value >= 3) return "bg-orange-100 text-orange-700 border-orange-200";
  if (value >= 2) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-blue-100 text-blue-700 border-blue-200";
}

function statusBadgeClass(status?: string, severity?: string) {
  const s = (status || "").toLowerCase();
  const sev = (severity || "").toLowerCase();

  if (sev === "critical" || sev === "4" || s === "denied") return "bg-red-100 text-red-700 border-red-200";
  if (sev === "high" || sev === "3" || s === "failed") return "bg-orange-100 text-orange-700 border-orange-200";
  if (sev === "medium" || sev === "2") return "bg-yellow-100 text-yellow-700 border-yellow-200";
  if (s === "success" || s === "active") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  return "bg-blue-100 text-blue-700 border-blue-200";
}

function sourceBadgeClass(source?: string) {
  const src = (source || "").toLowerCase();
  if (src === "wazuh") return "bg-purple-100 text-purple-700 border-purple-200";
  if (src === "suricata") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-emerald-100 text-emerald-700 border-emerald-200";
}

export default function SecurityMonitoring() {
  const { loading: roleLoading } = useRoleCheck({
    allowedRoles: ["admin"],
    deniedToastMessage: "Akses ditolak: Halaman Security Monitoring khusus untuk Super Admin."
  });

  const [alerts, setAlerts] = useState<WazuhAlert[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityRecord[]>([]);
  const [userSessions, setUserSessions] = useState<UserSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [healthStatus, setHealthStatus] = useState<WazuhHealth | null>(null);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);

  // Filter States for Wazuh Alerts
  const [severityFilter, setSeverityFilter] = useState("all");
  const [protocolFilter, setProtocolFilter] = useState("all");
  const [ipFilter, setIpFilter] = useState("");

  // Filter States for Live Activity
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [activitySearch, setActivitySearch] = useState("");

  // Session Detail Modal State
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);

  const fetchActivityData = async () => {
    setActivityLoading(true);
    try {
      const [logsRes, sessRes] = await Promise.all([
        (supabase.from("activity_logs" as any) as any).select("*").order("timestamp", { ascending: false }).limit(300),
        (supabase.from("user_sessions" as any) as any).select("*").order("last_seen_at", { ascending: false }).limit(100)
      ]);

      if (!logsRes.error && logsRes.data) {
        setActivityLogs(logsRes.data as ActivityRecord[]);
      }

      if (!sessRes.error && sessRes.data) {
        setUserSessions(sessRes.data as UserSessionRecord[]);
      }
    } catch (err) {
      console.warn("Could not fetch activity data:", err);
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const [data, health] = await Promise.all([
        getWazuhAlerts(),
        checkWazuhHealth()
      ]);
      setAlerts(data);
      if (health) setHealthStatus(health);
      setLastUpdated(new Date().toLocaleString("id-ID"));
    } catch (error) {
      console.error("Gagal mengambil alert Wazuh:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    fetchActivityData();

    // Subscribe to Supabase Realtime changes on activity_logs & user_sessions
    const channel = supabase
      .channel("live_activity_and_sessions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_logs" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newRecord = payload.new as ActivityRecord;
            setActivityLogs((prev) => [newRecord, ...prev.slice(0, 299)]);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_sessions" },
        (payload) => {
          fetchActivityData();
        }
      )
      .subscribe((status) => {
        setIsRealtimeActive(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const activeSessions = useMemo(() => {
    return userSessions.filter((s) => s.status === "active");
  }, [userSessions]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const matchSeverity = severityFilter === "all" || String(alert.severity) === severityFilter;
      const matchProtocol = protocolFilter === "all" || alert.app_proto.toLowerCase() === protocolFilter.toLowerCase();
      const matchIp = !ipFilter || (alert.src_ip && alert.src_ip.includes(ipFilter));
      return matchSeverity && matchProtocol && matchIp;
    });
  }, [alerts, severityFilter, protocolFilter, ipFilter]);

  const filteredActivityLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      const matchCategory = categoryFilter === "all" || log.event_type.toLowerCase() === categoryFilter.toLowerCase();
      const matchSource = sourceFilter === "all" || log.source.toLowerCase() === sourceFilter.toLowerCase();
      const matchRole = roleFilter === "all" || log.role.toLowerCase() === roleFilter.toLowerCase();

      const searchLower = activitySearch.toLowerCase();
      const matchSearch =
        !activitySearch ||
        (log.user_email && log.user_email.toLowerCase().includes(searchLower)) ||
        (log.user_name && log.user_name.toLowerCase().includes(searchLower)) ||
        (log.action && log.action.toLowerCase().includes(searchLower)) ||
        (log.page && log.page.toLowerCase().includes(searchLower)) ||
        (log.session_id && log.session_id.toLowerCase().includes(searchLower)) ||
        (log.ip_address && log.ip_address.includes(searchLower));

      return matchCategory && matchSource && matchRole && matchSearch;
    });
  }, [activityLogs, categoryFilter, sourceFilter, roleFilter, activitySearch]);

  const selectedSessionEvents = useMemo(() => {
    if (!selectedSessionId) return [];
    
    // Application activity logs for this session
    const appEvts = activityLogs
      .filter((log) => log.session_id === selectedSessionId)
      .map((log) => ({
        type: "app",
        timestamp: log.timestamp,
        title: log.action.replace(/_/g, " "),
        page: log.page || log.resource || "/",
        source: log.source,
        status: log.status,
        severity: log.severity,
        details: log.metadata,
      }));

    // Correlated Suricata / Wazuh alerts for this session by IP & timeframe
    const targetSession = userSessions.find((s) => s.session_id === selectedSessionId);
    let secEvts: any[] = [];

    if (targetSession) {
      const startTime = new Date(targetSession.started_at).getTime() - 60000;
      const endTime = targetSession.ended_at ? new Date(targetSession.ended_at).getTime() + 60000 : Date.now() + 60000;

      secEvts = alerts
        .filter((alt) => {
          const altTime = new Date(alt.timestamp).getTime();
          const matchIp = !alt.src_ip || alt.src_ip === targetSession.ip_address || alt.src_ip.includes("127.0.0.1") || alt.src_ip.includes("0000:");
          return matchIp && altTime >= startTime && altTime <= endTime;
        })
        .map((alt) => ({
          type: "security",
          timestamp: alt.timestamp,
          title: `Suricata Alert: ${alt.signature}`,
          page: `${alt.src_ip} $\\rightarrow$ ${alt.dest_ip}`,
          source: "suricata",
          status: "alert",
          severity: String(alt.severity) === "3" || String(alt.severity) === "4" ? "high" : "medium",
          details: { signature_id: alt.signature_id, protocol: alt.app_proto },
        }));
    }

    const combined = [...appEvts, ...secEvts];
    return combined.sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());
  }, [activityLogs, userSessions, alerts, selectedSessionId]);

  const selectedSessionRecord = useMemo(() => {
    if (!selectedSessionId) return null;
    const sess = userSessions.find((s) => s.session_id === selectedSessionId);
    if (sess) return sess;

    const firstEvt = activityLogs.find((l) => l.session_id === selectedSessionId);
    if (firstEvt) {
      return {
        session_id: firstEvt.session_id,
        user_id: firstEvt.user_id,
        user_email: firstEvt.user_email,
        user_name: firstEvt.user_name,
        role: firstEvt.role,
        ip_address: firstEvt.ip_address || "127.0.0.1",
        current_page: firstEvt.page || "/",
        started_at: firstEvt.timestamp || new Date().toISOString(),
        last_seen_at: firstEvt.timestamp || new Date().toISOString(),
        status: "ended",
      } as UserSessionRecord;
    }

    return null;
  }, [userSessions, activityLogs, selectedSessionId]);

  const stats = useMemo(() => {
    const highSeverity = alerts.filter((alert) => Number(alert.severity) >= 3).length;
    const uniqueSources = new Set(alerts.map((alert) => alert.src_ip).filter((ip) => ip && ip !== "-")).size;
    const latestAlert = alerts[0];

    return {
      totalAlerts: alerts.length,
      highSeverity,
      uniqueSources,
      latestSignature: latestAlert?.signature || "-",
    };
  }, [alerts]);

  const chartData = useMemo(() => {
    const severityCount: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0 };
    const timelineData: Record<string, number> = {};

    alerts.forEach(alert => {
      const s = String(alert.severity);
      if (severityCount[s] !== undefined) severityCount[s]++;

      if (alert.timestamp && alert.timestamp !== "-") {
        const date = new Date(alert.timestamp);
        if (!Number.isNaN(date.getTime())) {
          const hour = `${date.getHours().toString().padStart(2, '0')}:00`;
          timelineData[hour] = (timelineData[hour] || 0) + 1;
        }
      }
    });

    return {
      severity: Object.keys(severityCount).map(key => ({ severity: `Level ${key}`, count: severityCount[key], level: key })),
      timeline: Object.keys(timelineData).sort().map(key => ({ time: key, count: timelineData[key] }))
    };
  }, [alerts]);

  const COLORS: Record<string, string> = {
    "1": "#60a5fa",
    "2": "#facc15",
    "3": "#f97316",
    "4": "#ef4444"
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <TopNav />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-10 w-72 mb-4" />
          <Skeleton className="h-6 w-96 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((item) => (
              <Skeleton key={item} className="h-32 rounded-xl" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <TopNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1 text-xs font-semibold text-primary shadow-xs">
                <ShieldAlert className="h-3.5 w-3.5" />
                Admin Only Access
              </div>

              {/* Health Indicators */}
              <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold shadow-xs bg-white ${isRealtimeActive ? 'text-emerald-600 border-emerald-200' : 'text-amber-600 border-amber-200'}`}>
                <span className={`h-2 w-2 rounded-full ${isRealtimeActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                App Logger: {isRealtimeActive ? 'Connected' : 'Connecting'}
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-600 shadow-xs">
                <Activity className="h-3.5 w-3.5" />
                Suricata IDS: Active
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-600 shadow-xs">
                <Wifi className="h-3.5 w-3.5" />
                Wazuh Agent: Connected
              </div>

              {healthStatus && (
                <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold shadow-xs bg-white ${healthStatus.wazuhConnected !== false ? 'text-emerald-600 border-emerald-200' : 'text-red-600 border-red-200'}`}>
                  {healthStatus.wazuhConnected !== false ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                  Wazuh Manager: {healthStatus.wazuhConnected !== false ? 'Online' : 'Offline'}
                </div>
              )}
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              BYD HAKA Security Monitoring
            </h1>
            <p className="mt-1.5 max-w-3xl text-sm text-slate-600">
              Real-time user session tracking, application activity stream, and Suricata/Wazuh network threat detection.
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 md:items-end">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => generateSecurityReportPDF({
                  auditLogs: [],
                  wazuhAlerts: alerts,
                  stats: {
                    totalLogs: alerts.length,
                    documentAccessCount: 0,
                    blockedCount: 0,
                    highSeverityAlerts: stats.highSeverity
                  }
                })}
                className="gap-2 border-primary text-primary hover:bg-primary/10"
              >
                <FileText className="h-4 w-4" />
                PDF Report
              </Button>
              <Button
                variant="outline"
                onClick={() => exportSecurityReportExcel({
                  auditLogs: [],
                  wazuhAlerts: alerts,
                  stats: {
                    totalLogs: alerts.length,
                    documentAccessCount: 0,
                    blockedCount: 0,
                    highSeverityAlerts: stats.highSeverity
                  }
                })}
                className="gap-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export Excel
              </Button>
              <Button onClick={() => { fetchAlerts(); fetchActivityData(); }} disabled={loading} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              {lastUpdated ? `Last updated: ${lastUpdated}` : "Click Refresh to load data"}
            </p>
          </div>
        </div>

        {/* SECTION: CURRENTLY ACTIVE USERS */}
        <Card className="border-slate-200 shadow-xs mb-8 overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
          <CardHeader className="border-b border-slate-700 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-bold text-white">Active Users Currently Accessing BYD HAKA</CardTitle>
                    <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                      <Radio className="h-3 w-3 mr-1 animate-pulse" />
                      {activeSessions.length} ONLINE
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tracked via 30-second heartbeat engine. Sessions with no activity for $\ge 3$ minutes auto-expire.
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {activeSessions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Belum ada pengguna aktif saat ini.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                {activeSessions.map((sess) => (
                  <div
                    key={sess.session_id}
                    onClick={() => {
                      setSelectedSessionId(sess.session_id);
                      setSessionModalOpen(true);
                    }}
                    className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 rounded-xl p-4 cursor-pointer transition-all duration-200 shadow-xs group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                          <User className="h-4 w-4 text-emerald-400" />
                          {sess.user_name || sess.user_email || "Guest Visitor"}
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[200px]" title={sess.user_email || sess.session_id}>
                          {sess.user_email || sess.session_id}
                        </p>
                      </div>

                      <span className="capitalize text-[10px] font-bold text-slate-300 bg-slate-700 px-2 py-0.5 rounded border border-slate-600">
                        {sess.role}
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-300">
                      <div className="font-mono text-slate-400">
                        Page: <span className="text-white font-semibold">{sess.current_page || "/"}</span>
                      </div>
                      <div className="flex items-center gap-1 text-emerald-400 font-medium">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        {formatRelativeTime(sess.last_seen_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Section */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-8">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Alert</CardTitle>
              <Activity className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.totalAlerts}</div>
              <p className="text-xs text-slate-500 mt-1">Alert terbaru dari Wazuh / Suricata</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">High Severity</CardTitle>
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats.highSeverity}</div>
              <p className="text-xs text-slate-500 mt-1">Severity 3 ke atas</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Source IP</CardTitle>
              <Globe className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.uniqueSources}</div>
              <p className="text-xs text-slate-500 mt-1">Jumlah IP sumber unik</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Latest Attack</CardTitle>
              <Server className="h-5 w-5 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="line-clamp-2 text-sm font-semibold text-slate-900">
                {stats.latestSignature}
              </div>
              <p className="text-xs text-slate-500 mt-2">Signature alert terakhir</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-slate-800">Severity Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-64 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.severity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="severity" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                  <Tooltip cursor={{ fill: "#f1f5f9" }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.severity.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.level] || "#cbd5e1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-slate-800">Alerts Timeline (24h)</CardTitle>
            </CardHeader>
            <CardContent className="h-64 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* SECTION: BYD HAKA LIVE ACTIVITY */}
        <Card className="border-slate-200 shadow-xs mb-8 overflow-hidden">
          <CardHeader className="border-b bg-white pb-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl text-slate-900">BYD HAKA Live Activity Stream</CardTitle>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
                    LIVE REALTIME
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Correlated session timeline from Guest entry $\rightarrow$ Login $\rightarrow$ 2FA $\rightarrow$ Actions $\rightarrow$ Session End.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2 items-center">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[140px] h-9 text-xs bg-white">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="authentication">Auth / 2FA</SelectItem>
                    <SelectItem value="navigation">Navigation</SelectItem>
                    <SelectItem value="recruitment">Recruitment</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="session">Session</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-[120px] h-9 text-xs bg-white">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="application">Application</SelectItem>
                    <SelectItem value="wazuh">Wazuh</SelectItem>
                    <SelectItem value="suricata">Suricata</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[120px] h-9 text-xs bg-white">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="guest">Guest</SelectItem>
                    <SelectItem value="applicant">Applicant</SelectItem>
                    <SelectItem value="recruiter">Recruiter</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative w-full md:w-[180px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search activity..."
                    value={activitySearch}
                    onChange={(e) => setActivitySearch(e.target.value)}
                    className="h-9 text-xs pl-8 bg-white"
                  />
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {activityLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4].map((item) => (
                  <Skeleton key={item} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredActivityLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                Belum ada log aktivitas real-time yang sesuai filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="p-3 text-left font-semibold">Time</th>
                      <th className="p-3 text-left font-semibold">User</th>
                      <th className="p-3 text-left font-semibold">Email</th>
                      <th className="p-3 text-left font-semibold">Role</th>
                      <th className="p-3 text-left font-semibold">Activity</th>
                      <th className="p-3 text-left font-semibold">Page / Resource</th>
                      <th className="p-3 text-left font-semibold">Session ID</th>
                      <th className="p-3 text-left font-semibold">Source</th>
                      <th className="p-3 text-left font-semibold">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredActivityLogs.map((log) => (
                      <tr
                        key={log.id || `${log.timestamp}-${log.action}`}
                        onClick={() => {
                          setSelectedSessionId(log.session_id);
                          setSessionModalOpen(true);
                        }}
                        className="border-t hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="p-3 whitespace-nowrap text-slate-600 text-xs">
                          {formatTime(log.timestamp)}
                        </td>

                        <td className="p-3 whitespace-nowrap font-medium text-slate-800">
                          {log.user_name || (log.user_email ? log.user_email.split('@')[0] : "Guest")}
                        </td>

                        <td className="p-3 whitespace-nowrap text-xs text-slate-600 font-mono">
                          {log.user_email || "-"}
                        </td>

                        <td className="p-3 whitespace-nowrap">
                          <span className="capitalize text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {log.role || "guest"}
                          </span>
                        </td>

                        <td className="p-3 font-semibold text-slate-900 capitalize">
                          {log.action.replace(/_/g, " ")}
                        </td>

                        <td className="p-3 whitespace-nowrap text-slate-600 font-mono text-xs">
                          {log.page || log.resource || "/"}
                        </td>

                        <td className="p-3 whitespace-nowrap text-slate-500 font-mono text-xs max-w-[110px] truncate" title={log.session_id}>
                          {log.session_id}
                        </td>

                        <td className="p-3 whitespace-nowrap">
                          <span className={`inline-flex rounded border px-2 py-0.5 text-xs font-bold uppercase ${sourceBadgeClass(log.source)}`}>
                            {log.source === "application" ? "APP" : log.source}
                          </span>
                        </td>

                        <td className="p-3 whitespace-nowrap">
                          <span className={`inline-flex rounded border px-2 py-0.5 text-xs font-semibold uppercase ${statusBadgeClass(log.status, log.severity)}`}>
                            {log.severity && log.severity !== "info" ? log.severity : log.status}
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

        {/* Filter Bar for Wazuh Alerts */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-full md:w-[180px] bg-white">
              <SelectValue placeholder="Filter Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="1">Severity 1</SelectItem>
              <SelectItem value="2">Severity 2</SelectItem>
              <SelectItem value="3">Severity 3</SelectItem>
              <SelectItem value="4">Severity 4</SelectItem>
            </SelectContent>
          </Select>

          <Select value={protocolFilter} onValueChange={setProtocolFilter}>
            <SelectTrigger className="w-full md:w-[180px] bg-white">
              <SelectValue placeholder="Filter Protocol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Protocols</SelectItem>
              <SelectItem value="http">HTTP</SelectItem>
              <SelectItem value="tcp">TCP</SelectItem>
              <SelectItem value="udp">UDP</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Filter by Source IP..."
            value={ipFilter}
            onChange={(e) => setIpFilter(e.target.value)}
            className="w-full md:max-w-sm bg-white"
          />
        </div>

        {/* Wazuh Security Alerts Table */}
        <Card className="border-slate-200 shadow-xs overflow-hidden">
          <CardHeader className="border-b bg-white">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-xl text-slate-900">Wazuh & Suricata Network Security Alerts</CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  Alert nyata dari Suricata IDS yang ditangkap oleh Wazuh Manager.
                </p>
              </div>
              <Badge variant="outline" className="w-fit">
                Suricata IDS
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4].map((item) => (
                  <Skeleton key={item} className="h-14 w-full" />
                ))}
              </div>
            ) : alerts.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                Belum ada alert Suricata yang ditemukan dari Wazuh.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="p-4 text-left font-semibold">Time</th>
                      <th className="p-4 text-left font-semibold">Agent</th>
                      <th className="p-4 text-left font-semibold">Signature</th>
                      <th className="p-4 text-left font-semibold">Source IP</th>
                      <th className="p-4 text-left font-semibold">Destination</th>
                      <th className="p-4 text-left font-semibold">Protocol</th>
                      <th className="p-4 text-left font-semibold">Severity</th>
                      <th className="p-4 text-left font-semibold">URL</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredAlerts.map((alert) => (
                      <tr key={alert.id} className="border-t hover:bg-slate-50">
                        <td className="p-4 whitespace-nowrap text-slate-700">
                          {formatTime(alert.timestamp)}
                        </td>

                        <td className="p-4 whitespace-nowrap font-medium text-slate-800">
                          {alert.agent}
                        </td>

                        <td className="p-4 min-w-[280px]">
                          <div className="font-semibold text-slate-900">{alert.signature}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            Signature ID: {alert.signature_id}
                          </div>
                        </td>

                        <td className="p-4 whitespace-nowrap text-slate-700 font-mono text-xs">
                          {alert.src_ip}:{alert.src_port}
                        </td>

                        <td className="p-4 whitespace-nowrap text-slate-700 font-mono text-xs">
                          {alert.dest_ip}:{alert.dest_port}
                        </td>

                        <td className="p-4 uppercase text-slate-700 font-semibold text-xs">
                          {alert.app_proto}
                        </td>

                        <td className="p-4">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${severityBadgeClass(alert.severity)}`}>
                            Severity {alert.severity}
                          </span>
                        </td>

                        <td className="p-4 max-w-[340px] truncate text-slate-600 font-mono text-xs" title={alert.url}>
                          {alert.url}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* SESSION DETAIL DRAWER / MODAL */}
      <Dialog open={sessionModalOpen} onOpenChange={setSessionModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Full User Access & Session Timeline
            </DialogTitle>
            <DialogDescription>
              Detail kronologis lengkap satu sesi pengunjung dari Guest $\rightarrow$ Login $\rightarrow$ 2FA $\rightarrow$ Aktivitas $\rightarrow$ Exit / Alert.
            </DialogDescription>
          </DialogHeader>

          {selectedSessionRecord && (
            <div className="space-y-6 pt-2">
              {/* Metadata Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Session ID</p>
                  <p className="text-xs font-mono font-bold text-slate-800 truncate" title={selectedSessionRecord.session_id}>
                    {selectedSessionRecord.session_id}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">User / Email</p>
                  <p className="text-xs font-semibold text-slate-900 truncate" title={selectedSessionRecord.user_email || "Guest"}>
                    {selectedSessionRecord.user_name || selectedSessionRecord.user_email || "Guest Visitor"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Role</p>
                  <span className="capitalize text-xs font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {selectedSessionRecord.role || "guest"}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Status</p>
                  <span className={`capitalize text-xs font-bold px-2 py-0.5 rounded border ${selectedSessionRecord.status === "active" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-200 text-slate-700 border-slate-300"}`}>
                    {selectedSessionRecord.status}
                  </span>
                </div>
              </div>

              {/* Timeline list */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-500" />
                  Full Chronological Session Trail ({selectedSessionEvents.length} events)
                </h4>

                <div className="relative pl-6 border-l-2 border-slate-200 space-y-4">
                  {selectedSessionEvents.map((evt, idx) => (
                    <div key={idx} className="relative group">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 bg-white ${
                        evt.type === "security"
                          ? "border-red-500 bg-red-100 animate-pulse"
                          : evt.status === "denied"
                          ? "border-red-500 bg-red-50"
                          : evt.status === "failed"
                          ? "border-orange-500 bg-orange-50"
                          : evt.status === "success"
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-blue-500 bg-blue-50"
                      }`} />

                      <div className={`p-3 rounded-lg border transition-colors shadow-2xs ${evt.type === "security" ? "bg-red-50/70 border-red-200" : "bg-white border-slate-200 hover:border-slate-300"}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-semibold capitalize ${evt.type === "security" ? "text-red-700 font-bold" : "text-slate-900"}`}>
                            {evt.title}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {formatTime(evt.timestamp)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="text-xs text-slate-500 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                            {evt.page}
                          </span>
                          <span className={`inline-flex rounded border px-2 py-0.2 text-[10px] font-bold uppercase ${sourceBadgeClass(evt.source)}`}>
                            {evt.source === "application" ? "APP" : evt.source}
                          </span>
                          <span className={`inline-flex rounded border px-2 py-0.2 text-[10px] font-semibold uppercase ${statusBadgeClass(evt.status, evt.severity)}`}>
                            {evt.severity && evt.severity !== "info" ? evt.severity : evt.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
