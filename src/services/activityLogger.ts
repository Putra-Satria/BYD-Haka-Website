import { supabase } from "@/integrations/supabase/client";

export type ActivitySource = "application" | "wazuh" | "suricata";

export type ActivityEventType =
  | "authentication"
  | "navigation"
  | "recruitment"
  | "admin"
  | "security"
  | "session";

export type ActivityStatus = "info" | "success" | "failed" | "denied";

export type ActivitySeverity = "info" | "low" | "medium" | "high" | "critical";

export type ActivityRole = "guest" | "user" | "applicant" | "recruiter" | "admin";

export interface ActivityRecord {
  id?: string;
  timestamp?: string;
  application?: string;
  session_id: string;
  source: ActivitySource;
  event_type: ActivityEventType;
  action: string;
  user_id?: string | null;
  user_email?: string | null;
  user_name?: string | null;
  role: ActivityRole;
  page?: string | null;
  resource?: string | null;
  ip_address?: string | null;
  status: ActivityStatus;
  severity: ActivitySeverity;
  metadata?: Record<string, any>;
}

export interface UserSessionRecord {
  session_id: string;
  user_id?: string | null;
  user_email?: string | null;
  user_name?: string | null;
  role: ActivityRole;
  ip_address?: string;
  current_page?: string;
  started_at: string;
  last_seen_at: string;
  ended_at?: string | null;
  end_reason?: string | null;
  status: "active" | "ended";
}

const SESSION_STORAGE_KEY = "byd_haka_session_id";
const SESSION_START_TIME_KEY = "byd_haka_session_start_time";
const INACTIVITY_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes timeout

let cachedClientIp: string | null = null;

export async function getClientIp(): Promise<string> {
  if (cachedClientIp) return cachedClientIp;
  try {
    const stored = sessionStorage.getItem("byd_haka_client_ip");
    if (stored) {
      cachedClientIp = stored;
      return stored;
    }
    const res = await fetch("http://localhost:3001/api/my-ip");
    if (res.ok) {
      const data = await res.json();
      if (data.ip) {
        let cleanIp = data.ip.replace(/^.*:/, '');
        if (cleanIp === "1" || cleanIp === "127.0.0.1") cleanIp = "192.168.56.1";
        cachedClientIp = cleanIp;
        sessionStorage.setItem("byd_haka_client_ip", cleanIp);
        return cleanIp;
      }
    }
  } catch {}
  return "192.168.56.1";
}

/**
 * Gets or initializes a stable session_id for the current browser session.
 */
export function getOrCreateSessionId(): string {
  try {
    let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId) {
      const timestamp = Date.now().toString(36);
      const randomStr = Math.random().toString(36).substring(2, 9);
      sessionId = `HAKA_SESS_${timestamp}_${randomStr}`.toUpperCase();
      sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
      sessionStorage.setItem(SESSION_START_TIME_KEY, new Date().toISOString());
    }
    return sessionId;
  } catch {
    return "HAKA_SESS_ANONYMOUS";
  }
}

export function getSessionStartTime(): string {
  try {
    return sessionStorage.getItem(SESSION_START_TIME_KEY) || new Date().toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Sanitizes metadata to prevent logging sensitive secrets or credentials.
 */
function sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> {
  if (!metadata) return {};
  const sanitized = { ...metadata };

  const sensitiveKeys = [
    "password",
    "pass",
    "otp",
    "code",
    "token",
    "secret",
    "authorization",
    "cv_content",
    "file_buffer",
  ];

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((s) => lowerKey.includes(s))) {
      delete sanitized[key];
    }
  }

  return sanitized;
}

/**
 * Correlates existing session_id with authenticated Supabase user profile post-login/register.
 * Updates user_sessions and existing activity_logs without breaking the session trail.
 */
export async function correlateSessionIdentity(user: any): Promise<void> {
  if (!user) return;
  const sessionId = getOrCreateSessionId();
  const clientIp = await getClientIp();

  let role: ActivityRole = "applicant";
  const email = (user.email || "").toLowerCase();
  const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";

  if (email.includes("admin")) {
    role = "admin";
  } else if (email.includes("recruiter") || email.includes("hrd")) {
    role = "recruiter";
  }

  try {
    // 1. Update user_sessions record for this session_id
    await (supabase.from("user_sessions" as any) as any)
      .upsert({
        session_id: sessionId,
        user_id: user.id,
        user_email: email,
        user_name: name,
        role: role,
        ip_address: clientIp,
        last_seen_at: new Date().toISOString(),
        status: "active",
      }, { onConflict: "session_id" });

    // 2. Correlate existing activity logs under this session_id
    await (supabase.from("activity_logs" as any) as any)
      .update({
        user_id: user.id,
        user_email: email,
        user_name: name,
        role: role,
        ip_address: clientIp,
      })
      .eq("session_id", sessionId)
      .is("user_id", null);
  } catch (err) {
    console.warn("Could not correlate session identity:", err);
  }
}

/**
 * Sends heartbeat signal for active session to maintain active state & last_seen timestamp.
 */
export async function sendHeartbeat(page?: string): Promise<void> {
  const sessionId = getOrCreateSessionId();
  const now = new Date().toISOString();
  const currentPage = page || window.location.pathname;
  const clientIp = await getClientIp();

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    let role: ActivityRole = "guest";
    let email: string | null = null;
    let name: string | null = null;

    if (user) {
      email = user.email || null;
      name = user.user_metadata?.full_name || user.email?.split("@")[0] || null;
      if (email?.includes("admin")) role = "admin";
      else if (email?.includes("recruiter") || email?.includes("hrd")) role = "recruiter";
      else role = "applicant";
    }

    await (supabase.from("user_sessions" as any) as any)
      .upsert({
        session_id: sessionId,
        user_id: user?.id || null,
        user_email: email,
        user_name: name,
        role: role,
        ip_address: clientIp,
        current_page: currentPage,
        last_seen_at: now,
        status: "active",
      }, { onConflict: "session_id" });
  } catch (err) {
    console.warn("Heartbeat update failed silently:", err);
  }
}

/**
 * Scans active sessions and transitions any session with last_seen_at > 3 mins ago to ended status.
 */
export async function checkAndExpireInactiveSessions(): Promise<void> {
  try {
    const cutoffTime = new Date(Date.now() - INACTIVITY_TIMEOUT_MS).toISOString();

    const { data: expiredSessions } = await (supabase.from("user_sessions" as any) as any)
      .select("*")
      .eq("status", "active")
      .lt("last_seen_at", cutoffTime);

    if (expiredSessions && expiredSessions.length > 0) {
      for (const sess of expiredSessions) {
        await (supabase.from("user_sessions" as any) as any)
          .update({
            status: "ended",
            ended_at: new Date().toISOString(),
            end_reason: "inactivity_timeout",
          })
          .eq("session_id", sess.session_id);

        // Log session_ended event into activity_logs
        await (supabase.from("activity_logs" as any) as any)
          .insert({
            application: "BYD_HAKA",
            session_id: sess.session_id,
            source: "application",
            event_type: "session",
            action: "session_ended",
            user_id: sess.user_id,
            user_email: sess.user_email,
            user_name: sess.user_name,
            role: sess.role || "guest",
            page: sess.current_page || "/",
            ip_address: sess.ip_address || "192.168.56.1",
            status: "info",
            severity: "info",
            metadata: { end_reason: "inactivity_timeout" },
          });
      }
    }
  } catch (err) {
    console.warn("Expire check warning:", err);
  }
}

/**
 * Centralized Activity Logger for BYD HAKA Platform.
 * Inserts normalized activity events into public.activity_logs table and updates user_sessions.
 */
export async function logActivity(params: {
  event_type: ActivityEventType;
  action: string;
  page?: string;
  resource?: string;
  status?: ActivityStatus;
  severity?: ActivitySeverity;
  metadata?: Record<string, any>;
  roleOverride?: ActivityRole;
  userEmailOverride?: string;
  userNameOverride?: string;
}): Promise<void> {
  try {
    const sessionId = getOrCreateSessionId();
    const clientIp = await getClientIp();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    let role: ActivityRole = params.roleOverride || "guest";
    let userEmail: string | null = params.userEmailOverride || user?.email || null;
    let userName: string | null = params.userNameOverride || user?.user_metadata?.full_name || null;

    if (user && !params.roleOverride) {
      if (user.email?.includes("admin")) {
        role = "admin";
      } else if (user.email?.includes("recruiter") || user.email?.includes("hrd")) {
        role = "recruiter";
      } else {
        role = "applicant";
      }
    }

    const currentPage = params.page || window.location.pathname;

    const payload = {
      application: "BYD_HAKA",
      session_id: sessionId,
      source: "application",
      event_type: params.event_type,
      action: params.action,
      user_id: user?.id || null,
      user_email: userEmail,
      user_name: userName,
      role: role,
      page: currentPage,
      resource: params.resource || null,
      ip_address: clientIp,
      status: params.status || "info",
      severity: params.severity || "info",
      metadata: sanitizeMetadata(params.metadata),
    };

    const { error } = await (supabase.from("activity_logs" as any) as any).insert(payload);

    if (error) {
      console.warn("Activity log insertion warning:", error.message);
    }

    // Keep active session state synced in user_sessions
    await (supabase.from("user_sessions" as any) as any)
      .upsert({
        session_id: sessionId,
        user_id: user?.id || null,
        user_email: userEmail,
        user_name: userName,
        role: role,
        ip_address: clientIp,
        current_page: currentPage,
        last_seen_at: new Date().toISOString(),
        status: params.action === "logout" || params.action === "session_ended" ? "ended" : "active",
        ended_at: params.action === "logout" || params.action === "session_ended" ? new Date().toISOString() : null,
        end_reason: params.action === "logout" ? "logout" : params.action === "session_ended" ? "session_ended" : null,
      }, { onConflict: "session_id" });

  } catch (err) {
    console.warn("Activity logger failed silently to preserve main app flow:", err);
  }
}
