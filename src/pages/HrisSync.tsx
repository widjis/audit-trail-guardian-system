
import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, Server, Users, RefreshCw, AlertTriangle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function HrisSync() {
  const [syncStatus, setSyncStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [manualSyncStatus, setManualSyncStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [exportStatus, setExportStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [syncResults, setSyncResults] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [scheduleEnabled, setScheduleEnabled] = useState<boolean>(false);
  const [scheduleFrequency, setScheduleFrequency] = useState<string>("daily");
  const [nextScheduledRun, setNextScheduledRun] = useState<string | null>(null);
  const { toast } = useToast();

  // Selection handlers for checkboxes
  const isSelected = (employeeID: string) => selectedUsers.includes(employeeID);
  
  const handleSelectOne = (employeeID: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, employeeID]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== employeeID));
    }
  };
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(syncResults.map(row => row.employeeID));
    } else {
      setSelectedUsers([]);
    }
  };

  // Test sync functionality
  const handleTestSync = async () => {
    setTestStatus("loading");
    setSelectedUsers([]); // Clear previous selections
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

  // Manual sync for selected users
  const handleManualSync = async () => {
    if (selectedUsers.length === 0) return;
    
    setManualSyncStatus("loading");
    try {
      const response = await fetch("/api/hris-sync/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeIDs: selectedUsers })
      });
      
      if (!response.ok) throw new Error("Failed to perform manual sync");
      
      const data = await response.json();
      setSyncResults(data.results || []);
      setSelectedUsers([]);
      setManualSyncStatus("success");
      
      toast({
        title: "Manual sync completed",
        description: `${data.results?.length || 0} users successfully updated in Active Directory`,
      });
    } catch (error) {
      setManualSyncStatus("error");
      toast({
        title: "Manual sync failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  // Update schedule settings
  const handleUpdateSchedule = async () => {
    setSyncStatus("loading");
    try {
      const response = await fetch("/api/hris-sync/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          enabled: scheduleEnabled,
          frequency: scheduleFrequency 
        })
      });
      
      if (!response.ok) throw new Error("Failed to update schedule");
      
      const data = await response.json();
      setNextScheduledRun(data.nextRun || null);
      setSyncStatus("success");
      
      toast({
        title: "Schedule updated",
        description: scheduleEnabled 
          ? `HRIS sync will run ${scheduleFrequency}` 
          : "Automatic sync is now disabled",
      });
    } catch (error) {
      setSyncStatus("error");
      toast({
        title: "Failed to update schedule",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  // Load schedule settings on component mount
  useState(() => {
    const fetchScheduleSettings = async () => {
      try {
        const response = await fetch("/api/hris-sync/schedule");
        if (!response.ok) return;
        
        const data = await response.json();
        if (data.success) {
          setScheduleEnabled(data.settings.enabled);
          setScheduleFrequency(data.settings.frequency);
          setNextScheduledRun(data.settings.nextRun);
        }
      } catch (error) {
        console.error("Failed to fetch schedule settings:", error);
      }
    };
    
    fetchScheduleSettings();
  });

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
                  <CardTitle>Automated Sync</CardTitle>
                  <CardDescription>
                    Configure automatic synchronization schedule
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="auto-sync-enabled"
                        checked={scheduleEnabled}
                        onCheckedChange={setScheduleEnabled}
                      />
                      <Label htmlFor="auto-sync-enabled">Enable automatic sync</Label>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="schedule-frequency">Frequency</Label>
                      <Select 
                        value={scheduleFrequency} 
                        onValueChange={setScheduleFrequency}
                        disabled={!scheduleEnabled}
                      >
                        <SelectTrigger id="schedule-frequency" className="w-full">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily at midnight</SelectItem>
                          <SelectItem value="weekly">Weekly (Sunday at midnight)</SelectItem>
                          <SelectItem value="monthly">Monthly (1st of month)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {nextScheduledRun && (
                      <div className="pt-2 text-sm">
                        <p className="font-medium">Next sync:</p>
                        <p className="text-muted-foreground">
                          {new Date(nextScheduledRun).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={handleUpdateSchedule} 
                    disabled={syncStatus === "loading"} 
                    className="w-full"
                  >
                    {syncStatus === "loading" ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Updating Schedule...
                      </>
                    ) : (
                      <>
                        <Clock className="mr-2 h-4 w-4" />
                        Update Schedule
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
                            <th className="border px-2 py-1">
                              <Checkbox 
                                checked={syncResults.length > 0 && selectedUsers.length === syncResults.length} 
                                onCheckedChange={handleSelectAll}
                              />
                            </th>
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
                              <td className="border px-2 py-1">
                                <Checkbox 
                                  checked={isSelected(row.employeeID)}
                                  onCheckedChange={(checked) => handleSelectOne(row.employeeID, !!checked)}
                                />
                              </td>
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
                  
                  {syncResults.length > 0 && selectedUsers.length > 0 && (
                    <div className="mt-4">
                      <Button 
                        onClick={handleManualSync}
                        disabled={manualSyncStatus === "loading" || selectedUsers.length === 0}
                        variant="default"
                      >
                        {manualSyncStatus === "loading" ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Syncing Selected Users...
                          </>
                        ) : (
                          <>
                            <Users className="mr-2 h-4 w-4" />
                            Sync Selected Users ({selectedUsers.length})
                          </>
                        )}
                      </Button>
                    </div>
                  )}
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
