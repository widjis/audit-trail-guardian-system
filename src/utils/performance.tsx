/**
 * Performance monitoring utilities for React components and operations
 * Provides metrics collection and performance insights
 */

import React, { useEffect, useRef, useState } from 'react';

// TypeScript interface for PerformanceEventTiming (for FID measurement)
interface PerformanceEventTiming extends PerformanceEntry {
  processingStart?: number;
  processingEnd?: number;
  cancelable?: boolean;
}

// Performance metrics collector
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.NODE_ENV === 'development' || 
                     process.env.REACT_APP_ENABLE_PERFORMANCE_MONITORING === 'true';
  }

  // Measure function execution time
  measureSync<T>(name: string, fn: () => T): T {
    if (!this.isEnabled) return fn();

    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    this.recordMetric(name, end - start);
    return result;
  }

  // Measure async function execution time
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    if (!this.isEnabled) return fn();

    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    
    this.recordMetric(name, end - start);
    return result;
  }

  // Start a manual measurement
  startMeasurement(name: string): () => void {
    if (!this.isEnabled) return () => {};

    const start = performance.now();
    return () => {
      const end = performance.now();
      this.recordMetric(name, end - start);
    };
  }

  // Record a metric
  recordMetric(name: string, duration: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const measurements = this.metrics.get(name)!;
    measurements.push(duration);
    
    // Keep only last 100 measurements
    if (measurements.length > 100) {
      measurements.shift();
    }

    // Log slow operations
    if (duration > 100) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
    }
  }

  // Get performance statistics
  getStats(name: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p95: number;
  } | null {
    const measurements = this.metrics.get(name);
    if (!measurements || measurements.length === 0) return null;

    const sorted = [...measurements].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);
    const avg = sum / count;
    const min = sorted[0];
    const max = sorted[count - 1];
    const p95Index = Math.floor(count * 0.95);
    const p95 = sorted[p95Index];

    return { count, avg, min, max, p95 };
  }

  // Get all metrics
  getAllStats(): Record<string, ReturnType<typeof this.getStats>> {
    const stats: Record<string, ReturnType<typeof this.getStats>> = {};
    for (const [name] of this.metrics) {
      stats[name] = this.getStats(name);
    }
    return stats;
  }

  // Clear metrics
  clear(): void {
    this.metrics.clear();
  }

  // Log performance summary
  logSummary(): void {
    if (!this.isEnabled) return;

    console.group('Performance Summary');
    const stats = this.getAllStats();
    
    Object.entries(stats).forEach(([name, stat]) => {
      if (stat) {
        console.log(`${name}:`, {
          count: stat.count,
          avg: `${stat.avg.toFixed(2)}ms`,
          min: `${stat.min.toFixed(2)}ms`,
          max: `${stat.max.toFixed(2)}ms`,
          p95: `${stat.p95.toFixed(2)}ms`
        });
      }
    });
    
    console.groupEnd();
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for measuring component render time
export const useRenderPerformance = (componentName: string) => {
  const renderStartRef = useRef<number>();
  const mountTimeRef = useRef<number>();

  useEffect(() => {
    // Record mount time
    mountTimeRef.current = performance.now();
    
    return () => {
      // Record unmount time
      if (mountTimeRef.current) {
        const unmountTime = performance.now();
        const mountDuration = unmountTime - mountTimeRef.current;
        performanceMonitor.recordMetric(`${componentName}_mount_duration`, mountDuration);
      }
    };
  }, [componentName]);

  useEffect(() => {
    // Record render time
    if (renderStartRef.current) {
      const renderEnd = performance.now();
      const renderDuration = renderEnd - renderStartRef.current;
      performanceMonitor.recordMetric(`${componentName}_render`, renderDuration);
    }
  });

  // Start render measurement
  renderStartRef.current = performance.now();
};

// React hook for measuring data processing
export const useDataProcessingPerformance = () => {
  return {
    measureDataProcessing: (operationName: string, data: any, processor: (data: any) => any) => {
      return performanceMonitor.measureSync(`data_processing_${operationName}`, () => processor(data));
    },
    
    measureAsyncDataProcessing: async (operationName: string, data: any, processor: (data: any) => Promise<any>) => {
      return performanceMonitor.measureAsync(`async_data_processing_${operationName}`, () => processor(data));
    }
  };
};

// React hook for measuring API calls
export const useApiPerformance = () => {
  return {
    measureApiCall: async (endpoint: string, apiCall: () => Promise<any>) => {
      return performanceMonitor.measureAsync(`api_${endpoint}`, apiCall);
    }
  };
};

// Higher-order component for performance monitoring
export const withPerformanceMonitoring = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) => {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  const PerformanceMonitoredComponent = (props: P) => {
    useRenderPerformance(displayName);
    return <WrappedComponent {...props} />;
  };

  PerformanceMonitoredComponent.displayName = `withPerformanceMonitoring(${displayName})`;
  return PerformanceMonitoredComponent;
};

// Bundle size analyzer (for development)
export const analyzeBundleSize = () => {
  if (process.env.NODE_ENV !== 'development') return;

  // Estimate bundle size based on loaded modules
  const scripts = Array.from(document.querySelectorAll('script[src]'));
  let totalSize = 0;

  scripts.forEach(script => {
    const src = script.getAttribute('src');
    if (src && !src.startsWith('http')) {
      // This is a rough estimation - in real scenarios you'd use webpack-bundle-analyzer
      console.log(`Script: ${src}`);
    }
  });

  console.log(`Estimated total bundle size: ${totalSize} bytes`);
};

// Memory usage monitoring
export const monitorMemoryUsage = () => {
  if (!('memory' in performance)) {
    console.warn('Memory monitoring not supported in this browser');
    return null;
  }

  const memory = (performance as any).memory;
  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
    usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
  };
};

// Performance observer for Core Web Vitals
export const observeWebVitals = () => {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }

  // Largest Contentful Paint
  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    console.log('LCP:', lastEntry.startTime);
    performanceMonitor.recordMetric('web_vitals_lcp', lastEntry.startTime);
  });

  try {
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
  } catch (e) {
    console.warn('LCP observation not supported');
  }

  // First Input Delay
  const fidObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
      // Type assertion for PerformanceEventTiming which has processingStart
      const eventEntry = entry as PerformanceEventTiming;
      if (eventEntry.processingStart && eventEntry.startTime) {
        const fid = eventEntry.processingStart - eventEntry.startTime;
        console.log('FID:', fid);
        performanceMonitor.recordMetric('web_vitals_fid', fid);
      }
    });
  });

  try {
    fidObserver.observe({ entryTypes: ['first-input'] });
  } catch (e) {
    console.warn('FID observation not supported');
  }

  // Cumulative Layout Shift
  let clsValue = 0;
  const clsObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
      if (!(entry as any).hadRecentInput) {
        clsValue += (entry as any).value;
      }
    });
    console.log('CLS:', clsValue);
    performanceMonitor.recordMetric('web_vitals_cls', clsValue);
  });

  try {
    clsObserver.observe({ entryTypes: ['layout-shift'] });
  } catch (e) {
    console.warn('CLS observation not supported');
  }
};

// Initialize performance monitoring
export const initializePerformanceMonitoring = () => {
  if (typeof window !== 'undefined') {
    observeWebVitals();
    
    // Log performance summary every 30 seconds in development
    if (process.env.NODE_ENV === 'development') {
      setInterval(() => {
        performanceMonitor.logSummary();
        const memoryUsage = monitorMemoryUsage();
        if (memoryUsage) {
          console.log('Memory Usage:', memoryUsage);
        }
      }, 30000);
    }
  }
};