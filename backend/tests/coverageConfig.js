/**
 * tests/coverageConfig.js - Coverage configuration helper
 * 
 * Responsibility: Detect if running under coverage and adjust test expectations
 */

// Check if we're running under coverage instrumentation
const isCoverageRun = process.env.NODE_ENV === 'test' && 
  (process.argv.includes('--coverage') || 
   process.argv.includes('coverage') ||
   process.env.COVERAGE === 'true');

// Export coverage-aware utilities
module.exports = {
  isCoverageRun,
  
  // Time limits for performance tests (more generous under coverage)
  getTimeLimits: (baseLimits) => {
    if (isCoverageRun) {
      return {
        small: baseLimits.small * 5,
        medium: baseLimits.medium * 4,
        large: baseLimits.large * 5
      };
    }
    return baseLimits;
  },
  
  // Skip tests that are timing-sensitive under coverage
  skipIfCoverage: (testFn) => {
    return isCoverageRun ? test.skip : testFn;
  },
  
  // Adjust test expectations for coverage
  adjustForCoverage: (value, coverageValue) => {
    return isCoverageRun ? coverageValue : value;
  }
};
