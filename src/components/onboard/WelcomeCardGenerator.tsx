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
import html2canvas from 'html2canvas';
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

// Define html2canvas options interface based on the library's actual options
interface Html2CanvasOptions {
  allowTaint?: boolean;
  backgroundColor?: string | null;
  canvas?: HTMLCanvasElement;
  foreignObjectRendering?: boolean;
  imageTimeout?: number;
  ignoreElements?: (element: Element) => boolean;
  logging?: boolean;
  onclone?: (clonedDoc: Document, element: HTMLElement) => void;
  proxy?: string;
  removeContainer?: boolean;
  scale?: number;
  useCORS?: boolean;
  width?: number;
  height?: number;
  scrollX?: number;
  scrollY?: number;
  windowWidth?: number;
  windowHeight?: number;
}

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
  const [isDownloading, setIsDownloading] = useState(false);
  
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
  setIsDownloading(true);

  try {
    // 1) Wait for webfonts & all <img> to finish loading
    await (document as any).fonts?.ready;
    await waitForImagesToLoad(cardRef.current);

    // 2) Scroll card into view & let layout settle
    cardRef.current.scrollIntoView({ block: 'center' });
    await new Promise((r) => setTimeout(r, 100));

    // 3) Inline styles + strip backgrounds
    function prepareNode(root: HTMLElement) {
      const queue = [root];
      while (queue.length) {
        const el = queue.shift()!;

        // Get computed styles once
        const cs = getComputedStyle(el);

        // Build an inline style string for everything *except* background-image
        const inline = Array.from(cs)
          .filter(prop => prop !== 'background-image')
          .map(prop => `${prop}:${cs.getPropertyValue(prop)};`)
          .join('');
        el.setAttribute('style', inline);

        // Only clear background on child elements, not the root
        if (el !== root) {
          el.style.backgroundImage = 'none';
          el.style.background      = 'none';
        }

        // enqueue children
        for (const child of Array.from(el.children)) {
          if (child instanceof HTMLElement) queue.push(child);
        }
      }
    }

    prepareNode(cardRef.current);

    // 4) Capture with html2canvas default renderer
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(cardRef.current, {
      useCORS:      true,
      allowTaint:   false,
      backgroundColor: '#ffffff',
      scale:        2,
      logging:      false,

      // Skip any canvas or broken images inside your card
      ignoreElements: (el) => {
        if (el.tagName === 'CANVAS') return true;
        if (el.tagName === 'IMG') {
          const img = el as HTMLImageElement;
          return !img.complete || img.naturalWidth === 0;
        }
        return false;
      },
    } as any);

    // 5) Download PNG
    const blob = await new Promise<Blob>((res) => canvas.toBlob(res, 'image/png', 0.95)!);
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href      = url;
    a.download  = `welcome-card-${selectedHire?.name?.replace(/\s+/g,'-').toLowerCase() || 'card'}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    toast({ title: 'Card Downloaded', description: 'Your PNG is ready.' });
  } catch (err: any) {
    console.error('Error downloading card:', err);
    toast({
      title: 'Download Failed',
      description: err.message || 'Something went wrong.',
      variant: 'destructive',
    });
  } finally {
    setIsDownloading(false);
  }
};






  // Helper function to validate and fix problematic images
  const validateAndFixImages = (element: HTMLElement): Promise<void> => {
    return new Promise((resolve) => {
      const images = element.querySelectorAll('img');
      
      images.forEach((img) => {
        // If image has zero dimensions or failed to load, replace with placeholder
        if (img.naturalWidth === 0 || img.naturalHeight === 0 || !img.complete) {
          // Create a placeholder div instead of broken image
          const placeholder = document.createElement('div');
          placeholder.style.width = img.style.width || '64px';
          placeholder.style.height = img.style.height || '64px';
          placeholder.style.backgroundColor = '#f0f0f0';
          placeholder.style.border = '2px dashed #ccc';
          placeholder.style.display = 'flex';
          placeholder.style.alignItems = 'center';
          placeholder.style.justifyContent = 'center';
          placeholder.style.fontSize = '12px';
          placeholder.style.color = '#666';
          placeholder.textContent = 'Image';
          placeholder.style.borderRadius = img.style.borderRadius || '0';
          
          // Replace the image with placeholder
          img.parentNode?.replaceChild(placeholder, img);
        }
      });
      
      // Small delay to ensure DOM updates are complete
      setTimeout(resolve, 100);
    });
  };

  // Helper function to wait for all images to load
  const waitForImagesToLoad = (element: HTMLElement): Promise<void> => {
    return new Promise((resolve) => {
      const images = element.querySelectorAll('img');
      if (images.length === 0) {
        resolve();
        return;
      }

      let loadedCount = 0;
      const totalImages = images.length;
      let timeoutId: NodeJS.Timeout;

      const checkComplete = () => {
        loadedCount++;
        if (loadedCount === totalImages) {
          clearTimeout(timeoutId);
          // Add small delay to ensure rendering is complete
          setTimeout(resolve, 200);
        }
      };

      // Set a timeout to prevent hanging indefinitely
      timeoutId = setTimeout(() => {
        console.warn('Image loading timeout reached, proceeding anyway');
        resolve();
      }, 5000); // 5 second timeout

      images.forEach((img) => {
        // Check if image is already loaded and has valid dimensions
        if (img.complete && img.naturalHeight > 0 && img.naturalWidth > 0) {
          checkComplete();
        } else if (img.complete && (img.naturalHeight === 0 || img.naturalWidth === 0)) {
          // Image failed to load, count it as complete
          console.warn('Image failed to load:', img.src);
          checkComplete();
        } else {
          // Image is still loading
          const handleLoad = () => {
            img.removeEventListener('load', handleLoad);
            img.removeEventListener('error', handleError);
            checkComplete();
          };
          
          const handleError = () => {
            img.removeEventListener('load', handleLoad);
            img.removeEventListener('error', handleError);
            console.warn('Image load error:', img.src);
            checkComplete();
          };
          
          img.addEventListener('load', handleLoad);
          img.addEventListener('error', handleError);
        }
      });
    });
  };

  // Generate HTML content for the welcome card
  const generateCardHTML = (): string => {
    if (!cardRef.current) {
      throw new Error('Card element not found');
    }

    // Get the card element's HTML content
    const cardElement = cardRef.current;
    const cardHTML = cardElement.outerHTML;
    
    // Create a complete HTML document with embedded styles
    const fullHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome Card - ${selectedHire?.name || 'New Team Member'}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f5f5f5;
            padding: 20px;
            line-height: 1.6;
        }
        
        .welcome-card-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        /* Material UI Card styles */
        .MuiCard-root {
            background-color: #fff;
            color: rgba(0, 0, 0, 0.87);
            transition: box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
            border-radius: 4px;
            box-shadow: 0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12);
            overflow: hidden;
        }
        
        .MuiCardContent-root {
            padding: 16px;
        }
        
        .MuiCardContent-root:last-child {
            padding-bottom: 16px;
        }
        
        /* Typography styles */
        .MuiTypography-h4 {
            font-size: 2.125rem;
            font-family: "Roboto", "Helvetica", "Arial", sans-serif;
            font-weight: 400;
            line-height: 1.235;
            letter-spacing: 0.00735em;
            margin-bottom: 0.35em;
        }
        
        .MuiTypography-h6 {
            font-size: 1.25rem;
            font-family: "Roboto", "Helvetica", "Arial", sans-serif;
            font-weight: 500;
            line-height: 1.6;
            letter-spacing: 0.0075em;
        }
        
        .MuiTypography-body1 {
            font-size: 1rem;
            font-family: "Roboto", "Helvetica", "Arial", sans-serif;
            font-weight: 400;
            line-height: 1.5;
            letter-spacing: 0.00938em;
        }
        
        /* Avatar styles */
        .MuiAvatar-root {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            width: 40px;
            height: 40px;
            font-family: "Roboto", "Helvetica", "Arial", sans-serif;
            font-size: 1.25rem;
            line-height: 1;
            border-radius: 50%;
            overflow: hidden;
            user-select: none;
        }
        
        .MuiAvatar-img {
            width: 100%;
            height: 100%;
            text-align: center;
            object-fit: cover;
            color: transparent;
            text-indent: 10000px;
        }
        
        /* Box and layout styles */
        .MuiBox-root {
            box-sizing: border-box;
        }
        
        /* Responsive styles */
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            
            .welcome-card-container {
                margin: 0;
            }
            
            .MuiTypography-h4 {
                font-size: 1.75rem;
            }
        }
        
        /* Print styles */
        @media print {
            body {
                background-color: white;
                padding: 0;
            }
            
            .welcome-card-container {
                box-shadow: none;
                border: 1px solid #ddd;
            }
        }
    </style>
</head>
<body>
    <div class="welcome-card-container">
        ${cardHTML}
    </div>
</body>
</html>`;

    return fullHTML;
  };

  // Create email content with embedded card HTML
  const createEmailWithCardHTML = (): string => {
    // Generate the card HTML
    const cardHTML = generateCardHTML();
    
    // Create a clean HTML email template with the card embedded directly
    const emailHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Team Member Announcement</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f5f5f5;
            line-height: 1.6;
        }
        .email-container {
            max-width: 700px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .email-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .email-header h1 {
            margin: 0 0 10px 0;
            font-size: 24px;
            font-weight: 600;
        }
        .email-header p {
            margin: 0;
            font-size: 16px;
            opacity: 0.9;
        }
        .email-content {
            padding: 30px 20px;
        }
        .email-content p {
            margin: 0 0 15px 0;
            color: #333333;
            font-size: 16px;
        }
        .card-container {
            margin: 30px 0;
            padding: 20px;
            background-color: #f8f9fa;
            border-radius: 8px;
            text-align: center;
        }
        .embedded-card {
            display: inline-block;
            max-width: 100%;
            margin: 0 auto;
        }
        .email-footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        .email-footer p {
            margin: 5px 0;
            color: #6c757d;
            font-size: 14px;
        }
        .highlight {
            font-weight: 600;
            color: #495057;
        }
        @media only screen and (max-width: 600px) {
            .email-container {
                margin: 10px;
                border-radius: 0;
            }
            .email-content {
                padding: 20px 15px;
            }
            .email-header {
                padding: 20px 15px;
            }
            .card-container {
                padding: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <h1>🎉 New Team Member Announcement</h1>
            <p>PT. Merdeka Tsingshan Indonesia</p>
        </div>
        <div class="email-content">
            <p>Dear All,</p>
            <p>Please welcome <span class="highlight">${selectedHire?.name}</span> to PT. Merdeka Tsingshan Indonesia! ${selectedHire?.name} joins us as our new <span class="highlight">${selectedHire?.title}</span> and brings valuable experience to our team.</p>
            
            <div class="card-container">
                <div class="embedded-card">
                    ${cardRef.current?.outerHTML || ''}
                </div>
            </div>
            
            <p>We're thrilled to have ${selectedHire?.name} as our new ${selectedHire?.title} and look forward to working with them!</p>
            <p>Best regards,<br><span class="highlight">PT. Merdeka Tsingshan Indonesia Team</span></p>
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
      // Create email content with embedded card HTML
      const htmlContent = createEmailWithCardHTML();
      
      // Create email data for Microsoft Graph API
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
          description: `Welcome card email has been sent to ${toEmail}`,
        });
      } else {
        throw new Error(result.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending welcome card email:', error);
      
      let errorMessage = 'Failed to send welcome card email';
      let errorDescription = 'Please try again or contact support if the issue persists.';
      
      if (error.message.includes('zero dimensions') || error.message.includes('Card element')) {
        errorMessage = 'Card Rendering Issue';
        errorDescription = 'The welcome card could not be captured. Please ensure the card is visible and try again.';
      } else if (error.message.includes('Failed to capture')) {
        errorMessage = 'Image Capture Failed';
        errorDescription = 'Unable to generate card image. Please check your browser settings and try again.';
      }
      
      toast({
        title: errorMessage,
        description: errorDescription,
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
              disabled={!customMessage || isDownloading}
              className="flex-1"
            >
              {isDownloading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download Card
                </>
              )}
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
          <div ref={cardRef} data-card-ref="welcome-card" className="bg-gray-50 p-8 rounded-lg">
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