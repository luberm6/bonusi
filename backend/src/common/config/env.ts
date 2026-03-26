import dotenv from "dotenv";

dotenv.config();

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function parsePositiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid positive number value: ${value}`);
  }
  return parsed;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`Invalid boolean value: ${value}`);
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: requireEnv("DATABASE_URL"),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000,http://127.0.0.1:3100",
  corsOrigins: (process.env.CORS_ORIGIN ?? "http://localhost:3000,http://127.0.0.1:3100")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean),
  trustProxy: process.env.TRUST_PROXY ?? "loopback",
  jwtAccessSecret: requireEnv("JWT_ACCESS_SECRET", process.env.JWT_SECRET),
  jwtRefreshSecret: requireEnv("JWT_REFRESH_SECRET"),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? "15m",
  refreshTokenTtlDays: parsePositiveNumber(process.env.REFRESH_TOKEN_TTL_DAYS, 30),
  nominatimBaseUrl: process.env.NOMINATIM_BASE_URL ?? "https://nominatim.openstreetmap.org",
  nominatimUserAgent: process.env.NOMINATIM_USER_AGENT ?? "autoservice-backend/1.0 (internal-autoservice)",
  nominatimTimeoutMs: parsePositiveNumber(process.env.NOMINATIM_TIMEOUT_MS, 7000),
  geocodeCacheTtlDays: parsePositiveNumber(process.env.GEOCODE_CACHE_TTL_DAYS, 30),
  filesEnabled: parseBoolean(process.env.FILES_ENABLED, false),
  pushEnabled: parseBoolean(process.env.PUSH_ENABLED, false),
  smtpEnabled: parseBoolean(process.env.SMTP_ENABLED, false),
  s3Endpoint: process.env.S3_ENDPOINT ?? "http://127.0.0.1:9000",
  s3Region: process.env.S3_REGION ?? "us-east-1",
  s3Bucket: process.env.S3_BUCKET ?? "autoservice-chat",
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID ?? process.env.S3_ACCESS_KEY ?? "",
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? process.env.S3_SECRET_KEY ?? "",
  s3PublicBaseUrl: process.env.S3_PUBLIC_BASE_URL ?? "http://127.0.0.1:9000/autoservice-chat",
  fcmServerKey: process.env.FCM_SERVER_KEY ?? ""
};
