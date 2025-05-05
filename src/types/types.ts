
export interface NewHire {
  id: string;
  name: string;
  title: string;
  department: string;
  email: string;
  direct_report: string;
  phone_number: string;
  mailing_list: string;
  remarks: string;
  account_creation_status: string;
  license_assigned: boolean;
  status_srf: boolean;
  username: string;
  password: string;
  on_site_date: string;
  microsoft_365_license: boolean;
  laptop_ready: string;
  note: string;
  ict_support_pic: string;
  created_at?: string;
  updated_at?: string;
  audit_logs?: AuditLog[];
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
  password: string;
  role: string;
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

export interface ImportResponse {
  success: boolean;
  message: string;
  rowsImported?: number;
  errors?: string[];
}
