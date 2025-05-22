
import { useState, useEffect } from "react";
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
import { Database, CheckCircle2, XCircle, AlertCircle, Cloud } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { settingsService } from "@/services/settings-service";

// Main database configuration types
interface DatabaseConfig {
  type: string;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  instance?: string;
  encrypt?: boolean;
}

// HRIS database configuration types
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
  
  // Main database state
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);
  const [schema, setSchema] = useState("");
  
  const [dbConfig, setDbConfig] = useState<DatabaseConfig>({
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

  // Fetch both database configurations when component mounts
  useEffect(() => {
    const fetchAllConfigurations = async () => {
      await fetchDatabaseConfig();
      await fetchHrisDatabaseConfig();
    };
    fetchAllConfigurations();
  }, []);

  // Main database functions
  const fetchDatabaseConfig = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/database");
      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
      
      const config = await response.json();
      setDbConfig(config);

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
      setIsLoading(false);
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

  // Main database handlers
  const handleDbInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDbConfig(prev => ({ ...prev, [name]: value }));
    // Clear the test result when any configuration changes
    setTestResult(null);
  };

  const handleDbTypeChange = (value: string) => {
    setDbConfig(prev => ({
      ...prev,
      type: value,
      port: value === "postgres" ? "5432" : "1433", // Default ports
    }));
    // Clear the test result when database type changes
    setTestResult(null);
  };

  const handleDbBooleanChange = (name: string, value: boolean) => {
    setDbConfig(prev => ({ ...prev, [name]: value }));
    // Clear the test result when any configuration changes
    setTestResult(null);
  };

  // HRIS database handlers
  const handleHrisChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setHrisConfig(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear the test result when any configuration changes
    setHrisTestResult(null);
  };

  const handleHrisSwitchChange = (checked: boolean) => {
    setHrisConfig(prev => ({
      ...prev,
      enabled: checked,
    }));
    // Clear the test result when the enabled status changes
    setHrisTestResult(null);
  };

  // Main database actions
  const handleDbSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const response = await fetch("/api/database", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbConfig),
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
      setIsLoading(false);
    }
  };

  const handleSchemaUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const response = await fetch("/api/database/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbConfig),
      });
      
      const result = await response.json();
      
      setTestResult({
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
      setTestResult({
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
      setIsTesting(false);
    }
  };

  // HRIS database actions
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

  return (
    <div className="space-y-6">
      <Tabs defaultValue="main-db">
        <TabsList className="mb-4">
          <TabsTrigger value="main-db" className="flex items-center gap-1">
            <Database className="h-4 w-4" />
            <span>Main Database</span>
          </TabsTrigger>
          <TabsTrigger value="hris-db" className="flex items-center gap-1">
            <Cloud className="h-4 w-4" />
            <span>HRIS Database</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Main Database Tab */}
        <TabsContent value="main-db">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Connection
              </CardTitle>
              <CardDescription>
                Configure connection to your application database
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleDbSave}>
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
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Database Type</Label>
                      <Select 
                        value={dbConfig.type} 
                        onValueChange={handleDbTypeChange}
                        disabled={isLoading}
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
                        value={dbConfig.host}
                        onChange={handleDbInputChange}
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="port">Port</Label>
                      <Input 
                        id="port"
                        name="port"
                        value={dbConfig.port}
                        onChange={handleDbInputChange}
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="database">Database Name</Label>
                      <Input 
                        id="database"
                        name="database"
                        value={dbConfig.database}
                        onChange={handleDbInputChange}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input 
                        id="username"
                        name="username"
                        value={dbConfig.username}
                        onChange={handleDbInputChange}
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input 
                        id="password"
                        name="password"
                        type="password"
                        value={dbConfig.password}
                        onChange={handleDbInputChange}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  
                  {/* SQL Server specific settings */}
                  {dbConfig.type === "mssql" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="instance">Instance Name (optional)</Label>
                        <Input 
                          id="instance"
                          name="instance"
                          value={dbConfig.instance || ""}
                          onChange={handleDbInputChange}
                          disabled={isLoading}
                          placeholder="Leave empty if not using a named instance"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2 pt-8">
                        <Switch
                          id="encrypt"
                          checked={!!dbConfig.encrypt}
                          onCheckedChange={(checked) => handleDbBooleanChange("encrypt", checked)}
                          disabled={isLoading}
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
                
                  {/* Schema Section */}
                  <div className="pt-4 border-t">
                    <div className="flex flex-col space-y-2">
                      <Label htmlFor="schema">Database Schema</Label>
                      <Textarea
                        id="schema"
                        placeholder="Enter your schema SQL here..."
                        value={schema}
                        onChange={(e) => setSchema(e.target.value)}
                        disabled={isLoading}
                        className="font-mono h-64"
                      />
                    </div>

                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={handleSchemaUpdate}
                      disabled={isLoading}
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
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <Database className="h-4 w-4" />
                  {isLoading ? "Saving..." : "Save Configuration"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* HRIS Database Tab */}
        <TabsContent value="hris-db">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
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
                    
                    <div className="space-y-2 md:col-span-2">
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

                    <div className="space-y-2 flex items-center pt-2 md:col-span-2">
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
                    
                    {hrisTestResult && (
                      <div className={`mt-4 p-4 rounded-md ${
                        hrisTestResult.success 
                          ? "bg-green-50 border border-green-200 text-green-800" 
                          : "bg-red-50 border border-red-200 text-red-800"
                      }`}>
                        <div className="flex items-start gap-2">
                          {hrisTestResult.success 
                            ? <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" /> 
                            : <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                          }
                          <div>
                            <p className="font-medium">
                              {hrisTestResult.success 
                                ? "Connection Successful" 
                                : "Connection Failed"
                              }
                            </p>
                            {hrisTestResult.message && (
                              <p className="mt-1">{hrisTestResult.message}</p>
                            )}
                            {hrisTestResult.error && (
                              <p className="mt-1 text-sm">{hrisTestResult.error}</p>
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
                  disabled={isHrisLoading}
                  className="flex items-center gap-2"
                >
                  <Cloud className="h-4 w-4" />
                  {isHrisLoading ? "Saving..." : "Save Configuration"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
