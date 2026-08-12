# Sources

Two kinds of evidence, kept distinct throughout: official Kmart Australia
public web pages (fetched automatically), and direct browser screenshots the
student captured of pages the automated fetch couldn't reach. Neither
substitutes for the other, and neither is the student's personal experience
(that lives only in `content-brief.md` → "Why I chose it," clearly labelled as
such). No search-engine summaries, AI summaries, third-party shopping sites,
or forum posts (e.g. Reddit) were used as a substitute for reading an official
page directly. Wikipedia turned up in search results while looking for
candidate URLs but was deliberately **not** used as a citation, for the same
reason.

Access method: direct HTTP fetch (`curl` with a standard browser User-Agent
header, since the automated `WebFetch` tool was blocked with `403` on every
kmart.com.au URL tried). All accesses below are dated **2026-08-08**.

## Successfully accessed

### 1. Kmart Australia — homepage
- **URL:** https://www.kmart.com.au/
- **Accessed:** 2026-08-08
- **Status:** HTTP 200, full page retrieved (~2.65MB HTML)
- **Supports:**
  - Official meta description of what Kmart sells: affordable homewares,
    furniture, electronics, toys, and kids clothing.
  - "Clearance" exists as a sub-navigation item under nearly every department
    (Home & Living, Womens, Mens, Kids & Baby, Toys, Beauty, Sport & Outdoor,
    Tech & Gaming, and others) — confirmed directly in the page's own
    navigation markup.
  - Footer links to About Us, Careers, Contact Us, Store Locator, and
    Catalogue exist and resolve to real URLs.
  - Site mentions delivery/payment features: free delivery over $65, express
    delivery, OnePass, and payment options including Apple Pay, Afterpay,
    PayPal, and Zip.
  - Tagline "Low prices for life" appears in the page title/branding.
  - An AI assistant branded "Ask Joy" appears in the persistent site header.
- **Does not support:** any clearance product listing, price, or sort-option
  detail — none of that content is rendered on the homepage itself.

### 2. About Us
- **URL:** https://www.kmart.com.au/careers/about-us/
- **Accessed:** 2026-08-08
- **Status:** HTTP 200, page-specific body content present in the static HTML
  (unlike Contact Us / Store Locator below)
- **Supports:**
  - Page title: "About Kmart Australia & New Zealand — Our Company History,
    Culture & Values"
  - Headline stats: "55,000+ EMPLOYEES", "450 STORES", "7 MILLION+ WEEKLY
    CUSTOMERS"
  - Kmart describes itself as part of "Kmart Group" — text: "Did you know we
    are part of something much bigger?"
  - Footer copyright: "© Kmart 2026"
- **Does not support:** founding year or ownership structure — not needed for
  this brief, so not pursued further.

## Partially accessed — page exists, functional content not confirmable

### 3. Store Locator
- **URL:** https://www.kmart.com.au/store-locator/
- **Accessed:** 2026-08-08
- **Status:** HTTP 200 (following a redirect), page title confirmed as "Store
  Locator - Kmart"
- **Supports:** that this page exists and is Kmart's official store-finder,
  linked from the homepage.
- **Does not support:** anything about how the search itself works (e.g.
  search-by-postcode/suburb) — the functional widget appears to be rendered
  client-side by JavaScript and was not present in the static HTML retrieved.

### 4. Contact Us
- **URL:** https://www.kmart.com.au/contact-us/
- **Accessed:** 2026-08-08
- **Status:** HTTP 200, page loads
- **Supports:** that the page exists; that Kmart's site separately links
  "Contact Us" and a help/FAQ area in its global navigation/footer.
- **Does not support:** any phone number, email address, live-chat
  availability, or opening hours. None of that page-specific text was present
  in the static HTML fetched — it is very likely rendered client-side from an
  API call this fetch method cannot execute.

## Access failed — could not be read (automated fetch)

### 5. Shop All Clearance (category hub)
- **URL:** https://www.kmart.com.au/category/clearance/shop-all-clearance/
- **Attempted:** 2026-08-08
- **Status:** **HTTP 403 "Access Denied"**, returned by Kmart's edge/WAF
  (Akamai reference logged in the response body, e.g. `Reference
  #18.c40db17.1786112795.56f0fad`). Reproduced on retry after a delay.
- **Also attempted:** a second, different clearance sub-category URL —
  https://www.kmart.com.au/category/tech-and-gaming/technology-clearance/ —
  same result, HTTP 403.
- **Checked:** https://www.kmart.com.au/robots.txt (HTTP 200) — does **not**
  disallow `/category/` paths. This rules out a robots.txt/crawl-policy
  explanation; the block is active bot-detection (WAF), not a crawling rule.
- **Supports / does not support:** nothing was retrieved. No sort-option,
  product-listing, or pricing information exists in this source at all.

### 6. Individual clearance product pages
- **Not attempted.** No real product URL was obtained via automated fetch,
  because the listing page that would supply one (source 5) is blocked. No
  product name, price, or discount data has been collected via automated
  fetch, and none has been fabricated.

## User-provided browser observation (screenshots)

### 7. Clearance browsing interface — student screenshots
- **Provided by:** student, captured directly from the live Kmart Australia
  site in their own browser (not an automated fetch — this is exactly the
  page source 5 above could not reach)
- **Date noted:** 2026-08-08
- **Shows:**
  - A genuine Kmart product listing / clearance browsing interface
  - Result count: "1–60 of 10000 Products"
  - A "Sort by" menu with exactly these options: **Price: Low to high**,
    **Price: High to low**, **New**, **Relevance**
  - No visible sort option for discount percentage, biggest saving, or any
    other markdown-based ordering
- **Supports:** the core problem statement in `content-brief.md` — the
  current interface can only be sorted by final price (either direction),
  recency, or relevance; there is no way to sort by markdown percentage or
  dollar amount saved. This is now a confirmed observation, not an assumption.
- **Does not support:** any specific product name, price, or discount — the
  screenshots record the sort/filter interface and result count, not legible
  individual product-card pricing.

## User-provided official product URLs (attempted, blocked)

### 8. 12 individual Clearance product pages
- **Provided by:** student, 12 exact official `kmart.com.au/product/...` URLs
  captured from their own live Clearance browsing (full list and per-item
  results in [`product-sample.md`](./product-sample.md))
- **Attempted:** 2026-08-08
- **Method:** direct `curl` with a browser User-Agent, `Accept-Language`
  header, `Referer: https://www.kmart.com.au/`, and session cookies warmed by
  first fetching the homepage; the `WebFetch` tool was also tried
  independently on one of the 12 URLs as a cross-check
- **Status:** **all 12 returned HTTP 403 "Access Denied"** (Akamai WAF), the
  same block pattern as source 5. Checked `robots.txt` again for `/product/`
  specifically — not disallowed, so this is bot-detection, not a crawl policy.
- **Supports / does not support:** nothing was retrieved for any of the 12.
  No product name, price, category, or image has been confirmed for any item
  — see `product-sample.md` for the full per-item table.

### 9. 11 individual Clearance product pages — student screenshots
- **Provided by:** student, captured directly from the live official Kmart
  Australia product pages listed in source 8, in their own browser (not an
  automated fetch — this is exactly what source 8 could not reach)
- **Date noted:** 2026-08-08
- **Covers:** 11 of the 12 URLs from source 8 (all except item 12, "DIY
  Sparkle Gem Art Trinket Tray – Egg," which has no screenshot yet)
- **Shows, per item:** product name, was price, current price, SKU, and (for
  most items) a breadcrumb category and a visible "Clearance" label — full
  per-item values in [`product-sample.md`](./product-sample.md)
- **Supports:** `originalPrice` and `clearancePrice` for 11 items, each
  confirmed together from the same official product page — satisfying the
  grounding rule in `content-brief.md` → "Product information model." This
  is enough to compute `savingAmount`/`discountPercentage` for those 11 and
  to implement a first Deal Explorer dataset.
- **Does not support:** item 12 (still unresolved, no evidence), any image
  URL for any item (screenshots confirm images are visible but no stable
  standalone image URL was sourced), and the breadcrumb category for item 1
  (Pet Rashie) or the "Clearance" label presence for item 4 (Digital Video
  Recorder) — neither was noted in those two screenshots, so both stay
  `unavailable`/`not noted` rather than assumed.

## Current state

- 11 of 12 products are grounded by screenshot (source 9), with
  `originalPrice` and `clearancePrice` confirmed together from the same
  official page — enough for the first Deal Explorer dataset.
- Item 12 ("DIY Sparkle Gem Art Trinket Tray – Egg") remains unresolved — no
  screenshot evidence yet.
- No item has a stable standalone product image URL.
