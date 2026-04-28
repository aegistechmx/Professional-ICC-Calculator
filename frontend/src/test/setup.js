// src/test/setup.js
import '@testing-library/jest-dom';

// Mock axios for API calls
import { vi } from 'vitest';
import axios from 'axios';

vi.mock('axios');
axios.create = vi.fn(() => axios);

// Mock Zustand stores
vi.mock('../store/useStore', () => ({
  useStore: vi.fn(() => ({
    calculatePowerFlow: vi.fn(),
    setResults: vi.fn(),
    setLoading: vi.fn()
  }))
}));

// Global test utilities
global.testUtils = {
  // Helper to render components with providers
  renderWithProviders: (component) => {
    return component; // Simplified for now
  },

  // Mock API responses
  mockApiResponse: (data, status = 200) => ({
    data,
    status,
    statusText: 'OK'
  }),

  // Mock API error
  mockApiError: (message, status = 500) => {
    const error = new Error(message);
    error.response = {
      data: { message },
      status,
      statusText: 'Internal Server Error'
    };
    return error;
  }
};