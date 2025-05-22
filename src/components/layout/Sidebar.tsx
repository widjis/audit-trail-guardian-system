
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/services/auth-service";
import { UserCircle, LayoutDashboard, Upload, Users, LogOut, Settings, Sync, Server } from "lucide-react";

export function Sidebar() {
  const location = useLocation();
  const { logout, getCurrentUser } = useAuth();
  const user = getCurrentUser();
  const isAdmin = user?.role === "admin";

  // Define navigation items
  const commonNavItems = [
    { label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard className="mr-2 h-4 w-4" /> },
    { label: "New Hires", path: "/hires", icon: <Users className="mr-2 h-4 w-4" /> },
    { label: "Import Data", path: "/import", icon: <Upload className="mr-2 h-4 w-4" /> },
  ];
  
  // Admin-only navigation items
  const adminNavItems = [
    { label: "HRIS Sync", path: "/hris-sync", icon: <Sync className="mr-2 h-4 w-4" /> },
    { label: "Settings", path: "/settings", icon: <Settings className="mr-2 h-4 w-4" /> }
  ];
  
  // Combine navigation items based on user role
  const navItems = isAdmin 
    ? [...commonNavItems, ...adminNavItems]
    : commonNavItems;

  return (
    <div className="h-full min-h-screen flex flex-col bg-audit-blue text-white min-w-64 w-auto max-w-80 py-4">
      <div className="px-4 mb-6">
        <h1 className="text-2xl font-bold">MTI Onboarding Workflow</h1>
        <p className="text-sm opacity-75">New Hire Management</p>
      </div>

      <div className="flex-1">
        <nav className="space-y-1 px-2">
          {navItems.map((item) => (
            <Link to={item.path} key={item.path}>
              <Button 
                variant={location.pathname.startsWith(item.path) ? "secondary" : "ghost"} 
                className={`w-full justify-start ${location.pathname.startsWith(item.path) ? 'bg-audit-lightBlue text-white' : 'text-white hover:bg-audit-lightBlue hover:text-white'}`}
              >
                {item.icon}
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t border-audit-lightBlue pt-4 px-4">
        <div className="flex items-center mb-4 px-2">
          <UserCircle className="h-6 w-6 min-w-6 mr-2" />
          <div className="overflow-hidden">
            <p className="font-medium truncate">{user?.username || "User"}</p>
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
