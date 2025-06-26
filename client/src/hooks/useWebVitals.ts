import { useEffect } from 'react';

interface WebVitalMetric {
  name: string;
  value: number;
  delta: number;
  id: string;
  navigationType: string;
}

interface WebVitalsConfig {
  onCLS?: (metric: WebVitalMetric) => void;
  onFID?: (metric: WebVitalMetric) => void;
  onFCP?: (metric: WebVitalMetric) => void;
  onLCP?: (metric: WebVitalMetric) => void;
  onTTFB?: (metric: WebVitalMetric) => void;
}

export function useWebVitals(config: WebVitalsConfig = {}) {
  useEffect(() => {
    const reportMetric = (metric: WebVitalMetric) => {
      // Log performance metrics for monitoring
      if (metric.value > getThreshold(metric.name)) {
        console.warn(`⚠️ Poor ${metric.name}: ${metric.value}ms (threshold: ${getThreshold(metric.name)}ms)`);
      } else {
        console.log(`✅ Good ${metric.name}: ${metric.value}ms`);
      }

      // Call specific handlers
      switch (metric.name) {
        case 'CLS':
          config.onCLS?.(metric);
          break;
        case 'FID':
          config.onFID?.(metric);
          break;
        case 'FCP':
          config.onFCP?.(metric);
          break;
        case 'LCP':
          config.onLCP?.(metric);
          break;
        case 'TTFB':
          config.onTTFB?.(metric);
          break;
      }
    };

    // Polyfill for web-vitals library functionality
    const measureFCP = () => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          reportMetric({
            name: 'FCP',
            value: fcpEntry.startTime,
            delta: fcpEntry.startTime,
            id: 'fcp-' + Date.now(),
            navigationType: 'navigate'
          });
          observer.disconnect();
        }
      });
      observer.observe({ entryTypes: ['paint'] });
    };

    const measureLCP = () => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        reportMetric({
          name: 'LCP',
          value: lastEntry.startTime,
          delta: lastEntry.startTime,
          id: 'lcp-' + Date.now(),
          navigationType: 'navigate'
        });
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    };

    const measureTTFB = () => {
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigationEntry) {
        const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
        reportMetric({
          name: 'TTFB',
          value: ttfb,
          delta: ttfb,
          id: 'ttfb-' + Date.now(),
          navigationType: 'navigate'
        });
      }
    };

    // Initialize measurements
    measureFCP();
    measureLCP();
    measureTTFB();

    return () => {
      // Cleanup observers would happen here
    };
  }, [config]);
}

function getThreshold(metricName: string): number {
  switch (metricName) {
    case 'FCP':
      return 1800; // First Contentful Paint should be under 1.8s
    case 'LCP':
      return 2500; // Largest Contentful Paint should be under 2.5s
    case 'FID':
      return 100;  // First Input Delay should be under 100ms
    case 'CLS':
      return 0.1;  // Cumulative Layout Shift should be under 0.1
    case 'TTFB':
      return 800;  // Time to First Byte should be under 800ms
    default:
      return 1000;
  }
}