import { type Cell, type Company, TOTAL, completable, reach } from "./dex";

// Resolve the scaffolding to non-nullable types at the point of lookup. A
// `querySelector` + guard pair proves the element exists at runtime, but the
// proof doesn't follow the binding into a function body, so every later use
// re-litigates the null. Throwing here means it never enters the type at all.
function need<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`page scaffolding missing: ${selector}`);
  return element;
}

const grid = need<HTMLDivElement>("#grid");
const count = need<HTMLOutputElement>("#count");
const reason = need<HTMLParagraphElement>("#reason");
const total = need<HTMLSpanElement>("#total");
const controls = document.querySelectorAll<HTMLInputElement>(
  'input[name="company"]',
);

function company(): Company {
  for (const control of controls) {
    if (control.checked) return control.value as Company;
  }
  return "alone";
}

// The reason line reserves its height either way, so it holds a standing prompt
// when nothing is picked: otherwise the reservation reads as a broken gap, and
// on touch — where there is no hover to stumble into — nothing would suggest the
// squares do anything at all.
const HINT = "Pick a square to see why.";

function hint(): void {
  reason.textContent = HINT;
  reason.dataset.hint = "true";
}

function label(cell: Cell): string {
  const { no, name } = cell.entry;
  return cell.reason
    ? `${name}, number ${no} — ${cell.reason}`
    : `${name}, number ${no} — you can get this one`;
}

// One tab stop for the whole grid: the arrow keys move within it. 151 separate
// tab stops would technically be reachable and practically be a wall.
const cells = reach("alone").map((cell, i) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "cell";
  button.tabIndex = i === 0 ? 0 : -1;
  button.textContent = String(cell.entry.no);
  grid.append(button);
  return button;
});

function paint(): void {
  const current = reach(company());
  current.forEach((cell, i) => {
    const button = cells[i];
    if (!button) return;
    button.dataset.obtainable = String(cell.obtainable);
    button.setAttribute("aria-label", label(cell));
  });
  count.textContent = String(completable(company()));
}

function focusCell(i: number): void {
  const next = cells[Math.max(0, Math.min(cells.length - 1, i))];
  if (!next) return;
  for (const button of cells) button.tabIndex = -1;
  next.tabIndex = 0;
  next.focus();
}

// The grid's width decides its column count, so ask the layout rather than
// keeping a constant in step with the stylesheet. Read per keypress, so a
// resize mid-interaction can't leave the arrow keys jumping the wrong distance.
function columns(): number {
  const tracks = getComputedStyle(grid).gridTemplateColumns;
  return Math.max(1, tracks.split(/\s+/).filter(Boolean).length);
}

function step(key: string): number | null {
  switch (key) {
    case "ArrowRight":
      return 1;
    case "ArrowLeft":
      return -1;
    case "ArrowDown":
      return columns();
    case "ArrowUp":
      return -columns();
    default:
      return null;
  }
}

cells.forEach((button, i) => {
  const show = () => {
    const cell = reach(company())[i];
    if (!cell) return;
    reason.textContent = label(cell);
    delete reason.dataset.hint;
  };
  button.addEventListener("focus", show);
  button.addEventListener("pointerenter", show);
  button.addEventListener("keydown", (event: KeyboardEvent) => {
    const distance = step(event.key);
    if (distance === null) return;
    event.preventDefault();
    focusCell(i + distance);
  });
});

grid.addEventListener("pointerleave", (event: PointerEvent) => {
  // Touch fires pointerleave the moment the finger lifts, which would wipe the
  // line the tap just filled. Only a real mouse leaving should clear it, and
  // not while the keyboard is parked on a cell.
  if (event.pointerType !== "mouse") return;
  if (grid.contains(document.activeElement)) return;
  hint();
});

for (const control of controls) control.addEventListener("change", paint);

total.textContent = String(TOTAL);
hint();
paint();
