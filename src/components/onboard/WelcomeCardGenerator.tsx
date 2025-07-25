import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { templates } from "./WelcomeCardTemplates";
import { NewHire } from "@/types/types";
import { microsoftGraphService } from "@/services/microsoft-graph-service";
import { 
  Upload, 
  Download, 
  Eye, 
  RefreshCw,
  Image as ImageIcon,
  X,
  CheckCircle,
  Mail,
  Send
} from "lucide-react";

interface WelcomeCardGeneratorProps {
  selectedHire: NewHire | null;
  emailContent: string;
}

export function WelcomeCardGenerator({ selectedHire, emailContent }: WelcomeCardGeneratorProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [uploadedPhoto, setUploadedPhoto] = useState<string>("");
  const [customMessage, setCustomMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  // Email fields
  const [fromEmail, setFromEmail] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("Welcome to PT. Merdeka Tsingshan Indonesia!");

  // Extract welcome message from email content
  const extractWelcomeMessage = (content: string): string => {
    if (!content) return "";
    
    // Try to extract meaningful content from the email
    const lines = content.split('\n').filter(line => line.trim());
    const meaningfulLines = lines.filter(line => 
      !line.includes('Subject:') && 
      !line.includes('Dear') && 
      !line.includes('Best regards') &&
      !line.includes('Sincerely') &&
      line.length > 20
    );
    
    return meaningfulLines.slice(0, 3).join(' ').substring(0, 200) + '...';
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a JPG, PNG, or WebP image",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedPhoto(e.target?.result as string);
        toast({
          title: "Photo Uploaded",
          description: "Successfully uploaded profile photo",
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = () => {
    setUploadedPhoto("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const generateWelcomeMessage = () => {
    if (!emailContent) {
      toast({
        title: "No Email Content",
        description: "Please generate an email first to extract the welcome message",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setTimeout(() => {
      const message = extractWelcomeMessage(emailContent);
      setCustomMessage(message);
      setIsGenerating(false);
      toast({
        title: "Message Generated",
        description: "Welcome message extracted from email content",
      });
    }, 1000);
  };

  const downloadCard = async () => {
    if (!cardRef.current) return;

    try {
      // Import html2canvas dynamically
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(cardRef.current, {
        background: null,
        useCORS: true,
        allowTaint: true,
        width: cardRef.current.scrollWidth * 2,
        height: cardRef.current.scrollHeight * 2,
      });

      const link = document.createElement('a');
      link.download = `welcome-card-${selectedHire?.name?.replace(/\s+/g, '-').toLowerCase() || 'new-hire'}.png`;
      link.href = canvas.toDataURL();
      link.click();

      toast({
        title: "Card Downloaded",
        description: "Welcome card saved successfully",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download card. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Convert the welcome card to HTML for email
  const convertCardToHTML = (): string => {
    if (!cardRef.current) return "";

    // Get the card HTML content
    const cardHTML = cardRef.current.innerHTML;
    
    // Create a complete HTML email template
    const emailHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome Card</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f5f5f5;
        }
        .email-container {
            max-width: 800px;
            margin: 0 auto;
            background-color: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .email-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            text-align: center;
        }
        .email-content {
            padding: 20px;
        }
        .card-container {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .email-footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        /* Inline all the Tailwind classes used in the card */
        .bg-gradient-to-br { background: linear-gradient(to bottom right, var(--tw-gradient-stops)); }
        .shadow-xl { box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); }
        .rounded-lg { border-radius: 0.5rem; }
        .p-8 { padding: 2rem; }
        .text-center { text-align: center; }
        .mb-6 { margin-bottom: 1.5rem; }
        .mb-4 { margin-bottom: 1rem; }
        .mb-2 { margin-bottom: 0.5rem; }
        .text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
        .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
        .text-2xl { font-size: 1.5rem; line-height: 2rem; }
        .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
        .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
        .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
        .text-xs { font-size: 0.75rem; line-height: 1rem; }
        .font-bold { font-weight: 700; }
        .font-semibold { font-weight: 600; }
        .font-medium { font-weight: 500; }
        .w-28 { width: 7rem; }
        .h-28 { height: 7rem; }
        .w-8 { width: 2rem; }
        .h-8 { height: 2rem; }
        .w-auto { width: auto; }
        .mx-auto { margin-left: auto; margin-right: auto; }
        .object-cover { object-fit: cover; }
        .rounded-full { border-radius: 9999px; }
        .rounded { border-radius: 0.25rem; }
        .border-4 { border-width: 4px; }
        .border-2 { border-width: 2px; }
        .border { border-width: 1px; }
        .inline-block { display: inline-block; }
        .flex { display: flex; }
        .items-center { align-items: center; }
        .justify-center { justify-content: center; }
        .gap-3 { gap: 0.75rem; }
        .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
        .px-4 { padding-left: 1rem; padding-right: 1rem; }
        .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
        .leading-relaxed { line-height: 1.625; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <h1>Welcome to PT. Merdeka Tsingshan Indonesia!</h1>
            <p>We're excited to have ${selectedHire?.name} join our team</p>
        </div>
        <div class="email-content">
            <p>Dear ${selectedHire?.name},</p>
            <p>Welcome to PT. Merdeka Tsingshan Indonesia! We've prepared a special welcome card for you:</p>
            
            <div class="card-container">
                ${cardHTML}
            </div>
            
            <p>We're thrilled to have you as our new ${selectedHire?.title} and look forward to working with you!</p>
            <p>Best regards,<br>PT. Merdeka Tsingshan Indonesia Team</p>
        </div>
        <div class="email-footer">
            <p>This email was sent from PT. Merdeka Tsingshan Indonesia</p>
            <p>© ${new Date().getFullYear()} PT. Merdeka Tsingshan Indonesia. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

    return emailHTML;
  };

  // Send welcome card via email
  const sendWelcomeCardEmail = async () => {
    if (!fromEmail || !toEmail) {
      toast({
        title: "Missing Email Information",
        description: "Please fill in both From and To email addresses",
        variant: "destructive"
      });
      return;
    }

    if (!customMessage) {
      toast({
        title: "Missing Welcome Message",
        description: "Please add a welcome message before sending",
        variant: "destructive"
      });
      return;
    }

    setIsSendingEmail(true);
    try {
      const htmlContent = convertCardToHTML();
      
      // Create email data for Microsoft Graph
      const emailData = {
        fromEmail: fromEmail,
        toEmail: toEmail,
        subject: emailSubject,
        htmlContent: htmlContent
      };

      // Send email using Microsoft Graph service
      const response = await fetch('/api/settings/microsoft-graph/send-welcome-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Email Sent Successfully",
          description: `Welcome card sent to ${toEmail}`,
        });
      } else {
        throw new Error(result.message || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending welcome card email:', error);
      toast({
        title: "Email Send Failed",
        description: error instanceof Error ? error.message : "Failed to send welcome card email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const SelectedTemplateComponent = templates[selectedTemplate]?.component;

  if (!selectedHire) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Welcome Card Generator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Please select a new hire to generate a welcome card
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Card Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Welcome Card Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Select Template</Label>
            <Select value={selectedTemplate.toString()} onValueChange={(value) => setSelectedTemplate(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label>Profile Photo</Label>
            <div className="flex items-center gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
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
                    Upload Photo
                  </>
                )}
              </Button>
              {uploadedPhoto && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={removePhoto}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Supported formats: JPG, PNG, WebP (max 5MB)
            </p>
            
            {uploadedPhoto && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Photo uploaded successfully</span>
                </div>
                <div className="mt-2">
                  <img
                    src={uploadedPhoto}
                    alt="Preview"
                    className="w-16 h-16 object-cover rounded border"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Welcome Message */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Welcome Message</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={generateWelcomeMessage}
                disabled={isGenerating || !emailContent}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Extract from Email
                  </>
                )}
              </Button>
            </div>
            <Textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Enter a personalized welcome message..."
              rows={4}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={downloadCard}
              disabled={!customMessage}
              className="flex-1"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Card
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Welcome Card via Email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Email Subject */}
          <div className="space-y-2">
            <Label htmlFor="email-subject">Email Subject</Label>
            <Input
              id="email-subject"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Enter email subject..."
            />
          </div>

          {/* From and To Email Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="from-email">From Email</Label>
              <Input
                id="from-email"
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="sender@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to-email">To Email</Label>
              <Input
                id="to-email"
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder={selectedHire?.email || "recipient@email.com"}
              />
            </div>
          </div>

          {/* Send Email Button */}
          <div className="flex gap-2">
            <Button
              onClick={sendWelcomeCardEmail}
              disabled={!customMessage || !fromEmail || !toEmail || isSendingEmail}
              className="flex-1"
            >
              {isSendingEmail ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Sending Email...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Welcome Card Email
                </>
              )}
            </Button>
          </div>

          {/* Email Preview Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Email Preview:</p>
                <p><strong>Subject:</strong> {emailSubject}</p>
                <p><strong>From:</strong> {fromEmail || "Not specified"}</p>
                <p><strong>To:</strong> {toEmail || "Not specified"}</p>
                <p className="mt-2 text-xs text-blue-600">
                  The welcome card will be embedded as HTML content in the email body with professional styling.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div ref={cardRef} className="bg-gray-50 p-8 rounded-lg">
            {SelectedTemplateComponent && (
              <SelectedTemplateComponent
                name={selectedHire.name}
                position={selectedHire.title}
                message={customMessage || "Welcome to our amazing team! We're excited to have you on board and look forward to the great things we'll accomplish together."}
                photo={uploadedPhoto}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}