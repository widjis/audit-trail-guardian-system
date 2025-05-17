
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { settingsService } from "@/services/settings-service";
import { AlertCircle, Server, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ActiveDirectorySettings {
  server: string;
  username: string;
  password: string;
  domain: string;
  baseDN: string;
  enabled: boolean;
}

export function ActiveDirectorySettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<ActiveDirectorySettings>({
    server: "",
    username: "",
    password: "",
    domain: "mbma.com",
    baseDN: "DC=mbma,DC=com",
    enabled: false
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const data = await settingsService.getActiveDirectorySettings();
        if (data) {
          setSettings(data);
        }
      } catch (error) {
        console.error("Error fetching Active Directory settings:", error);
        toast({
          title: "Error",
          description: "Failed to load Active Directory settings",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [toast]);

  const handleChange = (field: keyof ActiveDirectorySettings, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await settingsService.updateActiveDirectorySettings(settings);
      toast({
        title: "Success",
        description: "Active Directory settings saved successfully"
      });
    } catch (error) {
      console.error("Error saving Active Directory settings:", error);
      toast({
        title: "Error",
        description: "Failed to save Active Directory settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      setTestingConnection(true);
      const response = await fetch('/api/settings/active-directory/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Connection Successful",
          description: "Successfully connected to Active Directory server",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: data.error || "Could not connect to Active Directory server",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error testing AD connection:", error);
      toast({
        title: "Error",
        description: "Failed to test Active Directory connection",
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Active Directory Settings
        </CardTitle>
        <CardDescription>
          Configure connection to your Active Directory server for account creation
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <Alert className="bg-amber-50 text-amber-800 border-amber-200">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              These settings are required to create and manage user accounts in your Active Directory.
              The service account should have permissions to create users and manage group memberships.
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="enabled">Enable Active Directory Integration</Label>
            <Switch 
              id="enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => handleChange("enabled", checked)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="server">AD Server Address</Label>
              <Input 
                id="server"
                value={settings.server}
                onChange={(e) => handleChange("server", e.target.value)}
                placeholder="dc.example.com"
                disabled={isLoading || !settings.enabled}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="domain">Domain</Label>
              <Input 
                id="domain"
                value={settings.domain}
                onChange={(e) => handleChange("domain", e.target.value)}
                placeholder="example.com"
                disabled={isLoading || !settings.enabled}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="baseDN">Base DN</Label>
              <Input 
                id="baseDN"
                value={settings.baseDN}
                onChange={(e) => handleChange("baseDN", e.target.value)}
                placeholder="DC=example,DC=com"
                disabled={isLoading || !settings.enabled}
              />
            </div>
          </div>

          <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2 border p-2 rounded-md">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center">
                <ShieldCheck className="h-4 w-4 mr-2" />
                Service Account Credentials
              </h4>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isOpen ? "Hide" : "Show"} Credentials
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Service Account Username</Label>
                <Input 
                  id="username"
                  value={settings.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                  placeholder="administrator@example.com"
                  disabled={isLoading || !settings.enabled}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Service Account Password</Label>
                <Input 
                  id="password"
                  type="password"
                  value={settings.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading || !settings.enabled}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Button 
            type="button" 
            variant="outline" 
            className="mt-2"
            onClick={testConnection}
            disabled={testingConnection || isLoading || !settings.enabled || !settings.server || !settings.username || !settings.password}
          >
            {testingConnection ? "Testing..." : "Test Connection"}
          </Button>
        </CardContent>
        
        <CardFooter>
          <Button 
            type="submit" 
            disabled={isLoading || !settings.enabled}
          >
            {isLoading ? "Saving..." : "Save Settings"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
