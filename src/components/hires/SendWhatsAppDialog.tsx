
import { useState, useEffect } from "react";
import { NewHire } from "@/types/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { whatsappService } from "@/services/whatsapp-service";
import { useToast } from "@/components/ui/use-toast";
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface SendWhatsAppDialogProps {
  hire: NewHire;
  onClose: () => void;
}

export function SendWhatsAppDialog({ hire, onClose }: SendWhatsAppDialogProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get the generated message based on template and hire data
        const generatedMessage = await whatsappService.generateMessage(hire);
        setMessage(generatedMessage);
        
        // Get the default recipient setting
        const defaultRecipient = await whatsappService.getDefaultRecipient();
        
        // Set phone number based on setting
        if (defaultRecipient === "userNumber" && hire.phone) {
          // Format the phone number if needed (remove spaces, add country code, etc.)
          let formattedPhone = hire.phone.replace(/\s+/g, '');
          // Ensure it has country code
          if (!formattedPhone.startsWith('62') && formattedPhone.startsWith('0')) {
            formattedPhone = '62' + formattedPhone.substring(1);
          }
          setPhoneNumber(formattedPhone);
        } else {
          // Leave it empty if user's number shouldn't be used by default
          setPhoneNumber("");
        }
      } catch (error) {
        console.error("Error loading WhatsApp data:", error);
        toast({
          title: "Error",
          description: "Failed to load WhatsApp configuration",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [hire, toast]);

  const handleSend = async () => {
    if (!phoneNumber) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      await whatsappService.sendMessage(phoneNumber, message);
      toast({
        title: "Success",
        description: "WhatsApp message sent successfully",
      });
      onClose();
    } catch (error) {
      console.error("Error sending WhatsApp message:", error);
      toast({
        title: "Error",
        description: `Failed to send WhatsApp message: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Send WhatsApp Message</DialogTitle>
      </DialogHeader>
      
      {isLoading ? (
        <div className="flex justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="phoneNumber" className="text-sm font-medium">
                Phone Number
              </label>
              <Input
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="628123456789"
              />
              <p className="text-xs text-muted-foreground">
                Enter the phone number with country code but without + or spaces
              </p>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="message" className="text-sm font-medium">
                Message
              </label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
            </div>
          </div>
          
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSending}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSend} disabled={isSending}>
              {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send Message
            </Button>
          </DialogFooter>
        </>
      )}
    </DialogContent>
  );
}
