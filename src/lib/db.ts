import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { asc, count, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { type Message, messages } from "./schema";

// One SQLite file is the app's whole persistent state. In production
// fly.toml points DATABASE_PATH at the machine's volume (/data), which is
// how state survives a reload and a redeploy; locally it defaults to an
// untracked file in .data/.
const path = process.env.DATABASE_PATH ?? "./.data/app.db";
mkdirSync(dirname(path), { recursive: true });

const client = new Database(path);
client.pragma("journal_mode = WAL");

export const db = drizzle(client);

// Migrations run at boot, on whatever machine holds the volume — the
// recommended shape for SQLite on Fly, where there's no separate machine to
// run them from. The flow: edit src/lib/schema.ts, `pnpm db:generate`,
// commit the migration it writes to drizzle/.
migrate(db, { migrationsFolder: "./drizzle" });

export type { Message };

export const DEFAULT_TOPIC = "general";

// Topics are free text, folded to one canonical spelling so "Cats", " cats "
// and "CATS" all file under the same topic.
export function normaliseTopic(raw: string): string {
  const topic = raw.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 40);
  return topic || DEFAULT_TOPIC;
}

export function listMessages(topic?: string): Message[] {
  const query = db.select().from(messages);
  return (topic ? query.where(eq(messages.topic, topic)) : query)
    .orderBy(desc(messages.id))
    .limit(50)
    .all();
}

export function listTopics(): { topic: string; count: number }[] {
  return db
    .select({ topic: messages.topic, count: count() })
    .from(messages)
    .groupBy(messages.topic)
    .orderBy(asc(messages.topic))
    .all();
}

export function addMessage(body: string, topic: string): Message {
  return db.insert(messages).values({ body, topic }).returning().get();
}
