# Content brief — Kmart Australia Clearance product discovery

Full source list, including what each page does and doesn't support and the
access failures encountered, is in [`sources.md`](./sources.md). This brief
cites that file rather than repeating URLs inline.

## Organisation

Kmart Australia is a large general-merchandise retailer selling affordable
homewares, furniture, electronics, toys, and kids clothing (official meta
description, `sources.md` §1). Its own site states it operates 450 stores,
employs 55,000+ people, and serves 7 million+ weekly customers (`sources.md`
§2).

Users find Kmart via:
- The official site, https://www.kmart.com.au/
- Physical stores, located through the Store Locator
  (https://www.kmart.com.au/store-locator/ — confirmed to exist, but its
  actual search functionality could not be verified; `sources.md` §3)
- The Clearance range specifically, via department-level Clearance links
  reachable from the main site navigation (e.g. Home & Living, Toys, Tech &
  Gaming each have their own Clearance sub-page) and a "Shop All Clearance"
  hub — both confirmed to exist as real linked URLs (`sources.md` §5), and now
  also confirmed by direct browser observation (`sources.md` §7).

## Why I chose it

**Personal experience (student's own, not an official Kmart claim):**

> I like Kmart because its product range is extremely broad, but what
> attracts me most is the unusually low prices that sometimes appear during
> clearance — deals memorable enough to make me take a bus specifically to
> shop them. Checking Kmart's Clearance pages from time to time, I've been
> frustrated by the sorting options for a long time: because Kmart has so many
> products, sorting by Price: Low to high leaves many pages dominated by
> items that were already inexpensive, while something more interesting — an
> electronics item dropping from around $129 to $69, for example — can't be
> surfaced directly by markdown strength.

Remembered examples from the student's own shopping (motivation only —
**not** verified catalogue data, and not to be added to any future Deal
Explorer sample unless independently reverified against a live product page):
a ~$4 Bluetooth speaker, a ~$2.50 miniature TV building set, a two-piece
luggage set for ~$70, and an electronics item that dropped from ~$129 to ~$69.

This personal frustration is what the rest of this brief is trying to design
around — see "Current experience / problem" below for how far that's now
independently confirmed.

## Current experience / problem

**The core problem, stated explicitly:** the current Kmart Clearance
interface supports sorting by final price (low↔high), but not by markdown
percentage or dollar amount saved. This is no longer an assumption — it's
confirmed below by direct browser observation.

**Official-source facts** (automated fetch of official Kmart pages, see
`sources.md` §1–§4):
- "Clearance" is a distinct sub-navigation item under nearly every major
  department on kmart.com.au.
- There is a dedicated "Shop All Clearance" hub URL, linked from the site's
  own navigation, but its content could not be read this way — the
  automated fetch was blocked (HTTP 403) on both the hub and a department-level
  Clearance page, confirmed not to be a `robots.txt` restriction (`sources.md`
  §5).

**Browser observation** (two screenshots the student captured directly from
the live site, see `sources.md` §7 — this is evidence the automated fetch
above could not reach):
- The listing shown is a genuine Kmart product listing / clearance browsing
  interface, reporting "1–60 of 10000 Products" — confirming the catalogue is
  large enough that manual scanning for value is impractical.
- The "Sort by" menu offers exactly four options: **Price: Low to high**,
  **Price: High to low**, **New**, **Relevance**.
- No sort option for discount percentage, dollar amount saved, or any other
  markdown-based ordering is visible.

**Design interpretation** (mine, built on the two evidence tiers above, not
itself user-tested): with 10,000 products and only price/recency/relevance to
sort by, an item with a genuinely large discount or dollar saving has no way
to surface itself except by being manually found — it's easy for it to be
buried among many already-cheap, less-reduced items when sorting by price.
This is a plausible reading of the confirmed facts above, not a claim backed
by watching an actual shopper struggle.

## Target use case

Shoppers who are specifically browsing the Clearance range and want to
quickly identify items that are markedly reduced — not shoppers browsing
Kmart in general, and not a claim that this is the only correct way to shop
Clearance. Plenty of Clearance browsing is casual or price-driven, and that's
fine; this brief is scoped to the narrower case of someone specifically
hunting for a meaningful markdown.

## Design principle

"Cheap" and "good markdown value" are different information signals. A low
final price can come from an item that was already inexpensive; a large
discount or a large dollar saving is a different, and separately useful,
signal about how reduced an item is from its own original price. Neither
signal is "better" — they answer different questions, and Kmart's confirmed
sort options (Price: Low to high, Price: High to low, New, Relevance) don't
distinguish them at all.

## Proposed information architecture (tentative — not to be implemented yet)

1. Home
2. Deal Explorer
3. Why this redesign
4. Find Kmart

This is a working structure for later design work, not a build plan.

## Product information model

Fields per product:
- `id`
- `name`
- `category`
- `originalPrice` / `wasPrice`
- `clearancePrice`
- `sourceUrl`
- `sourceAccessedAt`

Computed fields:
- `savingAmount` = `originalPrice` − `clearancePrice`
- `discountPercentage` = `savingAmount` / `originalPrice`

**Grounding rule:** `savingAmount` and `discountPercentage` may only be
computed for a product when the official source page confirms *both* the
original/was price and the current clearance price together. If a source only
shows one of the two, the product is not included in any sortable sample.

No product data has been entered against this model yet. The two screenshots
provided so far confirm the sort menu and catalogue scale (see above) but not
legible product-level pricing, and the automated fetch of the Clearance
listing itself is still blocked — see `sources.md` for what's still needed.
The student's remembered examples in "Why I chose it" are motivation, not
sourced catalogue data, and must not be entered here without separate
verification against a live product page.

## Scope

**In scope:**
- An informational, static redesign (no live backend)
- A small, grounded sample of real products, sourced from official Kmart
  pages once accessible
- A client-side sorting/filtering demo over that sample
- Links to official Kmart pages (store locator, contact, full clearance
  range) rather than replicating them
- An explanation of the design reasoning behind the redesign

**Out of scope:**
- Any backend, login/account system, cart, or checkout
- Payments
- Live inventory or store-specific stock levels
- Ratings, reviews, or personalised recommendations
- Anything that presents itself as the official Kmart website
- Recreating Kmart's entire product catalogue

## Claims discipline

- **Official fact**: an observation stated as Kmart's own claim about itself
  (e.g. store counts, employee counts), directly seen on an official Kmart
  page and cited in `sources.md` — reported as their claim, not independently
  audited.
- **Browser observation**: something the student directly saw and screenshot
  on the live site, where the automated fetch could not reach the same page —
  cited in `sources.md` and clearly marked as such, not conflated with an
  official-fact citation.
- **Personal experience**: the student's own recollection or opinion (e.g.
  "Why I chose it") — never presented as an official Kmart fact or as
  verified catalogue data.
- **Design interpretation**: a reading or inference built on top of the
  evidence above, explicitly labelled as interpretation, not fact.
- **Assumption**: anything this brief still relies on that has not been
  confirmed by any source yet — currently, that's product-level pricing for
  any specific clearance item (see "Product information model" above).

Design interpretations must not be presented as validated user research — none
of them are backed by actual user testing at this stage. No product, price,
discount, inventory, contact detail, or Kmart policy has been invented; where
data is missing, this brief says so rather than filling the gap.
