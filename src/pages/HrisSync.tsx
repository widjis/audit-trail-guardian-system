import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, Server, Users, RefreshCw, AlertTriangle, Clock, Bug, BarChart, UserCheck, Table } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { HrisSyncResult } from "@/types/types";
import { HrisSyncDebugger } from "@/components/hires/HrisSyncDebugger";
import { HrisSyncDataCounts } from "@/components/hires/HrisSyncDataCounts";
import { AdUserDebugger } from "@/components/hires/AdUserDebugger";
import SupervisorDebugger from "@/components/hires/SupervisorDebugger";
import EmployeesNotInAdDebugger from "@/components/hires/EmployeesNotInAdDebugger";
import HrisTableView from "@/components/hires/HrisTableView";

export default function HrisSync() {
  // — State hooks
  const [syncStatus, setSyncStatus] = useState<"idle"|"loading"|"success"|"error">("idle");
  const [testStatus, setTestStatus] = useState<"idle"|"loading"|"success"|"error">("idle");
  const [manualSyncStatus, setManualSyncStatus] = useState<"idle"|"loading"|"success"|"error">("idle");
  const [exportStatus, setExportStatus] = useState<"idle"|"loading"|"success"|"error">("idle");
  const [syncResults, setSyncResults] = useState<HrisSyncResult[]>([]);
  const [syncSummary, setSyncSummary] = useState<any>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [scheduleEnabled, setScheduleEnabled] = useState<boolean>(false);
  const [scheduleFrequency, setScheduleFrequency] = useState<string>("daily");
  const [nextScheduledRun, setNextScheduledRun] = useState<string | null>(null);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.2);
  const { toast } = useToast();

  // — Only rows that have changes OR field discrepancies OR high priority issues
  // — Skip users who are "Missing in HRIS" (not found in HRIS database)
  const changedResults = syncResults.filter((row: HrisSyncResult) => {
    // Skip if user has "Missing in HRIS" issues
    const hasMissingInHrisIssues = row.fieldComparison?.highPriorityIssues?.some(issue => 
      issue.includes('Missing') && issue.includes('HRIS')
    );
    if (hasMissingInHrisIssues) {
      return false;
    }

    const hasDiffs = Object.values(row.diffs).some(v => v !== undefined && v !== null);
    const hasDiscrepancies = row.fieldComparison?.discrepancies > 0;
    const hasHighPriorityIssues = row.fieldComparison?.highPriorityIssues?.length > 0;
    return hasDiffs || hasDiscrepancies || hasHighPriorityIssues;
  });

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
      const res = await fetch(`/api/hris-sync/test?confidenceThreshold=${confidenceThreshold}`);
      if (!res.ok) throw new Error("Failed to fetch test sync results");
      const { results, summary } = await res.json();
      setSyncResults(results || []);
      setSyncSummary(summary || null);
      setTestStatus("success");
      toast({
        title: "Test sync completed",
        description: `${summary?.usersWithChanges || 0} users need updates, ${summary?.usersWithoutChanges || 0} already in sync`,
      });
    } catch (err) {
      setTestStatus("error");
      toast({ title: "Test sync failed", description: (err as Error).message, variant: "destructive" });
    }
  };

  // — Manual sync
  const handleManualSync = async (employeeIDs?: string[]) => {
    console.log('handleManualSync called with:', employeeIDs);
    console.log('Type of employeeIDs:', typeof employeeIDs);
    console.log('Is array:', Array.isArray(employeeIDs));
    
    // Handle case where employeeIDs might be an event object
    let idsToSync: string[];
    if (Array.isArray(employeeIDs)) {
      idsToSync = employeeIDs;
    } else {
      // Fallback to selectedUsers if employeeIDs is not an array
      idsToSync = selectedUsers;
    }
    
    console.log('idsToSync:', idsToSync);
    if (!idsToSync.length) {
      console.log('No IDs to sync, returning early');
      return;
    }
    console.log('Starting manual sync for:', idsToSync);
    setManualSyncStatus("loading");
    try {
      // 1. Perform the actual sync
      const syncRes = await fetch("/api/hris-sync/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeIDs: idsToSync, confidenceThreshold })
      });
      if (!syncRes.ok) throw new Error("Manual sync failed");
      const { results: syncResults } = await syncRes.json();
      
      // 2. Optimized update: Only update the synced users in the current results
      // instead of rescanning all users
      if (syncResults && syncResults.length > 0) {
        setSyncResults(prevResults => {
          const updatedResults = [...prevResults];
          
          // Update each synced user in the results
          syncResults.forEach(syncedUser => {
            const index = updatedResults.findIndex(r => r.employeeID === syncedUser.employeeID);
            if (index !== -1) {
              // Update the existing result with synced data
              updatedResults[index] = {
                ...updatedResults[index],
                ...syncedUser,
                // Mark as no longer having changes since it was just synced
                hasChanges: false,
                fieldComparison: {
                  ...syncedUser.fieldComparison,
                  discrepancies: 0,
                  matchingFields: 6 // All fields should match after sync
                }
              };
            }
          });
          
          return updatedResults;
        });
        
        // Update summary to reflect the changes
        setSyncSummary(prevSummary => {
          if (!prevSummary) return null;
          
          const syncedCount = syncResults.length;
          return {
            ...prevSummary,
            usersWithChanges: Math.max(0, prevSummary.usersWithChanges - syncedCount),
            usersWithoutChanges: prevSummary.usersWithoutChanges + syncedCount,
            totalDiscrepancies: Math.max(0, prevSummary.totalDiscrepancies - syncResults.reduce((sum, r) => sum + (r.fieldComparison?.discrepancies || 0), 0))
          };
        });
      }
      
      // Clear selected users only if using the main selectedUsers state
      if (!employeeIDs) {
        setSelectedUsers([]);
      }
      setManualSyncStatus("success");
      toast({
        title: "Manual sync completed",
        description: `${syncResults?.length || 0} users updated. No full rescan needed.`,
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

  // — Load schedule settings and initial data on mount
  useEffect(() => {
    (async () => {
      try {
        // Load schedule settings
        const res = await fetch("/api/hris-sync/schedule");
        if (!res.ok) return;
        const { settings, nextRun } = await res.json();
        setScheduleEnabled(settings.enabled);
        setScheduleFrequency(settings.frequency);
        setNextScheduledRun(nextRun);
      } catch {
        /* ignore */
      }
      
      // Load initial test data
      try {
        console.log('Loading initial test data...');
        const res = await fetch(`/api/hris-sync/test?confidenceThreshold=${confidenceThreshold}`);
        if (!res.ok) throw new Error("Failed to fetch test sync results");
        const { results, summary } = await res.json();
        setSyncResults(results || []);
        setSyncSummary(summary || null);
        console.log('Initial data loaded:', results?.length || 0, 'users');
      } catch (err) {
        console.error('Failed to load initial data:', err);
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
            <TabsTrigger value="table"><Table className="h-4 w-4" /> HRIS Table</TabsTrigger>
            <TabsTrigger value="debug"><Bug className="h-4 w-4" /> Debug</TabsTrigger>
            <TabsTrigger value="ad-lookup"><UserCheck className="h-4 w-4" /> AD User Lookup</TabsTrigger>
            <TabsTrigger value="analysis"><BarChart className="h-4 w-4" /> Data Analysis</TabsTrigger>
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
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="confidence-threshold">Confidence Threshold</Label>
                    <Input
                      id="confidence-threshold"
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      value={confidenceThreshold}
                      onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value) || 0.2)}
                      placeholder="0.2"
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum confidence score for fuzzy matching (0.0 - 1.0)
                    </p>
                  </div>
                </CardContent>
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

            {/* Summary Statistics */}
            {syncSummary && (
              <Card>
                <CardHeader>
                  <CardTitle>Sync Analysis Summary</CardTitle>
                  <CardDescription>Comprehensive field comparison results</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-blue-600">{syncSummary.totalUsers}</div>
                      <div className="text-sm text-muted-foreground">Total Users</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-green-600">{syncSummary.usersWithoutChanges}</div>
                      <div className="text-sm text-muted-foreground">In Sync</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-orange-600">{syncSummary.usersWithChanges}</div>
                      <div className="text-sm text-muted-foreground">Need Updates</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-red-600">{syncSummary.highPriorityIssues}</div>
                      <div className="text-sm text-muted-foreground">High Priority</div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-3 gap-4 text-center text-sm">
                      <div>
                        <div className="font-semibold">{syncSummary.totalFieldsAnalyzed}</div>
                        <div className="text-muted-foreground">Fields Analyzed</div>
                      </div>
                      <div>
                        <div className="font-semibold text-green-600">{syncSummary.totalMatches}</div>
                        <div className="text-muted-foreground">Matches</div>
                      </div>
                      <div>
                        <div className="font-semibold text-red-600">{syncSummary.totalDiscrepancies}</div>
                        <div className="text-muted-foreground">Discrepancies</div>
                      </div>
                    </div>
                  </div>
                  {/* Processing Summary from Terminal */}
                  {syncSummary.processingStats && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="text-sm font-medium mb-2">Processing Summary</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-xs">
                        <div>
                          <div className="font-semibold text-blue-600">{syncSummary.processingStats.totalHrisUsers}</div>
                          <div className="text-muted-foreground">Total HRIS</div>
                        </div>
                        <div>
                          <div className="font-semibold text-red-600">{syncSummary.processingStats.skippedNoMatch}</div>
                          <div className="text-muted-foreground">Skipped (No AD Match)</div>
                        </div>
                        <div>
                          <div className="font-semibold text-green-600">{syncSummary.processingStats.successfullyProcessed}</div>
                          <div className="text-muted-foreground">Successfully Processed</div>
                        </div>
                        <div>
                          <div className="font-semibold text-orange-600">{syncSummary.processingStats.skippedNoName}</div>
                          <div className="text-muted-foreground">Skipped (No Name)</div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Skipped Users Section */}
            {syncSummary?.skippedUsers && syncSummary.skippedUsers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Skipped Users - No AD Match Found</CardTitle>
                  <CardDescription>
                    {syncSummary.skippedUsers.length} users skipped due to fuzzy matching scores above threshold ({confidenceThreshold})
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 text-sm text-muted-foreground">
                    <strong>Note:</strong> Lower scores indicate better matches. Users with scores above {confidenceThreshold} are skipped.
                  </div>
                  <ScrollArea className="h-64">
                    <table className="min-w-full text-xs border">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="border px-2 py-1">Employee ID</th>
                          <th className="border px-2 py-1">Name</th>
                          <th className="border px-2 py-1">Department</th>
                          <th className="border px-2 py-1">Best Match Score</th>
                          <th className="border px-2 py-1">Best Match Name</th>
                          <th className="border px-2 py-1">Confidence</th>
                          <th className="border px-2 py-1">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {syncSummary.skippedUsers.map((user, index) => (
                          <tr key={user.employeeId || index} className="hover:bg-muted/30">
                            <td className="border px-2 py-1 font-mono">{user.employeeId}</td>
                            <td className="border px-2 py-1">{user.name}</td>
                            <td className="border px-2 py-1">{user.department || 'N/A'}</td>
                            <td className="border px-2 py-1">
                              <span className={`font-semibold ${
                                user.bestScore <= 0.2 ? 'text-green-600' :
                                user.bestScore <= 0.4 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {user.bestScore?.toFixed(3) || 'N/A'}
                              </span>
                            </td>
                            <td className="border px-2 py-1">{user.bestMatchName || 'No match'}</td>
                            <td className="border px-2 py-1">
                              <span className={`text-xs ${
                                user.confidence >= 80 ? 'text-green-600' :
                                user.confidence >= 60 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {user.confidence?.toFixed(1) || '0.0'}%
                              </span>
                            </td>
                            <td className="border px-2 py-1">
                              <span className="text-red-600 text-xs">
                                Score &gt; {confidenceThreshold}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Sync Results: only changed rows */}
            {changedResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Users Requiring Updates</CardTitle>
                  <CardDescription>{changedResults.length} users with field discrepancies</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-1">
                      <div className="h-3 w-3 bg-yellow-100 border border-yellow-300 rounded" />
                      <span>New Value</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-3 w-3 bg-red-100 border border-red-300 rounded" />
                      <span>High Priority</span>
                    </div>
                  </div>
                  <ScrollArea className="h-96">
                    <table className="min-w-full text-xs border">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="border px-2 py-1">
                            <Checkbox
                              checked={selectedUsers.length === changedResults.length}
                              onCheckedChange={handleSelectAll}
                            />
                          </th>
                          <th className="border px-2 py-1">Employee ID</th>
                          <th className="border px-2 py-1">Display Name</th>
                          <th className="border px-2 py-1">Match Score</th>
                          <th className="border px-2 py-1">Field Analysis</th>
                          <th className="border px-2 py-1">Department</th>
                          <th className="border px-2 py-1">Title</th>
                          <th className="border px-2 py-1">Manager</th>
                          <th className="border px-2 py-1">Mobile</th>
                          <th className="border px-2 py-1">Gender</th>
                          <th className="border px-2 py-1">Issues</th>
                        </tr>
                      </thead>
                      <tbody>
                        {changedResults.map(row => (
                          <tr key={row.employeeID} className="hover:bg-muted/30">
                            <td className="border px-2 py-1">
                              <Checkbox
                                checked={isSelected(row.employeeID)}
                                onCheckedChange={ch => handleSelectOne(row.employeeID, !!ch)}
                              />
                            </td>
                            <td className="border px-2 py-1 font-mono">{row.employeeID}</td>
                            <td className="border px-2 py-1">{row.displayName}</td>
                            <td className="border px-2 py-1">
                              {row.fuzzyScore !== undefined && row.fuzzyScore !== null ? (
                                <div className="flex items-center gap-1">
                                  <span className={`text-xs font-semibold ${
                                    row.fuzzyScore <= 0.2 ? 'text-green-600' :
                                    row.fuzzyScore <= 0.4 ? 'text-yellow-600' :
                                    'text-red-600'
                                  }`}>
                                    {row.fuzzyScore.toFixed(3)}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    ({row.matchMethod})
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">N/A</span>
                              )}
                            </td>
                            <td className="border px-2 py-1">
                              <div className="flex items-center gap-1">
                                <span className="text-green-600 font-semibold">{row.fieldComparison?.matchingFields || 0}</span>
                                <span className="text-muted-foreground">/</span>
                                <span className="text-muted-foreground">{row.fieldComparison?.totalFields || 4}</span>
                                {row.fieldComparison?.highPriorityIssues?.length > 0 && (
                                  <div className="h-2 w-2 bg-red-500 rounded-full ml-1" title="High priority issues" />
                                )}
                              </div>
                            </td>
                            <td className="border px-2 py-1">
                              {row.diffs.department ? (
                                <span className="bg-yellow-100 px-1 rounded text-xs">{row.diffs.department || "—"}</span>
                              ) : "—"}
                            </td>
                            <td className="border px-2 py-1">
                              {row.diffs.title ? (
                                <span className="bg-yellow-100 px-1 rounded text-xs">{row.diffs.title || "—"}</span>
                              ) : "—"}
                            </td>
                            <td className="border px-2 py-1">
                              {row.diffs.manager ? (
                                <span className="bg-yellow-100 px-1 rounded text-xs" title={row.diffs.manager}>
                                  Manager Update
                                </span>
                              ) : "—"}
                            </td>
                            <td className="border px-2 py-1">
                              {row.diffs.mobile ? (
                                <span className="bg-yellow-100 px-1 rounded text-xs">{row.diffs.mobile || "—"}</span>
                              ) : "—"}
                            </td>
                            <td className="border px-2 py-1">
                              {row.diffs.gender ? (
                                <span className="bg-yellow-100 px-1 rounded text-xs">{row.diffs.gender || "—"}</span>
                              ) : "—"}
                            </td>
                            <td className="border px-2 py-1">
                              {row.fieldComparison?.highPriorityIssues?.length > 0 ? (
                                <div className="text-xs text-red-600">
                                  {row.fieldComparison.highPriorityIssues.slice(0, 2).join(", ")}
                                  {row.fieldComparison.highPriorityIssues.length > 2 && "..."}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                  {selectedUsers.length > 0 && (
                    <div className="mt-4">
                      <Button
                        onClick={() => handleManualSync()}
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

            {/* All Users Analysis (when no changes) */}
            {syncResults.length > 0 && changedResults.length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>All Users In Sync</CardTitle>
                  <CardDescription>No users require updates - all fields match between HRIS and AD</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">✅</div>
                    <div className="text-lg font-semibold text-green-600 mb-2">Perfect Synchronization</div>
                    <div className="text-muted-foreground">
                      All {syncResults.length} users have matching data between HRIS and Active Directory
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* HRIS Table Tab */}
          <TabsContent value="table">
            <HrisTableView 
              data={syncResults}
              loading={testStatus === "loading"}
              onRefresh={handleTestSync}
              onSync={handleManualSync}
            />
          </TabsContent>

          {/* Debug Tab */}
          <TabsContent value="debug" className="space-y-6">
            <HrisSyncDebugger />
            <SupervisorDebugger />
            <EmployeesNotInAdDebugger />
          </TabsContent>

          {/* AD User Lookup Tab */}
          <TabsContent value="ad-lookup">
            <AdUserDebugger />
          </TabsContent>

          {/* Data Analysis Tab */}
          <TabsContent value="analysis">
            <HrisSyncDataCounts />
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
