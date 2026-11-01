import { UserResponseSchema, type UserResponse } from '@team-task-tracker/shared';
import { z } from 'zod';
import { apiFetch } from './client';

export function fetchCurrentUser(): Promise<UserResponse> {
  return apiFetch('/api/v1/auth/me', { schema: UserResponseSchema });
}

export function logoutRequest(): Promise<undefined> {
  return apiFetch('/api/v1/auth/logout', { schema: z.undefined(), method: 'POST' });
}
