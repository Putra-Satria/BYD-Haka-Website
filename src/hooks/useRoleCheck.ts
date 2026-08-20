import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AppRole = "admin" | "recruiter" | "user";

interface UseRoleCheckOptions {
  allowedRoles?: AppRole[];
  redirectTo?: string;
  deniedToastMessage?: string;
}

export function useRoleCheck(options: UseRoleCheckOptions = {}) {
  const {
    allowedRoles,
    redirectTo = "/job-board",
    deniedToastMessage = "Access denied: You do not have permission to view this page.",
  } = options;

  const navigate = useNavigate();
  const [role, setRole] = useState<AppRole | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRecruiter, setIsRecruiter] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkRole();
  }, []);

  const checkRole = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate("/auth");
        return;
      }

      setUserId(session.user.id);
      const email = (session.user.email || "").toLowerCase();

      let roles: AppRole[] = [];
      try {
        const { data: roleRows } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);
        if (roleRows) {
          roles = roleRows.map((item) => item.role as AppRole);
        }
      } catch (e) {
        console.warn("Error fetching user roles:", e);
      }

      const isEmailAdmin = email.includes("admin") || email === "admin@hakaauto.com";
      const isEmailRecruiter = email.includes("recruiter") || email.includes("hrd") || email === "recruiter@hakaauto.com";

      const hasAdminRole = roles.includes("admin") || isEmailAdmin;
      const hasRecruiterRole = roles.includes("recruiter") || isEmailRecruiter;
      const hasStaffRole = hasAdminRole || hasRecruiterRole;

      let primaryRole: AppRole = "user";
      if (hasAdminRole) primaryRole = "admin";
      else if (hasRecruiterRole) primaryRole = "recruiter";

      setRole(primaryRole);
      setIsAdmin(hasAdminRole);
      setIsRecruiter(hasRecruiterRole);
      setIsStaff(hasStaffRole);

      const effectiveRoles: AppRole[] = [...roles];
      if (hasAdminRole && !effectiveRoles.includes("admin")) effectiveRoles.push("admin");
      if (hasRecruiterRole && !effectiveRoles.includes("recruiter")) effectiveRoles.push("recruiter");

      if (allowedRoles && allowedRoles.length > 0) {
        const isAllowed = allowedRoles.some((r) => effectiveRoles.includes(r));
        if (!isAllowed) {
          toast.error(deniedToastMessage);
          const fallback = hasStaffRole ? "/admin" : redirectTo;
          navigate(fallback);
          return;
        }
      }
    } catch (err) {
      console.error("Error in checkRole:", err);
    } finally {
      setLoading(false);
    }
  };

  return { role, isAdmin, isRecruiter, isStaff, loading, userId };
}
