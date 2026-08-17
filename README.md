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

The artefact in the tree right now is
[MARKDOWN](https://github.com/comp4020-agentic-coding-studio/comp4020-crit2-Astra-Erevos)
(`00332bd`), an unsolicited redesign of Kmart Australia's clearance pages and
one of this week's hall-of-fame picks. It is here because it is good. Whatever
the lecture does to it is a demonstration of the loop and says nothing about the
work.

## Follow along

Clone the repository in Week 1. Before each later lecture, reset your copy to
the projector's starting state:

```sh
git fetch && git reset --hard origin/main
pnpm install
pnpm dev
```

## Check-ins

Three times a lecture the slides stop and the room takes the demo over: what the
agent has done gets revealed on the projector, and one "yes, and" from the floor
— the premise the room set at the launch, pushed further — is typed in and run.
There is nothing to prepare and no blank to fill in — half a minute with the
person next to you, then call it out.

The run is pushed after the lecture rather than during it, so pulling
mid-session won't track the projector — watch the screen instead. Afterwards, a
pull gets you the whole run commit by commit, and you can hand your own agent
the same instruction from the same starting point and watch it do something
different with it.

Keep anything you want to retain on your own branch or worktree before the next
lecture's reset.

The demo runs the same checks as the student starter: `pnpm check` covers the
typecheck, the build, the linters and the tests. The stack underneath is
whatever the current artefact brought with it — Astro, at the moment, on the
template's tooling.
