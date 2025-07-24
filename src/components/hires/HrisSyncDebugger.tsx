import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Search, AlertCircle, CheckCircle, XCircle, User, Building, Phone, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/services/api-client';

interface DebugResult {
  employeeId: string;
  found: boolean;
  error?: string;
  hrisData?: any;
  adData?: any;
  matchingProcess?: any;
  diffs?: any;
  managerAnalysis?: any;
  syncDecision?: any;
}

export const HrisSyncDebugger: React.FC = () => {
  const [employeeId, setEmployeeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugResult, setDebugResult] = useState<DebugResult | null>(null);

  const handleDebug = async () => {
    if (!employeeId.trim()) {
      toast.error('Please enter an employee ID');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.get(`/hris-sync/debug/${employeeId.trim()}`);
      setDebugResult(response.data.debug);
    } catch (error: any) {
      console.error('Debug error:', error);
      toast.error(error.response?.data?.error || 'Failed to debug employee');
      setDebugResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleDebug();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            HRIS Sync Debugger
          </CardTitle>
          <CardDescription>
            Debug why specific employees are being skipped in HRIS sync
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter Employee ID (e.g., MTI250126)"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={handleDebug} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Debug
            </Button>
          </div>
        </CardContent>
      </Card>

      {debugResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Debug Results for {debugResult.employeeId}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Overview */}
            <div className="flex items-center gap-2">
              {debugResult.found ? (
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Found in HRIS
                </Badge>
              ) : (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Not Found
                </Badge>
              )}
              
              {debugResult.syncDecision && (
                <Badge variant={debugResult.syncDecision.willSync ? "default" : "secondary"}>
                  {debugResult.syncDecision.willSync ? "Will Sync" : "Will Skip"}
                </Badge>
              )}
            </div>

            {debugResult.error && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{debugResult.error}</AlertDescription>
              </Alert>
            )}

            {debugResult.syncDecision && (
              <Alert>
                <AlertDescription>
                  <strong>Sync Decision:</strong> {debugResult.syncDecision.reason}
                </AlertDescription>
              </Alert>
            )}

            {/* HRIS Data */}
            {debugResult.hrisData && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  HRIS Data
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Name:</strong> {debugResult.hrisData.employee_name}</div>
                  <div><strong>Department:</strong> {debugResult.hrisData.department}</div>
                  <div><strong>Title:</strong> {debugResult.hrisData.position_title}</div>
                  <div><strong>Supervisor ID:</strong> {debugResult.hrisData.supervisor_id || 'None'}</div>
                  <div><strong>Phone:</strong> {debugResult.hrisData.phone || 'None'}</div>
                  <div><strong>Gender:</strong> {debugResult.hrisData.gender}</div>
                </div>
              </div>
            )}

            {/* AD Data */}
            {debugResult.adData && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Active Directory Data
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Display Name:</strong> {debugResult.adData.displayName}</div>
                  <div><strong>Employee ID:</strong> {debugResult.adData.employeeID || 'None'}</div>
                  <div><strong>Department:</strong> {debugResult.adData.department || 'None'}</div>
                  <div><strong>Title:</strong> {debugResult.adData.title || 'None'}</div>
                  <div><strong>Manager:</strong> {debugResult.adData.manager || 'None'}</div>
                  <div><strong>Mobile:</strong> {debugResult.adData.mobile || 'None'}</div>
                </div>
              </div>
            )}

            {/* Matching Process */}
            {debugResult.matchingProcess && (
              <div>
                <h4 className="font-semibold mb-3">Matching Process</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <strong>Exact Match:</strong>
                    {debugResult.matchingProcess.exactMatch?.found ? (
                      <Badge variant="default">Found</Badge>
                    ) : (
                      <Badge variant="secondary">Not Found</Badge>
                    )}
                  </div>
                  
                  {debugResult.matchingProcess.fuzzyMatch && (
                    <div className="flex items-center gap-2">
                      <strong>Fuzzy Match:</strong>
                      {debugResult.matchingProcess.fuzzyMatch.found ? (
                        <Badge variant="default">Found</Badge>
                      ) : (
                        <Badge variant="secondary">Not Found</Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Manager Analysis */}
            {debugResult.managerAnalysis && (
              <div>
                <h4 className="font-semibold mb-3">Manager Analysis</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Supervisor ID:</strong> {debugResult.managerAnalysis.supervisorId || 'None'}</div>
                  {debugResult.managerAnalysis.expectedManagerDN && (
                    <div><strong>Expected Manager DN:</strong> {debugResult.managerAnalysis.expectedManagerDN}</div>
                  )}
                  {debugResult.managerAnalysis.currentManagerDN && (
                    <div><strong>Current Manager DN:</strong> {debugResult.managerAnalysis.currentManagerDN}</div>
                  )}
                  {debugResult.managerAnalysis.reason && (
                    <div><strong>Reason:</strong> {debugResult.managerAnalysis.reason}</div>
                  )}
                  {debugResult.managerAnalysis.error && (
                    <div className="text-red-600"><strong>Error:</strong> {debugResult.managerAnalysis.error}</div>
                  )}
                  <div className="flex items-center gap-2">
                    <strong>Will Update Manager:</strong>
                    {debugResult.managerAnalysis.willUpdate ? (
                      <Badge variant="default">Yes</Badge>
                    ) : (
                      <Badge variant="secondary">No</Badge>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Differences */}
            {debugResult.diffs && Object.keys(debugResult.diffs).length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">Differences Found</h4>
                <div className="space-y-2">
                  {Object.entries(debugResult.diffs).map(([field, newValue]) => (
                    <div key={field} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">{field}</Badge>
                      <span>→</span>
                      <span className="font-mono bg-muted px-2 py-1 rounded">{String(newValue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {debugResult.diffs && Object.keys(debugResult.diffs).length === 0 && (
              <Alert>
                <AlertDescription>
                  No differences found between HRIS and Active Directory data. This is why the employee is being skipped.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};