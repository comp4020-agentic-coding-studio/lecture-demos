# lecture-demos

The live demo repo for the COMP4020/COMP8020 Agentic Coding Studio lectures
(Semester 2, 2026, ANU). It begins as a fresh instance of the course's static
prototype template, then is worked in week by week through the semester.

- the demo is pushed at the end of each beat, so `git pull` during a lecture
  puts students on the exact state showing on the projector
- the end of each week is tagged (`week-01` through `week-12`)
- the history is never cleaned up: it is the honest record of what the agent
  and convenor actually did

## Follow along

Clone the repository in Week 1. Before each later lecture, reset your copy to
the projector's starting state:

```sh
git fetch && git reset --hard origin/main
pnpm install
pnpm dev
```

## The two pauses

Every lecture stops twice for a five-minute “now you try” pause. Immediately
before each pause, the convenor pushes the current demo state and a root-level
`PAUSE.md`. Pull it, paste its prompt into your own agent, fill in any marked
choice, make a prediction with a neighbour, and run it. Everyone begins with
the same repository state; the different results are what the room discusses
when the demo returns.

`PAUSE.md` always holds the current prompt. It is overwritten for the second
pause, while the earlier prompt remains in the commit history. Keep anything
you want to retain from a pause on your own branch or worktree before the next
lecture's reset.

The demo uses the same Vite static stack and checks as the student starter;
`pnpm check` verifies the local build, linting and tests.
