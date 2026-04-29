/**
 * test-all-endpoints.js - Test all available API endpoints
 */

const http = require('http')

// Test endpoint function
function testEndpoint(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method
    }

    if (data && method === 'POST') {
      const postData = JSON.stringify(data)
      options.headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }

    const req = http.request(options, (res) => {
      let responseData = ''
      
      res.on('data', (chunk) => {
        responseData += chunk
      })
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData)
          resolve({
            path,
            method,
            status: res.statusCode,
            success: parsed.success || res.statusCode === 200,
            data: parsed
          })
        } catch (error) {
          resolve({
            path,
            method,
            status: res.statusCode,
            success: false,
            error: 'Invalid JSON response',
            raw: responseData
          })
        }
      })
    })

    req.on('error', (error) => {
      reject({
        path,
        method,
        error: error.message
      })
    })

    if (data && method === 'POST') {
      req.write(JSON.stringify(data))
    }
    
    req.end()
  })
}

// Test all endpoints
async function testAllEndpoints() {
  // eslint-disable-next-line no-console
  console.log('============================================================')
  // eslint-disable-next-line no-console
  console.log('TESTING ALL ICC CALCULATOR API ENDPOINTS')
  // eslint-disable-next-line no-console
  console.log('============================================================\n')

  const tests = [
    // Main endpoints
    { path: '/icc', method: 'GET', description: 'Legacy ICC endpoint' },
    { path: '/api/icc', method: 'POST', data: { V: 13800, Z: 0.05 }, description: 'Main ICC calculation' },
    { path: '/api/icc', method: 'POST', data: { V: 220, Z: 0.05 }, description: 'ICC with standard values' },
    
    // Legacy aliases
    { path: '/cortocircuito/calculate', method: 'GET', description: 'Spanish legacy endpoint' },
    { path: '/api/cortocircuito/calculate', method: 'GET', description: 'Spanish API legacy' },
    
    // Error cases
    { path: '/api/icc', method: 'POST', data: { V: 13800, Z: 0 }, description: 'Zero impedance error' },
    { path: '/api/icc', method: 'POST', data: { V: 13800 }, description: 'Missing impedance' },
    { path: '/api/icc', method: 'POST', data: { Z: 0.05 }, description: 'Missing voltage' },
    { path: '/api/icc', method: 'POST', data: { V: 'invalid', Z: 0.05 }, description: 'Invalid voltage type' },
    
    // Invalid endpoints
    { path: '/api/invalid', method: 'GET', description: 'Invalid endpoint' },
    { path: '/api/icc/calculate', method: 'POST', description: 'Wrong ICC endpoint' },
    { path: '/api/icc/health', method: 'GET', description: 'Non-existent health endpoint' }
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    try {
      // eslint-disable-next-line no-console
      console.log(`Testing: ${test.description}`)
      // eslint-disable-next-line no-console
      console.log(`  ${test.method} ${test.path}`)
      
      const result = await testEndpoint(test.path, test.method, test.data)
      
      if (result.success || (result.status >= 200 && result.status < 300)) {
        // eslint-disable-next-line no-console
        console.log(`  Status: ${result.status} - SUCCESS`)
        
        if (result.data && result.data.data) {
          // eslint-disable-next-line no-console
          console.log(`  Method: ${result.data.data.method || 'N/A'}`)
          if (result.data.data.Icc) {
            // eslint-disable-next-line no-console
            console.log(`  ICC: ${result.data.data.Icc}A`)
          }
        }
        
        passed++
      } else {
        // eslint-disable-next-line no-console
        console.log(`  Status: ${result.status} - FAILED`)
        if (result.error) {
          // eslint-disable-next-line no-console
          console.log(`  Error: ${result.error}`)
        }
        if (result.data && result.data.error) {
          // eslint-disable-next-line no-console
          console.log(`  API Error: ${result.data.error}`)
        }
        failed++
      }
      
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(`  Status: ERROR - ${error.error}`)
      failed++
    }
    
    // eslint-disable-next-line no-console
    console.log('')
  }

  // Summary
  // eslint-disable-next-line no-console
  console.log('============================================================')
  // eslint-disable-next-line no-console
  console.log('TEST SUMMARY')
  // eslint-disable-next-line no-console
  console.log('============================================================')
  // eslint-disable-next-line no-console
  console.log(`Total tests: ${tests.length}`)
  // eslint-disable-next-line no-console
  console.log(`Passed: ${passed}`)
  // eslint-disable-next-line no-console
  console.log(`Failed: ${failed}`)
  // eslint-disable-next-line no-console
  console.log(`Success rate: ${((passed / tests.length) * 100).toFixed(1)}%`)
  
  if (failed === 0) {
    // eslint-disable-next-line no-console
    console.log('\n=== ALL TESTS PASSED ===')
  } else {
    // eslint-disable-next-line no-console
    console.log(`\n=== ${failed} TESTS FAILED ===`)
  }
  
  // eslint-disable-next-line no-console
  console.log('============================================================')
  
  process.exit(failed > 0 ? 1 : 0)
}

// Run tests
testAllEndpoints()
