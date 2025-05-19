export interface AuditLog {
  id: string;
  hire_id: string;
  user: string;
  action: string;
  timestamp: string;
  old_values: string | null;
  new_values: string | null;
}

// Add or update the NewHire interface to ensure mailing_list is an array of strings
export interface NewHire {
  id?: string;
  name: string;
  title: string;
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
