// định nghĩa các quyền hạn trong hệ thống
export type Permission = 'ADMIN' | 'TENANT_ADMIN' | 'REGULATOR' | 'OPERATOR' | 'FARM_CREATE' | string;

// thông tin token trả về từ backend
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: UserProfile;
}

// thông tin người dùng lưu trong pinia store
export interface UserProfile {
  id: string; // uuid
  username: string;
  full_name: string;
  role: string;
  permissions: Permission[];
  tenant_id?: string;
  regulator_id?: string;
  encrypted_private_key?: string; // phục vụ ký số 
}