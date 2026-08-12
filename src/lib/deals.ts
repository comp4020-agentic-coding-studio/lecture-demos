import type { Product } from "../data/products";

// Computed fields are derived here, never hand-entered against the data
// model — see notes/content-brief.md "Product information model".
export interface Deal extends Product {
  savingAmount: number;
  discountPercentage: number;
  department: string;
  /** Position in the original, ungrounded sample order (for "Featured"). */
  sourceOrder: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function departmentOf(category: string | null): string {
  if (!category) return "Other";
  return category.split(">")[0]?.trim() ?? "Other";
}

const DEPARTMENT_SLUGS: Record<string, string> = {
  "Home & Living": "home",
  "Tech & Gaming": "tech",
  Toys: "toys",
  Entertainment: "entertainment",
  Other: "other",
};

export function departmentSlug(department: string): string {
  return DEPARTMENT_SLUGS[department] ?? "other";
}

export function toDeal(product: Product, sourceOrder: number): Deal {
  const savingAmount = round2(product.originalPrice - product.clearancePrice);
  const discountPercentage = (savingAmount / product.originalPrice) * 100;
  return {
    ...product,
    savingAmount,
    discountPercentage,
    department: departmentOf(product.category),
    sourceOrder,
  };
}

export const SORT_MODES = [
  "featured",
  "price-asc",
  "price-desc",
  "discount-desc",
  "saving-desc",
] as const;

export type SortMode = (typeof SORT_MODES)[number];

export const SORT_LABELS: Record<SortMode, string> = {
  featured: "Featured",
  "price-asc": "Price: Low to high",
  "price-desc": "Price: High to low",
  "discount-desc": "Biggest discount",
  "saving-desc": "Biggest saving",
};

/** Minimal shape the client script can reconstruct from DOM data-* attributes. */
export interface SortableDeal {
  clearancePrice: number;
  discountPercentage: number;
  savingAmount: number;
  sourceOrder: number;
  name: string;
}

export function compareBy(mode: SortMode): (a: SortableDeal, b: SortableDeal) => number {
  switch (mode) {
    case "price-asc":
      return (a, b) => a.clearancePrice - b.clearancePrice || a.sourceOrder - b.sourceOrder;
    case "price-desc":
      return (a, b) => b.clearancePrice - a.clearancePrice || a.sourceOrder - b.sourceOrder;
    case "discount-desc":
      return (a, b) =>
        b.discountPercentage - a.discountPercentage ||
        b.savingAmount - a.savingAmount ||
        a.sourceOrder - b.sourceOrder;
    case "saving-desc":
      return (a, b) =>
        b.savingAmount - a.savingAmount ||
        b.discountPercentage - a.discountPercentage ||
        a.sourceOrder - b.sourceOrder;
    case "featured":
    default:
      return (a, b) => a.sourceOrder - b.sourceOrder;
  }
}
