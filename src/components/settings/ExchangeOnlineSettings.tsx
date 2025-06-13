
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, TestTube } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation } from "@tanstack/react-query";
import { settingsService } from "@/services/settings-service";
import { distributionListService } from "@/services/distribution-list-service";

interface ExchangeOnlineSettings {
  enabled: boolean;
  appId: string;
  tenantId: string;
  certificateThumbprint: string;
}

export function ExchangeOnlineSettings() {
  const [settings, setSettings] = useState<ExchangeOnlineSettings>({
    enabled: false,
    appId: "",
    tenantId: "",
    certificateThumbprint: ""
  });

  // Fetch Exchange Online settings
  const { data, isLoading, error } = useQuery({
    queryKey: ['exchange-online-settings'],
    queryFn: async () => {
      const data = await settingsService.getSettings();
      return data.exchangeOnlineSettings || {
        enabled: false,
        appId: "",
        tenantId: "",
        certificateThumbprint: ""
      };
    }
  });

  // Update local state when data is loaded
  useEffect(() => {
    if (data) {
      setSettings(data);
    }
  }, [data]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: ExchangeOnlineSettings) => {
      const response = await settingsService.updateExchangeOnlineSettings(newSettings);
      return response;
    },
    onSuccess: () => {
      toast.success("Exchange Online settings saved successfully");
    },
    onError: (error) => {
      toast.error("Failed to save Exchange Online settings");
      console.error("Error saving Exchange Online settings:", error);
    }
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      return await distributionListService.testConnection(
        settings.appId,
        settings.tenantId,
        settings.certificateThumbprint
      );
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Exchange Online connection test successful");
      } else {
        toast.error(`Connection test failed: ${data.message}`);
      }
    },
    onError: (error) => {
      toast.error("Connection test failed");
      console.error("Connection test error:", error);
    }
  });

  const handleInputChange = (field: keyof ExchangeOnlineSettings, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    saveSettingsMutation.mutate(settings);
  };

  const handleTestConnection = () => {
    if (!settings.appId || !settings.tenantId || !settings.certificateThumbprint) {
      toast.error("Please fill in all required fields before testing connection");
      return;
    }
    testConnectionMutation.mutate();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-6">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading Exchange Online settings...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-red-500">Error loading Exchange Online settings. Please try again later.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exchange Online Settings</CardTitle>
        <CardDescription>
          Configure Exchange Online integration for distribution list management. Requires app registration with certificate authentication.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-2">
          <Switch
            id="enabled"
            checked={settings.enabled}
            onCheckedChange={(checked) => handleInputChange('enabled', checked)}
          />
          <Label htmlFor="enabled" className="text-sm font-medium">
            Enable Exchange Online Integration
          </Label>
        </div>

        {settings.enabled && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="appId" className="text-sm font-medium">
                Application (Client) ID *
              </Label>
              <Input
                id="appId"
                value={settings.appId}
                onChange={(e) => handleInputChange('appId', e.target.value)}
                placeholder="Enter Azure AD Application ID"
                required
              />
              <p className="text-xs text-muted-foreground">
                The Application (Client) ID from your Azure AD app registration
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenantId" className="text-sm font-medium">
                Tenant ID *
              </Label>
              <Input
                id="tenantId"
                value={settings.tenantId}
                onChange={(e) => handleInputChange('tenantId', e.target.value)}
                placeholder="Enter Azure AD Tenant ID"
                required
              />
              <p className="text-xs text-muted-foreground">
                The Directory (Tenant) ID of your Azure AD organization
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="certificateThumbprint" className="text-sm font-medium">
                Certificate Thumbprint *
              </Label>
              <Input
                id="certificateThumbprint"
                value={settings.certificateThumbprint}
                onChange={(e) => handleInputChange('certificateThumbprint', e.target.value)}
                placeholder="Enter certificate thumbprint"
                required
              />
              <p className="text-xs text-muted-foreground">
                The thumbprint of the certificate uploaded to your Azure AD app registration
              </p>
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={handleTestConnection}
                variant="outline"
                disabled={testConnectionMutation.isPending || !settings.appId || !settings.tenantId || !settings.certificateThumbprint}
              >
                {testConnectionMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        <div className="pt-4 border-t">
          <Button 
            onClick={handleSave}
            disabled={saveSettingsMutation.isPending}
          >
            {saveSettingsMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
