import { supabase } from "@/integrations/supabase/client";

export type SecurityAuditAction =
  | "VIEW_KTP"
  | "VIEW_DOCUMENT"
  | "DOWNLOAD_DOCUMENT"
  | "EXPORT_APPLICATIONS"
  | "UPLOAD_DOCUMENT"
  | "SECURITY_MONITORING_VIEW"
  | "BLOCKED_ACCESS"
  | "APPLICANT_UPDATE_PROFILE"
  | "APPLICANT_SUBMIT_APPLICATION"
  | "APPLICANT_UPDATE_EDUCATION"
  | "APPLICANT_UPDATE_EXPERIENCE"
  | "APPLICANT_SUBMIT_ONBOARDING";

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
      message: `File format not allowed. Allowed formats: ${rule.allowedExt.join(", ")}.`,
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

  // Nama file asli user tidak dipakai agar NIK/nama pribadi tidak bocor dari URL/path storage.
  return `${userId}/${safeFolder}/${crypto.randomUUID()}.${ext}`;
}

export function resolveFileUrl(path: string | null | undefined, defaultBucket: string = 'application-documents'): string {
  if (!path) return "";

  // If already an absolute URL (http:// or https://), return as-is
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // Clean leading slashes
  let cleanPath = path.replace(/^\/+/, "");
  let bucket = defaultBucket;

  // Detect bucket prefix if present at start of path
  const knownBuckets = ["application-documents", "documents", "avatars"];
  for (const b of knownBuckets) {
    if (cleanPath.startsWith(`${b}/`)) {
      bucket = b;
      cleanPath = cleanPath.substring(b.length + 1);
      break;
    }
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://sjujcjvmjaqqstpdldsj.supabase.co";
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`;
}

export async function getSignedDocumentUrl(bucket: string, path: string, expiresInSeconds = 120): Promise<string> {
  if (!path) return "";

  let relativePath = path.replace(/^\/+/, "");
  let targetBucket = bucket;

  // If path is a full http/https URL, check if it's a Supabase storage URL and extract object path
  if (path.startsWith("http://") || path.startsWith("https://")) {
    const publicMarker = `/storage/v1/object/public/`;
    const signMarker = `/storage/v1/object/sign/`;

    if (path.includes(publicMarker)) {
      const afterPublic = path.substring(path.indexOf(publicMarker) + publicMarker.length);
      const parts = afterPublic.split("/");
      targetBucket = parts[0];
      relativePath = parts.slice(1).join("/");
    } else if (path.includes(signMarker)) {
      const afterSign = path.substring(path.indexOf(signMarker) + signMarker.length);
      const parts = afterSign.split("/");
      targetBucket = parts[0];
      relativePath = parts.slice(1).join("/");
    } else {
      return path;
    }
  }

  // Strip bucket prefix if present
  if (relativePath.startsWith(`${targetBucket}/`)) {
    relativePath = relativePath.substring(targetBucket.length + 1);
  }

  // Strip query parameters and hashes if present
  relativePath = relativePath.split("?")[0].split("#")[0];

  try {
    const { data, error } = await supabase.storage
      .from(targetBucket)
      .createSignedUrl(relativePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      return resolveFileUrl(path, targetBucket);
    }

    return data.signedUrl;
  } catch {
    return resolveFileUrl(path, targetBucket);
  }
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
    // Jangan membuat flow utama gagal hanya karena audit table belum dimigrasi.
    console.warn("Security audit log belum aktif atau gagal disimpan:", error);
  }
}
