
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Save } from "lucide-react";
import { toast } from "sonner";

export function AccountStatusSettings() {
  const [statuses, setStatuses] = useState<string[]>([
    "Pending", "Active", "Inactive", "Suspended"
  ]);
  const [newStatus, setNewStatus] = useState("");
  const [isEditing, setIsEditing] = useState(false);

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
    // In a real app, this would save to API
    toast.success("Account status options saved successfully");
    setIsEditing(false);
  };

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
            <Button onClick={handleSaveChanges}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </>
        ) : (
          <Button onClick={() => setIsEditing(true)}>Edit Status Options</Button>
        )}
      </CardFooter>
    </Card>
  );
}
