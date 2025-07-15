// Jest setup file
// This file is executed before each test file

// Add custom Jest matchers if needed
// import '@testing-library/jest-dom';

// Global test configuration
global.console = {
  ...console,
  // Uncomment to ignore specific console methods in tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Mock environment variables for tests
process.env.NODE_ENV = 'test';