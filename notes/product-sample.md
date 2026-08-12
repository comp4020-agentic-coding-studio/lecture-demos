# Product evidence pass — 12 user-provided Clearance product URLs

These 12 URLs were provided by the student, captured directly from their own
browsing of the live Kmart Clearance experience. Two evidence tiers, kept
distinct: **automated fetch** (`curl` + `WebFetch`) — 0/12 accessible, blocked
with `HTTP 403 Access Denied` (Akamai WAF) — and **USER-PROVIDED BROWSER
OBSERVATION** (the student's own screenshots of the live product pages) —
11/12 grounded. Full access-method detail is in `sources.md` §8–§9; every
price/category/SKU value below comes from the screenshots (§9), never from
the failed automated attempt.

No price, discount, or category has been inferred from a slug, a discount
label, or any third-party/search source. Item 12 has no screenshot evidence
yet and is recorded as unresolved rather than guessed.

## Per-item results

| # | Product | Official URL | SKU | originalPrice (was) | clearancePrice (now) | savingAmount | discountPercentage | Category/breadcrumb | Clearance label | Both prices confirmed? | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Pet Rashie – Medium, Blue | [link](https://www.kmart.com.au/product/pet-rashie-medium-blue-43554461/) | P_43554461 | $10.00 | $1.00 | $9.00 | 90.0% | unavailable | Yes | Yes | Grounded (screenshot) |
| 2 | Air Fryer and Pizza Maker | [link](https://www.kmart.com.au/product/air-fryer-and-pizza-maker-43624515/) | P_43624515 | $109.00 | $65.00 | $44.00 | 40.4% | Home & Living > Appliances > Kitchen Appliances > Air Fryers | Yes | Yes | Grounded (screenshot) |
| 3 | Desktop Mug Warmer – Lilac | [link](https://www.kmart.com.au/product/desktop-mug-warmer-lilac-43632220/) | P_43632220 | $12.00 | $6.00 | $6.00 | 50.0% | Home & Living > Appliances > Kitchen Appliances > Coffee Machines & Makers | Yes | Yes | Grounded (screenshot) |
| 4 | Digital Video Recorder – White | [link](https://www.kmart.com.au/product/digital-video-recorder-white-43593330/) | P_43593330 | $35.00 | $15.00 | $20.00 | 57.1% | Tech & Gaming > Cameras & Accessories > Cameras & Video Recorders | not noted | Yes | Grounded (screenshot) |
| 5 | LED Rocket Lamp | [link](https://www.kmart.com.au/product/led-rocket-lamp-43649990/) | P_43649990 | $9.00 | $3.00 | $6.00 | 66.7% | Home & Living > Home Decor > Lighting > LED Lights & Neon Lights | Yes | Yes | Grounded (screenshot) |
| 6 | Neon Arcade Dance Machine | [link](https://www.kmart.com.au/product/neon-arcade-dance-machine-43550388/) | P_43550388 | $39.00 | $10.00 | $29.00 | 74.4% | Toys > Toys by Category > Preschool & Toddler > Learning & Puzzles > Music & Learning | Yes | Yes | Grounded (screenshot) |
| 7 | Mini Blocks Animal Series – Assorted | [link](https://www.kmart.com.au/product/mini-blocks-animal-series-assorted-43542628/) | P_43542628 | $15.00 each | $5.00 each | $10.00 | 66.7% | Toys > Toys by Category > Blocks & Construction > Mini Blocks | Yes | Yes | Grounded (screenshot) |
| 8 | 3D Plaster Painting Kit – Tulip | [link](https://www.kmart.com.au/product/3d-plaster-painting-kit-tulip-43660476/) | P_43660476 | $10.00 | $3.00 | $7.00 | 70.0% | Entertainment > Art & Craft > Craft Supplies > Craft Kits | Yes | Yes | Grounded (screenshot) |
| 9 | Bamboo Section Serve Board | [link](https://www.kmart.com.au/product/bamboo-section-serve-board-43629725/) | P_43629725 | $29.00 | $5.00 | $24.00 | 82.8% | Home & Living > Dining > Serveware > Grazing Boards | Yes | Yes | Grounded (screenshot) |
| 10 | Mediterranean Pomodoro Tomato Stripe Candle | [link](https://www.kmart.com.au/product/mediterranean-pomodoro-tomato-stripe-candle-43636709/) | P_43636709 | $13.00 | $2.00 | $11.00 | 84.6% | Home & Living > Home Decor > Candles & Home Fragrance | Yes | Yes | Grounded (screenshot) |
| 11 | Pretzel Ceramic Pen Cup | [link](https://www.kmart.com.au/product/pretzel-ceramic-pen-cup-43666515/) | P_43666515 | $5.00 | $0.50 | $4.50 | 90.0% | Home & Living > Home Office & Stationery > Desk Organisation & Accessories > Pen Cups | Yes | Yes | Grounded (screenshot) |
| 12 | DIY Sparkle Gem Art Trinket Tray – Egg | [link](https://www.kmart.com.au/product/diy-sparkle-gem-art-trinket-tray-egg-43670567/) | unavailable | unavailable | unavailable | — | — | unavailable | unavailable | No | **Unresolved — no screenshot evidence yet** |

Notes on the table:
- `originalPrice`/`clearancePrice` are shown to 2 decimal places for
  readability; store the exact numeric values (not the rounded
  `discountPercentage`) for any future code that recomputes these.
- Item 4 (Digital Video Recorder) and item 4's clearance-label field: the
  student's observation did not explicitly note a "Clearance" label visible
  on that page, unlike the other 10 — recorded as "not noted" rather than
  assumed absent or present.
- No image URL is recorded for any item. The screenshots confirm the visible
  product images, but no stable standalone image URL has been sourced for
  any item — this stays `unavailable` per instruction, not guessed from the
  product URL pattern.
- Category/breadcrumb is `unavailable` for item 1 (Pet Rashie) — not noted in
  that screenshot, not assumed.

## Why "biggest discount" and "biggest saving" produce different orderings

Ranking this same 11-item sample by `discountPercentage` versus by
`savingAmount` puts different items first:

- **Pretzel Ceramic Pen Cup** is 90.0% off — one of the two deepest
  percentage discounts in the sample — but only saves **$4.50** in absolute
  terms.
- **Air Fryer and Pizza Maker** is only about 40.4% off — one of the
  shallower percentage discounts in the sample — but saves **$44.00**, the
  largest dollar amount of any item here.

A shopper sorting by "biggest discount" would see the Pretzel Cup near the
top and the Air Fryer well down the list; a shopper sorting by "biggest
saving" would see exactly the opposite. Neither ordering is wrong — they
answer different questions — which is the concrete, grounded demonstration of
the design principle in `content-brief.md` ("cheap" and "good markdown value"
are different signals).

## Summary

- **Pages accessible via automated fetch:** 0 of 12 (unchanged — see
  `sources.md` §8).
- **Items grounded via student browser screenshot, with both original and
  current price confirmed from the same official page:** **11 of 12.**
- **Enough grounded data for "Biggest discount" / "Biggest saving" right
  now?** **Yes** — 11 items with confirmed `originalPrice` and
  `clearancePrice` pairs, spanning 4+ departments (Home & Living, Tech &
  Gaming, Toys, Entertainment), is enough to implement a first Deal Explorer
  dataset and to demonstrate that the two sort modes produce different
  orderings (see above).
- **Which items should be excluded from the sortable sample:** only **item
  12 (DIY Sparkle Gem Art Trinket Tray – Egg)** — no screenshot evidence
  exists for it yet, so it stays unresolved rather than invented. It can be
  added later once grounded the same way as the other 11.
