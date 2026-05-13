import http from 'http';
import { describe, it, expect } from 'vitest';

const API_URL = 'http://localhost:3001';
const TARGET_ORIGIN = 'http://localhost:5173';

function runCorsTest() {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'OPTIONS',
      headers: {
        Origin: TARGET_ORIGIN,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    };

    const req = http.request(`${API_URL}/api/health`, options, (res) => {
      const acao = res.headers['access-control-allow-origin'];
      const acam = res.headers['access-control-allow-methods'];

      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        resolve({ statusCode: res.statusCode, acao, acam });
      } else {
        reject(new Error(`Unexpected status ${res.statusCode}`));
      }
    });

    req.on('error', (error) => {
      reject(new Error(`CORS request failed: ${error.message}`));
    });

    req.end();
  });
}

describe('CORS integration', () => {
  it('returns the proper Access-Control-Allow-Origin header for the frontend origin', async () => {
    const result = await runCorsTest();

    expect(result.acao).toBe(TARGET_ORIGIN);
    expect(result.acam).toEqual(expect.stringContaining('POST'));
  });
});
