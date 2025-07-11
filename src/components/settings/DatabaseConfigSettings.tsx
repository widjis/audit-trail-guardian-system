
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { settingsService } from "@/services/settings-service";
import { useEffect } from "react";

// Database configurations types
interface MainDatabaseConfig {
  type: string;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  instance?: string;
  encrypt?: boolean;
}

interface HrisDatabaseConfig {
  server: string;
  port: string;
  database: string;
  username: string;
  password: string;
  enabled: boolean;
}

export function DatabaseConfigSettings() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeDbTab, setActiveDbTab] = useState("main-db");
  
  // Main database state
  const [isMainLoading, setIsMainLoading] = useState(false);
  const [isMainTesting, setIsMainTesting] = useState(false);
  const [mainTestResult, setMainTestResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);
  const [schema, setSchema] = useState("");
  
  const [mainDbConfig, setMainDbConfig] = useState<MainDatabaseConfig>({
    type: "postgres",
    host: "",
    port: "",
    database: "",
    username: "",
    password: "",
  });

  // HRIS database state
  const [isHrisLoading, setIsHrisLoading] = useState(false);
  const [isHrisTesting, setIsHrisTesting] = useState(false);
  const [hrisTestResult, setHrisTestResult] = useState<{
    success?: boolean;
    message?: string;
    error?: string;
  } | null>(null);
  
  const [hrisConfig, setHrisConfig] = useState<HrisDatabaseConfig>({
    server: "",
    port: "1433", // Default SQL Server port
    database: "",
    username: "",
    password: "",
    enabled: false
  });

  // Load configurations
  useEffect(() => {
    fetchMainDatabaseConfig();
    fetchHrisDatabaseConfig();
  }, []);

  // Main database functions
  const fetchMainDatabaseConfig = async () => {
    try {
      setIsMainLoading(true);
      const response = await fetch("/api/database");
      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
      
      const config = await response.json();
      setMainDbConfig(config);

      // Also fetch database schema
      try {
        const schemaResponse = await fetch("/api/database/schema");
        if (schemaResponse.ok) {
          const { schema } = await schemaResponse.json();
          setSchema(schema || "");
        } else {
          console.warn("Schema not found or not yet created");
        }
      } catch (err) {
        console.error("Error fetching schema:", err);
      }
    } catch (err) {
      console.error("Error fetching database config:", err);
      toast({
        title: "Error",
        description: "Failed to load database configuration",
        variant: "destructive",
      });
    } finally {
      setIsMainLoading(false);
    }
  };

  // HRIS database functions
  const fetchHrisDatabaseConfig = async () => {
    try {
      setIsHrisLoading(true);
      const response = await settingsService.getHrisDatabaseConfig();
      if (response) {
        setHrisConfig(response);
      }
    } catch (error) {
      console.error("Failed to fetch HRIS database configuration:", error);
      toast({
        title: "Error",
        description: "Failed to load HRIS database configuration",
        variant: "destructive",
      });
    } finally {
      setIsHrisLoading(false);
    }
  };

  // Main database handlers and actions
  const handleMainInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMainDbConfig(prev => ({ ...prev, [name]: value }));
    setMainTestResult(null);
  };

  const handleMainTypeChange = (value: string) => {
    setMainDbConfig(prev => ({
      ...prev,
      type: value,
      port: value === "postgres" ? "5432" : "1433", // Default ports
    }));
    setMainTestResult(null);
  };

  const handleMainBooleanChange = (name: string, value: boolean) => {
    setMainDbConfig(prev => ({ ...prev, [name]: value }));
    setMainTestResult(null);
  };

  const handleMainSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsMainLoading(true);
      const response = await fetch("/api/database", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mainDbConfig),
      });

      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
      
      toast({
        title: "Success",
        description: "Database configuration saved successfully",
      });
    } catch (err) {
      console.error("Error saving database config:", err);
      toast({
        title: "Error",
        description: "Failed to save database configuration",
        variant: "destructive",
      });
    } finally {
      setIsMainLoading(false);
    }
  };

  const handleSchemaUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsMainLoading(true);
      const response = await fetch("/api/database/schema", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schema }),
      });

      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
      
      const result = await response.json();
      toast({
        title: "Success",
        description: `Schema saved to ${result.filePath}`,
      });
    } catch (err) {
      console.error("Error saving schema:", err);
      toast({
        title: "Error",
        description: "Failed to save schema",
        variant: "destructive",
      });
    } finally {
      setIsMainLoading(false);
    }
  };

  const handleMainTestConnection = async () => {
    setIsMainTesting(true);
    setMainTestResult(null);
    
    try {
      const response = await fetch("/api/database/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mainDbConfig),
      });
      
      const result = await response.json();
      
      setMainTestResult({
        success: result.success,
        message: result.message,
        error: result.error
      });
      
      toast({
        title: result.success ? "Success" : "Connection Failed",
        description: result.message || (result.success ? "Database connection test successful!" : "Failed to connect to database"),
        variant: result.success ? "default" : "destructive",
      });
      
    } catch (error: any) {
      console.error("Connection test error:", error);
      setMainTestResult({
        success: false,
        message: "Request failed",
        error: error.message
      });
      
      toast({
        title: "Error",
        description: error.message || "Test connection request failed",
        variant: "destructive",
      });
    } finally {
      setIsMainTesting(false);
    }
  };

  // HRIS database handlers and actions
  const handleHrisChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setHrisConfig(prev => ({
      ...prev,
      [name]: value,
    }));
    setHrisTestResult(null);
  };

  const handleHrisSwitchChange = (checked: boolean) => {
    setHrisConfig(prev => ({
      ...prev,
      enabled: checked,
    }));
    setHrisTestResult(null);
  };

  const handleHrisSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsHrisLoading(true);
      await settingsService.updateHrisDatabaseConfig(hrisConfig);
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
      setIsHrisLoading(false);
    }
  };

  const handleHrisTestConnection = async () => {
    setIsHrisTesting(true);
    setHrisTestResult(null);
    
    try {
      const response = await settingsService.testHrisDatabaseConnection(hrisConfig);
      setHrisTestResult({
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
      
      setHrisTestResult({
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
      setIsHrisTesting(false);
    }
  };

  // Connection test result display component
  const ConnectionTestResult = ({ result }: { result: { success?: boolean; message?: string; error?: string } | null }) => {
    if (!result) return null;
    
    return (
      <div className={`mt-4 p-4 rounded-md ${
        result.success 
          ? "bg-green-50 border border-green-200 text-green-800" 
          : "bg-red-50 border border-red-200 text-red-800"
      }`}>
        <div className="flex items-start gap-2">
          {result.success 
            ? <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" /> 
            : <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
          }
          <div>
            <p className="font-medium">
              {result.success 
                ? "Connection Successful" 
                : "Connection Failed"
              }
            </p>
            {result.message && (
              <p className="mt-1">{result.message}</p>
            )}
            {result.error && (
              <p className="mt-1 text-sm">{result.error}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-xl">Database Management</CardTitle>
        <CardDescription>
          Configure and manage database connections for your application
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs 
          value={activeDbTab} 
          onValueChange={setActiveDbTab}
          className="w-full"
        >
          <TabsList className="bg-slate-100 w-full rounded-lg mb-4">
            <TabsTrigger value="main-db" className="flex-1 py-2">Main Database</TabsTrigger>
            <TabsTrigger value="hris-db" className="flex-1 py-2">HRIS Database</TabsTrigger>
          </TabsList>

          {/* Main Database Tab */}
          <TabsContent value="main-db" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Main Database Connection
                </CardTitle>
                <CardDescription>
                  Configure connection to your application database
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleMainSave}>
                <CardContent className="space-y-4">
                  <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Information</AlertTitle>
                    <AlertDescription>
                      These settings will be saved to your local .env file.
                      Changes may require a server restart to take effect.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="type">Database Type</Label>
                        <Select 
                          value={mainDbConfig.type} 
                          onValueChange={handleMainTypeChange}
                          disabled={isMainLoading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select database type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="postgres">PostgreSQL</SelectItem>
                            <SelectItem value="mssql">Microsoft SQL Server</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="host">Host / IP Address</Label>
                        <Input 
                          id="host"
                          name="host"
                          value={mainDbConfig.host}
                          onChange={handleMainInputChange}
                          disabled={isMainLoading}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="port">Port</Label>
                        <Input 
                          id="port"
                          name="port"
                          value={mainDbConfig.port}
                          onChange={handleMainInputChange}
                          disabled={isMainLoading}
                        />
                      </div>
                      
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="database">Database Name</Label>
                        <Input 
                          id="database"
                          name="database"
                          value={mainDbConfig.database}
                          onChange={handleMainInputChange}
                          disabled={isMainLoading}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input 
                          id="username"
                          name="username"
                          value={mainDbConfig.username}
                          onChange={handleMainInputChange}
                          disabled={isMainLoading}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input 
                          id="password"
                          name="password"
                          type="password"
                          value={mainDbConfig.password}
                          onChange={handleMainInputChange}
                          disabled={isMainLoading}
                        />
                      </div>
                    </div>
                    
                    {/* SQL Server specific settings */}
                    {mainDbConfig.type === "mssql" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="instance">Instance Name (optional)</Label>
                          <Input 
                            id="instance"
                            name="instance"
                            value={mainDbConfig.instance || ""}
                            onChange={handleMainInputChange}
                            disabled={isMainLoading}
                            placeholder="Leave empty if not using a named instance"
                          />
                        </div>
                        
                        <div className="flex items-center space-x-2 pt-8">
                          <Switch
                            id="encrypt"
                            checked={!!mainDbConfig.encrypt}
                            onCheckedChange={(checked) => handleMainBooleanChange("encrypt", checked)}
                            disabled={isMainLoading}
                          />
                          <Label htmlFor="encrypt">Encrypt Connection</Label>
                        </div>
                      </div>
                    )}
                    
                    {/* Test Connection Section */}
                    <div className="pt-4 border-t">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={handleMainTestConnection}
                        disabled={isMainLoading || isMainTesting}
                        className="flex items-center gap-2"
                      >
                        {isMainTesting ? "Testing..." : "Test Connection"}
                      </Button>
                      
                      <ConnectionTestResult result={mainTestResult} />
                    </div>
                  
                    {/* Schema Section */}
                    <div className="pt-4 border-t">
                      <div className="flex flex-col space-y-2">
                        <Label htmlFor="schema">Database Schema</Label>
                        <Textarea
                          id="schema"
                          placeholder="Enter your schema SQL here..."
                          value={schema}
                          onChange={(e) => setSchema(e.target.value)}
                          disabled={isMainLoading}
                          className="font-mono h-40"
                        />
                      </div>

                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={handleSchemaUpdate}
                        disabled={isMainLoading}
                        className="mt-4"
                      >
                        Save Schema
                      </Button>
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter>
                  <Button 
                    type="submit" 
                    disabled={isMainLoading}
                    className="flex items-center gap-2"
                  >
                    <Database className="h-4 w-4" />
                    {isMainLoading ? "Saving..." : "Save Configuration"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          {/* HRIS Database Tab */}
          <TabsContent value="hris-db" className="mt-0">
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
              <form onSubmit={handleHrisSubmit}>
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
                          value={hrisConfig.server}
                          onChange={handleHrisChange}
                          placeholder="e.g., 10.1.1.75"
                          disabled={isHrisLoading}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="port">Port</Label>
                        <Input 
                          id="port"
                          name="port"
                          value={hrisConfig.port}
                          onChange={handleHrisChange}
                          placeholder="1433"
                          disabled={isHrisLoading}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="database">Database Name</Label>
                        <Input 
                          id="database"
                          name="database"
                          value={hrisConfig.database}
                          onChange={handleHrisChange}
                          placeholder="e.g., ORANGE-PROD"
                          disabled={isHrisLoading}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input 
                          id="username"
                          name="username"
                          value={hrisConfig.username}
                          onChange={handleHrisChange}
                          placeholder="e.g., IT.MTI"
                          disabled={isHrisLoading}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input 
                          id="password"
                          name="password"
                          type="password"
                          value={hrisConfig.password}
                          onChange={handleHrisChange}
                          placeholder="********"
                          disabled={isHrisLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 flex items-center pt-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="enabled"
                          checked={hrisConfig.enabled}
                          onCheckedChange={handleHrisSwitchChange}
                          disabled={isHrisLoading}
                        />
                        <Label htmlFor="enabled">Enable HRIS Database Connection</Label>
                      </div>
                    </div>
                    
                    {/* Test Connection Section */}
                    <div className="pt-4 border-t">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={handleHrisTestConnection}
                        disabled={isHrisLoading || isHrisTesting}
                        className="flex items-center gap-2"
                      >
                        {isHrisTesting ? "Testing..." : "Test Connection"}
                      </Button>
                      
                      <ConnectionTestResult result={hrisTestResult} />
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter>
                  <Button 
                    type="submit" 
                    disabled={isHrisLoading}
                    className="flex items-center gap-2"
                  >
                    <Database className="h-4 w-4" />
                    {isHrisLoading ? "Saving..." : "Save Configuration"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
