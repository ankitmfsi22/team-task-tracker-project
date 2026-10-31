import { hash, verify } from '@node-rs/argon2';
import type { LoginRequest, RegisterRequest, UserResponse } from '@team-task-tracker/shared';
import { AppError } from '../errors.js';
import { Prisma, type PrismaClient } from '../generated/prisma/client.js';
import {
  REFRESH_TOKEN_TTL_SECONDS,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type TokenSecrets,
} from './token.service.js';

// argon2id is the default algorithm of @node-rs/argon2.
const INVALID_CREDENTIALS = new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

const UNAUTHENTICATED = (): AppError =>
  new AppError(401, 'UNAUTHENTICATED', 'Authentication required');

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}

const toUser = (user: { id: string; email: string; name: string }): UserResponse => ({
  id: user.id,
  email: user.email,
  name: user.name,
});

export class AuthService {
  // Verified against when the email is unknown, so both login failures take similar time.
  private dummyHash: Promise<string> | undefined;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly secrets: TokenSecrets,
  ) {}

  async register(input: RegisterRequest): Promise<UserResponse> {
    const passwordHash = await hash(input.password);
    try {
      const user = await this.prisma.user.create({
        data: { email: input.email, name: input.name, passwordHash },
      });
      return toUser(user);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppError(409, 'CONFLICT', 'Email is already registered');
      }
      throw err;
    }
  }

  async login(input: LoginRequest): Promise<IssuedTokens> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    const passwordHash = user?.passwordHash ?? (await this.getDummyHash());
    const passwordOk = await verify(passwordHash, input.password);
    if (!user || !passwordOk) throw INVALID_CREDENTIALS;
    return this.issueTokens(user.id);
  }

  async getUser(userId: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw UNAUTHENTICATED();
    return toUser(user);
  }

  // Rotation: the presented token is revoked and a new one issued in one transaction. The revoke is
  // conditional on revokedAt being null, so two concurrent uses of one token cannot both succeed.
  async refresh(token: string): Promise<IssuedTokens> {
    const userId = await verifyRefreshToken(token, this.secrets);
    if (!userId) throw UNAUTHENTICATED();
    return this.prisma.$transaction(async (tx) => {
      const revoked = await tx.refreshToken.updateMany({
        where: {
          tokenHash: hashToken(token),
          userId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { revokedAt: new Date() },
      });
      if (revoked.count !== 1) throw UNAUTHENTICATED();
      return this.issueTokens(userId, tx);
    });
  }

  // Idempotent: an unknown, invalid or already revoked token revokes nothing.
  async logout(token: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async issueTokens(
    userId: string,
    db: Pick<PrismaClient, 'refreshToken'> = this.prisma,
  ): Promise<IssuedTokens> {
    const accessToken = await signAccessToken(userId, this.secrets);
    const refreshToken = await signRefreshToken(userId, this.secrets);
    await db.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      },
    });
    return { accessToken, refreshToken };
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= hash('dummy-password-for-timing');
    return this.dummyHash;
  }
}
