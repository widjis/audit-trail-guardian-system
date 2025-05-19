
export interface AuditLog {
  id: string;
  hire_id: string;
  new_hire_id?: string;  // Added for compatibility with API
  user: string;
  action: string;
  action_type?: string;  // Added missing property
  status?: string;       // Added missing property
  message?: string;      // Added missing property
  performed_by?: string; // Added missing property
  timestamp: string;
  old_values: string | null;
  new_values: string | null;
}

export interface NewHire {
  id?: string;
  name: string;
  title: string;
  job_title?: string;    // Added for compatibility with CreateADAccountDialog
  department: string;
  email: string;
  direct_report: string;
  phone_number: string;
  mailing_list: string[] | string; // Support both array and legacy string format
  remarks: string;
  account_creation_status: string;
  license_assigned: boolean;
  status_srf: boolean;
  username: string;
  password: string;
  on_site_date: string;
  microsoft_365_license: string;
  laptop_ready: string;
  note: string;
  ict_support_pic?: string;
  created_at?: string;
  updated_at?: string;
  audit_logs?: AuditLog[];
}

// Add missing types for sorting
export type SortDirection = 'asc' | 'desc' | null;
export type SortField = 'name' | 'department' | 'title' | 'email' | 'on_site_date' | 'created_at' | 'updated_at' | string;

// Add missing types for authentication
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

// Add missing type for import response
export interface ImportResponse {
  success: boolean;
  message: string;
  imported?: number;
  failed?: number;
  errors?: string[];
}

// Add missing type for user account
export interface UserAccount {
  id: string;
  username: string;
  role: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
}
