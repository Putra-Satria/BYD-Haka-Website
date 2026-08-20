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
import VerifyOTP from "./pages/VerifyOTP";
import { TwoFactorGuard } from "./components/TwoFactorGuard";
import { SessionTimeout } from "./components/SessionTimeout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SessionTimeout />
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
          <Route path="/admin" element={<TwoFactorGuard><AdminDashboard /></TwoFactorGuard>} />
          <Route path="/admin/talent-pool" element={<TwoFactorGuard><TalentPool /></TwoFactorGuard>} />
          <Route path="/admin/fixed-employees" element={<TwoFactorGuard><FixedEmployees /></TwoFactorGuard>} />
          <Route path="/security-monitoring" element={<TwoFactorGuard><SecurityMonitoring /></TwoFactorGuard>} />
          <Route path="/admin/security-audit" element={<TwoFactorGuard><SecurityAudit /></TwoFactorGuard>} />
          <Route path="/admin/access-control" element={<TwoFactorGuard><AccessControl /></TwoFactorGuard>} />
          <Route path="/tentang-kami" element={<About />} />
          <Route path="/kontak-kami" element={<Contact />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
