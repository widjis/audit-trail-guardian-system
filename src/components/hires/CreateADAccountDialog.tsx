import { useState } from "react";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { NewHire } from "@/types/types";
import { activeDirectoryService } from "@/services/active-directory-service";
import { Loader2, CheckCircle2, Copy, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";

interface CreateADAccountDialogProps {
  hire: NewHire;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateADAccountDialog({ hire, onClose, onSuccess }: CreateADAccountDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [manualPassword, setManualPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    details?: any;
    warning?: string;
    error?: string;
  } | null>(null);

  // Generate AD user data from hire details
  const generateADUserData = () => {
    const nameParts = hire.name?.split(' ') || [];
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    const username = hire.username || hire.email?.split('@')[0] || '';
    
    // Get password from hire record or manual input
    const password = manualPassword || hire.password || '';
    
    let department = hire.department || '';
    let ou = department 
      ? `OU=${department},OU=Merdeka Tsingshan Indonesia,DC=mbma,DC=com`
      : 'OU=Merdeka Tsingshan Indonesia,DC=mbma,DC=com';
    
    // Special handling for Copper Cathode Plant
    if (department === "Copper Cathode Plant") {
      ou = `OU=CCP,OU=Merdeka Tsingshan Indonesia,DC=mbma,DC=com`;
    }
    
    // Determine ACL for the user
    let acl = '';
    if (department === "Occupational Health and Safety" || department === "Environment") {
      acl = "ACL MTI OHSE";
    } else if (department) {
      acl = `ACL MTI ${department.replace(' Plant', '')}`;
    } else {
      acl = "ACL MTI Users";
    }
    
    return {
      username: username.substring(0, 20), // Ensure username is 20 chars max
      displayName: `${hire.name || 'New User'} [MTI]`,
      firstName,
      lastName,
      password,
      email: hire.email || '',
      title: hire.title || hire.job_title || '',
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
      console.log("Creating AD account with password length:", userData.password?.length || 0);
      console.log("Current hire status before AD creation:", hire.account_creation_status);

      // Check if password is provided or needs to be manually entered
      if (!userData.password) {
        setResult({
          success: false,
          error: "Missing password for user account"
        });
        
        toast({
          title: "Error",
          description: "A password is required to create an AD account.",
          variant: "destructive",
        });
        setIsCreating(false);
        return;
      }
      
      // Validate required fields
      if (!userData.username || !userData.displayName) {
        const missingFields = [];
        if (!userData.username) missingFields.push('username');
        if (!userData.displayName) missingFields.push('display name');
        
        setResult({
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`
        });
        
        toast({
          title: "Error",
          description: `Cannot create AD account. Missing: ${missingFields.join(', ')}`,
          variant: "destructive",
        });
        setIsCreating(false);
        return;
      }
      
      const result = await activeDirectoryService.createUser(hire.id, userData);
      
      setResult(result);
      
      if (result.success) {
        console.log("AD account created successfully, invalidating query cache and calling onSuccess callback");
        
        // Invalidate the query cache to refresh the hire data across all components
        queryClient.invalidateQueries({ queryKey: ['hire', hire.id] });
        
        toast({
          title: "Success",
          description: "Active Directory account created successfully and status updated to Active",
        });
        
        // If onSuccess callback is provided, call it to refresh the hire data
        if (onSuccess) {
          console.log("Calling onSuccess callback to refresh hire data");
          onSuccess();
        }
      } else {
        console.error("AD account creation failed:", result.error || result.message);
        toast({
          title: "Error",
          description: result.message || result.error || "Failed to create Active Directory account",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating AD account:", error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "An unknown error occurred"
      });
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create Active Directory account",
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

  // Generate user data once for rendering
  const adUserData = generateADUserData();
  
  // Check for missing password (null, undefined, or empty string)
  const isMissingPassword = !adUserData.password;

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
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {result.error || result.message || "Failed to create account"}
                </AlertDescription>
              </Alert>
            )}
            
            {result.warning && (
              <Alert className="bg-amber-50 text-amber-800 border-amber-200">
                <AlertTriangle className="h-4 w-4" />
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
            {adUserData ? (
              <>
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

                    {hire.password && (
                      <>
                        <div className="font-medium">Initial Password:</div>
                        <div className="flex items-center">
                          <span>{showPassword ? hire.password : '•'.repeat(hire.password?.length || 8)}</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setShowPassword(!showPassword)}
                            className="ml-2 p-0 h-6 w-6"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </>
                    )}
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
                
                {/* Password field - only show if password is missing */}
                {isMissingPassword && (
                  <div className="space-y-2">
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Missing Password</AlertTitle>
                      <AlertDescription>
                        No password is set for this user. Please provide a password below.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-1">
                      <Label htmlFor="manual-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="manual-password"
                          type={showPassword ? "text" : "password"}
                          value={manualPassword}
                          onChange={(e) => setManualPassword(e.target.value)}
                          placeholder="Enter password for AD account"
                          className="pr-10"
                        />
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="sm" 
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                <Alert>
                  <AlertDescription>
                    This will create an active directory account for {hire.name} with username <strong>{adUserData.username}</strong> and 
                    update their account status to <strong>Active</strong>.
                  </AlertDescription>
                </Alert>
              </>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Missing Information</AlertTitle>
                <AlertDescription>
                  Unable to create AD account. Required user information is missing.
                </AlertDescription>
              </Alert>
            )}
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
            disabled={isCreating || !adUserData || (isMissingPassword && !manualPassword)}
          >
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isCreating ? "Creating..." : "Create AD Account"}
          </Button>
        )}
      </DialogFooter>
    </DialogContent>
  );
}
