
import { useState } from "react";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { distributionListService } from "@/services/distribution-list-service";
import { NewHire } from "@/types/types";

interface SyncDistributionListDialogProps {
  hire: NewHire;
  onClose: () => void;
  onSuccess?: () => void;
}

const SYNC_STATUS_LABELS: Record<NonNullable<NewHire["distribution_list_sync_status"]>, string> = {
  Synced: "All distribution lists successfully synced",
  Partial: "Some lists failed to sync",
  Failed: "All sync attempts failed",
};

export function SyncDistributionListDialog({ 
  hire, 
  onClose, 
  onSuccess 
}: SyncDistributionListDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [syncResults, setSyncResults] = useState<any>(null);
  const { toast } = useToast();

  // Get mailing lists from hire data
  const mailingLists = Array.isArray(hire.mailing_list) 
    ? hire.mailing_list 
    : (typeof hire.mailing_list === 'string' && hire.mailing_list 
        ? hire.mailing_list.split(',').map(item => item.trim()).filter(Boolean)
        : []);

  // Status info
  const status = hire.distribution_list_sync_status ?? null;
  const lastSync = hire.distribution_list_sync_date 
    ? new Date(hire.distribution_list_sync_date).toLocaleString() 
    : null;

  const handleSync = async () => {
    if (!hire.id || mailingLists.length === 0) {
      toast({
        title: "Error",
        description: "No mailing lists to sync or hire ID missing",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      const result = await distributionListService.syncUserToDistributionLists(hire.id, mailingLists);
      setSyncResults(result);
      
      if (result.success) {
        toast({
          title: "Sync Completed",
          description: result.message,
        });
        onSuccess?.();
      } else {
        toast({
          title: "Sync Failed",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error syncing to distribution lists:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Sync to Office 365 Distribution Lists</DialogTitle>
      </DialogHeader>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            User: <strong>{hire.name}</strong> ({hire.email})
          </p>
          <p className="text-sm text-muted-foreground">
            The following mailing lists will be synced to Office 365 distribution groups:
          </p>
        </div>
        {/* Status Indicator Row */}
        <div className="flex items-center text-xs mb-2 gap-4">
          {status && status !== 'Failed' && (
            <Badge variant={status === "Synced" ? "default" : "outline"} className={status === "Synced" ? "bg-green-500 text-white" : "bg-yellow-500 text-black"}>
              {status === "Synced" && <CheckCircle className="w-3 h-3 mr-1 inline-block" />}
              {status === "Partial" && <Clock className="w-3 h-3 mr-1 inline-block" />}
              {SYNC_STATUS_LABELS[status]}
            </Badge>
          )}
          {status === "Failed" && (
            <Badge variant="outline" className="bg-red-500 text-white">
              <XCircle className="w-3 h-3 mr-1 inline-block" />
              {SYNC_STATUS_LABELS[status]}
            </Badge>
          )}
          {status === null && (
            <Badge variant="outline" className="text-muted-foreground">
              Not yet synced
            </Badge>
          )}
          {lastSync && (
            <span className="text-sm text-muted-foreground ml-2 italic">
              Last Synced: {lastSync}
            </span>
          )}
        </div>

        {/* Mailing Lists Display */}
        <div className="space-y-2">
          {mailingLists.length > 0 ? (
            mailingLists.map((list, index) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded">
                <span className="text-sm">{list}</span>
                {syncResults && (
                  <div className="flex items-center gap-2">
                    {syncResults.results?.find((r: any) => r.distributionGroup === list) ? (
                      <Badge variant="outline" className="text-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Synced
                      </Badge>
                    ) : syncResults.errors?.find((e: any) => e.distributionGroup === list) ? (
                      <Badge variant="outline" className="text-red-600">
                        <XCircle className="w-3 h-3 mr-1" />
                        Failed
                      </Badge>
                    ) : null}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p>No mailing lists assigned to this user</p>
            </div>
          )}
        </div>

        {/* Sync Results Feedback */}
        {syncResults && (
          <div className="bg-muted p-3 rounded">
            <h4 className="font-medium mb-2">Sync Results</h4>
            <p className="text-sm text-muted-foreground">{syncResults.message}</p>
            {syncResults.errors && syncResults.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-red-600 mb-1">Errors:</p>
                {syncResults.errors.map((error: any, index: number) => (
                  <p key={index} className="text-xs text-red-600">
                    {error.distributionGroup}: {error.error}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {/* Sync Button Only available if not fully synced */}
        {!syncResults && (status === null || status === "Failed" || status === "Partial") && mailingLists.length > 0 && (
          <Button onClick={handleSync} disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {status === "Partial" ? "Re-sync to O365" : "Sync to O365"}
          </Button>
        )}
      </DialogFooter>
    </DialogContent>
  );
}
