import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, AlertCircle, CheckCircle, XCircle, User, Building, Phone, UserCheck, Mail, IdCard } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/services/api-client';

interface AdUserResult {
  username: string;
  found: boolean;
  searchMethod?: string;
  adUserDetails?: any;
  hrisMatching?: any;
  analysis?: any;
  message?: string;
}

export const AdUserDebugger: React.FC = () => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AdUserResult | null>(null);

  const handleLookup = async () => {
    if (!username.trim()) {
      toast.error('Please enter a username');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.get(`/hris-sync/debug-ad-user/${username.trim()}`);
      setResult(response.data.data);
    } catch (error: any) {
      console.error('AD user lookup error:', error);
      toast.error(error.response?.data?.error || 'Failed to lookup AD user');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLookup();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Active Directory User Lookup
          </CardTitle>
          <CardDescription>
            Check AD user details and HRIS matching for any username
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter username (e.g., reyhan.ramadhani)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={handleLookup} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Lookup
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              AD User Details for {result.username}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Overview */}
            <div className="flex items-center gap-2 flex-wrap">
              {result.found ? (
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Found in AD
                </Badge>
              ) : (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Not Found
                </Badge>
              )}
              
              {result.analysis?.hasEmployeeID && (
                <Badge variant="default" className="flex items-center gap-1">
                  <IdCard className="h-3 w-3" />
                  Has Employee ID
                </Badge>
              )}
              
              {result.analysis?.hasExactHrisMatch && (
                <>
                  {result.analysis?.isInSync ? (
                    <Badge variant="default" className="flex items-center gap-1 bg-green-600">
                      <CheckCircle className="h-3 w-3" />
                      Fully Synchronized
                    </Badge>
                  ) : result.analysis?.hasDiscrepancies ? (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Has Discrepancies
                    </Badge>
                  ) : (
                    <Badge variant="default" className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      HRIS Match
                    </Badge>
                  )}
                </>
              )}
            </div>

            {!result.found && result.message && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{result.message}</AlertDescription>
              </Alert>
            )}

            {/* AD User Details */}
            {result.adUserDetails && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Active Directory Details
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>SAM Account:</strong> {result.adUserDetails.sAMAccountName || 'None'}</div>
                  <div><strong>UPN:</strong> {result.adUserDetails.userPrincipalName || 'None'}</div>
                  <div><strong>Display Name:</strong> {result.adUserDetails.displayName || 'None'}</div>
                  <div><strong>Name:</strong> {result.adUserDetails.name || 'None'}</div>
                  <div><strong>Employee ID:</strong> {result.adUserDetails.employeeID || 'Not set'}</div>
                  <div><strong>Department:</strong> {result.adUserDetails.department || 'None'}</div>
                  <div><strong>Title:</strong> {result.adUserDetails.title || 'None'}</div>
                  <div><strong>Manager:</strong> {result.adUserDetails.manager || 'None'}</div>
                  <div><strong>Mobile:</strong> {result.adUserDetails.mobile || 'None'}</div>
                  <div><strong>Email:</strong> {result.adUserDetails.mail || 'None'}</div>
                </div>
                
                {result.searchMethod && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    <strong>Found using:</strong> {result.searchMethod}
                  </div>
                )}
              </div>
            )}

            {/* HRIS Matching */}
            {result.hrisMatching && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  HRIS Matching
                </h4>
                
                {result.hrisMatching.exactMatch ? (
                  <div className="space-y-2">
                    <Badge variant="default">Exact Match Found</Badge>
                    <div className="grid grid-cols-2 gap-4 text-sm bg-green-50 p-3 rounded">
                      <div><strong>Employee ID:</strong> {result.hrisMatching.exactMatch.employee_id}</div>
                      <div><strong>Name:</strong> {result.hrisMatching.exactMatch.employee_name}</div>
                      <div><strong>Department:</strong> {result.hrisMatching.exactMatch.department}</div>
                      <div><strong>Title:</strong> {result.hrisMatching.exactMatch.position_title}</div>
                    </div>
                  </div>
                ) : (
                  <Badge variant="secondary">No Exact Match</Badge>
                )}

                {result.hrisMatching.fuzzyMatches && result.hrisMatching.fuzzyMatches.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-medium mb-2">Potential Fuzzy Matches:</h5>
                    <div className="space-y-2">
                      {result.hrisMatching.fuzzyMatches.map((match: any, index: number) => (
                        <div key={index} className="flex items-center justify-between bg-yellow-50 p-2 rounded text-sm">
                          <div>
                            <strong>{match.employee_id}</strong> - {match.employee_name}
                          </div>
                          <Badge variant="outline">
                            {Math.round(match.similarity * 100)}% match
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Field Comparison */}
            {result.hrisMatching?.fieldComparison && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Field Comparison (AD vs HRIS)
                </h4>
                
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><strong>Total Fields:</strong> {result.hrisMatching.fieldComparison.summary.totalFields}</div>
                      <div><strong>Matching:</strong> {result.hrisMatching.fieldComparison.summary.matchingFields}</div>
                      <div><strong>Discrepancies:</strong> {result.hrisMatching.fieldComparison.summary.discrepantFields}</div>
                      <div><strong>High Priority Issues:</strong> {result.hrisMatching.fieldComparison.summary.highSeverityIssues}</div>
                    </div>
                  </div>

                  {/* Matching Fields */}
                  {result.hrisMatching.fieldComparison.matches.length > 0 && (
                    <div>
                      <h5 className="font-medium mb-2 text-green-700">✓ Matching Fields:</h5>
                      <div className="flex flex-wrap gap-2">
                        {result.hrisMatching.fieldComparison.matches.map((field: string) => (
                          <Badge key={field} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Discrepancies */}
                  {result.hrisMatching.fieldComparison.discrepancies.length > 0 && (
                    <div>
                      <h5 className="font-medium mb-2 text-red-700">✗ Field Discrepancies:</h5>
                      <div className="space-y-2">
                        {result.hrisMatching.fieldComparison.discrepancies.map((discrepancy: any, index: number) => (
                          <div key={index} className={`p-3 rounded border-l-4 ${
                            discrepancy.severity === 'high' ? 'bg-red-50 border-red-500' :
                            discrepancy.severity === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                            'bg-blue-50 border-blue-500'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <strong className="capitalize">{discrepancy.field}</strong>
                              <Badge variant={
                                discrepancy.severity === 'high' ? 'destructive' :
                                discrepancy.severity === 'medium' ? 'default' : 'secondary'
                              }>
                                {discrepancy.severity}
                              </Badge>
                            </div>
                            <div className="text-sm space-y-1">
                              <div><strong>AD:</strong> {discrepancy.adValue}</div>
                              <div><strong>HRIS:</strong> {discrepancy.hrisValue}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Analysis & Recommendations */}
            {result.analysis && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Analysis & Recommendations
                </h4>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Has Employee ID:</strong> {result.analysis.hasEmployeeID ? 'Yes' : 'No'}</div>
                    <div><strong>Employee ID Value:</strong> {result.analysis.employeeIDValue}</div>
                    <div><strong>Has HRIS Match:</strong> {result.analysis.hasExactHrisMatch ? 'Yes' : 'No'}</div>
                    <div><strong>Is Synchronized:</strong> {result.analysis.isInSync ? 'Yes' : 'No'}</div>
                    <div><strong>Has Discrepancies:</strong> {result.analysis.hasDiscrepancies ? 'Yes' : 'No'}</div>
                    <div><strong>Has Fuzzy Matches:</strong> {result.analysis.hasFuzzyMatches ? 'Yes' : 'No'}</div>
                  </div>

                  {result.analysis.recommendations && result.analysis.recommendations.length > 0 && (
                    <div>
                      <h5 className="font-medium mb-2">Recommendations:</h5>
                      <div className="space-y-2">
                        {result.analysis.recommendations.map((rec: any, index: number) => (
                          <Alert key={index} className={
                            rec.severity === 'high' ? 'border-red-200 bg-red-50' :
                            rec.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                            rec.severity === 'info' ? 'border-green-200 bg-green-50' :
                            ''
                          }>
                            <AlertDescription>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <strong>{rec.type.replace(/_/g, ' ').toUpperCase()}</strong>
                                  <Badge variant={
                                    rec.severity === 'high' ? 'destructive' :
                                    rec.severity === 'medium' ? 'default' :
                                    rec.severity === 'info' ? 'outline' : 'secondary'
                                  }>
                                    {rec.severity}
                                  </Badge>
                                </div>
                                <div>{rec.message}</div>
                                <div className="text-sm text-muted-foreground"><strong>Action:</strong> {rec.action}</div>
                              </div>
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};