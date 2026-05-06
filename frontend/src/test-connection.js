/* eslint-disable no-console */
// Test connection script - run this in browser console
async function testConnection() {
  console.log('Testing ICC connection...');

  try {
    const response = await fetch('/api/icc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        V: 220,
        Z: 0.05
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);

    const data = await response.json();
    console.log('Response data:', data);

    if (data.success) {
      console.log('SUCCESS: Connection working!');
      alert('SUCCESS: ICC connection working!');
    } else {
      console.error('FAILED: Backend returned error');
      alert('FAILED: Backend returned error');
    }
  } catch (error) {
    console.error('FAILED: Connection error:', error);
    alert('FAILED: ' + error.message);
  }
}

// Auto-run test
testConnection();

// Also make it available globally
window.testICCConnection = testConnection;
