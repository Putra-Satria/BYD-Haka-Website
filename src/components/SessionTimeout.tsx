import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const SessionTimeout = () => {
    const navigate = useNavigate();

    const handleIdle = async () => {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            await supabase.auth.signOut();
            toast.info("Your session has expired due to inactivity. Please log in again.");
            navigate("/auth");
        }
    };

    // 1 hour = 60 minutes * 60 seconds * 1000 milliseconds
    const TIMEOUT_DURATION = 1 * 60 * 60 * 1000;
    // For testing (10 seconds):
    // const TIMEOUT_DURATION = 10000;

    useIdleTimeout({
        onIdle: handleIdle,
        timeout: TIMEOUT_DURATION,
    });

    return null; // This component doesn't render anything
};
