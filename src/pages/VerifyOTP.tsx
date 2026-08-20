import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { ShieldCheck, Lock, RefreshCw, AlertTriangle, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();

  // Session & User State
  const [userId, setUserId] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("user");

  // OTP Form State
  const [otp, setOtp] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [resending, setResending] = useState<boolean>(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(5);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Timers
  const [expiryTimer, setExpiryTimer] = useState<number>(300); // 5 Minutes TTL
  const [cooldownTimer, setCooldownTimer] = useState<number>(60); // 60s Resend Cooldown

  useEffect(() => {
    const init2FASession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      const targetUserId = location.state?.userId || session?.user?.id;
      const targetEmail = location.state?.email || session?.user?.email;

      if (!targetUserId || !targetEmail) {
        toast.error("Session expired or invalid. Please login again.");
        navigate("/auth", { replace: true });
        return;
      }

      setUserId(targetUserId);
      setEmail(targetEmail);

      // Determine User Role from user_roles
      try {
        const { data: roleRows } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", targetUserId);

        const roles = (roleRows || []).map((r) => r.role);
        if (roles.includes("admin")) {
          setUserRole("admin");
        } else if (roles.includes("recruiter")) {
          setUserRole("recruiter");
        } else {
          setUserRole("user");
        }
      } catch (err) {
        console.warn("Role detection error:", err);
      }
    };

    init2FASession();
  }, [location.state, navigate]);

  // Expiry Countdown (300s -> 0)
  useEffect(() => {
    if (expiryTimer <= 0) return;
    const interval = setInterval(() => {
      setExpiryTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiryTimer]);

  // Cooldown Countdown (60s -> 0)
  useEffect(() => {
    if (cooldownTimer <= 0) return;
    const interval = setInterval(() => {
      setCooldownTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownTimer]);

  // Resend OTP
  const handleResend = async () => {
    if (cooldownTimer > 0) return;

    setResending(true);
    setErrorMessage("");
    setOtp("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        toast.error("Session expired. Please login again.");
        navigate("/auth", { replace: true });
        return;
      }

      const serverUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
      const res = await fetch(`${serverUrl}/api/2fa/resend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        credentials: "include"
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success("New verification code sent to your email!");
        setAttemptsRemaining(5);
        setExpiryTimer(data.expiresInSeconds || 300);
        setCooldownTimer(data.resendCooldownSeconds || 60);
      } else {
        toast.error(data.error || "Failed to resend verification code.");
      }
    } catch (err: any) {
      toast.error("Network error connecting to 2FA server.");
    } finally {
      setResending(false);
    }
  };

  // Verify OTP
  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (otp.length !== 6) {
      toast.error("Please enter a complete 6-digit verification code.");
      return;
    }

    if (expiryTimer <= 0) {
      setErrorMessage("Verification code has expired. Please request a new code.");
      toast.error("Verification code has expired.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        toast.error("Session expired. Please login again.");
        navigate("/auth", { replace: true });
        return;
      }

      const serverUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
      const res = await fetch(`${serverUrl}/api/2fa/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        credentials: "include",
        body: JSON.stringify({ otp })
      });

      const data = await res.json();

      if (res.ok && data.verified) {
        completeVerification(data.verifiedSessionToken || "verified_token");
      } else {
        const errorText = data.error || "Invalid verification code.";
        setErrorMessage(errorText);
        toast.error(errorText);
        if (typeof data.attemptsRemaining === "number") {
          setAttemptsRemaining(data.attemptsRemaining);
        }
      }
    } catch (err: any) {
      toast.error("Error connecting to 2FA verification server.");
    } finally {
      setLoading(false);
    }
  };

  const completeVerification = (token: string) => {
    sessionStorage.setItem("haka_2fa_verified", "true");
    sessionStorage.setItem("haka_2fa_token", token);

    toast.success("2FA Security Verification Successful!");

    // Role-Based Redirection
    setTimeout(() => {
      if (userRole === "admin" || userRole === "recruiter") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/job-board", { replace: true });
      }
    }, 600);
  };

  // Mask Email (e.g. admin@haka.com -> adm***@haka.com)
  const maskEmail = (str: string) => {
    if (!str || !str.includes("@")) return "adm***@haka.com";
    const [name, domain] = str.split("@");
    const maskedName = name.length > 3 ? `${name.substring(0, 3)}***` : `${name.substring(0, 1)}***`;
    return `${maskedName}@${domain}`;
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <TopNav isPublic={true} />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          <Card className="shadow-lg border-slate-200">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-14 h-14 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mb-3">
                <ShieldCheck className="w-8 h-8 text-blue-600 animate-pulse" />
              </div>
              <CardTitle className="text-2xl font-bold text-slate-900">
                Verify Your Identity
              </CardTitle>
              <CardDescription className="text-slate-500 mt-1">
                We've sent a 6-digit verification code to:
                <br />
                <span className="font-semibold text-slate-800">{maskEmail(email)}</span>
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 pt-4">
              {/* Error Alert Box */}
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-600 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>{errorMessage}</div>
                </div>
              )}

              {/* OTP Form */}
              <form onSubmit={handleVerify} className="space-y-6">
                <div className="flex justify-center my-2">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(val) => setOtp(val)}
                    disabled={loading || expiryTimer <= 0 || attemptsRemaining <= 0}
                  >
                    <InputOTPGroup className="gap-2">
                      <InputOTPSlot index={0} className="w-11 h-12 text-lg font-bold border-slate-300 rounded-md" />
                      <InputOTPSlot index={1} className="w-11 h-12 text-lg font-bold border-slate-300 rounded-md" />
                      <InputOTPSlot index={2} className="w-11 h-12 text-lg font-bold border-slate-300 rounded-md" />
                      <InputOTPSlot index={3} className="w-11 h-12 text-lg font-bold border-slate-300 rounded-md" />
                      <InputOTPSlot index={4} className="w-11 h-12 text-lg font-bold border-slate-300 rounded-md" />
                      <InputOTPSlot index={5} className="w-11 h-12 text-lg font-bold border-slate-300 rounded-md" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {/* Expiry & Attempts Info */}
                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    Expires in: <strong className="text-slate-700 font-mono">{formatTimer(expiryTimer)}</strong>
                  </span>
                  <span>
                    Attempts: <strong className="text-slate-700">{attemptsRemaining}/5</strong>
                  </span>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full gap-2 h-11 text-base font-medium bg-blue-600 hover:bg-blue-700"
                  disabled={loading || otp.length !== 6 || expiryTimer <= 0 || attemptsRemaining <= 0}
                >
                  {loading ? (
                    "Verifying Code..."
                  ) : (
                    <>
                      Verify & Continue
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* Resend Cooldown Section */}
              <div className="pt-2 text-center border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-2">Didn't receive the verification code?</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResend}
                  disabled={resending || cooldownTimer > 0}
                  className="gap-1.5 text-xs text-slate-600 border-slate-200"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
                  {cooldownTimer > 0 ? `Resend code in ${cooldownTimer}s` : "Resend Verification Code"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
        &copy; 2026 HAKA Auto Careers Hub &bull; Secured with 2FA & Audit Logging
      </footer>
    </div>
  );
}
