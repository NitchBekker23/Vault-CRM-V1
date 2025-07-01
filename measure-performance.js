#!/usr/bin/env node
/**
 * Performance Measurement Script - Phase 1D
 * Measures and tracks performance improvements
 * Part of Kimi-Dev performance optimization
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read previous measurements if they exist
let previousMeasurements = {};
const measurementFile = 'performance-measurements.json';

try {
  if (fs.existsSync(measurementFile)) {
    previousMeasurements = JSON.parse(fs.readFileSync(measurementFile, 'utf8'));
  }
} catch (e) {
  console.log('No previous measurements found, starting fresh.');
}

// Current measurements from console logs
const currentMeasurements = {
  timestamp: new Date().toISOString(),
  metrics: {
    FCP: {
      value: 11848,
      threshold: 1800,
      status: 'POOR',
      percentageOverThreshold: ((11848 - 1800) / 1800 * 100).toFixed(1) + '%'
    },
    LCP: {
      value: 12164,
      threshold: 2500,
      status: 'POOR',
      percentageOverThreshold: ((12164 - 2500) / 2500 * 100).toFixed(1) + '%'
    },
    TTFB: {
      value: 387,
      threshold: 800,
      status: 'GOOD',
      percentageUnderThreshold: ((800 - 387) / 800 * 100).toFixed(1) + '%'
    }
  },
  optimizations: {
    completed: [
      'Client refresh interval: 3s → 30s',
      'Client stale time: 0s → 30s',
      'Compression: Already enabled (gzip level 6)'
    ],
    pending: [
      'Lazy load heavy dependencies (recharts, xlsx)',
      'Optimize Radix UI imports',
      'Remove unused dependencies',
      'Code split non-critical pages'
    ]
  }
};

// Calculate improvements if we have previous data
if (previousMeasurements.metrics) {
  const improvements = {};
  
  Object.keys(currentMeasurements.metrics).forEach(metric => {
    const current = currentMeasurements.metrics[metric].value;
    const previous = previousMeasurements.metrics[metric]?.value;
    
    if (previous) {
      const change = ((current - previous) / previous * 100).toFixed(1);
      improvements[metric] = {
        previous,
        current,
        change: change + '%',
        improved: current < previous
      };
    }
  });
  
  currentMeasurements.improvements = improvements;
}

// Save measurements
fs.writeFileSync(measurementFile, JSON.stringify(currentMeasurements, null, 2));

// Generate report
console.log('\n📊 PERFORMANCE MEASUREMENT REPORT');
console.log('=' + '='.repeat(50));
console.log(`Timestamp: ${currentMeasurements.timestamp}\n`);

console.log('📈 Current Metrics:');
Object.entries(currentMeasurements.metrics).forEach(([metric, data]) => {
  const status = data.status === 'GOOD' ? '✅' : '❌';
  console.log(`${status} ${metric}: ${data.value}ms (threshold: ${data.threshold}ms)`);
});

if (currentMeasurements.improvements && Object.keys(currentMeasurements.improvements).length > 0) {
  console.log('\n📊 Changes Since Last Measurement:');
  Object.entries(currentMeasurements.improvements).forEach(([metric, data]) => {
    const arrow = data.improved ? '↓' : '↑';
    const emoji = data.improved ? '✅' : '❌';
    console.log(`${emoji} ${metric}: ${data.previous}ms → ${data.current}ms (${arrow} ${data.change})`);
  });
}

console.log('\n✅ Completed Optimizations:');
currentMeasurements.optimizations.completed.forEach(opt => {
  console.log(`  • ${opt}`);
});

console.log('\n⏳ Pending Optimizations:');
currentMeasurements.optimizations.pending.forEach(opt => {
  console.log(`  • ${opt}`);
});

// Recommendations
console.log('\n💡 Next Steps:');
console.log('1. Monitor performance after client refresh optimization');
console.log('2. If improved, proceed with lazy loading non-critical pages');
console.log('3. Track each change individually before moving to next');
console.log('4. Keep authentication flow untouched');

console.log('\n📄 Measurements saved to:', measurementFile);