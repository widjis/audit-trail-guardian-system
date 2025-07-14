
import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, Tab } from '@mui/material';
import { AccountStatusSettings } from "@/components/settings/AccountStatusSettings";
import { MailingListSettings } from "@/components/settings/MailingListSettings";
import { DepartmentListSettings } from "@/components/settings/DepartmentListSettings";
import { DatabaseConfigSettings } from "@/components/settings/DatabaseConfigSettings";
import { AccountManagementSettings } from "@/components/settings/AccountManagementSettings";
import { WhatsAppSettings } from "@/components/settings/WhatsAppSettings";
import { ActiveDirectorySettings } from "@/components/settings/ActiveDirectorySettings";
import { ExchangeOnlineSettings } from "@/components/settings/ExchangeOnlineSettings";
import { MicrosoftGraphSettings } from "@/components/settings/MicrosoftGraphSettings";
import StorageIcon from '@mui/icons-material/Storage';
import MessageIcon from '@mui/icons-material/Message';
import GroupIcon from '@mui/icons-material/Group';
import SettingsApplicationsIcon from '@mui/icons-material/SettingsApplications';
import AccountBoxIcon from '@mui/icons-material/AccountBox';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import DirectoryIcon from '@mui/icons-material/Folder';
import EmailIcon from '@mui/icons-material/Email';
import GraphIcon from '@mui/icons-material/ShowChart';
import { useMediaQuery, useTheme, Box, Typography } from '@mui/material';

export default function Settings() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeTab, setActiveTab] = useState("account-status");

  return (
    <MainLayout>
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>Settings</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Manage your system settings and configurations.</Typography>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          orientation={isMobile ? 'vertical' : 'horizontal'}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
        >
          <Tab label="Account Status" value="account-status" icon={<AccountBoxIcon />} iconPosition="start" />
          <Tab label="Mailing List" value="mailing-list" icon={<MessageIcon />} iconPosition="start" />
          <Tab label="Departments" value="departments" icon={<GroupIcon />} iconPosition="start" />
          <Tab label="WhatsApp" value="whatsapp" icon={<WhatsAppIcon />} iconPosition="start" />
          <Tab label="Active Directory" value="active-directory" icon={<DirectoryIcon />} iconPosition="start" />
          <Tab label="Exchange Online" value="exchange-online" icon={<EmailIcon />} iconPosition="start" />
          <Tab label="Microsoft Graph" value="microsoft-graph" icon={<GraphIcon />} iconPosition="start" />
          <Tab label="Databases" value="database" icon={<StorageIcon />} iconPosition="start" />
          <Tab label="ICT Support" value="account-management" icon={<SettingsApplicationsIcon />} iconPosition="start" />
        </Tabs>
        {activeTab === "account-status" && <AccountStatusSettings />}
        {activeTab === "mailing-list" && <MailingListSettings />}
        {activeTab === "departments" && <DepartmentListSettings />}
        {activeTab === "whatsapp" && <WhatsAppSettings />}
        {activeTab === "active-directory" && <ActiveDirectorySettings />}
        {activeTab === "exchange-online" && <ExchangeOnlineSettings />}
        {activeTab === "microsoft-graph" && <MicrosoftGraphSettings />}
        {activeTab === "database" && <DatabaseConfigSettings />}
        {activeTab === "account-management" && <AccountManagementSettings />}
      </Box>
    </MainLayout>
  );
}
