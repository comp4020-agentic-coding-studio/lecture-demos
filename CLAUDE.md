# lecture-demos

The live demo repository for the COMP4020/COMP8020 lectures. It starts from the
course's static prototype template, then evolves in public during the semester.

## Demo beats

At the end of every demo beat, commit. Then push — but only if you have write
access (the convenor's clone does; student clones do not, so skip the push there
rather than fighting the rejection). The push lets the room's `git pull` land
on the exact state showing on the projector.

When a beat ends at a pause, also write the pause prompt to `PAUSE.md` at the
repository root (overwriting the previous one) before committing, so it travels
with the push.

Never rewrite or clean up history: the commit log is the honest record of what
actually happened, mistakes included.

## Template contract

Keep the starter's static-site contract intact unless a lecture explicitly
demonstrates changing it: `pnpm build` emits the site to `dist/`, and `pnpm
check` remains the quick local feedback loop. This repository is public, so a
push also runs its GitHub Actions checks and deploys the site to GitHub Pages.
