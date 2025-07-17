
import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  Paper,
  Drawer,
  IconButton,
  useMediaQuery,
  useTheme,
  Divider
} from '@mui/material';
import { AccountStatusSettings } from "@/components/settings/AccountStatusSettings";
import { MailingListSettings } from "@/components/settings/MailingListSettings";
import { DepartmentListSettings } from "@/components/settings/DepartmentListSettings";
import { PositionGradeSettings } from "@/components/settings/PositionGradeSettings";
import { DatabaseConfigSettings } from "@/components/settings/DatabaseConfigSettings";
import { AccountManagementSettings } from "@/components/settings/AccountManagementSettings";
import { WhatsAppSettings } from "@/components/settings/WhatsAppSettings";
import { ActiveDirectorySettings } from "@/components/settings/ActiveDirectorySettings";
import { ExchangeOnlineSettings } from "@/components/settings/ExchangeOnlineSettings";
import { MicrosoftGraphSettings } from "@/components/settings/MicrosoftGraphSettings";
import AuthenticationSettings from "@/components/settings/AuthenticationSettings";
import StorageIcon from '@mui/icons-material/Storage';
import MessageIcon from '@mui/icons-material/Message';
import GroupIcon from '@mui/icons-material/Group';
import WorkIcon from '@mui/icons-material/Work';
import SettingsApplicationsIcon from '@mui/icons-material/SettingsApplications';
import AccountBoxIcon from '@mui/icons-material/AccountBox';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import DirectoryIcon from '@mui/icons-material/Folder';
import EmailIcon from '@mui/icons-material/Email';
import GraphIcon from '@mui/icons-material/ShowChart';
import SecurityIcon from '@mui/icons-material/Security';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';

const menuItems = [
  { id: "account-status", label: "Account Status", icon: <AccountBoxIcon />, component: AccountStatusSettings },
  { id: "mailing-list", label: "Mailing List", icon: <MessageIcon />, component: MailingListSettings },
  { id: "departments", label: "Departments", icon: <GroupIcon />, component: DepartmentListSettings },
  { id: "position-grades", label: "Position Grades", icon: <WorkIcon />, component: PositionGradeSettings },
  { id: "whatsapp", label: "WhatsApp", icon: <WhatsAppIcon />, component: WhatsAppSettings },
  { id: "active-directory", label: "Active Directory", icon: <DirectoryIcon />, component: ActiveDirectorySettings },
  { id: "exchange-online", label: "Exchange Online", icon: <EmailIcon />, component: ExchangeOnlineSettings },
  { id: "microsoft-graph", label: "Microsoft Graph", icon: <GraphIcon />, component: MicrosoftGraphSettings },
  { id: "authentication", label: "Authentication", icon: <SecurityIcon />, component: AuthenticationSettings },
  { id: "database", label: "Databases", icon: <StorageIcon />, component: DatabaseConfigSettings },
  { id: "account-management", label: "ICT Support", icon: <SettingsApplicationsIcon />, component: AccountManagementSettings },
];

export default function Settings() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [activeTab, setActiveTab] = useState("account-status");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeMenuItem = menuItems.find(item => item.id === activeTab);
  const ActiveComponent = activeMenuItem?.component;

  const handleMenuItemClick = (itemId: string) => {
    setActiveTab(itemId);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  const renderMenuItems = () => (
    <List sx={{ width: '100%', maxWidth: 280, bgcolor: 'background.paper' }}>
      {menuItems.map((item) => (
        <ListItem key={item.id} disablePadding>
          <ListItemButton
            selected={activeTab === item.id}
            onClick={() => handleMenuItemClick(item.id)}
            sx={{
              minHeight: 48,
              px: 2.5,
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
                '& .MuiListItemIcon-root': {
                  color: 'primary.contrastText',
                },
              },
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: 3,
                justifyContent: 'center',
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.label} 
              primaryTypographyProps={{
                fontSize: '0.875rem',
                fontWeight: activeTab === item.id ? 600 : 400,
              }}
            />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );

  return (
    <MainLayout>
      <Box sx={{ display: 'flex', height: '100vh' }}>
        {/* Desktop Sidebar */}
        {!isMobile && (
          <Paper 
            elevation={1} 
            sx={{ 
              width: 280, 
              flexShrink: 0,
              borderRadius: 0,
              borderRight: 1,
              borderColor: 'divider'
            }}
          >
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6" fontWeight="bold">Settings</Typography>
              <Typography variant="body2" color="text.secondary">
                Manage your system settings
              </Typography>
            </Box>
            {renderMenuItems()}
          </Paper>
        )}

        {/* Mobile Drawer */}
        {isMobile && (
          <Drawer
            anchor="left"
            open={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile
            }}
          >
            <Box sx={{ width: 280 }}>
              <Box sx={{ 
                p: 2, 
                borderBottom: 1, 
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Box>
                  <Typography variant="h6" fontWeight="bold">Settings</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Manage your system settings
                  </Typography>
                </Box>
                <IconButton onClick={() => setMobileMenuOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>
              {renderMenuItems()}
            </Box>
          </Drawer>
        )}

        {/* Main Content */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Mobile Header */}
          {isMobile && (
            <Paper 
              elevation={1} 
              sx={{ 
                p: 2, 
                borderRadius: 0,
                borderBottom: 1,
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}
            >
              <IconButton onClick={() => setMobileMenuOpen(true)}>
                <MenuIcon />
              </IconButton>
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  {activeMenuItem?.label || 'Settings'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage your system settings and configurations
                </Typography>
              </Box>
            </Paper>
          )}

          {/* Content Area */}
          <Box sx={{ 
            flexGrow: 1, 
            p: { xs: 2, md: 4 },
            overflow: 'auto'
          }}>
            {!isMobile && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {activeMenuItem?.label}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage your system settings and configurations
                </Typography>
                <Divider sx={{ mt: 2 }} />
              </Box>
            )}
            {ActiveComponent && <ActiveComponent />}
          </Box>
        </Box>
      </Box>
    </MainLayout>
  );
}
