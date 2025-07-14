
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/services/auth-service";
import { Box, List, ListItemButton, ListItemIcon, ListItemText, Divider, IconButton, Typography, Collapse as MuiCollapse } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import GroupIcon from '@mui/icons-material/Group';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import SyncIcon from '@mui/icons-material/Sync';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MailIcon from '@mui/icons-material/Mail';

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const location = useLocation();
  const { logout, getCurrentUser } = useAuth();
  const user = getCurrentUser();
  const isAdmin = user?.role === "admin";
  const isAdminOrSupport = ["admin", "support"].includes(user?.role || "");

  const [collapsed, setCollapsed] = useState(false);
  const toggleSidebar = () => setCollapsed((v) => !v);

  interface NavItem {
    label: string;
    path: string;
    icon: React.ReactNode;
  }
  const commonNavItems: NavItem[] = [
    { label: "Dashboard", path: "/dashboard", icon: <DashboardIcon /> },
    { label: "New Hires", path: "/hires", icon: <GroupIcon /> },
    { label: "Import Data", path: "/import", icon: <CloudUploadIcon /> },
    { label: "Onboard Welcome Email", path: "/onboard-email", icon: <MailIcon /> },
  ];
  const adminOrSupportNavItems: NavItem[] = [
    { label: "HRIS Sync", path: "/hris-sync", icon: <SyncIcon /> },
  ];
  const adminOnlyNavItems: NavItem[] = [
    { label: "Settings", path: "/settings", icon: <SettingsIcon /> },
  ];

  let navItems = [...commonNavItems];
  if (isAdminOrSupport) navItems = [...navItems, ...adminOrSupportNavItems];
  if (isAdmin) navItems = [...navItems, ...adminOnlyNavItems];

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'primary.main', color: 'primary.contrastText', width: collapsed ? 60 : 240, transition: 'width 0.2s' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', px: 2, py: 2 }}>
        {!collapsed && (
          <Box>
            <Typography variant="h6" fontWeight="bold">MTI Onboarding</Typography>
            <Typography variant="body2" sx={{ opacity: 0.75 }}>New Hire Management</Typography>
          </Box>
        )}
        <IconButton onClick={toggleSidebar} size="small" sx={{ color: 'inherit' }}>
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Box>
      <List sx={{ flex: 1, overflow: 'auto', px: 1 }}>
        {navItems.map((item) => (
          <ListItemButton
            key={item.path}
            component={Link}
            to={item.path}
            selected={isActive(item.path)}
            onClick={onClose}
            sx={{ borderRadius: 1, justifyContent: collapsed ? 'center' : 'initial' }}
          >
            <ListItemIcon sx={{ minWidth: collapsed ? 'auto' : 40, color: 'inherit' }}>{item.icon}</ListItemIcon>
            {!collapsed && <ListItemText primary={item.label} />}
          </ListItemButton>
        ))}
      </List>
      <Divider sx={{ bgcolor: 'primary.light' }} />
      <Box sx={{ p: 2, display: collapsed ? 'none' : 'block' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <PersonIcon sx={{ mr: 1 }} />
          <Box>
            <Typography variant="body1" fontWeight="medium" noWrap>{user?.username || "User"}</Typography>
            <Typography variant="body2" sx={{ opacity: 0.75 }}>{user?.role || "Role"}</Typography>
          </Box>
        </Box>
        <ListItemButton onClick={logout} sx={{ borderRadius: 1 }}>
          <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}><LogoutIcon /></ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </Box>
    </Box>
  );
}
