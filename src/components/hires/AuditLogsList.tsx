
import React from "react";
import { AuditLog } from "@/types/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, Info, MessageSquare, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { useAuditLogs } from "@/hooks/useAuditLogs";

interface AuditLogsListProps {
  hireId: string;
  refreshKey?: string; // Optional prop to trigger refresh when hire is updated
}

export function AuditLogsList({ hireId }: AuditLogsListProps) {
  const { toast } = useToast();
  const { 
    data: logs = [], 
    isLoading, 
    isRefetching, 
    refetch 
  } = useAuditLogs(hireId);

  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshing",
      description: "Updating audit logs..."
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "ERROR":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "WARNING":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "INFO":
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return "bg-green-100 text-green-800";
      case "ERROR":
        return "bg-red-100 text-red-800";
      case "WARNING":
        return "bg-amber-100 text-amber-800";
      case "INFO":
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading audit logs...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Audit Logs</CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh} 
          disabled={isRefetching}
          className="h-8 px-2 lg:px-3"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isRefetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>No audit logs available for this user</span>
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Performed By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                    <TableCell>{log.action_type}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {getStatusIcon(log.status)}
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(log.status)}`}>
                          {log.status}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{log.message}</TableCell>
                    <TableCell>{log.performed_by || "System"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
