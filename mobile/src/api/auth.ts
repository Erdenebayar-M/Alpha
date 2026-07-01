import { apiRequest } from '@/src/api/client';

export interface Parent {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse extends Parent {
  token: string;
}

export interface RegisterInput {
  email: string;
  name: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export function register(input: RegisterInput): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: input });
}

export function login(input: LoginInput): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: input });
}

export function logout(): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>('/auth/logout', { method: 'POST' });
}

export function me(): Promise<Parent> {
  return apiRequest<Parent>('/auth/me');
}
