# lecture-demos

The live demo repo for the COMP4020/COMP8020 Agentic Coding Studio lectures
(Semester 2, 2026, ANU). It begins as a fresh instance of the course's static
prototype template, then is worked in week by week through the semester.

- the demo is pushed at the end of each beat, so `git pull` during a lecture
  puts students on the exact state showing on the projector
- the end of each week is tagged (`week-01` through `week-12`)
- the history is never cleaned up: it is the honest record of what the agent and
  convenor actually did

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
agent has done gets read back on the projector, and one call from the floor is
typed in and run. There is nothing to prepare and no blank to fill in — half a
minute with the person next to you, then call it out.

Following along pays off here. A `git pull` at a check-in puts you on the state
showing on the projector, so you can give your own agent the same instruction
from the same starting point and watch it do something different with it.

Keep anything you want to retain on your own branch or worktree before the next
lecture's reset.

The demo uses the same Vite static stack and checks as the student starter;
`pnpm check` verifies the local build, linting and tests.
