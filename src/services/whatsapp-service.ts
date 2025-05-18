
import apiClient from "./api-client";
import { NewHire } from "@/types/types";
import logger from "@/utils/logger";

interface WhatsAppSettings {
  apiUrl: string;
  defaultMessage: string;
  defaultRecipient: "userNumber" | "testNumber";
}

const WHATSAPP_SETTINGS_KEY = "whatsapp_settings";

// Service for WhatsApp integration
export const whatsappService = {
  // Get WhatsApp API settings
  getSettings: async (): Promise<WhatsAppSettings> => {
    try {
      // Attempt to get from API
      const response = await apiClient.get("/settings/whatsapp");
      return response.data;
    } catch (error) {
      // If API fails, try to get from localStorage
      const localSettings = localStorage.getItem(WHATSAPP_SETTINGS_KEY);
      if (localSettings) {
        return JSON.parse(localSettings);
      }
      
      // Default settings if nothing is available
      return {
        apiUrl: "",
        defaultMessage: `Welcome aboard to PT. Merdeka Tsingshan Indonesia. 
By this message, we inform you regarding your account information for the email address: {{email}}
Name: {{name}}
Title: {{title}}
Department: {{department}}
Email: {{email}}
Password: {{password}}

Please don't hesitate to contact IT for any question.`,
        defaultRecipient: "userNumber"
      };
    }
  },

  // Save WhatsApp API settings
  saveSettings: async (settings: WhatsAppSettings): Promise<WhatsAppSettings> => {
    try {
      // Try to save to API
      const response = await apiClient.put("/settings/whatsapp", settings);
      // Also save to localStorage as backup
      localStorage.setItem(WHATSAPP_SETTINGS_KEY, JSON.stringify(settings));
      return response.data;
    } catch (error) {
      // If API fails, just save to localStorage
      localStorage.setItem(WHATSAPP_SETTINGS_KEY, JSON.stringify(settings));
      return settings;
    }
  },

  // Send WhatsApp message - UPDATED to use our proxy endpoint
  sendMessage: async (phoneNumber: string, message: string): Promise<any> => {
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
  }
};
