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

const SESSION_STORAGE_KEY = "byd_haka_session_id";
const SESSION_START_TIME_KEY = "byd_haka_session_start_time";

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
 * Centralized Activity Logger for BYD HAKA Platform.
 * Inserts normalized activity events into public.activity_logs table.
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
      page: params.page || window.location.pathname,
      resource: params.resource || null,
      ip_address: "127.0.0.1",
      status: params.status || "info",
      severity: params.severity || "info",
      metadata: sanitizeMetadata(params.metadata),
    };

    const { error } = await (supabase.from("activity_logs" as any) as any).insert(payload);

    if (error) {
      console.warn("Activity log insertion warning:", error.message);
    }
  } catch (err) {
    console.warn("Activity logger failed silently to preserve main app flow:", err);
  }
}
