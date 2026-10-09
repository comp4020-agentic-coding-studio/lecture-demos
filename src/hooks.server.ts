import type { Handle } from "@sveltejs/kit/hooks";
import { sequence } from "@sveltejs/kit/hooks";
import { building } from "$app/env";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { auth } from "#lib/server/auth.ts";
import { who } from "#lib/server/log.ts";

// The request log: one line per request, written when the response is ready.
//   [eec129] GET /rooms/1 200 7ms user=bZDooYdk
const handleLog: Handle = async ({ event, resolve }) => {
  const start = performance.now();
  event.locals.requestId = crypto.randomUUID().slice(0, 6);
  const response = await resolve(event);
  const ms = Math.round(performance.now() - start);
  const { method } = event.request;
  const path = event.url.pathname + event.url.search;
  console.log(
    `[${event.locals.requestId}] ${method} ${path} ${response.status} ${ms}ms user=${who(event)}`,
  );
  return response;
};

// The session cookie, looked up on every request: who is asking?
const handleSession: Handle = async ({ event, resolve }) => {
  const session = await auth.api.getSession({ headers: event.request.headers });
  if (session) {
    event.locals.session = session.session;
    event.locals.user = session.user;
  }
  return svelteKitHandler({ event, resolve, auth, building });
};

export const handle = sequence(handleLog, handleSession);
