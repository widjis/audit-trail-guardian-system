/**
 * Configuration Manager
 * Utilities for managing dashboard configuration updates, migrations, and runtime changes
 */

import {
  DashboardConfig,
  defaultDashboardConfig,
  validateDashboardConfig,
  getDashboardConfig
} from '@/config/dashboardConfig';

/**
 * Configuration change event types
 */
export type ConfigurationChangeType = 
  | 'weights_updated'
  | 'thresholds_updated'
  | 'ui_settings_updated'
  | 'features_toggled'
  | 'alerts_updated'
  | 'full_config_updated';

/**
 * Configuration change event
 */
export interface ConfigurationChangeEvent {
  type: ConfigurationChangeType;
  timestamp: Date;
  changes: Partial<DashboardConfig>;
  previousConfig: DashboardConfig;
  newConfig: DashboardConfig;
  validationErrors: string[];
  source: 'user' | 'system' | 'migration' | 'environment';
}

/**
 * Configuration migration interface
 */
export interface ConfigurationMigration {
  version: string;
  description: string;
  migrate: (config: unknown) => DashboardConfig;
  validate?: (config: unknown) => boolean;
}

/**
 * Configuration manager class
 */
export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private currentConfig: DashboardConfig;
  private changeListeners: ((event: ConfigurationChangeEvent) => void)[] = [];
  private changeHistory: ConfigurationChangeEvent[] = [];
  private maxHistorySize = 50;

  private constructor() {
    this.currentConfig = getDashboardConfig();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  /**
   * Get current configuration
   */
  public getConfig(): DashboardConfig {
    return { ...this.currentConfig };
  }

  /**
   * Update configuration with validation
   */
  public updateConfig(
    changes: Partial<DashboardConfig>,
    source: ConfigurationChangeEvent['source'] = 'user'
  ): { success: boolean; errors: string[]; event?: ConfigurationChangeEvent } {
    const previousConfig = { ...this.currentConfig };
    const newConfig = this.mergeConfigurations(this.currentConfig, changes);
    const validationErrors = validateDashboardConfig(newConfig);

    if (validationErrors.length > 0) {
      return {
        success: false,
        errors: validationErrors
      };
    }

    // Determine change type
    const changeType = this.determineChangeType(changes);

    // Create change event
    const event: ConfigurationChangeEvent = {
      type: changeType,
      timestamp: new Date(),
      changes,
      previousConfig,
      newConfig,
      validationErrors: [],
      source
    };

    // Update current configuration
    this.currentConfig = newConfig;

    // Add to history
    this.addToHistory(event);

    // Notify listeners
    this.notifyListeners(event);

    return {
      success: true,
      errors: [],
      event
    };
  }

  /**
   * Reset configuration to defaults
   */
  public resetToDefaults(): { success: boolean; event: ConfigurationChangeEvent } {
    const result = this.updateConfig(defaultDashboardConfig, 'system');
    return {
      success: result.success,
      event: result.event!
    };
  }

  /**
   * Update progress weights with automatic normalization
   */
  public updateProgressWeights(
    weights: Partial<DashboardConfig['progressWeights']>,
    normalize: boolean = true
  ): { success: boolean; errors: string[]; normalizedWeights?: DashboardConfig['progressWeights'] } {
    let newWeights = { ...this.currentConfig.progressWeights, ...weights };

    if (normalize) {
      newWeights = this.normalizeProgressWeights(newWeights);
    }

    const result = this.updateConfig({ progressWeights: newWeights }, 'user');
    
    return {
      success: result.success,
      errors: result.errors,
      normalizedWeights: result.success ? newWeights : undefined
    };
  }

  /**
   * Update thresholds with validation
   */
  public updateThresholds(
    thresholds: Partial<DashboardConfig['thresholds']>
  ): { success: boolean; errors: string[] } {
    const newThresholds = {
      ...this.currentConfig.thresholds,
      ...thresholds,
      // Deep merge nested objects
      completionRate: {
        ...this.currentConfig.thresholds.completionRate,
        ...thresholds.completionRate
      },
      averageProgress: {
        ...this.currentConfig.thresholds.averageProgress,
        ...thresholds.averageProgress
      },
      completionTime: {
        ...this.currentConfig.thresholds.completionTime,
        ...thresholds.completionTime
      },
      bottleneckDetection: {
        ...this.currentConfig.thresholds.bottleneckDetection,
        ...thresholds.bottleneckDetection
      }
    };

    return this.updateConfig({ thresholds: newThresholds }, 'user');
  }

  /**
   * Toggle feature flags
   */
  public toggleFeature(
    feature: keyof DashboardConfig['features'],
    enabled?: boolean
  ): { success: boolean; errors: string[]; newValue: boolean } {
    const currentValue = this.currentConfig.features[feature];
    const newValue = enabled !== undefined ? enabled : !currentValue;
    
    const result = this.updateConfig({
      features: {
        ...this.currentConfig.features,
        [feature]: newValue
      }
    }, 'user');

    return {
      success: result.success,
      errors: result.errors,
      newValue
    };
  }

  /**
   * Add configuration change listener
   */
  public addChangeListener(listener: (event: ConfigurationChangeEvent) => void): () => void {
    this.changeListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.changeListeners.indexOf(listener);
      if (index > -1) {
        this.changeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get configuration change history
   */
  public getChangeHistory(limit?: number): ConfigurationChangeEvent[] {
    const history = [...this.changeHistory].reverse(); // Most recent first
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Export configuration
   */
  public exportConfiguration(): {
    config: DashboardConfig;
    metadata: {
      exportedAt: Date;
      version: string;
      environment: string;
    };
  } {
    return {
      config: this.getConfig(),
      metadata: {
        exportedAt: new Date(),
        version: '1.0.0', // This could be dynamic
        environment: process.env.NODE_ENV || 'unknown'
      }
    };
  }

  /**
   * Import configuration with validation
   */
  public importConfiguration(
    importData: {
      config: DashboardConfig;
      metadata?: Record<string, unknown>;
    }
  ): { success: boolean; errors: string[] } {
    const errors = validateDashboardConfig(importData.config);
    
    if (errors.length > 0) {
      return {
        success: false,
        errors: [`Import validation failed: ${errors.join(', ')}`]
      };
    }

    return this.updateConfig(importData.config, 'system');
  }

  /**
   * Apply configuration migration
   */
  public applyMigration(migration: ConfigurationMigration): { success: boolean; errors: string[] } {
    try {
      // Validate current config if migration has validation
      if (migration.validate && !migration.validate(this.currentConfig)) {
        return {
          success: false,
          errors: [`Migration ${migration.version} validation failed`]
        };
      }

      // Apply migration
      const migratedConfig = migration.migrate(this.currentConfig);
      
      // Validate migrated config
      const validationErrors = validateDashboardConfig(migratedConfig);
      if (validationErrors.length > 0) {
        return {
          success: false,
          errors: [`Migration ${migration.version} produced invalid config: ${validationErrors.join(', ')}`]
        };
      }

      // Apply the migrated configuration
      return this.updateConfig(migratedConfig, 'migration');
    } catch (error) {
      return {
        success: false,
        errors: [`Migration ${migration.version} failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Get configuration diff between two configs
   */
  public getConfigurationDiff(
    config1: DashboardConfig,
    config2: DashboardConfig
  ): { path: string; oldValue: unknown; newValue: unknown }[] {
  const diff: { path: string; oldValue: unknown; newValue: unknown }[] = [];
    
    const compareObjects = (obj1: Record<string, unknown>, obj2: Record<string, unknown>, path: string = '') => {
      for (const key in obj1) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object' && 
            obj1[key] !== null && obj2[key] !== null) {
          compareObjects(obj1[key], obj2[key], currentPath);
        } else if (obj1[key] !== obj2[key]) {
          diff.push({
            path: currentPath,
            oldValue: obj1[key],
            newValue: obj2[key]
          });
        }
      }
      
      // Check for new keys in obj2
      for (const key in obj2) {
        if (!(key in obj1)) {
          const currentPath = path ? `${path}.${key}` : key;
          diff.push({
            path: currentPath,
            oldValue: undefined,
            newValue: obj2[key]
          });
        }
      }
    };
    
    compareObjects(config1, config2);
    return diff;
  }

  // Private methods

  private mergeConfigurations(base: DashboardConfig, changes: Partial<DashboardConfig>): DashboardConfig {
    return {
      ...base,
      ...changes,
      // Deep merge nested objects
      progressWeights: {
        ...base.progressWeights,
        ...changes.progressWeights
      },
      thresholds: {
        ...base.thresholds,
        ...changes.thresholds,
        completionRate: {
          ...base.thresholds.completionRate,
          ...changes.thresholds?.completionRate
        },
        averageProgress: {
          ...base.thresholds.averageProgress,
          ...changes.thresholds?.averageProgress
        },
        completionTime: {
          ...base.thresholds.completionTime,
          ...changes.thresholds?.completionTime
        },
        bottleneckDetection: {
          ...base.thresholds.bottleneckDetection,
          ...changes.thresholds?.bottleneckDetection
        }
      },
      timePeriods: {
        ...base.timePeriods,
        ...changes.timePeriods
      },
      ui: {
        ...base.ui,
        ...changes.ui
      },
      features: {
        ...base.features,
        ...changes.features
      },
      alerts: {
        ...base.alerts,
        ...changes.alerts
      }
    };
  }

  private determineChangeType(changes: Partial<DashboardConfig>): ConfigurationChangeType {
    if (changes.progressWeights) return 'weights_updated';
    if (changes.thresholds) return 'thresholds_updated';
    if (changes.ui) return 'ui_settings_updated';
    if (changes.features) return 'features_toggled';
    if (changes.alerts) return 'alerts_updated';
    return 'full_config_updated';
  }

  private normalizeProgressWeights(
    weights: DashboardConfig['progressWeights']
  ): DashboardConfig['progressWeights'] {
    const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    
    if (total === 100) {
      return weights;
    }
    
    const factor = 100 / total;
    const normalized = {} as DashboardConfig['progressWeights'];
    
    for (const [key, value] of Object.entries(weights)) {
      normalized[key as keyof DashboardConfig['progressWeights']] = Math.round(value * factor);
    }
    
    // Ensure the total is exactly 100 by adjusting the largest weight
    const newTotal = Object.values(normalized).reduce((sum, weight) => sum + weight, 0);
    if (newTotal !== 100) {
      const largestKey = Object.entries(normalized)
        .reduce((max, [key, value]) => value > max.value ? { key, value } : max, { key: '', value: 0 })
        .key as keyof DashboardConfig['progressWeights'];
      
      normalized[largestKey] += (100 - newTotal);
    }
    
    return normalized;
  }

  private addToHistory(event: ConfigurationChangeEvent): void {
    this.changeHistory.push(event);
    
    // Maintain history size limit
    if (this.changeHistory.length > this.maxHistorySize) {
      this.changeHistory.shift();
    }
  }

  private notifyListeners(event: ConfigurationChangeEvent): void {
    this.changeListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Configuration change listener error:', error);
      }
    });
  }
}

/**
 * Convenience function to get configuration manager instance
 */
export const getConfigurationManager = () => ConfigurationManager.getInstance();

/**
 * React hook for configuration management
 */
export const useConfigurationManager = () => {
  const manager = getConfigurationManager();
  
  return {
    config: manager.getConfig(),
    updateConfig: manager.updateConfig.bind(manager),
    updateProgressWeights: manager.updateProgressWeights.bind(manager),
    updateThresholds: manager.updateThresholds.bind(manager),
    toggleFeature: manager.toggleFeature.bind(manager),
    resetToDefaults: manager.resetToDefaults.bind(manager),
    exportConfiguration: manager.exportConfiguration.bind(manager),
    importConfiguration: manager.importConfiguration.bind(manager),
    getChangeHistory: manager.getChangeHistory.bind(manager),
    addChangeListener: manager.addChangeListener.bind(manager)
  };
};

/**
 * Predefined configuration migrations
 */
export const configurationMigrations: ConfigurationMigration[] = [
  {
    version: '1.0.0',
    description: 'Initial configuration structure',
    migrate: (config: unknown) => config as DashboardConfig,
    validate: (config: unknown) => typeof config === 'object'
  },
  {
    version: '1.1.0',
    description: 'Add bottleneck detection thresholds',
    migrate: (config: unknown) => ({
      ...config,
      thresholds: {
        ...config.thresholds,
        bottleneckDetection: {
          critical: 50,
          warning: 70
        }
      }
    }),
    validate: (config: unknown) => !(config as DashboardConfig).thresholds?.bottleneckDetection
  },
  {
    version: '1.2.0',
    description: 'Add feature flags for new capabilities',
    migrate: (config: unknown) => ({
      ...config,
      features: {
        ...config.features,
        enablePredictiveInsights: false,
        enableExportFunctionality: true
      }
    }),
    validate: (config: unknown) => 
      config.features?.enablePredictiveInsights === undefined ||
      config.features?.enableExportFunctionality === undefined
  }
];

/**
 * Apply all pending migrations
 */
export const applyPendingMigrations = (): { success: boolean; appliedMigrations: string[]; errors: string[] } => {
  const manager = getConfigurationManager();
  const appliedMigrations: string[] = [];
  const errors: string[] = [];
  
  for (const migration of configurationMigrations) {
    const result = manager.applyMigration(migration);
    
    if (result.success) {
      appliedMigrations.push(migration.version);
    } else {
      errors.push(...result.errors);
    }
  }
  
  return {
    success: errors.length === 0,
    appliedMigrations,
    errors
  };
};