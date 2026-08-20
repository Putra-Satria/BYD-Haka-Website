import { supabase } from "@/integrations/supabase/client";

export type SecurityAuditAction =
  | "VIEW_KTP"
  | "VIEW_DOCUMENT"
  | "DOWNLOAD_DOCUMENT"
  | "EXPORT_APPLICATIONS"
  | "UPLOAD_DOCUMENT"
  | "SECURITY_MONITORING_VIEW"
  | "BLOCKED_ACCESS";

export type SecurityAuditStatus = "success" | "failed" | "blocked";

export type SecureDocumentType = "cv" | "certificate" | "ktp" | "photo" | "document";

const DOCUMENT_RULES: Record<SecureDocumentType, { allowedExt: string[]; allowedMime: string[]; maxSizeMb: number }> = {
  cv: {
    allowedExt: ["pdf", "doc", "docx"],
    allowedMime: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    maxSizeMb: 5,
  },
  certificate: {
    allowedExt: ["pdf", "jpg", "jpeg", "png"],
    allowedMime: ["application/pdf", "image/jpeg", "image/png"],
    maxSizeMb: 5,
  },
  ktp: {
    allowedExt: ["pdf", "jpg", "jpeg", "png"],
    allowedMime: ["application/pdf", "image/jpeg", "image/png"],
    maxSizeMb: 3,
  },
  photo: {
    allowedExt: ["jpg", "jpeg", "png"],
    allowedMime: ["image/jpeg", "image/png"],
    maxSizeMb: 2,
  },
  document: {
    allowedExt: ["pdf", "jpg", "jpeg", "png", "doc", "docx"],
    allowedMime: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    maxSizeMb: 5,
  },
};

export function maskNik(nik?: string | null) {
  if (!nik) return "No NIK";
  const digitsOnly = nik.replace(/\D/g, "");

  if (digitsOnly.length < 8) return "****";

  return `${digitsOnly.slice(0, 6)}******${digitsOnly.slice(-4)}`;
}

export function validateSecureUpload(file: File, type: SecureDocumentType = "document") {
  const rule = DOCUMENT_RULES[type];
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const maxSize = rule.maxSizeMb * 1024 * 1024;

  if (!rule.allowedExt.includes(ext)) {
    return {
      valid: false,
      message: `File format not allowed. Use: ${rule.allowedExt.join(", ")}.`,
    };
  }

  if (file.type && !rule.allowedMime.includes(file.type)) {
    return {
      valid: false,
      message: `Invalid file type: ${file.type}.`,
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      message: `Maximum file size is ${rule.maxSizeMb} MB.`,
    };
  }

  return { valid: true, message: "OK" };
}

export function buildSecureFilePath(userId: string, file: File, folder: string) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const safeFolder = folder.replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase();

  // Original user filename is not used so NIK/personal name is not leaked from URL/storage path.
  return `${userId}/${safeFolder}/${crypto.randomUUID()}.${ext}`;
}

export async function getSignedDocumentUrl(bucket: string, path: string, expiresInSeconds = 120) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error) {
    throw new Error(error.message);
  }

  return data.signedUrl;
}

export async function logSecurityAudit(params: {
  action: SecurityAuditAction;
  targetUserId?: string | null;
  targetApplicationId?: string | null;
  documentPath?: string | null;
  status?: SecurityAuditStatus;
  description?: string | null;
}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    await (supabase.from("security_audit_logs" as any) as any).insert({
      actor_user_id: session?.user?.id || null,
      actor_email: session?.user?.email || null,
      action: params.action,
      target_user_id: params.targetUserId || null,
      target_application_id: params.targetApplicationId || null,
      document_path: params.documentPath || null,
      status: params.status || "success",
      description: params.description || null,
      user_agent: navigator.userAgent,
    });
  } catch (error) {
    // Do not make the main flow fail just because the audit table hasn't been migrated.
    console.warn("Security audit log is not active or failed to save:", error);
  }
}
