/**
 * Dashboard Configuration
 * Centralized configuration for dashboard metrics, thresholds, and settings
 */

export interface DashboardConfig {
  // Progress calculation weights (must sum to 100)
  progressWeights: {
    accountCreation: number;
    laptopStatus: number;
    licenseAssignment: number;
    srfStatus: number;
    microsoft365License: number;
    distributionListSync: number;
  };

  // Performance thresholds
  thresholds: {
    completionRate: {
      excellent: number;
      good: number;
      warning: number;
    };
    averageProgress: {
      target: number;
      warning: number;
    };
    completionTime: {
      fast: number;
      acceptable: number;
      slow: number;
    };
    bottleneckDetection: {
      critical: number;
      warning: number;
    };
    bottleneckMetric: number;
  };

  // Time periods for analytics
  timePeriods: {
    recentHires: number; // days
    upcomingOnboarding: number; // days
    trendAnalysis: number; // days
  };

  // UI settings
  ui: {
    maxInsights: number;
    maxDepartments: number;
    refreshInterval: number; // milliseconds
    chartColors: string[];
    animationDuration: number;
  };

  // Feature flags
  features: {
    enableRealTimeUpdates: boolean;
    enableAdvancedAnalytics: boolean;
    enablePredictiveInsights: boolean;
    enableExportFunctionality: boolean;
    enableNotifications: boolean;
  };

  // Alert settings
  alerts: {
    lowCompletionRate: number;
    highPendingCount: number;
    slowProcessingTime: number;
    upcomingDeadlines: number;
  };
}

/**
 * Default dashboard configuration
 * Can be overridden by environment variables or user preferences
 */
export const defaultDashboardConfig: DashboardConfig = {
  progressWeights: {
    accountCreation: 20,
    laptopStatus: 25,
    licenseAssignment: 15,
    srfStatus: 15,
    microsoft365License: 15,
    distributionListSync: 10
  },

  thresholds: {
    completionRate: {
      excellent: 90,
      good: 75,
      warning: 50
    },
    averageProgress: {
      target: 70,
      warning: 50
    },
    completionTime: {
      fast: 3,
      acceptable: 5,
      slow: 7
    },
    bottleneckDetection: {
      critical: 50,
      warning: 70
    },
    bottleneckMetric: 60
  },

  timePeriods: {
    recentHires: 30,
    upcomingOnboarding: 7,
    trendAnalysis: 90
  },

  ui: {
    maxInsights: 6,
    maxDepartments: 8,
    refreshInterval: 30000, // 30 seconds
    chartColors: [
      '#3b82f6', // blue
      '#10b981', // green
      '#f59e0b', // yellow
      '#ef4444', // red
      '#8b5cf6', // purple
      '#06b6d4', // cyan
      '#84cc16', // lime
      '#f97316'  // orange
    ],
    animationDuration: 300
  },

  features: {
    enableRealTimeUpdates: true,
    enableAdvancedAnalytics: true,
    enablePredictiveInsights: false, // Future feature
    enableExportFunctionality: true,
    enableNotifications: true
  },

  alerts: {
    lowCompletionRate: 60,
    highPendingCount: 10,
    slowProcessingTime: 7,
    upcomingDeadlines: 3
  }
};

/**
 * Environment-specific configuration overrides
 */
export const getEnvironmentConfig = (): Partial<DashboardConfig> => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'development':
      return {
        ui: {
          ...defaultDashboardConfig.ui,
          refreshInterval: 10000 // Faster refresh in dev
        },
        features: {
          ...defaultDashboardConfig.features,
          enableRealTimeUpdates: false // Disable in dev to reduce noise
        }
      };
    
    case 'production':
      return {
        ui: {
          ...defaultDashboardConfig.ui,
          refreshInterval: 60000 // Slower refresh in prod
        },
        features: {
          ...defaultDashboardConfig.features,
          enableAdvancedAnalytics: true
        }
      };
    
    case 'test':
      return {
        ui: {
          ...defaultDashboardConfig.ui,
          refreshInterval: 1000 // Very fast for testing
        },
        features: {
          ...defaultDashboardConfig.features,
          enableRealTimeUpdates: false,
          enableNotifications: false
        }
      };
    
    default:
      return {};
  }
};

/**
 * Merge default config with environment overrides
 */
export const getDashboardConfig = (): DashboardConfig => {
  const envConfig = getEnvironmentConfig();
  
  return {
    ...defaultDashboardConfig,
    ...envConfig,
    // Deep merge nested objects
    progressWeights: {
      ...defaultDashboardConfig.progressWeights,
      ...envConfig.progressWeights
    },
    thresholds: {
      ...defaultDashboardConfig.thresholds,
      ...envConfig.thresholds,
      completionRate: {
        ...defaultDashboardConfig.thresholds.completionRate,
        ...envConfig.thresholds?.completionRate
      },
      averageProgress: {
        ...defaultDashboardConfig.thresholds.averageProgress,
        ...envConfig.thresholds?.averageProgress
      },
      completionTime: {
        ...defaultDashboardConfig.thresholds.completionTime,
        ...envConfig.thresholds?.completionTime
      },
      bottleneckDetection: {
        ...defaultDashboardConfig.thresholds.bottleneckDetection,
        ...envConfig.thresholds?.bottleneckDetection
      }
    },
    timePeriods: {
      ...defaultDashboardConfig.timePeriods,
      ...envConfig.timePeriods
    },
    ui: {
      ...defaultDashboardConfig.ui,
      ...envConfig.ui
    },
    features: {
      ...defaultDashboardConfig.features,
      ...envConfig.features
    },
    alerts: {
      ...defaultDashboardConfig.alerts,
      ...envConfig.alerts
    }
  };
};

/**
 * Validate configuration values
 */
export const validateDashboardConfig = (config: DashboardConfig): string[] => {
  const errors: string[] = [];
  
  // Validate progress weights sum to 100
  const totalWeight = Object.values(config.progressWeights).reduce((sum, weight) => sum + weight, 0);
  if (Math.abs(totalWeight - 100) > 0.01) {
    errors.push(`Progress weights must sum to 100, got ${totalWeight}`);
  }
  
  // Validate threshold ranges
  const { completionRate, averageProgress, completionTime } = config.thresholds;
  
  if (completionRate.excellent <= completionRate.good) {
    errors.push('Excellent completion rate threshold must be higher than good threshold');
  }
  
  if (completionRate.good <= completionRate.warning) {
    errors.push('Good completion rate threshold must be higher than warning threshold');
  }
  
  if (averageProgress.target <= averageProgress.warning) {
    errors.push('Average progress target must be higher than warning threshold');
  }
  
  if (completionTime.fast >= completionTime.acceptable) {
    errors.push('Fast completion time must be less than acceptable time');
  }
  
  if (completionTime.acceptable >= completionTime.slow) {
    errors.push('Acceptable completion time must be less than slow time');
  }
  
  // Validate UI settings
  if (config.ui.maxInsights < 1 || config.ui.maxInsights > 20) {
    errors.push('Max insights must be between 1 and 20');
  }
  
  if (config.ui.refreshInterval < 1000) {
    errors.push('Refresh interval must be at least 1000ms');
  }
  
  return errors;
};

/**
 * Get configuration with validation
 */
export const getValidatedDashboardConfig = (): DashboardConfig => {
  const config = getDashboardConfig();
  const errors = validateDashboardConfig(config);
  
  if (errors.length > 0) {
    console.error('Dashboard configuration validation errors:', errors);
    // In production, you might want to fall back to a known good config
    // or throw an error to prevent startup with invalid config
  }
  
  return config;
};