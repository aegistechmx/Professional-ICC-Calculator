// tests/setup.js
// Setup file for Jest tests

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Keep log and warn for debugging, but suppress info
  info: jest.fn(),
  debug: jest.fn(),
  // Keep error for important messages
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Global test utilities
global.testUtils = {
  // Helper to create mock request/response objects
  createMockReq: (body = {}, params = {}, query = {}) => ({
    body,
    params,
    query,
    user: { id: 1, email: 'test@example.com' }
  }),

  createMockRes: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
  },

  // Helper to wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};