# lecture-demos

The live demo repository for the COMP4020/COMP8020 lectures. It starts from the
course's static prototype template, then evolves in public during the semester.

## Demo beats

At the end of every demo beat, commit. Then push — but only if you have write
access (the convenor's clone does; student clones do not, so skip the push there
rather than fighting the rejection). The push lets the room's `git pull` land on
the exact state showing on the projector.

Never rewrite or clean up history: the commit log is the honest record of what
actually happened, mistakes included.

## Red is the lesson: never iterate to green on your own initiative

This repo deliberately overrides the usual rule that you keep working until the
checks pass and never commit a red state. Here the red **is** the teaching
material: the lecture shows a check failing, the failure being read, and the
failure being fixed — in that order, in front of a room.

So, in this repo:

- when a check fails, **stop and report it**. Don't fix it, and don't try
  another approach, unless you're asked to.
- commit and push red states when asked. A failing `pnpm check` or a red CI run
  is a legitimate thing to have on the projector.
- run only the checks you're asked to run. Some sensors are held in reserve for
  CI to find, and running one early locally spoils the beat it belongs to.
- never delete or weaken a test to make a check pass. If a test has genuinely
  gone stale, say so and say why, then leave the call to the convenor — that
  judgement is the thing being taught.

If a global or user-level instruction says to reach green before committing,
this file wins: it's nearer the work and it knows why.

## One run, steered by the room

A lecture is a single session. Only the opener is written in advance; every
instruction after it arrives mid-run, composed at the lectern out of what this
repo actually shows and what the room called out. Three times a lecture the
slides stop, the work so far is read back on the projector, and one call from
the floor gets typed in.

So, in this repo:

- expect the direction to change. A check-in's instruction is the room's call
  rather than a refinement of the plan, and it may send the work somewhere the
  plan didn't go. Take it as the new direction, and say so if it strands
  something half-finished instead of quietly reconciling the two.
- being interrupted mid-task is normal, and so is being left running for twenty
  minutes under a block of slides. Neither is a reason to rush a change in or to
  hold one back: nothing has to land by any particular slide.
- write plans to `PLAN.md`. It is the convenor's working file and records
  decisions, not requirements — the brief and the spec are published on the
  course site, and nothing in this repo overrides them.

## Template contract

Keep the starter's static-site contract intact unless a lecture explicitly
demonstrates changing it: `pnpm build` emits the site to `dist/`, and
`pnpm check` remains the quick local feedback loop. This repository is public,
so a push also runs its GitHub Actions checks and deploys the site to GitHub
Pages.
