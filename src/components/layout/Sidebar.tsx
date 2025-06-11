
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/services/auth-service";
import {
  UserCircle,
  LayoutDashboard,
  Upload,
  Users,
  LogOut,
  Settings,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export function Sidebar() {
  const location = useLocation();
  const { logout, getCurrentUser } = useAuth();
  const user = getCurrentUser();
  const isAdmin = user?.role === "admin";
  const isAdminOrSupport = ["admin", "support"].includes(user?.role || "");

  // Collapse state
  const [collapsed, setCollapsed] = useState(false);
  const toggleSidebar = () => setCollapsed((v) => !v);

  // Navigation items
  interface NavItem {
    label: string;
    path: string;
    icon: React.ReactNode;
  }
  const commonNavItems: NavItem[] = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
    },
    {
      label: "New Hires",
      path: "/hires",
      icon: <Users className="mr-2 h-4 w-4" />,
    },
    {
      label: "Import Data",
      path: "/import",
      icon: <Upload className="mr-2 h-4 w-4" />,
    },
  ];
  
  const adminOrSupportNavItems: NavItem[] = [
    {
      label: "HRIS Sync",
      path: "/hris-sync",
      icon: <RefreshCw className="mr-2 h-4 w-4" />,
    },
  ];
  
  const adminOnlyNavItems: NavItem[] = [
    {
      label: "Settings",
      path: "/settings",
      icon: <Settings className="mr-2 h-4 w-4" />,
    },
  ];

  let navItems = [...commonNavItems];
  if (isAdminOrSupport) {
    navItems = [...navItems, ...adminOrSupportNavItems];
  }
  if (isAdmin) {
    navItems = [...navItems, ...adminOnlyNavItems];
  }

  // Active route detection
  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div
      className={`
        h-full min-h-screen flex flex-col bg-audit-blue text-white
        transition-all duration-200
        ${collapsed ? "w-16" : "w-64"}
      `}
    >
      {/* Header + Toggle */}
      <div className="flex items-center justify-between px-3 py-4">
        {!collapsed && (
          <div>
            <h1 className="text-2xl font-bold">MTI Onboarding</h1>
            <p className="text-sm opacity-75">New Hire Management</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="p-2"
        >
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </Button>
      </div>

      {/* Nav Links */}
      <div className="flex-1 overflow-hidden">
        <nav className="space-y-1 px-2">
          {navItems.map((item) => (
            <Link to={item.path} key={item.path}>
              <Button
                variant={isActive(item.path) ? "secondary" : "ghost"}
                className={`
                  w-full justify-start
                  ${isActive(item.path)
                    ? "bg-audit-lightBlue text-white"
                    : "text-white hover:bg-audit-lightBlue hover:text-white"}
                `}
                aria-current={isActive(item.path) ? "page" : undefined}
              >
                {item.icon}
                {!collapsed && item.label}
              </Button>
            </Link>
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div
        className={`
          border-t border-audit-lightBlue pt-4 px-4
          transition-opacity duration-200
          ${collapsed ? "opacity-0 pointer-events-none" : "opacity-100"}
        `}
      >
        <div className="flex items-center mb-4 px-2">
          <UserCircle className="h-6 w-6 min-w-6 mr-2" />
          <div className="overflow-hidden">
            <p className="font-medium truncate">
              {user?.username || "User"}
            </p>
            <p className="text-xs opacity-75">{user?.role || "Role"}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-white hover:bg-audit-lightBlue hover:text-white"
          onClick={logout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
