import Image from "next/image";
import { PlaceholderArt } from "@/components/art/PlaceholderArt";
import { backImage, primaryImage, type Category, type Product } from "@/lib/types";

export const ASPECT: Record<Category, string> = {
  shirt: "12 / 13",
  pant: "2 / 3",
  shoe: "30 / 17",
};

type VisualProduct = Pick<Product, "name" | "category" | "cut" | "images" | "variants">;

interface Props {
  product: VisualProduct;
  /** Tint for the placeholder. Defaults to the product's first colour. */
  colorHex?: string;
  view?: "front" | "back";
  className?: string;
  /** `sizes` hint for next/image. */
  sizes?: string;
  priority?: boolean;
  /** Set false when the product name is already visible beside the picture. */
  labelled?: boolean;
}

/**
 * One product picture. Shows the uploaded photo when there is one, and the
 * drawn placeholder when there is not. The box keeps a fixed aspect ratio per
 * category so nothing shifts while photos load.
 */
export function ProductVisual({
  product,
  colorHex,
  view = "front",
  className = "",
  sizes = "(min-width: 1024px) 25vw, 50vw",
  priority,
  labelled = true,
}: Props) {
  // A product with photos but no back shot shows its main photo on both sides.
  const photo =
    view === "back" ? (backImage(product) ?? primaryImage(product)) : primaryImage(product);
  const alt = labelled ? `${product.name}${view === "back" ? ", back" : ""}` : "";

  return (
    <div
      className={`relative ${className}`}
      style={{ aspectRatio: ASPECT[product.category] }}
    >
      {photo ? (
        <Image
          src={photo.url}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-contain"
        />
      ) : (
        <PlaceholderArt
          category={product.category}
          cut={product.cut}
          color={colorHex ?? product.variants[0]?.colorHex ?? "#a8a29e"}
          back={view === "back"}
          label={alt}
          className="absolute inset-0 h-full w-full"
        />
      )}
    </div>
  );
}
