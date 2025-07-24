import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, AlertCircle, CheckCircle, XCircle, User, Building, UserCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/services/api-client';

interface SupervisorIssue {
  employee: {
    id: string;
    name: string;
    department: string;
    supervisorId: string;
  };
  adUser: {
    displayName: string;
    employeeID: string;
    currentManager: string;
  };
  issue: string;
  supervisorSearchResults: Array<{
    method: string;
    user: any;
  }>;
  possibleCauses: string[];
}

interface SupervisorDebugResult {
  summary: {
    totalHrisEmployees: number;
    totalAdUsers: number;
    employeesWithSupervisors: number;
    supervisorIssuesFound: number;
  };
  issues: SupervisorIssue[];
  analysis: {
    commonPatterns: {
      supervisorIdFormats: Record<string, number>;
      departmentDistribution: Record<string, number>;
      commonSupervisorIds: Record<string, number>;
    };
    recommendations: string[];
  };
}

export default function SupervisorDebugger() {
  const [isLoading, setIsLoading] = useState(false);
  const [debugResult, setDebugResult] = useState<SupervisorDebugResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDebugSupervisors = async () => {
    setIsLoading(true);
    setError(null);
    setDebugResult(null);

    try {
      const response = await apiClient.get('/hris-sync/debug-supervisor-lookup');
      
      if (response.data.success) {
        setDebugResult(response.data.data);
        toast.success(`Found ${response.data.data.summary.supervisorIssuesFound} supervisor lookup issues`);
      } else {
        throw new Error(response.data.error || 'Failed to debug supervisors');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Unknown error occurred';
      setError(errorMessage);
      toast.error(`Debug failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Supervisor Lookup Debugger
          </CardTitle>
          <CardDescription>
            Debug supervisor lookup issues where HRIS supervisors are reported as "not found in AD" but may actually exist
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleDebugSupervisors} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Supervisor Lookups...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Debug Supervisor Lookups
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {debugResult && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{debugResult.summary.totalHrisEmployees}</div>
                  <div className="text-sm text-muted-foreground">HRIS Employees</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{debugResult.summary.totalAdUsers}</div>
                  <div className="text-sm text-muted-foreground">AD Users</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{debugResult.summary.employeesWithSupervisors}</div>
                  <div className="text-sm text-muted-foreground">With Supervisors</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{debugResult.summary.supervisorIssuesFound}</div>
                  <div className="text-sm text-muted-foreground">Issues Found</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analysis Patterns */}
          <Card>
            <CardHeader>
              <CardTitle>Analysis Patterns</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Supervisor ID Formats</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(debugResult.analysis.commonPatterns.supervisorIdFormats).map(([format, count]) => (
                    <Badge key={format} variant="outline">
                      {format}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Department Distribution</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(debugResult.analysis.commonPatterns.departmentDistribution).map(([dept, count]) => (
                    <Badge key={dept} variant="secondary">
                      {dept}: {count}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Most Common Missing Supervisor IDs</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(debugResult.analysis.commonPatterns.commonSupervisorIds)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 10)
                    .map(([supervisorId, count]) => (
                    <Badge key={supervisorId} variant="destructive">
                      {supervisorId}: {count} employees
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Recommendations</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {debugResult.analysis.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Issues List */}
          {debugResult.issues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Supervisor Lookup Issues</CardTitle>
                <CardDescription>
                  Showing first 50 issues found (total: {debugResult.summary.supervisorIssuesFound})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {debugResult.issues.map((issue, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{issue.employee.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Employee ID: {issue.employee.id} | Department: {issue.employee.department}
                            </p>
                          </div>
                          <Badge variant="destructive">
                            Supervisor Not Found
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <h5 className="font-medium mb-1">HRIS Data</h5>
                            <p><strong>Supervisor ID:</strong> {issue.employee.supervisorId}</p>
                          </div>
                          <div>
                            <h5 className="font-medium mb-1">AD Data</h5>
                            <p><strong>Current Manager:</strong> {issue.adUser.currentManager}</p>
                          </div>
                        </div>

                        {issue.supervisorSearchResults.length > 0 && (
                          <div>
                            <h5 className="font-medium mb-2 text-green-600">Potential Matches Found:</h5>
                            <div className="space-y-2">
                              {issue.supervisorSearchResults.map((result, idx) => (
                                <div key={idx} className="bg-green-50 p-2 rounded text-sm">
                                  <p><strong>Method:</strong> {result.method}</p>
                                  <p><strong>Found:</strong> {result.user.displayName} ({result.user.employeeID})</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <h5 className="font-medium mb-1">Possible Causes</h5>
                          <ul className="list-disc list-inside text-sm text-muted-foreground">
                            {issue.possibleCauses.map((cause, idx) => (
                              <li key={idx}>{cause}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}