
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
