
import apiClient from './api-client';
import { srfService } from './srf-service';

interface EmailRecipient {
  emailAddress: {
    address: string;
    name?: string;
  };
}

interface EmailMessage {
  subject: string;
  body: {
    contentType: 'Text' | 'HTML';
    content: string;
  };
  toRecipients: EmailRecipient[];
  ccRecipients?: EmailRecipient[];
  bccRecipients?: EmailRecipient[];
  attachments?: Array<{
    "@odata.type": string;
    name: string;
    contentBytes: string;
    contentType: string;
  }>;
}

interface LicenseRequestEmailData {
  recipients?: string[] | string; // Support both array and single string
  recipient?: string; // For backward compatibility
  ccRecipients?: string[];
  bccRecipients?: string[];
  hires: Array<{
    id?: string;
    name: string;
    department: string;
    email: string;
    title: string;
    microsoft_365_license: string;
    srf_document_path?: string; // Database path to SRF file
    srf_document_name?: string; // Original filename
  }>;
  includeAttachments?: boolean;
}

interface EmailSendResult {
  success: boolean;
  message: string;
  sentCount?: number;
  failedCount?: number;
  errors?: string[];
  recipients?: {
    to: string[];
    cc: string[];
    bcc: string[];
  };
}

export const microsoftGraphService = {
  // Send license request email using Microsoft Graph API
  sendLicenseRequestEmail: async (emailData: LicenseRequestEmailData): Promise<EmailSendResult> => {
    try {
      // If attachments are requested, we'll let the backend handle the file processing
      // since it has direct access to the file system and database paths
      
      const requestData = {
        // Support both new multi-recipient format and old single recipient format
        recipients: emailData.recipients || emailData.recipient,
        ccRecipients: emailData.ccRecipients,
        bccRecipients: emailData.bccRecipients,
        hires: emailData.hires,
        includeAttachments: emailData.includeAttachments
      };

      const response = await apiClient.post<EmailSendResult>('/settings/microsoft-graph/send-license-request', requestData);
      return response.data;
    } catch (error) {
      console.error('Error sending license request email:', error);
      throw error;
    }
  },

  // Test Microsoft Graph email functionality with actual sending
  testEmailSend: async (testRecipient: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>('/settings/microsoft-graph/test-email', {
        recipient: testRecipient
      });
      return response.data;
    } catch (error) {
      console.error('Error testing email send:', error);
      throw error;
    }
  },

  getEmailTemplate: async (hires: LicenseRequestEmailData['hires']): Promise<{ subject: string; body: string }> => {
    try {
      const response = await apiClient.post<{ subject: string; body: string }>('/settings/microsoft-graph/email-template-preview', {
        hires
      });
      return response.data;
    } catch (error) {
      console.error('Error getting email template:', error);
      throw error;
    }
  }
};
