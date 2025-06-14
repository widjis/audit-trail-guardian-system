
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, TestTube, Settings, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation } from "@tanstack/react-query";
import { settingsService } from "@/services/settings-service";
import { distributionListService } from "@/services/distribution-list-service";
import { ExchangeOnlineSetupWizard } from "./ExchangeOnlineSetupWizard";

interface ExchangeOnlineSettings {
  enabled: boolean;
  username: string;
  passwordConfigured: boolean;
  lastConnectionTest?: string;
}

export function ExchangeOnlineSettings() {
  const [settings, setSettings] = useState<ExchangeOnlineSettings>({
    enabled: false,
    username: "",
    passwordConfigured: false
  });
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);

  // Fetch Exchange Online settings
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['exchange-online-settings'],
    queryFn: async () => {
      const data = await settingsService.getExchangeOnlineSettings();
      return data || {
        enabled: false,
        username: "",
        passwordConfigured: false
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
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to save Exchange Online settings");
      console.error("Error saving Exchange Online settings:", error);
    }
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      return await distributionListService.testBasicConnection(settings.username);
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Exchange Online connection test successful");
        setSettings(prev => ({ ...prev, lastConnectionTest: new Date().toISOString() }));
      } else {
        toast.error(`Connection test failed: ${data.message}`);
      }
    },
    onError: (error) => {
      toast.error("Connection test failed");
      console.error("Connection test error:", error);
    }
  });

  const handleToggleEnabled = (enabled: boolean) => {
    setSettings(prev => ({ ...prev, enabled }));
  };

  const handleSave = () => {
    saveSettingsMutation.mutate(settings);
  };

  const handleSetupPassword = () => {
    setIsResetMode(false);
    setShowSetupWizard(true);
  };

  const handleResetPassword = () => {
    setIsResetMode(true);
    setShowSetupWizard(true);
  };

  const handleTestConnection = () => {
    if (!settings.username || !settings.passwordConfigured) {
      toast.error("Please complete setup before testing connection");
      return;
    }
    testConnectionMutation.mutate();
  };

  const handleSetupComplete = () => {
    setSettings(prev => ({ ...prev, passwordConfigured: true }));
    refetch();
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
    <>
      <Card>
        <CardHeader>
          <CardTitle>Exchange Online Settings</CardTitle>
          <CardDescription>
            Configure Exchange Online integration for distribution list management using basic authentication.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-2">
            <Switch
              id="enabled"
              checked={settings.enabled}
              onCheckedChange={handleToggleEnabled}
            />
            <Label htmlFor="enabled" className="text-sm font-medium">
              Enable Exchange Online Integration
            </Label>
          </div>

          {settings.enabled && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Username</Label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 px-3 py-2 bg-gray-50 border rounded-md text-sm">
                    {settings.username || 'Not configured (check EXO_USER environment variable)'}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    From Environment
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Username is loaded from the EXO_USER environment variable
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Password</Label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 px-3 py-2 bg-gray-50 border rounded-md text-sm">
                    {settings.passwordConfigured ? '••••••••••••' : 'Not configured'}
                  </div>
                  <Badge variant={settings.passwordConfigured ? "default" : "destructive"} className="text-xs">
                    {settings.passwordConfigured ? "Configured" : "Not Set"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Password is encrypted and stored using PowerShell SecureString
                </p>
              </div>

              <div className="flex space-x-2">
                {!settings.passwordConfigured ? (
                  <Button onClick={handleSetupPassword} variant="default">
                    <Settings className="h-4 w-4 mr-2" />
                    Setup Password
                  </Button>
                ) : (
                  <Button onClick={handleResetPassword} variant="outline">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset Password
                  </Button>
                )}

                <Button
                  onClick={handleTestConnection}
                  variant="outline"
                  disabled={testConnectionMutation.isPending || !settings.passwordConfigured}
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

              {settings.lastConnectionTest && (
                <div className="text-xs text-muted-foreground">
                  Last successful connection: {new Date(settings.lastConnectionTest).toLocaleString()}
                </div>
              )}
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

      <ExchangeOnlineSetupWizard
        open={showSetupWizard}
        onOpenChange={setShowSetupWizard}
        username={settings.username}
        onSetupComplete={handleSetupComplete}
        isReset={isResetMode}
      />
    </>
  );
}
