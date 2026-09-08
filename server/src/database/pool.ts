import { Pool } from "pg";
import { env } from "../config/env";

const ssl = env.database.ssl
  ? { rejectUnauthorized: env.database.sslRejectUnauthorized }
  : undefined;

export const pool = env.database.url
  ? new Pool({ connectionString: env.database.url, ssl })
  : new Pool({
      host: env.database.host,
      port: env.database.port,
      database: env.database.name,
      user: env.database.user,
      password: env.database.password,
      ssl,
    });
