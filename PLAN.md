# Plan: a brand check on this week's hall-of-fame pick

My working file. It records decisions, not requirements --- the Assignment 1
brief and spec are published on the course site and stay there. Nothing here
overrides them, and this file is not a second spec.

Source pick:
[MARKDOWN](https://comp4020-agentic-coding-studio.github.io/comp4020-crit2-Astra-Erevos/)
--- an unsolicited redesign of Kmart Australia's clearance pages, voted a
standout at the C2 crits and vendored into this repo whole (see `README.md` for
the attribution).

## What's different about this week

Week 2 built a new artefact from a pick. This week doesn't build anything: the
pick already works, and the demo is about what happens when you point a **new
sensor** at working code. The site is the subject, not the deliverable.

So the arc is: add a sensor, let the agent make the site satisfy it, then look
at the site.

## The sensor

**A brand-compliance check: the palette must be red, white and blue.**

Deliberately a novelty. It has nothing to do with clearance retail, which is the
point --- nobody in the room will confuse "the check went green" with "the site
got better", so the gap between the two stays visible. It is also cheap to
state, fast to run, and unambiguous in its verdict, which is most of what makes
a sensor worth having.

The pick's palette is warm paper and orange-red, with five semantic department
colours (`--dept-entertainment` purple, `--dept-tech` indigo, `--dept-toys`
amber, and so on). Those five are the interesting part: they carry information.
A three-colour rule forces that information onto another channel, and the agent
has to notice that on its own or quietly lose it.

## The point I want it to make

A sensor measures what it measures. This one reads CSS; the room reads the page.
Those can come apart, and I want them to come apart in public:

- the check can go green while the page still doesn't look red, white and blue
  --- a colour that isn't where the sensor looks (a literal in a component, a
  gradient, an SVG fill, a shadow) never gets counted
- the check can go green while the page gets **worse** --- flatten five
  department colours to one and the rule is satisfied and the information is
  gone

Either way, the thing that catches it is a human looking at the dev server on
the projector. That's the beat: the sensor was right and insufficient, and the
fix is not a better sensor. It's a **guide** --- a line in `CLAUDE.md` saying
what "brand" actually means here --- because the failure was one of intent, not
of measurement.

If the agent writes a sensor good enough that no gap appears, that's a fine
outcome too: read out how it did it. A sensor that closes the loophole is worth
more than a slide claiming sensors can't.

## The opener

The only instruction written in advance. Everything after it comes from the
room:

> Our brand guidelines say this site should be red, white and blue. Add a check
> that enforces that, then make the site pass it.

Two clauses on purpose. "Add a check" is the sensor; "make it pass" is the
codegen the sensor then steers. Splitting them into two prompts would lose the
thing worth watching --- the agent writing its own measuring stick and then
being measured by it.

## What I am not building

- no screenshot test, no pixel-diffing, no vitest-plus-PNG rig. The dev server
  on the projector is the visual sensor, and one `agent-browser` look is the
  most the demo needs.
- no second artefact and no new pages. Four pages came in with the pick; four
  pages go out.
- no pre-written sensor. If I write the check beforehand the demo has nothing in
  it: the agent choosing what to measure **is** the lesson.
- no tidying of the vendored code, before or after. It is here because it is
  good.

## Checks I care about

- `pnpm check` is green before the lecture starts, so anything red on the
  projector was caused live
- the invariants stay green throughout --- a repaint that breaks a landmark or
  drops alt text is a real regression, not a stylistic one
- `spec/crit-2.test.ts` came with the pick and stays. It asserts the site still
  serves a real organisation's information; a repaint has no business tripping
  it, and if it does, that's worth stopping on.

## Risks

- **it goes green immediately and nothing is learnt.** Then the check-in
  question becomes "what would this check miss?" and the room writes the next
  instruction against that.
- **it goes red and stays red.** Fine. Red is the material; the repo's
  `CLAUDE.md` already tells the agent to stop and report rather than iterate.
- **the repaint is ugly.** Also fine, and probably funny. The claim on the slide
  is that the sensor is satisfied, not that the site is good.
