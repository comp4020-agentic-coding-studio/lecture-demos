import type { User, Session } from "better-auth";

// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
  namespace App {
    interface Locals {
      requestId: string;
      user?: User;
      session?: Session;
    }
  }
}

export {};
