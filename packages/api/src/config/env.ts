import "dotenv/config";

export const env = {
  NODE_ENV: process.env["NODE_ENV"] ?? "development",
  PORT: process.env["PORT"] ?? "3000",
  CORS_ORIGIN: process.env["CORS_ORIGIN"] ?? "http://localhost:5173",
  DATABASE_URL: process.env["DATABASE_URL"] ?? "file:./dev.db",

  // GitHub OAuth
  GITHUB_CLIENT_ID: process.env["GITHUB_CLIENT_ID"],
  GITHUB_CLIENT_SECRET: process.env["GITHUB_CLIENT_SECRET"],
  GITHUB_CALLBACK_URL: process.env["GITHUB_CALLBACK_URL"] ?? "http://localhost:3000/auth/github/callback",

  // JWT
  JWT_SECRET: process.env["JWT_SECRET"] ?? "dev-secret-change-in-production",
  JWT_EXPIRES_IN: process.env["JWT_EXPIRES_IN"] ?? "7d",
  REFRESH_TOKEN_SECRET: process.env["REFRESH_TOKEN_SECRET"] ?? "dev-refresh-secret",
  REFRESH_TOKEN_EXPIRES_IN: process.env["REFRESH_TOKEN_EXPIRES_IN"] ?? "30d",

  // Encryption for tokens
  ENCRYPTION_KEY: process.env["ENCRYPTION_KEY"] ?? "32-char-key-for-dev-only!!!!",
} as const;

// Validate required env vars in production
if (env.NODE_ENV === "production") {
  const required = ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "JWT_SECRET", "ENCRYPTION_KEY"];
  for (const key of required) {
    if (!env[key]) {
      throw new Error(`Missing required env var: ${key}`);
    }
  }
}