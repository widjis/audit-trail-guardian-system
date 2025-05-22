
import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountStatusSettings } from "@/components/settings/AccountStatusSettings";
import { MailingListSettings } from "@/components/settings/MailingListSettings";
import { DepartmentListSettings } from "@/components/settings/DepartmentListSettings";
import { DatabaseConfigSettings } from "@/components/settings/DatabaseConfigSettings";
import { AccountManagementSettings } from "@/components/settings/AccountManagementSettings";
import { WhatsAppSettings } from "@/components/settings/WhatsAppSettings";
import { ActiveDirectorySettings } from "@/components/settings/ActiveDirectorySettings";
import { Database, MessageSquare, Users, Server, BadgeCheck } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Settings() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("account-status");

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your system settings and configurations.
          </p>
        </div>
        
        <Tabs 
          defaultValue="account-status" 
          className="space-y-4"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <div className={`${isMobile ? 'overflow-x-auto pb-2' : ''}`}>
            <TabsList className={`${isMobile ? 'inline-flex w-max' : 'flex flex-wrap'} bg-slate-100`}>
              <TabsTrigger value="account-status" className="flex items-center gap-1">
                <BadgeCheck className="h-4 w-4" />
                <span>Account Status</span>
              </TabsTrigger>
              <TabsTrigger value="mailing-list" className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span>Mailing List</span>
              </TabsTrigger>
              <TabsTrigger value="departments" className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>Departments</span>
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span>WhatsApp</span>
              </TabsTrigger>
              <TabsTrigger value="active-directory" className="flex items-center gap-1">
                <Server className="h-4 w-4" />
                <span>Active Directory</span>
              </TabsTrigger>
              <TabsTrigger value="database" className="flex items-center gap-1">
                <Database className="h-4 w-4" />
                <span>Databases</span>
              </TabsTrigger>
              <TabsTrigger value="account-management" className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>ICT Support</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
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
          
          <TabsContent value="account-management" className="space-y-4">
            <AccountManagementSettings />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
