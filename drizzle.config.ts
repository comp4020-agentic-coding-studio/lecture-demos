import { defineConfig } from "drizzle-kit";

// `pnpm db:generate` writes a migration in drizzle/ from the schema; the app
// applies it at boot (src/lib/server/db/index.ts).
export default defineConfig({
  schema: "./src/lib/server/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: { url: process.env.DATABASE_PATH || ".data/app.db" },
  strict: true,
});
