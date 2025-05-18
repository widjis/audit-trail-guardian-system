
import { useParams } from "react-router-dom";
import { HireForm } from "@/components/hires/HireForm";
import { AuditLogsList } from "@/components/hires/AuditLogsList";
import { MainLayout } from "@/components/layout/MainLayout";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { hiresApi } from "@/services/api";
import { useToast } from "@/components/ui/use-toast";
import { NewHire } from "@/types/types";
import { Button } from "@/components/ui/button";
import { Send, UserPlus, RefreshCw } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { SendWhatsAppDialog } from "@/components/hires/SendWhatsAppDialog";
import { CreateADAccountDialog } from "@/components/hires/CreateADAccountDialog";
import { useQuery } from "@tanstack/react-query";
import { settingsService } from "@/services/settings-service";
import { useAuth } from "@/services/api";

export default function HireDetail() {
  const { id } = useParams<{ id: string }>();
  const [isWhatsAppDialogOpen, setIsWhatsAppDialogOpen] = useState(false);
  const [isADDialogOpen, setIsADDialogOpen] = useState(false);
  const { toast } = useToast();
  const { getCurrentUser } = useAuth();
  const currentUser = getCurrentUser();
  
  // Query to get Active Directory settings
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsService.getSettings
  });
  
  // Query to get hire details with proper caching
  const { 
    data: hire,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['hire', id],
    queryFn: async () => {
      if (!id || id === "new") return null;
      console.log("Fetching hire details with React Query for ID:", id);
      const data = await hiresApi.getOne(id);
      return data;
    },
    enabled: !!id && id !== "new",
    staleTime: 10000, // 10 seconds before refetching
    gcTime: 300000, // Keep in cache for 5 minutes
  });
  
  // Check if AD integration is enabled
  const isADEnabled = settings?.activeDirectorySettings?.enabled || false;

  const handleSendWhatsApp = () => {
    setIsWhatsAppDialogOpen(true);
  };

  const handleCreateADAccount = () => {
    setIsADDialogOpen(true);
  };
  
  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshing",
      description: "Updating hire information..."
    });
  };

  // Check if account is already active - use account_creation_status to be consistent
  const isAccountActive = hire?.account_creation_status === "Active";

  return (
    <MainLayout>
      <div className="space-y-6">
        {!isLoading && id && id !== "new" && hire && (
          <div className="flex items-center justify-between gap-2 mb-4">
            <Button 
              onClick={handleRefresh} 
              variant="outline"
              className="flex items-center gap-2"
              size="sm"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            
            <div className="flex items-center gap-2">
              {isADEnabled && !isAccountActive && (
                <Button 
                  onClick={handleCreateADAccount} 
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <UserPlus className="h-4 w-4" />
                  Create AD Account
                </Button>
              )}
              <Button 
                onClick={handleSendWhatsApp} 
                className="flex items-center gap-2"
                variant="outline"
              >
                <Send className="h-4 w-4" />
                Send via WhatsApp
              </Button>
            </div>
          </div>
        )}
        
        <HireForm currentUser={currentUser} />
        {id && id !== "new" && (
          <>
            <Separator className="my-6" />
            <AuditLogsList hireId={id} />
          </>
        )}
      </div>

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
                // Refresh hire data after creating AD account
                refetch();
                toast({
                  title: "Success",
                  description: "AD Account created and hire information updated",
                });
              }}
            />
          </Dialog>
        </>
      )}
    </MainLayout>
  );
}
