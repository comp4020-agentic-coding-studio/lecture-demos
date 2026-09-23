# The spec

Every deliverable's spec — what the markers consider when they judge whether the
work matches what was required — is published on the course website. The brief
poses the problem; the spec is the fixed contract. Read both on the site before
you plan or build.

This repo is not one of those deliverables. It has no repo prefix in the course
API and nothing to resolve a spec from, so the brief and spec it works to are
whichever ones the lecture hands it — often a deliverable the class is about to
start. In your own prototype repo the `start` skill pulls the right one from the
API; here, wait to be told, and don't infer a spec from the repo name.

The checks in this directory come in three kinds:

## Invariants (shipped, always on)

`invariants.test.ts` asserts things that are true of any good web app, however
you build it and whatever the week's brief asks: a navigation landmark, exactly
one top-level heading, a document language, a real title, a mobile viewport, alt
text on images — plus an automated **accessibility floor**: axe-core's rule set,
run on each page's served HTML. They run against the **running** app —
`global-setup.ts` boots the built server (`dist/server/entry.mjs`, the same
artefact production runs) with a throwaway database — so they check what
actually ships. Keep them green; don't delete them.

Two things to know about how they see your app:

- **They only visit the routes in `routes.ts`.** A server-rendered app has no
  `dist/*.html` files to walk, so the covered routes are an explicit list. When
  you add a page, add its route — otherwise the invariants silently stop
  covering it.
- **The axe pass runs without a browser** (in jsdom), which keeps CI fast and
  dependency-light but means rules needing real rendering — colour contrast,
  element overlap — are disabled. It's a floor, not a clean bill of health.

## The README (shipped, always on)

`readme.test.ts` holds one promise of the deployed app: `/readme/` serves the
whole of `README.md`, your account of what the app is and what good looks like
here. It renders the markdown to text and asks whether the served page contains
all of it, so styling and navigation around it pass and a trimmed copy fails.

## The starter's plumbing (shipped, retires with the starter)

`guestbook.test.ts` drives the running app over HTTP to prove the supplied
plumbing works in this repo: a message survives a reload, and a new one reaches
other clients over the SSE stream. A red run on a fresh clone means the platform
is broken, not your work. It describes the starter, so it goes when the starter
does.

## The week's spec tests (written live)

Turning the week's published spec into tests is your work, not the template's.
Some spec lines are mechanically checkable — assert those here, in your own test
file alongside the supplied ones (any `spec/*.test.ts` runs with `pnpm check`).
Some lines only a person can judge; say those out loud instead. Write tests for
the **contracts** — what the page must do, not how you built it — so the tests
survive a change of approach, or of stack.

A green suite here is backpressure, not a verdict. Nothing in this repo is
marked; what it demonstrates is the loop, so a week's tests get deleted with
that week's prototype rather than accumulating. The invariants stay.
