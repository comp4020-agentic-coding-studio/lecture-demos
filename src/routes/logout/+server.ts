import { redirect } from "@sveltejs/kit";
import { auth } from "#lib/server/auth.ts";
import { logEvent } from "#lib/server/log.ts";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async (event) => {
  await auth.api.signOut({ headers: event.request.headers });
  logEvent(event, "signed_out");
  redirect(303, "/");
};
