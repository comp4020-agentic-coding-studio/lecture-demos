import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { sveltekitCookies } from "better-auth/svelte-kit";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getRequestEvent } from "$app/server";
import { DATABASE_PATH, ORIGIN } from "$app/env/private";
import { db } from "#lib/server/db/index.ts";

// The secret that signs session cookies is made on first boot and kept next
// to the database (on Fly, the volume), so it survives restarts and never
// sits in the repo or needs setting by hand.
function secret(): string {
  const file = join(dirname(DATABASE_PATH), "auth-secret");
  if (!existsSync(file))
    writeFileSync(file, randomBytes(32).toString("base64url"), { mode: 0o600 });
  return readFileSync(file, "utf8");
}

export const auth = betterAuth({
  baseURL: ORIGIN,
  secret: secret(),
  database: drizzleAdapter(db, { provider: "sqlite" }),
  emailAndPassword: { enabled: true },
  plugins: [
    sveltekitCookies(getRequestEvent), // make sure this is the last plugin in the array
  ],
});
