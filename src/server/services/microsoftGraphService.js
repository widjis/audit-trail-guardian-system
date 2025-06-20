
import { Client } from '@microsoft/microsoft-graph-client';
import { ConfidentialClientApplication } from '@azure/msal-node';

class MicrosoftGraphService {
  constructor() {
    this.msalClient = null;
    this.graphClient = null;
  }

  // Initialize MSAL client with settings
  initializeMsalClient(settings) {
    const clientConfig = {
      auth: {
        clientId: settings.clientId,
        clientSecret: settings.clientSecret,
        authority: settings.authority || `https://login.microsoftonline.com/${settings.tenantId}`
      }
    };

    this.msalClient = new ConfidentialClientApplication(clientConfig);
  }

  // Get access token using client credentials flow
  async getAccessToken(settings) {
    if (!this.msalClient) {
      this.initializeMsalClient(settings);
    }

    const clientCredentialRequest = {
      scopes: settings.scope || ['https://graph.microsoft.com/.default'],
    };

    try {
      const response = await this.msalClient.acquireTokenByClientCredential(clientCredentialRequest);
      return response.accessToken;
    } catch (error) {
      console.error('Error acquiring access token:', error);
      throw new Error(`Failed to acquire access token: ${error.message}`);
    }
  }

  // Initialize Graph client with access token
  async initializeGraphClient(settings) {
    const accessToken = await this.getAccessToken(settings);
    
    this.graphClient = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      }
    });

    return this.graphClient;
  }

  // Helper to format email recipients for Graph API
  formatRecipients(recipients) {
    if (typeof recipients === 'string') {
      // Single recipient or comma-separated string
      return recipients.split(',').map(email => ({
        emailAddress: {
          address: email.trim(),
          name: email.trim()
        }
      }));
    } else if (Array.isArray(recipients)) {
      // Array of recipients
      return recipients.map(recipient => {
        if (typeof recipient === 'string') {
          return {
            emailAddress: {
              address: recipient.trim(),
              name: recipient.trim()
            }
          };
        } else if (recipient.email || recipient.address) {
          return {
            emailAddress: {
              address: recipient.email || recipient.address,
              name: recipient.name || recipient.email || recipient.address
            }
          };
        }
        return null;
      }).filter(Boolean);
    }
    return [];
  }

  // Send email using Microsoft Graph API
  async sendEmail(settings, emailData) {
    try {
      console.log('Initializing Microsoft Graph client...');
      const graphClient = await this.initializeGraphClient(settings);

      // Determine sender email
      let senderEmail = settings.senderEmail;
      if (!senderEmail && settings.username && this.isValidEmail(settings.username)) {
        senderEmail = settings.username;
      }

      if (!senderEmail) {
        throw new Error('No sender email configured. Please set a sender email in Microsoft Graph settings.');
      }

      console.log(`Sending email from: ${senderEmail}`);

      // Format recipients - support both old single recipient and new multiple recipients
      const toRecipients = emailData.recipients ? 
        this.formatRecipients(emailData.recipients) : 
        this.formatRecipients(emailData.recipient);

      const ccRecipients = emailData.ccRecipients ? 
        this.formatRecipients(emailData.ccRecipients) : [];

      const bccRecipients = emailData.bccRecipients ? 
        this.formatRecipients(emailData.bccRecipients) : [];

      console.log(`Sending email to: ${toRecipients.map(r => r.emailAddress.address).join(', ')}`);
      if (ccRecipients.length > 0) {
        console.log(`CC: ${ccRecipients.map(r => r.emailAddress.address).join(', ')}`);
      }
      if (bccRecipients.length > 0) {
        console.log(`BCC: ${bccRecipients.map(r => r.emailAddress.address).join(', ')}`);
      }
      console.log(`Email subject: ${emailData.subject}`);
      console.log(`Email content type: ${emailData.body.contentType}`);

      // Prepare email message
      const message = {
        subject: emailData.subject,
        body: {
          contentType: emailData.body.contentType || 'Text', // Support both HTML and Text
          content: emailData.body.content
        },
        toRecipients: toRecipients,
        from: {
          emailAddress: {
            address: senderEmail,
            name: emailData.senderName || 'HR Department'
          }
        }
      };

      // Add CC recipients if any
      if (ccRecipients.length > 0) {
        message.ccRecipients = ccRecipients;
      }

      // Add BCC recipients if any
      if (bccRecipients.length > 0) {
        message.bccRecipients = bccRecipients;
      }

      // Add attachments if provided
      if (emailData.attachments && emailData.attachments.length > 0) {
        message.attachments = emailData.attachments.map(attachment => ({
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: attachment.filename,
          contentBytes: attachment.content,
          contentType: attachment.contentType
        }));
        console.log(`Adding ${emailData.attachments.length} attachments`);
      }

      // Send the email using the appropriate endpoint
      let sendResult;
      try {
        console.log('Attempting to send email via /me/sendMail...');
        sendResult = await graphClient.api('/me/sendMail').post({
          message: message,
          saveToSentItems: true
        });
        console.log('Email sent successfully via /me/sendMail');
      } catch (meError) {
        console.log('Failed to send via /me/sendMail, trying /users endpoint:', meError.message);
        
        // Try with users endpoint
        sendResult = await graphClient.api(`/users/${senderEmail}/sendMail`).post({
          message: message,
          saveToSentItems: true
        });
        console.log('Email sent successfully via /users endpoint');
      }

      const totalRecipients = toRecipients.length + ccRecipients.length + bccRecipients.length;
      return {
        success: true,
        message: `Email sent successfully to ${totalRecipients} recipient(s)`,
        messageId: sendResult?.id || 'sent',
        recipients: {
          to: toRecipients.map(r => r.emailAddress.address),
          cc: ccRecipients.map(r => r.emailAddress.address),
          bcc: bccRecipients.map(r => r.emailAddress.address)
        }
      };

    } catch (error) {
      console.error('Error sending email via Microsoft Graph:', error);
      
      // Provide more detailed error messages
      let errorMessage = 'Failed to send email';
      if (error.message.includes('access token')) {
        errorMessage = 'Authentication failed. Please check your Microsoft Graph credentials.';
      } else if (error.message.includes('Forbidden')) {
        errorMessage = 'Permission denied. Please ensure your app has Mail.Send permissions.';
      } else if (error.message.includes('sender email')) {
        errorMessage = error.message;
      } else {
        errorMessage = `Email sending failed: ${error.message}`;
      }

      return {
        success: false,
        message: errorMessage,
        error: error.message
      };
    }
  }

  // Test connection to Microsoft Graph
  async testConnection(settings) {
    try {
      console.log('Testing Microsoft Graph connection...');
      const graphClient = await this.initializeGraphClient(settings);
      
      // Test by getting user profile or organization info
      const result = await graphClient.api('/me').get();
      console.log('Microsoft Graph connection test successful:', result.displayName || result.id);
      
      return {
        success: true,
        message: `Successfully connected to Microsoft Graph as ${result.displayName || result.userPrincipalName || 'Service Account'}`
      };
    } catch (error) {
      console.error('Microsoft Graph connection test failed:', error);
      
      let errorMessage = 'Connection test failed';
      if (error.message.includes('access token')) {
        errorMessage = 'Authentication failed. Please verify your Client ID, Client Secret, and Tenant ID.';
      } else if (error.message.includes('AADSTS')) {
        errorMessage = 'Azure AD authentication error. Please check your app registration and permissions.';
      } else {
        errorMessage = `Connection failed: ${error.message}`;
      }
      
      return {
        success: false,
        message: errorMessage
      };
    }
  }

  // Helper method to validate email format
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Export singleton instance
export const microsoftGraphService = new MicrosoftGraphService();
