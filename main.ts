import { type Cell, type Company, TOTAL, completable, reach } from "./dex";

const COLUMNS = 16;

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

const STEP: Record<string, number> = {
  ArrowRight: 1,
  ArrowLeft: -1,
  ArrowDown: COLUMNS,
  ArrowUp: -COLUMNS,
};

cells.forEach((button, i) => {
  const show = () => {
    const cell = reach(company())[i];
    reason.textContent = cell ? label(cell) : "";
  };
  button.addEventListener("focus", show);
  button.addEventListener("pointerenter", show);
  button.addEventListener("keydown", (event: KeyboardEvent) => {
    const step = STEP[event.key];
    if (step === undefined) return;
    event.preventDefault();
    focusCell(i + step);
  });
});

grid.addEventListener("pointerleave", () => {
  reason.textContent = "";
});

for (const control of controls) control.addEventListener("change", paint);

total.textContent = String(TOTAL);
paint();
