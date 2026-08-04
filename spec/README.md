# The spec

Every deliverable's spec — what the markers consider when they judge whether the
work matches what was required — is published on the course website. The brief
poses the problem; the spec is the fixed contract. Read both on the site before
you plan or build.

This repo is not one of those deliverables. It has no repo prefix in the course
API and nothing to resolve a spec from, so the brief and spec it works to are
whichever ones the lecture hands it — often a deliverable the room is about to
start. In your own prototype repo the `start` skill pulls the right one from the
API; here, wait to be told, and don't infer a spec from the repo name.

The checks in this directory come in two kinds:

## Invariants (shipped, always on)

`invariants.test.ts` asserts things that are true of any good website, however
you build it and whatever the week's brief asks: a navigation landmark, exactly
one top-level heading, a document language, a real title, a mobile viewport, and
alt text on images. They run against the **built** site (`dist/`), so they check
what actually ships. Keep them green; don't delete them.

## The week's spec tests (written live)

Turning the week's published spec into tests is your work, not the template's.
Some spec lines are mechanically checkable — assert those here, in your own test
file alongside the invariants (any `spec/*.test.ts` runs with `pnpm check`).
Some lines only a person can judge; say those out loud instead. Write tests for
the **contracts** — what the page must do, not how you built it — so the tests
survive a change of approach, or of stack.

A green suite here is backpressure, not a verdict. Nothing in this repo is
marked; what it demonstrates is the loop, so a week's tests get deleted with
that week's prototype rather than accumulating. The invariants stay.
