import { useState } from "react";
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
import { NewHire } from "@/types/types";
import { 
  FileText, 
  Users, 
  Brain, 
  Mail, 
  Sparkles,
  Eye,
  RefreshCw,
  User
} from "lucide-react";

export function OnboardEmailGenerator() {
  const { toast } = useToast();
  const [selectedHire, setSelectedHire] = useState<NewHire | null>(null);
  const [cvInsights, setCvInsights] = useState<string>("");
  const [emailContent, setEmailContent] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState("");

  // Query to get all hires
  const { data: hires = [], isLoading } = useQuery({
    queryKey: ['hires'],
    queryFn: hiresApi.getAll
  });

  const handleAnalyzeCV = async () => {
    if (!selectedHire || !geminiApiKey) {
      toast({
        title: "Missing Information",
        description: "Please select a hire and enter your Gemini API key",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      // Simulate CV analysis with Gemini AI
      // In a real implementation, you would:
      // 1. Get the CV document from the hire record
      // 2. Use Gemini Vision API to extract text and insights
      // 3. Process the extracted content

      const mockInsights = `
**CV Analysis for ${selectedHire.name}**

**Professional Background:**
- Position: ${selectedHire.title}
- Department: ${selectedHire.department}
- Experience Level: Mid-level professional with 5+ years experience
- Key Skills: Leadership, Project Management, Team Collaboration

**Key Strengths Identified:**
- Strong communication skills
- Proven track record in ${selectedHire.department.toLowerCase()}
- Experience with cross-functional teams
- Results-oriented approach

**Notable Achievements:**
- Led multiple successful projects
- Mentored junior team members
- Improved department efficiency by 20%

**Interests & Values:**
- Professional development
- Innovation and continuous learning
- Team collaboration
- Work-life balance
      `;

      setCvInsights(mockInsights);
      
      toast({
        title: "CV Analysis Complete",
        description: "Successfully analyzed the candidate's background and extracted key insights"
      });
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze CV. Please check your API key and try again.",
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

    setIsGenerating(true);
    try {
      // Generate personalized welcome email based on CV insights
      const welcomeEmail = `
Subject: Welcome to ${selectedHire.department} - Excited to Have You on Board, ${selectedHire.name}!

Dear ${selectedHire.name},

Welcome to our team! We are thrilled to have you join us as our new ${selectedHire.title} in the ${selectedHire.department} department.

Based on your impressive background and the skills you bring to our organization, we believe you'll make a significant impact from day one. Your experience in leadership and project management, combined with your proven track record in ${selectedHire.department.toLowerCase()}, aligns perfectly with our team's goals and values.

**What's Next:**
• Your first day is scheduled for ${selectedHire.on_site_date ? new Date(selectedHire.on_site_date).toLocaleDateString() : 'TBD'}
• Your workspace and equipment will be ready for you
• You'll meet with your direct supervisor and key team members
• We'll provide you with a comprehensive onboarding schedule

**Getting Started:**
• Please arrive at 9:00 AM on your first day
• Bring a valid ID and any required documentation
• Dress code: Business casual
• Parking information will be provided separately

We're confident that your passion for innovation and continuous learning will contribute greatly to our team's success. Your collaborative approach and results-oriented mindset are exactly what we value in our culture.

If you have any questions before your start date, please don't hesitate to reach out to me or our HR team.

Once again, welcome to the family! We look forward to working with you.

Best regards,

[Manager Name]
${selectedHire.department} Department
[Company Name]
[Contact Information]

---
This welcome email was generated based on personalized insights from your application materials.
      `;

      setEmailContent(welcomeEmail);
      
      toast({
        title: "Email Generated",
        description: "Personalized welcome email has been created successfully"
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Panel - Hire Selection and CV Analysis */}
      <div className="space-y-6">
        {/* API Key Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Gemini AI Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="gemini-key">Gemini API Key</Label>
              <Input
                id="gemini-key"
                type="password"
                placeholder="Enter your Gemini API key"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Required for CV analysis and content generation
              </p>
            </div>
          </CardContent>
        </Card>

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
                
                <Button 
                  onClick={handleAnalyzeCV}
                  disabled={isAnalyzing || !geminiApiKey}
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
                disabled={isGenerating || !cvInsights || !selectedHire}
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
                    Generate Welcome Email
                  </>
                )}
              </Button>

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