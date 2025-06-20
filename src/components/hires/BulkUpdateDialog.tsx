import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { settingsService } from "@/services/settings-service";
import { licenseService } from "@/services/license-service";
import { activeDirectoryService } from "@/services/active-directory-service";
import { microsoftGraphService } from "@/services/microsoft-graph-service";
import { NewHire } from "@/types/types";
import { useToast } from "@/components/ui/use-toast";
import { getACLForDepartment } from "@/utils/aclMapping";
import { MultiEmailInput } from "@/components/ui/multi-email-input";

interface BulkUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updateData: Record<string, any>) => Promise<void>;
  selectedCount: number;
  onExcelReport?: () => void;
  selectedHires?: NewHire[];
}

export function BulkUpdateDialog({ 
  isOpen, 
  onClose, 
  onUpdate, 
  selectedCount, 
  onExcelReport,
  selectedHires 
}: BulkUpdateDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updateFields, setUpdateFields] = useState({
    field: "",
    value: "",
  });
  const [emailRecipients, setEmailRecipients] = useState<string[]>([]);
  const [ccRecipients, setCcRecipients] = useState<string[]>([]);
  const [bccRecipients, setBccRecipients] = useState<string[]>([]);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState<{ subject: string; body: string } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [includeAttachments, setIncludeAttachments] = useState(false);
  const { toast } = useToast();
  
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
  
  const accountStatuses = settings?.accountStatuses || ["Pending", "Active", "Inactive", "Suspended"];
  const laptopStatuses = ["Pending", "In Progress", "Ready", "Done"];
  const positionGrades = ["General Management", "Superintendent", "Supervisor", "Staff", "Non-Staff"];
  
  // Load default email recipient from Microsoft Graph settings
  const { data: graphSettings } = useQuery({
    queryKey: ['microsoftGraphSettings'],
    queryFn: settingsService.getMicrosoftGraphSettings,
    enabled: updateFields.field === "license_request_email"
  });

  // Set default recipients when settings are loaded
  useEffect(() => {
    if (graphSettings && updateFields.field === "license_request_email") {
      if (graphSettings.defaultToRecipients && emailRecipients.length === 0) {
        setEmailRecipients(graphSettings.defaultToRecipients);
      }
      if (graphSettings.defaultCcRecipients && ccRecipients.length === 0) {
        setCcRecipients(graphSettings.defaultCcRecipients);
      }
      if (graphSettings.defaultBccRecipients && bccRecipients.length === 0) {
        setBccRecipients(graphSettings.defaultBccRecipients);
      }
    }
  }, [graphSettings, updateFields.field, emailRecipients.length, ccRecipients.length, bccRecipients.length]);

  const handleEmailTemplatePreview = async () => {
    if (!selectedHires || selectedHires.length === 0) return;
    
    setIsLoadingPreview(true);
    try {
      const hiresForTemplate = selectedHires.map(hire => ({
        name: hire.name,
        department: hire.department,
        email: hire.email,
        title: hire.title,
        microsoft_365_license: hire.microsoft_365_license || 'Standard'
      }));
      
      const template = await microsoftGraphService.getEmailTemplate(hiresForTemplate);
      setEmailTemplate(template);
      setShowEmailPreview(true);
    } catch (error) {
      console.error('Error loading email preview:', error);
      toast({
        title: "Error",
        description: "Failed to load email template preview",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleLicenseRequestEmail = async () => {
    if (!selectedHires || selectedHires.length === 0 || emailRecipients.length === 0) return;
    
    setIsSubmitting(true);
    
    try {
      const hiresForEmail = selectedHires.map(hire => ({
        id: hire.id,
        name: hire.name,
        department: hire.department,
        email: hire.email,
        title: hire.title,
        microsoft_365_license: hire.microsoft_365_license || 'Standard',
        // Include SRF document details so attachments can be sent
        srf_document_path: hire.srf_document_path,
        srf_document_name: hire.srf_document_name
      }));
      
      const result = await microsoftGraphService.sendLicenseRequestEmail({
        recipients: emailRecipients,
        ccRecipients: ccRecipients.length > 0 ? ccRecipients : undefined,
        bccRecipients: bccRecipients.length > 0 ? bccRecipients : undefined,
        hires: hiresForEmail,
        includeAttachments
      });
      
      if (result.success) {
        const totalRecipients = emailRecipients.length + ccRecipients.length + bccRecipients.length;
        toast({
          title: "License Request Email Sent",
          description: `Successfully sent license request for ${selectedHires.length} users to ${totalRecipients} recipient(s)${includeAttachments ? ' with attachments' : ''}`,
        });
        onClose();
      } else {
        toast({
          title: "Email Send Failed",
          description: result.message || "Failed to send license request email",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending license request email:", error);
      toast({
        title: "Error",
        description: "Failed to send license request email",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleBulkADCreation = async () => {
    if (!selectedHires || selectedHires.length === 0) return;
    
    setIsSubmitting(true);
    
    try {
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];
      
      // Process each selected hire for AD account creation
      for (const hire of selectedHires) {
        try {
          // Use the shared ACL determination logic
          const aclGroup = getACLForDepartment(hire.department);
          
          console.log(`Creating AD account for ${hire.name} with department: ${hire.department}, ACL: ${aclGroup}`);
          
          // Use the correct createUser method with proper parameters
          await activeDirectoryService.createUser(hire.id, {
            username: hire.username || hire.email.split('@')[0],
            displayName: hire.name,
            firstName: hire.name.split(' ')[0] || hire.name,
            lastName: hire.name.split(' ').slice(1).join(' ') || hire.name,
            password: 'TempPass123!', // You may want to generate or get this from settings
            email: hire.email,
            title: hire.title || '',
            department: hire.department || '',
            ou: 'CN=Users,DC=mbma,DC=com', // Default OU - you may want to make this configurable
            acl: aclGroup, // Use the correct ACL mapping
            company: 'MBMA',
            office: '' // Default empty office value
          });
          successCount++;
        } catch (error) {
          errorCount++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`${hire.name}: ${errorMessage}`);
          console.error(`Error creating AD account for ${hire.name}:`, error);
        }
      }
      
      // Show results
      if (successCount > 0) {
        toast({
          title: "Bulk AD Account Creation",
          description: `Successfully created ${successCount} AD accounts${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
        });
      }
      
      if (errorCount > 0) {
        toast({
          title: "AD Account Creation Errors",
          description: `${errorCount} accounts failed to create. Check console for details.`,
          variant: "destructive",
        });
      }
      
      onClose();
    } catch (error) {
      console.error("Error in bulk AD creation:", error);
      toast({
        title: "Error",
        description: "Failed to process bulk AD account creation",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSubmit = async () => {
    if (!updateFields.field) return;
    
    // If Excel Report is selected, call the handler and close
    if (updateFields.field === "excel_report" && onExcelReport) {
      onExcelReport();
      onClose();
      return;
    }
    
    // If AD Account Creation is selected, handle it separately
    if (updateFields.field === "ad_account_creation") {
      await handleBulkADCreation();
      return;
    }
    
    // If License Request Email is selected, handle it separately
    if (updateFields.field === "license_request_email") {
      await handleLicenseRequestEmail();
      return;
    }
    
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
        case "position_grade":
          updateData = { position_grade: updateFields.value };
          break;
      }
      
      await onUpdate(updateData);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const renderValueInput = () => {
    if (!updateFields.field) return null;
    
    // If Excel Report is selected, no need for value input
    if (updateFields.field === "excel_report") {
      return (
        <p className="text-sm text-muted-foreground">
          This will generate an Excel report for license requests that you can download.
        </p>
      );
    }
    
    // If AD Account Creation is selected, show info about the operation
    if (updateFields.field === "ad_account_creation") {
      return (
        <div className="text-sm text-muted-foreground space-y-2">
          <p>This will create Active Directory accounts for all selected hires.</p>
          <p className="text-xs">Note: This operation may take some time depending on the number of selected hires.</p>
        </div>
      );
    }
    
    // If License Request Email is selected, show email configuration
    if (updateFields.field === "license_request_email") {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-recipients">To Recipients *</Label>
            <MultiEmailInput
              value={emailRecipients}
              onChange={setEmailRecipients}
              placeholder="Enter email addresses (press Enter, comma, or semicolon to add)"
            />
            <p className="text-xs text-muted-foreground">
              Primary recipients who will receive the license request (loaded from settings)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cc-recipients">CC Recipients (Optional)</Label>
            <MultiEmailInput
              value={ccRecipients}
              onChange={setCcRecipients}
              placeholder="Enter CC email addresses (optional)"
            />
            <p className="text-xs text-muted-foreground">
              Recipients who will receive a copy of the email (loaded from settings)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bcc-recipients">BCC Recipients (Optional)</Label>
            <MultiEmailInput
              value={bccRecipients}
              onChange={setBccRecipients}
              placeholder="Enter BCC email addresses (optional)"
            />
            <p className="text-xs text-muted-foreground">
              Recipients who will receive a blind copy (loaded from settings)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="include-attachments"
              checked={includeAttachments}
              onCheckedChange={setIncludeAttachments}
            />
            <Label htmlFor="include-attachments" className="text-sm">
              Include SRF documents as attachments (when available)
            </Label>
          </div>
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleEmailTemplatePreview}
              disabled={isLoadingPreview || !selectedHires || selectedHires.length === 0}
            >
              {isLoadingPreview ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview Email
                </>
              )}
            </Button>
          </div>
          
          {showEmailPreview && emailTemplate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Email Preview</CardTitle>
                <CardDescription>
                  This email will be sent to:{" "}
                  <strong>TO:</strong> {emailRecipients.join(", ")}
                  {ccRecipients.length > 0 && (
                    <><br /><strong>CC:</strong> {ccRecipients.join(", ")}</>
                  )}
                  {bccRecipients.length > 0 && (
                    <><br /><strong>BCC:</strong> {bccRecipients.join(", ")}</>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs font-medium">Subject:</Label>
                  <p className="text-sm bg-muted p-2 rounded">{emailTemplate.subject}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium">Body:</Label>
                  <div 
                    className="text-sm bg-muted p-3 rounded max-h-48 overflow-y-auto prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: emailTemplate.body }}
                    style={{
                      fontSize: '14px',
                      lineHeight: '1.4'
                    }}
                  />
                </div>
                {includeAttachments && (
                  <div>
                    <Label className="text-xs font-medium">Attachments:</Label>
                    <p className="text-sm text-muted-foreground">
                      SRF documents will be attached for employees who have uploaded them
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      );
    }
    
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
      
      case "position_grade":
        return (
          <Select 
            value={updateFields.value} 
            onValueChange={(value) => setUpdateFields({ ...updateFields, value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select position grade" />
            </SelectTrigger>
            <SelectContent>
              {positionGrades.map((grade) => (
                <SelectItem key={grade} value={grade}>
                  {grade}
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
              onValueChange={(value) => {
                setUpdateFields({ field: value, value: "" });
                setEmailRecipients([]);
                setCcRecipients([]);
                setBccRecipients([]);
                setShowEmailPreview(false);
                setEmailTemplate(null);
              }}
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
                <SelectItem value="position_grade">Position Grade</SelectItem>
                <SelectItem value="ad_account_creation">Create AD Accounts</SelectItem>
                <SelectItem value="license_request_email">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    License Request Email
                  </div>
                </SelectItem>
                <SelectItem value="excel_report">Excel Report</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {updateFields.field && (
            <div className="grid gap-2">
              <Label htmlFor="value">
                {updateFields.field === "ad_account_creation" ? "Operation Details" : 
                 updateFields.field === "license_request_email" ? "Email Configuration" : "New Value"}
              </Label>
              {renderValueInput()}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={
              (!updateFields.field) || 
              (updateFields.field === "license_request_email" && emailRecipients.length === 0) ||
              (updateFields.field !== "excel_report" && updateFields.field !== "ad_account_creation" && updateFields.field !== "license_request_email" && !updateFields.value) || 
              isSubmitting
            }
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {updateFields.field === "ad_account_creation" ? "Creating AD Accounts..." : 
                 updateFields.field === "license_request_email" ? "Sending Email..." : "Updating..."}
              </>
            ) : updateFields.field === "excel_report" ? (
              'Generate Report'
            ) : updateFields.field === "ad_account_creation" ? (
              'Create AD Accounts'
            ) : updateFields.field === "license_request_email" ? (
              'Send License Request'
            ) : (
              'Update Selected'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
