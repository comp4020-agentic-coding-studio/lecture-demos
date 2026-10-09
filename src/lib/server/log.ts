import type { RequestEvent } from "@sveltejs/kit";

// One line per thing a user does, tagged with the request it happened in:
//   [2b1f9c] card_created user=Xk2… room=3 card=7
export function logEvent(
  event: RequestEvent,
  name: string,
  fields: Record<string, string | number> = {},
) {
  const pairs = Object.entries({ user: event.locals.user?.id ?? "-", ...fields })
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
  console.log(`[${event.locals.requestId}] ${name} ${pairs}`);
}
