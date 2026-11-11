export type Category = "shirt" | "pant" | "shoe";

export const CATEGORIES: Category[] = ["shirt", "pant", "shoe"];

export const CATEGORY_LABEL: Record<Category, string> = {
  shirt: "Shirts",
  pant: "Pants",
  shoe: "Shoes",
};

export const CATEGORY_PATH: Record<Category, string> = {
  shirt: "/shirts",
  pant: "/pants",
  shoe: "/shoes",
};

export type ImageRole = "front" | "back" | "gallery";

export interface ProductImage {
  id: string;
  url: string;
  role: ImageRole;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductVariant {
  id: string;
  size: string;
  color: string;
  colorHex: string;
  stock: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: Category;
  description: string;
  /** Prices are whole Bangladeshi taka. */
  price: number;
  salePrice: number | null;
  isFeatured: boolean;
  isNew: boolean;
  isBestSeller: boolean;
  /** Shape used for the drawn placeholder while a product has no photos. */
  cut: string;
  images: ProductImage[];
  variants: ProductVariant[];
  createdAt: string;
}

export interface Look {
  id: string;
  name: string;
  /** Full-body cut-out of the model. Null shows a drawn placeholder. */
  modelImageUrl: string | null;
  items: Product[];
}

export interface ProductColor {
  name: string;
  hex: string;
}

export function effectivePrice(p: Pick<Product, "price" | "salePrice">): number {
  return p.salePrice != null && p.salePrice < p.price ? p.salePrice : p.price;
}

export function isOnSale(p: Pick<Product, "price" | "salePrice">): boolean {
  return p.salePrice != null && p.salePrice < p.price;
}

export function totalStock(p: Pick<Product, "variants">): number {
  return p.variants.reduce((sum, v) => sum + Math.max(0, v.stock), 0);
}

export function colorsOf(p: Pick<Product, "variants">): ProductColor[] {
  const seen = new Map<string, ProductColor>();
  for (const v of p.variants) {
    if (!seen.has(v.color)) seen.set(v.color, { name: v.color, hex: v.colorHex });
  }
  return [...seen.values()];
}

export function sizesOf(p: Pick<Product, "variants">): string[] {
  const seen: string[] = [];
  for (const v of p.variants) if (!seen.includes(v.size)) seen.push(v.size);
  return seen;
}

export function primaryImage(p: Pick<Product, "images">): ProductImage | null {
  if (p.images.length === 0) return null;
  return (
    p.images.find((i) => i.isPrimary) ??
    p.images.find((i) => i.role === "front") ??
    [...p.images].sort((a, b) => a.sortOrder - b.sortOrder)[0]
  );
}

export function backImage(p: Pick<Product, "images">): ProductImage | null {
  return p.images.find((i) => i.role === "back") ?? null;
}
