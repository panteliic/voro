import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env"), quiet: true });
dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });
dotenv.config({ quiet: true });

const clientUrls = (
  process.env.CLIENT_URLS ||
  process.env.CLIENT_URL ||
  "http://localhost:5173"
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

export const env = {
  port: Number(process.env.PORT || 3000),
  clientUrls,
  isProduction: process.env.NODE_ENV === "production",
  jwtSecret: process.env.JWT_SECRET || "voro_secret_key",
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || "15m",
  refreshTokenTtlMs: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30) * 24 * 60 * 60 * 1000,
  otpTtlMs: 10 * 60 * 1000,
  database: {
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
};
