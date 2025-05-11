
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { settingsService } from "@/services/settings-service";
import { licenseService } from "@/services/license-service";

interface BulkUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updateData: Record<string, any>) => Promise<void>;
  selectedCount: number;
}

export function BulkUpdateDialog({ isOpen, onClose, onUpdate, selectedCount }: BulkUpdateDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updateFields, setUpdateFields] = useState({
    field: "",
    value: "",
  });
  
  // For account status options
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsService.getSettings
  });
  
  // For Microsoft 365 license options
  const { data: licenseTypes } = useQuery({
    queryKey: ['licenseTypes'],
    queryFn: licenseService.getLicenseTypes
  });
  
  const accountStatuses = settings?.accountStatuses || ['Pending', 'In Progress', 'Done'];
  const laptopStatuses = ['Not Ready', 'Ready', 'Delivered'];
  
  const handleSubmit = async () => {
    if (!updateFields.field) return;
    
    setIsSubmitting(true);
    
    try {
      let updateData: Record<string, any> = {};
      
      // Build the update data based on the selected field
      switch (updateFields.field) {
        case "account_creation_status":
          updateData = { account_creation_status: updateFields.value };
          break;
        case "laptop_ready":
          updateData = { laptop_ready: updateFields.value };
          break;
        case "license_assigned":
          updateData = { license_assigned: updateFields.value === "true" };
          break;
        case "status_srf":
          updateData = { status_srf: updateFields.value === "true" };
          break;
        case "microsoft_365_license":
          updateData = { microsoft_365_license: updateFields.value };
          break;
      }
      
      await onUpdate(updateData);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Render appropriate input based on field type
  const renderValueInput = () => {
    if (!updateFields.field) return null;
    
    switch (updateFields.field) {
      case "account_creation_status":
        return (
          <Select 
            value={updateFields.value} 
            onValueChange={(value) => setUpdateFields({ ...updateFields, value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {accountStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case "laptop_ready":
        return (
          <Select 
            value={updateFields.value} 
            onValueChange={(value) => setUpdateFields({ ...updateFields, value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {laptopStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case "microsoft_365_license":
        return (
          <Select 
            value={updateFields.value} 
            onValueChange={(value) => setUpdateFields({ ...updateFields, value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select license type" />
            </SelectTrigger>
            <SelectContent>
              {(licenseTypes || []).map((licenseType) => (
                <SelectItem key={licenseType.id} value={licenseType.name}>
                  {licenseType.name}
                </SelectItem>
              ))}
              <SelectItem value="None">None</SelectItem>
            </SelectContent>
          </Select>
        );
      
      case "license_assigned":
      case "status_srf":
        return (
          <div className="flex items-center space-x-2">
            <Switch 
              id="value-switch"
              checked={updateFields.value === "true"}
              onCheckedChange={(checked) => 
                setUpdateFields({ ...updateFields, value: checked ? "true" : "false" })
              }
            />
            <Label htmlFor="value-switch">
              {updateFields.value === "true" ? "Yes" : "No"}
            </Label>
          </div>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Update {selectedCount} Hires</DialogTitle>
          <DialogDescription>
            Update the selected field for all selected hires at once.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="field">Field to Update</Label>
            <Select 
              value={updateFields.field} 
              onValueChange={(value) => setUpdateFields({ field: value, value: "" })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select field to update" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="account_creation_status">Account Creation Status</SelectItem>
                <SelectItem value="laptop_ready">Laptop Status</SelectItem>
                <SelectItem value="license_assigned">License Assigned</SelectItem>
                <SelectItem value="status_srf">SRF Status</SelectItem>
                <SelectItem value="microsoft_365_license">Microsoft 365 License</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {updateFields.field && (
            <div className="grid gap-2">
              <Label htmlFor="value">New Value</Label>
              {renderValueInput()}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!updateFields.field || !updateFields.value || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Selected'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
