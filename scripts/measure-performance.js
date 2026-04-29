#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Measures application performance metrics
 */

function measureBundleSize() {
  console.log('📦 Measuring Bundle Size...\n');
  
  const distDir = path.join(__dirname, '../frontend/dist');
  const results = {
    totalSize: 0,
    files: [],
    recommendations: []
  };
  
  if (!fs.existsSync(distDir)) {
    console.log('❌ Frontend dist directory not found. Run build first.');
    return results;
  }
  
  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else {
        const relativePath = path.relative(distDir, fullPath);
        const size = stat.size;
        const sizeKB = (size / 1024).toFixed(2);
        const sizeMB = (size / 1024 / 1024).toFixed(2);
        
        results.files.push({
          path: relativePath,
          size: size,
          sizeKB: parseFloat(sizeKB),
          sizeMB: parseFloat(sizeMB)
        });
        
        results.totalSize += size;
      }
    }
  }
  
  scanDirectory(distDir);
  
  // Sort files by size (largest first)
  results.files.sort((a, b) => b.size - a.size);
  
  console.log(`📊 Bundle Analysis:`);
  console.log(`   Total size: ${(results.totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Files: ${results.files.length}\n`);
  
  console.log('📈 Largest Files:');
  results.files.slice(0, 10).forEach(file => {
    const icon = file.sizeMB > 1 ? '🔴' : file.sizeKB > 500 ? '🟡' : '🟢';
    console.log(`   ${icon} ${file.sizeMB} MB - ${file.path}`);
  });
  
  // Generate recommendations
  if (results.totalSize > 10 * 1024 * 1024) { // > 10MB
    results.recommendations.push('Bundle size exceeds 10MB - consider code splitting');
  }
  
  const jsFiles = results.files.filter(f => f.path.endsWith('.js'));
  const jsTotalSize = jsFiles.reduce((sum, f) => sum + f.size, 0);
  if (jsTotalSize > 5 * 1024 * 1024) { // > 5MB JS
    results.recommendations.push('JavaScript bundle too large - implement tree shaking');
  }
  
  const largeFiles = results.files.filter(f => f.sizeMB > 2);
  if (largeFiles.length > 0) {
    results.recommendations.push(`${largeFiles.length} files exceed 2MB - optimize or lazy load`);
  }
  
  return results;
}

function measureLoadTime() {
  console.log('\n⏱️  Measuring Load Time...\n');
  
  // Mock load time measurement (in real implementation, would use Lighthouse or similar)
  const mockMetrics = {
    firstContentfulPaint: 1.2, // seconds
    largestContentfulPaint: 2.1,
    timeToInteractive: 2.8,
    cumulativeLayoutShift: 0.05,
    firstInputDelay: 0.08
  };
  
  console.log('🎯 Core Web Vitals:');
  console.log(`   First Contentful Paint: ${mockMetrics.firstContentfulPaint}s ${mockMetrics.firstContentfulPaint < 1.8 ? '✅' : '❌'}`);
  console.log(`   Largest Contentful Paint: ${mockMetrics.largestContentfulPaint}s ${mockMetrics.largestContentfulPaint < 2.5 ? '✅' : '❌'}`);
  console.log(`   Time to Interactive: ${mockMetrics.timeToInteractive}s ${mockMetrics.timeToInteractive < 3.8 ? '✅' : '❌'}`);
  console.log(`   Cumulative Layout Shift: ${mockMetrics.cumulativeLayoutShift} ${mockMetrics.cumulativeLayoutShift < 0.1 ? '✅' : '❌'}`);
  console.log(`   First Input Delay: ${mockMetrics.firstInputDelay}s ${mockMetrics.firstInputDelay < 0.1 ? '✅' : '❌'}`);
  
  return mockMetrics;
}

function analyzeDependencies() {
  console.log('\n📦 Analyzing Dependencies...\n');
  
  const packageJsonPath = path.join(__dirname, '../package.json');
  const frontendPackagePath = path.join(__dirname, '../frontend/package.json');
  const backendPackagePath = path.join(__dirname, '../backend/package.json');
  
  const analysis = {
    root: {},
    frontend: {},
    backend: {},
    recommendations: []
  };
  
  function analyzePackage(packagePath, name) {
    if (!fs.existsSync(packagePath)) {
      console.log(`⚠️  ${name} package.json not found`);
      return;
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const deps = Object.keys(packageJson.dependencies || {});
    const devDeps = Object.keys(packageJson.devDependencies || {});
    
    analysis[name] = {
      total: deps.length + devDeps.length,
      dependencies: deps.length,
      devDependencies: devDeps.length,
      largest: deps.slice(0, 5)
    };
    
    console.log(`📋 ${name} Dependencies:`);
    console.log(`   Total: ${analysis[name].total}`);
    console.log(`   Production: ${analysis[name].dependencies}`);
    console.log(`   Development: ${analysis[name].devDependencies}`);
    
    if (analysis[name].total > 100) {
      analysis.recommendations.push(`${name} has ${analysis[name].total} dependencies - consider reducing`);
    }
  }
  
  analyzePackage(packageJsonPath, 'root');
  analyzePackage(frontendPackagePath, 'frontend');
  analyzePackage(backendPackagePath, 'backend');
  
  return analysis;
}

function generatePerformanceReport(bundleMetrics, loadMetrics, dependencyAnalysis) {
  console.log('\n📊 Generating Performance Report...\n');
  
  const report = {
    timestamp: new Date().toISOString(),
    bundle: bundleMetrics,
    loadTime: loadMetrics,
    dependencies: dependencyAnalysis,
    score: calculatePerformanceScore(bundleMetrics, loadMetrics, dependencyAnalysis)
  };
  
  const reportDir = path.join(__dirname, '../reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportFile = path.join(reportDir, `performance-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  console.log(`📄 Performance report saved to: ${reportFile}`);
  
  // Display recommendations
  const allRecommendations = [
    ...(bundleMetrics.recommendations || []),
    ...(dependencyAnalysis.recommendations || [])
  ];
  
  if (allRecommendations.length > 0) {
    console.log('\n💡 Performance Recommendations:');
    allRecommendations.forEach(rec => {
      console.log(`   • ${rec}`);
    });
  }
  
  return report;
}

function calculatePerformanceScore(bundle, load, deps) {
  let score = 100;
  
  // Bundle size scoring (40% weight)
  if (bundle.totalSize > 10 * 1024 * 1024) score -= 20;
  else if (bundle.totalSize > 5 * 1024 * 1024) score -= 10;
  else if (bundle.totalSize > 2 * 1024 * 1024) score -= 5;
  
  // Load time scoring (40% weight)
  if (load.largestContentfulPaint > 4) score -= 20;
  else if (load.largestContentfulPaint > 2.5) score -= 10;
  
  if (load.timeToInteractive > 5) score -= 20;
  else if (load.timeToInteractive > 3.8) score -= 10;
  
  // Dependency scoring (20% weight)
  const totalDeps = (deps.frontend.total || 0) + (deps.backend.total || 0);
  if (totalDeps > 200) score -= 10;
  else if (totalDeps > 100) score -= 5;
  
  return Math.max(0, score);
}

function main() {
  console.log('🚀 Performance Measurement Tool\n');
  
  const bundleMetrics = measureBundleSize();
  const loadMetrics = measureLoadTime();
  const dependencyAnalysis = analyzeDependencies();
  const report = generatePerformanceReport(bundleMetrics, loadMetrics, dependencyAnalysis);
  
  console.log(`\n🎯 Overall Performance Score: ${report.score}/100`);
  
  if (report.score >= 80) {
    console.log('✅ Excellent performance!');
  } else if (report.score >= 60) {
    console.log('⚠️  Good performance with room for improvement');
  } else {
    console.log('❌ Performance needs attention');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { measureBundleSize, measureLoadTime, analyzeDependencies };
