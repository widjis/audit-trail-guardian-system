import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Drawer, useMediaQuery } from '@mui/material';
import { Button } from '@/components/ui/button';
import '@/styles/merdeka-settings.css';
import { AccountStatusSettings } from '@/components/settings/AccountStatusSettings';
import { MailingListSettings } from '@/components/settings/MailingListSettings';
import { DepartmentListSettings } from '@/components/settings/DepartmentListSettings';
import { PositionGradeSettings } from '@/components/settings/PositionGradeSettings';
import { DatabaseConfigSettings } from '@/components/settings/DatabaseConfigSettings';
import { AccountManagementSettings } from '@/components/settings/AccountManagementSettings';
import { WhatsAppSettings } from '@/components/settings/WhatsAppSettings';
import { ActiveDirectorySettings } from '@/components/settings/ActiveDirectorySettings';
import { ExchangeOnlineSettings } from '@/components/settings/ExchangeOnlineSettings';
import { MicrosoftGraphSettings } from '@/components/settings/MicrosoftGraphSettings';
import AuthenticationSettings from '@/components/settings/AuthenticationSettings';
import AIServicesSettings from '@/components/settings/AIServicesSettings';
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
import PsychologyIcon from '@mui/icons-material/Psychology';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';

const menuItems = [
  {
    id: 'account-status',
    label: 'Account Status',
    icon: <AccountBoxIcon />,
    component: AccountStatusSettings,
  },
  {
    id: 'mailing-list',
    label: 'Mailing List',
    icon: <MessageIcon />,
    component: MailingListSettings,
  },
  {
    id: 'departments',
    label: 'Departments',
    icon: <GroupIcon />,
    component: DepartmentListSettings,
  },
  {
    id: 'position-grades',
    label: 'Position Grades',
    icon: <WorkIcon />,
    component: PositionGradeSettings,
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: <WhatsAppIcon />,
    component: WhatsAppSettings,
  },
  {
    id: 'active-directory',
    label: 'Active Directory',
    icon: <DirectoryIcon />,
    component: ActiveDirectorySettings,
  },
  {
    id: 'exchange-online',
    label: 'Exchange Online',
    icon: <EmailIcon />,
    component: ExchangeOnlineSettings,
  },
  {
    id: 'microsoft-graph',
    label: 'Microsoft Graph',
    icon: <GraphIcon />,
    component: MicrosoftGraphSettings,
  },
  {
    id: 'ai-services',
    label: 'AI Services',
    icon: <PsychologyIcon />,
    component: AIServicesSettings,
  },
  {
    id: 'authentication',
    label: 'Authentication',
    icon: <SecurityIcon />,
    component: AuthenticationSettings,
  },
  {
    id: 'database',
    label: 'Databases',
    icon: <StorageIcon />,
    component: DatabaseConfigSettings,
  },
  {
    id: 'account-management',
    label: 'ICT Support',
    icon: <SettingsApplicationsIcon />,
    component: AccountManagementSettings,
  },
];

export default function Settings() {
  const isMobile = useMediaQuery('(max-width:1100px)');
  const [activeTab, setActiveTab] = useState('account-status');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activeMenuItem = menuItems.find((item) => item.id === activeTab);
  const ActiveComponent = activeMenuItem?.component;

  const handleMenuItemClick = (itemId: string) => {
    setActiveTab(itemId);
    if (isMobile) setMobileMenuOpen(false);
  };

  const renderMenuItems = () => (
    <nav
      className="merdeka-settings-navigation"
      aria-label="Settings categories"
    >
      {menuItems.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={activeTab === item.id}
          className={activeTab === item.id ? 'active' : ''}
          onClick={() => handleMenuItemClick(item.id)}
        >
          <span aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <MainLayout>
      <div className="merdeka-settings">
        <div className="merdeka-settings-heading">
          <div>
            <h1>Settings</h1>
            <p>Manage system settings and integrations.</p>
          </div>
          {isMobile && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setMobileMenuOpen(true)}
              aria-expanded={mobileMenuOpen}
              aria-label="Open settings categories"
            >
              <MenuIcon aria-hidden="true" />
              {activeMenuItem?.label}
            </Button>
          )}
        </div>
        <div className="merdeka-settings-layout">
          {!isMobile && (
            <aside className="merdeka-settings-menu">
              <h2>Configuration</h2>
              {renderMenuItems()}
            </aside>
          )}
          <section
            className="merdeka-settings-content"
            aria-label={activeMenuItem?.label}
          >
            {ActiveComponent && <ActiveComponent />}
          </section>
        </div>
        <Drawer
          anchor="left"
          open={isMobile && mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          ModalProps={{ keepMounted: true }}
          PaperProps={{ sx: { width: 260 } }}
        >
          <div className="merdeka-settings-drawer">
            <div className="merdeka-settings-drawer-heading">
              <h2>Settings</h2>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close settings categories"
              >
                <CloseIcon />
              </Button>
            </div>
            {renderMenuItems()}
          </div>
        </Drawer>
      </div>
    </MainLayout>
  );
}
