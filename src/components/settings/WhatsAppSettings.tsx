
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { whatsappService } from "@/services/whatsapp-service";
import { Loader2 } from "lucide-react";

export function WhatsAppSettings() {
  const [apiUrl, setApiUrl] = useState("");
  const [defaultMessage, setDefaultMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await whatsappService.getSettings();
        setApiUrl(settings.apiUrl || "");
        setDefaultMessage(settings.defaultMessage || "");
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
      await whatsappService.saveSettings({ apiUrl, defaultMessage });
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
    setIsSaving(true);
    try {
      // Save settings first
      await whatsappService.saveSettings({ apiUrl, defaultMessage });
      
      // Test with a simple message
      await whatsappService.sendMessage("test", "This is a test message from the HR Portal");
      
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
      <CardContent className="space-y-4">
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
            Use {{name}}, {{email}}, {{title}}, etc. as placeholders for hire information
          </p>
        </div>

        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={isSaving || !apiUrl}
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Test Connection
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
