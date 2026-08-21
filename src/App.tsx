import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Auth from "./pages/Auth";
import ApplicationForm from "./pages/ApplicationForm";
import ApplicationSuccess from "./pages/ApplicationSuccess";
import Applications from "./pages/Applications";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import ProfilePage from "./pages/ProfilePage";
import JobDetailPage from "./pages/JobDetailPage";
import SavedJobs from "./pages/SavedJobs";
import EmployeeOnboarding from "./pages/EmployeeOnboarding";
import ResetPassword from "./pages/ResetPassword";
import TalentPool from "./pages/TalentPool";
import FixedEmployees from "./pages/FixedEmployees";
import SecurityMonitoring from "./pages/SecurityMonitoring";
import SecurityAudit from "./pages/SecurityAudit";
import AccessControl from "./pages/AccessControl";
import { SessionTimeout } from "./components/SessionTimeout";

import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  logActivity,
  sendHeartbeat,
  correlateSessionIdentity,
  checkAndExpireInactiveSessions,
} from "@/services/activityLogger";

const queryClient = new QueryClient();

function RouteActivityTracker() {
  const location = useLocation();
  const isFirstMount = useRef(true);
  const lastPath = useRef("");

  // 1. Initial Mount & Navigation Events
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      logActivity({
        event_type: "session",
        action: "website_opened",
        page: location.pathname,
        status: "info",
        severity: "info",
      });
      logActivity({
        event_type: "session",
        action: "session_started",
        page: location.pathname,
        status: "info",
        severity: "info",
      });
      sendHeartbeat(location.pathname);
    }

    if (lastPath.current !== location.pathname) {
      lastPath.current = location.pathname;

      let actionName = "page_view";
      if (location.pathname === "/job-board" || location.pathname === "/lowongan") {
        actionName = "job_board_viewed";
      } else if (location.pathname.startsWith("/job-board/")) {
        actionName = "job_detail_viewed";
      } else if (location.pathname === "/admin") {
        actionName = "admin_dashboard_viewed";
      } else if (location.pathname === "/admin/access-control") {
        actionName = "access_control_viewed";
      } else if (location.pathname === "/security-monitoring") {
        actionName = "security_monitoring_viewed";
      } else if (location.pathname === "/applications") {
        actionName = "recruiter_dashboard_viewed";
      }

      logActivity({
        event_type: "navigation",
        action: actionName,
        page: location.pathname,
        status: "info",
        severity: "info",
      });

      sendHeartbeat(location.pathname);
    }
  }, [location]);

  // 2. Identity Correlation & Heartbeat Timers
  useEffect(() => {
    // Initial check for existing session identity correlation
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        correlateSessionIdentity(session.user);
      }
    });

    // Listen for Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        correlateSessionIdentity(session.user);
      }
    });

    // Send heartbeat every 30 seconds
    const heartbeatInterval = setInterval(() => {
      sendHeartbeat(window.location.pathname);
    }, 30000);

    // Scan & expire inactive sessions every 45 seconds
    const expireInterval = setInterval(() => {
      checkAndExpireInactiveSessions();
    }, 45000);

    // Best-effort signals for tab switch / close
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat(window.location.pathname);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      clearInterval(heartbeatInterval);
      clearInterval(expireInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SessionTimeout />
        <RouteActivityTracker />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lowongan" element={<Landing />} />
          <Route path="/job-board" element={<Index />} />
          <Route path="/saved-jobs" element={<SavedJobs />} />
          <Route path="/job-board/:id" element={<JobDetailPage />} />
          <Route path="/dashboard" element={<Index />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/application-form" element={<ApplicationForm />} />
          <Route path="/application-success" element={<ApplicationSuccess />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/onboarding" element={<EmployeeOnboarding />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/talent-pool" element={<TalentPool />} />
          <Route path="/admin/fixed-employees" element={<FixedEmployees />} />
          <Route path="/security-monitoring" element={<SecurityMonitoring />} />
          <Route path="/admin/security-audit" element={<SecurityAudit />} />
          <Route path="/admin/access-control" element={<AccessControl />} />
          <Route path="/tentang-kami" element={<About />} />
          <Route path="/kontak-kami" element={<Contact />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
