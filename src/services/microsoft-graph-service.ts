
import apiClient from './api-client';

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
}

interface LicenseRequestEmailData {
  recipient: string;
  hires: Array<{
    name: string;
    department: string;
    email: string;
    title: string;
    microsoft_365_license: string;
  }>;
}

interface EmailSendResult {
  success: boolean;
  message: string;
  sentCount?: number;
  failedCount?: number;
  errors?: string[];
}

export const microsoftGraphService = {
  // Send license request email using Microsoft Graph API
  sendLicenseRequestEmail: async (emailData: LicenseRequestEmailData): Promise<EmailSendResult> => {
    try {
      const response = await apiClient.post<EmailSendResult>('/microsoft-graph/send-license-request', emailData);
      return response.data;
    } catch (error) {
      console.error('Error sending license request email:', error);
      throw error;
    }
  },

  // Test Microsoft Graph email functionality
  testEmailSend: async (testRecipient: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>('/microsoft-graph/test-email', {
        recipient: testRecipient
      });
      return response.data;
    } catch (error) {
      console.error('Error testing email send:', error);
      throw error;
    }
  },

  // Get email template preview
  getEmailTemplate: async (hires: LicenseRequestEmailData['hires']): Promise<{ subject: string; body: string }> => {
    try {
      const response = await apiClient.post<{ subject: string; body: string }>('/microsoft-graph/email-template-preview', {
        hires
      });
      return response.data;
    } catch (error) {
      console.error('Error getting email template:', error);
      throw error;
    }
  }
};
