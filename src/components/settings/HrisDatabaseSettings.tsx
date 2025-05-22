
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Database, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { settingsService } from "@/services/settings-service";

interface HrisDatabaseConfig {
  server: string;
  port: string;
  database: string;
  username: string;
  password: string;
  enabled: boolean;
}

export function HrisDatabaseSettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
    error?: string;
  } | null>(null);
  
  const [config, setConfig] = useState<HrisDatabaseConfig>({
    server: "",
    port: "1433", // Default SQL Server port
    database: "",
    username: "",
    password: "",
    enabled: false
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setIsLoading(true);
        const response = await settingsService.getHrisDatabaseConfig();
        if (response) {
          setConfig(response);
        }
      } catch (error) {
        console.error("Failed to fetch HRIS database configuration:", error);
        toast({
          title: "Error",
          description: "Failed to load HRIS database configuration",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, [toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear the test result when any configuration changes
    setTestResult(null);
  };

  const handleSwitchChange = (checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      enabled: checked,
    }));
    // Clear the test result when the enabled status changes
    setTestResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await settingsService.updateHrisDatabaseConfig(config);
      toast({
        title: "Success",
        description: "HRIS database configuration saved successfully",
      });
    } catch (error) {
      console.error("Failed to save HRIS database configuration:", error);
      toast({
        title: "Error",
        description: "Failed to save HRIS database configuration",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const response = await settingsService.testHrisDatabaseConnection(config);
      setTestResult({
        success: response.success,
        message: response.message || "Connection successful!",
        error: response.error
      });
      
      toast({
        title: response.success ? "Success" : "Connection Failed",
        description: response.message || (response.success ? "Database connection test successful!" : "Failed to connect to database"),
        variant: response.success ? "default" : "destructive",
      });
    } catch (error: any) {
      console.error("Connection test failed:", error);
      const errorMessage = 
        error.response?.data?.error || 
        error.response?.data?.message || 
        error.message || 
        "Unable to connect to database";
      
      setTestResult({
        success: false,
        message: "Connection failed",
        error: errorMessage
      });
      
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          HRIS Database Connection
        </CardTitle>
        <CardDescription>
          Configure connection to your Human Resource Information System database
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <Alert className="bg-blue-50 text-blue-800 border-blue-200">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Information</AlertTitle>
            <AlertDescription>
              These settings will connect to your HRIS database for employee synchronization.
              Currently supporting Microsoft SQL Server.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="server">Database Server</Label>
                <Input 
                  id="server"
                  name="server"
                  value={config.server}
                  onChange={handleChange}
                  placeholder="e.g., 10.1.1.75"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="port">Port</Label>
                <Input 
                  id="port"
                  name="port"
                  value={config.port}
                  onChange={handleChange}
                  placeholder="1433"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="database">Database Name</Label>
                <Input 
                  id="database"
                  name="database"
                  value={config.database}
                  onChange={handleChange}
                  placeholder="e.g., ORANGE-PROD"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username"
                  name="username"
                  value={config.username}
                  onChange={handleChange}
                  placeholder="e.g., IT.MTI"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password"
                  name="password"
                  type="password"
                  value={config.password}
                  onChange={handleChange}
                  placeholder="********"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2 flex items-center pt-2 md:col-span-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enabled"
                    checked={config.enabled}
                    onCheckedChange={handleSwitchChange}
                    disabled={isLoading}
                  />
                  <Label htmlFor="enabled">Enable HRIS Database Connection</Label>
                </div>
              </div>
            </div>
            
            {/* Test Connection Section */}
            <div className="pt-4 border-t">
              <Button 
                type="button" 
                variant="outline"
                onClick={handleTestConnection}
                disabled={isLoading || isTesting}
                className="flex items-center gap-2"
              >
                {isTesting ? "Testing..." : "Test Connection"}
              </Button>
              
              {testResult && (
                <div className={`mt-4 p-4 rounded-md ${
                  testResult.success 
                    ? "bg-green-50 border border-green-200 text-green-800" 
                    : "bg-red-50 border border-red-200 text-red-800"
                }`}>
                  <div className="flex items-start gap-2">
                    {testResult.success 
                      ? <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" /> 
                      : <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    }
                    <div>
                      <p className="font-medium">
                        {testResult.success 
                          ? "Connection Successful" 
                          : "Connection Failed"
                        }
                      </p>
                      {testResult.message && (
                        <p className="mt-1">{testResult.message}</p>
                      )}
                      {testResult.error && (
                        <p className="mt-1 text-sm">{testResult.error}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
        
        <CardFooter>
          <Button 
            type="submit" 
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Database className="h-4 w-4" />
            {isLoading ? "Saving..." : "Save Configuration"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
