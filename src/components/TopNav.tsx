import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NotificationsPopover } from "@/components/NotificationsPopover";
import { logActivity } from "@/services/activityLogger";
// import hakaLogo from "@/assets/haka-logo-new.png";

interface TopNavProps {
  isPublic?: boolean;
}

export default function TopNav({ isPublic = false }: TopNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRecruiter, setIsRecruiter] = useState(false);
  const [isOnboardingEligible, setIsOnboardingEligible] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check user roles
        const { data: roleRows } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);

        const roles = roleRows?.map((item) => item.role) || [];
        const hasAdmin = roles.includes("admin");
        const hasRecruiter = roles.includes("recruiter");

        setIsAdmin(hasAdmin);
        setIsRecruiter(hasRecruiter);

        // Check Onboarding Eligibility (accepted, offering, onboarding)
        const { data: appData } = await supabase
          .from("applications")
          .select("status")
          .eq("user_id", session.user.id)
          .in("status", ["offering", "onboarding", "accepted"])
          .maybeSingle();

        if (appData) setIsOnboardingEligible(true);
      }
    };
    checkAuth();
  }, []);

  const handleLogout = async () => {
    await logActivity({
      event_type: "authentication",
      action: "logout",
      page: location.pathname,
      status: "success",
      severity: "info",
    });
    await logActivity({
      event_type: "session",
      action: "session_ended",
      page: location.pathname,
      status: "info",
      severity: "info",
    });
    sessionStorage.removeItem("byd_haka_session_id");
    sessionStorage.removeItem("2fa_passed");

    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Logout failed");
    } else {
      toast.success("Successfully logged out");
      navigate("/");
    }
  };

  const publicNavItems = [
    { to: "/", label: "Home" },
    { to: "/lowongan", label: "Careers" },
    { to: "/tentang-kami", label: "About Us" },
    { to: "/kontak-kami", label: "Contact" },
  ];

  const isStaff = isAdmin || isRecruiter;

  const authNavItems = [
    ...(isAdmin
      ? [
        { to: "/admin", label: "Admin Dashboard" },
        { to: "/admin/talent-pool", label: "Talent Pool" },
        { to: "/admin/fixed-employees", label: "Fixed Employees" },
        { to: "/admin/access-control", label: "Access Control" },
        { to: "/security-monitoring", label: "Security Monitoring" },
        { to: "/admin/security-audit", label: "Security Audit" },
      ]
      : isRecruiter
      ? [
        { to: "/admin", label: "HRD Dashboard" },
        { to: "/admin/talent-pool", label: "Talent Pool" },
        { to: "/admin/fixed-employees", label: "Fixed Employees" },
        { to: "/admin/access-control", label: "Access Control" },
      ]
      : []),
    { to: "/job-board", label: "Job Board" },
    ...(!isStaff ? [{ to: "/saved-jobs", label: "Saved Jobs" }] : []),
    ...(!isStaff ? [{ to: "/applications", label: "Applications" }] : []),
    ...(isOnboardingEligible ? [{ to: "/onboarding", label: "Employee Onboarding" }] : []),
    { to: "/profile", label: "Profile" },
  ];

  const navItems = isPublic ? publicNavItems : authNavItems;

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 backdrop-blur-sm shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={isPublic ? "/" : isAdmin ? "/admin" : "/job-board"} className="flex items-center">
            <img
              src="/byd-haka-logo.png"
              alt="BYD | Haka Auto"
              className="h-8 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4 lg:gap-6">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`text-sm font-medium transition-colors hover:text-primary/80 ${location.pathname === item.to
                  ? "text-primary font-bold"
                  : "text-primary/90"
                  }`}
              >
                {item.label}
              </Link>
            ))}

            {/* Notification Bell - Show for all logged in users */}
            {!isPublic && <NotificationsPopover />}

            {isPublic ? (
              <>
                <Link
                  to="/auth?mode=register"
                  className="text-sm font-medium transition-colors hover:text-primary/80 text-primary/90"
                >
                  Register
                </Link>
                <Link
                  to="/auth"
                  className="text-sm font-medium transition-colors hover:text-primary/80 text-primary/90"
                >
                  Login
                </Link>
              </>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-primary hover:bg-primary/5"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-primary hover:bg-primary/5"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {
          mobileMenuOpen && (
            <div className="md:hidden pb-4 animate-fade-in bg-white border-t border-gray-100">
              <div className="space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-4 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === item.to
                      ? "bg-primary/10 text-primary"
                      : "text-primary/90 hover:bg-primary/5"
                      }`}
                  >
                    {item.label}
                  </Link>
                ))}
                {isPublic ? (
                  <>
                    <Link
                      to="/auth?mode=register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-2 rounded-md text-sm font-medium text-primary/90 hover:bg-primary/5 transition-colors"
                    >
                      Register
                    </Link>
                    <Link
                      to="/auth"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-2 rounded-md text-sm font-medium text-primary/90 hover:bg-primary/5 transition-colors"
                    >
                      Login
                    </Link>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 rounded-md text-sm font-medium text-primary/80 hover:bg-primary/5 transition-colors flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                )}
              </div>
            </div>
          )
        }
      </div>
    </nav>
  );
}
