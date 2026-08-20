import { renderStrip, start } from "./src/app.ts";

start();

// The last frame in the strip is a whole exposure's worth of photons, which is
// a few hundred milliseconds of work. Let the page paint before spending it.
const paintStrip = (): void => {
  renderStrip([500, 12_000, 250_000, 11_000_000]);
};
if ("requestIdleCallback" in window) {
  requestIdleCallback(paintStrip, { timeout: 1500 });
} else {
  setTimeout(paintStrip, 0);
}
