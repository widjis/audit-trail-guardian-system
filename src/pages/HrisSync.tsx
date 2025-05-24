
import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, Server, Users, RefreshCw, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function HrisSync() {
  const [syncStatus, setSyncStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [exportStatus, setExportStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [syncResults, setSyncResults] = useState<any[]>([]);
  const { toast } = useToast();

  // Replace mock logic with real API call
  const handleTestSync = async () => {
    setTestStatus("loading");
    try {
      const response = await fetch("/api/hris-sync/test");
      if (!response.ok) throw new Error("Failed to fetch test sync results");
      const data = await response.json();
      setSyncResults(data.results || []);
      setTestStatus("success");
      toast({
        title: "Test sync completed",
        description: `${data.results?.length || 0} users would be updated in Active Directory`,
      });
    } catch (error) {
      setTestStatus("error");
      toast({
        title: "Test sync failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleRealSync = async () => {
    setSyncStatus("loading");
    try {
      const response = await fetch("/api/hris-sync/real", { method: "POST" });
      if (!response.ok) throw new Error("Failed to perform real sync");
      const data = await response.json();
      setSyncResults(data.results || []);
      setSyncStatus("success");
      toast({
        title: "Sync completed",
        description: `${data.results?.length || 0} users successfully updated in Active Directory`,
      });
    } catch (error) {
      setSyncStatus("error");
      toast({
        title: "Sync failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleExportData = () => {
    setExportStatus("loading");
    setTimeout(() => {
      setExportStatus("success");
      toast({
        title: "Export completed",
        description: "Data comparison exported successfully",
      });
      const element = document.createElement("a");
      element.href = "data:text/csv;charset=utf-8," + encodeURIComponent("employee_id,employeeID,employee_name,displayName\nMTI230279,MTI230279,John Smith,John Smith\nMTI230280,MTI230280,Jane Doe,Jane Doe");
      element.download = "orange_vs_ad_comparison.csv";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }, 2000);
  };

  // Helper function to determine if a cell should be highlighted
  const shouldHighlight = (currentValue: any, newValue: any): boolean => {
    return newValue !== undefined && newValue !== null && newValue !== currentValue;
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
                  {/* Legend for highlighted cells */}
                  <div className="mb-4 flex items-center gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <div className="h-4 w-4 rounded bg-yellow-100 border border-yellow-300"></div>
                      <span>New Value</span>
                    </div>
                    <AlertTriangle className="ml-2 h-4 w-4 text-amber-500" />
                    <span className="text-muted-foreground">Highlighted cells indicate changes that will be applied</span>
                  </div>
                  
                  <ScrollArea style={{ width: '100%' }}>
                    <div style={{ overflowX: 'auto', width: '100%' }}>
                      <table className="min-w-[1200px] border text-xs">
                        <thead>
                          <tr>
                            <th className="border px-2 py-1">EmployeeID</th>
                            <th className="border px-2 py-1">DisplayName</th>
                            <th className="border px-2 py-1">Department (Current)</th>
                            <th className="border px-2 py-1">Department (New)</th>
                            <th className="border px-2 py-1">Title (Current)</th>
                            <th className="border px-2 py-1">Title (New)</th>
                            <th className="border px-2 py-1">Manager (Current)</th>
                            <th className="border px-2 py-1">Manager (New)</th>
                            <th className="border px-2 py-1">Phone (Current)</th>
                            <th className="border px-2 py-1">Phone (New)</th>
                            <th className="border px-2 py-1">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {syncResults.map((row, idx) => (
                            <tr key={idx}>
                              <td className="border px-2 py-1">{row.employeeID}</td>
                              <td className="border px-2 py-1">{row.displayName}</td>
                              <td className="border px-2 py-1">{row.current.department}</td>
                              <td className={`border px-2 py-1 ${shouldHighlight(row.current.department, row.diffs.department) ? 'bg-yellow-100 font-medium border-yellow-300' : ''}`}>
                                {row.diffs.department}
                              </td>
                              <td className="border px-2 py-1">{row.current.title}</td>
                              <td className={`border px-2 py-1 ${shouldHighlight(row.current.title, row.diffs.title) ? 'bg-yellow-100 font-medium border-yellow-300' : ''}`}>
                                {row.diffs.title}
                              </td>
                              <td className="border px-2 py-1">{row.current.manager}</td>
                              <td className={`border px-2 py-1 ${shouldHighlight(row.current.manager, row.diffs.manager) ? 'bg-yellow-100 font-medium border-yellow-300' : ''}`}>
                                {row.diffs.manager}
                              </td>
                              <td className="border px-2 py-1">{row.current.mobile}</td>
                              <td className={`border px-2 py-1 ${shouldHighlight(row.current.mobile, row.diffs.mobile) ? 'bg-yellow-100 font-medium border-yellow-300' : ''}`}>
                                {row.diffs.mobile}
                              </td>
                              <td className="border px-2 py-1">{row.action}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
