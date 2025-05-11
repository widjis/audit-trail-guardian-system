
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { whatsappService } from "@/services/whatsapp-service";
import { Loader2 } from "lucide-react";
import { NewHire } from "@/types/types";

interface SendWhatsAppDialogProps {
  hire: NewHire;
  onClose: () => void;
}

export function SendWhatsAppDialog({ hire, onClose }: SendWhatsAppDialogProps) {
  const [phoneNumber, setPhoneNumber] = useState(hire.phone_number || "");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Load default message when component mounts
  useState(() => {
    const loadMessage = async () => {
      try {
        const generatedMessage = await whatsappService.generateMessage(hire);
        setMessage(generatedMessage);
      } catch (error) {
        console.error("Error generating message:", error);
        toast({
          title: "Error",
          description: "Failed to generate message template",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadMessage();
  });

  const handleSend = async () => {
    if (!phoneNumber) {
      toast({
        title: "Error",
        description: "Phone number is required",
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
        description: `Failed to send message: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[525px]">
      <DialogHeader>
        <DialogTitle>Send WhatsApp Message</DialogTitle>
        <DialogDescription>
          Send account information to {hire.name} via WhatsApp
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <label htmlFor="phoneNumber" className="text-sm font-medium leading-none">
            Phone Number
          </label>
          <Input
            id="phoneNumber"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="e.g. 628123456789"
            disabled={isSending}
          />
          <p className="text-xs text-muted-foreground">
            Enter phone number with country code but without + or spaces
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="message" className="text-sm font-medium leading-none">
            Message
          </label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={8}
            disabled={isSending || isLoading}
          />
          {isLoading && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Loading template...</span>
            </div>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isSending}>
          Cancel
        </Button>
        <Button onClick={handleSend} disabled={isSending || !phoneNumber || !message}>
          {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Send Message
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
