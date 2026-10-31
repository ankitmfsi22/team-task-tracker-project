import { describe, expect, it } from 'vitest';
import {
  AuthTokenResponseSchema,
  ErrorResponseSchema,
  LoginRequestSchema,
  RegisterRequestSchema,
  UserResponseSchema,
} from './index.js';
import type {
  AuthTokenResponse,
  ErrorResponse,
  LoginRequest,
  RegisterRequest,
  UserResponse,
} from './index.js';

const validRegister = {
  email: 'user@example.com',
  name: 'Ada Lovelace',
  password: 'password1',
};

describe('RegisterRequestSchema', () => {
  it('parses a valid body and trims and lowercases the email', () => {
    const result: RegisterRequest = RegisterRequestSchema.parse({
      ...validRegister,
      email: '  User@Example.COM ',
      name: '  Ada  ',
    });
    expect(result.email).toBe('user@example.com');
    expect(result.name).toBe('Ada');
    expect(result.password).toBe('password1');
  });

  it('rejects an invalid email', () => {
    expect(
      RegisterRequestSchema.safeParse({ ...validRegister, email: 'not-an-email' }).success,
    ).toBe(false);
  });

  it('rejects a password of 7 characters', () => {
    expect(
      RegisterRequestSchema.safeParse({ ...validRegister, password: 'a'.repeat(7) }).success,
    ).toBe(false);
  });

  it('accepts a password of 8 characters', () => {
    expect(
      RegisterRequestSchema.safeParse({ ...validRegister, password: 'a'.repeat(8) }).success,
    ).toBe(true);
  });

  it('accepts a password of 128 characters', () => {
    expect(
      RegisterRequestSchema.safeParse({ ...validRegister, password: 'a'.repeat(128) }).success,
    ).toBe(true);
  });

  it('rejects a password of 129 characters', () => {
    expect(
      RegisterRequestSchema.safeParse({ ...validRegister, password: 'a'.repeat(129) }).success,
    ).toBe(false);
  });

  it('rejects an empty name', () => {
    expect(RegisterRequestSchema.safeParse({ ...validRegister, name: '' }).success).toBe(false);
  });

  it('rejects a name of 101 characters', () => {
    expect(
      RegisterRequestSchema.safeParse({ ...validRegister, name: 'n'.repeat(101) }).success,
    ).toBe(false);
  });

  it('rejects missing fields', () => {
    expect(RegisterRequestSchema.safeParse({ name: 'Ada', password: 'password1' }).success).toBe(
      false,
    );
    expect(
      RegisterRequestSchema.safeParse({ email: 'user@example.com', password: 'password1' }).success,
    ).toBe(false);
    expect(
      RegisterRequestSchema.safeParse({ email: 'user@example.com', name: 'Ada' }).success,
    ).toBe(false);
  });
});

describe('LoginRequestSchema', () => {
  it('parses a valid body and lowercases the email', () => {
    const result: LoginRequest = LoginRequestSchema.parse({
      email: 'User@Example.com',
      password: 'x',
    });
    expect(result.email).toBe('user@example.com');
  });

  it('rejects a missing password', () => {
    expect(LoginRequestSchema.safeParse({ email: 'user@example.com' }).success).toBe(false);
  });

  it('rejects a malformed email', () => {
    expect(LoginRequestSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false);
  });
});

describe('UserResponseSchema', () => {
  it('does not return a password hash or other extra keys', () => {
    const result: UserResponse = UserResponseSchema.parse({
      id: '3f2b8c1e-6d4a-4b7e-9a10-2c5d8e7f1a90',
      email: 'user@example.com',
      name: 'Ada',
      passwordHash: '$argon2id$secret',
    });
    expect(result).toEqual({
      id: '3f2b8c1e-6d4a-4b7e-9a10-2c5d8e7f1a90',
      email: 'user@example.com',
      name: 'Ada',
    });
    expect(result).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('password');
  });
});

describe('AuthTokenResponseSchema', () => {
  it('parses an access token body', () => {
    const result: AuthTokenResponse = AuthTokenResponseSchema.parse({ accessToken: 'abc' });
    expect(result.accessToken).toBe('abc');
  });
});

describe('ErrorResponseSchema', () => {
  it('accepts an error with and without details', () => {
    const withDetails: ErrorResponse = ErrorResponseSchema.parse({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid', details: [{ path: 'email' }] },
    });
    expect(withDetails.error.code).toBe('VALIDATION_ERROR');
    expect(
      ErrorResponseSchema.safeParse({ error: { code: 'NOT_FOUND', message: 'Not found' } }).success,
    ).toBe(true);
  });

  it('rejects an error with a missing code', () => {
    expect(ErrorResponseSchema.safeParse({ error: { message: 'oops' } }).success).toBe(false);
  });
});
