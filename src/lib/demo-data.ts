import { slugify } from "./format";
import type { Category, Look, Product, ProductVariant } from "./types";

/*
  Sample catalogue. It is shown only while Supabase is not configured, so the
  shop can be seen and tested before real products are uploaded. None of it is
  written to the database.
*/

const SIZES: Record<Category, string[]> = {
  shirt: ["S", "M", "L", "XL", "XXL"],
  pant: ["28", "30", "32", "34", "36"],
  shoe: ["39", "40", "41", "42", "43", "44", "45"],
};

type Tone = [name: string, hex: string];

interface Seed {
  category: Category;
  name: string;
  cut: string;
  price: number;
  salePrice?: number;
  tones: Tone[];
  description: string;
  isNew?: boolean;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  /** Sizes with no stock, to exercise the out-of-stock states. */
  soldOut?: string[];
  allSoldOut?: boolean;
}

const SEEDS: Seed[] = [
  // Shirts
  {
    category: "shirt",
    name: "Ward 19 Jersey",
    cut: "jersey",
    price: 2450,
    tones: [
      ["Black", "#1b1b1d"],
      ["Bone", "#e9e4d8"],
    ],
    description:
      "Heavyweight mesh jersey with a boxy body, dropped shoulders and a contrast rib neck. Number 19 on the back.",
    isNew: true,
    isFeatured: true,
    isBestSeller: true,
  },
  {
    category: "shirt",
    name: "Sector Tee",
    cut: "tee",
    price: 1450,
    tones: [
      ["Chalk", "#f1efea"],
      ["Black", "#1b1b1d"],
      ["Moss", "#1f6b46"],
    ],
    description:
      "240 gsm combed cotton tee. Wide body, short sleeve that sits just above the elbow, small chest mark.",
    isNew: true,
    isBestSeller: true,
  },
  {
    category: "shirt",
    name: "Night Shift Overshirt",
    cut: "overshirt",
    price: 2950,
    salePrice: 2360,
    tones: [
      ["Navy", "#1f2a44"],
      ["Slate", "#6b7280"],
    ],
    description:
      "Brushed twill overshirt cut to layer over a tee. Single chest pocket, corozo buttons, curved hem.",
    isNew: true,
  },
  {
    category: "shirt",
    name: "Transit Tee",
    cut: "tee",
    price: 1550,
    tones: [
      ["Ash", "#c9c9cb"],
      ["Sand", "#e2cfa8"],
    ],
    description:
      "Garment-dyed tee with a washed hand feel. Relaxed fit, ribbed collar that keeps its shape.",
    isNew: true,
    soldOut: ["S"],
  },
  {
    category: "shirt",
    name: "Grid Oxford",
    cut: "overshirt",
    price: 2650,
    tones: [
      ["White", "#f7f7f5"],
      ["Sky", "#bcd3e6"],
    ],
    description:
      "Crisp oxford shirt with a slightly cropped length and a roomy sleeve. Wear it open or buttoned up.",
    isFeatured: true,
  },
  {
    category: "shirt",
    name: "Depot Jersey",
    cut: "jersey",
    price: 2250,
    tones: [
      ["Forest", "#17603f"],
      ["Black", "#1b1b1d"],
    ],
    description:
      "Football-style jersey in recycled poly. Breathable, quick to dry, cut long in the body.",
    isNew: true,
  },
  {
    category: "shirt",
    name: "Canal Tee",
    cut: "tee",
    price: 1350,
    salePrice: 990,
    tones: [
      ["Butter", "#f1e3a6"],
      ["Chalk", "#f1efea"],
    ],
    description: "Lightweight summer tee in slub cotton. Easy fit, soft drape.",
    soldOut: ["XL", "XXL"],
  },
  {
    category: "shirt",
    name: "Signal Overshirt",
    cut: "overshirt",
    price: 3150,
    tones: [["Black", "#1b1b1d"]],
    description:
      "Structured cotton-nylon overshirt with snap closure. Limited run, not restocked.",
    isNew: true,
    allSoldOut: true,
  },

  // Pants
  {
    category: "pant",
    name: "Loop Baggy Denim",
    cut: "baggy",
    price: 3450,
    tones: [
      ["Mid Wash", "#6f8fb4"],
      ["Black Wash", "#2a2c31"],
    ],
    description:
      "14 oz rigid denim with a full leg and a stacked hem. Sits low on the waist. Five pockets.",
    isNew: true,
    isFeatured: true,
    isBestSeller: true,
  },
  {
    category: "pant",
    name: "Depot Cargo",
    cut: "cargo",
    price: 3250,
    tones: [
      ["Olive", "#5d6142"],
      ["Stone", "#b7ad9b"],
    ],
    description:
      "Ripstop cargo with bellows pockets and an adjustable hem. Roomy through the thigh.",
    isNew: true,
    isBestSeller: true,
  },
  {
    category: "pant",
    name: "Platform Trouser",
    cut: "trouser",
    price: 2950,
    tones: [
      ["Charcoal", "#3a3b3f"],
      ["Taupe", "#8c7f70"],
    ],
    description:
      "Pleated wide trouser in a wool-touch blend. Pressed crease, side adjusters, clean front.",
    isFeatured: true,
  },
  {
    category: "pant",
    name: "Canal Wide Chino",
    cut: "trouser",
    price: 2450,
    salePrice: 1960,
    tones: [
      ["Khaki", "#c8b48a"],
      ["Navy", "#1f2a44"],
    ],
    description: "Washed cotton chino with a wide straight leg and a soft waistband.",
    soldOut: ["28"],
  },
  {
    category: "pant",
    name: "Signal Track Pant",
    cut: "baggy",
    price: 2250,
    tones: [
      ["Black", "#1b1b1d"],
      ["Grey Marl", "#a7a9ac"],
    ],
    description:
      "Loopback jersey track pant, open hem, zip pockets. Cut baggy to match the tees.",
    isNew: true,
  },
  {
    category: "pant",
    name: "Overpass Carpenter",
    cut: "cargo",
    price: 3650,
    tones: [["Ecru", "#e4dcc8"]],
    description:
      "Double-knee carpenter pant in heavy canvas with a hammer loop and tool pocket.",
  },

  // Shoes
  {
    category: "shoe",
    name: "Runner 19",
    cut: "runner",
    price: 6450,
    tones: [
      ["Black / White", "#1b1b1d"],
      ["Cement", "#b9b7b1"],
    ],
    description:
      "Layered mesh runner on a chunky foam sole. Padded collar, reflective heel tab.",
    isNew: true,
    isFeatured: true,
    isBestSeller: true,
  },
  {
    category: "shoe",
    name: "Kerb Low",
    cut: "low",
    price: 4950,
    tones: [
      ["White", "#f4f4f2"],
      ["Black", "#1b1b1d"],
    ],
    description:
      "Leather court shoe with a cupsole and a flat profile. Goes with everything in the shop.",
    isBestSeller: true,
  },
  {
    category: "shoe",
    name: "Overpass High",
    cut: "high",
    price: 7450,
    tones: [
      ["Royal", "#2743b5"],
      ["Black", "#1b1b1d"],
    ],
    description:
      "High-top with ankle padding and a perforated toe box. Built on a vulcanised sole.",
    isNew: true,
  },
  {
    category: "shoe",
    name: "Tram Court",
    cut: "low",
    price: 5250,
    salePrice: 4200,
    tones: [
      ["Fire", "#c8352b"],
      ["White", "#f4f4f2"],
    ],
    description: "Retro tennis silhouette in suede with a gum sole.",
    soldOut: ["39", "45"],
  },
  {
    category: "shoe",
    name: "Relay Mid",
    cut: "high",
    price: 6950,
    tones: [
      ["Cement", "#b9b7b1"],
      ["Forest", "#17603f"],
    ],
    description:
      "Mid-cut basketball shape with a moulded heel clip and a wide stable base.",
    isNew: true,
    isFeatured: true,
  },
  {
    category: "shoe",
    name: "Night Bus Runner",
    cut: "runner",
    price: 5950,
    tones: [
      ["Navy", "#1f2a44"],
      ["Sand", "#d8c7a3"],
    ],
    description: "Low-profile trainer with a ripstop upper and a quick-pull lace.",
  },
  {
    category: "shoe",
    name: "Ferry Low",
    cut: "low",
    price: 4650,
    tones: [["Bone", "#e9e4d8"]],
    description: "Canvas low-top, unlined and light. A warm-weather pair.",
    isNew: true,
  },
];

function buildVariants(seed: Seed, index: number): ProductVariant[] {
  const variants: ProductVariant[] = [];
  seed.tones.forEach(([color, colorHex], toneIndex) => {
    SIZES[seed.category].forEach((size, sizeIndex) => {
      // Deterministic stock so server and client render the same numbers.
      const base = ((index * 7 + toneIndex * 5 + sizeIndex * 3) % 9) + 2;
      const soldOut = seed.allSoldOut || (toneIndex === 0 && seed.soldOut?.includes(size));
      variants.push({
        id: `demo-${slugify(seed.name)}-${slugify(color)}-${size}`.toLowerCase(),
        size,
        color,
        colorHex,
        stock: soldOut ? 0 : base,
      });
    });
  });
  return variants;
}

export const DEMO_PRODUCTS: Product[] = SEEDS.map((seed, index) => ({
  id: `demo-${slugify(seed.name)}`,
  slug: slugify(seed.name),
  name: seed.name,
  category: seed.category,
  description: seed.description,
  price: seed.price,
  salePrice: seed.salePrice ?? null,
  isFeatured: seed.isFeatured ?? false,
  isNew: seed.isNew ?? false,
  isBestSeller: seed.isBestSeller ?? false,
  cut: seed.cut,
  images: [],
  variants: buildVariants(seed, index),
  // Spread across recent days so "Newest" sorting has something to sort.
  createdAt: new Date(Date.UTC(2026, 10, 10 - index)).toISOString(),
}));

const bySlug = (slug: string): Product => {
  const product = DEMO_PRODUCTS.find((p) => p.slug === slug);
  if (!product) throw new Error(`Demo look refers to a missing product: ${slug}`);
  return product;
};

export const DEMO_LOOKS: Look[] = [
  {
    id: "demo-look-1",
    name: "Look 01",
    modelImageUrl: null,
    items: [bySlug("ward-19-jersey"), bySlug("loop-baggy-denim"), bySlug("runner-19")],
  },
  {
    id: "demo-look-2",
    name: "Look 02",
    modelImageUrl: null,
    items: [bySlug("sector-tee"), bySlug("depot-cargo"), bySlug("kerb-low")],
  },
  {
    id: "demo-look-3",
    name: "Look 03",
    modelImageUrl: null,
    items: [
      bySlug("night-shift-overshirt"),
      bySlug("platform-trouser"),
      bySlug("overpass-high"),
    ],
  },
  {
    id: "demo-look-4",
    name: "Look 04",
    modelImageUrl: null,
    items: [bySlug("transit-tee"), bySlug("signal-track-pant"), bySlug("relay-mid")],
  },
  {
    id: "demo-look-5",
    name: "Look 05",
    modelImageUrl: null,
    items: [bySlug("depot-jersey"), bySlug("canal-wide-chino"), bySlug("tram-court")],
  },
];
