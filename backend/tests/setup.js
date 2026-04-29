/**
 * tests/setup.js - Comprehensive test setup for Jest
 * 
 * Responsibility: Configure test environment, mocks, and utilities
 */

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
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.LOG_LEVEL = 'error';

// Mock external dependencies
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    keys: jest.fn(),
    flushall: jest.fn()
  }));
});

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    getJob: jest.fn(),
    getJobs: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    close: jest.fn()
  })),
  Worker: jest.fn().mockImplementation(() => ({
    run: jest.fn(),
    close: jest.fn()
  }))
}));

// Global test utilities
global.testUtils = {
  // Helper to create mock request/response objects
  createMockReq: (body = {}, params = {}, query = {}, headers = {}) => ({
    body,
    params,
    query,
    headers: {
      'content-type': 'application/json',
      ...headers
    },
    user: { id: 1, email: 'test@example.com', role: 'engineer' }
  }),

  createMockRes: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.set = jest.fn().mockReturnValue(res);
    return res;
  },

  // Helper to create mock power system data
  createMockPowerSystem: (busCount = 3) => {
    const buses = [];
    const branches = [];
    
    for (let i = 1; i <= busCount; i++) {
      if (i === 1) {
        buses.push({ id: i, type: 'slack', voltage: 1.0, angle: 0.0 });
      } else if (i <= 2) {
        buses.push({ id: i, type: 'pv', voltage: 1.0, power: 0.5 });
      } else {
        buses.push({ id: i, type: 'pq', power: -0.3, reactive: -0.1 });
      }
    }
    
    for (let i = 1; i < busCount; i++) {
      branches.push({
        from: i,
        to: i + 1,
        impedance: { real: 0.01, imag: 0.03 }
      });
    }
    
    return { buses, branches };
  },

  // Helper to create mock complex numbers
  createMockComplex: (real, imag) => ({
    real,
    imag,
    magnitude: Math.sqrt(real * real + imag * imag),
    angle: Math.atan2(imag, real)
  }),

  // Helper to wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Helper to generate random test data
  randomFloat: (min = 0, max = 1) => Math.random() * (max - min) + min,
  randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,

  // Helper to create mock job data
  createMockJob: (type = 'powerflow') => ({
    id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    status: 'queued',
    data: global.testUtils.createMockPowerSystem(),
    createdAt: new Date(),
    updatedAt: new Date()
  })
};

// Performance monitoring setup
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(() => []),
  getEntriesByType: jest.fn(() => [])
};

// Memory monitoring setup
if (typeof process !== 'undefined') {
  process.memoryUsage = jest.fn(() => ({
    rss: 50 * 1024 * 1024,
    heapTotal: 20 * 1024 * 1024,
    heapUsed: 15 * 1024 * 1024,
    external: 2 * 1024 * 1024,
    arrayBuffers: 1 * 1024 * 1024
  }));
}

// Global test cleanup
afterEach(() => {
  jest.clearAllMocks();
});

// Setup and teardown hooks
beforeAll(() => {
  // Initialize test database if needed
  console.log('Test environment initialized');
});

afterAll(() => {
  // Cleanup test environment
  console.log('Test environment cleaned up');
});