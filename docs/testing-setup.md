# Testing Setup Guide

## Overview

This document outlines the testing infrastructure and best practices for the Audit Trail Guardian System.

## Testing Framework

### Jest Configuration

The project uses **Jest** with TypeScript support via `ts-jest`. The configuration supports:

- **ES Modules**: Full ESM support with `ts-jest/presets/default-esm`
- **TypeScript**: Direct `.ts` and `.tsx` file execution
- **Coverage Reports**: Comprehensive code coverage analysis
- **Path Mapping**: Support for `@/` import aliases

### Configuration Files

- `jest.config.js` - Main Jest configuration
- `src/setupTests.ts` - Global test setup and utilities

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Test Structure

### File Naming Conventions

- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.e2e.test.ts`

### Test Organization

```
src/
├── components/
│   └── __tests__/           # Component tests
├── utils/
│   └── *.test.ts           # Utility function tests
├── hooks/
│   └── *.test.ts           # Custom hook tests
└── config/
    └── *.test.ts           # Configuration tests
```

## Testing Best Practices

### 1. Test Categories

- **Unit Tests**: Test individual functions/components in isolation
- **Integration Tests**: Test component interactions and data flow
- **Configuration Tests**: Validate configuration logic and validation

### 2. Test Structure (AAA Pattern)

```typescript
describe('Component/Function Name', () => {
  // Arrange
  beforeEach(() => {
    // Setup test data
  });

  it('should do something specific', () => {
    // Arrange - Set up test data
    const input = { /* test data */ };
    
    // Act - Execute the function/component
    const result = functionUnderTest(input);
    
    // Assert - Verify the outcome
    expect(result).toBe(expectedValue);
  });
});
```

### 3. Mocking Guidelines

```typescript
// Mock external dependencies
jest.mock('../services/api-client');

// Mock environment variables
process.env.NODE_ENV = 'test';

// Restore mocks after tests
afterEach(() => {
  jest.restoreAllMocks();
});
```

### 4. Configuration Testing

- Test default configurations
- Test environment-specific overrides
- Test validation logic
- Test error handling

## Coverage Requirements

### Target Coverage

- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

### Coverage Exclusions

- Type definition files (`*.d.ts`)
- Main entry points (`main.tsx`)
- Environment configuration files
- Third-party library wrappers

## Testing Utilities

### Custom Matchers

```typescript
// Example custom matcher for configuration validation
expect.extend({
  toBeValidConfig(received) {
    const errors = validateDashboardConfig(received);
    return {
      pass: errors.length === 0,
      message: () => `Expected config to be valid, but got errors: ${errors.join(', ')}`
    };
  }
});
```

### Test Data Factories

```typescript
// Create test data factories for consistent test setup
export const createMockHire = (overrides = {}) => ({
  id: 1,
  name: 'John Doe',
  department: 'Engineering',
  on_site_date: '2024-01-15',
  account_creation_status: 'Active',
  laptop_ready: 'Ready',
  license_assigned: true,
  ...overrides
});
```

## Continuous Integration

### Pre-commit Hooks

```bash
# Run tests before commit
npm test

# Run linting
npm run lint

# Type checking
npx tsc --noEmit
```

### CI Pipeline

1. **Install Dependencies**: `npm ci`
2. **Type Check**: `npx tsc --noEmit`
3. **Lint**: `npm run lint`
4. **Test**: `npm test`
5. **Coverage**: `npm run test:coverage`
6. **Build**: `npm run build`

## Debugging Tests

### VS Code Configuration

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Jest Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Common Debugging Techniques

```typescript
// Add debug output
console.log('Debug:', JSON.stringify(data, null, 2));

// Use Jest's debug mode
jest --verbose --no-cache

// Run specific test
jest --testNamePattern="specific test name"
```

## Performance Testing

### Benchmark Tests

```typescript
describe('Performance Tests', () => {
  it('should calculate progress efficiently', () => {
    const start = performance.now();
    
    // Run performance-critical code
    const result = calculateProgressPercentage(largeMockData);
    
    const end = performance.now();
    expect(end - start).toBeLessThan(100); // Should complete in <100ms
  });
});
```

## Future Enhancements

- **React Testing Library**: For component testing
- **MSW (Mock Service Worker)**: For API mocking
- **Playwright**: For E2E testing
- **Storybook**: For component documentation and testing
- **Visual Regression Testing**: For UI consistency

## Troubleshooting

### Common Issues

1. **ES Module Errors**: Ensure `jest.config.js` has proper ESM configuration
2. **TypeScript Errors**: Check `tsconfig.json` and Jest TypeScript setup
3. **Path Resolution**: Verify module name mapping in Jest config
4. **Environment Variables**: Use proper mocking for environment-dependent code

### Getting Help

- Check Jest documentation: https://jestjs.io/docs/getting-started
- Review existing test files for patterns
- Use `--verbose` flag for detailed test output