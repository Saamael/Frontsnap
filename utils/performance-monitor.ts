import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: number;
  metadata?: Record<string, any>;
}

interface MemoryInfo {
  jsHeapSizeLimit?: number;
  totalJSHeapSize?: number;
  usedJSHeapSize?: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private startTimes: Map<string, number> = new Map();
  private isMonitoring = false;
  private memoryCheckInterval?: NodeJS.Timer;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.recordMetric('performance_monitoring_started', 1, 'count');
    
    // Monitor memory usage every 30 seconds
    this.memoryCheckInterval = setInterval(() => {
      this.recordMemoryUsage();
    }, 30000);

    console.log('🚀 Performance monitoring started');
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = undefined;
    }

    this.recordMetric('performance_monitoring_stopped', 1, 'count');
    console.log('⏹️ Performance monitoring stopped');
  }

  // Timer methods
  startTimer(name: string): void {
    this.startTimes.set(name, performance.now());
  }

  endTimer(name: string, metadata?: Record<string, any>): number | null {
    const startTime = this.startTimes.get(name);
    if (!startTime) {
      console.warn(`Timer "${name}" was not started`);
      return null;
    }

    const duration = performance.now() - startTime;
    this.startTimes.delete(name);
    this.recordMetric(name, duration, 'ms', metadata);
    
    return duration;
  }

  // Direct metric recording
  recordMetric(
    name: string, 
    value: number, 
    unit: 'ms' | 'bytes' | 'count' | 'percentage',
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);
    
    // Keep only last 1000 metrics to prevent memory bloat
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Log significant performance issues
    if (unit === 'ms' && value > 1000) {
      console.warn(`⚠️ Slow operation detected: ${name} took ${value.toFixed(2)}ms`);
    }
  }

  // Memory monitoring
  private recordMemoryUsage(): void {
    try {
      // Get memory info (web only)
      if (Platform.OS === 'web' && 'memory' in performance) {
        const memory = (performance as any).memory as MemoryInfo;
        
        if (memory.usedJSHeapSize) {
          this.recordMetric('memory_used_js_heap', memory.usedJSHeapSize, 'bytes');
        }
        
        if (memory.totalJSHeapSize) {
          this.recordMetric('memory_total_js_heap', memory.totalJSHeapSize, 'bytes');
        }
        
        if (memory.jsHeapSizeLimit) {
          this.recordMetric('memory_js_heap_limit', memory.jsHeapSizeLimit, 'bytes');
          
          if (memory.usedJSHeapSize && memory.jsHeapSizeLimit) {
            const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
            this.recordMetric('memory_usage_percentage', usagePercentage, 'percentage');
            
            if (usagePercentage > 80) {
              console.warn(`⚠️ High memory usage: ${usagePercentage.toFixed(1)}%`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error recording memory usage:', error);
    }
  }

  // App lifecycle metrics
  recordAppStart(): void {
    this.recordMetric('app_start', Date.now(), 'count', {
      platform: Platform.OS,
      version: Platform.Version,
    });
  }

  recordScreenLoad(screenName: string, loadTime: number): void {
    this.recordMetric('screen_load_time', loadTime, 'ms', {
      screenName,
      platform: Platform.OS,
    });
  }

  recordApiCall(endpoint: string, duration: number, success: boolean): void {
    this.recordMetric('api_call_duration', duration, 'ms', {
      endpoint,
      success,
      platform: Platform.OS,
    });
  }

  recordImageProcessing(operation: string, duration: number, imageSize?: number): void {
    this.recordMetric('image_processing_time', duration, 'ms', {
      operation,
      imageSize,
      platform: Platform.OS,
    });
  }

  recordDatabaseQuery(table: string, operation: string, duration: number): void {
    this.recordMetric('database_query_time', duration, 'ms', {
      table,
      operation,
      platform: Platform.OS,
    });
  }

  // Network performance
  recordNetworkLatency(url: string, latency: number): void {
    this.recordMetric('network_latency', latency, 'ms', {
      url,
      platform: Platform.OS,
    });
  }

  recordBundleSize(bundleName: string, size: number): void {
    this.recordMetric('bundle_size', size, 'bytes', {
      bundleName,
      platform: Platform.OS,
    });
  }

  // User interaction metrics
  recordUserAction(action: string, duration?: number): void {
    this.recordMetric('user_action', duration || 1, duration ? 'ms' : 'count', {
      action,
      platform: Platform.OS,
    });
  }

  recordError(errorType: string, errorMessage?: string): void {
    this.recordMetric('error_occurrence', 1, 'count', {
      errorType,
      errorMessage,
      platform: Platform.OS,
    });
  }

  // Analysis methods
  getMetrics(filter?: {
    name?: string;
    timeRange?: { start: number; end: number };
    limit?: number;
  }): PerformanceMetric[] {
    let filtered = [...this.metrics];

    if (filter?.name) {
      filtered = filtered.filter(m => m.name.includes(filter.name!));
    }

    if (filter?.timeRange) {
      filtered = filtered.filter(m => 
        m.timestamp >= filter.timeRange!.start && 
        m.timestamp <= filter.timeRange!.end
      );
    }

    if (filter?.limit) {
      filtered = filtered.slice(-filter.limit);
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  getAverageMetric(name: string, timeRangeMs?: number): number | null {
    const now = Date.now();
    const cutoff = timeRangeMs ? now - timeRangeMs : 0;
    
    const relevantMetrics = this.metrics.filter(m => 
      m.name === name && m.timestamp >= cutoff
    );

    if (relevantMetrics.length === 0) return null;

    const sum = relevantMetrics.reduce((acc, m) => acc + m.value, 0);
    return sum / relevantMetrics.length;
  }

  getPerformanceSummary(): {
    totalMetrics: number;
    timeRange: { start: number; end: number } | null;
    averages: Record<string, number>;
    slowOperations: PerformanceMetric[];
    memoryUsage?: number;
  } {
    if (this.metrics.length === 0) {
      return {
        totalMetrics: 0,
        timeRange: null,
        averages: {},
        slowOperations: [],
      };
    }

    const timeRange = {
      start: Math.min(...this.metrics.map(m => m.timestamp)),
      end: Math.max(...this.metrics.map(m => m.timestamp)),
    };

    // Calculate averages for timing metrics
    const timingMetrics = this.metrics.filter(m => m.unit === 'ms');
    const metricNames = [...new Set(timingMetrics.map(m => m.name))];
    
    const averages: Record<string, number> = {};
    metricNames.forEach(name => {
      const avg = this.getAverageMetric(name);
      if (avg !== null) {
        averages[name] = avg;
      }
    });

    // Find slow operations (>500ms)
    const slowOperations = timingMetrics
      .filter(m => m.value > 500)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Get latest memory usage
    const memoryMetrics = this.metrics.filter(m => m.name === 'memory_usage_percentage');
    const latestMemory = memoryMetrics.length > 0 
      ? memoryMetrics[memoryMetrics.length - 1].value 
      : undefined;

    return {
      totalMetrics: this.metrics.length,
      timeRange,
      averages,
      slowOperations,
      memoryUsage: latestMemory,
    };
  }

  // Persistence
  async saveMetrics(): Promise<void> {
    try {
      const data = {
        metrics: this.metrics,
        timestamp: Date.now(),
      };
      
      await AsyncStorage.setItem(
        'performance_metrics',
        JSON.stringify(data)
      );
      
      console.log(`💾 Saved ${this.metrics.length} performance metrics`);
    } catch (error) {
      console.error('Error saving performance metrics:', error);
    }
  }

  async loadMetrics(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem('performance_metrics');
      if (data) {
        const parsed = JSON.parse(data);
        this.metrics = parsed.metrics || [];
        console.log(`📖 Loaded ${this.metrics.length} performance metrics`);
      }
    } catch (error) {
      console.error('Error loading performance metrics:', error);
    }
  }

  async clearMetrics(): Promise<void> {
    this.metrics = [];
    this.startTimes.clear();
    
    try {
      await AsyncStorage.removeItem('performance_metrics');
      console.log('🗑️ Cleared performance metrics');
    } catch (error) {
      console.error('Error clearing performance metrics:', error);
    }
  }

  // Export for analytics
  exportMetrics(): string {
    return JSON.stringify({
      platform: Platform.OS,
      version: Platform.Version,
      exportTime: new Date().toISOString(),
      metrics: this.metrics,
      summary: this.getPerformanceSummary(),
    }, null, 2);
  }
}

// Higher-order component for measuring component render time
export function withPerformanceTracking<T extends object>(
  Component: React.ComponentType<T>,
  componentName: string
): React.ComponentType<T> {
  return function PerformanceTrackedComponent(props: T) {
    const monitor = PerformanceMonitor.getInstance();
    
    React.useEffect(() => {
      monitor.startTimer(`${componentName}_mount`);
      
      return () => {
        monitor.endTimer(`${componentName}_unmount`);
      };
    }, []);

    monitor.startTimer(`${componentName}_render`);
    const result = React.createElement(Component, props);
    monitor.endTimer(`${componentName}_render`);
    
    return result;
  };
}

// Hook for measuring async operations
export function usePerformanceTimer() {
  const monitor = PerformanceMonitor.getInstance();
  
  return {
    startTimer: (name: string) => monitor.startTimer(name),
    endTimer: (name: string, metadata?: Record<string, any>) => 
      monitor.endTimer(name, metadata),
    recordMetric: (name: string, value: number, unit: 'ms' | 'bytes' | 'count' | 'percentage', metadata?: Record<string, any>) =>
      monitor.recordMetric(name, value, unit, metadata),
  };
}

export default PerformanceMonitor;