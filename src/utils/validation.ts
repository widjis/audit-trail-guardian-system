import { z } from 'zod';

// Base schemas for common types
export const EmailSchema = z.string().email('Invalid email format');
export const PhoneSchema = z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format');
export const DateStringSchema = z.string().datetime('Invalid date format');

// User schemas
export const UserSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
  username: z.string().min(1, 'Username is required'),
  email: EmailSchema.optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  department: z.string().min(1, 'Department is required'),
  role: z.enum(['admin', 'user', 'manager'], {
    errorMap: () => ({ message: 'Role must be admin, user, or manager' })
  }),
  isActive: z.boolean().default(true),
  createdAt: DateStringSchema.optional(),
  updatedAt: DateStringSchema.optional()
});

// Hire schemas
export const HireStatusSchema = z.enum([
  'pending', 'in_progress', 'completed', 'cancelled'
], {
  errorMap: () => ({ message: 'Invalid hire status' })
});

export const AccountStatusSchema = z.enum([
  'Not Started', 'In Progress', 'Active', 'Failed'
], {
  errorMap: () => ({ message: 'Invalid account status' })
});

export const LaptopStatusSchema = z.enum([
  'Not Started', 'Ordered', 'Ready', 'Delivered'
], {
  errorMap: () => ({ message: 'Invalid laptop status' })
});

export const HireSchema = z.object({
  id: z.string().min(1, 'Hire ID is required'),
  employee_id: z.string().min(1, 'Employee ID is required'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: EmailSchema,
  department: z.string().min(1, 'Department is required'),
  position: z.string().min(1, 'Position is required'),
  manager: z.string().min(1, 'Manager is required'),
  on_site_date: DateStringSchema,
  account_creation_status: AccountStatusSchema,
  laptop_ready: LaptopStatusSchema,
  license_assigned: z.boolean().default(false),
  status: HireStatusSchema.default('pending'),
  created_at: DateStringSchema.optional(),
  updated_at: DateStringSchema.optional()
});

// Active Directory schemas
export const ActiveDirectoryConfigSchema = z.object({
  enabled: z.boolean().default(false),
  server: z.string().min(1, 'AD server is required when enabled'),
  port: z.number().int().min(1).max(65535, 'Port must be between 1 and 65535'),
  protocol: z.enum(['ldap', 'ldaps']).default('ldap'),
  baseDN: z.string().min(1, 'Base DN is required when enabled'),
  domain: z.string().min(1, 'Domain is required when enabled'),
  username: z.string().min(1, 'Username is required when enabled'),
  password: z.string().min(1, 'Password is required when enabled'),
  authFormat: z.enum(['dn', 'upn']).default('upn'),
  searchFilter: z.string().optional(),
  attributes: z.array(z.string()).default(['cn', 'mail', 'department'])
}).refine(
  (data) => !data.enabled || (data.server && data.baseDN && data.domain && data.username && data.password),
  {
    message: 'All required fields must be provided when Active Directory is enabled',
    path: ['enabled']
  }
);

// System configuration schemas
export const DatabaseConfigSchema = z.object({
  type: z.enum(['mssql', 'postgresql', 'mysql']),
  host: z.string().min(1, 'Database host is required'),
  port: z.number().int().min(1).max(65535),
  database: z.string().min(1, 'Database name is required'),
  username: z.string().min(1, 'Database username is required'),
  password: z.string().min(1, 'Database password is required'),
  ssl: z.boolean().default(false),
  connectionTimeout: z.number().int().min(1000).default(30000),
  requestTimeout: z.number().int().min(1000).default(30000)
});

export const WhatsAppConfigSchema = z.object({
  enabled: z.boolean().default(false),
  apiUrl: z.string().url('Invalid WhatsApp API URL').optional(),
  apiKey: z.string().min(1, 'API key is required when enabled').optional(),
  defaultMessage: z.string().optional()
}).refine(
  (data) => !data.enabled || (data.apiUrl && data.apiKey),
  {
    message: 'API URL and key are required when WhatsApp is enabled',
    path: ['enabled']
  }
);

// API response schemas
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.any().optional(),
  error: z.string().optional(),
  timestamp: DateStringSchema.optional()
});

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    success: z.boolean(),
    data: z.object({
      items: z.array(itemSchema),
      total: z.number().int().min(0),
      page: z.number().int().min(1),
      limit: z.number().int().min(1),
      totalPages: z.number().int().min(0)
    }),
    message: z.string().optional(),
    timestamp: DateStringSchema.optional()
  });

// Validation helper functions
export const validateData = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Validation failed: ${errorMessages.join(', ')}`);
    }
    throw error;
  }
};

export const safeValidateData = <T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  error?: string;
} => {
  try {
    const validData = schema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return { success: false, error: errorMessages.join(', ') };
    }
    return { success: false, error: 'Unknown validation error' };
  }
};

// Type exports
export type User = z.infer<typeof UserSchema>;
export type Hire = z.infer<typeof HireSchema>;
export type ActiveDirectoryConfig = z.infer<typeof ActiveDirectoryConfigSchema>;
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export type WhatsAppConfig = z.infer<typeof WhatsAppConfigSchema>;
export type ApiResponse = z.infer<typeof ApiResponseSchema>;
export type PaginatedResponse<T> = z.infer<ReturnType<typeof PaginatedResponseSchema<z.ZodSchema<T>>>>;