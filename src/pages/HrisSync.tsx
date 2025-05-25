import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, Server, Users, RefreshCw, AlertTriangle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

export default function HrisSync() {
  // — State hooks
  const [syncStatus, setSyncStatus] = useState<"idle"|"loading"|"success"|"error">("idle");
  const [testStatus, setTestStatus] = useState<"idle"|"loading"|"success"|"error">("idle");
  const [manualSyncStatus, setManualSyncStatus] = useState<"idle"|"loading"|"success"|"error">("idle");
  const [exportStatus, setExportStatus] = useState<"idle"|"loading"|"success"|"error">("idle");
  const [syncResults, setSyncResults] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [scheduleEnabled, setScheduleEnabled] = useState<boolean>(false);
  const [scheduleFrequency, setScheduleFrequency] = useState<string>("daily");
  const [nextScheduledRun, setNextScheduledRun] = useState<string | null>(null);
  const { toast } = useToast();

  // — Only rows that have at least one diff
  const changedResults = syncResults.filter(row =>
    Object.values(row.diffs).some(v => v !== undefined && v !== null)
  );

  // — Selection handlers
  const isSelected = (employeeID: string) => selectedUsers.includes(employeeID);
  const handleSelectOne = (employeeID: string, checked: boolean) => {
    setSelectedUsers(prev =>
      checked ? [...prev, employeeID] : prev.filter(id => id !== employeeID)
    );
  };
  const handleSelectAll = (checked: boolean) => {
    setSelectedUsers(checked ? changedResults.map(r => r.employeeID) : []);
  };

  // — Test sync
  const handleTestSync = async () => {
    setTestStatus("loading");
    setSelectedUsers([]);
    try {
      const res = await fetch("/api/hris-sync/test");
      if (!res.ok) throw new Error("Failed to fetch test sync results");
      const { results } = await res.json();
      setSyncResults(results || []);
      setTestStatus("success");
      toast({
        title: "Test sync completed",
        description: `${results?.length || 0} users would be updated`,
      });
    } catch (err) {
      setTestStatus("error");
      toast({ title: "Test sync failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  // — Manual sync
  const handleManualSync = async () => {
    if (!selectedUsers.length) return;
    setManualSyncStatus("loading");
    try {
      const res = await fetch("/api/hris-sync/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeIDs: selectedUsers })
      });
      if (!res.ok) throw new Error("Manual sync failed");
      const { results } = await res.json();
      setSyncResults(results || []);
      setSelectedUsers([]);
      setManualSyncStatus("success");
      toast({
        title: "Manual sync completed",
        description: `${results?.length || 0} users updated`,
      });
    } catch (err) {
      setManualSyncStatus("error");
      toast({ title: "Manual sync failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  // — Schedule update
  const handleUpdateSchedule = async () => {
    setSyncStatus("loading");
    try {
      const res = await fetch("/api/hris-sync/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: scheduleEnabled, frequency: scheduleFrequency })
      });
      if (!res.ok) throw new Error("Failed to update schedule");
      const { nextRun } = await res.json();
      setNextScheduledRun(nextRun || null);
      setSyncStatus("success");
      toast({
        title: "Schedule updated",
        description: scheduleEnabled
          ? `Will run ${scheduleFrequency}`
          : "Automatic sync disabled"
      });
    } catch (err) {
      setSyncStatus("error");
      toast({ title: "Failed to update schedule", description: (err as Error).message, variant: "destructive" });
    }
  };

  // — Load schedule settings on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/hris-sync/schedule");
        if (!res.ok) return;
        const { settings, nextRun } = await res.json();
        setScheduleEnabled(settings.enabled);
        setScheduleFrequency(settings.frequency);
        setNextScheduledRun(nextRun);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  // — Export CSV (mocked)
  const handleExportData = () => {
    setExportStatus("loading");
    setTimeout(() => {
      setExportStatus("success");
      toast({ title: "Export completed", description: "CSV ready" });
      // … download logic …
    }, 2000);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">MyOrange → Active Directory Sync</h1>
          <p className="text-muted-foreground">Compare & update HRIS data in AD.</p>
        </div>

        {/* Connection Info */}
        <Alert>
          <Server className="h-4 w-4" />
          <AlertTitle>Connection Info</AlertTitle>
          <AlertDescription>
            Connected to HRIS database & Active Directory.
          </AlertDescription>
        </Alert>

        {/* Tabs */}
        <Tabs defaultValue="sync" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sync"><RefreshCw className="h-4 w-4" /> Sync</TabsTrigger>
            <TabsTrigger value="export"><Database className="h-4 w-4" /> Export</TabsTrigger>
          </TabsList>

          {/* Sync Tab */}
          <TabsContent value="sync" className="space-y-4">
            {/* Test & Schedule */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Test Sync */}
              <Card>
                <CardHeader>
                  <CardTitle>Test Sync</CardTitle>
                  <CardDescription>Dry-run only</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button onClick={handleTestSync} disabled={testStatus === "loading"} className="w-full">
                    {testStatus === "loading"
                      ? <><RefreshCw className="animate-spin mr-2" />Running…</>
                      : <><Server className="mr-2" />Run Test</>
                    }
                  </Button>
                </CardFooter>
              </Card>

              {/* Scheduled Sync */}
              <Card>
                <CardHeader>
                  <CardTitle>Automated Sync</CardTitle>
                  <CardDescription>Configure schedule</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
                    <Label>Enable</Label>
                  </div>
                  <Label className="mt-2">Frequency</Label>
                  <Select value={scheduleFrequency} onValueChange={setScheduleFrequency} disabled={!scheduleEnabled}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  {nextScheduledRun && (
                    <p className="text-sm mt-2">Next run: {new Date(nextScheduledRun).toLocaleString()}</p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button onClick={handleUpdateSchedule} disabled={syncStatus === "loading"} className="w-full">
                    {syncStatus === "loading"
                      ? <><RefreshCw className="animate-spin mr-2" />Updating…</>
                      : <><Clock className="mr-2" />Update</>
                    }
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Sync Results: only changed rows */}
            {changedResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Sync Results</CardTitle>
                  <CardDescription>Users with changes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-4 text-sm">
                    <div className="flex items-center gap-1">
                      <div className="h-4 w-4 bg-yellow-100 border-yellow-300 rounded" />
                      <span>New Value</span>
                    </div>
                  </div>
                  <ScrollArea>
                    <table className="min-w-full text-xs border">
                      <thead>
                        <tr>
                          <th className="border px-2 py-1">
                            <Checkbox
                              checked={selectedUsers.length === changedResults.length}
                              onCheckedChange={handleSelectAll}
                            />
                          </th>
                          <th className="border px-2 py-1">EmployeeID</th>
                          <th className="border px-2 py-1">DisplayName</th>
                          <th className="border px-2 py-1">Dept (New)</th>
                          <th className="border px-2 py-1">Title (New)</th>
                          <th className="border px-2 py-1">Manager (New)</th>
                          <th className="border px-2 py-1">Phone (New)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {changedResults.map(row => (
                          <tr key={row.employeeID}>
                            <td className="border px-2 py-1">
                              <Checkbox
                                checked={isSelected(row.employeeID)}
                                onCheckedChange={ch => handleSelectOne(row.employeeID, !!ch)}
                              />
                            </td>
                            <td className="border px-2 py-1">{row.employeeID}</td>
                            <td className="border px-2 py-1">{row.displayName}</td>
                            <td className="border px-2 py-1">{row.diffs.department ?? "—"}</td>
                            <td className="border px-2 py-1">{row.diffs.title      ?? "—"}</td>
                            <td className="border px-2 py-1">{row.diffs.manager    ?? "—"}</td>
                            <td className="border px-2 py-1">{row.diffs.mobile     ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                  {selectedUsers.length > 0 && (
                    <div className="mt-4">
                      <Button
                        onClick={handleManualSync}
                        disabled={manualSyncStatus === "loading"}
                        className="w-full"
                      >
                        {manualSyncStatus === "loading"
                          ? <><RefreshCw className="animate-spin mr-2" />Syncing…</>
                          : <><Users className="mr-2" />Sync Selected ({selectedUsers.length})</>
                        }
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export">
            <Card>
              <CardHeader>
                <CardTitle>Export Comparison</CardTitle>
                <CardDescription>Download CSV of changes</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button onClick={handleExportData} disabled={exportStatus === "loading"} className="w-full">
                  {exportStatus === "loading"
                    ? <><RefreshCw className="animate-spin mr-2" />Generating…</>
                    : <><Database className="mr-2" />Export CSV</>
                  }
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
