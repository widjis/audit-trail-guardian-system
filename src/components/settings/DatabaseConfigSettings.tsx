
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Database, Server } from "lucide-react";
import apiClient from "@/services/api-client";

interface DatabaseConfig {
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
}

export function DatabaseConfigSettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<DatabaseConfig>({
    host: "",
    port: "5432",
    database: "",
    username: "",
    password: ""
  });

  useEffect(() => {
    const fetchDatabaseConfig = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.get("/settings/database-config");
        if (response.data) {
          setConfig(response.data);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: value,
    }));
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Configuration
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="host">Database Host</Label>
                <Input 
                  id="host"
                  name="host"
                  value={config.host}
                  onChange={handleChange}
                  placeholder="localhost"
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
                  placeholder="5432"
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
                  placeholder="postgres"
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
    </div>
  );
}
