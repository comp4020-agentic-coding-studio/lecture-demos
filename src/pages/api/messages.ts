import type { APIRoute } from "astro";
import { addMessage, normaliseTopic } from "../../lib/db";
import { bus } from "../../lib/events";

// The write half of the demo: a plain HTML form POSTs here, the message goes
// into SQLite, and the new row is broadcast to every open SSE connection.
// The 303 redirect makes the form work with no client-side JavaScript at all
// — the submitting tab re-renders from the database; every *other* tab hears
// about it over the stream.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const body = String(form.get("body") ?? "").trim();
  const topic = normaliseTopic(String(form.get("topic") ?? ""));
  if (body) {
    bus.emit("message", addMessage(body.slice(0, 500), topic));
  }
  // a post from a filtered view lands back on that view
  const filter = String(form.get("filter") ?? "").trim();
  return redirect(filter ? `/?topic=${encodeURIComponent(normaliseTopic(filter))}` : "/", 303);
};
