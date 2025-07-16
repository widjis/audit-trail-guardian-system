
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { whatsappService } from "@/services/whatsapp-service";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Send, Info } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

// Types for WhatsApp settings
interface WhatsAppSettings {
  apiUrl: string;
  defaultMessage: string;
  defaultRecipient: "userNumber" | "testNumber";
  newHireNotificationEnabled: boolean;
  newHireNotificationTemplate: string;
  newHireNotificationRecipients: string[];
  groupNotificationEnabled: boolean;
  groupId?: string;
  groupName?: string;
  groupMentions?: string[];
}

export function WhatsAppSettings() {
  // State for settings
  const [settings, setSettings] = useState<WhatsAppSettings>({
    apiUrl: "",
    defaultMessage: "",
    defaultRecipient: "userNumber" as "userNumber" | "testNumber",
    newHireNotificationEnabled: false,
    newHireNotificationTemplate: "",
    newHireNotificationRecipients: [],
    groupNotificationEnabled: false,
    groupId: "",
    groupName: "",
    groupMentions: [],
  });

  // State for loading states and test number
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testNumber, setTestNumber] = useState("");
  const [testNumberError, setTestNumberError] = useState("");
  const [newRecipient, setNewRecipient] = useState("");
  const [recipientError, setRecipientError] = useState("");
  
  // State for managing group mentions
  const [newMention, setNewMention] = useState("");
  const [mentionError, setMentionError] = useState("");

  const { toast } = useToast();

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const whatsappSettings = await whatsappService.getSettings();
        setSettings({
          apiUrl: whatsappSettings.apiUrl,
          defaultMessage: whatsappSettings.defaultMessage,
          defaultRecipient: (whatsappSettings.defaultRecipient as "userNumber" | "testNumber") || "userNumber",
          newHireNotificationEnabled: whatsappSettings.newHireNotificationEnabled || false,
          newHireNotificationTemplate: whatsappSettings.newHireNotificationTemplate || "",
          newHireNotificationRecipients: whatsappSettings.newHireNotificationRecipients || [],
          groupNotificationEnabled: whatsappSettings.groupNotificationEnabled || false,
          groupId: whatsappSettings.groupId || "",
          groupName: whatsappSettings.groupName || "",
          groupMentions: whatsappSettings.groupMentions || [],
        });
      } catch (error) {
        console.error("Failed to load WhatsApp settings:", error);
        toast({
          title: "Error",
          description: "Failed to load WhatsApp settings",
          variant: "destructive",
        });
      }
    };

    loadSettings();
  }, [toast]);

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  // Handle radio button change for default recipient
  const handleRecipientChange = (value: "userNumber" | "testNumber") => {
    setSettings((prev) => ({ ...prev, defaultRecipient: value }));
  };

  // Handle checkbox change for new hire notifications
  const handleNotificationEnabledChange = (checked: boolean) => {
    setSettings((prev) => ({ ...prev, newHireNotificationEnabled: checked }));
  };

  // Add new recipient to the list
  const handleAddRecipient = () => {
    if (!newRecipient.trim()) {
      setRecipientError("Please enter a phone number");
      return;
    }
    
    // Basic phone number validation
    const phoneRegex = /^[0-9+\-\s()]+$/;
    if (!phoneRegex.test(newRecipient)) {
      setRecipientError("Please enter a valid phone number");
      return;
    }
    
    // Check if recipient already exists
    if (settings.newHireNotificationRecipients.includes(newRecipient.trim())) {
      setRecipientError("This phone number is already in the list");
      return;
    }
    
    setSettings((prev) => ({
      ...prev,
      newHireNotificationRecipients: [...prev.newHireNotificationRecipients, newRecipient.trim()]
    }));
    
    setNewRecipient("");
    setRecipientError("");
  };

  // Remove recipient from the list
  const handleRemoveRecipient = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      newHireNotificationRecipients: prev.newHireNotificationRecipients.filter((_, i) => i !== index)
    }));
  };

  // Helper functions for managing group mentions
  const handleAddMention = () => {
    if (!newMention.trim()) {
      setMentionError("Please enter a phone number to mention");
      return;
    }
    
    // Basic phone number validation
    const phoneRegex = /^[0-9+\-\s()]+$/;
    if (!phoneRegex.test(newMention.trim())) {
      setMentionError("Please enter a valid phone number");
      return;
    }
    
    // Check for duplicates
    if (settings.groupMentions?.includes(newMention.trim())) {
      setMentionError("This phone number is already in the mentions list");
      return;
    }
    
    const updatedMentions = [...(settings.groupMentions || []), newMention.trim()];
    setSettings({ ...settings, groupMentions: updatedMentions });
    setNewMention("");
    setMentionError("");
  };

  const handleRemoveMention = (index: number) => {
    const updatedMentions = (settings.groupMentions || []).filter((_, i) => i !== index);
    setSettings({ ...settings, groupMentions: updatedMentions });
  };

  // Save settings
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await whatsappService.saveSettings(settings);
      toast({
        title: "Success",
        description: "WhatsApp settings saved successfully",
      });
    } catch (error) {
      console.error("Failed to save WhatsApp settings:", error);
      toast({
        title: "Error",
        description: "Failed to save WhatsApp settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Test connection
  const handleTestConnection = async () => {
    if (!testNumber) {
      setTestNumberError("Please enter a test phone number");
      return;
    }

    setTestNumberError("");
    setIsTesting(true);
    try {
      // Example message with placeholder variables for testing
      const testMessage = "This is a test message from the MTI Onboarding System.";
      await whatsappService.sendMessage(testNumber, testMessage);
      toast({
        title: "Success",
        description: "Test message sent successfully",
      });
    } catch (error) {
      console.error("Failed to send test message:", error);
      toast({
        title: "Error",
        description: "Failed to send test message. Please check the API URL and the test number format.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">WhatsApp Integration Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure the WhatsApp API integration for sending account information to new hires.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* API URL */}
          <div className="space-y-2">
            <Label htmlFor="apiUrl">WhatsApp API URL</Label>
            <Input
              id="apiUrl"
              name="apiUrl"
              placeholder="http://your-api-url:port"
              value={settings.apiUrl}
              onChange={handleChange}
            />
            <p className="text-xs text-muted-foreground">
              The URL of the WhatsApp messaging API service.
            </p>
          </div>

          {/* Test Number Input */}
          <div className="space-y-2">
            <Label htmlFor="testNumber">Test Phone Number</Label>
            <Input
              id="testNumber"
              name="testNumber"
              placeholder="6281234567890"
              value={testNumber}
              onChange={(e) => {
                setTestNumber(e.target.value);
                setTestNumberError("");
              }}
            />
            {testNumberError && (
              <p className="text-xs text-destructive">{testNumberError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Enter a phone number with country code but without the '+' symbol or spaces for testing.
            </p>
          </div>

          {/* Test Connection Button */}
          <Button
            onClick={handleTestConnection}
            disabled={isTesting || !settings.apiUrl}
            className="flex gap-2 items-center w-full sm:w-auto"
          >
            {isTesting ? "Testing..." : "Test Connection"}
            <Send className="h-4 w-4" />
          </Button>

          {/* Default Recipient */}
          <div className="space-y-2">
            <Label>Default Recipient for "Send WhatsApp" Button</Label>
            <RadioGroup 
              value={settings.defaultRecipient} 
              onValueChange={(value: "userNumber" | "testNumber") => handleRecipientChange(value)}
              className="flex flex-col space-y-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="userNumber" id="userNumber" />
                <Label htmlFor="userNumber" className="font-normal cursor-pointer">User's phone number</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="testNumber" id="testNumber" />
                <Label htmlFor="testNumber" className="font-normal cursor-pointer">Test number from settings</Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              Choose whether to send messages to the user's actual phone number or to the test number by default.
            </p>
          </div>

          {/* Message Template */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="defaultMessage">Default Message Template</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Use these placeholders in your message:</p>
                    <p className="text-xs">
                      {`{{name}}, {{email}}, {{title}}, {{department}}, {{password}}`}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Textarea
              id="defaultMessage"
              name="defaultMessage"
              placeholder="Welcome message with placeholders..."
              value={settings.defaultMessage}
              onChange={handleChange}
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          {/* New Hire Notification Settings */}
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label className="text-base font-medium">New Hire Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Automatically send WhatsApp notifications when new hires are processed.
              </p>
            </div>

            {/* Enable/Disable Toggle */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="newHireNotificationEnabled"
                checked={settings.newHireNotificationEnabled}
                onCheckedChange={handleNotificationEnabledChange}
              />
              <Label htmlFor="newHireNotificationEnabled" className="font-normal cursor-pointer">
                Enable new hire notifications
              </Label>
            </div>

            {settings.newHireNotificationEnabled && (
              <>
                {/* Notification Template */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="newHireNotificationTemplate">Notification Message Template</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help">
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Use these placeholders in your notification:</p>
                          <p className="text-xs">
                            {`{{name}}, {{email}}, {{title}}, {{department}}, {{startDate}}`}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Textarea
                    id="newHireNotificationTemplate"
                    name="newHireNotificationTemplate"
                    placeholder="New hire notification template..."
                    value={settings.newHireNotificationTemplate}
                    onChange={handleChange}
                    rows={6}
                    className="font-mono text-sm"
                  />
                </div>

                {/* Notification Recipients */}
                <div className="space-y-2">
                  <Label>Notification Recipients</Label>
                  <p className="text-sm text-muted-foreground">
                    Phone numbers that will receive new hire notifications.
                  </p>
                  
                  {/* Add Recipient Input */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter phone number (e.g., 6281234567890)"
                      value={newRecipient}
                      onChange={(e) => {
                        setNewRecipient(e.target.value);
                        setRecipientError("");
                      }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={handleAddRecipient}
                      size="sm"
                      className="px-3"
                    >
                      Add
                    </Button>
                  </div>
                  
                  {recipientError && (
                    <p className="text-xs text-destructive">{recipientError}</p>
                  )}
                  
                  {/* Recipients List */}
                  {settings.newHireNotificationRecipients.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm">Current Recipients:</Label>
                      <div className="space-y-1">
                        {settings.newHireNotificationRecipients.map((recipient, index) => (
                          <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                            <span className="text-sm font-mono">{recipient}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveRecipient(index)}
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Group Notification Settings */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label className="text-base font-medium">Group Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send notifications to a WhatsApp group instead of individual recipients.
                    </p>
                  </div>

                  {/* Enable Group Notifications */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="groupNotificationEnabled"
                      checked={settings.groupNotificationEnabled}
                      onCheckedChange={(checked) => 
                        setSettings({ ...settings, groupNotificationEnabled: checked as boolean })
                      }
                    />
                    <Label htmlFor="groupNotificationEnabled" className="font-normal cursor-pointer">
                      Send notifications to WhatsApp group
                    </Label>
                  </div>

                  {settings.groupNotificationEnabled && (
                    <>
                      {/* Group ID */}
                      <div className="space-y-2">
                        <Label htmlFor="groupId">Group ID (Optional)</Label>
                        <Input
                          id="groupId"
                          name="groupId"
                          placeholder="Enter WhatsApp group ID"
                          value={settings.groupId || ""}
                          onChange={handleChange}
                        />
                        <p className="text-xs text-muted-foreground">
                          Use either Group ID or Group Name. Group ID takes priority if both are provided.
                        </p>
                      </div>

                      {/* Group Name */}
                      <div className="space-y-2">
                        <Label htmlFor="groupName">Group Name (Optional)</Label>
                        <Input
                          id="groupName"
                          name="groupName"
                          placeholder="Enter WhatsApp group name"
                          value={settings.groupName || ""}
                          onChange={handleChange}
                        />
                        <p className="text-xs text-muted-foreground">
                          The exact name of the WhatsApp group as it appears in the chat.
                        </p>
                      </div>

                      {/* Group Mentions */}
                      <div className="space-y-2">
                        <Label>Group Mentions (Optional)</Label>
                        <p className="text-sm text-muted-foreground">
                          Phone numbers to mention in group notifications.
                        </p>
                        
                        {/* Add Mention Input */}
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter phone number to mention (e.g., 6281234567890)"
                            value={newMention}
                            onChange={(e) => {
                              setNewMention(e.target.value);
                              setMentionError("");
                            }}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            onClick={handleAddMention}
                            size="sm"
                            className="px-3"
                          >
                            Add
                          </Button>
                        </div>
                        
                        {mentionError && (
                          <p className="text-xs text-destructive">{mentionError}</p>
                        )}
                        
                        {/* Mentions List */}
                        {(settings.groupMentions?.length || 0) > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm">Current Mentions:</Label>
                            <div className="space-y-1">
                              {settings.groupMentions?.map((mention, index) => (
                                <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                                  <span className="text-sm font-mono">{mention}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveMention(index)}
                                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                  >
                                    ×
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
