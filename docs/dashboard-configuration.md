# Dashboard Configuration System

This document describes the centralized configuration system for the Audit Trail Guardian System dashboard, which provides a maintainable and flexible way to manage dashboard settings, thresholds, and behavior.

## Overview

The dashboard configuration system centralizes all dashboard-related settings into a single, type-safe configuration object. This approach improves maintainability, consistency, and allows for environment-specific customizations.

## Key Features

- **Type Safety**: Full TypeScript support with comprehensive interfaces
- **Environment-Specific Overrides**: Different settings for development, production, and test environments
- **Validation**: Built-in validation to ensure configuration consistency
- **Centralized Management**: Single source of truth for all dashboard settings
- **Hot Reloading**: Configuration changes can be applied without code changes

## Configuration Structure

### Progress Weights

Defines how much each onboarding step contributes to the overall progress percentage:

```typescript
progressWeights: {
  accountCreation: 20,      // Account setup completion
  laptopStatus: 25,         // Laptop preparation and delivery
  licenseAssignment: 15,    // Software license allocation
  srfStatus: 15,           // SRF (Service Request Form) processing
  microsoft365License: 15,  // Microsoft 365 license assignment
  distributionListSync: 10  // Distribution list synchronization
}
```

**Important**: All weights must sum to exactly 100.

### Performance Thresholds

Defines performance benchmarks for various metrics:

```typescript
thresholds: {
  completionRate: {
    excellent: 90,  // ≥90% completion rate
    good: 75,       // ≥75% completion rate
    warning: 50     // <50% completion rate (needs attention)
  },
  averageProgress: {
    target: 70,     // Target average progress
    warning: 50     // Warning threshold
  },
  completionTime: {
    fast: 3,        // ≤3 days (excellent)
    acceptable: 5,  // ≤5 days (good)
    slow: 7         // >7 days (needs improvement)
  },
  bottleneckDetection: {
    critical: 50,   // >50% pending in one area
    warning: 70     // >70% completion in one area
  }
}
```

### Time Periods

Defines time windows for various analytics:

```typescript
timePeriods: {
  recentHires: 30,        // Days to consider "recent"
  upcomingOnboarding: 7,  // Days to look ahead for upcoming onboarding
  trendAnalysis: 90       // Days for trend analysis
}
```

### UI Settings

Controls dashboard appearance and behavior:

```typescript
ui: {
  maxInsights: 6,           // Maximum number of insights to display
  maxDepartments: 8,        // Maximum departments in analytics
  refreshInterval: 30000,   // Auto-refresh interval (milliseconds)
  chartColors: [...],       // Color palette for charts
  animationDuration: 300    // Animation duration (milliseconds)
}
```

### Feature Flags

Controls which features are enabled:

```typescript
features: {
  enableRealTimeUpdates: true,     // Real-time data updates
  enableAdvancedAnalytics: true,   // Advanced analytics features
  enablePredictiveInsights: false, // Predictive analytics (future)
  enableExportFunctionality: true, // Data export capabilities
  enableNotifications: true        // Push notifications
}
```

### Alert Settings

Defines when to trigger alerts:

```typescript
alerts: {
  lowCompletionRate: 60,    // Alert when completion rate < 60%
  highPendingCount: 10,     // Alert when pending setups ≥ 10
  slowProcessingTime: 7,    // Alert when avg. time > 7 days
  upcomingDeadlines: 3      // Alert when deadlines within 3 days
}
```

## Environment-Specific Configuration

The system supports different configurations for different environments:

### Development Environment
- Faster refresh intervals for testing
- Real-time updates disabled to reduce noise
- More verbose logging

### Production Environment
- Optimized refresh intervals
- All analytics features enabled
- Performance-focused settings

### Test Environment
- Very fast refresh for automated testing
- Notifications disabled
- Minimal external dependencies

## Usage Examples

### Basic Usage

```typescript
import { getDashboardConfig } from '@/config/dashboardConfig';

const config = getDashboardConfig();
const weights = config.progressWeights;
const thresholds = config.thresholds.completionRate;
```

### In React Components

```typescript
import { useDashboardConfig } from '@/hooks/useDashboardMetrics';

function MyComponent() {
  const config = useDashboardConfig();
  
  return (
    <div>
      <p>Target completion rate: {config.thresholds.completionRate.excellent}%</p>
      <p>Refresh interval: {config.ui.refreshInterval}ms</p>
    </div>
  );
}
```

### Progress Calculation

```typescript
import { calculateProgressPercentage } from '@/utils/progressCalculator';

// The function automatically uses the configured weights
const progress = calculateProgressPercentage(hire);
```

### Custom Hooks

```typescript
import { useDashboardMetrics, useDashboardAlerts } from '@/hooks/useDashboardMetrics';

function DashboardComponent({ hires }) {
  const metrics = useDashboardMetrics(hires);
  const alerts = useDashboardAlerts(metrics);
  
  return (
    <div>
      {alerts.map(alert => (
        <Alert key={alert.title} type={alert.type}>
          {alert.message}
        </Alert>
      ))}
    </div>
  );
}
```

## Configuration Validation

The system includes comprehensive validation to ensure configuration integrity:

```typescript
import { validateDashboardConfig, getValidatedDashboardConfig } from '@/config/dashboardConfig';

// Manual validation
const config = getDashboardConfig();
const errors = validateDashboardConfig(config);

if (errors.length > 0) {
  console.error('Configuration errors:', errors);
}

// Automatic validation
const validatedConfig = getValidatedDashboardConfig();
```

### Common Validation Errors

1. **Progress weights don't sum to 100**
   ```
   Progress weights must sum to 100, got 105
   ```

2. **Invalid threshold order**
   ```
   Excellent completion rate threshold must be higher than good threshold
   ```

3. **Invalid UI settings**
   ```
   Max insights must be between 1 and 20
   Refresh interval must be at least 1000ms
   ```

## Best Practices

### 1. Always Use the Configuration

❌ **Don't hardcode values:**
```typescript
if (completionRate >= 90) {
  // Hardcoded threshold
}
```

✅ **Use configuration:**
```typescript
const config = getDashboardConfig();
if (completionRate >= config.thresholds.completionRate.excellent) {
  // Configurable threshold
}
```

### 2. Validate Configuration Changes

Always run validation when modifying configuration:

```typescript
const errors = validateDashboardConfig(newConfig);
if (errors.length === 0) {
  // Safe to use
} else {
  // Handle errors
}
```

### 3. Use Type-Safe Access

Leverage TypeScript for compile-time safety:

```typescript
// TypeScript will catch typos and invalid properties
const weight = config.progressWeights.accountCreation; // ✅
const invalid = config.progressWeights.invalidProperty; // ❌ Compile error
```

### 4. Environment-Specific Testing

Test configuration in all environments:

```typescript
describe('Configuration', () => {
  ['development', 'production', 'test'].forEach(env => {
    it(`should be valid in ${env}`, () => {
      process.env.NODE_ENV = env;
      const config = getDashboardConfig();
      const errors = validateDashboardConfig(config);
      expect(errors).toHaveLength(0);
    });
  });
});
```

## Customization

### Adding New Configuration Options

1. **Update the interface:**
```typescript
export interface DashboardConfig {
  // ... existing properties
  newSection: {
    newProperty: number;
  };
}
```

2. **Add to default configuration:**
```typescript
export const defaultDashboardConfig: DashboardConfig = {
  // ... existing properties
  newSection: {
    newProperty: 42
  }
};
```

3. **Add validation if needed:**
```typescript
if (config.newSection.newProperty < 0) {
  errors.push('New property must be positive');
}
```

### Environment-Specific Overrides

Add environment-specific settings in `getEnvironmentConfig()`:

```typescript
case 'staging':
  return {
    ui: {
      refreshInterval: 15000
    },
    features: {
      enablePredictiveInsights: true
    }
  };
```

## Migration Guide

When migrating existing hardcoded values to use the configuration system:

1. **Identify hardcoded values** in your components
2. **Add corresponding configuration properties** if they don't exist
3. **Replace hardcoded values** with configuration access
4. **Add tests** to ensure the migration works correctly
5. **Update documentation** to reflect the changes

### Example Migration

**Before:**
```typescript
const isCompleted = progress >= 100;
const isOnTrack = progress >= 70;
```

**After:**
```typescript
const config = getDashboardConfig();
const isCompleted = progress >= 100;
const isOnTrack = progress >= config.thresholds.averageProgress.target;
```

## Troubleshooting

### Configuration Not Loading

1. Check import paths
2. Verify TypeScript compilation
3. Check for circular dependencies

### Validation Errors

1. Run `validateDashboardConfig()` to see specific errors
2. Check that progress weights sum to 100
3. Verify threshold ordering (excellent > good > warning)

### Performance Issues

1. Use `useMemo()` for expensive configuration calculations
2. Avoid calling `getDashboardConfig()` in render loops
3. Consider caching configuration at the application level

## Future Enhancements

- **Runtime Configuration Updates**: Hot-reload configuration without restart
- **User-Specific Overrides**: Allow users to customize their dashboard
- **A/B Testing Support**: Configuration variants for testing
- **Configuration UI**: Admin interface for configuration management
- **Configuration History**: Track configuration changes over time

## Related Files

- `src/config/dashboardConfig.ts` - Main configuration file
- `src/config/dashboardConfig.test.ts` - Comprehensive tests
- `src/hooks/useDashboardMetrics.ts` - Configuration-aware hooks
- `src/utils/progressCalculator.ts` - Uses configuration for calculations
- `src/utils/dataValidators.ts` - Type-safe data validation

## Support

For questions or issues with the configuration system:

1. Check this documentation
2. Review the test files for usage examples
3. Run validation to identify configuration issues
4. Consult the TypeScript interfaces for available options