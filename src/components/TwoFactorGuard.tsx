import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface TwoFactorGuardProps {
  children: React.ReactNode;
}

export function TwoFactorGuard({ children }: TwoFactorGuardProps) {
  const location = useLocation();
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [is2FAVerified, setIs2FAVerified] = useState<boolean>(false);

  useEffect(() => {
    const checkAuthAnd2FA = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setIsAuthenticated(false);
          setIs2FAVerified(false);
          setLoading(false);
          return;
        }

        setIsAuthenticated(true);

        // Check 2FA Verified status from session storage or cookie
        const sessionVerified = sessionStorage.getItem("haka_2fa_verified") === "true";
        const tokenExists = !!sessionStorage.getItem("haka_2fa_token");

        setIs2FAVerified(sessionVerified || tokenExists);
      } catch (err) {
        console.warn("2FA Guard verification error:", err);
        setIs2FAVerified(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuthAnd2FA();
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-500">Verifying Security Credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (!is2FAVerified) {
    return <Navigate to="/verify-otp" replace />;
  }

  return <>{children}</>;
}
