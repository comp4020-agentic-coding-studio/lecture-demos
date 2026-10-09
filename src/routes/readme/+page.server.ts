import { marked } from "marked";
import readme from "../../../README.md?raw";
import type { PageServerLoad } from "./$types";

// README.md is read at build time and served in full (spec/readme.test.ts)
export const trailingSlash = "always";

export const load: PageServerLoad = async () => ({ html: await marked.parse(readme) });
