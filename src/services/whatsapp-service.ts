
import apiClient from "./api-client";
import { NewHire } from "@/types/types";
import logger from "@/utils/logger";

interface WhatsAppSettings {
  apiUrl: string;
  testNumber: string;
  defaultMessage: string;
  defaultRecipient: "userNumber" | "testNumber";
  newHireNotificationEnabled: boolean;
  newHireNotificationTemplate: string;
  newHireNotificationRecipients: string[];
  groupNotificationEnabled: boolean;
  groupId?: string;
  groupName?: string;
  groupMentions?: string[];
}

// Service for WhatsApp integration
export const whatsappService = {
  // Get WhatsApp API settings
  getSettings: async (): Promise<WhatsAppSettings> => {
    const response = await apiClient.get("/settings/whatsapp");
    return response.data;
  },

  // Save WhatsApp API settings
  saveSettings: async (settings: WhatsAppSettings): Promise<WhatsAppSettings> => {
    const response = await apiClient.put("/settings/whatsapp", settings);
    return response.data;
  },

  // Test the URL currently entered in the settings form.
  testConnection: async (apiUrl: string, number: string): Promise<unknown> => {
    const response = await apiClient.post("/whatsapp/test-connection", {
      apiUrl,
      number
    });
    return response.data;
  },

  // Send WhatsApp message - UPDATED to use our proxy endpoint
  sendMessage: async (phoneNumber: string, message: string): Promise<unknown> => {
    logger.ui.info("WhatsApp Service", "Sending WhatsApp message to:", phoneNumber);
    
    try {
      logger.ui.debug("WhatsApp Service", "Sending to proxy endpoint");
      
      // Use our new server-side proxy endpoint instead of direct API call
      const response = await apiClient.post("/whatsapp/send", {
        number: phoneNumber,
        message: message
      });
      
      logger.ui.debug("WhatsApp Service", "Proxy response:", response.data);
      return response.data;
    } catch (error) {
      logger.ui.error("WhatsApp Service", "Error sending message:", error);
      throw error;
    }
  },

  // Send WhatsApp group message
  sendGroupMessage: async (groupId?: string, groupName?: string, message?: string, mentions?: string[]): Promise<unknown> => {
    logger.ui.info("WhatsApp Service", "Sending WhatsApp group message to:", groupId || groupName);
    
    try {
      if (!groupId && !groupName) {
        throw new Error("Either group ID or group name is required");
      }

      logger.ui.debug("WhatsApp Service", "Sending group message to proxy endpoint");
      
      // Prepare request body
      const requestBody: {
        message: string;
        id?: string;
        name?: string;
        mention?: string;
      } = {
        message: message || "Hello from Audit Trail Guardian System"
      };

      if (groupId) {
        requestBody.id = groupId;
      } else if (groupName) {
        requestBody.name = groupName;
      }

      if (mentions && mentions.length > 0) {
        requestBody.mention = JSON.stringify(mentions);
      }
      
      // Use our new server-side proxy endpoint for group messages
      const response = await apiClient.post("/whatsapp/send-group", requestBody);
      
      logger.ui.debug("WhatsApp Service", "Group proxy response:", response.data);
      return response.data;
    } catch (error) {
      logger.ui.error("WhatsApp Service", "Error sending group message:", error);
      throw error;
    }
  },

  // Generate message from template for a specific hire
  generateMessage: async (hire: NewHire): Promise<string> => {
    const settings = await whatsappService.getSettings();
    let message = settings.defaultMessage;
    
    // Replace template variables with actual values
    Object.entries(hire).forEach(([key, value]) => {
      if (typeof value === 'string' || typeof value === 'number') {
        message = message.replace(new RegExp(`{{${key}}}`, 'g'), value.toString());
      }
    });
    
    return message;
  },

  // Get recipient type based on settings
  getDefaultRecipient: async (): Promise<"userNumber" | "testNumber"> => {
    const settings = await whatsappService.getSettings();
    return settings.defaultRecipient || "userNumber";
  },

  getTestNumber: async (): Promise<string> => {
    const settings = await whatsappService.getSettings();
    return settings.testNumber || "";
  },

  // Send new hire notification (supports single hire or batch)
  sendNewHireNotification: async (hires: NewHire | NewHire[]): Promise<void> => {
    try {
      const settings = await whatsappService.getSettings();
      
      // Check if new hire notifications are enabled
      if (!settings.newHireNotificationEnabled) {
        logger.ui.info("WhatsApp Service", "New hire notifications are disabled");
        return;
      }
      
      // Check if there are recipients configured
      if (!settings.newHireNotificationRecipients || settings.newHireNotificationRecipients.length === 0) {
        logger.ui.warn("WhatsApp Service", "No recipients configured for new hire notifications");
        return;
      }
      
      // Normalize input to array
      const hireArray = Array.isArray(hires) ? hires : [hires];
      
      if (hireArray.length === 0) {
        logger.ui.warn("WhatsApp Service", "No hires provided for notification");
        return;
      }
      
      let message: string;
      
      if (hireArray.length === 1) {
        // Single hire - use template format
        const hire = hireArray[0];
        message = settings.newHireNotificationTemplate;
        
        // Check if the template has bulk variables
        const hasBulkVariables = message.includes('{{hireCount}}') || message.includes('{{hireDetails}}');
        
        if (hasBulkVariables) {
          // Use bulk format for single hire
          const hireDetails = `**${hire.name}**\n• Title: ${hire.title}\n• Department: ${hire.department}\n• Start Date: ${hire.start_date || hire.on_site_date || 'TBD'}\n• Email: ${hire.email}`;
          
          message = message.replace(new RegExp(`{{hireCount}}`, 'g'), '1');
          message = message.replace(new RegExp(`{{hireDetails}}`, 'g'), hireDetails);
        } else {
          // Use individual variable replacement for legacy templates
          Object.entries(hire).forEach(([key, value]) => {
            if (typeof value === 'string' || typeof value === 'number') {
              message = message.replace(new RegExp(`{{${key}}}`, 'g'), value.toString());
            }
          });
        }
        
        // Replace remaining individual variables
        Object.entries(hire).forEach(([key, value]) => {
          if (typeof value === 'string' || typeof value === 'number') {
            message = message.replace(new RegExp(`{{${key}}}`, 'g'), value.toString());
          }
        });
        
        // Add start date if available, fallback to on_site_date if start_date is not available
        const startDate = hire.start_date || hire.on_site_date || 'TBD';
        message = message.replace(new RegExp(`{{startDate}}`, 'g'), startDate.toString());
      } else {
        // Multiple hires - use database template with bulk variables
        const hireCount = hireArray.length;
        message = settings.newHireNotificationTemplate;
        
        // Check if the template has bulk variables ({{hireCount}} or {{hireDetails}})
        const hasBulkVariables = message.includes('{{hireCount}}') || message.includes('{{hireDetails}}');
        
        if (hasBulkVariables) {
          // Template supports bulk variables - use them
          let hireDetails = '';
          hireArray.forEach((hire, index) => {
            const startDate = hire.start_date || hire.on_site_date || 'TBD';
            hireDetails += `${index + 1}. **${hire.name}**\n`;
            hireDetails += `   • Title: ${hire.title}\n`;
            hireDetails += `   • Department: ${hire.department}\n`;
            hireDetails += `   • Start Date: ${startDate}\n`;
            hireDetails += `   • Email: ${hire.email}\n\n`;
          });
          
          // Replace bulk-specific variables
          message = message.replace(new RegExp(`{{hireCount}}`, 'g'), hireCount.toString());
          message = message.replace(new RegExp(`{{hireDetails}}`, 'g'), hireDetails);
          
          // For multiple hires, use the first hire's data for other variables as fallback
          const firstHire = hireArray[0];
          Object.entries(firstHire).forEach(([key, value]) => {
            if (typeof value === 'string' || typeof value === 'number') {
              // Only replace if not already replaced by bulk variables
              if (!['hireCount', 'hireDetails'].includes(key)) {
                message = message.replace(new RegExp(`{{${key}}}`, 'g'), value.toString());
              }
            }
          });
          
          // Add start date if available, fallback to on_site_date if start_date is not available
          const startDate = firstHire.start_date || firstHire.on_site_date || 'TBD';
          message = message.replace(new RegExp(`{{startDate}}`, 'g'), startDate.toString());
        } else {
          // Template doesn't support bulk variables - create a bulk-friendly message
          message = `🎉 New Hire Alert - ${hireCount} New Employees!\n\n`;
          message += `We have ${hireCount} new employees joining us:\n\n`;
          
          hireArray.forEach((hire, index) => {
            const startDate = hire.start_date || hire.on_site_date || 'TBD';
            message += `${index + 1}. **${hire.name}**\n`;
            message += `   • Title: ${hire.title}\n`;
            message += `   • Department: ${hire.department}\n`;
            message += `   • Start Date: ${startDate}\n`;
            message += `   • Email: ${hire.email}\n\n`;
          });
          
          message += `License requests have been successfully sent to the IT team for all new hires.\n\n`;
          message += `Please prepare the necessary equipment and access for these new team members.`;
        }
      }
      
      // Send notifications - either to group or individual recipients
      if (settings.groupNotificationEnabled && (settings.groupId || settings.groupName)) {
        // Send to WhatsApp group
        try {
          await whatsappService.sendGroupMessage(
            settings.groupId,
            settings.groupName,
            message,
            settings.groupMentions
          );
          logger.ui.info("WhatsApp Service", `New hire notification sent to group: ${settings.groupId || settings.groupName}`);
        } catch (error) {
          logger.ui.error("WhatsApp Service", `Failed to send new hire notification to group:`, error);
          throw error;
        }
      } else {
        // Send to individual recipients
        const sendPromises = settings.newHireNotificationRecipients.map(async (phoneNumber) => {
          try {
            await whatsappService.sendMessage(phoneNumber, message);
            logger.ui.info("WhatsApp Service", `New hire notification sent to: ${phoneNumber}`);
          } catch (error) {
            logger.ui.error("WhatsApp Service", `Failed to send new hire notification to ${phoneNumber}:`, error);
            throw error;
          }
        });
        
        await Promise.all(sendPromises);
      }
      
      logger.ui.info("WhatsApp Service", `All new hire notifications sent successfully for ${hireArray.length} hire(s)`);
      
    } catch (error) {
      logger.ui.error("WhatsApp Service", "Error sending new hire notifications:", error);
      throw error;
    }
  }
};
