
export interface NewHire {
  id: string;
  name: string;
  email: string;
  phone_number?: string;
  title: string;
  department: string;
  status: string;
  mailing_list?: string[];
  created_at?: string;
  updated_at?: string;
  audit_logs?: AuditLog[];
  notes?: string;
  microsoft_365_license?: string;
  [key: string]: any;
}

export interface AuditLog {
  id: string;
  new_hire_id: string;
  action_type: string; // e.g., "AD_USER_CREATION", "LICENSE_ASSIGNMENT", "EQUIPMENT_PROVISION"
  status: "SUCCESS" | "ERROR" | "WARNING" | "INFO";
  message: string; // e.g., "User duplication", "Report Manager Not found"
  details?: string; // Additional details or stack trace
  performed_by?: string; // User or system that performed the action
  timestamp: string;
}

export interface User {
  id: string;
  username: string;
  password?: string; // Make password optional since it shouldn't be returned in most API responses
  role: string;
  approved?: boolean; // Whether the user account is approved by an admin
}

export interface UserAccount extends User {
  // Additional properties specific to ICT support accounts can be added here
  // The properties have been updated to match the database schema
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    role: string;
  };
}

export interface ImportError {
  row: number;
  error: string;
  data?: Record<string, any>;
}

export interface ImportResponse {
  success: boolean;
  message: string;
  rowsImported?: number;
  totalRows?: number;
  errors?: ImportError[];
}

// Add types for table sorting
export type SortDirection = "asc" | "desc" | null;
export type SortField = string | null;
