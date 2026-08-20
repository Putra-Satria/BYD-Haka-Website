import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Briefcase,
  FileText,
  History,
  Settings,
  Phone,
  User,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const menuItems = [
  { title: "Job Board", url: "/", icon: Briefcase },
  { title: "Applications", url: "/applications", icon: FileText },
  { title: "History", url: "/history", icon: History },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Contact", url: "/contact", icon: Phone },
  { title: "Profile", url: "/profile", icon: User },
];

export function JobSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <>
      {/* Mobile Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 z-40",
          "flex flex-col",
          collapsed ? "-translate-x-full md:translate-x-0 md:w-20" : "w-64",
        )}
      >
        {/* Logo Section */}
        <div className="h-16 flex items-center justify-center border-b border-sidebar-border bg-gradient-to-r from-primary to-primary-glow">
          {!collapsed ? (
            <h1 className="text-xl font-bold text-white">Haka Auto</h1>
          ) : (
            <span className="text-2xl font-bold text-white">B</span>
          )}
        </div>

        {/* Menu Items */}
        <nav className="flex-1 py-6 overflow-y-auto">
          <ul className="space-y-1 px-3">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.url;
              const Icon = item.icon;

              return (
                <li key={item.url}>
                  <NavLink
                    to={item.url}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      "group relative overflow-hidden",
                      isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-0 h-full w-1 bg-primary rounded-r-full" />
                    )}
                    <Icon
                      className={cn(
                        "h-5 w-5 transition-transform duration-200",
                        "group-hover:scale-110",
                        collapsed ? "mx-auto" : "",
                      )}
                    />
                    {!collapsed && (
                      <span className="text-sm">{item.title}</span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Toggle Button (Desktop) */}
        <div className="hidden md:block p-3 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-center hover:bg-sidebar-accent"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}
    </>
  );
}
