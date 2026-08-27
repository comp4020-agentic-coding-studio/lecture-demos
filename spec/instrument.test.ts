import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

// Turns the mechanically-checkable lines of this week's brief
// (https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/api/crits/04-instrument.json)
// into tests. Expressiveness, feel and "does a stranger find music in it
// uninstructed" are for the crit, not a test file — see spec/README.md.

const DIST = resolve("dist");
const doc = new JSDOM(readFileSync(join(DIST, "index.html"), "utf8")).window.document;

function bundledText(extension: string): string {
  const assetsDir = join(DIST, "assets");
  const files = readdirSync(assetsDir).filter((name) => name.endsWith(extension));
  return files.map((name) => readFileSync(join(assetsDir, name), "utf8")).join("\n");
}

describe("playable with whatever is at hand", () => {
  it("every chime is a real button, so it is keyboard-operable without extra script", () => {
    const chimes = doc.querySelectorAll(".chime");
    expect(chimes.length).toBeGreaterThan(0);
    for (const chime of chimes) {
      expect(chime.tagName).toBe("BUTTON");
    }
  });

  it("gives each chime an accessible name, so a screen-reader user can find it uninstructed", () => {
    const chimes = doc.querySelectorAll(".chime");
    for (const chime of chimes) {
      expect(chime.getAttribute("aria-label")?.trim()).toBeTruthy();
    }
  });

  it("turns off the browser's default touch gestures on the instrument, so a touch drag strikes tubes instead of scrolling", () => {
    const css = bundledText(".css");
    expect(css).toMatch(/touch-action:\s*none/);
  });
});

describe("sound made live in the page, not played back", () => {
  it("ships no prerecorded audio media", () => {
    expect(doc.querySelectorAll("audio, source[src]").length).toBe(0);
  });

  it("synthesises with the Web Audio API", () => {
    const js = bundledText(".js");
    expect(js).toMatch(/AudioContext/);
  });
});

describe("no score, no fail state", () => {
  it("never tells the player they got it wrong or gives them a score", () => {
    const bodyText = doc.body.textContent ?? "";
    expect(bodyText).not.toMatch(/\b(score|points?|game over|you (win|lose|lost))\b/i);
  });
});
