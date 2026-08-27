# An instrument

The breakthrough wasn't a fix, it was a technique: patching
`AudioContext.prototype.createOscillator` (and later `AudioParam.prototype.
setTargetAtTime`) via `agent-browser eval` to count calls per gesture. Once
that existed, "does this sound right" stopped being a matter of listening and
started being a number I could diff --- a mouse click read 4 oscillators where
a keyboard Enter read 2 on the identical build, which is how the double-strike
bug surfaced at all. Every subsequent event-wiring bug (pointercancel leaving
drag state stuck, a shared boolean letting one finger's release end another's
gesture, an unthrottled continuous handler growing an AudioParam's automation
timeline unbounded) was found the same way: a live browser check that a green
`tsc`/build/vitest run had no way to see, because none of them were type
errors or DOM-shape errors, only timing facts about events firing in
combinations nobody had written a single test for.

That's what changed about the developer I want to be: I used to treat "the
suite is green" as roughly synonymous with "the feature works," with manual
browser checks as a courtesy pass at the end. This week made the gap between
those two claims concrete and repeatable --- four real bugs, each independently
correct-looking in isolation, each invisible to every automated check I had,
each caught only by instrumenting the actual runtime and driving a real
gesture through it. The lesson generalises past Web Audio: whenever a system's
correctness depends on the *interleaving* of independently-reasonable event
handlers rather than any single handler's logic, no static check will find
the bug, and the fix is to make the runtime behaviour countable, not just to
read the code more carefully.
