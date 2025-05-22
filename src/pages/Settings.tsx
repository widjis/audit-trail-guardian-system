
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountStatusSettings } from "@/components/settings/AccountStatusSettings";
import { MailingListSettings } from "@/components/settings/MailingListSettings";
import { DepartmentListSettings } from "@/components/settings/DepartmentListSettings";
import { DatabaseConfigSettings } from "@/components/settings/DatabaseConfigSettings";
import { AccountManagementSettings } from "@/components/settings/AccountManagementSettings";
import { WhatsAppSettings } from "@/components/settings/WhatsAppSettings";
import { ActiveDirectorySettings } from "@/components/settings/ActiveDirectorySettings";
import { HrisDatabaseSettings } from "@/components/settings/HrisDatabaseSettings";
import { Database, MessageSquare, Send, Users, Server, Cloud } from "lucide-react";

export default function Settings() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your system settings and configurations.
          </p>
        </div>
        
        <Tabs defaultValue="account-status" className="space-y-4">
          <TabsList>
            <TabsTrigger value="account-status">Account Status</TabsTrigger>
            <TabsTrigger value="mailing-list">Mailing List</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-1">
              <Send className="h-4 w-4" />
              <span>WhatsApp</span>
            </TabsTrigger>
            <TabsTrigger value="active-directory" className="flex items-center gap-1">
              <Server className="h-4 w-4" />
              <span>Active Directory</span>
            </TabsTrigger>
            <TabsTrigger value="database" className="flex items-center gap-1">
              <Database className="h-4 w-4" />
              <span>Database</span>
            </TabsTrigger>
            <TabsTrigger value="hris-database" className="flex items-center gap-1">
              <Cloud className="h-4 w-4" />
              <span>HRIS Database</span>
            </TabsTrigger>
            <TabsTrigger value="account-management" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>ICT Support Accounts</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="account-status" className="space-y-4">
            <AccountStatusSettings />
          </TabsContent>
          
          <TabsContent value="mailing-list" className="space-y-4">
            <MailingListSettings />
          </TabsContent>
          
          <TabsContent value="departments" className="space-y-4">
            <DepartmentListSettings />
          </TabsContent>
          
          <TabsContent value="whatsapp" className="space-y-4">
            <WhatsAppSettings />
          </TabsContent>
          
          <TabsContent value="active-directory" className="space-y-4">
            <ActiveDirectorySettings />
          </TabsContent>
          
          <TabsContent value="database" className="space-y-4">
            <DatabaseConfigSettings />
          </TabsContent>
          
          <TabsContent value="hris-database" className="space-y-4">
            <HrisDatabaseSettings />
          </TabsContent>
          
          <TabsContent value="account-management" className="space-y-4">
            <AccountManagementSettings />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
