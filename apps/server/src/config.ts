export type ServerConfig = {
  port: number;
  host: string;
  /** `true` = reflect any origin (development); otherwise an allow-list. */
  corsOrigins: string[] | true;
  databaseUrl: string | null;
  adminSecret: string | null;
  exposeLan: boolean;
  production: boolean;
};

export const CONFIG = Symbol('CONFIG');

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const production = env.NODE_ENV === 'production';
  const origins = (env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return {
    port: Number(env.PORT) || 3001,
    host: env.HOST || '0.0.0.0',
    corsOrigins: origins.length ? origins : true,
    databaseUrl: env.DATABASE_URL || null,
    adminSecret: env.ADMIN_SECRET || null,
    exposeLan: env.EXPOSE_LAN ? env.EXPOSE_LAN === 'true' : !production,
    production,
  };
}
