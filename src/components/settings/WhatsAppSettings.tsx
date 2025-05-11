
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { whatsappService } from "@/services/whatsapp-service";
import { Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export function WhatsAppSettings() {
  const [apiUrl, setApiUrl] = useState("");
  const [defaultMessage, setDefaultMessage] = useState("");
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [defaultRecipient, setDefaultRecipient] = useState("userNumber");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await whatsappService.getSettings();
        setApiUrl(settings.apiUrl || "");
        setDefaultMessage(settings.defaultMessage || "");
        setDefaultRecipient(settings.defaultRecipient || "userNumber");
      } catch (error) {
        console.error("Error loading WhatsApp settings:", error);
        toast({
          title: "Error",
          description: "Failed to load WhatsApp settings",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [toast]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await whatsappService.saveSettings({ 
        apiUrl, 
        defaultMessage,
        defaultRecipient 
      });
      toast({
        title: "Success",
        description: "WhatsApp settings saved successfully",
      });
    } catch (error) {
      console.error("Error saving WhatsApp settings:", error);
      toast({
        title: "Error",
        description: "Failed to save WhatsApp settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!testPhoneNumber) {
      toast({
        title: "Error",
        description: "Please enter a test phone number",
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    try {
      // Save settings first
      await whatsappService.saveSettings({ 
        apiUrl, 
        defaultMessage,
        defaultRecipient 
      });
      
      // Test with a simple message
      await whatsappService.sendMessage(testPhoneNumber, "This is a test message from the HR Portal");
      
      toast({
        title: "Success",
        description: "WhatsApp API connection test successful",
      });
    } catch (error) {
      console.error("Error testing WhatsApp connection:", error);
      toast({
        title: "Error",
        description: `Connection test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp Integration</CardTitle>
          <CardDescription>Loading settings...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>WhatsApp Integration</CardTitle>
        <CardDescription>
          Configure the WhatsApp API settings to send account information to new hires.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="apiUrl" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            WhatsApp API URL
          </label>
          <Input
            id="apiUrl"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="http://10.60.10.46:8192"
            disabled={isSaving}
          />
          <p className="text-xs text-muted-foreground">
            Enter the base URL of your WhatsApp API service (without /send-message)
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="defaultMessage" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Default Message Template
          </label>
          <Textarea
            id="defaultMessage"
            value={defaultMessage}
            onChange={(e) => setDefaultMessage(e.target.value)}
            rows={10}
            disabled={isSaving}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Use &#123;&#123;name&#125;&#125;, &#123;&#123;email&#125;&#125;, &#123;&#123;title&#125;&#125;, etc. as placeholders for hire information
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Default Recipient</h3>
            <RadioGroup 
              value={defaultRecipient} 
              onValueChange={setDefaultRecipient}
              disabled={isSaving}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="userNumber" id="userNumber" />
                <Label htmlFor="userNumber">Send to user's phone number</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="testNumber" id="testNumber" />
                <Label htmlFor="testNumber">Send to test number (for testing)</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-medium">Connection Testing</h3>
          <div className="flex flex-col space-y-3">
            <div>
              <Label htmlFor="testPhoneNumber" className="text-sm">Test Phone Number</Label>
              <Input
                id="testPhoneNumber"
                value={testPhoneNumber}
                onChange={(e) => setTestPhoneNumber(e.target.value)}
                placeholder="628123456789"
                disabled={isSaving}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the phone number with country code but without + or spaces (e.g., 628123456789)
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isSaving || !apiUrl || !testPhoneNumber}
              className="mt-2 self-start"
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Test Connection
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
