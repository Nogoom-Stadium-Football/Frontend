export interface UserProfile {
  id: number;
  fullName: string;
  username: string;
  email: string;
  phoneNumber: string;
  address: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  approvedAt?: string;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export interface RegisterRequest {
  fullName: string;
  username: string;
  email: string;
  phoneNumber: string;
  address: string;
  password: string;
}

export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}
