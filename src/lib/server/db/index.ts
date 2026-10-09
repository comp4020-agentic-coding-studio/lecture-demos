import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DATABASE_PATH } from "$app/env/private";
import * as schema from "./schema";

mkdirSync(dirname(DATABASE_PATH), { recursive: true });
const client = new Database(DATABASE_PATH);
// readers carry on while one request writes
client.pragma("journal_mode = WAL");

export const db = drizzle(client, { schema });

// Migrations run at boot, so a deploy or a fresh clone needs no extra step.
// Earlier artefacts' tables (and the guestbook's __drizzle_migrations) are
// still on the Fly volume, so this app keeps its own migrations table.
migrate(db, { migrationsFolder: "drizzle", migrationsTable: "__rooms_migrations" });
