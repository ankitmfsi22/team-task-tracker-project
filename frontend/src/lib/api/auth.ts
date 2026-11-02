import {
  AuthTokenResponseSchema,
  UserResponseSchema,
  type AuthTokenResponse,
  type LoginRequest,
  type RegisterRequest,
  type UserResponse,
} from '@team-task-tracker/shared';
import { z } from 'zod';
import { apiFetch } from './client';

export function fetchCurrentUser(): Promise<UserResponse> {
  return apiFetch('/api/v1/auth/me', { schema: UserResponseSchema });
}

export function loginRequest(body: LoginRequest): Promise<AuthTokenResponse> {
  return apiFetch('/api/v1/auth/login', { schema: AuthTokenResponseSchema, method: 'POST', body });
}

export function registerRequest(body: RegisterRequest): Promise<UserResponse> {
  return apiFetch('/api/v1/auth/register', { schema: UserResponseSchema, method: 'POST', body });
}

export function logoutRequest(): Promise<undefined> {
  return apiFetch('/api/v1/auth/logout', { schema: z.undefined(), method: 'POST' });
}
