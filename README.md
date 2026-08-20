# lecture-demos

The live demo repo for the COMP4020/COMP8020 Agentic Coding Studio lectures
(Semester 2, 2026, ANU). It begins as a fresh instance of the course's static
prototype template, then is worked in week by week through the semester.

- the demo is committed beat by beat during the lecture and pushed afterwards,
  so the history lands as it happened rather than tidied up
- the end of each week is tagged (`week-01` through `week-12`)
- the history is never cleaned up: it is the honest record of what the agent and
  convenor actually did

## Two layers, two clocks

The **artefact** — the site under `src/`, and whatever tests came with it — is
replaced most weeks, and from Week 3 on it is usually vendored rather than
written here: a hall-of-fame prototype from the previous crit, copied in whole
from its public repo, so a lecture starts from something that already works
instead of from a blank page. The **harness** — `CLAUDE.md`, the invariants in
`spec/`, the CI workflow and the build tooling — accumulates all semester.

This week's artefact is **Photon Count**, an interactive explainer about how a
camera turns light into a photograph. It was not vendored: it was built here,
live, as a mash-up of two hall-of-fame picks from the Assignment 1 crit, on the
class's call.

- the **subject** — explaining camera exposure, and the trade-off framing of the
  exposure triangle — comes from
  [Exposure Lab](https://comp4020-agentic-coding-studio.github.io/comp4020-ass1-zdy-forever/)
- the **mechanic** — a real-time simulation of many independent agents, with
  live readouts, scene presets, direct painting on the canvas, staged
  experiments, a disclosed method and an honest list of what the model leaves
  out — comes from the ant-colony explainer at
  [comp4020-ass1-1181278174](https://comp4020-agentic-coding-studio.github.io/comp4020-ass1-1181278174/)

No code was copied from either. Both were read as visitors read them, and what
was borrowed was an idea in each case. The joining move is that a photograph is
itself an emergent thing: no photon knows the picture, and the picture arrives
anyway — so the second prototype's mechanic turns out to be the honest way to
explain the first one's subject.

The sensor models a colour filter array, because that is the honest way to add
colour and because it earns its keep twice: it shows that colour costs about
three quarters of a stop (each cell counts one band in three, and the
filters-off toggle makes the difference visible rather than asserted), and it
turns shot noise into the blotchy chroma speckle that Exposure Lab claims and
cannot demonstrate. White balance comes with it, and behaves like ISO — gain at
readout, amplifying the noise along with the signal.

Underneath it, the repo still sits on the course's static prototype starter,
refreshed from
[template-static](https://github.com/comp4020-agentic-coding-studio/template-static)
(`b43d91c`): Vite over hand-written HTML, CSS and TypeScript.

## Follow along

Clone the repository in Week 1. Before each later lecture, reset your copy to
the projector's starting state:

```sh
git fetch && git reset --hard origin/main
pnpm install
pnpm dev
```

## Check-ins

Three times a lecture the slides stop and you take the demo over: what the agent
has done gets revealed on the projector, and one "yes, and" from you — the
premise set at the launch, pushed further — is typed in and run. There is
nothing to prepare and no blank to fill in — half a minute with the person next
to you, then call it out.

The run is pushed after the lecture rather than during it, so pulling
mid-session won't track the projector — watch the screen instead. Afterwards, a
pull gets you the whole run commit by commit, and you can hand your own agent
the same instruction from the same starting point and watch it do something
different with it.

Keep anything you want to retain on your own branch or worktree before the next
lecture's reset.

The demo runs the same checks as the student starter: `pnpm check` covers the
typecheck, the build and the tests. The stack underneath is whatever the current
artefact brought with it — at the baseline, that is the starter's own: Vite over
hand-written HTML, CSS and TypeScript.

`spec/exposure.test.ts` holds this week's spec tests. They check the claims the
page makes out loud: that neither ISO nor white balance appears anywhere in the
emission loop, that grain goes as one over the square root of the photon count,
that each dial buys light at its own price, that the colour filters throw away
two photons in three and charge root three in grain for it, and that the page
ships the dials, the method and the limits it says it does.
