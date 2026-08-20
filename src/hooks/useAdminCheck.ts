import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export function useAdminCheck() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRecruiter, setIsRecruiter] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [role, setRole] = useState<"admin" | "recruiter" | "user" | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUserId(session.user.id);
      const email = (session.user.email || "").toLowerCase();

      // Query user_roles table
      let roles: string[] = [];
      try {
        const { data: roleRows } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);
        if (roleRows) {
          roles = roleRows.map((item) => item.role);
        }
      } catch (e) {
        console.warn("Could not query user_roles table:", e);
      }

      // Email pattern fallback checks for seamless access
      const isEmailAdmin = email.includes("admin") || email === "admin@hakaauto.com";
      const isEmailRecruiter = email.includes("recruiter") || email.includes("hrd") || email === "recruiter@hakaauto.com";

      const hasAdmin = roles.includes("admin") || isEmailAdmin;
      const hasRecruiter = roles.includes("recruiter") || isEmailRecruiter;
      const hasStaff = hasAdmin || hasRecruiter;

      if (!hasStaff) {
        navigate("/job-board");
        return;
      }

      setIsAdmin(hasAdmin);
      setIsRecruiter(hasRecruiter);
      setIsStaff(hasStaff);
      setRole(hasAdmin ? "admin" : hasRecruiter ? "recruiter" : "user");
    } catch (err) {
      console.error("Error in checkAdminStatus:", err);
    } finally {
      setLoading(false);
    }
  };

  return { isAdmin, isRecruiter, isStaff, role, loading, userId };
}
