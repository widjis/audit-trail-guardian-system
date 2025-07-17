import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Shield, Computer, Server, Key, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { authService } from '../../services/auth-service';

interface AuthConfig {
  authMode: 'local' | 'ldap' | 'hybrid';
  ldapFallbackEnabled: boolean;
}

const AuthenticationSettings: React.FC = () => {
  const [config, setConfig] = useState<AuthConfig>({
    authMode: 'local',
    ldapFallbackEnabled: false
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAuthConfig();
  }, []);

  const loadAuthConfig = async () => {
    try {
      setLoading(true);
      const response = await authService.getAuthConfig();
      setConfig({
        authMode: response.authMode as 'local' | 'ldap' | 'hybrid',
        ldapFallbackEnabled: response.ldapFallbackEnabled
      });
    } catch (error) {
      console.error('Error loading auth config:', error);
      toast.error("Failed to load authentication configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await authService.updateAuthConfig(config);
      toast.success("Authentication configuration updated successfully");
    } catch (error) {
      console.error('Error saving auth config:', error);
      toast.error("Failed to update authentication configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleAuthModeChange = (newMode: 'local' | 'ldap' | 'hybrid') => {
    setConfig(prev => ({
      ...prev,
      authMode: newMode,
      // Disable fallback if not hybrid mode
      ldapFallbackEnabled: newMode === 'hybrid' ? prev.ldapFallbackEnabled : false
    }));
  };

  const handleFallbackChange = (checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      ldapFallbackEnabled: checked
    }));
  };

  const getAuthModeDescription = (mode: string) => {
    switch (mode) {
      case 'local':
        return 'Users authenticate using local database credentials only';
      case 'ldap':
        return 'Users authenticate using LDAP/Active Directory credentials only';
      case 'hybrid':
        return 'Users can choose between local and LDAP authentication methods';
      default:
        return '';
    }
  };

  const getAuthModeIcon = (mode: string) => {
    switch (mode) {
      case 'local':
        return <Computer className="h-5 w-5" />;
      case 'ldap':
        return <Server className="h-5 w-5" />;
      case 'hybrid':
        return <Key className="h-5 w-5" />;
      default:
        return <Shield className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-6">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading authentication settings...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Authentication Settings</h1>
      </div>
      
      <p className="text-muted-foreground">
        Configure how users authenticate to access the system. Changes will affect all future login attempts.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Mode</CardTitle>
              <CardDescription>
                Choose how users will authenticate to access the system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Local Authentication */}
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  config.authMode === 'local' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handleAuthModeChange('local')}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <Computer className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">Local Authentication</h3>
                      <input
                        type="radio"
                        checked={config.authMode === 'local'}
                        onChange={() => handleAuthModeChange('local')}
                        className="ml-auto"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getAuthModeDescription('local')}
                    </p>
                  </div>
                </div>
              </div>

              {/* LDAP Authentication */}
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  config.authMode === 'ldap' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handleAuthModeChange('ldap')}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <Server className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">LDAP/Active Directory</h3>
                      <input
                        type="radio"
                        checked={config.authMode === 'ldap'}
                        onChange={() => handleAuthModeChange('ldap')}
                        className="ml-auto"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getAuthModeDescription('ldap')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Hybrid Authentication */}
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  config.authMode === 'hybrid' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handleAuthModeChange('hybrid')}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <Key className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">Hybrid Authentication</h3>
                      <Badge variant="secondary" className="text-xs">Recommended</Badge>
                      <input
                        type="radio"
                        checked={config.authMode === 'hybrid'}
                        onChange={() => handleAuthModeChange('hybrid')}
                        className="ml-auto"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getAuthModeDescription('hybrid')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Hybrid Mode Options */}
              {config.authMode === 'hybrid' && (
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-3">Hybrid Mode Options</h4>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="ldap-fallback">Enable LDAP Fallback</Label>
                      <p className="text-sm text-muted-foreground">
                        If local authentication fails, automatically try LDAP authentication
                      </p>
                    </div>
                    <Switch
                      id="ldap-fallback"
                      checked={config.ldapFallbackEnabled}
                      onCheckedChange={handleFallbackChange}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving || loading}
                  className="flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={loadAuthConfig}
                  disabled={loading || saving}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Configuration</CardTitle>
              <CardDescription>
                Active authentication settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                {getAuthModeIcon(config.authMode)}
                <div>
                  <p className="font-medium">
                    {config.authMode.charAt(0).toUpperCase() + config.authMode.slice(1)} Mode
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {getAuthModeDescription(config.authMode)}
                  </p>
                </div>
              </div>

              {config.authMode === 'hybrid' && (
                <Alert>
                  <AlertDescription>
                    LDAP Fallback: {config.ldapFallbackEnabled ? 'Enabled' : 'Disabled'}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Changes take effect immediately for new logins</li>
                <li>• Existing sessions remain valid</li>
                <li>• LDAP users are auto-created in local database</li>
                <li>• Admin accounts can always use local authentication</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AuthenticationSettings;