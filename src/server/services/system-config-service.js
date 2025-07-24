import sql from 'mssql';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

// Encryption configuration
const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';

// Cache for configurations to avoid frequent database queries
const configCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

class SystemConfigService {
  constructor(dbPool) {
    this.pool = dbPool;
  }

  /**
   * Get AI Services configuration
   * @returns {Promise<Object>} AI Services configuration object
   */
  async getAIServicesConfig() {
    try {
      const configs = await this.getConfigsByCategory('ai_services');
      
      if (!configs || configs.length === 0) {
        console.warn('No AI Services configuration found in database');
        return null;
      }
      
      // Reconstruct AI Services config object
      const aiConfig = {
        geminiApiKey: '',
        enabled: false,
        model: 'gemini-2.0-flash-exp',
        maxTokens: 2048,
        temperature: 0.7,
        lastConnectionTest: null
      };
      
      for (const config of configs) {
        const key = config.config_key.replace('ai.', '');
        
        // Convert key names to match original format
        let configKey = key;
        if (key === 'gemini_api_key') configKey = 'geminiApiKey';
        if (key === 'max_tokens') configKey = 'maxTokens';
        if (key === 'last_connection_test') configKey = 'lastConnectionTest';
        
        let value = config.value;
        
        // Convert boolean values
        if (configKey === 'enabled') {
          value = value === 'true' || value === true;
        }
        
        // Convert numeric values
        if (configKey === 'maxTokens') {
          value = parseInt(value) || 2048;
        }
        
        if (configKey === 'temperature') {
          value = parseFloat(value) || 0.7;
        }
        
        aiConfig[configKey] = value;
      }
      
      console.log('AI Services configuration retrieved from database');
      return aiConfig;
      
    } catch (error) {
      console.error('Failed to get AI Services configuration:', error);
      throw error;
    }
  }

  /**
   * Decrypt encrypted configuration value
   * @param {Object} encryptedData - Object containing encrypted, iv, and authTag
   * @returns {string} Decrypted value
   */
  decrypt(encryptedData) {
    if (!encryptedData || !encryptedData.encrypted) return null;
    if (!ENCRYPTION_KEY) {
      throw new Error('CONFIG_ENCRYPTION_KEY not found in environment variables');
    }
    
    try {
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('[SystemConfig] Decryption failed:', error);
      throw new Error('Failed to decrypt configuration value');
    }
  }

  /**
   * Get configuration value by key
   * @param {string} configKey - Configuration key
   * @param {boolean} useCache - Whether to use cache (default: true)
   * @returns {Promise<any>} Configuration value
   */
  async getConfig(configKey, useCache = true) {
    try {
      // Check cache first
      if (useCache && configCache.has(configKey)) {
        const cached = configCache.get(configKey);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
          return cached.value;
        }
        configCache.delete(configKey);
      }

      const query = `
        SELECT config_key, config_value, encrypted_value, encryption_iv, 
               encryption_auth_tag, is_encrypted, is_sensitive, is_active
        FROM system_configurations 
        WHERE config_key = @configKey AND is_active = 1
      `;

      const result = await this.pool.request()
        .input('configKey', sql.NVarChar(100), configKey)
        .query(query);

      if (result.recordset.length === 0) {
        return null;
      }

      const config = result.recordset[0];
      let value;

      if (config.is_encrypted) {
        // Decrypt sensitive data
        const encryptedData = {
          encrypted: config.encrypted_value,
          iv: config.encryption_iv,
          authTag: config.encryption_auth_tag
        };
        value = this.decrypt(encryptedData);
        
        // Try to parse as JSON if it looks like JSON
        try {
          if (value.startsWith('{') || value.startsWith('[')) {
            value = JSON.parse(value);
          }
        } catch (e) {
          // Keep as string if not valid JSON
        }
      } else {
        // Use plain text value
        value = config.config_value;
        
        // Try to parse as JSON if it looks like JSON
        try {
          if (value && (value.startsWith('{') || value.startsWith('[') || value === 'true' || value === 'false')) {
            value = JSON.parse(value);
          }
        } catch (e) {
          // Keep as string if not valid JSON
        }
      }

      // Cache the result
      if (useCache) {
        configCache.set(configKey, {
          value,
          timestamp: Date.now()
        });
      }

      return value;
    } catch (error) {
      console.error(`[SystemConfig] Error getting config ${configKey}:`, error);
      throw error;
    }
  }

  /**
   * Get multiple configurations by category
   * @param {string} category - Configuration category
   * @param {boolean} includeValues - Whether to include actual values (default: true)
   * @returns {Promise<Array>} Array of configurations
   */
  async getConfigsByCategory(category, includeValues = true) {
    try {
      const query = `
        SELECT config_key, config_name, config_description, config_category,
               ${includeValues ? 'config_value, encrypted_value, encryption_iv, encryption_auth_tag,' : ''}
               is_encrypted, is_sensitive, is_active, created_at, updated_at
        FROM system_configurations 
        WHERE config_category = @category AND is_active = 1
        ORDER BY config_key
      `;

      const result = await this.pool.request()
        .input('category', sql.NVarChar(50), category)
        .query(query);

      if (!includeValues) {
        return result.recordset;
      }

      // Process values for each configuration
      const configs = [];
      for (const config of result.recordset) {
        let value = null;
        
        if (config.is_encrypted && includeValues) {
          // Decrypt sensitive data
          const encryptedData = {
            encrypted: config.encrypted_value,
            iv: config.encryption_iv,
            authTag: config.encryption_auth_tag
          };
          value = this.decrypt(encryptedData);
          
          // Try to parse as JSON
          try {
            if (value && (value.startsWith('{') || value.startsWith('['))) {
              value = JSON.parse(value);
            }
          } catch (e) {
            // Keep as string
          }
        } else if (includeValues) {
          value = config.config_value;
          
          // Try to parse as JSON
          try {
            if (value && (value.startsWith('{') || value.startsWith('[') || value === 'true' || value === 'false')) {
              value = JSON.parse(value);
            }
          } catch (e) {
            // Keep as string
          }
        }

        configs.push({
          ...config,
          value: includeValues ? value : undefined,
          // Remove sensitive fields from response
          encrypted_value: undefined,
          encryption_iv: undefined,
          encryption_auth_tag: undefined
        });
      }

      return configs;
    } catch (error) {
      console.error(`[SystemConfig] Error getting configs for category ${category}:`, error);
      throw error;
    }
  }

  /**
   * Get HRIS database configuration
   * @returns {Promise<Object>} HRIS database configuration object
   */
  async getHrisConfig() {
    try {
      const configs = await this.getConfigsByCategory('hris_database');
      
      const hrisConfig = {
        server: null,
        port: null,
        database: null,
        username: null,
        password: null,
        enabled: false
      };

      for (const config of configs) {
        const key = config.config_key.replace('hris.', '');
        hrisConfig[key] = config.value;
      }

      // Convert port to number if it exists
      if (hrisConfig.port) {
        hrisConfig.port = parseInt(hrisConfig.port);
      }

      return hrisConfig;
    } catch (error) {
      console.error('[SystemConfig] Error getting HRIS config:', error);
      throw error;
    }
  }

  /**
   * Get Active Directory configuration
   * @returns {Promise<Object>} Active Directory configuration object
   */
  async getActiveDirectoryConfig() {
    try {
      const configs = await this.getConfigsByCategory('active_directory');
      
      if (!configs || configs.length === 0) {
        console.warn('No Active Directory configuration found in database');
        return null;
      }
      
      // Reconstruct AD config object
      const adConfig = {};
      
      for (const config of configs) {
        const key = config.config_key.replace('ad.', '');
        
        // Convert key names to match original format
        let configKey = key;
        if (key === 'base_dn') configKey = 'baseDN';
        if (key === 'auth_format') configKey = 'authFormat';
        
        adConfig[configKey] = config.value;
      }
      
      // Convert enabled to boolean if present
      if (adConfig.enabled !== undefined) {
        adConfig.enabled = adConfig.enabled === 'true' || adConfig.enabled === true;
      }
      
      console.log('Active Directory configuration retrieved from database');
      return adConfig;
      
    } catch (error) {
      console.error('Failed to get Active Directory configuration:', error);
      throw error;
    }
  }

  /**
   * Get Microsoft Graph configuration
   * @returns {Promise<Object>} Microsoft Graph configuration object
   */
  async getMicrosoftGraphConfig() {
    try {
      const configs = await this.getConfigsByCategory('microsoft_graph');
      
      if (!configs || configs.length === 0) {
        console.warn('No Microsoft Graph configuration found in database');
        return null;
      }
      
      // Reconstruct Microsoft Graph config object
      const graphConfig = {};
      
      for (const config of configs) {
        const key = config.config_key.replace('msgraph.', '');
        
        // Convert key names to match original format
        let configKey = key;
        if (key === 'tenant_id') configKey = 'tenantId';
        if (key === 'client_id') configKey = 'clientId';
        if (key === 'client_secret') configKey = 'clientSecret';
        if (key === 'default_to_recipients') configKey = 'defaultToRecipients';
        if (key === 'default_cc_recipients') configKey = 'defaultCcRecipients';
        if (key === 'default_bcc_recipients') configKey = 'defaultBccRecipients';
        if (key === 'sender_email') configKey = 'senderEmail';
        if (key === 'use_logged_in_user_as_sender') configKey = 'useLoggedInUserAsSender';
        if (key === 'email_subject_template') configKey = 'emailSubjectTemplate';
        if (key === 'email_body_template') configKey = 'emailBodyTemplate';
        
        let value = config.value;
        
        // Parse JSON arrays for recipient lists and scope
        if (['defaultToRecipients', 'defaultCcRecipients', 'defaultBccRecipients', 'scope'].includes(configKey)) {
          try {
            if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
              value = JSON.parse(value);
            } else if (typeof value === 'string' && configKey === 'scope') {
              // Handle scope as comma-separated string or single value
              value = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
            }
          } catch (e) {
            console.warn(`Failed to parse JSON for ${configKey}:`, e.message);
            // Fallback for scope - ensure it's always an array
            if (configKey === 'scope') {
              value = typeof value === 'string' ? [value] : ['https://graph.microsoft.com/.default'];
            }
          }
        }
        
        // Convert boolean values
        if (['enabled', 'useLoggedInUserAsSender'].includes(configKey)) {
          value = value === 'true' || value === true;
        }
        
        graphConfig[configKey] = value;
      }
      
      console.log('Microsoft Graph configuration retrieved from database');
      return graphConfig;
      
    } catch (error) {
      console.error('Failed to get Microsoft Graph configuration:', error);
      throw error;
    }
  }

  /**
   * Get WhatsApp configuration
   * @returns {Promise<Object>} WhatsApp configuration object
   */
  async getWhatsAppConfig() {
    try {
      const configs = await this.getConfigsByCategory('whatsapp');
      
      if (!configs || configs.length === 0) {
        console.warn('No WhatsApp configuration found in database');
        return null;
      }
      
      // Reconstruct WhatsApp config object
      const whatsappConfig = {};
      
      for (const config of configs) {
        const key = config.config_key.replace('whatsapp.', '');
        
        // Convert key names to match original format
        let configKey = key;
        if (key === 'api_url') configKey = 'apiUrl';
        if (key === 'default_message') configKey = 'defaultMessage';
        if (key === 'default_recipient') configKey = 'defaultRecipient';
        if (key === 'new_hire_notification_enabled') configKey = 'newHireNotificationEnabled';
        if (key === 'new_hire_notification_template') configKey = 'newHireNotificationTemplate';
        if (key === 'new_hire_notification_recipients') configKey = 'newHireNotificationRecipients';
        if (key === 'group_notification_enabled') configKey = 'groupNotificationEnabled';
        if (key === 'group_id') configKey = 'groupId';
        if (key === 'group_name') configKey = 'groupName';
        if (key === 'group_mentions') configKey = 'groupMentions';
        
        let value = config.value;
        
        // Parse JSON arrays for recipient lists
        if (['newHireNotificationRecipients', 'groupMentions'].includes(configKey)) {
          try {
            if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
              value = JSON.parse(value);
            } else if (typeof value === 'string') {
              // Handle as comma-separated string
              value = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
            }
          } catch (e) {
            console.warn(`Failed to parse JSON for ${configKey}:`, e.message);
            value = [];
          }
        }
        
        // Convert boolean values
        if (['newHireNotificationEnabled', 'groupNotificationEnabled'].includes(configKey)) {
          value = value === 'true' || value === true;
        }
        
        whatsappConfig[configKey] = value;
      }
      
      console.log('WhatsApp configuration retrieved from database');
      return whatsappConfig;
      
    } catch (error) {
      console.error('Failed to get WhatsApp configuration:', error);
      throw error;
    }
  }

  /**
   * Set configuration value (create or update)
   * @param {string} configKey - Configuration key
   * @param {any} value - New value
   * @param {string} configName - Configuration name/description
   * @param {string} configCategory - Configuration category
   * @param {boolean} isEncrypted - Whether to encrypt the value
   * @param {boolean} isSensitive - Whether the config is sensitive
   * @param {string} updatedBy - User who updated the config
   * @returns {Promise<boolean>} Success status
   */
  async setConfig(configKey, value, configName, configCategory, isEncrypted = false, isSensitive = false, updatedBy = 'system') {
    try {
      // Check if configuration already exists
      const existingConfig = await this.pool.request()
        .input('configKey', sql.NVarChar(100), configKey)
        .query('SELECT id FROM system_configurations WHERE config_key = @configKey');

      if (existingConfig.recordset.length > 0) {
        // Configuration exists, update it
        return await this.updateConfig(configKey, value, updatedBy);
      } else {
        // Configuration doesn't exist, create it
        let insertQuery;
        let request = this.pool.request()
          .input('configKey', sql.NVarChar(100), configKey)
          .input('configName', sql.NVarChar(200), configName)
          .input('configDescription', sql.NVarChar(500), configName)
          .input('configCategory', sql.NVarChar(50), configCategory)
          .input('isEncrypted', sql.Bit, isEncrypted)
          .input('isSensitive', sql.Bit, isSensitive)
          .input('isActive', sql.Bit, true)
          .input('createdBy', sql.NVarChar(100), updatedBy)
          .input('updatedBy', sql.NVarChar(100), updatedBy);

        if (isEncrypted) {
          // Encrypt the value
          const encrypted = this.encrypt(typeof value === 'object' ? JSON.stringify(value) : value.toString());
          
          insertQuery = `
            INSERT INTO system_configurations 
            (config_key, config_name, config_description, config_category, 
             is_encrypted, is_sensitive, is_active, encrypted_value, 
             encryption_iv, encryption_auth_tag, created_by, updated_by, 
             created_at, updated_at)
            VALUES 
            (@configKey, @configName, @configDescription, @configCategory, 
             @isEncrypted, @isSensitive, @isActive, @encryptedValue, 
             @encryptionIv, @encryptionAuthTag, @createdBy, @updatedBy, 
             GETDATE(), GETDATE())
          `;
          
          request = request
            .input('encryptedValue', sql.NVarChar(sql.MAX), encrypted.encrypted)
            .input('encryptionIv', sql.NVarChar(100), encrypted.iv)
            .input('encryptionAuthTag', sql.NVarChar(100), encrypted.authTag);
        } else {
          // Plain text value
          insertQuery = `
            INSERT INTO system_configurations 
            (config_key, config_name, config_description, config_category, 
             is_encrypted, is_sensitive, is_active, config_value, 
             created_by, updated_by, created_at, updated_at)
            VALUES 
            (@configKey, @configName, @configDescription, @configCategory, 
             @isEncrypted, @isSensitive, @isActive, @configValue, 
             @createdBy, @updatedBy, GETDATE(), GETDATE())
          `;
          
          request = request.input('configValue', sql.NVarChar(sql.MAX), 
            typeof value === 'object' ? JSON.stringify(value) : value.toString());
        }

        await request.query(insertQuery);
        
        // Clear cache
        configCache.delete(configKey);
        
        console.log(`[SystemConfig] Created new config: ${configKey}`);
        return true;
      }
    } catch (error) {
      console.error(`[SystemConfig] Error setting config ${configKey}:`, error);
      throw error;
    }
  }

  /**
   * Update configuration value
   * @param {string} configKey - Configuration key
   * @param {any} value - New value
   * @param {string} updatedBy - User who updated the config
   * @returns {Promise<boolean>} Success status
   */
  async updateConfig(configKey, value, updatedBy = 'system') {
    try {
      // First get the current config to check if it's encrypted
      const currentConfig = await this.pool.request()
        .input('configKey', sql.NVarChar(100), configKey)
        .query('SELECT is_encrypted, is_sensitive FROM system_configurations WHERE config_key = @configKey');

      if (currentConfig.recordset.length === 0) {
        throw new Error(`Configuration ${configKey} not found`);
      }

      const config = currentConfig.recordset[0];
      let updateQuery;
      let request = this.pool.request()
        .input('configKey', sql.NVarChar(100), configKey)
        .input('updatedBy', sql.NVarChar(100), updatedBy);

      if (config.is_encrypted) {
        // Encrypt the new value
        const encrypted = this.encrypt(typeof value === 'object' ? JSON.stringify(value) : value.toString());
        
        updateQuery = `
          UPDATE system_configurations 
          SET encrypted_value = @encryptedValue,
              encryption_iv = @encryptionIv,
              encryption_auth_tag = @encryptionAuthTag,
              updated_at = GETDATE(),
              updated_by = @updatedBy
          WHERE config_key = @configKey
        `;
        
        request = request
          .input('encryptedValue', sql.NVarChar(sql.MAX), encrypted.encrypted)
          .input('encryptionIv', sql.NVarChar(100), encrypted.iv)
          .input('encryptionAuthTag', sql.NVarChar(100), encrypted.authTag);
      } else {
        // Update plain text value
        updateQuery = `
          UPDATE system_configurations 
          SET config_value = @configValue,
              updated_at = GETDATE(),
              updated_by = @updatedBy
          WHERE config_key = @configKey
        `;
        
        request = request.input('configValue', sql.NVarChar(sql.MAX), 
          typeof value === 'object' ? JSON.stringify(value) : value.toString());
      }

      await request.query(updateQuery);
      
      // Clear cache for this key
      configCache.delete(configKey);
      
      console.log(`[SystemConfig] Updated config: ${configKey}`);
      return true;
    } catch (error) {
      console.error(`[SystemConfig] Error updating config ${configKey}:`, error);
      throw error;
    }
  }

  /**
   * Encrypt value (used internally)
   * @param {string} text - Text to encrypt
   * @returns {Object} Encrypted data object
   */
  encrypt(text) {
    if (!text) return null;
    if (!ENCRYPTION_KEY) {
      throw new Error('CONFIG_ENCRYPTION_KEY not found in environment variables');
    }
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Clear configuration cache
   */
  clearCache() {
    configCache.clear();
    console.log('[SystemConfig] Configuration cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: configCache.size,
      keys: Array.from(configCache.keys())
    };
  }
}

export default SystemConfigService;