
import React, { useEffect, useState } from "react";
import { AuditLog } from "@/types/types";
import { auditApi } from "@/services/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, Info, MessageSquare } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface AuditLogsListProps {
  hireId: string;
}

export function AuditLogsList({ hireId }: AuditLogsListProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        const data = await auditApi.getLogsForHire(hireId);
        setLogs(data);
      } catch (error) {
        console.error("Error fetching audit logs:", error);
        toast({
          title: "Error",
          description: "Failed to fetch audit logs",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (hireId) {
      fetchLogs();
    }
  }, [hireId, toast]);

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

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>No audit logs available for this user</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Logs</CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
