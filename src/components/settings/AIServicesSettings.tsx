import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { 
  Brain, 
  Key, 
  Settings, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Info,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import { settingsService } from '@/services/settings-service';

interface AIServicesSettings {
  geminiApiKey: string;
  enabled: boolean;
  model: string;
  maxTokens: number;
  temperature: number;
  lastConnectionTest?: string;
  cvAnalysisPrompt?: string;
  emailComposerPrompt?: string;
}

const AIServicesSettings: React.FC = () => {
  const queryClient = useQueryClient();
  
  // State for form data
  const [settings, setSettings] = useState<AIServicesSettings>({
    geminiApiKey: '',
    enabled: false,
    model: 'gemini-1.5-flash',
    maxTokens: 2048,
    temperature: 0.7,
    cvAnalysisPrompt: `Analyze this CV/resume and provide detailed insights in the following format:

**Professional Profile:**
- Brief summary of the candidate's professional background
- Years of experience and career level

**Key Competencies:**
- Technical skills and expertise areas
- Soft skills and leadership qualities
- Industry knowledge and certifications

**Career Highlights:**
- Notable achievements and accomplishments
- Previous roles and responsibilities
- Career progression and growth

**Educational Background:**
- Degrees, certifications, and qualifications
- Relevant training and professional development

**Position Relevance:**
- How well the candidate fits the role requirements
- Strengths that align with the position
- Areas for potential development

**Personalization Insights:**
- Unique aspects of the candidate's background
- Personal interests or volunteer work
- Cultural fit indicators

Please provide specific, actionable insights that can be used to create a personalized welcome email.`,
    emailComposerPrompt: `Create a warm, professional welcome email for a new hire based on their CV analysis and company information. The email should:

**Structure:**
- Professional yet friendly greeting
- Personalized welcome message referencing their background
- Excitement about their specific skills and experience
- Brief overview of what to expect on their first day
- Warm closing with next steps

**Tone:**
- Welcoming and enthusiastic
- Professional but not overly formal
- Personalized based on their background
- Encouraging and supportive

**Content Guidelines:**
- Reference specific skills or experiences from their CV
- Mention how their background aligns with the role
- Include relevant company culture elements
- Keep the email concise but meaningful
- End with clear next steps or contact information

Please generate a complete email that feels personal and genuine, not templated.`
  });
  
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Available Gemini models
  const geminiModels = [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: 'Latest model with enhanced capabilities and multimodal support' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Recommended)', description: 'Fast and efficient for most tasks' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', description: 'More capable for complex reasoning' },
    { value: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro', description: 'Previous generation model' },
  ];

  // Query to fetch current settings
  const { data: currentSettings, isLoading, error } = useQuery({
    queryKey: ['ai-services-settings'],
    queryFn: settingsService.getAIServicesSettings,
    retry: false,
  });

  // Mutation to update settings
  const updateSettingsMutation = useMutation({
    mutationFn: settingsService.updateAIServicesSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-services-settings'] });
      toast.success('AI Services settings updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });

  // Update local state when data is fetched
  useEffect(() => {
    if (currentSettings) {
      // Merge current settings with defaults, preserving defaults for missing values
      setSettings(prev => ({
        ...prev,
        ...currentSettings,
        // Ensure prompts use defaults if not provided by backend
        cvAnalysisPrompt: currentSettings.cvAnalysisPrompt || prev.cvAnalysisPrompt,
        emailComposerPrompt: currentSettings.emailComposerPrompt || prev.emailComposerPrompt
      }));
    }
  }, [currentSettings]);

  // Handle input changes
  const handleInputChange = (field: keyof AIServicesSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setTestResult(null); // Clear test result when settings change
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (settings.enabled && !settings.geminiApiKey.trim()) {
      toast.error('API Key is required when AI Services is enabled');
      return;
    }

    updateSettingsMutation.mutate(settings);
  };

  // Test connection
  const handleTestConnection = async () => {
    if (!settings.geminiApiKey.trim()) {
      toast.error('Please enter an API Key before testing');
      return;
    }

    setIsTestingConnection(true);
    setTestResult(null);

    try {
      const result = await settingsService.testAIServicesConnection(settings);
      setTestResult(result);
      
      if (result.success) {
        toast.success('Connection test successful');
      } else {
        toast.error(`Connection test failed: ${result.message}`);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error occurred';
      setTestResult({ success: false, message: errorMessage });
      toast.error(`Connection test failed: ${errorMessage}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading AI Services settings...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load AI Services settings. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Brain className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">AI Services Configuration</h2>
          <p className="text-muted-foreground">
            Configure Google Gemini AI for CV analysis and email generation
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>General Settings</span>
            </CardTitle>
            <CardDescription>
              Enable and configure AI services for the application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Enable AI Services</Label>
                <p className="text-sm text-muted-foreground">
                  Turn on AI-powered features like CV analysis and email generation
                </p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) => handleInputChange('enabled', checked)}
              />
            </div>

            <Separator />

            {/* API Key Configuration */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Key className="h-4 w-4" />
                <Label htmlFor="geminiApiKey" className="text-base font-medium">
                  Google Gemini API Key
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Get your API key from Google AI Studio</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <div className="relative">
                <Input
                  id="geminiApiKey"
                  type={showApiKey ? 'text' : 'password'}
                  value={settings.geminiApiKey}
                  onChange={(e) => handleInputChange('geminiApiKey', e.target.value)}
                  placeholder="Enter your Gemini API key"
                  className="pr-10"
                  disabled={updateSettingsMutation.isPending}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {settings.geminiApiKey && (
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={isTestingConnection || !settings.geminiApiKey.trim()}
                    className="flex items-center space-x-2"
                  >
                    {isTestingConnection ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <TestTube className="h-4 w-4" />
                    )}
                    <span>Test Connection</span>
                  </Button>

                  {testResult && (
                    <Badge variant={testResult.success ? "default" : "destructive"}>
                      {testResult.success ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {testResult.success ? 'Connected' : 'Failed'}
                    </Badge>
                  )}
                </div>
              )}

              {testResult && !testResult.success && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Connection Failed</AlertTitle>
                  <AlertDescription>{testResult.message}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Model Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle>Model Configuration</CardTitle>
            <CardDescription>
              Configure the AI model parameters for optimal performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Model Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">AI Model</Label>
              <Select
                value={settings.model}
                onValueChange={(value) => handleInputChange('model', value)}
                disabled={updateSettingsMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {geminiModels.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      <div className="flex flex-col">
                        <span>{model.label}</span>
                        <span className="text-xs text-muted-foreground">{model.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Max Tokens */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Max Tokens</Label>
                <Badge variant="outline">{settings.maxTokens}</Badge>
              </div>
              <Slider
                value={[settings.maxTokens]}
                onValueChange={(value) => handleInputChange('maxTokens', value[0])}
                max={8192}
                min={256}
                step={256}
                className="w-full"
                disabled={updateSettingsMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of tokens to generate (256 - 8192)
              </p>
            </div>

            {/* Temperature */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Temperature</Label>
                <Badge variant="outline">{settings.temperature}</Badge>
              </div>
              <Slider
                value={[settings.temperature]}
                onValueChange={(value) => handleInputChange('temperature', value[0])}
                max={2}
                min={0}
                step={0.1}
                className="w-full"
                disabled={updateSettingsMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Controls randomness: 0 = focused, 2 = creative
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Prompt Customization Card */}
        <Card>
          <CardHeader>
            <CardTitle>Prompt Customization</CardTitle>
            <CardDescription>
              Customize the prompts used for CV analysis and email composition
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* CV Analysis Prompt */}
            <div className="space-y-3">
              <Label htmlFor="cvAnalysisPrompt" className="text-base font-medium">
                CV Analysis Prompt
              </Label>
              <Textarea
                id="cvAnalysisPrompt"
                value={settings.cvAnalysisPrompt}
                onChange={(e) => handleInputChange('cvAnalysisPrompt', e.target.value)}
                placeholder="Enter the prompt for CV analysis..."
                className="min-h-[120px] resize-y"
                disabled={updateSettingsMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                This prompt will be used to analyze uploaded CVs and extract relevant information.
              </p>
            </div>

            {/* Email Composer Prompt */}
            <div className="space-y-3">
              <Label htmlFor="emailComposerPrompt" className="text-base font-medium">
                Email Composer Prompt
              </Label>
              <Textarea
                id="emailComposerPrompt"
                value={settings.emailComposerPrompt}
                onChange={(e) => handleInputChange('emailComposerPrompt', e.target.value)}
                placeholder="Enter the prompt for email composition..."
                className="min-h-[120px] resize-y"
                disabled={updateSettingsMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                This prompt will be used to generate personalized welcome emails based on CV analysis.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card>
          <CardContent className="pt-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Getting Started</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>To use AI Services, you'll need a Google Gemini API key:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google AI Studio</a></li>
                  <li>Create a new API key or use an existing one</li>
                  <li>Copy the API key and paste it above</li>
                  <li>Test the connection to ensure it's working</li>
                  <li>Enable AI Services to start using AI features</li>
                </ol>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={updateSettingsMutation.isPending}
            className="min-w-[120px]"
          >
            {updateSettingsMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AIServicesSettings;