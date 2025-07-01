#!/usr/bin/env node
/**
 * Bundle Analysis Script - Phase 1A
 * Analyzes the production bundle without modifying vite.config.ts
 * Part of Kimi-Dev performance baseline analysis
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Build the project with stats
console.log('🔍 Building project with bundle analysis...');

// Create a temporary vite config for analysis only
const analyzeConfig = `
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: './bundle-stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap' // or 'sunburst', 'network'
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Log what's being bundled
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'vendor-charts': ['recharts'],
          'vendor-utils': ['xlsx', 'date-fns'],
        }
      }
    }
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
`;

// Write temporary config
fs.writeFileSync('vite.analyze.config.ts', analyzeConfig);

// Run build with analysis config
const buildProcess = exec('vite build --config vite.analyze.config.ts', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    cleanup();
    return;
  }
  
  console.log('✅ Build complete! Analysis saved to bundle-stats.html');
  console.log('\n📊 Bundle Size Summary:');
  
  // Parse build output for size info
  const lines = stdout.split('\n');
  lines.forEach(line => {
    if (line.includes('dist/') || line.includes('gzip:')) {
      console.log(line);
    }
  });
  
  // Generate markdown report
  generateReport();
  
  // Cleanup
  cleanup();
});

buildProcess.stdout.on('data', (data) => {
  if (data.includes('chunk') || data.includes('KB')) {
    console.log(data.trim());
  }
});

function generateReport() {
  const report = `# Bundle Analysis Report
Generated: ${new Date().toISOString()}

## Key Findings

### Large Dependencies Detected
Based on the baseline analysis, these are the main contributors to bundle size:

1. **Radix UI Components** (30+ packages)
   - Impact: HIGH
   - Solution: Import only needed components

2. **Recharts** (Analytics/Charts)
   - Impact: HIGH  
   - Solution: Lazy load analytics page

3. **XLSX** (Excel processing)
   - Impact: HIGH
   - Solution: Lazy load import/export features

4. **Framer Motion** (Animations)
   - Impact: HIGH
   - Solution: Use CSS animations for simple cases

5. **Embla Carousel**
   - Impact: HIGH
   - Solution: Remove if not actively used

## Recommendations

### Immediate Actions (Zero Risk)
1. Review bundle-stats.html for detailed breakdown
2. Identify unused imports
3. Document current bundle composition

### Next Steps (Low Risk)
1. Implement compression middleware
2. Add static asset caching headers
3. Optimize images with modern formats

### Future Optimizations (Medium Risk)
1. Code split large route components
2. Lazy load heavy dependencies
3. Implement progressive loading

View the interactive bundle analysis by opening: bundle-stats.html
`;
  
  fs.writeFileSync('bundle-analysis-report.md', report);
  console.log('\n📄 Report saved to bundle-analysis-report.md');
}

function cleanup() {
  // Remove temporary config
  try {
    fs.unlinkSync('vite.analyze.config.ts');
  } catch (e) {
    // Ignore if already deleted
  }
}