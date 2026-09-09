import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env"), quiet: true });
dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });
dotenv.config({ quiet: true });

const clientUrls = (
  process.env.CLIENT_URLS ||
  process.env.CLIENT_URL ||
  "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176"
)
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);
const smtpHost = process.env.SMTP_HOST;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpEnabled = Boolean(
  smtpHost &&
  smtpUser &&
  smtpPass &&
  !smtpUser.includes("your-email") &&
  !smtpPass.includes("your-app-password"),
);
const isProduction = process.env.NODE_ENV === "production";
const jwtSecret = process.env.JWT_SECRET || (isProduction ? "" : "voro_secret_key");
const paymentCardEncryptionKey = process.env.PAYMENT_CARD_ENCRYPTION_KEY || "";
const seedDemoData = process.env.SEED_DEMO_DATA === "true";
const adminBootstrapToken = process.env.ADMIN_BOOTSTRAP_TOKEN?.trim() || "";
const observabilityToken = process.env.OBSERVABILITY_TOKEN?.trim() || "";
const databaseUrl = process.env.DATABASE_URL?.trim() || "";
const databaseSsl = process.env.DB_SSL === "true";
const databaseSslRejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false";
const driverAppUrl = process.env.DRIVER_APP_URL || (
  isProduction ? "https://voro-driver.pages.dev" : "http://localhost:5175"
);
const restaurantAppUrl = process.env.RESTAURANT_APP_URL || (
  isProduction ? "https://voro-restaurant.pages.dev" : "http://localhost:5174"
);

if (isProduction && (jwtSecret.length < 32 || jwtSecret === "voro_secret_key")) {
  throw new Error("JWT_SECRET must be a unique value of at least 32 characters in production.");
}

if (isProduction && !paymentCardEncryptionKey) {
  throw new Error("PAYMENT_CARD_ENCRYPTION_KEY is required in production.");
}

if (isProduction && seedDemoData) {
  throw new Error("SEED_DEMO_DATA must be false in production.");
}

if (isProduction && !observabilityToken) {
  throw new Error("OBSERVABILITY_TOKEN is required in production.");
}

if (adminBootstrapToken && adminBootstrapToken.length < 32) {
  throw new Error("ADMIN_BOOTSTRAP_TOKEN must be at least 32 characters when set.");
}

if (observabilityToken && observabilityToken.length < 32) {
  throw new Error("OBSERVABILITY_TOKEN must be at least 32 characters when set.");
}

export const env = {
  port: Number(process.env.PORT || 3000),
  clientUrls,
  apiUrl: process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`,
  operatorApps: {
    driverUrl: driverAppUrl,
    restaurantUrl: restaurantAppUrl,
  },
  isProduction,
  seedDemoData,
  jwtSecret,
  paymentCardEncryptionKey,
  adminBootstrapToken,
  observabilityToken,
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || "15m",
  refreshTokenTtlMs: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30) * 24 * 60 * 60 * 1000,
  redisUrl: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
  otpTtlMs: 10 * 60 * 1000,
  database: {
    url: databaseUrl,
    ssl: databaseSsl,
    sslRejectUnauthorized: databaseSslRejectUnauthorized,
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    name: process.env.DB_NAME || "voro",
    user: process.env.DB_USER || "admin",
    password: process.env.DB_PASSWORD || "admin",
  },
  smtp: {
    enabled: smtpEnabled,
    host: smtpHost,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    user: smtpUser,
    pass: smtpPass,
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
  },
  auth0: {
    domain: process.env.AUTH0_DOMAIN || "",
    clientId: process.env.AUTH0_CLIENT_ID || "",
    clientSecret: process.env.AUTH0_CLIENT_SECRET || "",
    callbackUrl:
      process.env.AUTH0_CALLBACK_URL ||
      `${process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`}/auth/auth0/callback`,
    clientRedirectUrl:
      process.env.AUTH0_CLIENT_REDIRECT_URL || `${clientUrls[0] || "http://localhost:5173"}/auth/callback`,
  },
  webPush: {
    subject: process.env.VAPID_SUBJECT || "",
    publicKey: process.env.VAPID_PUBLIC_KEY || "",
    privateKey: process.env.VAPID_PRIVATE_KEY || "",
  },
};
