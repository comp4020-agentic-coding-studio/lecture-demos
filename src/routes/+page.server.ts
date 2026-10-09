import { fail, redirect } from "@sveltejs/kit";
import { count, desc, eq } from "drizzle-orm";
import { db } from "#lib/server/db/index.ts";
import { card, room, user } from "#lib/server/db/schema.ts";
import { logEvent } from "#lib/server/log.ts";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = () => ({
  rooms: db
    .select({ id: room.id, name: room.name, owner: user.name, cards: count(card.id) })
    .from(room)
    .innerJoin(user, eq(room.userId, user.id))
    .leftJoin(card, eq(card.roomId, room.id))
    .groupBy(room.id)
    .orderBy(desc(room.createdAt))
    .all(),
});

export const actions: Actions = {
  create: async (event) => {
    const { locals, request } = event;
    if (!locals.user) redirect(303, "/login");
    const name = (await request.formData()).get("name")?.toString().trim() ?? "";
    if (!name) return fail(400, { message: "A room needs a name" });

    const created = db.insert(room).values({ name, userId: locals.user.id }).returning().get();
    logEvent(event, "room_created", { room: created.id });
    redirect(303, `/rooms/${created.id}`);
  },
};
