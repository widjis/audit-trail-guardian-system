import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';

// Mock implementations for common services
export const mockAuthService = {
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  getCurrentUser: vi.fn(),
  isAuthenticated: vi.fn(),
  refreshToken: vi.fn()
};

export const mockApiService = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn()
};

// Test utilities
export const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

// Wrapper component for tests that need React Query
export const TestQueryProvider = ({ children, queryClient = createTestQueryClient() }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

// Wrapper component for tests that need routing
export const TestRouterProvider = ({ children, initialEntries = ['/'] }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

// Combined wrapper for tests that need both Query and Router
export const TestProviders = ({ 
  children, 
  queryClient = createTestQueryClient(),
  initialEntries = ['/']
}) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      {children}
    </BrowserRouter>
  </QueryClientProvider>
);

// Custom render function with providers
export const renderWithProviders = (
  ui,
  {
    queryClient = createTestQueryClient(),
    initialEntries = ['/'],
    ...renderOptions
  } = {}
) => {
  const Wrapper = ({ children }) => (
    <TestProviders queryClient={queryClient} initialEntries={initialEntries}>
      {children}
    </TestProviders>
  );

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
};

// Mock data generators
export const createMockUser = (overrides = {}) => ({
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
});

export const createMockHire = (overrides = {}) => ({
  id: 1,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  position: 'Software Engineer',
  department: 'Engineering',
  startDate: '2024-01-15',
  status: 'pending',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
});

export const createMockApiResponse = (data, overrides = {}) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {},
  ...overrides
});

// Test helpers for form interactions
export const fillForm = async (user, formData) => {
  for (const [fieldName, value] of Object.entries(formData)) {
    const field = screen.getByLabelText(new RegExp(fieldName, 'i')) || 
                  screen.getByPlaceholderText(new RegExp(fieldName, 'i')) ||
                  screen.getByRole('textbox', { name: new RegExp(fieldName, 'i') });
    
    if (field) {
      await user.clear(field);
      await user.type(field, value);
    }
  }
};

export const submitForm = async (user, formSelector = 'form') => {
  const form = screen.getByRole('form') || document.querySelector(formSelector);
  const submitButton = form?.querySelector('button[type=\"submit\"]') || 
                      screen.getByRole('button', { name: /submit|save|create|update/i });
  
  if (submitButton) {
    await user.click(submitButton);
  }
};

// Test helpers for async operations
export const waitForLoadingToFinish = async () => {
  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });
};

export const waitForErrorToAppear = async (errorMessage) => {
  await waitFor(() => {
    expect(screen.getByText(new RegExp(errorMessage, 'i'))).toBeInTheDocument();
  });
};

// Mock localStorage
export const mockLocalStorage = () => {
  const store = {};
  
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index) => Object.keys(store)[index] || null)
  };
};

// Mock sessionStorage
export const mockSessionStorage = () => mockLocalStorage();

// Setup function for common test environment
export const setupTestEnvironment = () => {
  // Mock window.localStorage
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage(),
    writable: true
  });

  // Mock window.sessionStorage
  Object.defineProperty(window, 'sessionStorage', {
    value: mockSessionStorage(),
    writable: true
  });

  // Mock window.location
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost:3000',
      origin: 'http://localhost:3000',
      pathname: '/',
      search: '',
      hash: '',
      assign: vi.fn(),
      replace: vi.fn(),
      reload: vi.fn()
    },
    writable: true
  });

  // Mock console methods to reduce noise in tests
  global.console = {
    ...console,
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  };

  // Mock fetch
  global.fetch = vi.fn();

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn()
  }));

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn()
  }));
};

// Cleanup function for tests
export const cleanupTestEnvironment = () => {
  vi.clearAllMocks();
  vi.resetAllMocks();
};

// Custom matchers for better assertions
export const customMatchers = {
  toBeInTheDocument: (received) => {
    const pass = received && document.body.contains(received);
    return {
      message: () => `expected element ${pass ? 'not ' : ''}to be in the document`,
      pass
    };
  },
  
  toHaveClass: (received, className) => {
    const pass = received && received.classList.contains(className);
    return {
      message: () => `expected element ${pass ? 'not ' : ''}to have class "${className}"`,
      pass
    };
  },
  
  toBeVisible: (received) => {
    const pass = received && 
                 received.offsetParent !== null && 
                 getComputedStyle(received).visibility !== 'hidden' &&
                 getComputedStyle(received).display !== 'none';
    return {
      message: () => `expected element ${pass ? 'not ' : ''}to be visible`,
      pass
    };
  }
};

// Test data factories
export const TestDataFactory = {
  user: (overrides = {}) => createMockUser(overrides),
  hire: (overrides = {}) => createMockHire(overrides),
  
  users: (count = 5, overrides = {}) => 
    Array.from({ length: count }, (_, i) => 
      createMockUser({ id: i + 1, email: `user${i + 1}@example.com`, ...overrides })
    ),
  
  hires: (count = 5, overrides = {}) =>
    Array.from({ length: count }, (_, i) =>
      createMockHire({ id: i + 1, email: `hire${i + 1}@example.com`, ...overrides })
    ),
  
  apiError: (message = 'Something went wrong', status = 500) => ({
    response: {
      data: { error: message },
      status,
      statusText: status === 404 ? 'Not Found' : 'Internal Server Error'
    },
    message
  })
};

// Performance testing utilities
export const measureRenderTime = (renderFn) => {
  const start = performance.now();
  const result = renderFn();
  const end = performance.now();
  
  return {
    result,
    renderTime: end - start
  };
};

export const expectRenderTimeUnder = (renderFn, maxTime = 100) => {
  const { renderTime } = measureRenderTime(renderFn);
  expect(renderTime).toBeLessThan(maxTime);
};

// Accessibility testing helpers
export const checkAccessibility = async (container) => {
  const { axe } = await import('@axe-core/react');
  const results = await axe(container);
  
  if (results.violations.length > 0) {
    console.error('Accessibility violations:', results.violations);
  }
  
  expect(results.violations).toHaveLength(0);
};

// Export all utilities
export {
  render,
  screen,
  fireEvent,
  waitFor,
  userEvent,
  vi
};

export default {
  renderWithProviders,
  TestProviders,
  TestQueryProvider,
  TestRouterProvider,
  createTestQueryClient,
  mockAuthService,
  mockApiService,
  createMockUser,
  createMockHire,
  createMockApiResponse,
  fillForm,
  submitForm,
  waitForLoadingToFinish,
  waitForErrorToAppear,
  mockLocalStorage,
  mockSessionStorage,
  setupTestEnvironment,
  cleanupTestEnvironment,
  customMatchers,
  TestDataFactory,
  measureRenderTime,
  expectRenderTimeUnder,
  checkAccessibility
};