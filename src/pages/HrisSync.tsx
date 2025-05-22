import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, Server, Users, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function HrisSync() {
  const [syncStatus, setSyncStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [exportStatus, setExportStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [syncResults, setSyncResults] = useState<any[]>([]);
  const { toast } = useToast();

  // These functions would be connected to actual API endpoints in a real implementation
  const handleTestSync = () => {
    setTestStatus("loading");
    
    // Simulate API call
    setTimeout(() => {
      setTestStatus("success");
      setSyncResults([
        {
          employeeId: "MTI230279",
          displayName: "John Smith",
          departmentCurrent: "IT",
          departmentNew: "ICT",
          titleCurrent: "Software Developer",
          titleNew: "Senior Developer",
          action: "Test"
        },
        {
          employeeId: "MTI230280",
          displayName: "Jane Doe",
          departmentCurrent: "HR",
          departmentNew: null,
          titleCurrent: "HR Specialist",
          titleNew: "HR Manager",
          action: "Test"
        }
      ]);
      toast({
        title: "Test sync completed",
        description: "2 users would be updated in Active Directory",
      });
    }, 2000);
  };

  const handleRealSync = () => {
    setSyncStatus("loading");
    
    // Simulate API call
    setTimeout(() => {
      setSyncStatus("success");
      setSyncResults([
        {
          employeeId: "MTI230279",
          displayName: "John Smith",
          departmentCurrent: "IT",
          departmentNew: "ICT",
          titleCurrent: "Software Developer",
          titleNew: "Senior Developer",
          action: "Updated"
        },
        {
          employeeId: "MTI230280",
          displayName: "Jane Doe",
          departmentCurrent: "HR",
          departmentNew: null,
          titleCurrent: "HR Specialist",
          titleNew: "HR Manager",
          action: "Updated"
        }
      ]);
      toast({
        title: "Sync completed",
        description: "2 users successfully updated in Active Directory",
      });
    }, 3000);
  };

  const handleExportData = () => {
    setExportStatus("loading");
    
    // Simulate API call
    setTimeout(() => {
      setExportStatus("success");
      toast({
        title: "Export completed",
        description: "Data comparison exported successfully",
      });
      
      // In a real implementation, this would trigger a file download
      const element = document.createElement("a");
      element.href = "data:text/csv;charset=utf-8," + encodeURIComponent("employee_id,employeeID,employee_name,displayName\nMTI230279,MTI230279,John Smith,John Smith\nMTI230280,MTI230280,Jane Doe,Jane Doe");
      element.download = "orange_vs_ad_comparison.csv";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      
    }, 2000);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">MyOrange to Active Directory Sync</h1>
          <p className="text-muted-foreground">
            Synchronize employee data from MyOrange HRIS to Active Directory
          </p>
        </div>

        <Alert>
          <Server className="h-4 w-4" />
          <AlertTitle>Connection Info</AlertTitle>
          <AlertDescription>
            Connected to MyOrange HRIS database and Active Directory. Ready to synchronize data.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="sync" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sync" className="flex items-center gap-1">
              <RefreshCw className="h-4 w-4" />
              <span>Sync Operation</span>
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-1">
              <Database className="h-4 w-4" />
              <span>Export Comparison</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="sync" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Test Sync</CardTitle>
                  <CardDescription>
                    Test synchronization without making actual changes to Active Directory
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    This will compare data between MyOrange and Active Directory and show what changes would be made,
                    but won't actually update Active Directory.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={handleTestSync} 
                    disabled={testStatus === "loading"}
                    className="w-full"
                  >
                    {testStatus === "loading" ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Running Test...
                      </>
                    ) : (
                      <>
                        <Server className="mr-2 h-4 w-4" />
                        Run Test Sync
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Real Sync</CardTitle>
                  <CardDescription>
                    Perform actual synchronization to update Active Directory
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    This will update Active Directory with current data from MyOrange HRIS,
                    including departments, titles, and relationships.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={handleRealSync} 
                    disabled={syncStatus === "loading"} 
                    variant="destructive"
                    className="w-full"
                  >
                    {syncStatus === "loading" ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <Users className="mr-2 h-4 w-4" />
                        Perform Real Sync
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            {syncResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Sync Results</CardTitle>
                  <CardDescription>
                    Summary of changes made or that would be made to Active Directory
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee ID</TableHead>
                          <TableHead>Display Name</TableHead>
                          <TableHead>Current Dept.</TableHead>
                          <TableHead>New Dept.</TableHead>
                          <TableHead>Current Title</TableHead>
                          <TableHead>New Title</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {syncResults.map((result, index) => (
                          <TableRow key={index}>
                            <TableCell>{result.employeeId}</TableCell>
                            <TableCell>{result.displayName}</TableCell>
                            <TableCell>{result.departmentCurrent}</TableCell>
                            <TableCell>{result.departmentNew || "—"}</TableCell>
                            <TableCell>{result.titleCurrent}</TableCell>
                            <TableCell>{result.titleNew || "—"}</TableCell>
                            <TableCell>{result.action}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="export" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Export Data Comparison</CardTitle>
                <CardDescription>
                  Generate a CSV file comparing MyOrange and Active Directory data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This will create a CSV file that shows a side-by-side comparison of employee data in MyOrange HRIS 
                  and Active Directory, highlighting any differences in fields like department, title, and contact information.
                </p>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={handleExportData} 
                  disabled={exportStatus === "loading"}
                  className="w-full"
                >
                  {exportStatus === "loading" ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Generating Export...
                    </>
                  ) : (
                    <>
                      <Database className="mr-2 h-4 w-4" />
                      Export Comparison Data
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
