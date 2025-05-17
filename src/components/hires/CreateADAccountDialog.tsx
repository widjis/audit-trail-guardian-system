
import { useState } from "react";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { NewHire } from "@/types/types";
import { activeDirectoryService } from "@/services/active-directory-service";
import { Loader2, CheckCircle2, Copy } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

interface CreateADAccountDialogProps {
  hire: NewHire;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateADAccountDialog({ hire, onClose, onSuccess }: CreateADAccountDialogProps) {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    details?: any;
    warning?: string;
  } | null>(null);

  // Generate AD user data from hire details
  const generateADUserData = () => {
    const nameParts = hire.name?.split(' ') || [];
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    const username = hire.username || hire.email?.split('@')[0] || '';
    
    let department = hire.department || '';
    let ou = `OU=${department},OU=Merdeka Tsingshan Indonesia,DC=mbma,DC=com`;
    
    // Special handling for Copper Cathode Plant
    if (department === "Copper Cathode Plant") {
      ou = `OU=CCP,OU=Merdeka Tsingshan Indonesia,DC=mbma,DC=com`;
    }
    
    // Determine ACL for the user
    let acl = '';
    if (department === "Occupational Health and Safety" || department === "Environment") {
      acl = "ACL MTI OHSE";
    } else {
      acl = `ACL MTI ${department.replace(' Plant', '')}`;
    }
    
    return {
      username: username.substring(0, 20), // Ensure username is 20 chars max
      displayName: `${hire.name} [MTI]`,
      firstName,
      lastName,
      password: hire.initial_password || '',
      email: hire.email || '',
      title: hire.job_title || '',
      department,
      ou,
      acl,
      company: "PT. Merdeka Tsingshan Indonesia",
      office: "Morowali"
    };
  };

  const handleCreateADAccount = async () => {
    if (!hire.id) {
      toast({
        title: "Error",
        description: "Unable to create AD account. Missing hire ID.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    setResult(null);
    
    try {
      const userData = generateADUserData();
      const result = await activeDirectoryService.createUser(hire.id, userData);
      
      setResult(result);
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Active Directory account created successfully",
        });
        
        // If onSuccess callback is provided, call it
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to create Active Directory account",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating AD account:", error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "An unknown error occurred"
      });
      
      toast({
        title: "Error",
        description: "Failed to create Active Directory account",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      description: "Copied to clipboard",
    });
  };

  const adUserData = generateADUserData();

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create Active Directory Account</DialogTitle>
      </DialogHeader>
      
      <div className="space-y-4 my-4">
        {result ? (
          <div className="space-y-4">
            {result.success ? (
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Account created successfully</span>
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertDescription>
                  {result.message || "Failed to create account"}
                </AlertDescription>
              </Alert>
            )}
            
            {result.warning && (
              <Alert className="bg-amber-50 text-amber-800 border-amber-200">
                <AlertDescription>{result.warning}</AlertDescription>
              </Alert>
            )}
            
            {result.success && result.details && (
              <Card>
                <CardContent className="pt-6 space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Account Name:</span>
                    <div className="flex items-center gap-1">
                      <span>{result.details.samAccountName}</span>
                      <button 
                        onClick={() => copyToClipboard(result.details.samAccountName)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="font-medium">Display Name:</span>
                    <span>{result.details.displayName}</span>
                  </div>
                  
                  <div>
                    <span className="font-medium">Distinguished Name:</span>
                    <div className="mt-1 text-sm font-mono bg-gray-50 p-2 rounded break-all">
                      {result.details.distinguishedName}
                    </div>
                  </div>
                  
                  <div>
                    <span className="font-medium">Groups:</span>
                    <ul className="list-disc list-inside ml-2 mt-1">
                      {result.details.groups.map((group: string) => (
                        <li key={group}>{group}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">The following account will be created:</h3>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                <div className="font-medium">Username:</div>
                <div>{adUserData.username}</div>
                
                <div className="font-medium">Display Name:</div>
                <div>{adUserData.displayName}</div>
                
                <div className="font-medium">First Name:</div>
                <div>{adUserData.firstName}</div>
                
                <div className="font-medium">Last Name:</div>
                <div>{adUserData.lastName}</div>
                
                <div className="font-medium">Email:</div>
                <div>{adUserData.email}</div>
                
                <div className="font-medium">Title:</div>
                <div>{adUserData.title}</div>
                
                <div className="font-medium">Department:</div>
                <div>{adUserData.department}</div>
                
                <div className="font-medium">Company:</div>
                <div>{adUserData.company}</div>
                
                <div className="font-medium">Office:</div>
                <div>{adUserData.office}</div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Organizational Unit:</h3>
              <div className="text-sm font-mono bg-gray-50 p-2 rounded break-all">
                {adUserData.ou}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Security Groups:</h3>
              <ul className="list-disc list-inside ml-2 text-sm">
                <li>{adUserData.acl}</li>
                <li>VPN-USERS</li>
              </ul>
            </div>
            
            <Alert>
              <AlertDescription>
                This will create an active directory account for {hire.name} with username <strong>{adUserData.username}</strong> and 
                update their account status to <strong>Active</strong>.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
      
      <DialogFooter>
        {!result?.success && (
          <Button 
            variant="outline" 
            onClick={onClose}
            className="mr-2"
          >
            Cancel
          </Button>
        )}
        
        {result?.success ? (
          <Button onClick={onClose}>Close</Button>
        ) : (
          <Button 
            onClick={handleCreateADAccount}
            disabled={isCreating}
          >
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isCreating ? "Creating..." : "Create AD Account"}
          </Button>
        )}
      </DialogFooter>
    </DialogContent>
  );
}
