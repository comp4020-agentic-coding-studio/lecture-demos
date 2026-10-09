import { fail, redirect } from "@sveltejs/kit";
import { APIError } from "better-auth/api";
import { auth } from "#lib/server/auth.ts";
import { logEvent } from "#lib/server/log.ts";
import type { Actions, PageServerLoad } from "./$types";

// only send people back to a path on this site
const next = (url: URL) => {
  const to = url.searchParams.get("next") ?? "/";
  return to.startsWith("/") && !to.startsWith("//") ? to : "/";
};

export const load: PageServerLoad = ({ locals, url }) => {
  if (locals.user) redirect(303, next(url));
};

export const actions: Actions = {
  signIn: async (event) => {
    const form = await event.request.formData();
    const email = form.get("email")?.toString() ?? "";
    try {
      const { user } = await auth.api.signInEmail({
        body: { email, password: form.get("password")?.toString() ?? "" },
      });
      event.locals.user = user as App.Locals["user"];
    } catch (error) {
      if (error instanceof APIError)
        return fail(400, { action: "signIn", email, message: error.message });
      throw error;
    }
    logEvent(event, "signed_in");
    redirect(303, next(event.url));
  },
  signUp: async (event) => {
    const form = await event.request.formData();
    const email = form.get("email")?.toString() ?? "";
    const name = form.get("name")?.toString().trim() ?? "";
    try {
      const { user } = await auth.api.signUpEmail({
        body: { email, name, password: form.get("password")?.toString() ?? "" },
      });
      event.locals.user = user as App.Locals["user"];
    } catch (error) {
      if (error instanceof APIError)
        return fail(400, { action: "signUp", email, name, message: error.message });
      throw error;
    }
    logEvent(event, "signed_up");
    redirect(303, next(event.url));
  },
};
