/**
 * test-icc-fixed.js - Test ICC endpoint with correct format
 */

const http = require('http')

// Test data - matching server.js expected format
const testData = {
  V: 13800,  // Voltage in volts
  Z: 0.05    // Impedance in ohms
}

// Test ICC endpoint
function testICCEndpoint() {
  const postData = JSON.stringify(testData)

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/icc',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }

  const req = http.request(options, (res) => {
    // eslint-disable-next-line no-console
    console.log(`Status: ${res.statusCode}`)
    
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
        if (result.success && result.data) {
          // eslint-disable-next-line no-console
          console.log('\n=== ICC CALCULATION SUCCESS ===')
          // eslint-disable-next-line no-console
          console.log(`Input: ${testData.V}V, Z=${testData.Z}Ohms`)
          // eslint-disable-next-line no-console
          console.log(`Method: ${result.data.method}`)
          // eslint-disable-next-line no-console
          console.log(`Fault Current: ${result.data.Icc}A`)
          // eslint-disable-next-line no-console
          console.log(`Precision: ${result.data.precision}`)
          
          if (result.data.systemBuses) {
            // eslint-disable-next-line no-console
            console.log(`System Analysis: ${result.data.systemBuses} buses, ${result.data.systemBranches} branches`)
          }
        } else {
          // eslint-disable-next-line no-console
          console.log('\n=== ICC CALCULATION FAILED ===')
          if (result.error) {
            // eslint-disable-next-line no-console
            console.log(`Error: ${result.error}`)
          }
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

// Test legacy endpoint
function testLegacyEndpoint() {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/icc',
    method: 'GET'
  }

  const req = http.request(options, (res) => {
    // eslint-disable-next-line no-console
    console.log(`Legacy Status: ${res.statusCode}`)
    
    res.setEncoding('utf8')
    let data = ''

    res.on('data', (chunk) => {
      data += chunk
    })

    res.on('end', () => {
      try {
        const result = JSON.parse(data)
        // eslint-disable-next-line no-console
        console.log('Legacy Response:', JSON.stringify(result, null, 2))
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error parsing legacy response:', error.message)
      }
      
      // Test main ICC endpoint
      testICCEndpoint()
    })
  })

  req.on('error', (error) => {
    // eslint-disable-next-line no-console
    console.error('Legacy request error:', error.message)
    // Try main ICC endpoint anyway
    testICCEndpoint()
  })

  req.end()
}

// Start testing
// eslint-disable-next-line no-console
console.log('Testing ICC Calculator API (Fixed)...')
testLegacyEndpoint()
