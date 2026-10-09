import { describe, expect, inject, it } from "vitest";

// The board's platform claims, checked over HTTP against the built server
// (spec/global-setup.ts): it is multi-user, real-time, and it persists.
const baseUrl = inject("baseUrl");

// A browser posting a form: same-origin, so SvelteKit's CSRF check passes
// (x-forwarded-proto: see PROTOCOL_HEADER in spec/global-setup.ts).
async function post(path: string, fields: Record<string, string>, cookie = "") {
  return fetch(new URL(path, baseUrl), {
    method: "POST",
    redirect: "manual",
    headers: {
      origin: baseUrl,
      "x-forwarded-proto": "http",
      accept: "text/html",
      "content-type": "application/x-www-form-urlencoded",
      cookie,
    },
    body: new URLSearchParams(fields),
  });
}

async function signUp(name: string): Promise<string> {
  const res = await post("/login?/signUp", {
    name,
    email: `${name}-${Date.now()}@example.com`,
    password: "correct horse battery",
  });
  expect(res.status).toBe(303);
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  expect(cookie).toContain("session_token");
  return cookie;
}

describe("rooms", () => {
  it("shows one person's card to another, live and after a reload, and only its author can delete it", async () => {
    const ada = await signUp("ada");
    const bo = await signUp("bo");

    const created = await post("/?/create", { name: "standup" }, ada);
    expect(created.status).toBe(303);
    const roomPath = created.headers.get("location")!;
    expect(roomPath).toMatch(/^\/rooms\/\d+$/);

    // Bo has the room open: its event stream is waiting for a change
    const stream = await fetch(new URL(`${roomPath}/events`, baseUrl), {
      headers: { cookie: bo },
    });
    expect(stream.headers.get("content-type")).toBe("text/event-stream");
    const reader = stream.body!.getReader();
    const decoder = new TextDecoder();
    const changed = (async () => {
      let seen = "";
      while (!seen.includes("data: changed")) {
        const { value, done } = await reader.read();
        if (done) break;
        seen += decoder.decode(value);
      }
      return seen;
    })();

    await post(`${roomPath}?/add`, { text: "buy oat milk" }, ada);
    expect(await changed).toContain("data: changed");
    await reader.cancel();

    const page = await (
      await fetch(new URL(roomPath, baseUrl), { headers: { cookie: bo } })
    ).text();
    expect(page).toContain("buy oat milk");

    const cardId = page.match(/name="id" value="(\d+)"/)?.[1];
    expect(cardId).toBeDefined();
    const refused = await post(`${roomPath}?/delete`, { id: cardId! }, bo);
    expect(refused.status).toBe(404);
  });
});
