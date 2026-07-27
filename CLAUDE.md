# lecture-demos

The live demo repository for the COMP4020/COMP8020 lectures. It starts from the
course's static prototype template, then evolves in public during the semester.

## Demo beats

At the end of every demo beat, commit. Then push — but only if you have write
access (the convenor's clone does; student clones do not, so skip the push there
rather than fighting the rejection). The push lets the room's `git pull` land
on the exact state showing on the projector.

## Pause hand-off

Each lecture has two five-minute pauses. Before each one, the projector must
already be at a pushed commit containing the state students need and a
root-level `PAUSE.md`. That file gives one prompt, normally with one clearly
marked slot for the student's own choice. Students pull, paste it into their
own agent, predict what will happen, and run it.

Write the current prompt to `PAUSE.md` before committing the beat that starts a
pause. Overwrite it before the next pause; the prior prompt remains available
in the commit history. Do not create `PAUSE.md` in advance merely as a
placeholder: its content must describe the actual state the just-pushed demo
reached.

At the end of a pause, use the room's results as material for the return beat.
Students keep anything worth retaining on their own branch or worktree, because
the next lecture begins with `git fetch && git reset --hard origin/main`.

Never rewrite or clean up history: the commit log is the honest record of what
actually happened, mistakes included.

## Template contract

Keep the starter's static-site contract intact unless a lecture explicitly
demonstrates changing it: `pnpm build` emits the site to `dist/`, and `pnpm
check` remains the quick local feedback loop. This repository is public, so a
push also runs its GitHub Actions checks and deploys the site to GitHub Pages.
