import { z } from 'zod';

const EmailSchema = z.string().trim().toLowerCase().pipe(z.email());

export const RegisterRequestSchema = z.object({
  email: EmailSchema,
  name: z.string().trim().min(1).max(100),
  password: z.string().min(8).max(128),
});

export const LoginRequestSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1).max(128),
});

export const UserResponseSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  name: z.string(),
});

export const AuthTokenResponseSchema = z.object({
  accessToken: z.string(),
});

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type AuthTokenResponse = z.infer<typeof AuthTokenResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
