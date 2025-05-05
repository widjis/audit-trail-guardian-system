
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertCircle, Database, Server, Table } from "lucide-react";
import apiClient from "@/services/api-client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";

interface DatabaseConfig {
  type: "postgres" | "mssql";
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  instance?: string;
  encrypt?: boolean;
}

export function DatabaseConfigSettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<DatabaseConfig>({
    type: "postgres",
    host: "",
    port: "5432",
    database: "",
    username: "",
    password: "",
    instance: "",
    encrypt: false
  });
  
  const [schema, setSchema] = useState("");

  useEffect(() => {
    const fetchDatabaseConfig = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.get("/settings/database-config");
        if (response.data) {
          setConfig(response.data);
        }
        
        // Fetch schema if available
        try {
          const schemaResponse = await apiClient.get("/settings/database-config/schema");
          if (schemaResponse.data && schemaResponse.data.schema) {
            setSchema(schemaResponse.data.schema);
          }
        } catch (schemaError) {
          // Schema may not exist yet, which is fine
          console.log("Schema not found or not yet created");
        }
      } catch (error) {
        console.error("Failed to fetch database config:", error);
        toast({
          title: "Error",
          description: "Failed to load database configuration",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDatabaseConfig();
  }, [toast]);

  const handleTypeChange = (type: "postgres" | "mssql") => {
    setConfig(prev => ({
      ...prev,
      type,
      port: type === "postgres" ? "5432" : "1433"
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSchemaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSchema(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await apiClient.put("/settings/database-config", config);
      toast({
        title: "Success",
        description: "Database configuration saved successfully",
      });
    } catch (error) {
      console.error("Failed to save database config:", error);
      toast({
        title: "Error",
        description: "Failed to save database configuration",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSchemaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await apiClient.put("/settings/database-config/schema", { schema });
      toast({
        title: "Success",
        description: "Database schema saved successfully",
      });
    } catch (error) {
      console.error("Failed to save database schema:", error);
      toast({
        title: "Error",
        description: "Failed to save database schema",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSchemaTemplate = () => {
    if (config.type === 'postgres') {
      return `-- PostgreSQL Sample Schema
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(10) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  department_id INTEGER REFERENCES departments(id),
  hire_date DATE NOT NULL
);`;
    } else {
      return `-- MS SQL Server Sample Schema
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
CREATE TABLE users (
  id INT IDENTITY(1,1) PRIMARY KEY,
  username NVARCHAR(100) NOT NULL,
  email NVARCHAR(255) NOT NULL UNIQUE,
  password NVARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT GETDATE()
);

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='departments' AND xtype='U')
CREATE TABLE departments (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(100) NOT NULL,
  code NVARCHAR(10) NOT NULL UNIQUE
);

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='employees' AND xtype='U')
CREATE TABLE employees (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(255) NOT NULL,
  email NVARCHAR(255) NOT NULL UNIQUE,
  department_id INT FOREIGN KEY REFERENCES departments(id),
  hire_date DATE NOT NULL
);`;
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="connection" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="connection" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Connection Settings
          </TabsTrigger>
          <TabsTrigger value="schema" className="flex items-center gap-2">
            <Table className="h-4 w-4" />
            Database Schema
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="connection">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Connection
              </CardTitle>
              <CardDescription>
                Configure your database connection settings
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <Alert className="bg-amber-50 text-amber-800 border-amber-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Important</AlertTitle>
                  <AlertDescription>
                    These settings will be stored in environment variables. After saving, a server restart might be required for changes to take effect.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Database Type</Label>
                    <RadioGroup 
                      value={config.type} 
                      onValueChange={(value) => handleTypeChange(value as "postgres" | "mssql")}
                      className="flex space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="postgres" id="postgres" />
                        <Label htmlFor="postgres">PostgreSQL</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="mssql" id="mssql" />
                        <Label htmlFor="mssql">MS SQL Server</Label>
                      </div>
                    </RadioGroup>
                  </div>
                
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="host">Database Host</Label>
                      <Input 
                        id="host"
                        name="host"
                        value={config.host}
                        onChange={handleChange}
                        placeholder={config.type === "postgres" ? "localhost" : "localhost\\SQLEXPRESS"}
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
                        placeholder={config.type === "postgres" ? "5432" : "1433"}
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
                        placeholder="my_database"
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
                        placeholder={config.type === "postgres" ? "postgres" : "sa"}
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

                    {config.type === "mssql" && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="instance">Instance Name (optional)</Label>
                          <Input 
                            id="instance"
                            name="instance"
                            value={config.instance}
                            onChange={handleChange}
                            placeholder="SQLEXPRESS"
                            disabled={isLoading}
                          />
                          <p className="text-sm text-muted-foreground">
                            Leave empty if not using a named instance
                          </p>
                        </div>
                        
                        <div className="space-y-2 flex items-center pt-6">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="encrypt"
                              checked={config.encrypt}
                              onCheckedChange={(checked) => handleSwitchChange('encrypt', checked)}
                              disabled={isLoading}
                            />
                            <Label htmlFor="encrypt">Encrypt Connection</Label>
                          </div>
                        </div>
                      </>
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
                  <Server className="h-4 w-4" />
                  {isLoading ? "Saving..." : "Save Configuration"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        
        <TabsContent value="schema">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table className="h-5 w-5" />
                Database Schema
              </CardTitle>
              <CardDescription>
                Define your initial database schema with SQL statements
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSchemaSubmit}>
              <CardContent className="space-y-4">
                <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Schema Format</AlertTitle>
                  <AlertDescription>
                    Enter SQL statements to initialize your database schema. The syntax will vary slightly between PostgreSQL and MS SQL Server.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <Label htmlFor="schema">SQL Schema</Label>
                  <Textarea 
                    id="schema"
                    value={schema}
                    onChange={handleSchemaChange}
                    placeholder={getSchemaTemplate()}
                    className="font-mono text-sm h-[400px]"
                    disabled={isLoading}
                  />
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-between">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setSchema(getSchemaTemplate())}
                  disabled={isLoading}
                >
                  Load {config.type === 'postgres' ? 'PostgreSQL' : 'SQL Server'} Sample Schema
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <Table className="h-4 w-4" />
                  {isLoading ? "Saving..." : "Save Schema"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
