#!/usr/bin/env node
/**
 * Quick Bundle Analysis - Phase 1A
 * Analyzes dependencies and imports without building
 * Part of Kimi-Dev performance baseline analysis
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Known heavy dependencies and their approximate sizes
const HEAVY_DEPENDENCIES = {
  'recharts': { size: '500KB+', usage: 'Analytics charts' },
  'xlsx': { size: '300KB+', usage: 'Excel import/export' },
  'framer-motion': { size: '150KB+', usage: 'Animations' },
  'embla-carousel-react': { size: '100KB+', usage: 'Carousel' },
  '@tanstack/react-query': { size: '50KB+', usage: 'Data fetching' },
  'react-hook-form': { size: '25KB+', usage: 'Forms' },
  'date-fns': { size: '75KB+', usage: 'Date formatting' },
  'zod': { size: '60KB+', usage: 'Validation' }
};

// Radix UI packages pattern
const RADIX_PATTERN = /^@radix-ui\//;

console.log('🔍 Quick Bundle Analysis - Phase 1A\n');

// 1. Analyze package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

console.log('📦 Analyzing Dependencies...\n');

// Count Radix UI packages
const radixPackages = Object.keys(dependencies).filter(dep => RADIX_PATTERN.test(dep));
console.log(`⚠️  Radix UI Components: ${radixPackages.length} packages`);
console.log('   Each adds ~10-30KB to bundle');
console.log('   Consider importing only needed components\n');

// Check for heavy dependencies
console.log('🏋️  Heavy Dependencies Found:');
Object.entries(HEAVY_DEPENDENCIES).forEach(([dep, info]) => {
  if (dependencies[dep]) {
    console.log(`   • ${dep}: ${info.size} - ${info.usage}`);
  }
});

// 2. Analyze imports in key files
console.log('\n📊 Analyzing Import Patterns...\n');

function analyzeImports(filePath, fileName) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const imports = content.match(/import .* from ['"].*['"]/g) || [];
    
    const analysis = {
      total: imports.length,
      radixImports: imports.filter(imp => imp.includes('@radix-ui')).length,
      lazyImports: (content.match(/lazy\(/g) || []).length,
      directPageImports: imports.filter(imp => imp.includes('./pages/')).length
    };
    
    console.log(`${fileName}:`);
    console.log(`   Total imports: ${analysis.total}`);
    console.log(`   Radix UI imports: ${analysis.radixImports}`);
    console.log(`   Lazy loaded components: ${analysis.lazyImports}`);
    console.log(`   Direct page imports: ${analysis.directPageImports}\n`);
    
    return analysis;
  } catch (e) {
    console.log(`   Could not analyze ${fileName}\n`);
    return null;
  }
}

// Analyze key files
analyzeImports(path.join(__dirname, 'client/src/App.tsx'), 'App.tsx');
analyzeImports(path.join(__dirname, 'client/src/pages/dashboard.tsx'), 'Dashboard');
analyzeImports(path.join(__dirname, 'client/src/pages/inventory.tsx'), 'Inventory');
analyzeImports(path.join(__dirname, 'client/src/pages/clients.tsx'), 'Clients');

// 3. Generate recommendations
console.log('💡 Optimization Recommendations:\n');

const recommendations = [
  {
    priority: 'HIGH',
    action: 'Lazy load heavy pages',
    impact: '30-40% initial bundle reduction',
    risk: 'LOW',
    details: 'Analytics, Reports, CSV Import/Export pages'
  },
  {
    priority: 'HIGH', 
    action: 'Replace 30+ Radix packages with targeted imports',
    impact: '200-300KB reduction',
    risk: 'MEDIUM',
    details: 'Import only the specific Radix components used'
  },
  {
    priority: 'MEDIUM',
    action: 'Lazy load xlsx library',
    impact: '300KB reduction', 
    risk: 'LOW',
    details: 'Only load when user accesses import/export'
  },
  {
    priority: 'MEDIUM',
    action: 'Lazy load recharts',
    impact: '500KB reduction',
    risk: 'LOW', 
    details: 'Only load on analytics/dashboard pages'
  },
  {
    priority: 'LOW',
    action: 'Enable compression',
    impact: '60-70% transfer size reduction',
    risk: 'MINIMAL',
    details: 'Add gzip/brotli compression middleware'
  }
];

recommendations.forEach(rec => {
  console.log(`[${rec.priority}] ${rec.action}`);
  console.log(`   Impact: ${rec.impact}`);
  console.log(`   Risk: ${rec.risk}`);
  console.log(`   Details: ${rec.details}\n`);
});

// 4. Save analysis report
const report = {
  timestamp: new Date().toISOString(),
  radixPackageCount: radixPackages.length,
  heavyDependencies: Object.keys(HEAVY_DEPENDENCIES).filter(dep => dependencies[dep]),
  recommendations: recommendations,
  estimatedSavings: '1-2MB initial bundle size reduction possible'
};

fs.writeFileSync('quick-bundle-analysis.json', JSON.stringify(report, null, 2));
console.log('✅ Analysis complete! Report saved to quick-bundle-analysis.json');

// 5. Next steps
console.log('\n📋 Next Steps (Phase 1B - Safe Optimizations):');
console.log('1. Add compression middleware (zero risk)');
console.log('2. Implement performance tracking dashboard'); 
console.log('3. Test lazy loading on non-critical pages');
console.log('4. Measure impact before proceeding');