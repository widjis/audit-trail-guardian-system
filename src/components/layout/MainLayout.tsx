
import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/services/auth-service";
import { useUserPreferences } from "@/services/user-preferences-service";
import { useNavigate } from "react-router-dom";
import { Box, AppBar, Toolbar, IconButton, Typography, Drawer, useMediaQuery, useTheme, CircularProgress } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { Sidebar } from "./Sidebar";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { isAuthenticated } = useAuth();
  const { getPreference } = useUserPreferences();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await isAuthenticated();
      if (!authenticated) {
        navigate("/login");
      }
      setIsLoading(false);
    };
    
    checkAuth();
  }, [isAuthenticated, navigate]);

  // Load sidebar preference only once on component mount
  useEffect(() => {
    if (!preferencesLoaded) {
      const loadSidebarPreference = async () => {
        try {
          const savedCollapsed = await getPreference('sidebarCollapsed', false);
          setSidebarCollapsed(Boolean(savedCollapsed));
          setPreferencesLoaded(true);
        } catch (error) {
          console.error('Failed to load sidebar preference in MainLayout:', error);
          setPreferencesLoaded(true);
        }
      };
      
      loadSidebarPreference();
    }
  }, [getPreference, preferencesLoaded]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSidebarCollapseChange = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
  };

  if (isLoading) {
    return <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>;
  }

  const drawerWidth = sidebarCollapsed ? 60 : 240;

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1, display: { md: 'none' } }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6">MTI Onboarding</Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          transition: 'width 0.3s ease-in-out',
          '& .MuiDrawer-paper': { 
            width: drawerWidth, 
            boxSizing: 'border-box',
            transition: 'width 0.3s ease-in-out',
            overflow: 'hidden'
          },
        }}
      >
        <Sidebar onClose={isMobile ? handleDrawerToggle : undefined} onCollapseChange={handleSidebarCollapseChange} collapsed={sidebarCollapsed} />
      </Drawer>
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          overflow: 'auto', 
          mt: { xs: 8, md: 0 },
          width: `calc(100vw - ${drawerWidth}px)`,
          transition: 'width 0.3s ease-in-out',
          minHeight: '100vh',
          boxSizing: 'border-box'
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
