import { error, fail, redirect } from "@sveltejs/kit";
import { and, asc, eq } from "drizzle-orm";
import { db } from "#lib/server/db/index.ts";
import { card, room, user } from "#lib/server/db/schema.ts";
import { logEvent } from "#lib/server/log.ts";
import { publish } from "#lib/server/rooms.ts";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ locals, params, url }) => {
  if (!locals.user) redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);

  const found = db
    .select()
    .from(room)
    .where(eq(room.id, Number(params.id)))
    .get();
  if (!found) error(404, "No such room");

  return {
    room: found,
    cards: db
      .select({
        id: card.id,
        text: card.text,
        userId: card.userId,
        author: user.name,
        updatedAt: card.updatedAt,
      })
      .from(card)
      .innerJoin(user, eq(card.userId, user.id))
      .where(eq(card.roomId, found.id))
      .orderBy(asc(card.id))
      .all(),
  };
};

// Every action needs a signed-in person and a card's text from the form.
async function read(event: Parameters<Actions[string]>[0]) {
  if (!event.locals.user) redirect(303, "/login");
  const form = await event.request.formData();
  return {
    me: event.locals.user,
    roomId: Number(event.params.id),
    cardId: Number(form.get("id")),
    text: form.get("text")?.toString().trim() ?? "",
  };
}

export const actions: Actions = {
  add: async (event) => {
    const { me, roomId, text } = await read(event);
    if (!text) return fail(400, { message: "A card needs some text" });
    const added = db.insert(card).values({ roomId, userId: me.id, text }).returning().get();
    logEvent(event, "card_created", { room: roomId, card: added.id });
    publish(roomId);
  },

  // anyone in the room may edit any card; the last save wins
  edit: async (event) => {
    const { roomId, cardId, text } = await read(event);
    if (!text) return fail(400, { message: "A card needs some text" });
    const { changes } = db
      .update(card)
      .set({ text, updatedAt: new Date() })
      .where(and(eq(card.id, cardId), eq(card.roomId, roomId)))
      .run();
    if (changes === 0) error(404, "No such card");
    logEvent(event, "card_edited", { room: roomId, card: cardId });
    publish(roomId);
  },

  // only the person who wrote a card may delete it
  delete: async (event) => {
    const { me, roomId, cardId } = await read(event);
    const { changes } = db
      .delete(card)
      .where(and(eq(card.id, cardId), eq(card.userId, me.id)))
      .run();
    if (changes === 0) error(404, "No such card");
    logEvent(event, "card_deleted", { room: roomId, card: cardId });
    publish(roomId);
  },
};
