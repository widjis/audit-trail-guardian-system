import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { activeDirectoryService } from "@/services/active-directory-service";
import { AlertCircle, Server, ShieldCheck, Lock, Unlock, HelpCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const [showAdvanced, setShowAdvanced] = useState(false);
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
  const [lastTestError, setLastTestError] = useState<string | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [actualPassword, setActualPassword] = useState<string>("");

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
          
          // Store the masked password state
          if (data.password === '••••••••') {
            // Password is masked, we'll keep the actual password separate
            setActualPassword(""); // We don't know the actual password here
          } else if (data.password) {
            // This is a real password from first load
            setActualPassword(data.password);
          }
          
          setSettingsLoaded(true);
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
    
    // If the password field is being changed, also update the actualPassword state
    if (field === 'password' && typeof value === 'string' && value !== '•••••••') {
      setActualPassword(value);
    }
    
    // Clear previous test error when settings change
    if (lastTestError) setLastTestError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      
      // If password is masked and we have an actual password, use it for submission
      const submissionSettings = {...settings};
      if (submissionSettings.password === '••••••••' && actualPassword) {
        // Use the actual password internally but don't update the UI
        submissionSettings.password = actualPassword;
      }
      
      await activeDirectoryService.updateSettings(submissionSettings);
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
      setLastTestError(null);
      
      // Prepare test settings - if password is masked, use the actual password if we have it
      const testSettings = {...settings};
      if (testSettings.password === '••••••••' && actualPassword) {
        testSettings.password = actualPassword;
      }
      
      const response = await activeDirectoryService.testConnection(testSettings);
      
      toast({
        title: "Connection Successful",
        description: response.message || "Successfully connected to Active Directory server",
      });
    } catch (error) {
      console.error("Error testing AD connection:", error);
      const errorMessage = error instanceof Error ? error.message : "Could not connect to Active Directory server";
      setLastTestError(errorMessage);
      
      toast({
        title: "Connection Failed",
        description: errorMessage,
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
              <div className="flex items-center gap-2">
                <Label>Authentication Format</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>UPN format uses your_username@domain.com</p>
                      <p>DN format uses CN=your_username,OU=Users,DC=domain,DC=com</p>
                      <p>Try switching formats if authentication fails</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
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
                  "DN format constructs a distinguishedName from your username and baseDN. Try this if UPN format fails." :
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
                  placeholder="dc.example.com or IP address"
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
                    ? "For DN format, use the simplified username (e.g. 'administrator'). The DN will be created automatically." 
                    : "For UPN format, include the domain (e.g. 'administrator@domain.com')"}
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

          {/* Display last test error if any */}
          {lastTestError && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Connection Error</AlertTitle>
              <AlertDescription className="whitespace-normal break-words">
                {lastTestError}
                {lastTestError.includes('Invalid Credentials') && (
                  <div className="mt-2 text-xs">
                    <p>Troubleshooting tips:</p>
                    <ul className="list-disc pl-4 mt-1 space-y-1">
                      <li>Verify username and password are correct</li>
                      <li>Try switching between UPN and DN format</li>
                      <li>Check if the account is locked or expired</li>
                      <li>For DN format, try providing a custom DN in the username field</li>
                      <li>Verify that the service account has sufficient permissions</li>
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <Button 
            type="button" 
            variant="outline" 
            className="mt-2"
            onClick={testConnection}
            disabled={testingConnection || isLoading || !settings.enabled || !settings.server || !settings.username || (!settings.password && !actualPassword)}
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
