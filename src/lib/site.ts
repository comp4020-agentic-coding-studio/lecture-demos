/**
 * astro.config.mjs sets `base` without a trailing slash (for GitHub Pages
 * project-site hosting), so import.meta.env.BASE_URL doesn't end in "/" —
 * every route link built on top of it needs this normalised first, or
 * "${base}deal-explorer/" collapses into one path segment.
 */
export function siteBase(): string {
  const raw = import.meta.env.BASE_URL;
  return raw.endsWith("/") ? raw : `${raw}/`;
}

/**
 * Every internal route, relative to `base`. The single source of truth
 * `relativeHref` builds links from, so adding a route means adding it here.
 */
export const ROUTES = {
  home: "",
  dealExplorer: "deal-explorer/",
  whyThisRedesign: "why-this-redesign/",
  findKmart: "find-kmart/",
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];

/**
 * A path-relative href from the current page to `route`, instead of one
 * rooted at "/" — a root-relative href only resolves once something maps
 * `base` onto the real filesystem root, which GitHub Pages does but a bare
 * static server over `dist/` (e.g. `linkinator ./dist`) does not. Relative
 * hrefs resolve correctly either way, since they only depend on the
 * directory structure under `dist/`, which is identical in both cases.
 */
export function relativeHref(pathname: string, route: Route): string {
  const base = siteBase();
  const current = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
  const depth = current.split("/").filter(Boolean).length;
  const href = "../".repeat(depth) + route;
  return href === "" ? "./" : href;
}
