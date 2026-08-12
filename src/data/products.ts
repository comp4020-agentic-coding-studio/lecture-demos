// Grounded sample: 11 of 12 user-provided official Kmart Australia Clearance
// product URLs, confirmed by direct browser screenshot (both originalPrice
// and clearancePrice from the same official page). Source: notes/sources.md
// §9, full per-item detail in notes/product-sample.md. Item 12 (DIY Sparkle
// Gem Art Trinket Tray – Egg) is excluded: no screenshot evidence exists for
// it, so it is left out rather than invented.
//
// Only raw source values are stored here. savingAmount and
// discountPercentage are never hand-entered — see src/lib/deals.ts.

import { toDeal, type Deal } from "../lib/deals";

export interface Product {
  id: string;
  sku: string;
  name: string;
  /** Breadcrumb as observed, or null when the screenshot didn't record one. */
  category: string | null;
  originalPrice: number;
  clearancePrice: number;
  officialUrl: string;
}

export const products: Product[] = [
  {
    id: "43554461",
    sku: "P_43554461",
    name: "Pet Rashie – Medium, Blue",
    category: null,
    originalPrice: 10.0,
    clearancePrice: 1.0,
    officialUrl: "https://www.kmart.com.au/product/pet-rashie-medium-blue-43554461/",
  },
  {
    id: "43624515",
    sku: "P_43624515",
    name: "Air Fryer and Pizza Maker",
    category: "Home & Living > Appliances > Kitchen Appliances > Air Fryers",
    originalPrice: 109.0,
    clearancePrice: 65.0,
    officialUrl: "https://www.kmart.com.au/product/air-fryer-and-pizza-maker-43624515/",
  },
  {
    id: "43632220",
    sku: "P_43632220",
    name: "Desktop Mug Warmer – Lilac",
    category: "Home & Living > Appliances > Kitchen Appliances > Coffee Machines & Makers",
    originalPrice: 12.0,
    clearancePrice: 6.0,
    officialUrl: "https://www.kmart.com.au/product/desktop-mug-warmer-lilac-43632220/",
  },
  {
    id: "43593330",
    sku: "P_43593330",
    name: "Digital Video Recorder – White",
    category: "Tech & Gaming > Cameras & Accessories > Cameras & Video Recorders",
    originalPrice: 35.0,
    clearancePrice: 15.0,
    officialUrl: "https://www.kmart.com.au/product/digital-video-recorder-white-43593330/",
  },
  {
    id: "43649990",
    sku: "P_43649990",
    name: "LED Rocket Lamp",
    category: "Home & Living > Home Decor > Lighting > LED Lights & Neon Lights",
    originalPrice: 9.0,
    clearancePrice: 3.0,
    officialUrl: "https://www.kmart.com.au/product/led-rocket-lamp-43649990/",
  },
  {
    id: "43550388",
    sku: "P_43550388",
    name: "Neon Arcade Dance Machine",
    category: "Toys > Toys by Category > Preschool & Toddler > Learning & Puzzles > Music & Learning",
    originalPrice: 39.0,
    clearancePrice: 10.0,
    officialUrl: "https://www.kmart.com.au/product/neon-arcade-dance-machine-43550388/",
  },
  {
    id: "43542628",
    sku: "P_43542628",
    name: "Mini Blocks Animal Series – Assorted",
    category: "Toys > Toys by Category > Blocks & Construction > Mini Blocks",
    originalPrice: 15.0,
    clearancePrice: 5.0,
    officialUrl: "https://www.kmart.com.au/product/mini-blocks-animal-series-assorted-43542628/",
  },
  {
    id: "43660476",
    sku: "P_43660476",
    name: "3D Plaster Painting Kit – Tulip",
    category: "Entertainment > Art & Craft > Craft Supplies > Craft Kits",
    originalPrice: 10.0,
    clearancePrice: 3.0,
    officialUrl: "https://www.kmart.com.au/product/3d-plaster-painting-kit-tulip-43660476/",
  },
  {
    id: "43629725",
    sku: "P_43629725",
    name: "Bamboo Section Serve Board",
    category: "Home & Living > Dining > Serveware > Grazing Boards",
    originalPrice: 29.0,
    clearancePrice: 5.0,
    officialUrl: "https://www.kmart.com.au/product/bamboo-section-serve-board-43629725/",
  },
  {
    id: "43636709",
    sku: "P_43636709",
    name: "Mediterranean Pomodoro Tomato Stripe Candle",
    category: "Home & Living > Home Decor > Candles & Home Fragrance",
    originalPrice: 13.0,
    clearancePrice: 2.0,
    officialUrl: "https://www.kmart.com.au/product/mediterranean-pomodoro-tomato-stripe-candle-43636709/",
  },
  {
    id: "43666515",
    sku: "P_43666515",
    name: "Pretzel Ceramic Pen Cup",
    category: "Home & Living > Home Office & Stationery > Desk Organisation & Accessories > Pen Cups",
    originalPrice: 5.0,
    clearancePrice: 0.5,
    officialUrl: "https://www.kmart.com.au/product/pretzel-ceramic-pen-cup-43666515/",
  },
];

/** products, with savingAmount/discountPercentage computed — never stored. */
export const dealProducts: Deal[] = products.map((product, index) => toDeal(product, index));

export function getDeal(id: string): Deal {
  const deal = dealProducts.find((d) => d.id === id);
  if (!deal) throw new Error(`Unknown grounded product id: ${id}`);
  return deal;
}

export type { Deal };

