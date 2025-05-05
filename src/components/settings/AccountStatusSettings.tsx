
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { settingsService } from "@/services/settings-service";
import { useQuery, useMutation } from "@tanstack/react-query";

export function AccountStatusSettings() {
  const [statuses, setStatuses] = useState<string[]>([]);
  const [newStatus, setNewStatus] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  
  // Fetch settings from the server
  const { data, isLoading, error } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsService.getSettings
  });
  
  // Update statuses when data is loaded
  useEffect(() => {
    if (data?.accountStatuses) {
      setStatuses(data.accountStatuses);
    }
  }, [data]);
  
  // Save statuses mutation
  const saveStatusesMutation = useMutation({
    mutationFn: settingsService.updateAccountStatuses,
    onSuccess: () => {
      toast.success("Account status options saved successfully");
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error("Failed to save account statuses");
      console.error("Error saving account statuses:", error);
    }
  });

  const handleAddStatus = () => {
    if (!newStatus.trim()) return;
    
    if (statuses.includes(newStatus.trim())) {
      toast.error("This status already exists");
      return;
    }
    
    setStatuses([...statuses, newStatus.trim()]);
    setNewStatus("");
    toast.success("New status added");
  };

  const handleRemoveStatus = (status: string) => {
    setStatuses(statuses.filter(s => s !== status));
    toast.success(`"${status}" status removed`);
  };

  const handleSaveChanges = () => {
    saveStatusesMutation.mutate(statuses);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-6">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading settings...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-red-500">Error loading settings. Please try again later.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Creation Status</CardTitle>
        <CardDescription>
          Customize the available account status options for new hires.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {statuses.map(status => (
              <Badge key={status} variant="secondary" className="text-sm py-1 px-3">
                {status}
                {isEditing && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-4 w-4 ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                    onClick={() => handleRemoveStatus(status)}
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Remove</span>
                  </Button>
                )}
              </Badge>
            ))}
          </div>
          
          {isEditing && (
            <div className="flex gap-2">
              <Input 
                placeholder="Add new status..." 
                value={newStatus} 
                onChange={(e) => setNewStatus(e.target.value)}
                className="max-w-xs"
              />
              <Button 
                size="sm" 
                onClick={handleAddStatus}
                disabled={!newStatus.trim()}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        {isEditing ? (
          <>
            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveChanges} 
              disabled={saveStatusesMutation.isPending}
            >
              {saveStatusesMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </>
        ) : (
          <Button onClick={() => setIsEditing(true)}>Edit Status Options</Button>
        )}
      </CardFooter>
    </Card>
  );
}
