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

Clone the repository in Week 1, then start each lecture with:

```sh
git fetch && git reset --hard origin/main
pnpm install
pnpm dev
```

Keep anything you want to retain from a “now you try” pause on your own branch.
The demo uses the same Vite static stack and checks as the student starter;
`pnpm check` verifies the local build, linting and tests.
