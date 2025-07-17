/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

import '@testing-library/jest-dom';

declare global {
  namespace Vi {
    interface JestAssertion<T = any>
      extends jest.Matchers<void, T>,
        TestingLibraryMatchers<T, void> {}
  }
}

// Extend Jest matchers with Testing Library matchers
declare module 'vitest' {
  interface Assertion<T = any> extends TestingLibraryMatchers<T, void> {}
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<any, void> {}
}

// Testing Library matchers
interface TestingLibraryMatchers<R = void, T = {}> {
  toBeInTheDocument(): R;
  toBeVisible(): R;
  toBeEmptyDOMElement(): R;
  toBeInvalid(): R;
  toBeRequired(): R;
  toBeValid(): R;
  toBeChecked(): R;
  toBePartiallyChecked(): R;
  toHaveAccessibleDescription(expectedAccessibleDescription?: string | RegExp): R;
  toHaveAccessibleName(expectedAccessibleName?: string | RegExp): R;
  toHaveAttribute(attr: string, value?: string | RegExp): R;
  toHaveClass(...classNames: string[]): R;
  toHaveFocus(): R;
  toHaveFormValues(expectedValues: Record<string, any>): R;
  toHaveStyle(css: string | Record<string, any>): R;
  toHaveTextContent(text: string | RegExp): R;
  toHaveValue(value: string | string[] | number): R;
  toHaveDisplayValue(value: string | RegExp | (string | RegExp)[]): R;
  toBeDisabled(): R;
  toBeEnabled(): R;
  toContainElement(element: HTMLElement | null): R;
  toContainHTML(htmlText: string): R;
  toHaveDescription(text?: string | RegExp): R;
  toHaveErrorMessage(text?: string | RegExp): R;
}

export {};