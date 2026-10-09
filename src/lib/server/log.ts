import type { RequestEvent } from "@sveltejs/kit";

// Who made the request: the first 8 characters of their user id (enough to
// tell a class apart), or "-" when nobody is signed in.
export const who = (event: RequestEvent) => event.locals.user?.id.slice(0, 8) ?? "-";

// One line per thing a user does, tagged with the request it happened in:
//   [e4255b] card_created user=bZDooYdk room=1 card=1
export function logEvent(
  event: RequestEvent,
  name: string,
  fields: Record<string, string | number> = {},
) {
  const pairs = Object.entries({ user: who(event), ...fields })
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
  console.log(`[${event.locals.requestId}] ${name} ${pairs}`);
}
