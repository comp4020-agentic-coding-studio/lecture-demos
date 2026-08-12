import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

// C2's spec ("Unsolicited redesign"): a real organisation's site, restructured
// and rewritten. Only the mechanically-checkable lines get a test here —
// "you don't need anyone's permission", "yours is better in ways you can
// name", and "the organisation is real" are judged at the crit, not here.
// See spec/README.md for how this file relates to the published spec.
const DIST = resolve("dist");

function htmlFiles(dir: string = DIST): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.name.endsWith(".html") ? [path] : [];
  });
}

const pages = htmlFiles().map((path) => ({
  name: relative(DIST, path),
  doc: new JSDOM(readFileSync(path, "utf8")).window.document,
}));

const home = pages.find(({ name }) => name === "index.html");

describe("spec: serves the organisation's real information", () => {
  it("built a home page", () => {
    expect(home).toBeTruthy();
  });

  it("describes who the organisation is and what they do, not a stub", () => {
    const main = home!.doc.querySelector("main");
    expect(main, "expected a <main> region with the organisation's content").toBeTruthy();
    const text = main!.textContent!.replace(/\s+/g, " ").trim();
    expect(
      text.length,
      "the home page reads like a placeholder, not a description of a real organisation",
    ).toBeGreaterThan(200);
  });

  it("gives a way to find or contact the organisation", () => {
    const findableAcrossSite = pages.some(({ doc }) => {
      if (doc.querySelector("address")) return true;
      if (doc.querySelector('a[href^="mailto:"], a[href^="tel:"]')) return true;
      const links = Array.from(doc.querySelectorAll("a[href]")) as HTMLAnchorElement[];
      return links.some((a) => /maps\.|openstreetmap|goo\.gl\/maps/i.test(a.getAttribute("href") ?? ""));
    });
    expect(
      findableAcrossSite,
      "expected an <address>, a mailto:/tel: link, or a map link somewhere on the site",
    ).toBe(true);
  });
});
