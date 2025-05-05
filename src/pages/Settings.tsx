
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountStatusSettings } from "@/components/settings/AccountStatusSettings";
import { MailingListSettings } from "@/components/settings/MailingListSettings";
import { DepartmentListSettings } from "@/components/settings/DepartmentListSettings";

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
        </Tabs>
      </div>
    </MainLayout>
  );
}
