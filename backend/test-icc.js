/**
 * test-icc.js - Test ICC endpoint functionality
 */

const http = require('http')

// Test data
const testData = {
  voltage: 13800,
  impedance: 0.05
}

// Test ICC endpoint
function testICCEndpoint() {
  const postData = JSON.stringify(testData)

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/icc/calculate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }

  const req = http.request(options, (res) => {
    // eslint-disable-next-line no-console
    console.log(`Status: ${res.statusCode}`)
    // eslint-disable-next-line no-console
    console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`)

    res.setEncoding('utf8')
    let data = ''

    res.on('data', (chunk) => {
      data += chunk
    })

    res.on('end', () => {
      try {
        const result = JSON.parse(data)
        // eslint-disable-next-line no-console
        console.log(`Response: ${JSON.stringify(result, null, 2)}`)
        
        // Validate result
        if (result.success && result.result) {
          // eslint-disable-next-line no-console
          console.log('\n=== ICC CALCULATION SUCCESS ===')
          // eslint-disable-next-line no-console
          console.log(`Input: ${testData.voltage}V, Z=${testData.impedance}Ohms`)
          // eslint-disable-next-line no-console
          console.log(`3-Phase Fault Current: ${result.result.isc_3f.toFixed(2)}A`)
          // eslint-disable-next-line no-console
          console.log(`3-Phase Fault Current: ${result.result.isc_3f_ka.toFixed(3)}kA`)
          // eslint-disable-next-line no-console
          console.log(`1-Phase Fault Current: ${result.result.isc_1f.toFixed(2)}A`)
          // eslint-disable-next-line no-console
          console.log(`1-Phase Fault Current: ${result.result.isc_1f_ka.toFixed(3)}kA`)
        } else {
          // eslint-disable-next-line no-console
          console.log('\n=== ICC CALCULATION FAILED ===')
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error parsing response:', error.message)
        // eslint-disable-next-line no-console
        console.log('Raw response:', data)
      }
      
      process.exit(0)
    })
  })

  req.on('error', (error) => {
    // eslint-disable-next-line no-console
    console.error('Request error:', error.message)
    process.exit(1)
  })

  req.write(postData)
  req.end()
}

// Test health endpoint
function testHealthEndpoint() {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/icc/health',
    method: 'GET'
  }

  const req = http.request(options, (res) => {
    // eslint-disable-next-line no-console
    console.log(`Health Status: ${res.statusCode}`)
    
    res.setEncoding('utf8')
    let data = ''

    res.on('data', (chunk) => {
      data += chunk
    })

    res.on('end', () => {
      try {
        const result = JSON.parse(data)
        // eslint-disable-next-line no-console
        console.log('Health Response:', JSON.stringify(result, null, 2))
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error parsing health response:', error.message)
      }
      
      // Test ICC endpoint after health
      testICCEndpoint()
    })
  })

  req.on('error', (error) => {
    // eslint-disable-next-line no-console
    console.error('Health request error:', error.message)
    // Try ICC endpoint anyway
    testICCEndpoint()
  })

  req.end()
}

// Start testing
// eslint-disable-next-line no-console
console.log('Testing ICC Calculator API...')
testHealthEndpoint()
