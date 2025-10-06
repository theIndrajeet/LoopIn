import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  type: 'timing' | 'count' | 'memory';
  metadata?: Record<string, any>;
}

interface PerformanceConfig {
  enableWebVitals?: boolean;
  enableMemoryMonitoring?: boolean;
  enableNetworkMonitoring?: boolean;
  sampleRate?: number; // 0-1, percentage of events to track
  batchSize?: number; // Number of metrics to batch before sending
  flushInterval?: number; // Milliseconds between batch sends
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private config: Required<PerformanceConfig>;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config: PerformanceConfig = {}) {
    this.config = {
      enableWebVitals: true,
      enableMemoryMonitoring: true,
      enableNetworkMonitoring: true,
      sampleRate: 1.0,
      batchSize: 10,
      flushInterval: 30000, // 30 seconds
      ...config
    };

    this.setupWebVitals();
    this.setupMemoryMonitoring();
    this.setupNetworkMonitoring();
    this.startFlushTimer();
  }

  private setupWebVitals() {
    if (!this.config.enableWebVitals) return;

    // Core Web Vitals
    this.observeLCP();
    this.observeFID();
    this.observeCLS();
    this.observeFCP();
    this.observeTTFB();
  }

  private observeLCP() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric('lcp', lastEntry.startTime, 'timing', {
          element: lastEntry.element?.tagName,
          url: lastEntry.url
        });
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      console.warn('LCP observation not supported:', error);
    }
  }

  private observeFID() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.recordMetric('fid', entry.processingStart - entry.startTime, 'timing', {
            eventType: entry.name
          });
        });
      });

      observer.observe({ entryTypes: ['first-input'] });
    } catch (error) {
      console.warn('FID observation not supported:', error);
    }
  }

  private observeCLS() {
    if (!('PerformanceObserver' in window)) return;

    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.recordMetric('cls', clsValue, 'timing');
      });

      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.warn('CLS observation not supported:', error);
    }
  }

  private observeFCP() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.recordMetric('fcp', entry.startTime, 'timing');
        });
      });

      observer.observe({ entryTypes: ['paint'] });
    } catch (error) {
      console.warn('FCP observation not supported:', error);
    }
  }

  private observeTTFB() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.recordMetric('ttfb', entry.responseStart - entry.requestStart, 'timing', {
            url: entry.name
          });
        });
      });

      observer.observe({ entryTypes: ['navigation'] });
    } catch (error) {
      console.warn('TTFB observation not supported:', error);
    }
  }

  private setupMemoryMonitoring() {
    if (!this.config.enableMemoryMonitoring || !('memory' in performance)) return;

    const checkMemory = () => {
      const memory = (performance as any).memory;
      if (memory) {
        this.recordMetric('memory_used', memory.usedJSHeapSize, 'memory');
        this.recordMetric('memory_total', memory.totalJSHeapSize, 'memory');
        this.recordMetric('memory_limit', memory.jsHeapSizeLimit, 'memory');
      }
    };

    // Check memory every 30 seconds
    setInterval(checkMemory, 30000);
    checkMemory(); // Initial check
  }

  private setupNetworkMonitoring() {
    if (!this.config.enableNetworkMonitoring) return;

    // Monitor fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const start = performance.now();
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - start;
        
        this.recordMetric('fetch_duration', duration, 'timing', {
          url,
          status: response.status,
          method: args[1]?.method || 'GET'
        });
        
        return response;
      } catch (error) {
        const duration = performance.now() - start;
        this.recordMetric('fetch_error', duration, 'timing', {
          url,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
      }
    };
  }

  private startFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  recordMetric(
    name: string,
    value: number,
    type: 'timing' | 'count' | 'memory',
    metadata?: Record<string, any>
  ) {
    if (Math.random() > this.config.sampleRate) return;

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      type,
      metadata
    };

    this.metrics.push(metric);

    // Flush if batch size reached
    if (this.metrics.length >= this.config.batchSize) {
      this.flush();
    }
  }

  private async flush() {
    if (this.metrics.length === 0) return;

    const metricsToSend = [...this.metrics];
    this.metrics = [];

    try {
      // Send to analytics service (implement based on your analytics provider)
      await this.sendMetrics(metricsToSend);
    } catch (error) {
      console.error('Failed to send performance metrics:', error);
      // Re-add metrics to queue for retry
      this.metrics.unshift(...metricsToSend);
    }
  }

  private async sendMetrics(metrics: PerformanceMetric[]) {
    // Example: Send to Supabase or external analytics service
    console.log('Performance metrics:', metrics);
    
    // You can implement actual sending logic here
    // For example, sending to a Supabase table or external service
  }

  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

// Global performance monitor instance
const performanceMonitor = new PerformanceMonitor();

// Hook for custom performance tracking
export const usePerformance = () => {
  const startTimeRef = useRef<number>(0);

  const startTimer = useCallback((name: string) => {
    startTimeRef.current = performance.now();
    return name;
  }, []);

  const endTimer = useCallback((name: string, metadata?: Record<string, any>) => {
    const duration = performance.now() - startTimeRef.current;
    performanceMonitor.recordMetric(name, duration, 'timing', metadata);
    return duration;
  }, []);

  const recordCustomMetric = useCallback((
    name: string,
    value: number,
    type: 'timing' | 'count' | 'memory' = 'timing',
    metadata?: Record<string, any>
  ) => {
    performanceMonitor.recordMetric(name, value, type, metadata);
  }, []);

  const measureAsync = useCallback(async <T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> => {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      performanceMonitor.recordMetric(name, duration, 'timing', {
        ...metadata,
        success: true
      });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      performanceMonitor.recordMetric(name, duration, 'timing', {
        ...metadata,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }, []);

  return {
    startTimer,
    endTimer,
    recordCustomMetric,
    measureAsync
  };
};

// Hook for component performance monitoring
export const useComponentPerformance = (componentName: string) => {
  const mountTimeRef = useRef<number>(0);
  const renderCountRef = useRef<number>(0);

  useEffect(() => {
    mountTimeRef.current = performance.now();
    renderCountRef.current = 0;

    return () => {
      const unmountTime = performance.now();
      const lifetime = unmountTime - mountTimeRef.current;
      
      performanceMonitor.recordMetric('component_lifetime', lifetime, 'timing', {
        component: componentName,
        renderCount: renderCountRef.current
      });
    };
  }, [componentName]);

  useEffect(() => {
    renderCountRef.current += 1;
    
    performanceMonitor.recordMetric('component_render', renderCountRef.current, 'count', {
      component: componentName
    });
  });

  return {
    renderCount: renderCountRef.current
  };
};

// Hook for API call performance monitoring
export const useAPIPerformance = () => {
  const measureAPICall = useCallback(async <T>(
    apiName: string,
    apiCall: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> => {
    const start = performance.now();
    
    try {
      const result = await apiCall();
      const duration = performance.now() - start;
      
      performanceMonitor.recordMetric('api_success', duration, 'timing', {
        api: apiName,
        ...metadata
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      performanceMonitor.recordMetric('api_error', duration, 'timing', {
        api: apiName,
        error: error instanceof Error ? error.message : 'Unknown error',
        ...metadata
      });
      
      throw error;
    }
  }, []);

  return { measureAPICall };
};

export { performanceMonitor };
