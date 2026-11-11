import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { PageHeader, secondaryButton } from "@/components/admin/ui";
import { Icon } from "@/components/site/Icon";
import { getAdminProduct } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { colorsOf, sizesOf } from "@/lib/types";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage(props: PageProps<"/admin/products/[id]">) {
  await requireAdmin();
  const { id } = await props.params;
  const product = await getAdminProduct(id);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description="Change details, prices, stock or photos. Changes reach the shop when you save."
        action={
          product.status === "published" ? (
            <Link href={`/product/${product.slug}`} className={secondaryButton}>
              View on shop
              <Icon name="arrowUpRight" size={14} />
            </Link>
          ) : undefined
        }
      />
      <ProductForm
        initial={{
          id: product.id,
          isExisting: true,
          name: product.name,
          category: product.category,
          description: product.description,
          price: product.price,
          salePrice: product.salePrice,
          status: product.status,
          isFeatured: product.isFeatured,
          isNew: product.isNew,
          cut: product.cut,
          sizes: sizesOf(product),
          colors: colorsOf(product),
          stock: Object.fromEntries(product.variants.map((v) => [`${v.size}|${v.color}`, v.stock])),
          images: product.images.map((image) => ({
            id: image.id,
            storagePath: product.imagePaths[image.id],
            url: image.url,
            role: image.role,
            isPrimary: image.isPrimary,
          })),
        }}
      />
    </div>
  );
}
