/**
 * Common utility types for the Audit Trail Guardian System
 * These types enhance type safety and provide better developer experience
 */

// Branded types for better type safety
export type HireId = string & { readonly __brand: 'HireId' };
export type DepartmentId = string & { readonly __brand: 'DepartmentId' };
export type UserId = string & { readonly __brand: 'UserId' };

// Helper to create branded types
export const createHireId = (id: string): HireId => id as HireId;
export const createDepartmentId = (id: string): DepartmentId => id as DepartmentId;
export const createUserId = (id: string): UserId => id as UserId;

// Result type for better error handling
export type Result<T, E = Error> = 
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: E };

// Helper functions for Result type
export const success = <T>(data: T): Result<T> => ({ success: true, data });
export const failure = <E = Error>(error: E): Result<never, E> => ({ success: false, error });

// Async Result type
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

// Status types with discriminated unions
export type AccountStatus = 
  | { type: 'active'; createdDate: Date; lastLogin?: Date }
  | { type: 'pending'; requestDate: Date; approver?: string }
  | { type: 'inactive'; deactivatedDate: Date; reason: string }
  | { type: 'suspended'; suspendedDate: Date; reason: string };

export type LaptopStatus = 
  | { type: 'ready'; assignedDate: Date; serialNumber: string }
  | { type: 'pending'; orderedDate: Date; expectedDate?: Date }
  | { type: 'not_required'; reason: string }
  | { type: 'returned'; returnedDate: Date; condition: string };

export type LicenseStatus = 
  | { type: 'assigned'; assignedDate: Date; licenseKey: string }
  | { type: 'pending'; requestDate: Date; licenseType: string }
  | { type: 'not_required'; reason: string }
  | { type: 'revoked'; revokedDate: Date; reason: string };

// Progress stage constants and types
export const PROGRESS_STAGES = ['account', 'laptop', 'license'] as const;
export type ProgressStage = typeof PROGRESS_STAGES[number];

// Validation result types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

export type ValidationResult = {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
};

// Configuration types
export interface EnvironmentConfig {
  name: 'development' | 'staging' | 'production';
  apiUrl: string;
  enableDebug: boolean;
  enableAnalytics: boolean;
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Filter types
export interface DateRange {
  start: Date;
  end: Date;
}

export interface HireFilters {
  departments?: string[];
  statuses?: string[];
  dateRange?: DateRange;
  searchTerm?: string;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
  requestId: string;
}

// Event types for audit trail
export interface AuditEvent {
  id: string;
  timestamp: Date;
  userId: UserId;
  action: string;
  resource: string;
  resourceId: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
  metadata?: Record<string, unknown>;
}

// Utility types for better type manipulation
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Type guards
export const isAccountActive = (status: AccountStatus): status is Extract<AccountStatus, { type: 'active' }> => {
  return status.type === 'active';
};

export const isLaptopReady = (status: LaptopStatus): status is Extract<LaptopStatus, { type: 'ready' }> => {
  return status.type === 'ready';
};

export const isLicenseAssigned = (status: LicenseStatus): status is Extract<LicenseStatus, { type: 'assigned' }> => {
  return status.type === 'assigned';
};

// Error classes
export class ValidationException extends Error {
  constructor(
    public field: string,
    message: string,
    public code: string = 'VALIDATION_ERROR'
  ) {
    super(`Validation error in ${field}: ${message}`);
    this.name = 'ValidationException';
  }
}

export class ConfigurationException extends Error {
  constructor(
    public field: string,
    message: string,
    public code: string = 'CONFIG_ERROR'
  ) {
    super(`Configuration error in ${field}: ${message}`);
    this.name = 'ConfigurationException';
  }
}

export class DataProcessingException extends Error {
  constructor(
    message: string,
    public originalError?: Error,
    public code: string = 'DATA_PROCESSING_ERROR'
  ) {
    super(message);
    this.name = 'DataProcessingException';
  }
}

// Performance monitoring types
export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ComponentPerformance {
  componentName: string;
  renderTime: number;
  propsSize: number;
  reRenderCount: number;
}

// Theme and styling types
export interface ThemeColors {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface ResponsiveBreakpoints {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

// Chart and visualization types
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  metadata?: Record<string, unknown>;
}

export interface ChartConfig {
  type: 'pie' | 'bar' | 'line' | 'area';
  title: string;
  data: ChartDataPoint[];
  options?: Record<string, unknown>;
}

// Export all types for easy importing
// Note: Dashboard types will be added when dashboard module is created