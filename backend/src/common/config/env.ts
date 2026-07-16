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

function normalizeOrigin(value: string): string {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return `https://${value}`;
}

function parseOrigins(...values: Array<string | undefined>) {
  return values
    .flatMap((value) => (value ?? "").split(","))
    .map((value) => value.trim())
    .filter(Boolean)
    .map(normalizeOrigin);
}

const corsOrigins = parseOrigins(
  process.env.CORS_ORIGIN,
  process.env.CORS_EXTRA_ORIGINS
);

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: requireEnv("DATABASE_URL"),
  corsOrigin: corsOrigins.join(","),
  corsOrigins,
  trustProxy: process.env.TRUST_PROXY ?? "loopback",
  jwtAccessSecret: requireEnv("JWT_ACCESS_SECRET", process.env.JWT_SECRET),
  jwtRefreshSecret: requireEnv("JWT_REFRESH_SECRET"),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? "15m",
  refreshTokenTtlDays: parsePositiveNumber(process.env.REFRESH_TOKEN_TTL_DAYS, 30),
  nominatimBaseUrl: process.env.NOMINATIM_BASE_URL ?? "https://nominatim.openstreetmap.org",
  nominatimUserAgent: process.env.NOMINATIM_USER_AGENT ?? "autoservice-backend/1.0 (internal-autoservice)",
  nominatimTimeoutMs: parsePositiveNumber(process.env.NOMINATIM_TIMEOUT_MS, 7000),
  geocodeCacheTtlDays: parsePositiveNumber(process.env.GEOCODE_CACHE_TTL_DAYS, 30),
  filesEnabled: parseBoolean(process.env.FILES_ENABLED, true),
  pushEnabled: parseBoolean(process.env.PUSH_ENABLED, false),
  smtpEnabled: parseBoolean(process.env.SMTP_ENABLED, false),
  smtpHost: process.env.SMTP_HOST ?? "smtp.gmail.com",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpSecure: parseBoolean(process.env.SMTP_SECURE, false),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPassword: process.env.SMTP_PASSWORD ?? "",
  smtpFrom: process.env.SMTP_FROM ?? "Centr Radius Service <no-reply@centr-radius.ru>",
  s3Endpoint: process.env.S3_ENDPOINT ?? "",
  s3Region: process.env.S3_REGION ?? "us-east-1",
  s3Bucket: process.env.S3_BUCKET ?? "autoservice-chat",
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID ?? process.env.S3_ACCESS_KEY ?? "",
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? process.env.S3_SECRET_KEY ?? "",
  s3PublicBaseUrl: process.env.S3_PUBLIC_BASE_URL ?? "",
  fcmServerKey: process.env.FCM_SERVER_KEY ?? "",
  smsProvider: process.env.SMS_PROVIDER ?? "mock",
  smsOtpEnabled: parseBoolean(process.env.SMS_OTP_ENABLED, false),
  smsOtpLength: parsePositiveNumber(process.env.SMS_OTP_LENGTH, 6),
  smsOtpTtlSeconds: parsePositiveNumber(process.env.SMS_OTP_TTL_SECONDS, 300),
  smsOtpResendSeconds: parsePositiveNumber(process.env.SMS_OTP_RESEND_SECONDS, 60),
  smsOtpMaxAttempts: parsePositiveNumber(process.env.SMS_OTP_MAX_ATTEMPTS, 5),
  smscLogin: process.env.SMSC_LOGIN ?? "",
  smscPassword: process.env.SMSC_PASSWORD ?? "",
  smscSender: process.env.SMSC_SENDER ?? "",
  smscEndpoint: process.env.SMSC_ENDPOINT ?? "https://smsc.ru/sys/send.php",
  smscUsePost: parseBoolean(process.env.SMSC_USE_POST, true),
  smscResponseFormat: process.env.SMSC_RESPONSE_FORMAT ?? "json",
  smscDebug: parseBoolean(process.env.SMSC_DEBUG, false),
  smsaeroEmail: process.env.SMSAERO_EMAIL ?? "",
  smsaeroApiKey: process.env.SMSAERO_API_KEY ?? "",
  smsaeroSender: process.env.SMSAERO_SENDER ?? "SMS Aero",
  smsaeroEndpoint: process.env.SMSAERO_ENDPOINT ?? "https://gate.smsaero.ru/v2/sms/send",
  smsaeroDebug: parseBoolean(process.env.SMSAERO_DEBUG, false),
  testSmsEnabled: parseBoolean(process.env.TEST_SMS_ENABLED, false),
  testSmsPhone: process.env.TEST_SMS_PHONE ?? "",
  testSmsCode: process.env.TEST_SMS_CODE ?? ""
};
