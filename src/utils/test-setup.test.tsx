import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderWithProviders, createMockUser, TestDataFactory } from '../utils/test-utils';

// Simple component for testing
const TestComponent = ({ name }: { name: string }) => (
  <div>
    <h1>Hello {name}</h1>
    <p>This is a test component</p>
  </div>
);

describe('Testing Setup Verification', () => {
  it('should render a simple component', () => {
    render(<TestComponent name="World" />);
    
    expect(screen.getByText('Hello World')).toBeInTheDocument();
    expect(screen.getByText('This is a test component')).toBeInTheDocument();
  });

  it('should work with test providers', () => {
    renderWithProviders(<TestComponent name="Test" />);
    
    expect(screen.getByText('Hello Test')).toBeInTheDocument();
  });

  it('should create mock data correctly', () => {
    const mockUser = createMockUser({ name: 'John Doe' });
    
    expect(mockUser).toEqual({
      id: 1,
      email: 'test@example.com',
      name: 'John Doe',
      role: 'user',
      createdAt: expect.any(String),
      updatedAt: expect.any(String)
    });
  });

  it('should use test data factory', () => {
    const users = TestDataFactory.users(3);
    
    expect(users).toHaveLength(3);
    expect(users[0]).toHaveProperty('id', 1);
    expect(users[1]).toHaveProperty('id', 2);
    expect(users[2]).toHaveProperty('id', 3);
  });

  it('should have toBeInTheDocument matcher available', () => {
    render(<div data-testid="test-element">Test</div>);
    
    const element = screen.getByTestId('test-element');
    expect(element).toBeInTheDocument();
  });
});