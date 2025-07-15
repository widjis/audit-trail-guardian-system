/**
 * Custom hook for dashboard metrics calculation
 * Provides centralized logic for all dashboard statistics and analytics
 */

import { useMemo } from 'react';
import { NewHire } from '@/types/types';
import { calculateProgressPercentage } from '@/utils/progressCalculator';
import { isLicenseAssigned, isAccountActive, isLaptopReady, hasM365License, AccountStatus, LaptopStatus } from '@/utils/dataValidators';
import { getDashboardConfig } from '@/config/dashboardConfig';

export interface DashboardMetrics {
  // Basic counts
  totalHires: number;
  completedSetups: number;
  pendingSetups: number;
  percentComplete: number;
  averageProgress: number;

  // Component metrics
  accountsCreated: number;
  laptopsReady: number;
  licensesAssigned: number;
  m365Licenses: number;

  // Time-based metrics
  recentHires: number;
  upcomingOnboarding: number;
  avgCompletionTime: number;

  // Performance indicators
  bottleneckMetric: number;
  completionTrend: 'up' | 'down' | 'stable';

  // Department analytics
  departmentData: Array<{
    name: string;
    count: number;
    completed: number;
    pending: number;
    completionRate: number;
  }>;

  // Insights
  insights: Array<{
    type: 'success' | 'warning' | 'alert' | 'info' | 'trend';
    message: string;
    priority: number;
  }>;
}

export function useDashboardMetrics(hires: NewHire[]): DashboardMetrics {
  return useMemo(() => {
    const config = getDashboardConfig();
    const totalHires = hires.length;
    
    // Calculate completion using centralized progress calculator
    const completedSetups = hires.filter(hire => {
      const progressPercentage = calculateProgressPercentage(hire);
      return progressPercentage === 100;
    }).length;
    
    const pendingSetups = totalHires - completedSetups;
    const percentComplete = totalHires > 0 ? Math.round((completedSetups / totalHires) * 100) : 0;
    
    // Calculate average progress percentage across all hires
    const averageProgress = totalHires > 0 ? Math.round(
      hires.reduce((sum, hire) => sum + calculateProgressPercentage(hire), 0) / totalHires
    ) : 0;

    // Component-specific metrics using type-safe validators
    const accountsCreated = hires.filter(h => isAccountActive(h.account_creation_status as AccountStatus)).length;
    const laptopsReady = hires.filter(h => isLaptopReady(h.laptop_ready as LaptopStatus)).length;
    const licensesAssigned = hires.filter(h => isLicenseAssigned(h.license_assigned)).length;
    const m365Licenses = hires.filter(h => hasM365License(h.microsoft_365_license)).length;

    // Time-based calculations
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - config.timePeriods.recentHires);
    const recentHires = hires.filter(h => 
      h.created_at && new Date(h.created_at) >= thirtyDaysAgo
    ).length;

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + config.timePeriods.upcomingOnboarding);
    const upcomingOnboarding = hires.filter(h => 
      h.start_date && new Date(h.start_date) <= sevenDaysFromNow && new Date(h.start_date) >= new Date()
    ).length;

    // Calculate average completion time (simplified)
    const completedHires = hires.filter(h => calculateProgressPercentage(h) === 100);
    const avgCompletionTime = completedHires.length > 0 
      ? Math.round(completedHires.reduce((sum, hire) => {
          if (hire.created_at && hire.updated_at) {
            const created = new Date(hire.created_at);
            const updated = new Date(hire.updated_at);
            return sum + Math.abs(updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          }
          return sum + 3; // Default 3 days if dates unavailable
        }, 0) / completedHires.length)
      : 3;

    // Performance indicators
    const bottleneckMetric = Math.min(
      (accountsCreated / totalHires) * 100,
      (laptopsReady / totalHires) * 100,
      (licensesAssigned / totalHires) * 100,
      (m365Licenses / totalHires) * 100
    ) || 0;

    // Determine completion trend (simplified)
    const completionTrend: 'up' | 'down' | 'stable' = 
      percentComplete >= 80 ? 'up' : 
      percentComplete <= 50 ? 'down' : 'stable';

    // Department analytics
    const departments: Record<string, { count: number; completed: number; pending: number }> = {};
    
    hires.forEach(hire => {
      const dept = hire.department || 'Unknown';
      if (!departments[dept]) {
        departments[dept] = { count: 0, completed: 0, pending: 0 };
      }
      
      departments[dept].count++;
      
      const progressPercentage = calculateProgressPercentage(hire);
      if (progressPercentage === 100) {
        departments[dept].completed++;
      } else {
        departments[dept].pending++;
      }
    });

    const departmentData = Object.entries(departments).map(([name, data]) => ({
      name,
      count: data.count,
      completed: data.completed,
      pending: data.pending,
      completionRate: data.count > 0 ? Math.round((data.completed / data.count) * 100) : 0
    }));

    // Generate insights with configurable thresholds
    const insights: DashboardMetrics['insights'] = [];

    if (percentComplete >= config.thresholds.completionRate.excellent) {
      insights.push({
        type: 'success',
        message: `Excellent completion rate of ${percentComplete}%! Your onboarding process is highly efficient.`,
        priority: 1
      });
    } else if (percentComplete <= config.thresholds.completionRate.warning) {
      insights.push({
        type: 'alert',
        message: `Completion rate is ${percentComplete}%. Consider reviewing bottlenecks in the onboarding process.`,
        priority: 1
      });
    }

    if (bottleneckMetric < config.thresholds.bottleneckMetric) {
      const bottleneckArea = 
        (accountsCreated / totalHires) * 100 === bottleneckMetric ? 'Account Creation' :
        (laptopsReady / totalHires) * 100 === bottleneckMetric ? 'Laptop Preparation' :
        (licensesAssigned / totalHires) * 100 === bottleneckMetric ? 'License Assignment' :
        'Microsoft 365 Licenses';
      
      insights.push({
        type: 'warning',
        message: `${bottleneckArea} appears to be a bottleneck (${Math.round(bottleneckMetric)}% completion rate).`,
        priority: 2
      });
    }

    if (avgCompletionTime > config.alerts.slowProcessingTime) {
      insights.push({
        type: 'warning',
        message: `Average completion time is ${avgCompletionTime} days. Consider streamlining the process.`,
        priority: 3
      });
    }

    if (upcomingOnboarding > config.alerts.upcomingDeadlines) {
      insights.push({
        type: 'info',
        message: `${upcomingOnboarding} new hires starting within ${config.timePeriods.upcomingOnboarding} days. Ensure resources are prepared.`,
        priority: 4
      });
    }

    if (averageProgress > config.thresholds.averageProgress.target) {
      insights.push({
        type: 'trend',
        message: `Strong average progress of ${averageProgress}% indicates effective onboarding workflows.`,
        priority: 5
      });
    }

    // Sort insights by priority
    insights.sort((a, b) => a.priority - b.priority);

    return {
      totalHires,
      completedSetups,
      pendingSetups,
      percentComplete,
      averageProgress,
      accountsCreated,
      laptopsReady,
      licensesAssigned,
      m365Licenses,
      recentHires,
      upcomingOnboarding,
      avgCompletionTime,
      bottleneckMetric,
      completionTrend,
      departmentData,
      insights: insights.slice(0, config.ui.maxInsights) // Limit to configured max insights
    };
  }, [hires]);
}

/**
 * Hook for getting dashboard configuration
 */
export function useDashboardConfig() {
  return useMemo(() => getDashboardConfig(), []);
}

/**
 * Hook for performance alerts based on thresholds
 */
export function useDashboardAlerts(metrics: ReturnType<typeof useDashboardMetrics>) {
  return useMemo(() => {
    const config = getDashboardConfig();
    const alerts = [];
    
    if (metrics.percentComplete < config.alerts.lowCompletionRate) {
      alerts.push({
        type: 'warning' as const,
        title: 'Low Completion Rate',
        message: `Completion rate is ${metrics.percentComplete}%, below threshold of ${config.alerts.lowCompletionRate}%`,
        action: 'Review pending setups and identify bottlenecks'
      });
    }
    
    if (metrics.pendingSetups >= config.alerts.highPendingCount) {
      alerts.push({
        type: 'error' as const,
        title: 'High Pending Count',
        message: `${metrics.pendingSetups} setups are pending completion`,
        action: 'Prioritize pending setups and allocate additional resources'
      });
    }
    
    if (metrics.avgCompletionTime > config.alerts.slowProcessingTime) {
      alerts.push({
        type: 'warning' as const,
        title: 'Slow Processing',
        message: `Average completion time is ${metrics.avgCompletionTime} days`,
        action: 'Optimize onboarding process and remove bottlenecks'
      });
    }
    
    if (metrics.upcomingOnboarding >= config.alerts.upcomingDeadlines) {
      alerts.push({
        type: 'info' as const,
        title: 'Upcoming Deadlines',
        message: `${metrics.upcomingOnboarding} onboardings scheduled soon`,
        action: 'Prepare resources and ensure readiness'
      });
    }
    
    return alerts;
  }, [metrics]);
}

/**
 * Hook for real-time dashboard updates
 * Provides auto-refresh functionality and loading states
 */
export function useDashboardUpdates(refreshInterval: number = 30000) {
  // This could be extended to include:
  // - Auto-refresh logic
  // - Loading states
  // - Error handling
  // - WebSocket connections for real-time updates
  
  return {
    lastUpdated: new Date(),
    isRefreshing: false,
    refreshData: () => {
      // Implement refresh logic
      console.log('Refreshing dashboard data...');
    }
  };
}