export interface AppConfig {
  databaseUrl: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
}

type Env = Record<string, string | undefined>;

function required(env: Env, name: string): string {
  const value = env[name];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

export function loadConfig(env: Env): AppConfig {
  return {
    databaseUrl: required(env, 'DATABASE_URL'),
    jwtAccessSecret: required(env, 'JWT_ACCESS_SECRET'),
    jwtRefreshSecret: required(env, 'JWT_REFRESH_SECRET'),
  };
}
