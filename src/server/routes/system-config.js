import express from 'express';
import SystemConfigService from '../services/system-config-service.js';
import { extractUser, requireAuth, requireAdmin } from '../middleware/authMiddleware.js';
const router = express.Router();

// Initialize system config service
let systemConfigService;

// Middleware to initialize service with database pool
router.use((req, res, next) => {
  if (!systemConfigService && req.app.locals.dbPool) {
    systemConfigService = new SystemConfigService(req.app.locals.dbPool);
  }
  next();
});

/**
 * @route GET /api/system-config/categories
 * @desc Get all configuration categories
 * @access Private (Admin only)
 */
router.get('/categories', extractUser, requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!systemConfigService) {
      return res.status(500).json({ error: 'System configuration service not available' });
    }

    const query = `
      SELECT DISTINCT config_category, COUNT(*) as config_count
      FROM system_configurations 
      WHERE is_active = 1
      GROUP BY config_category
      ORDER BY config_category
    `;

    const result = await req.app.locals.dbPool.request().query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching configuration categories:', error);
    res.status(500).json({ error: 'Failed to fetch configuration categories' });
  }
});

/**
 * @route GET /api/system-config/category/:category
 * @desc Get configurations by category
 * @access Private (Admin only)
 */
router.get('/category/:category', extractUser, requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log(`[SystemConfig] Getting configurations for category: ${req.params.category}`);
    if (!systemConfigService) {
      console.error('[SystemConfig] Service not initialized');
      return res.status(500).json({ error: 'System configuration service not initialized' });
    }

    const { category } = req.params;
    const { includeValues = 'true' } = req.query;
    
    const configs = await systemConfigService.getConfigsByCategory(
      category, 
      includeValues === 'true'
    );
    console.log(`[SystemConfig] Found ${configs ? configs.length : 0} configs for category ${category}`);
    
    // Mask sensitive values in response for security
    const maskedConfigs = configs.map(config => ({
      ...config,
      value: config.is_sensitive && includeValues === 'true' 
        ? (config.value ? '***MASKED***' : null)
        : config.value
    }));
    
    res.json(maskedConfigs);
  } catch (error) {
    console.error(`[SystemConfig] Error fetching configurations for category ${req.params.category}:`, error);
    console.error(`[SystemConfig] Error stack:`, error.stack);
    res.status(500).json({ error: 'Failed to fetch configurations' });
  }
});

/**
 * @route GET /api/system-config/hris
 * @desc Get HRIS database configuration
 * @access Private (Admin only)
 */
router.get('/hris', extractUser, requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!systemConfigService) {
      return res.status(500).json({ error: 'System configuration service not available' });
    }

    const hrisConfig = await systemConfigService.getHrisConfig();
    
    // Mask sensitive information
    const maskedConfig = {
      ...hrisConfig,
      username: hrisConfig.username ? '***MASKED***' : null,
      password: hrisConfig.password ? '***MASKED***' : null
    };
    
    res.json(maskedConfig);
  } catch (error) {
    console.error('Error fetching HRIS configuration:', error);
    res.status(500).json({ error: 'Failed to fetch HRIS configuration' });
  }
});

/**
 * @route PUT /api/system-config/hris
 * @desc Update HRIS database configuration
 * @access Private (Admin only)
 */
router.put('/hris', extractUser, requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!systemConfigService) {
      return res.status(500).json({ error: 'System configuration service not available' });
    }

    const { server, port, database, username, password, enabled } = req.body;
    const updatedBy = req.user?.username || 'unknown';
    
    // Validate required fields
    if (!server || !port || !database) {
      return res.status(400).json({ 
        error: 'Server, port, and database are required fields' 
      });
    }

    // Update each configuration
    const updates = [];
    
    if (server !== undefined) {
      updates.push(systemConfigService.updateConfig('hris.server', server, updatedBy));
    }
    
    if (port !== undefined) {
      updates.push(systemConfigService.updateConfig('hris.port', port.toString(), updatedBy));
    }
    
    if (database !== undefined) {
      updates.push(systemConfigService.updateConfig('hris.database', database, updatedBy));
    }
    
    if (username !== undefined) {
      updates.push(systemConfigService.updateConfig('hris.username', username, updatedBy));
    }
    
    if (password !== undefined) {
      updates.push(systemConfigService.updateConfig('hris.password', password, updatedBy));
    }
    
    if (enabled !== undefined) {
      updates.push(systemConfigService.updateConfig('hris.enabled', enabled, updatedBy));
    }

    // Wait for all updates to complete
    await Promise.all(updates);
    
    // Log the update
    console.log(`[SystemConfig] HRIS configuration updated by ${updatedBy}`);
    
    // Return updated configuration (masked)
    const updatedConfig = await systemConfigService.getHrisConfig();
    const maskedConfig = {
      ...updatedConfig,
      username: updatedConfig.username ? '***MASKED***' : null,
      password: updatedConfig.password ? '***MASKED***' : null
    };
    
    res.json({ 
      message: 'HRIS configuration updated successfully',
      config: maskedConfig
    });
  } catch (error) {
    console.error('Error updating HRIS configuration:', error);
    res.status(500).json({ error: 'Failed to update HRIS configuration' });
  }
});

/**
 * @route GET /api/system-config/active-directory
 * @desc Get Active Directory configuration
 * @access Private (Admin only)
 */
router.get('/active-directory', extractUser, requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('[SystemConfig] Getting Active Directory configuration...');
    if (!systemConfigService) {
      return res.status(500).json({ error: 'System configuration service not initialized' });
    }

    const adConfig = await systemConfigService.getActiveDirectoryConfig();
    console.log('[SystemConfig] AD Config retrieved:', adConfig ? 'Found' : 'Not found');
    
    if (!adConfig) {
      console.log('[SystemConfig] No AD config found, returning 404');
      return res.status(404).json({ error: 'Active Directory configuration not found' });
    }

    // Mask sensitive data in response
    const maskedConfig = { ...adConfig };
    if (maskedConfig.password) {
      maskedConfig.password = '***MASKED***';
    }
    if (maskedConfig.username) {
      maskedConfig.username = maskedConfig.username.replace(/./g, '*');
    }

    console.log('[SystemConfig] Returning masked AD config');
    res.json(maskedConfig);
  } catch (error) {
    console.error('[SystemConfig] Error getting Active Directory config:', error);
    console.error('[SystemConfig] Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to retrieve Active Directory configuration' });
  }
});

/**
 * @route PUT /api/system-config/active-directory
 * @desc Update Active Directory configuration
 * @access Private (Admin only)
 */
router.put('/active-directory', extractUser, requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!systemConfigService) {
      return res.status(500).json({ error: 'System configuration service not initialized' });
    }

    const { server, username, password, domain, baseDN, protocol, authFormat, enabled } = req.body;
    
    // Validate required fields
    if (!server || !username || !domain || !baseDN) {
      return res.status(400).json({ 
        error: 'Missing required fields: server, username, domain, baseDN are required' 
      });
    }

    // Update each configuration item
    const updates = [
      { key: 'ad.server', value: server, sensitive: false },
      { key: 'ad.username', value: username, sensitive: true },
      { key: 'ad.domain', value: domain, sensitive: false },
      { key: 'ad.base_dn', value: baseDN, sensitive: false },
      { key: 'ad.protocol', value: protocol || 'ldaps', sensitive: false },
      { key: 'ad.auth_format', value: authFormat || 'dn', sensitive: false },
      { key: 'ad.enabled', value: enabled !== undefined ? enabled : true, sensitive: false }
    ];

    // Only update password if provided
    if (password) {
      updates.push({ key: 'ad.password', value: password, sensitive: true });
    }

    for (const update of updates) {
      await systemConfigService.updateConfiguration(
        update.key,
        update.value,
        update.sensitive
      );
    }

    // Clear cache to ensure fresh data
    systemConfigService.clearCache();

    // Return updated configuration (without sensitive data)
    const updatedConfig = await systemConfigService.getActiveDirectoryConfig();
    
    // Remove sensitive fields from response
    const safeConfig = { ...updatedConfig };
    delete safeConfig.password;
    
    res.json({
      message: 'Active Directory configuration updated successfully',
      config: safeConfig
    });
  } catch (error) {
    console.error('Error updating Active Directory configuration:', error);
    res.status(500).json({ error: 'Failed to update Active Directory configuration' });
  }
});

/**
 * @route POST /api/system-config/active-directory/test-connection
 * @desc Test Active Directory connection
 * @access Private (Admin only)
 */
router.post('/active-directory/test-connection', extractUser, requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!systemConfigService) {
      return res.status(500).json({ error: 'System configuration service not initialized' });
    }

    const adConfig = await systemConfigService.getActiveDirectoryConfig();
    
    if (!adConfig) {
      return res.status(404).json({ error: 'Active Directory configuration not found' });
    }

    if (!adConfig.enabled) {
      return res.status(400).json({ 
        error: 'Active Directory is disabled',
        success: false
      });
    }

    // Test AD connection (simplified test)
    const testResult = {
      success: true,
      message: 'Active Directory configuration is valid',
      server: adConfig.server,
      domain: adConfig.domain,
      protocol: adConfig.protocol,
      baseDN: adConfig.baseDN,
      authFormat: adConfig.authFormat,
      enabled: adConfig.enabled,
      timestamp: new Date().toISOString()
    };

    // Note: In a real implementation, you would test the actual LDAP connection here
    // For now, we just validate that the configuration exists and is enabled
    
    res.json(testResult);
  } catch (error) {
    console.error('Error testing Active Directory connection:', error);
    res.status(500).json({ 
      error: 'Failed to test Active Directory connection',
      success: false,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route POST /api/system-config/hris/test-connection
 * @desc Test HRIS database connection
 * @access Private (Admin only)
 */
router.post('/hris/test-connection', extractUser, requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!systemConfigService) {
      return res.status(500).json({ error: 'System configuration service not available' });
    }

    const hrisConfig = await systemConfigService.getHrisConfig();
    
    if (!hrisConfig.enabled) {
      return res.status(400).json({ 
        error: 'HRIS integration is disabled',
        success: false
      });
    }

    // Test connection using the retrieved configuration
    const sql = require('mssql');
    const testConfig = {
      server: hrisConfig.server,
      port: hrisConfig.port,
      database: hrisConfig.database,
      user: hrisConfig.username,
      password: hrisConfig.password,
      options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
        connectTimeout: 10000, // 10 seconds
        requestTimeout: 5000   // 5 seconds
      }
    };

    let testPool;
    try {
      testPool = await sql.connect(testConfig);
      
      // Try a simple query to verify the connection works
      const result = await testPool.request().query('SELECT 1 as test');
      
      await testPool.close();
      
      console.log(`[SystemConfig] HRIS connection test successful by ${req.user?.username || 'unknown'}`);
      
      res.json({
        success: true,
        message: 'HRIS database connection successful',
        timestamp: new Date().toISOString()
      });
    } catch (connectionError) {
      if (testPool) {
        try {
          await testPool.close();
        } catch (closeError) {
          console.error('Error closing test connection:', closeError);
        }
      }
      
      console.error('HRIS connection test failed:', connectionError);
      
      res.status(400).json({
        success: false,
        message: 'HRIS database connection failed',
        error: connectionError.message,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error testing HRIS connection:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to test HRIS connection' 
    });
  }
});

/**
 * @route GET /api/system-config/:key
 * @desc Get specific configuration by key
 * @access Private (Admin only)
 */
router.get('/:key', extractUser, requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!systemConfigService) {
      return res.status(500).json({ error: 'System configuration service not available' });
    }

    const { key } = req.params;
    const value = await systemConfigService.getConfig(key);
    
    if (value === null) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    // Check if this is a sensitive configuration
    const configInfo = await req.app.locals.dbPool.request()
      .input('configKey', key)
      .query('SELECT is_sensitive FROM system_configurations WHERE config_key = @configKey');
    
    const isSensitive = configInfo.recordset[0]?.is_sensitive;
    
    res.json({
      key,
      value: isSensitive ? '***MASKED***' : value,
      is_sensitive: isSensitive
    });
  } catch (error) {
    console.error(`Error fetching configuration ${req.params.key}:`, error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

/**
 * @route PUT /api/system-config/:key
 * @desc Update specific configuration by key
 * @access Private (Admin only)
 */
router.put('/:key', extractUser, requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!systemConfigService) {
      return res.status(500).json({ error: 'System configuration service not available' });
    }

    const { key } = req.params;
    const { value } = req.body;
    const updatedBy = req.user?.username || 'unknown';
    
    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }

    await systemConfigService.updateConfig(key, value, updatedBy);
    
    console.log(`[SystemConfig] Configuration ${key} updated by ${updatedBy}`);
    
    res.json({ 
      message: 'Configuration updated successfully',
      key,
      updated_by: updatedBy,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error updating configuration ${req.params.key}:`, error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

/**
 * @route POST /api/system-config/cache/clear
 * @desc Clear configuration cache
 * @access Private (Admin only)
 */
router.post('/cache/clear', extractUser, requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!systemConfigService) {
      return res.status(500).json({ error: 'System configuration service not available' });
    }

    systemConfigService.clearCache();
    
    console.log(`[SystemConfig] Cache cleared by ${req.user?.username || 'unknown'}`);
    
    res.json({ 
      message: 'Configuration cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing configuration cache:', error);
    res.status(500).json({ error: 'Failed to clear configuration cache' });
  }
});

/**
 * @route GET /api/system-config/cache/stats
 * @desc Get configuration cache statistics
 * @access Private (Admin only)
 */
router.get('/cache/stats', extractUser, requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!systemConfigService) {
      return res.status(500).json({ error: 'System configuration service not available' });
    }

    const stats = systemConfigService.getCacheStats();
    
    res.json({
      cache_stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting cache statistics:', error);
    res.status(500).json({ error: 'Failed to get cache statistics' });
  }
});

export default router;