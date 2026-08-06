# Plan: an interactive explainer from this week's hall-of-fame pick

My working file. It records decisions, not requirements --- the Assignment 1
brief and spec are published on the course site and stay there. Nothing here
overrides them, and this file is not a second spec.

Source pick:
[Wally's Kanto Pokedex](https://comp4020-agentic-coding-studio.github.io/comp4020-crit1-wally0225/index.html)
--- a 2001-styled fan site for the original 151 Pokémon, read as a visitor.

## The subject I'm taking from it

The pick's own subject is the 151, and its centre of gravity is the Pokedex
page: stats and descriptions for all of them, framed as a collection one trainer
is working through. The site is earnest and solitary --- one hobbyist, a hit
counter, a guestbook asking strangers to leave a mark.

That solitude is the thing worth explaining. The pick treats completing the 151
as a private project. It wasn't one, and it couldn't be.

## The one idea

**"Gotta catch 'em all" was a promise the cartridge could not keep on its own.**
The original games were built so that no single copy contained all 151. Roughly
a dozen Pokémon per version were withheld from the other version, four more
would only evolve while being traded, and one was never obtainable in normal
play at all. The completion goal that sold the game was, by construction,
unreachable by one person with one cartridge and no friends.

The point of view: this is design, not oversight. Scarcity was engineered to
make the game social, and a generation experienced that as friendship rather
than as a mechanic. The pick's lone trainer with a guestbook is the same shape
--- someone who needs other people and is asking politely.

## The one mechanic

**The visitor changes who they know, and the dex responds.**

All 151 render as a grid. The visitor starts alone with one cartridge and a
running count of what they can complete. One control adds people to their world
--- a friend with the other version, then a second friend --- and each addition
recolours cells from unobtainable to obtainable and moves the count. Cells that
stay dark carry the reason they're dark (wrong version, needs a trade, never
released).

The argument is carried entirely by that movement: alone you hit a hard ceiling
well short of 151, and the number only climbs when someone else enters the
picture. Nothing needs to argue it in prose.

Stated plainly enough to test: activating the "friend with the other version"
control moves a known set of cells from unobtainable to obtainable and increases
the completable count; removing them reverses it.

## The data

Small enough to be a single hand-checked file: 151 names, and per entry a
version flag, a needs-trade flag, and an unobtainable flag. No stats, no types,
no sprites, no images.

I do not trust my memory of the exclusive lists, the trade-evolution set, or the
resulting ceiling, and neither should the agent. These get sourced deliberately
during the build and then pinned in a test, so the count on screen is an
assertion rather than a recollection. Getting this wrong is the one factual
failure the explainer cannot survive.

## Shape of the page

One page. A short title and a sentence of setup, the grid, the one control, the
count, and one closing line landing the point. That is the whole thing.

Tone borrows the pick's 2001 fan-site look, because a lone trainer's homepage is
the right register for an argument about needing other people. This is cosmetic
and cuttable --- if it starts competing with the mechanic for attention, it
goes.

## Wireframe

Counts shown as `NNN` on purpose --- see the data section. Filled cells are
obtainable, hollow cells are not.

Desktop, opening state (alone, one cartridge):

```
┌─ 1024px ──────────────────────────────────────────────────────┐
│                                                               │
│   You cannot catch them all                                   │
│   Red version. One cartridge. No friends.                     │
│                                                               │
│  ┌─ sticky ──────────────────────────────────────────────┐    │
│  │ NNN of 151   Who you know:  (•) just me  ( ) + Blue   │    │
│  │ ▸ Pick a square to see why.                           │    │
│  └───────────────────────────────────────────────────────┘    │
│                                                               │
│   ■ ■ ■ ■ □ ■ ■ ■ ■ ■ ■ □ ■ ■                                 │
│   ■ ■ □ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ □                                 │
│   ■ ■ ■ ■ ■ ■ □ ■ ■ ■ ■ ■ ■ ■                                 │
│   ·  ·  (14 columns × 11 rows = 151 cells)  ·  ·              │
│   ■ ■ ■ ■ ■ ■ □                                               │
│                                                               │
│   One closing line lands the point.                           │
└───────────────────────────────────────────────────────────────┘
```

What the mechanic does --- the only thing that moves when the control changes:

```
   ( ) just me    (•) + a friend with Blue

   ■ ■ ■ ■ ▣ ■ ■ ■ ■ ■ ■ ▣ ■ ■        ┌────────────────┐
   ■ ■ ▣ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ▣        │  MMM of 151    │   135 → 150
                                      └────────────────┘
   ▣ = just became obtainable        □ = still dark, still has a reason
```

Phone. The grid is 19 rows here, far taller than the viewport, so everything
that reacts to the grid has to sit above it and stay put --- a tally or a reason
line placed after the grid would be offscreen at the moment it changed:

```
┌─ 390px ──────────┐
│ You cannot catch │
│ them all         │
│ Red version.     │
│ One cartridge.   │
├──────────────────┤ ← sticky from here down
│ MMM of 151       │
│ Who you know     │
│ (•) me ( ) +Blue │
│ ▸ reason / hint  │
├──────────────────┤
│ ■ ■ ■ ■ □ ■ ■ ■  │
│ ■ ■ □ ■ ■ ■ ■ ■  │
│ ■ ■ ■ ■ ■ □ ■ ■  │
│ ■ □ ■ ■ ■ ■ ■ ■  │
│  ·  ·  ·  ·  ·   │
│ (8 wide, 19 tall)│
│ ■ ■ ■ ■ ■ ■ □    │
├──────────────────┤
│ closing line     │
└──────────────────┘
```

What the wireframe settled that the prose above had left vague:

- the reason for a dark cell is **driven by focus, not a tooltip**. Tooltips are
  hover-only, and the marking pass tabs through.
- the count is **sticky**, because a cause and its effect that can't share a
  screen aren't legible as cause and effect. This was the one layout risk worth
  spending effort on, and it was worth more than I budgeted.

What building it then settled, each a version of that same risk I'd only
half-followed:

- the **reason line belongs in the sticky bar too**, not under the grid. I had
  it below, which meant tapping a cell twelve rows down updated a line the
  reader couldn't see. Same bug as the count, one step further along.
- the reason line **reserves its height and holds a standing prompt** when
  nothing is picked. Empty, the reservation reads as a broken gap; and on touch
  there is no hover to stumble into, so without a prompt nothing suggests the
  squares do anything at all.
- **columns are fluid, not a count per breakpoint** (`auto-fill` on a 2.5rem
  floor: 14 across on desktop, 8 on a phone, real touch targets throughout). The
  arrow keys read the resulting count back out of the computed style, so a
  resize mid-interaction can't leave them stepping the wrong distance.

## What I am not building

The scope wall, written down so I can be held to it:

- no per-Pokémon detail view, stats, types, sprites or descriptions
- no search, filter, sort or type chart
- no second version of the mechanic (no trade animation, no battle, no quiz)
- no other pages --- no rankings, no trainer's corner, no guestbook
- no scroll-driven narration; the control is the whole interaction
- no build-time data pipeline; the data file is committed and read directly

Any one of these would be a second idea wearing the first one's clothes.

## Checks I care about

- the invariants stay green, since they run against the built site
- the core interaction gets its own test in `spec/`: state in, state out
- the count and the flagged sets are asserted against the sourced data
- keyboard reachable, and the grid survives a resize mid-interaction --- the
  marking pass does both, and a 151-cell grid is where that will bite

## Calls made

All three open questions went the smaller way:

- **the idea stands.** The runner-up --- Tajiri's insect collecting as the
  origin of the whole design --- stayed unbuilt. Same subject, softer mechanic.
- **the control goes to one friend, not two.** One is enough to make the
  argument, and it turns out to make it exactly: a single Blue cartridge carries
  Blue's eleven exclusives _and_ makes the four trade evolutions possible, so
  one control move takes 135 to 150 and leaves only Mew.
- **the retro skin is cut.** It was the first thing marked cuttable and nothing
  since has argued for it.

## Where it got to

Built and green: `dex-data.ts` (151 entries derived from PokeAPI, not recalled),
`dex.ts` (pure `reach`/`completable`), the page, and `spec/dex.test.ts` pinning
both counts and both blocked sets.

Verified in a browser rather than inferred from a green suite, because
`pnpm check` never executes `main.ts`: the bar stays pinned mid-scroll and the
count moves 135 → 150 from down inside the grid; arrow keys step 8 at phone
width and 14 at desktop, including across a resize with a cell still focused;
one tab stop for all 151; and `pointerleave` no longer wipes the reason line on
touch.

Still true that nothing automated covers the DOM wiring --- the logic has tests,
the page does not. That is the obvious next thing if this were being marked
rather than demonstrated.
