/**
 * Tests for Dashboard Configuration
 * Comprehensive test suite for configuration validation and environment handling
 */

import {
  defaultDashboardConfig,
  getEnvironmentConfig,
  getDashboardConfig,
  validateDashboardConfig,
  getValidatedDashboardConfig,
  DashboardConfig
} from './dashboardConfig';

// Mock process.env for testing
const originalEnv = process.env.NODE_ENV;

describe('Dashboard Configuration', () => {
  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('defaultDashboardConfig', () => {
    it('should have progress weights that sum to 100', () => {
      const weights = defaultDashboardConfig.progressWeights;
      const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
      expect(total).toBe(100);
    });

    it('should have valid threshold ranges', () => {
      const { completionRate, averageProgress, completionTime } = defaultDashboardConfig.thresholds;
      
      // Completion rate thresholds should be in descending order
      expect(completionRate.excellent).toBeGreaterThan(completionRate.good);
      expect(completionRate.good).toBeGreaterThan(completionRate.warning);
      
      // Average progress target should be higher than warning
      expect(averageProgress.target).toBeGreaterThan(averageProgress.warning);
      
      // Completion time should be in ascending order (fast < acceptable < slow)
      expect(completionTime.fast).toBeLessThan(completionTime.acceptable);
      expect(completionTime.acceptable).toBeLessThan(completionTime.slow);
    });

    it('should have reasonable UI settings', () => {
      const { ui } = defaultDashboardConfig;
      
      expect(ui.maxInsights).toBeGreaterThan(0);
      expect(ui.maxInsights).toBeLessThanOrEqual(20);
      expect(ui.maxDepartments).toBeGreaterThan(0);
      expect(ui.refreshInterval).toBeGreaterThanOrEqual(1000);
      expect(ui.chartColors).toHaveLength(8);
      expect(ui.animationDuration).toBeGreaterThan(0);
    });

    it('should have valid alert thresholds', () => {
      const { alerts } = defaultDashboardConfig;
      
      expect(alerts.lowCompletionRate).toBeGreaterThan(0);
      expect(alerts.lowCompletionRate).toBeLessThan(100);
      expect(alerts.highPendingCount).toBeGreaterThan(0);
      expect(alerts.slowProcessingTime).toBeGreaterThan(0);
      expect(alerts.upcomingDeadlines).toBeGreaterThan(0);
    });
  });

  describe('getEnvironmentConfig', () => {
    it('should return development config for development environment', () => {
      process.env.NODE_ENV = 'development';
      const config = getEnvironmentConfig();
      
      expect(config.ui?.refreshInterval).toBe(10000);
      expect(config.features?.enableRealTimeUpdates).toBe(false);
    });

    it('should return production config for production environment', () => {
      process.env.NODE_ENV = 'production';
      const config = getEnvironmentConfig();
      
      expect(config.ui?.refreshInterval).toBe(60000);
      expect(config.features?.enableAdvancedAnalytics).toBe(true);
    });

    it('should return test config for test environment', () => {
      process.env.NODE_ENV = 'test';
      const config = getEnvironmentConfig();
      
      expect(config.ui?.refreshInterval).toBe(1000);
      expect(config.features?.enableRealTimeUpdates).toBe(false);
      expect(config.features?.enableNotifications).toBe(false);
    });

    it('should return empty config for unknown environment', () => {
      process.env.NODE_ENV = 'unknown';
      const config = getEnvironmentConfig();
      
      expect(Object.keys(config)).toHaveLength(0);
    });
  });

  describe('getDashboardConfig', () => {
    it('should merge default config with environment overrides', () => {
      process.env.NODE_ENV = 'development';
      const config = getDashboardConfig();
      
      // Should have development-specific overrides
      expect(config.ui.refreshInterval).toBe(10000);
      expect(config.features.enableRealTimeUpdates).toBe(false);
      
      // Should retain default values for non-overridden properties
      expect(config.progressWeights.accountCreation).toBe(20);
      expect(config.thresholds.completionRate.excellent).toBe(90);
    });

    it('should handle deep merging of nested objects', () => {
      process.env.NODE_ENV = 'production';
      const config = getDashboardConfig();
      
      // Should merge nested threshold objects correctly
      expect(config.thresholds.completionRate.excellent).toBe(90);
      expect(config.thresholds.averageProgress.target).toBe(70);
      
      // Should merge nested UI objects correctly
      expect(config.ui.refreshInterval).toBe(60000); // Overridden
      expect(config.ui.maxInsights).toBe(6); // Default
    });
  });

  describe('validateDashboardConfig', () => {
    it('should return no errors for valid default config', () => {
      const errors = validateDashboardConfig(defaultDashboardConfig);
      expect(errors).toHaveLength(0);
    });

    it('should detect invalid progress weights', () => {
      const invalidConfig: DashboardConfig = {
        ...defaultDashboardConfig,
        progressWeights: {
          ...defaultDashboardConfig.progressWeights,
          accountCreation: 50, // This will make total > 100
        }
      };
      
      const errors = validateDashboardConfig(invalidConfig);
      expect(errors).toContain('Progress weights must sum to 100, got 130');
    });

    it('should detect invalid completion rate thresholds', () => {
      const invalidConfig: DashboardConfig = {
        ...defaultDashboardConfig,
        thresholds: {
          ...defaultDashboardConfig.thresholds,
          completionRate: {
            excellent: 70,
            good: 80, // Good should be less than excellent
            warning: 50
          }
        }
      };
      
      const errors = validateDashboardConfig(invalidConfig);
      expect(errors).toContain('Excellent completion rate threshold must be higher than good threshold');
    });

    it('should detect invalid average progress thresholds', () => {
      const invalidConfig: DashboardConfig = {
        ...defaultDashboardConfig,
        thresholds: {
          ...defaultDashboardConfig.thresholds,
          averageProgress: {
            target: 50,
            warning: 60 // Warning should be less than target
          }
        }
      };
      
      const errors = validateDashboardConfig(invalidConfig);
      expect(errors).toContain('Average progress target must be higher than warning threshold');
    });

    it('should detect invalid completion time thresholds', () => {
      const invalidConfig: DashboardConfig = {
        ...defaultDashboardConfig,
        thresholds: {
          ...defaultDashboardConfig.thresholds,
          completionTime: {
            fast: 5,
            acceptable: 3, // Should be greater than fast
            slow: 7
          }
        }
      };
      
      const errors = validateDashboardConfig(invalidConfig);
      expect(errors).toContain('Fast completion time must be less than acceptable time');
    });

    it('should detect invalid UI settings', () => {
      const invalidConfig: DashboardConfig = {
        ...defaultDashboardConfig,
        ui: {
          ...defaultDashboardConfig.ui,
          maxInsights: 25, // Should be <= 20
          refreshInterval: 500 // Should be >= 1000
        }
      };
      
      const errors = validateDashboardConfig(invalidConfig);
      expect(errors).toContain('Max insights must be between 1 and 20');
      expect(errors).toContain('Refresh interval must be at least 1000ms');
    });

    it('should detect multiple validation errors', () => {
      const invalidConfig: DashboardConfig = {
        ...defaultDashboardConfig,
        progressWeights: {
          accountCreation: 50,
          laptopStatus: 50,
          licenseAssignment: 50, // Total = 150, should be 100
          srfStatus: 0,
          microsoft365License: 0,
          distributionListSync: 0
        },
        thresholds: {
          ...defaultDashboardConfig.thresholds,
          completionRate: {
            excellent: 50,
            good: 70, // Invalid order
            warning: 80
          }
        }
      };
      
      const errors = validateDashboardConfig(invalidConfig);
      expect(errors.length).toBeGreaterThan(1);
    });
  });

  describe('getValidatedDashboardConfig', () => {
    it('should return valid config without errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const config = getValidatedDashboardConfig();
      
      expect(config).toBeDefined();
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should log errors for invalid config but still return config', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock getDashboardConfig to return invalid config
      const dashboardConfigModule = require('../config/dashboardConfig');
      const mockGetDashboardConfig = jest.spyOn(dashboardConfigModule, 'getDashboardConfig').mockReturnValue({
        ...defaultDashboardConfig,
        progressWeights: {
          ...defaultDashboardConfig.progressWeights,
          accountCreation: 200 // This will make total = 280
        }
      });
      
      const config = getValidatedDashboardConfig();
      
      expect(config).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Dashboard configuration validation errors:',
        expect.arrayContaining([expect.stringContaining('Progress weights must sum to 100')])
      );
      
      // Restore mocks
      mockGetDashboardConfig.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('Configuration Integration', () => {
    it('should work with different environment configurations', () => {
      const originalEnv = process.env.NODE_ENV;
      const environments = ['development', 'production', 'test'];
      
      environments.forEach(env => {
        process.env.NODE_ENV = env;
        const config = getDashboardConfig();
        const errors = validateDashboardConfig(config);
        
        expect(errors).toHaveLength(0);
        expect(config.progressWeights).toBeDefined();
        expect(config.thresholds).toBeDefined();
        expect(config.ui).toBeDefined();
        expect(config.features).toBeDefined();
      });
      
      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should maintain configuration consistency across calls', () => {
      process.env.NODE_ENV = 'production';
      
      const config1 = getDashboardConfig();
      const config2 = getDashboardConfig();
      
      expect(config1).toEqual(config2);
    });

    it('should handle missing environment gracefully', () => {
      const originalEnv = process.env.NODE_ENV;
      delete process.env.NODE_ENV;
      
      const config = getDashboardConfig();
      const errors = validateDashboardConfig(config);
      
      expect(errors).toHaveLength(0);
      // When NODE_ENV is undefined, it defaults to 'development' in getEnvironmentConfig
      // So we expect development environment overrides to be applied
      expect(config.ui.refreshInterval).toBe(10000); // Development override
      expect(config.features.enableRealTimeUpdates).toBe(false); // Development override
      
      // Restore original environment
      if (originalEnv) {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('Configuration Properties', () => {
    it('should have all required progress weight categories', () => {
      const weights = defaultDashboardConfig.progressWeights;
      const requiredCategories = [
        'accountCreation',
        'laptopStatus',
        'licenseAssignment',
        'srfStatus',
        'microsoft365License',
        'distributionListSync'
      ];
      
      requiredCategories.forEach(category => {
        expect(weights).toHaveProperty(category);
        expect(typeof weights[category as keyof typeof weights]).toBe('number');
        expect(weights[category as keyof typeof weights]).toBeGreaterThan(0);
      });
    });

    it('should have all required threshold categories', () => {
      const thresholds = defaultDashboardConfig.thresholds;
      
      expect(thresholds).toHaveProperty('completionRate');
      expect(thresholds).toHaveProperty('averageProgress');
      expect(thresholds).toHaveProperty('completionTime');
      expect(thresholds).toHaveProperty('bottleneckDetection');
    });

    it('should have all required feature flags', () => {
      const features = defaultDashboardConfig.features;
      const requiredFeatures = [
        'enableRealTimeUpdates',
        'enableAdvancedAnalytics',
        'enablePredictiveInsights',
        'enableExportFunctionality',
        'enableNotifications'
      ];
      
      requiredFeatures.forEach(feature => {
        expect(features).toHaveProperty(feature);
        expect(typeof features[feature as keyof typeof features]).toBe('boolean');
      });
    });

    it('should have valid chart colors', () => {
      const colors = defaultDashboardConfig.ui.chartColors;
      
      expect(Array.isArray(colors)).toBe(true);
      expect(colors.length).toBeGreaterThan(0);
      
      colors.forEach(color => {
        expect(typeof color).toBe('string');
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  });
});