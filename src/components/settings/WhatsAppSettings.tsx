
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { whatsappService } from "@/services/whatsapp-service";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Send, Info } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Types for WhatsApp settings
interface WhatsAppSettings {
  apiUrl: string;
  defaultMessage: string;
  defaultRecipient: "userNumber" | "testNumber";
}

export function WhatsAppSettings() {
  // State for settings
  const [settings, setSettings] = useState<WhatsAppSettings>({
    apiUrl: "",
    defaultMessage: "",
    defaultRecipient: "userNumber" as "userNumber" | "testNumber",
  });

  // State for loading states and test number
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testNumber, setTestNumber] = useState("");
  const [testNumberError, setTestNumberError] = useState("");

  const { toast } = useToast();

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const whatsappSettings = await whatsappService.getSettings();
        setSettings({
          apiUrl: whatsappSettings.apiUrl,
          defaultMessage: whatsappSettings.defaultMessage,
          defaultRecipient: (whatsappSettings.defaultRecipient as "userNumber" | "testNumber") || "userNumber",
        });
      } catch (error) {
        console.error("Failed to load WhatsApp settings:", error);
        toast({
          title: "Error",
          description: "Failed to load WhatsApp settings",
          variant: "destructive",
        });
      }
    };

    loadSettings();
  }, [toast]);

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  // Handle radio button change for default recipient
  const handleRecipientChange = (value: "userNumber" | "testNumber") => {
    setSettings((prev) => ({ ...prev, defaultRecipient: value }));
  };

  // Save settings
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await whatsappService.saveSettings(settings);
      toast({
        title: "Success",
        description: "WhatsApp settings saved successfully",
      });
    } catch (error) {
      console.error("Failed to save WhatsApp settings:", error);
      toast({
        title: "Error",
        description: "Failed to save WhatsApp settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Test connection
  const handleTestConnection = async () => {
    if (!testNumber) {
      setTestNumberError("Please enter a test phone number");
      return;
    }

    setTestNumberError("");
    setIsTesting(true);
    try {
      // Example message with placeholder variables for testing
      const testMessage = "This is a test message from the MTI Onboarding System.";
      await whatsappService.sendMessage(testNumber, testMessage);
      toast({
        title: "Success",
        description: "Test message sent successfully",
      });
    } catch (error) {
      console.error("Failed to send test message:", error);
      toast({
        title: "Error",
        description: "Failed to send test message. Please check the API URL and the test number format.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">WhatsApp Integration Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure the WhatsApp API integration for sending account information to new hires.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* API URL */}
          <div className="space-y-2">
            <Label htmlFor="apiUrl">WhatsApp API URL</Label>
            <Input
              id="apiUrl"
              name="apiUrl"
              placeholder="http://your-api-url:port"
              value={settings.apiUrl}
              onChange={handleChange}
            />
            <p className="text-xs text-muted-foreground">
              The URL of the WhatsApp messaging API service.
            </p>
          </div>

          {/* Test Number Input */}
          <div className="space-y-2">
            <Label htmlFor="testNumber">Test Phone Number</Label>
            <Input
              id="testNumber"
              name="testNumber"
              placeholder="6281234567890"
              value={testNumber}
              onChange={(e) => {
                setTestNumber(e.target.value);
                setTestNumberError("");
              }}
            />
            {testNumberError && (
              <p className="text-xs text-destructive">{testNumberError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Enter a phone number with country code but without the '+' symbol or spaces for testing.
            </p>
          </div>

          {/* Test Connection Button */}
          <Button
            onClick={handleTestConnection}
            disabled={isTesting || !settings.apiUrl}
            className="flex gap-2 items-center w-full sm:w-auto"
          >
            {isTesting ? "Testing..." : "Test Connection"}
            <Send className="h-4 w-4" />
          </Button>

          {/* Default Recipient */}
          <div className="space-y-2">
            <Label>Default Recipient for "Send WhatsApp" Button</Label>
            <RadioGroup 
              value={settings.defaultRecipient} 
              onValueChange={(value: "userNumber" | "testNumber") => handleRecipientChange(value)}
              className="flex flex-col space-y-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="userNumber" id="userNumber" />
                <Label htmlFor="userNumber" className="font-normal cursor-pointer">User's phone number</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="testNumber" id="testNumber" />
                <Label htmlFor="testNumber" className="font-normal cursor-pointer">Test number from settings</Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              Choose whether to send messages to the user's actual phone number or to the test number by default.
            </p>
          </div>

          {/* Message Template */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="defaultMessage">Default Message Template</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Use these placeholders in your message:</p>
                    <p className="text-xs">
                      {`{{name}}, {{email}}, {{title}}, {{department}}, {{password}}`}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Textarea
              id="defaultMessage"
              name="defaultMessage"
              placeholder="Welcome message with placeholders..."
              value={settings.defaultMessage}
              onChange={handleChange}
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
