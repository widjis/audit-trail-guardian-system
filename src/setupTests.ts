// Jest/Vitest setup file
// This file is executed before each test file

// Add custom Jest matchers for DOM testing
import '@testing-library/jest-dom';

// Determine which testing framework is being used
const isVitest = typeof globalThis.vi !== 'undefined';
const isJest = typeof globalThis.jest !== 'undefined';

// Create a universal mock function
const createMockFn = () => {
  if (isVitest) {
    return globalThis.vi.fn();
  } else if (isJest) {
    return globalThis.jest.fn();
  } else {
    // Fallback mock function
    return () => {};
  }
};

// Global test configuration
global.console = {
  ...console,
  // Uncomment to ignore specific console methods in tests
  // log: createMockFn(),
  // debug: createMockFn(),
  // info: createMockFn(),
  // warn: createMockFn(),
  // error: createMockFn(),
};

// Mock environment variables for tests
process.env.NODE_ENV = 'test';

// Mock window.matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (() => {
    const mockFn = createMockFn();
    const mockImplementation = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: createMockFn(), // deprecated
      removeListener: createMockFn(), // deprecated
      addEventListener: createMockFn(),
      removeEventListener: createMockFn(),
      dispatchEvent: createMockFn(),
    });
    
    if (typeof mockFn === 'function' && 'mockImplementation' in mockFn) {
      return mockFn.mockImplementation(mockImplementation);
    }
    return mockImplementation;
  })(),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  root: Element | Document | null = null;
  rootMargin: string = '0px';
  thresholds: ReadonlyArray<number> = [0];

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.root = options?.root || null;
    this.rootMargin = options?.rootMargin || '0px';
    this.thresholds = options?.threshold 
      ? (Array.isArray(options.threshold) ? options.threshold : [options.threshold])
      : [0];
  }

  observe() {
    return null;
  }

  disconnect() {
    return null;
  }

  unobserve() {
    return null;
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    // Store callback if needed for testing
  }

  observe() {
    return null;
  }

  disconnect() {
    return null;
  }

  unobserve() {
    return null;
  }
};