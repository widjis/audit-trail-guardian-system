
import { useState, useEffect } from "react";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import { NewHire } from "@/types/types";
import { whatsappService } from "@/services/whatsapp-service";
import logger from "@/utils/logger";

interface SendWhatsAppDialogProps {
  hire: NewHire;
  onClose: () => void;
}

export function SendWhatsAppDialog({ hire, onClose }: SendWhatsAppDialogProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [defaultRecipient, setDefaultRecipient] = useState<"userNumber" | "testNumber">("userNumber");
  const [isGenerating, setIsGenerating] = useState(true);
  const { toast } = useToast();

  // Generate message and set up phone number when component mounts
  useEffect(() => {
    const setupDialog = async () => {
      try {
        // Generate message from template
        const generatedMsg = await whatsappService.generateMessage(hire);
        setMessage(generatedMsg);
        
        // Get default recipient type
        const recipientType = await whatsappService.getDefaultRecipient();
        setDefaultRecipient(recipientType);
        
        // Set phone number based on recipient type
        if (recipientType === "userNumber" && hire.phone_number) {
          setPhoneNumber(hire.phone_number.replace(/\D/g, ''));
        }
        
        setIsGenerating(false);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to generate message template",
          variant: "destructive",
        });
        setIsGenerating(false);
      }
    };

    setupDialog();
  }, [hire, toast]);

  // Handle send button click
  const handleSend = async () => {
    if (!phoneNumber) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      logger.ui.info("SendWhatsAppDialog", "Sending message to:", phoneNumber);
      await whatsappService.sendMessage(phoneNumber, message);
      
      toast({
        title: "Success",
        description: "WhatsApp message sent successfully",
      });
      
      onClose();
    } catch (error) {
      console.error("Failed to send WhatsApp message:", error);
      toast({
        title: "Error",
        description: "Failed to send WhatsApp message",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Send WhatsApp Message</DialogTitle>
        <DialogDescription>
          Send account information to {hire.name} via WhatsApp
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            placeholder="Enter phone number without + symbol or spaces"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            Format: Country code followed by number (e.g., 6281234567890)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={8}
            disabled={isLoading || isGenerating}
            className="font-mono text-sm"
          />
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSend}
          disabled={isLoading || isGenerating || !phoneNumber}
        >
          {isLoading ? "Sending..." : "Send Message"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
