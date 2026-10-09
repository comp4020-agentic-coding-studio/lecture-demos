import { spawn } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { type AddressInfo, createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    baseUrl: string;
  }
}

// Boot the BUILT server (the same artefact the Dockerfile runs) on a free
// port with a throwaway database, so the spec asserts what actually ships —
// not the dev server, and never your local data.
export default async function setup(project: TestProject): Promise<() => void> {
  const server = "./build/index.js";
  if (!existsSync(server)) {
    throw new Error(`${server} not found — run \`pnpm test\`, which builds first`);
  }

  const port = await new Promise<number>((resolve) => {
    const probe = createServer();
    probe.listen(0, () => {
      const address = probe.address() as AddressInfo;
      probe.close(() => resolve(address.port));
    });
  });

  // detached, so the whole process group can be stopped at the end
  const app = spawn(process.execPath, [server], {
    env: {
      ...process.env,
      PORT: String(port),
      ORIGIN: `http://127.0.0.1:${port}`,
      // adapter-node assumes https (on Fly, TLS ends at the proxy); this server
      // is plain http, so a POST says so in the header a proxy would set
      PROTOCOL_HEADER: "x-forwarded-proto",
      DATABASE_PATH: join(mkdtempSync(join(tmpdir(), "spec-db-")), "test.db"),
    },
    stdio: "ignore",
    detached: true,
  });
  const stop = () => {
    if (app.pid) process.kill(-app.pid, "SIGTERM");
  };

  const baseUrl = `http://127.0.0.1:${port}`;
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(baseUrl);
      if (res.ok) break;
    } catch {
      // not up yet
    }
    if (attempt >= 100) {
      stop();
      throw new Error(`server did not come up at ${baseUrl}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  project.provide("baseUrl", baseUrl);
  return stop;
}
