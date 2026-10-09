import { subscribe } from "#lib/server/rooms.ts";
import type { RequestHandler } from "./$types";

// Server-sent events: one response per open tab that never ends. Each event
// says only "something changed"; the page then re-fetches what it shows, so
// the stream carries nothing a signed-out visitor couldn't already see.
export const GET: RequestHandler = ({ params, request }) => {
  const roomId = Number(params.id);
  const encoder = new TextEncoder();
  let stop = () => {};

  const body = new ReadableStream({
    start(controller) {
      const send = (text: string) => controller.enqueue(encoder.encode(text));
      send(": connected\n\n");
      const unsubscribe = subscribe(roomId, () => send("data: changed\n\n"));
      // a comment line every 25s keeps Fly's proxy from closing an idle stream
      const heartbeat = setInterval(() => send(": ping\n\n"), 25_000);
      stop = () => {
        unsubscribe();
        clearInterval(heartbeat);
      };
      request.signal.addEventListener("abort", () => stop());
    },
    cancel() {
      stop();
    },
  });

  return new Response(body, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache" },
  });
};
