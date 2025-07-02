
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X, Send, UserPlus, RefreshCw, Mail, User, Activity, FileText, History } from "lucide-react";
import { useState } from "react";
import { NewHire } from "@/types/types";
import { useQuery } from "@tanstack/react-query";
import { hiresApi } from "@/services/api";
import { settingsService } from "@/services/settings-service";
import { useAuth } from "@/services/api";
import { useToast } from "@/components/ui/use-toast";
import { SendWhatsAppDialog } from "./SendWhatsAppDialog";
import { CreateADAccountDialog } from "./CreateADAccountDialog";
import { SyncDistributionListDialog } from "./SyncDistributionListDialog";
import { AuditLogsList } from "./AuditLogsList";
import { SrfDocumentUpload } from "./SrfDocumentUpload";
import { calculateProgressPercentage } from "@/utils/progressCalculator";
import { ProgressBar } from "@/components/ui/progress-bar";

interface HireDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  hireId: string | null;
}

export function HireDetailModal({ isOpen, onClose, hireId }: HireDetailModalProps) {
  const [isWhatsAppDialogOpen, setIsWhatsAppDialogOpen] = useState(false);
  const [isADDialogOpen, setIsADDialogOpen] = useState(false);
  const [isSyncDLDialogOpen, setIsSyncDLDialogOpen] = useState(false);
  const { toast } = useToast();
  const { getCurrentUser } = useAuth();
  const currentUser = getCurrentUser();

  // Query to get hire details
  const { 
    data: hire,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['hire', hireId],
    queryFn: async () => {
      if (!hireId) return null;
      const data = await hiresApi.getOne(hireId);
      return data;
    },
    enabled: !!hireId && isOpen,
    staleTime: 10000,
    gcTime: 300000,
  });

  // Query to get settings
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsService.getSettings
  });

  if (!isOpen || !hireId) return null;

  const isADEnabled = settings?.activeDirectorySettings?.enabled || false;
  const isExchangeEnabled = settings?.exchangeOnlineSettings?.enabled || false;
  
  const distributionListSyncStatus = hire?.distribution_list_sync_status ?? null;
  const showSyncButton = isExchangeEnabled && hire?.email && 
    (distributionListSyncStatus === null || distributionListSyncStatus === "Failed" || distributionListSyncStatus === "Partial");
  const isFullySynced = distributionListSyncStatus === "Synced";
  const isAccountActive = hire?.account_creation_status === "Active";

  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshing",
      description: "Updating hire information..."
    });
  };

  const progressPercentage = hire ? calculateProgressPercentage(hire) : 0;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 gap-0">
          <DialogHeader className="p-6 border-b bg-white relative z-10 flex-shrink-0">
            <DialogTitle className="flex items-center justify-between pr-8">
              <div className="flex items-center gap-4">
                <User className="h-6 w-6 text-blue-600" />
                <div>
                  <h2 className="text-xl font-semibold">{hire?.name || "Loading..."}</h2>
                  {hire && (
                    <p className="text-sm text-muted-foreground">
                      {hire.title} • {hire.department}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleRefresh} 
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Loading hire details...</p>
                </div>
              </div>
            ) : hire ? (
              <Tabs defaultValue="general" className="h-full flex flex-col">
                <div className="px-6 pt-4 border-b">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="general" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      General
                    </TabsTrigger>
                    <TabsTrigger value="progress" className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Progress
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Documents
                    </TabsTrigger>
                    <TabsTrigger value="audit" className="flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Audit Logs
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-auto p-6">
                  <TabsContent value="general" className="mt-0 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Personal Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Name</label>
                            <p className="font-medium">{hire.name}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Email</label>
                            <p>{hire.email}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Phone</label>
                            <p>{hire.phone_number || "N/A"}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">On-site Date</label>
                            <p>{hire.on_site_date ? new Date(hire.on_site_date).toLocaleDateString() : "N/A"}</p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Work Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Title</label>
                            <p className="font-medium">{hire.title}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Department</label>
                            <p>{hire.department}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Position Grade</label>
                            <p>{hire.position_grade}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Direct Report</label>
                            <p>{hire.direct_report || "N/A"}</p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Account Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Username</label>
                            <p className="font-mono">{hire.username || "Not set"}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Account Status</label>
                            <Badge variant={hire.account_creation_status === "Active" ? "default" : "secondary"}>
                              {hire.account_creation_status}
                            </Badge>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Microsoft 365 License</label>
                            <Badge variant={hire.microsoft_365_license ? "default" : "secondary"}>
                              {hire.microsoft_365_license || "None"}
                            </Badge>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">ICT Support PIC</label>
                            <p>{hire.ict_support_pic || "Unassigned"}</p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Additional Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Laptop Status</label>
                            <p>{hire.laptop_ready || "Not specified"}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">SRF Status</label>
                            <Badge variant={hire.status_srf ? "default" : "secondary"}>
                              {hire.status_srf ? "Complete" : "Pending"}
                            </Badge>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Remarks</label>
                            <p className="text-sm">{hire.remarks || "No remarks"}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Notes</label>
                            <p className="text-sm">{hire.note || "No notes"}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="progress" className="mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Onboarding Progress</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium">Overall Progress</span>
                              <span className="text-sm text-muted-foreground">{progressPercentage}%</span>
                            </div>
                            <ProgressBar percentage={progressPercentage} showText={false} />
                          </div>
                          
                          <Separator />
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <h4 className="font-medium">Account Setup</h4>
                              <div className="flex items-center gap-2">
                                <Badge variant={hire.account_creation_status === "Active" ? "default" : "secondary"}>
                                  {hire.account_creation_status}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <h4 className="font-medium">License Assignment</h4>
                              <div className="flex items-center gap-2">
                                <Badge variant={hire.license_assigned ? "default" : "secondary"}>
                                  {hire.license_assigned ? "Assigned" : "Pending"}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <h4 className="font-medium">SRF Document</h4>
                              <div className="flex items-center gap-2">
                                <Badge variant={hire.status_srf ? "default" : "secondary"}>
                                  {hire.status_srf ? "Complete" : "Pending"}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <h4 className="font-medium">Distribution Lists</h4>
                              <div className="flex items-center gap-2">
                                <Badge variant={isFullySynced ? "default" : "secondary"}>
                                  {distributionListSyncStatus || "Not Synced"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="documents" className="mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">SRF Document</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <SrfDocumentUpload hire={hire} />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="audit" className="mt-0">
                    <AuditLogsList hireId={hire.id!} />
                  </TabsContent>
                </div>

                {/* Action Buttons Footer */}
                <div className="border-t bg-gray-50 p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {isADEnabled && !isAccountActive && (
                        <Button 
                          onClick={() => setIsADDialogOpen(true)} 
                          className="flex items-center gap-2"
                          variant="outline"
                        >
                          <UserPlus className="h-4 w-4" />
                          Create AD Account
                        </Button>
                      )}
                      {showSyncButton && (
                        <Button 
                          onClick={() => setIsSyncDLDialogOpen(true)} 
                          className="flex items-center gap-2"
                          variant="outline"
                        >
                          <Mail className="h-4 w-4" />
                          {distributionListSyncStatus === "Partial" ? "Re-sync to O365" : "Sync to O365"}
                        </Button>
                      )}
                      {isFullySynced && (
                        <Button 
                          variant="outline"
                          className="flex items-center gap-2 text-green-600 border-green-500 cursor-default"
                          disabled
                        >
                          <Mail className="h-4 w-4" />
                          Synced ✓
                        </Button>
                      )}
                    </div>
                    
                    <Button 
                      onClick={() => setIsWhatsAppDialogOpen(true)} 
                      className="flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Send via WhatsApp
                    </Button>
                  </div>
                </div>
              </Tabs>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Hire not found</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {hire && (
        <>
          <Dialog open={isWhatsAppDialogOpen} onOpenChange={setIsWhatsAppDialogOpen}>
            <SendWhatsAppDialog 
              hire={hire} 
              onClose={() => setIsWhatsAppDialogOpen(false)} 
            />
          </Dialog>
          
          <Dialog open={isADDialogOpen} onOpenChange={setIsADDialogOpen}>
            <CreateADAccountDialog 
              hire={hire} 
              onClose={() => setIsADDialogOpen(false)}
              onSuccess={() => {
                refetch();
                toast({
                  title: "Success",
                  description: "AD Account created and hire information updated",
                });
              }}
            />
          </Dialog>

          <Dialog open={isSyncDLDialogOpen} onOpenChange={setIsSyncDLDialogOpen}>
            <SyncDistributionListDialog 
              hire={hire} 
              onClose={() => setIsSyncDLDialogOpen(false)}
              onSuccess={() => {
                refetch();
                toast({
                  title: "Success",
                  description: "Distribution lists synced successfully",
                });
              }}
            />
          </Dialog>
        </>
      )}
    </>
  );
}
