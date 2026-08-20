export type WazuhAlert = {
  id: string;
  timestamp: string;
  agent: string;
  event_type: string;
  signature_id: number | string;
  signature: string;
  severity: number | string;
  src_ip: string;
  src_port: number | string;
  dest_ip: string;
  dest_port: number | string;
  app_proto: string;
  url: string;
  method: string;
  status: number | string;
};

export type WazuhSummary = {
  totalAlerts: number;
  highSeverity: number;
  uniqueSourceIPs: number;
  severityBreakdown: Record<string, number>;
  topSourceIPs: { ip: string; count: number }[];
  topSignatures: { signature: string; count: number }[];
  alertsPerHour: { hour: string; count: number }[];
  connected: boolean;
  lastFetch: string;
};

export type WazuhHealth = {
  status: string;
  wazuhConnected: boolean;
  uptime: number;
};

const DUMMY_ALERTS: WazuhAlert[] = [
  {
    id: "dummy-1",
    timestamp: "2026-07-05 14:00:30",
    agent: "LAPTOP-5GFOE079",
    event_type: "alert",
    signature_id: 1000001,
    signature: "LOCAL SQL Injection Attempt - UNION SELECT",
    severity: 3,
    src_ip: "192.168.56.103",
    src_port: 49728,
    dest_ip: "192.168.56.1",
    dest_port: 8080,
    app_proto: "http",
    url: "/?id=1%20UNION%20SELECT%20username,password%20FROM%20users",
    method: "GET",
    status: 200,
  },
  {
    id: "dummy-2",
    timestamp: "2026-07-05 14:01:12",
    agent: "LAPTOP-5GFOE079",
    event_type: "alert",
    signature_id: 1000003,
    signature: "LOCAL XSS Attempt - Script Tag",
    severity: 3,
    src_ip: "192.168.56.103",
    src_port: 50122,
    dest_ip: "192.168.56.1",
    dest_port: 8080,
    app_proto: "http",
    url: "/?q=%3Cscript%3Ealert(1)%3C/script%3E",
    method: "GET",
    status: 200,
  },
];

function normalizeAlert(item: any, index: number): WazuhAlert {
  return {
    id: String(item.id || `${item.timestamp || "alert"}-${index}`),
    timestamp: String(item.timestamp || "-"),
    agent: String(item.agent || item.agent_name || "-"),
    event_type: String(item.event_type || "alert"),
    signature_id: item.signature_id ?? "-",
    signature: String(item.signature || "-"),
    severity: item.severity ?? "-",
    src_ip: String(item.src_ip || "-"),
    src_port: item.src_port ?? "-",
    dest_ip: String(item.dest_ip || "-"),
    dest_port: item.dest_port ?? "-",
    app_proto: String(item.app_proto || "-"),
    url: String(item.url || "-"),
    method: String(item.method || "-"),
    status: item.status ?? "-",
  };
}

export async function getWazuhAlerts(): Promise<WazuhAlert[]> {
  const apiUrl = import.meta.env.VITE_WAZUH_ALERT_API;

  // If Wazuh API URL is not filled in .env.local, view still works using dummy.
  if (!apiUrl) {
    return DUMMY_ALERTS;
  }

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`API Wazuh error: ${response.status}`);
    }

    const data = await response.json();
    const rawAlerts = Array.isArray(data) ? data : data.alerts;

    if (!Array.isArray(rawAlerts) || rawAlerts.length === 0) {
      return [];
    }

    return rawAlerts.map(normalizeAlert);
  } catch (error) {
    console.error("Failed to fetch Wazuh data, fallback to dummy:", error);
    return DUMMY_ALERTS;
  }
}

export async function getWazuhSummary(): Promise<WazuhSummary | null> {
  const apiUrl = import.meta.env.VITE_WAZUH_ALERT_API;
  if (!apiUrl) return null;

  try {
    const response = await fetch(`${apiUrl}/summary`);
    if (!response.ok) throw new Error(`API Wazuh summary error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch Wazuh summary:", error);
    return null;
  }
}

export async function checkWazuhHealth(): Promise<WazuhHealth | null> {
  const apiUrl = import.meta.env.VITE_WAZUH_ALERT_API;
  if (!apiUrl) return null;

  try {
    const healthUrl = apiUrl.replace('/api/wazuh-alerts', '/health');
    const response = await fetch(healthUrl);
    if (!response.ok) throw new Error(`API Wazuh health error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Failed to check Wazuh health:", error);
    return { status: "error", wazuhConnected: false, uptime: 0 };
  }
}

