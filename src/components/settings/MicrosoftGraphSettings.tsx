
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { settingsService } from "@/services/settings-service";
import { microsoftGraphService } from "@/services/microsoft-graph-service";
import { Loader2, TestTube, CheckCircle, XCircle, Mail } from "lucide-react";

interface MicrosoftGraphSettings {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  tenantId: string;
  authority: string;
  scope: string[];
  lastConnectionTest?: string;
  defaultEmailRecipient?: string;
  emailSubjectTemplate?: string;
  emailBodyTemplate?: string;
  senderEmail?: string;
}

export function MicrosoftGraphSettings() {
  const [settings, setSettings] = useState<MicrosoftGraphSettings>({
    enabled: false,
    clientId: '',
    clientSecret: '',
    tenantId: '',
    authority: '',
    scope: ["https://graph.microsoft.com/.default"],
    defaultEmailRecipient: '',
    senderEmail: '',
    emailSubjectTemplate: 'License Request for {{hireCount}} New Employees',
    emailBodyTemplate: `Dear IT Team,

I hope this email finds you well. I am writing to request Microsoft 365 license assignments for the following new employees who have recently joined our organization:

{{hireDetails}}

Please process these license assignments at your earliest convenience. If you need any additional information or have questions regarding these requests, please don't hesitate to contact me.

Thank you for your assistance.

Best regards,
HR Department`
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsService.getMicrosoftGraphSettings();
      setSettings(data);
      setTestEmailRecipient(data.defaultEmailRecipient || '');
    } catch (error) {
      console.error('Error loading Microsoft Graph settings:', error);
      toast.error("Failed to load Microsoft Graph settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await settingsService.updateMicrosoftGraphSettings(settings);
      toast.success("Microsoft Graph settings updated successfully");
    } catch (error) {
      console.error('Error updating Microsoft Graph settings:', error);
      toast.error("Failed to update Microsoft Graph settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await settingsService.testMicrosoftGraphConnection(settings);
      setTestResult(result);
      
      if (result.success) {
        toast.success("Microsoft Graph connection test successful");
        const updatedSettings = { 
          ...settings, 
          lastConnectionTest: new Date().toISOString() 
        };
        setSettings(updatedSettings);
      } else {
        toast.error("Microsoft Graph connection test failed");
      }
    } catch (error) {
      console.error('Error testing Microsoft Graph connection:', error);
      setTestResult({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Connection test failed' 
      });
      toast.error("Microsoft Graph connection test failed");
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmailRecipient) {
      toast.error("Please enter a test email recipient");
      return;
    }

    setIsTesting(true);
    try {
      const result = await microsoftGraphService.testEmailSend(testEmailRecipient);
      
      if (result.success) {
        toast.success("Test email sent successfully");
      } else {
        toast.error("Test email failed: " + result.message);
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error("Test email failed");
    } finally {
      setIsTesting(false);
    }
  };

  const handleScopeChange = (value: string) => {
    const scopes = value.split('\n').filter(scope => scope.trim() !== '');
    setSettings({ ...settings, scope: scopes });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Microsoft Graph Settings...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* API Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Microsoft Graph API Configuration</CardTitle>
          <CardDescription>
            Configure Microsoft Graph API integration for sending emails and other Graph operations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="graph-enabled">Enable Microsoft Graph Integration</Label>
              <p className="text-sm text-muted-foreground">
                Turn on to use Microsoft Graph API features
              </p>
            </div>
            <Switch
              id="graph-enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
            />
          </div>

          {/* Configuration Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client-id">Client ID</Label>
              <Input
                id="client-id"
                type="text"
                value={settings.clientId}
                onChange={(e) => setSettings({ ...settings, clientId: e.target.value })}
                placeholder="5d7d0543-c459-4ef7-9636-d89dab421eb0"
                disabled={!settings.enabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenant-id">Tenant ID</Label>
              <Input
                id="tenant-id"
                type="text"
                value={settings.tenantId}
                onChange={(e) => setSettings({ ...settings, tenantId: e.target.value })}
                placeholder="b428d519-22b4-458f-af45-f020150f5839"
                disabled={!settings.enabled}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-secret">Client Secret</Label>
            <Input
              id="client-secret"
              type="password"
              value={settings.clientSecret}
              onChange={(e) => setSettings({ ...settings, clientSecret: e.target.value })}
              placeholder="Enter client secret"
              disabled={!settings.enabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="authority">Authority URL</Label>
            <Input
              id="authority"
              type="text"
              value={settings.authority}
              onChange={(e) => setSettings({ ...settings, authority: e.target.value })}
              placeholder={`https://login.microsoftonline.com/${settings.tenantId || 'your-tenant-id'}`}
              disabled={!settings.enabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scope">API Scopes (one per line)</Label>
            <Textarea
              id="scope"
              value={settings.scope.join('\n')}
              onChange={(e) => handleScopeChange(e.target.value)}
              placeholder="https://graph.microsoft.com/.default"
              rows={3}
              disabled={!settings.enabled}
            />
            <p className="text-xs text-muted-foreground">
              Enter each scope on a new line. Default scope provides access to all Graph API endpoints.
            </p>
          </div>

          {/* Test Connection Section */}
          {settings.enabled && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTesting || !settings.clientId || !settings.clientSecret || !settings.tenantId}
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <TestTube className="mr-2 h-4 w-4" />
                      Test Connection
                    </>
                  )}
                </Button>
                
                {settings.lastConnectionTest && (
                  <p className="text-sm text-muted-foreground">
                    Last tested: {new Date(settings.lastConnectionTest).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Test Result */}
              {testResult && (
                <Alert variant={testResult.success ? "default" : "destructive"}>
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <AlertDescription>
                      {testResult.message}
                    </AlertDescription>
                  </div>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Settings Card */}
      {settings.enabled && (
        <Card>
          <CardHeader>
            <CardTitle>Email Settings</CardTitle>
            <CardDescription>
              Configure email templates and default settings for license requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="sender-email">Sender Email Address</Label>
              <Input
                id="sender-email"
                type="email"
                value={settings.senderEmail || ''}
                onChange={(e) => setSettings({ ...settings, senderEmail: e.target.value })}
                placeholder="hr@company.com"
              />
              <p className="text-xs text-muted-foreground">
                Email address that will appear as the sender of license request emails
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default-recipient">Default Email Recipient</Label>
              <Input
                id="default-recipient"
                type="email"
                value={settings.defaultEmailRecipient || ''}
                onChange={(e) => setSettings({ ...settings, defaultEmailRecipient: e.target.value })}
                placeholder="it-team@company.com"
              />
              <p className="text-xs text-muted-foreground">
                Default recipient for license request emails
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-subject">Email Subject Template</Label>
              <Input
                id="email-subject"
                type="text"
                value={settings.emailSubjectTemplate || ''}
                onChange={(e) => setSettings({ ...settings, emailSubjectTemplate: e.target.value })}
                placeholder="License Request for {{hireCount}} New Employees"
              />
              <p className="text-xs text-muted-foreground">
                Use {"{{hireCount}}"} for the number of employees
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-body">Email Body Template</Label>
              <Textarea
                id="email-body"
                value={settings.emailBodyTemplate || ''}
                onChange={(e) => setSettings({ ...settings, emailBodyTemplate: e.target.value })}
                rows={8}
                placeholder="Use {{hireDetails}} to insert employee information"
              />
              <p className="text-xs text-muted-foreground">
                Use {"{{hireDetails}}"} to insert formatted employee information and {"{{hireCount}}"} for count
              </p>
            </div>

            {/* Test Email Section */}
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="test-email">Test Email Recipient</Label>
                <div className="flex gap-2">
                  <Input
                    id="test-email"
                    type="email"
                    value={testEmailRecipient}
                    onChange={(e) => setTestEmailRecipient(e.target.value)}
                    placeholder="test@company.com"
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={handleTestEmail}
                    disabled={isTesting || !testEmailRecipient}
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Test
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Settings"
          )}
        </Button>
      </div>
    </div>
  );
}
