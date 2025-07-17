
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/services/auth-service";
import { useUserPreferences } from "@/services/user-preferences-service";
import { Box, List, ListItemButton, ListItemIcon, ListItemText, Divider, IconButton, Typography, Avatar, Tooltip, Menu, MenuItem } from '@mui/material';
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

interface SidebarProps {
  onClose?: () => void;
  onCollapseChange?: (collapsed: boolean) => void;
  collapsed: boolean;
}

export function Sidebar({ onClose, onCollapseChange, collapsed }: SidebarProps) {
  const location = useLocation();
  const { logout, getCurrentUser } = useAuth();
  const user = getCurrentUser();
  const isAdmin = user?.role === "admin";
  const isAdminOrSupport = ["admin", "support"].includes(user?.role || "");

  const [accountMenuAnchor, setAccountMenuAnchor] = useState<null | HTMLElement>(null);
  const { savePreference } = useUserPreferences();
  
  // Prevent sidebar state changes during navigation
  const [isNavigating, setIsNavigating] = useState(false);
  
  useEffect(() => {
    // Set navigating flag when location changes
    setIsNavigating(true);
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 100); // Short delay to prevent state changes during navigation
    
    return () => clearTimeout(timer);
  }, [location.pathname]);
  
  const toggleSidebar = async () => {
    if (isNavigating) return; // Prevent toggle during navigation
    
    const newValue = !collapsed;
    onCollapseChange?.(newValue);
    // Save the preference
    savePreference('sidebarCollapsed', newValue).catch(error => {
      console.error('Failed to save sidebar preference:', error);
    });
  };

  const handleAccountClick = (event: React.MouseEvent<HTMLElement>) => {
    if (collapsed) {
      setAccountMenuAnchor(event.currentTarget);
    }
  };

  const handleAccountMenuClose = () => {
    setAccountMenuAnchor(null);
  };

  const handleLogout = () => {
    handleAccountMenuClose();
    logout();
  };

  // Generate user initials for avatar
  const getUserInitials = (username: string) => {
    return username
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate avatar color based on username
  const getAvatarColor = (username: string) => {
    const colors = [
      '#1976d2', '#388e3c', '#f57c00', '#d32f2f', 
      '#7b1fa2', '#303f9f', '#0288d1', '#00796b'
    ];
    const hash = username.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

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

  const handleNavigation = (event: React.MouseEvent, path: string) => {
    // Close mobile drawer if open
    if (onClose) {
      onClose();
    }
    // Don't prevent default - let React Router handle navigation
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      bgcolor: 'primary.main', 
      color: 'primary.contrastText', 
      width: collapsed ? 60 : 240, 
      transition: 'width 0.3s ease-in-out',
      overflow: 'hidden'
    }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: collapsed ? 'center' : 'space-between', 
        px: 2, 
        py: 2,
        minHeight: 64,
        flexShrink: 0
      }}>
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
      <List sx={{ 
        flex: 1, 
        overflow: 'auto', 
        px: 1,
        '&::-webkit-scrollbar': {
          width: '4px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '2px',
        },
      }}>
        {navItems.map((item) => (
          collapsed ? (
            <Tooltip key={item.path} title={item.label} placement="right" arrow>
              <ListItemButton
                component={Link}
                to={item.path}
                selected={isActive(item.path)}
                onClick={(e) => handleNavigation(e, item.path)}
                sx={{ 
                  borderRadius: 1, 
                  justifyContent: 'center',
                  minHeight: 48,
                  width: 48,
                  mx: 'auto',
                  mb: 1,
                  display: 'flex',
                  alignItems: 'center',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                  },
                  '&.Mui-selected': {
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.25)',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ 
                  minWidth: 'auto', 
                  color: 'inherit', 
                  justifyContent: 'center',
                  margin: 0
                }}>
                  {item.icon}
                </ListItemIcon>
              </ListItemButton>
            </Tooltip>
          ) : (
            <ListItemButton
              key={item.path}
              component={Link}
              to={item.path}
              selected={isActive(item.path)}
              onClick={(e) => handleNavigation(e, item.path)}
              sx={{ 
                borderRadius: 1, 
                justifyContent: 'initial',
                mb: 0.5,
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                },
                '&.Mui-selected': {
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.25)',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          )
        ))}
      </List>
      <Divider sx={{ bgcolor: 'primary.light', flexShrink: 0 }} />
      
      {/* Account Section */}
      <Box sx={{ p: collapsed ? 1 : 2, flexShrink: 0 }}>
        {collapsed ? (
          // Collapsed view - Avatar only with tooltip and menu
          <>
            <Tooltip title={`${user?.username || 'User'} (${user?.role || 'Role'})`} placement="right" arrow>
              <Box
                onClick={handleAccountClick}
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  borderRadius: 1,
                  p: 0.5,
                  '&:hover': { 
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                  }
                }}
              >
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: getAvatarColor(user?.username || 'User'),
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}
                >
                  {getUserInitials(user?.username || 'User')}
                </Avatar>
              </Box>
            </Tooltip>
            
            {/* Account Menu for collapsed state */}
            <Menu
              anchorEl={accountMenuAnchor}
              open={Boolean(accountMenuAnchor)}
              onClose={handleAccountMenuClose}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              sx={{
                '& .MuiPaper-root': {
                  minWidth: 200,
                }
              }}
            >
              <MenuItem disabled>
                <Box>
                  <Typography variant="body1" fontWeight="medium">{user?.username || "User"}</Typography>
                  <Typography variant="body2" color="text.secondary">{user?.role || "Role"}</Typography>
                </Box>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary="Logout" />
              </MenuItem>
            </Menu>
          </>
        ) : (
          // Expanded view - Full account info
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  mr: 1.5,
                  bgcolor: getAvatarColor(user?.username || 'User'),
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                {getUserInitials(user?.username || 'User')}
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body1" fontWeight="medium" noWrap>
                  {user?.username || "User"}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.75 }} noWrap>
                  {user?.role || "Role"}
                </Typography>
              </Box>
            </Box>
            <ListItemButton 
              onClick={logout} 
              sx={{ 
                borderRadius: 1,
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItemButton>
          </>
        )}
      </Box>
    </Box>
  );
}
