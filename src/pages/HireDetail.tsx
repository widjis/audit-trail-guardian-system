
import { useParams } from "react-router-dom";
import { HireForm } from "@/components/hires/HireForm";
import { AuditLogsList } from "@/components/hires/AuditLogsList";
import { MainLayout } from "@/components/layout/MainLayout";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";
import { hiresApi } from "@/services/api";
import { useToast } from "@/components/ui/use-toast";
import { NewHire } from "@/types/types";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { SendWhatsAppDialog } from "@/components/hires/SendWhatsAppDialog";

export default function HireDetail() {
  const { id } = useParams<{ id: string }>();
  const [hire, setHire] = useState<NewHire | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWhatsAppDialogOpen, setIsWhatsAppDialogOpen] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    // Log the ID to help with debugging
    console.log("HireDetail page loaded with ID:", id);
    
    // Fetch hire details if we have an ID and it's not a new hire
    if (id && id !== "new") {
      setIsLoading(true);
      hiresApi.getOne(id)
        .then(data => {
          console.log("Fetched hire details:", data);
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
    } else {
      setIsLoading(false);
    }
  }, [id, toast]);

  const handleSendWhatsApp = () => {
    setIsWhatsAppDialogOpen(true);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {!isLoading && id && id !== "new" && hire && (
          <div className="flex items-center justify-end mb-4">
            <Button 
              onClick={handleSendWhatsApp} 
              className="flex items-center gap-2"
              variant="outline"
            >
              <Send className="h-4 w-4" />
              Send via WhatsApp
            </Button>
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
        <Dialog open={isWhatsAppDialogOpen} onOpenChange={setIsWhatsAppDialogOpen}>
          <SendWhatsAppDialog 
            hire={hire} 
            onClose={() => setIsWhatsAppDialogOpen(false)} 
          />
        </Dialog>
      )}
    </MainLayout>
  );
}
