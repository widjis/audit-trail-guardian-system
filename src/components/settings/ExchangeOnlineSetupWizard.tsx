
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { distributionListService } from "@/services/distribution-list-service";

interface ExchangeOnlineSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  onSetupComplete: () => void;
  isReset?: boolean;
}

export function ExchangeOnlineSetupWizard({ 
  open, 
  onOpenChange, 
  username, 
  onSetupComplete,
  isReset = false 
}: ExchangeOnlineSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Setup/Reset password mutation
  const setupMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      return await distributionListService.setupExchangeCredentials(data.username, data.password);
    },
    onSuccess: () => {
      setStep(3);
      toast.success(isReset ? "Password reset successfully" : "Exchange Online setup completed");
      setTimeout(() => {
        onSetupComplete();
        onOpenChange(false);
        resetWizard();
      }, 2000);
    },
    onError: (error) => {
      toast.error(`Setup failed: ${error.message}`);
    }
  });

  const resetWizard = () => {
    setStep(1);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleNext = () => {
    if (step === 1) {
      if (!password) {
        toast.error("Please enter a password");
        return;
      }
      if (password.length < 8) {
        toast.error("Password must be at least 8 characters long");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (password !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
      setupMutation.mutate({ username, password });
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    resetWizard();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isReset ? "Reset Exchange Online Password" : "Setup Exchange Online Authentication"}
          </DialogTitle>
          <DialogDescription>
            {isReset 
              ? "Create a new secure password for Exchange Online access"
              : "Configure secure authentication for Exchange Online integration"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              step >= 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              1
            </div>
            <div className={`flex-1 h-1 ${step >= 2 ? 'bg-blue-500' : 'bg-gray-200'}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              step >= 2 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              2
            </div>
            <div className={`flex-1 h-1 ${step >= 3 ? 'bg-green-500' : 'bg-gray-200'}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              step >= 3 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {step >= 3 ? <CheckCircle className="h-4 w-4" /> : '3'}
            </div>
          </div>

          {/* Step 1: Username & Password */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Authentication Details</h3>
              
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-muted-foreground">
                  Username loaded from environment variable EXO_USER
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your Exchange Online password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This will be encrypted and stored securely using PowerShell SecureString
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Make sure MFA is disabled for this account and basic authentication is enabled in your Exchange Online settings.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step 2: Confirm Password */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Confirm Password</h3>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {password && confirmPassword && password !== confirmPassword && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Passwords do not match</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="space-y-4 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h3 className="text-lg font-medium">Setup Complete!</h3>
              <p className="text-muted-foreground">
                Your Exchange Online credentials have been configured securely.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <div>
              {step > 1 && step < 3 && (
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
              )}
            </div>
            
            <div className="space-x-2">
              {step < 3 && (
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              )}
              
              {step < 2 && (
                <Button onClick={handleNext} disabled={!password}>
                  Next
                </Button>
              )}
              
              {step === 2 && (
                <Button 
                  onClick={handleNext} 
                  disabled={setupMutation.isPending || password !== confirmPassword || !password}
                >
                  {setupMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    isReset ? "Reset Password" : "Complete Setup"
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
