import { useCallback } from "react";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const SessionTimeout = () => {
  const navigate = useNavigate();

  const handleIdle = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        await supabase.auth.signOut();
        toast.info("Your session has expired due to inactivity. Please login again.");
        navigate("/auth");
      }
    } catch (e) {
      console.warn("Session timeout notice:", e);
    }
  }, [navigate]);

  // 1 hour timeout
  const TIMEOUT_DURATION = 1 * 60 * 60 * 1000;

  useIdleTimeout({
    onIdle: handleIdle,
    timeout: TIMEOUT_DURATION,
  });

  return null;
};
