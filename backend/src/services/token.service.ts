import { createHash, randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';

const ALGORITHM = 'HS256';
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface TokenSecrets {
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
}

const key = (secret: string): Uint8Array => new TextEncoder().encode(secret);

export async function signAccessToken(userId: string, secrets: TokenSecrets): Promise<string> {
  return new SignJWT({ typ: 'access' })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(key(secrets.jwtAccessSecret));
}

export async function signRefreshToken(userId: string, secrets: TokenSecrets): Promise<string> {
  return new SignJWT({ typ: 'refresh' })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(userId)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_TTL_SECONDS}s`)
    .sign(key(secrets.jwtRefreshSecret));
}

// Returns the user id (`sub`) when the token is valid, unexpired and of the expected type, else null.
async function verifyToken(
  token: string,
  secret: string,
  type: 'access' | 'refresh',
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: [ALGORITHM] });
    return payload['typ'] === type && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

export const verifyAccessToken = (token: string, secrets: TokenSecrets): Promise<string | null> =>
  verifyToken(token, secrets.jwtAccessSecret, 'access');

export const verifyRefreshToken = (token: string, secrets: TokenSecrets): Promise<string | null> =>
  verifyToken(token, secrets.jwtRefreshSecret, 'refresh');

// Refresh tokens are high-entropy signed JWTs, so a fast hash is adequate and allows lookup by hash.
export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');
