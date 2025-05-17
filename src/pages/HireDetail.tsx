
import { useParams } from "react-router-dom";
import { HireForm } from "@/components/hires/HireForm";
import { AuditLogsList } from "@/components/hires/AuditLogsList";
import { MainLayout } from "@/components/layout/MainLayout";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState, useCallback } from "react";
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

export default function HireDetail() {
  const { id } = useParams<{ id: string }>();
  const [hire, setHire] = useState<NewHire | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWhatsAppDialogOpen, setIsWhatsAppDialogOpen] = useState(false);
  const [isADDialogOpen, setIsADDialogOpen] = useState(false);
  const { toast } = useToast();
  
  // Query to get Active Directory settings
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsService.getSettings
  });
  
  // Check if AD integration is enabled
  const isADEnabled = settings?.activeDirectorySettings?.enabled || false;
  
  // Fetch hire details function - made into a callback so it can be called after AD account creation
  const fetchHireDetails = useCallback(() => {
    if (!id || id === "new") return;
    
    console.log("Fetching hire details for ID:", id);
    setIsLoading(true);
    
    hiresApi.getOne(id)
      .then(data => {
        console.log("Fetched hire details:", data);
        console.log("Account creation status:", data.account_creation_status);
        setHire(data);
      })
      .catch(error => {
        console.error("Error fetching hire details:", error);
        toast({
          title: "Error",
          description: "Failed to fetch hire details",
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id, toast]);

  useEffect(() => {
    fetchHireDetails();
  }, [fetchHireDetails]);

  const handleSendWhatsApp = () => {
    setIsWhatsAppDialogOpen(true);
  };

  const handleCreateADAccount = () => {
    setIsADDialogOpen(true);
  };
  
  const handleRefresh = () => {
    fetchHireDetails();
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
        
        <HireForm />
        {id && id !== "new" && (
          <>
            <Separator className="my-6" />
            <AuditLogsList hireId={id} refreshKey={hire?.updated_at || ''} />
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
                fetchHireDetails();
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
