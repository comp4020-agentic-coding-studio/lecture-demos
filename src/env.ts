import { defineEnvVars } from "@sveltejs/kit/env";

export const variables = defineEnvVars({
  DATABASE_PATH: {
    description: "Where the SQLite file lives. fly.toml points it at the volume.",
    schema: (value) => value || ".data/app.db",
  },
  ORIGIN: {
    description:
      "The URL people reach the app at. Defaults to the Fly URL on Fly, and is worked out from each request elsewhere.",
    schema: (value) =>
      value ||
      (process.env.FLY_APP_NAME ? `https://${process.env.FLY_APP_NAME}.fly.dev` : undefined),
  },
});
