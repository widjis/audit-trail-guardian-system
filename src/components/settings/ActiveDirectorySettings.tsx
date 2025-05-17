
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { activeDirectoryService } from "@/services/active-directory-service";
import { AlertCircle, Server, ShieldCheck, Lock, Unlock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ActiveDirectorySettings {
  server: string;
  username: string;
  password: string;
  domain: string;
  baseDN: string;
  protocol: "ldap" | "ldaps";
  enabled: boolean;
  authFormat: "upn" | "dn";
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
    protocol: "ldap",
    enabled: false,
    authFormat: "upn"
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const data = await activeDirectoryService.getSettings();
        if (data) {
          // If protocol or authFormat is not defined in loaded data, set defaults
          setSettings({
            ...data,
            protocol: data.protocol || "ldap",
            authFormat: data.authFormat || "upn"
          });
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
      await activeDirectoryService.updateSettings(settings);
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
      const response = await activeDirectoryService.testConnection(settings);
      
      toast({
        title: "Connection Successful",
        description: response.message || "Successfully connected to Active Directory server",
      });
    } catch (error) {
      console.error("Error testing AD connection:", error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Could not connect to Active Directory server",
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

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Connection Protocol</Label>
              <RadioGroup 
                value={settings.protocol} 
                onValueChange={(value) => handleChange("protocol", value as "ldap" | "ldaps")}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ldap" id="ldap" />
                  <Label htmlFor="ldap" className="flex items-center gap-1">
                    <Unlock className="h-4 w-4" />
                    LDAP (Standard)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ldaps" id="ldaps" />
                  <Label htmlFor="ldaps" className="flex items-center gap-1">
                    <Lock className="h-4 w-4" />
                    LDAPS (Secure)
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-sm text-gray-500">
                {settings.protocol === "ldaps" ? 
                  "LDAPS uses SSL encryption for secure communication. Make sure your server is configured for LDAPS (port 636)." :
                  "Standard LDAP uses port 389 with no encryption. Not recommended for production environments."}
              </p>
            </div>

            {/* Authentication Format */}
            <div className="space-y-2">
              <Label>Authentication Format</Label>
              <RadioGroup 
                value={settings.authFormat} 
                onValueChange={(value) => handleChange("authFormat", value as "upn" | "dn")}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="upn" id="upn" />
                  <Label htmlFor="upn">
                    UPN Format (username@domain.com)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dn" id="dn" />
                  <Label htmlFor="dn">
                    DN Format (CN=username,DC=domain,DC=com)
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-sm text-gray-500">
                {settings.authFormat === "dn" ? 
                  "DN format will construct a distinguishedName from your username and baseDN. Use this if UPN format fails." :
                  "UPN format uses username@domain format. This is the most common authentication format."}
              </p>
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
                  placeholder={settings.authFormat === "upn" ? "administrator@example.com" : "CN=administrator,DC=example,DC=com"}
                  disabled={isLoading || !settings.enabled}
                />
                <p className="text-xs text-gray-500">
                  {settings.authFormat === "dn" 
                    ? "For DN format, you may need to specify the full Distinguished Name" 
                    : "For UPN format, use username@domain format"}
                </p>
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
