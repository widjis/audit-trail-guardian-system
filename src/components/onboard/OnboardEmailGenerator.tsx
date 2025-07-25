import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { hiresApi } from "@/services/api";
import { settingsService } from "@/services/settings-service";
import { NewHire } from "@/types/types";
import { 
  FileText, 
  Users, 
  Mail, 
  Sparkles,
  Eye,
  RefreshCw,
  User,
  Upload,
  File,
  X,
  CheckCircle,
  Settings,
  AlertCircle,
  Save,
  Send
} from "lucide-react";

export function OnboardEmailGenerator() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedHire, setSelectedHire] = useState<NewHire | null>(null);
  const [cvInsights, setCvInsights] = useState<string>("");
  const [emailContent, setEmailContent] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Query to get all hires
  const { data: hires = [], isLoading } = useQuery({
    queryKey: ['hires'],
    queryFn: hiresApi.getAll
  });

  // Query to get AI services settings
  const { data: aiSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['ai-services-settings'],
    queryFn: settingsService.getAIServicesSettings
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;  

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF, DOC, DOCX, or TXT file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      setUploadedFile(file);
      
      // Create file preview for text files
      if (file.type === 'text/plain') {
        const text = await file.text();
        setFilePreview(text.substring(0, 500) + (text.length > 500 ? '...' : ''));
      } else {
        setFilePreview(`${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      }

      toast({
        title: "File Uploaded",
        description: `Successfully uploaded ${file.name}`,
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    setFilePreview("");
    setCvInsights("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get just the base64 string
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const analyzeWithGeminiVision = async (file: File, apiKey: string, customPrompt?: string): Promise<string> => {
    try {
      const base64Data = await convertFileToBase64(file);
      
      // Use custom prompt if provided, otherwise fall back to default
      const defaultPrompt = `Please analyze this CV/Resume document and provide detailed insights in the following structured format:

**PROFESSIONAL PROFILE:**
- Current role and seniority level
- Years of experience in the field
- Industry background and specialization

**KEY COMPETENCIES:**
- Core technical skills
- Leadership and management capabilities
- Soft skills and interpersonal abilities
- Certifications and qualifications

**CAREER HIGHLIGHTS:**
- Notable achievements and accomplishments
- Major projects or initiatives led
- Awards, recognitions, or publications
- Career progression and growth trajectory

**EDUCATIONAL BACKGROUND:**
- Degrees and institutions
- Relevant coursework or specializations
- Additional training or professional development

**POSITION RELEVANCE:**
- How their background aligns with typical requirements
- Unique strengths they bring to the role
- Areas where they might need support or development
- Cultural fit indicators

**PERSONALIZATION INSIGHTS:**
- Communication style preferences (formal/casual)
- Likely motivations and career drivers
- Interests or hobbies that could be mentioned
- Professional values and work style

Please format the response clearly with bullet points and be specific about skills, experiences, and achievements mentioned in the CV.`;

      const promptToUse = customPrompt && customPrompt.trim() ? customPrompt : defaultPrompt;
      
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: promptToUse
              },
              {
                inline_data: {
                  mime_type: file.type,
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 3000,
        }
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to analyze CV');
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis available';
    } catch (error) {
      console.error('Gemini API Error:', error);
      throw error;
    }
  };

  const handleAnalyzeCV = async () => {
    if (!selectedHire) {
      toast({
        title: "Missing Information",
        description: "Please select a hire first",
        variant: "destructive"
      });
      return;
    }

    if (!uploadedFile) {
      toast({
        title: "No CV File",
        description: "Please upload a CV file first",
        variant: "destructive"
      });
      return;
    }

    if (!aiSettings?.geminiApiKey || !aiSettings?.enabled) {
      toast({
        title: "AI Service Not Configured",
        description: "Please configure Gemini AI in Settings first",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      // Use real Gemini Vision API to analyze the uploaded CV
      const insights = await analyzeWithGeminiVision(
        uploadedFile, 
        aiSettings.geminiApiKey, 
        aiSettings.cvAnalysisPrompt
      );
      
      const formattedInsights = `
**CV Analysis for ${selectedHire.name}**
**File:** ${uploadedFile.name}
**Analysis Date:** ${new Date().toLocaleDateString()}

${insights}

---
*Analysis powered by Google Gemini AI*
      `;

      setCvInsights(formattedInsights);
      
      toast({
        title: "CV Analysis Complete",
        description: "Successfully analyzed the CV using Gemini AI"
      });
    } catch (error: any) {
      console.error('CV Analysis Error:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze CV. Please check your API configuration in Settings.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateEmail = async () => {
    if (!selectedHire || !cvInsights) {
      toast({
        title: "Missing Information",
        description: "Please analyze a CV first before generating the email",
        variant: "destructive"
      });
      return;
    }

    if (!aiSettings?.geminiApiKey || !aiSettings?.enabled) {
      toast({
        title: "AI Service Not Configured",
        description: "Please configure Gemini AI in Settings first",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Use AI to generate personalized welcome email
      const newHireInfo = `Name: ${selectedHire.name}
Position: ${selectedHire.title}
Department: ${selectedHire.department}
Email: ${selectedHire.email}
Manager/Direct Report: ${selectedHire.direct_report || 'TBD'}
Start Date: ${selectedHire.on_site_date ? new Date(selectedHire.on_site_date).toLocaleDateString() : 'TBD'}`;

      // Use custom prompt if available, otherwise fall back to default
      const defaultEmailPrompt = `Based on the following new hire information and CV analysis, create a personalized welcome email:

**New Hire Information:**
{newHireInfo}

**CV Analysis:**
{cvAnalysis}

**Email Requirements:**
- Professional but not overly formal
- Personalized based on their background
- Encouraging and supportive

**Content Guidelines:**
- Reference specific skills or experiences from their CV
- Mention how their background aligns with the role
- Include relevant company culture elements
- Keep the email concise but meaningful
- End with clear next steps or contact information

Please generate a complete email that feels personal and genuine, not templated.`;

      // Replace placeholders in prompt (custom or default)
      let emailPrompt = aiSettings.emailComposerPrompt && aiSettings.emailComposerPrompt.trim() 
        ? aiSettings.emailComposerPrompt 
        : defaultEmailPrompt;
      
      emailPrompt = emailPrompt
        .replace('{newHireInfo}', newHireInfo)
        .replace('{cvAnalysis}', cvInsights);

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: emailPrompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2000,
        }
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${aiSettings.geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate email');
      }

      const data = await response.json();
      const generatedEmail = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Failed to generate email content';

      setEmailContent(generatedEmail);
      
      toast({
        title: "Email Generated",
        description: "Personalized welcome email has been created successfully"
      });
    } catch (error: any) {
      console.error('Email Generation Error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedHire || !emailContent) {
      toast({
        title: "Missing Information",
        description: "Please generate an email first before saving",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      // Here you would typically save to a backend service
      // For now, we'll simulate saving to localStorage
      const draftData = {
        hireId: selectedHire.id,
        hireName: selectedHire.name,
        emailContent,
        cvInsights,
        savedAt: new Date().toISOString(),
        fileName: uploadedFile?.name
      };

      const existingDrafts = JSON.parse(localStorage.getItem('emailDrafts') || '[]');
      const updatedDrafts = [...existingDrafts, draftData];
      localStorage.setItem('emailDrafts', JSON.stringify(updatedDrafts));

      toast({
        title: "Draft Saved",
        description: "Email draft has been saved successfully"
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save draft. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedHire || !emailContent) {
      toast({
        title: "Missing Information",
        description: "Please generate an email first before sending",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);
    try {
      // Here you would typically send via your email service
      // For now, we'll simulate the sending process
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({
        title: "Email Sent",
        description: `Welcome email has been sent to ${selectedHire.email}`
      });

      // Clear the form after successful send
      setEmailContent("");
      setCvInsights("");
      setUploadedFile(null);
      setFilePreview("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      toast({
        title: "Send Failed",
        description: "Failed to send email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Panel - Hire Selection and CV Analysis */}
      <div className="space-y-6">
        {/* AI Configuration Status */}
        {(!aiSettings?.enabled || !aiSettings?.geminiApiKey) && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-orange-700">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm font-medium">AI Service Configuration Required</p>
              </div>
              <p className="text-sm text-orange-600 mt-1">
                Please configure Gemini AI in Settings to enable CV analysis.
              </p>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <a href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Go to Settings
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Hire Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Select New Hire
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Loading hires...
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {hires.map((hire) => (
                    <div
                      key={hire.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedHire?.id === hire.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedHire(hire)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <div>
                            <p className="font-medium">{hire.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {hire.title} • {hire.department}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {hire.account_creation_status || "Pending"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* CV Analysis */}
        {selectedHire && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                CV Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium">{selectedHire.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedHire.title} • {selectedHire.department}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Email: {selectedHire.email}
                  </p>
                </div>
                
                {/* CV File Upload */}
                <div className="space-y-4">
                  <Separator />
                  <div className="space-y-2">
                    <Label>Upload CV File</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex-1"
                      >
                        {isUploading ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Choose CV File
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Supported formats: PDF, DOC, DOCX, TXT (max 10MB)
                    </p>
                  </div>

                  {/* Uploaded File Preview */}
                  {uploadedFile && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <File className="h-4 w-4 text-green-600" />
                          <div>
                            <p className="text-sm font-medium text-green-800">
                              {uploadedFile.name}
                            </p>
                            <p className="text-xs text-green-600">
                              {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={removeUploadedFile}
                          className="text-green-600 hover:text-green-800"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      {filePreview && (
                        <div className="mt-2 p-2 bg-white rounded text-xs text-gray-600 max-h-20 overflow-y-auto">
                          {filePreview}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <Button 
                  onClick={handleAnalyzeCV}
                  disabled={isAnalyzing || !aiSettings?.enabled || !aiSettings?.geminiApiKey || !uploadedFile}
                  className="w-full"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Processing CV...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Analyze CV with Gemini
                    </>
                  )}
                </Button>

                {cvInsights && (
                  <div className="space-y-2">
                    <Label>CV Insights</Label>
                    <Textarea
                      value={cvInsights}
                      onChange={(e) => setCvInsights(e.target.value)}
                      rows={10}
                      className="font-mono text-sm"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Panel - Email Generation and Preview */}
      <div className="space-y-6">
        {/* Email Generation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Welcome Email Generator
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button
                onClick={handleGenerateEmail}
                disabled={!selectedHire || !cvInsights || isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating Email...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Personalized Email
                  </>
                )}
              </Button>

              {emailContent && (
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={handleSaveDraft}
                    disabled={isSaving}
                    variant="outline"
                    className="flex-1"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save as Draft
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleSendEmail}
                    disabled={isSending}
                    className="flex-1"
                  >
                    {isSending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Email
                      </>
                    )}
                  </Button>
                </div>
              )}

              {emailContent && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Email Preview</Label>
                    <Button variant="outline" size="sm">
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </Button>
                  </div>
                  <Textarea
                    value={emailContent}
                    onChange={(e) => setEmailContent(e.target.value)}
                    rows={20}
                    className="font-mono text-sm"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}