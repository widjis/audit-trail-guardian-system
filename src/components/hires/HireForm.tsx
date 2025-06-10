import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hiresApi } from "@/services/api";
import { NewHire } from "@/types/types";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Eye, EyeOff, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsService } from "@/services/settings-service";
import logger from "@/utils/logger";
import { licenseService } from "@/services/license-service";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MultiSelectMailingList } from "./MultiSelectMailingList";
import { ADUserLookup } from "./ADUserLookup";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// Type definition for Active Directory account details
interface ADAccountDetails {
  displayName: string;
  firstName: string;
  lastName: string;
  ou: string;
  company: string;
  office: string;
  acl: string;
}

// Define the prop type for the component
interface HireFormProps {
  currentUser?: { 
    id: string;
    username: string;
    role: string;
  } | null;
}

const emptyHire: Omit<NewHire, "id" | "created_at" | "updated_at"> = {
  name: "",
  title: "",
  department: "",
  email: "",
  direct_report: "",
  phone_number: "",
  mailing_list: [],  // Update this to be an array instead of a string
  remarks: "",
  account_creation_status: "Pending",
  license_assigned: false,
  status_srf: false,
  username: "",
  password: "",
  on_site_date: new Date().toISOString().split("T")[0],
  microsoft_365_license: "None",
  laptop_ready: "Pending",
  note: "",
  ict_support_pic: "",
};

export function HireForm({ currentUser }: HireFormProps) {
  const { id } = useParams<{ id: string }>();
  const isNewHire = id === "new";
  const [hire, setHire] = useState<Omit<NewHire, "id" | "created_at" | "updated_at">>(emptyHire);
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailManuallyEdited, setIsEmailManuallyEdited] = useState(false);
  const [isUsernameManuallyEdited, setIsUsernameManuallyEdited] = useState(false);
  const [isPasswordManuallyEdited, setIsPasswordManuallyEdited] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showADDetails, setShowADDetails] = useState(false);
  const [showEmptyMailingListDialog, setShowEmptyMailingListDialog] = useState(false);
  const [adAccountDetails, setADAccountDetails] = useState<ADAccountDetails>({
    displayName: "",
    firstName: "",
    lastName: "",
    ou: "OU=Merdeka Tsingshan Indonesia,DC=mbma,DC=com",
    company: "PT. Merdeka Tsingshan Indonesia",
    office: "Morowali",
    acl: ""
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  logger.ui.debug("HireForm", "Component rendered with id:", id, "isNewHire:", isNewHire);
  
  // Query to get hire details with proper caching - using the same key as HireDetail
  const { 
    data: hireData,
    isLoading: isFetching,
    error: fetchError
  } = useQuery({
    queryKey: ['hire', id],
    queryFn: async () => {
      if (!id || id === "new") return null;
      logger.ui.info("HireForm", "Fetching hire details with React Query for ID:", id);
      const data = await hiresApi.getOne(id);
      return data;
    },
    enabled: !!id && id !== "new",
    staleTime: 10000, // 10 seconds before refetching
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  // Query to get settings data (departments, account statuses, etc.)
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsService.getSettings,
  });

  // Move the license types query inside the component
  const { data: licenseTypes } = useQuery({
    queryKey: ['licenseTypes'],
    queryFn: licenseService.getLicenseTypes,
  });

  // Effect to update hire state when hireData changes
  useEffect(() => {
    if (hireData && !isNewHire) {
      logger.ui.debug("HireForm", "Updating hire state with fetched data:", hireData);
      
      // Filter out id, created_at, and updated_at
      const { id, created_at, updated_at, ...hireFormData } = hireData;
      
      // Format on_site_date if it exists
      if (hireFormData.on_site_date) {
        // Convert the date to YYYY-MM-DD format
        const date = new Date(hireFormData.on_site_date);
        hireFormData.on_site_date = date.toISOString().split('T')[0];
      }
      
      setHire(hireFormData);
      
      // Update AD account details
      updateADAccountDetails(hireFormData.name, hireFormData.department);
      
      // Set the current user's username as ICT Support PIC if it's empty
      if (!hireFormData.ict_support_pic && currentUser?.username) {
        setHire(prev => ({
          ...prev,
          ict_support_pic: currentUser.username
        }));
        console.log("Set missing ICT Support PIC to:", currentUser.username);
      }
    }
  }, [hireData, isNewHire, currentUser]);

  useEffect(() => {
    logger.ui.debug("HireForm", "useEffect triggered for id:", id);
    if (isNewHire) {
      logger.ui.info("HireForm", "Creating new hire, using empty form");
      setHire(emptyHire);
      setIsEmailManuallyEdited(false);
      setIsUsernameManuallyEdited(false);
      setIsPasswordManuallyEdited(false);
    }
  }, [id, isNewHire]);

  // Effect to update AD account details when name or department changes
  useEffect(() => {
    if (hire.name || hire.department) {
      updateADAccountDetails(hire.name, hire.department);
    }
  }, [hire.name, hire.department]);

  // Set ICT Support PIC when creating a new hire
  useEffect(() => {
    if (isNewHire && currentUser?.username) {
      setHire(prev => ({
        ...prev,
        ict_support_pic: currentUser.username
      }));
      console.log("Set initial ICT Support PIC to:", currentUser.username);
    }
  }, [isNewHire, currentUser]);

  // Function to update AD account details
  const updateADAccountDetails = (name: string, department: string) => {
    if (!name) return;
    
    // Split name into first and last name
    const nameParts = name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    
    // Generate display name
    const displayName = `${name} [MTI]`;
    
    // Generate OU path
    let ou = `OU=${department},OU=Merdeka Tsingshan Indonesia,DC=mbma,DC=com`;
    
    // Special case for Copper Cathode Plant
    if (department === "Copper Cathode Plant") {
      ou = `OU=CCP,OU=Merdeka Tsingshan Indonesia,DC=mbma,DC=com`;
    }
    
    // Generate ACL group
    let acl = "";
    if (department === "Occupational Health and Safety" || department === "Environment") {
      acl = "ACL MTI OHSE";
    } else if (department === "Copper Cathode Plant") {
      acl = "ACL MTI Copper Cathode";
    } else if (department) {
      // Remove "Plant" from department name if it exists
      acl = `ACL MTI ${department.replace(' Plant', '')}`;
    }
    
    // Update state
    setADAccountDetails({
      displayName,
      firstName,
      lastName,
      ou,
      company: "PT. Merdeka Tsingshan Indonesia",
      office: "Morowali",
      acl
    });
  };
  
  // Helper function to generate email from name
  const generateEmailFromName = (fullName: string) => {
    try {
      // Split the name and handle various formats
      const nameParts = fullName.trim().split(/\s+/);
      
      if (nameParts.length === 0) return "";
      
      let firstName = nameParts[0].toLowerCase();
      
      // For last name, use the last part of the name
      // If there's only one name (single word), use that for the whole email
      let emailPart = '';
      
      if (nameParts.length === 1) {
        // Single word name, use it as-is
        emailPart = firstName;
      } else {
        // Multiple word name, use firstname.lastname format
        let lastName = nameParts[nameParts.length - 1].toLowerCase();
        // Clean up the names - remove special characters and spaces
        lastName = lastName.replace(/[^a-z0-9]/g, "");
        emailPart = `${firstName}.${lastName}`;
      }
      
      // Clean up first name for single-word case
      firstName = firstName.replace(/[^a-z0-9]/g, "");
      
      if (!firstName) return "";
      
      return `${emailPart}@merdekabattery.com`;
    } catch (error) {
      logger.ui.error("HireForm", "Error generating email:", error);
      return "";
    }
  };
  
  // Helper function to extract username from email (without domain)
  const generateUsernameFromEmail = (email: string) => {
    if (!email) return "";
    
    const atIndex = email.indexOf('@');
    if (atIndex === -1) return email.substring(0, 20); // If there's no @, return the whole string up to 20 chars
    
    // Limit username to 20 characters
    return email.substring(0, Math.min(atIndex, 20));
  };
  
  // Helper function to generate password from first name
  const generatePasswordFromName = (fullName: string) => {
    try {
      if (!fullName) return "";
      
      // Get the first name
      const firstName = fullName.trim().split(/\s+/)[0];
      if (!firstName) return "";
      
      // Apply the password generation rules
      const modifiedKey = firstName
        .replace(/a/gi, '4')
        .replace(/i/gi, '1')
        .replace(/e/gi, '3')
        .replace(/o/gi, '0')
        .replace(/u/gi, '00');
      
      // Remove any spaces
      const processedKey = modifiedKey.replace(/\s/g, '');
      
      // Add the suffix
      return `${processedKey}#Mb23`;
    } catch (error) {
      logger.ui.error("HireForm", "Error generating password:", error);
      return "";
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    logger.ui.debug("HireForm", `Input changed: ${name} = ${value}`);
    
    // Update the state with the new value
    setHire((prev) => ({ ...prev, [name]: value }));
    
    // If name field is being updated
    if (name === "name") {
      if (value) {
        // Generate email if not manually edited
        if (!isEmailManuallyEdited) {
          const generatedEmail = generateEmailFromName(value);
          
          if (generatedEmail) {
            logger.ui.debug("HireForm", `Generated email: ${generatedEmail}`);
            setHire((prev) => ({ ...prev, email: generatedEmail }));
            
            // Generate username if not manually edited
            if (!isUsernameManuallyEdited) {
              const generatedUsername = generateUsernameFromEmail(generatedEmail);
              logger.ui.debug("HireForm", `Generated username: ${generatedUsername}`);
              setHire((prev) => ({ ...prev, username: generatedUsername }));
            }
          }
        }
        
        // Generate password if not manually edited
        if (!isPasswordManuallyEdited) {
          const generatedPassword = generatePasswordFromName(value);
          logger.ui.debug("HireForm", `Generated password: ${generatedPassword}`);
          setHire((prev) => ({ ...prev, password: generatedPassword }));
        }
      } else {
        // If name is cleared, clear other fields if they're not manually edited
        if (!isEmailManuallyEdited) {
          setHire((prev) => ({ ...prev, email: "" }));
        }
        
        if (!isUsernameManuallyEdited) {
          setHire((prev) => ({ ...prev, username: "" }));
        }
        
        if (!isPasswordManuallyEdited) {
          setHire((prev) => ({ ...prev, password: "" }));
        }
      }
    }
    
    // Track manually edited fields
    if (name === "email") {
      setIsEmailManuallyEdited(true);
    } else if (name === "username") {
      setIsUsernameManuallyEdited(true);
    } else if (name === "password") {
      setIsPasswordManuallyEdited(true);
    }
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    logger.ui.debug("HireForm", `Switch changed: ${name} = ${checked}`);
    setHire((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSelectChange = (name: string, value: string) => {
    logger.ui.debug("HireForm", `Select changed: ${name} = ${value}`);
    setHire((prev) => ({ ...prev, [name]: value }));
  };
  
  const copyToClipboard = (text: string, itemName: string) => {
    if (!text) return;
    
    try {
      // Try the modern Clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
          .then(() => {
            toast({
              title: `${itemName} copied`,
              description: `${itemName} has been copied to clipboard`,
            });
          })
          .catch(err => {
            logger.ui.error("HireForm", `Error copying ${itemName} with Clipboard API:`, err);
            // Fallback to the execCommand method
            fallbackCopyTextToClipboard(text, itemName);
          });
      } else {
        // Use fallback method if Clipboard API not available
        fallbackCopyTextToClipboard(text, itemName);
      }
    } catch (error) {
      logger.ui.error("HireForm", `Copy ${itemName} to clipboard error:`, error);
      toast({
        title: "Copy failed",
        description: `Could not copy ${itemName} to clipboard`,
        variant: "destructive",
      });
    }
  };
  
  const copyPasswordToClipboard = () => {
    copyToClipboard(hire.password, "Password");
  };

  // Fallback method for copying text using document.execCommand
  const fallbackCopyTextToClipboard = (text: string, itemName: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      
      // Make the textarea out of viewport
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        toast({
          title: `${itemName} copied`,
          description: `${itemName} has been copied to clipboard`,
        });
      } else {
        throw new Error("Copy command was unsuccessful");
      }
    } catch (err) {
      logger.ui.error("HireForm", `Fallback copy ${itemName} error:`, err);
      toast({
        title: "Copy failed",
        description: `Could not copy ${itemName} to clipboard`,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if mailing list is empty and show warning dialog
    if (!hire.mailing_list || hire.mailing_list.length === 0) {
      setShowEmptyMailingListDialog(true);
      return;
    }
    
    await proceedWithSubmit();
  };
  
  const proceedWithSubmit = async () => {
    setIsLoading(true);
    
    logger.ui.info("HireForm", "Form submitted");
    
    // Create a copy of hire data for submission
    const hireToSubmit = { ...hire };
    
    // Ensure the ICT Support PIC is set
    if (currentUser?.username) {
      hireToSubmit.ict_support_pic = currentUser.username;
      logger.ui.info("HireForm", `Setting ICT Support PIC to ${currentUser.username}`);
    } else {
      logger.ui.warn("HireForm", "No current user available to set ICT Support PIC");
    }
    
    // Remove audit logs to prevent payload size issues
    delete hireToSubmit.audit_logs;
    
    logger.ui.debug("HireForm", "About to save hire data:", JSON.stringify(hireToSubmit));
    logger.ui.debug("HireForm", "Is new hire?", isNewHire);
  
    try {
      if (isNewHire) {
        logger.ui.info("HireForm", "Creating new hire");
        logger.ui.debug("HireForm", "Create data:", JSON.stringify(hireToSubmit));
        const result = await hiresApi.create(hireToSubmit);
        logger.ui.info("HireForm", "Create hire API call completed!");
        logger.ui.debug("HireForm", "Create hire result:", result);
        toast({
          title: "Success",
          description: "New hire added successfully",
        });
      } else if (id) {
        logger.ui.info("HireForm", "Updating hire with ID:", id);
        logger.ui.debug("HireForm", "Update data:", JSON.stringify(hireToSubmit));
        const result = await hiresApi.update(id, hireToSubmit);
        logger.ui.debug("HireForm", "Update hire result:", result);
        
        // Invalidate the query cache to refresh the data across all components
        queryClient.invalidateQueries({ queryKey: ['hire', id] });
        
        toast({
          title: "Success",
          description: "Hire details updated successfully",
        });
      }
      navigate("/hires");
    } catch (error) {
      logger.ui.error("HireForm", "Error saving hire:", error);
      if (error instanceof Error) {
        logger.ui.error("HireForm", "Error details:", error.message);
        
        if (error.stack) {
          logger.ui.error("HireForm", "Error stack:", error.stack);
        }
      }
      
      toast({
        title: "Error",
        description: `Failed to save hire: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  

  if (isFetching) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (fetchError) {
    return (
      <div className="text-center py-8 text-red-500">
        Error loading hire details: {fetchError instanceof Error ? fetchError.message : 'Unknown error'}
      </div>
    );
  }

  // Get departments and statuses from settings
  const departments = settingsData?.departments || [];
  const accountStatuses = settingsData?.accountStatuses || ["Pending", "Active", "Inactive", "Suspended"];
  const laptopStatuses = ["Pending", "In Progress", "Ready", "Done"];

  // Check if any license type has the name "None" to avoid duplicate keys
  const hasNoneLicenseType = (licenseTypes || []).some(lt => lt.name === "None");

  // Check if AD is enabled to decide whether to show the AD user lookup
  const isADEnabled = settingsData?.activeDirectorySettings?.enabled || false;

  // Add the missing handleMailingListChange function
  const handleMailingListChange = (value: string[]) => {
    setHire(prev => ({
      ...prev,
      mailing_list: value
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/hires")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold">{isNewHire ? "Add New Hire" : "Edit Hire"}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Full Name
                </label>
                <Input
                  id="name"
                  name="name"
                  value={hire.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={hire.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">
                  Job Title
                </label>
                <Input
                  id="title"
                  name="title"
                  value={hire.title}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="department" className="text-sm font-medium">
                  Department
                </label>
                <Select
                  value={hire.department}
                  onValueChange={(value) => handleSelectChange("department", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name} ({dept.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="phone_number" className="text-sm font-medium">
                  Phone Number
                </label>
                <Input
                  id="phone_number"
                  name="phone_number"
                  value={hire.phone_number}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="direct_report" className="text-sm font-medium">
                  Reports To {isADEnabled && "(AD Lookup Enabled)"}
                </label>
                {isADEnabled ? (
                  <ADUserLookup 
                    value={hire.direct_report} 
                    onChange={(value) => handleSelectChange("direct_report", value)}
                    placeholder="Search for manager..."
                  />
                ) : (
                  <Input
                    id="direct_report"
                    name="direct_report"
                    value={hire.direct_report}
                    onChange={handleInputChange}
                  />
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="on_site_date" className="text-sm font-medium">
                  On-site Date
                </label>
                <Input
                  id="on_site_date"
                  name="on_site_date"
                  type="date"
                  value={hire.on_site_date}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account & Setup Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium">
                  Username (Max 20 chars)
                </label>
                <Input
                  id="username"
                  name="username"
                  value={hire.username}
                  onChange={handleInputChange}
                  placeholder="Auto-generated from email"
                  maxLength={20}
                  className={hire.username.length > 20 ? "border-red-500" : ""}
                />
                {hire.username.length > 0 && (
                  <p className={`text-xs ${hire.username.length > 20 ? "text-red-500" : "text-gray-500"}`}>
                    {hire.username.length}/20 characters
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password (Temporary)
                </label>
                <div className="flex relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={hire.password}
                    onChange={handleInputChange}
                    placeholder="Auto-generated from first name"
                    className="pr-20" /* Make space for the buttons */
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{showPassword ? "Hide password" : "Show password"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={copyPasswordToClipboard}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Copy password</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Directory Account Details Section */}
            <Collapsible 
              open={showADDetails} 
              onOpenChange={setShowADDetails}
              className="border rounded-lg p-4 bg-gray-50 mt-4"
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <h3 className="text-base font-medium">Active Directory Account Details</h3>
                  <Button variant="ghost" size="sm">
                    {showADDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Display Name</label>
                    <div className="flex relative">
                      <Input value={adAccountDetails.displayName} readOnly className="pr-10 bg-gray-100" />
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8" 
                                onClick={() => copyToClipboard(adAccountDetails.displayName, "Display Name")}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Copy display name</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">First Name</label>
                      <div className="flex relative">
                        <Input value={adAccountDetails.firstName} readOnly className="pr-10 bg-gray-100" />
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8" 
                                  onClick={() => copyToClipboard(adAccountDetails.firstName, "First Name")}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Copy first name</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Last Name</label>
                      <div className="flex relative">
                        <Input value={adAccountDetails.lastName} readOnly className="pr-10 bg-gray-100" />
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8" 
                                  onClick={() => copyToClipboard(adAccountDetails.lastName, "Last Name")}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Copy last name</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">OU Path</label>
                  <div className="flex relative">
                    <Input value={adAccountDetails.ou} readOnly className="pr-10 bg-gray-100" />
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8" 
                              onClick={() => copyToClipboard(adAccountDetails.ou, "OU Path")}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Copy OU path</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Company</label>
                    <div className="flex relative">
                      <Input value={adAccountDetails.company} readOnly className="pr-10 bg-gray-100" />
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8" 
                                onClick={() => copyToClipboard(adAccountDetails.company, "Company")}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Copy company</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Office</label>
                    <div className="flex relative">
                      <Input value={adAccountDetails.office} readOnly className="pr-10 bg-gray-100" />
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8" 
                                onClick={() => copyToClipboard(adAccountDetails.office, "Office")}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Copy office</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">ACL Group</label>
                    <div className="flex relative">
                      <Input value={adAccountDetails.acl} readOnly className="pr-10 bg-gray-100" />
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8" 
                                onClick={() => copyToClipboard(adAccountDetails.acl, "ACL Group")}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Copy ACL group</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label htmlFor="account_creation_status" className="text-sm font-medium">
                  Account Creation Status
                </label>
                <Select
                  value={hire.account_creation_status}
                  onValueChange={(value) => handleSelectChange("account_creation_status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountStatuses.map(status => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="laptop_ready" className="text-sm font-medium">
                  Laptop Status
                </label>
                <Select
                  value={hire.laptop_ready}
                  onValueChange={(value) => handleSelectChange("laptop_ready", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {laptopStatuses.map(status => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="mailing_list" className="text-sm font-medium">
                  Mailing Lists
                </label>
                {settingsData?.mailingListDisplayAsDropdown ? (
                  <MultiSelectMailingList
                    value={Array.isArray(hire.mailing_list) ? hire.mailing_list : hire.mailing_list.split(',').filter(Boolean).map(item => item.trim())}
                    onChange={handleMailingListChange}
                    lists={settingsData?.mailingLists || []}
                    placeholder="Select mailing lists..."
                  />
                ) : (
                  <Input
                    id="mailing_list"
                    name="mailing_list"
                    value={Array.isArray(hire.mailing_list) ? hire.mailing_list.join(', ') : hire.mailing_list}
                    onChange={handleInputChange}
                    placeholder="Comma-separated list"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label htmlFor="license_assigned" className="text-sm font-medium">
                  License Assigned
                </label>
                <Switch
                  id="license_assigned"
                  checked={hire.license_assigned}
                  onCheckedChange={(checked) => handleSwitchChange("license_assigned", checked)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="status_srf" className="text-sm font-medium">
                  SRF Status
                </label>
                <Switch
                  id="status_srf"
                  checked={hire.status_srf}
                  onCheckedChange={(checked) => handleSwitchChange("status_srf", checked)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="microsoft_365_license" className="text-sm font-medium">
                  Microsoft 365 License
                </label>
                <Select
                  value={hire.microsoft_365_license}
                  onValueChange={(value) => handleSelectChange("microsoft_365_license", value)}
                >
                  <SelectTrigger id="microsoft_365_license">
                    <SelectValue placeholder="Select license type" />
                  </SelectTrigger>
                  <SelectContent>
                    {(licenseTypes || []).map((licenseType) => (
                      <SelectItem key={licenseType.id} value={licenseType.name}>
                        {licenseType.name}
                      </SelectItem>
                    ))}
                    {/* Add "None" option only if it's not already in the license types */}
                    {!hasNoneLicenseType && (
                      <SelectItem key="none-option" value="None">
                        None
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="ict_support_pic" className="text-sm font-medium">
                ICT Support PIC (Last Editor)
              </label>
              <Input
                id="ict_support_pic"
                name="ict_support_pic"
                value={hire.ict_support_pic || ""} 
                disabled
                className="bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                This field shows the last person who edited this record
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="remarks" className="text-sm font-medium">
                Remarks
              </label>
              <Textarea
                id="remarks"
                name="remarks"
                value={hire.remarks}
                onChange={handleInputChange}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="note" className="text-sm font-medium">
                Additional Notes
              </label>
              <Textarea
                id="note"
                name="note"
                value={hire.note}
                onChange={handleInputChange}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate("/hires")}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : isNewHire ? "Create" : "Update"}
          </Button>
        </div>
      </form>
        {/* Warning dialog for empty mailing list */}
        <AlertDialog open={showEmptyMailingListDialog} onOpenChange={setShowEmptyMailingListDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>No Mailing List Selected</AlertDialogTitle>
              <AlertDialogDescription>
                You haven't selected any mailing lists for this hire. This person won't receive any automated communications.
                Are you sure you want to proceed without selecting mailing lists?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={proceedWithSubmit}>
                Proceed Anyway
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
    
  );
}
