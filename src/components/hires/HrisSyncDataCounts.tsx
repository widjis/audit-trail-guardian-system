import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Database, Users, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/services/api-client';

interface DataCounts {
  database: {
    totalEmployees: number;
    nonStaffEmployees: number;
    staffEmployees: number;
    processedBySync: number;
    gradeBreakdown: Array<{ grade_interval: string; count: number }>;
  };
  activeDirectory: {
    totalUsers: number;
    usersWithEmployeeID: number;
    usersWithoutEmployeeID: number;
  };
  matching: {
    exactMatches: number;
    potentialFuzzyMatches: number;
  };
}

export const HrisSyncDataCounts: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [dataCounts, setDataCounts] = useState<DataCounts | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDataCounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/hris-sync/debug-counts');
      setDataCounts(response.data.data);
    } catch (error: any) {
      console.error('Failed to fetch data counts:', error);
      const errorMessage = error.response?.data?.error || 'Failed to fetch data counts';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataCounts();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            HRIS Sync Data Analysis
          </CardTitle>
          <CardDescription>
            Analyze data counts and matching statistics between HRIS database and Active Directory
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchDataCounts} disabled={loading} className="mb-4">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh Data
          </Button>

          {error && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {dataCounts && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Database Statistics */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    HRIS Database
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Employees:</span>
                    <Badge variant="outline">{dataCounts.database.totalEmployees}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Staff Employees:</span>
                    <Badge variant="default">{dataCounts.database.staffEmployees}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Non-Staff:</span>
                    <Badge variant="secondary">{dataCounts.database.nonStaffEmployees}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Processed by Sync:</span>
                    <Badge variant="default">{dataCounts.database.processedBySync}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Active Directory Statistics */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Active Directory
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Users:</span>
                    <Badge variant="outline">{dataCounts.activeDirectory.totalUsers}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">With Employee ID:</span>
                    <Badge variant="default">{dataCounts.activeDirectory.usersWithEmployeeID}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Without Employee ID:</span>
                    <Badge variant="secondary">{dataCounts.activeDirectory.usersWithoutEmployeeID}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Matching Statistics */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Matching Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Exact Matches:</span>
                    <Badge variant="default">{dataCounts.matching.exactMatches}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Potential Fuzzy:</span>
                    <Badge variant="secondary">{dataCounts.matching.potentialFuzzyMatches}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Unmatched:</span>
                    <Badge variant="destructive">
                      {dataCounts.database.processedBySync - dataCounts.matching.exactMatches - dataCounts.matching.potentialFuzzyMatches}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Grade Breakdown */}
              <Card className="md:col-span-2 lg:col-span-3">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Grade Interval Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {dataCounts.database.gradeBreakdown.map((grade, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                        <span className="text-sm font-medium truncate mr-2">{grade.grade_interval || 'NULL'}</span>
                        <Badge variant={grade.grade_interval === 'Non Staff' ? 'secondary' : 'default'}>
                          {grade.count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Analysis Summary */}
              <Card className="md:col-span-2 lg:col-span-3">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Analysis Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {dataCounts.database.processedBySync < dataCounts.database.staffEmployees && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Data Mismatch:</strong> Only {dataCounts.database.processedBySync} out of {dataCounts.database.staffEmployees} staff employees are being processed by sync. 
                          This could indicate missing or invalid employee names.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {dataCounts.matching.exactMatches < dataCounts.database.processedBySync / 2 && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Low Match Rate:</strong> Only {dataCounts.matching.exactMatches} exact matches found out of {dataCounts.database.processedBySync} employees. 
                          Many employees may not have Employee IDs set in Active Directory.
                        </AlertDescription>
                      </Alert>
                    )}

                    {dataCounts.activeDirectory.usersWithoutEmployeeID > dataCounts.activeDirectory.usersWithEmployeeID && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Missing Employee IDs:</strong> {dataCounts.activeDirectory.usersWithoutEmployeeID} AD users don't have Employee IDs set, 
                          which prevents exact matching.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};