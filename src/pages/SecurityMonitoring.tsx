import { useEffect, useMemo, useState } from "react";
import TopNav from "@/components/TopNav";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { getWazuhAlerts, checkWazuhHealth, WazuhAlert, WazuhHealth } from "@/services/wazuhAlertService";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, RefreshCw, ShieldAlert, Server, Activity, Globe, Wifi, WifiOff } from "lucide-react";

function formatTime(value: string) {
  if (!value || value === "-") return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date);
}

function severityBadgeClass(severity: number | string) {
  const value = Number(severity);

  if (value >= 4) return "bg-red-100 text-red-700 border-red-200";
  if (value >= 3) return "bg-orange-100 text-orange-700 border-orange-200";
  if (value >= 2) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-blue-100 text-blue-700 border-blue-200";
}

export default function SecurityMonitoring() {
  const { loading: roleLoading } = useAdminCheck();
  const [alerts, setAlerts] = useState<WazuhAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [healthStatus, setHealthStatus] = useState<WazuhHealth | null>(null);

  const [severityFilter, setSeverityFilter] = useState("all");
  const [protocolFilter, setProtocolFilter] = useState("all");
  const [ipFilter, setIpFilter] = useState("");

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
      console.error("Failed to fetch Wazuh alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const matchSeverity = severityFilter === "all" || String(alert.severity) === severityFilter;
      const matchProtocol = protocolFilter === "all" || alert.app_proto.toLowerCase() === protocolFilter.toLowerCase();
      const matchIp = !ipFilter || (alert.src_ip && alert.src_ip.includes(ipFilter));
      return matchSeverity && matchProtocol && matchIp;
    });
  }, [alerts, severityFilter, protocolFilter, ipFilter]);

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
    "1": "#60a5fa", // blue-400
    "2": "#facc15", // yellow-400
    "3": "#f97316", // orange-500
    "4": "#ef4444"  // red-500
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
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm">
                <ShieldAlert className="h-4 w-4" />
                Admin Only Access
              </div>
              {healthStatus && (
                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm bg-white ${healthStatus.wazuhConnected !== false ? 'text-emerald-600 border-emerald-200' : 'text-red-600 border-red-200'}`}>
                  {healthStatus.wazuhConnected !== false ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                  {healthStatus.wazuhConnected !== false ? 'Connected' : 'Disconnected'}
                </div>
              )}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Security Monitoring
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Special admin page to monitor Suricata IDS alerts that have been sent and processed by Wazuh.
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 md:items-end">
            <Button onClick={fetchAlerts} disabled={loading} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh Alert
            </Button>
            <p className="text-xs text-slate-500">
              {lastUpdated ? `Last updated: ${lastUpdated}` : "Click Refresh to load data"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-8">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Alert</CardTitle>
              <Activity className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.totalAlerts}</div>
              <p className="text-xs text-slate-500 mt-1">Latest alerts from Wazuh</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">High Severity</CardTitle>
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats.highSeverity}</div>
              <p className="text-xs text-slate-500 mt-1">Severity 3 and above</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Source IP</CardTitle>
              <Globe className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{stats.uniqueSources}</div>
              <p className="text-xs text-slate-500 mt-1">Number of unique source IPs</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Latest Attack</CardTitle>
              <Server className="h-5 w-5 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="line-clamp-2 text-sm font-semibold text-slate-900">
                {stats.latestSignature}
              </div>
              <p className="text-xs text-slate-500 mt-2">Latest alert signature</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="border-slate-200 shadow-sm">
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

          <Card className="border-slate-200 shadow-sm">
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

        {/* Filter Bar */}
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

        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="border-b bg-white">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-xl text-slate-900">Wazuh Security Alerts</CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  Data fetched from internal API that reads Wazuh alerts.
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
                No Suricata alerts found from Wazuh yet.
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

                        <td className="p-4 whitespace-nowrap text-slate-700">
                          {alert.src_ip}:{alert.src_port}
                        </td>

                        <td className="p-4 whitespace-nowrap text-slate-700">
                          {alert.dest_ip}:{alert.dest_port}
                        </td>

                        <td className="p-4 uppercase text-slate-700">
                          {alert.app_proto}
                        </td>

                        <td className="p-4">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${severityBadgeClass(alert.severity)}`}>
                            Severity {alert.severity}
                          </span>
                        </td>

                        <td className="p-4 max-w-[340px] truncate text-slate-600" title={alert.url}>
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
    </div>
  );
}
