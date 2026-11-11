"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useId, useState, type ChangeEvent, type FormEvent } from "react";
import { saveLook } from "@/app/admin/actions";
import { Icon } from "@/components/site/Icon";
import { getBrowserClient } from "@/lib/supabase/browser";
import { IMAGE_BUCKET, IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/supabase/env";
import { CATEGORIES, CATEGORY_LABEL, type Category } from "@/lib/types";
import { helpClass, inputClass, labelClass, primaryButton, secondaryButton } from "./ui";

export interface LookEditorProduct {
  id: string;
  name: string;
  category: Category;
  published: boolean;
}

export interface LookEditorInitial {
  id: string;
  isExisting: boolean;
  name: string;
  modelImagePath: string | null;
  modelImageUrl: string | null;
  isPublished: boolean;
  sortOrder: number;
  productIds: string[];
}

/** Create or edit one "Try the Look" outfit: a model photo plus the products worn in it. */
export function LookEditor({ initial, products }: { initial: LookEditorInitial; products: LookEditorProduct[] }) {
  const router = useRouter();
  const ids = useId();
  const [name, setName] = useState(initial.name);
  const [sortOrder, setSortOrder] = useState(String(initial.sortOrder));
  const [isPublished, setIsPublished] = useState(initial.isPublished);
  const [productIds, setProductIds] = useState<string[]>(initial.productIds);
  const [photo, setPhoto] = useState<{ path: string; url: string } | null>(
    initial.modelImagePath && initial.modelImageUrl
      ? { path: initial.modelImagePath, url: initial.modelImageUrl }
      : null,
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    if (!IMAGE_TYPES.includes(file.type)) return setError("Choose a PNG, WebP, JPEG or AVIF image.");
    if (file.size > MAX_IMAGE_BYTES) return setError("The photo is larger than 8 MB. Export a smaller version.");

    const extension = file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `looks/${initial.id}/${crypto.randomUUID()}.${extension}`;
    setUploading(true);
    const storage = getBrowserClient().storage.from(IMAGE_BUCKET);
    const { error: uploadError } = await storage.upload(path, file, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
    setUploading(false);
    if (uploadError) return setError(`Upload failed: ${uploadError.message}`);
    // A photo uploaded in this visit but replaced before saving is removed again.
    if (photo && photo.path !== initial.modelImagePath) void storage.remove([photo.path]);
    setPhoto({ path, url: URL.createObjectURL(file) });
  }

  function toggle(id: string) {
    setProductIds((current) => (current.includes(id) ? current.filter((p) => p !== id) : [...current, id]));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    if (!name.trim()) return setError("Give the look a name.");
    if (productIds.length === 0) return setError("Choose at least one product for the look.");
    const position = Number(sortOrder);
    if (!Number.isInteger(position) || position < 0) return setError("The position must be a whole number, 0 or more.");

    setSaving(true);
    try {
      const result = await saveLook({
        id: initial.id,
        name,
        modelImagePath: photo?.path ?? null,
        isPublished,
        sortOrder: position,
        productIds,
      });
      setSaving(false);
      if (!result.ok) return setError(result.error ?? "The look could not be saved.");
      setSaved(true);
      router.refresh();
    } catch {
      setSaving(false);
      setError("The look could not be saved. Check your connection and try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {error && (
        <p role="alert" className="flex items-start gap-2 border border-destructive/40 bg-red-50 px-3 py-2 text-sm text-red-900">
          <Icon name="alert" size={18} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="flex items-center gap-2 border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-900">
          <Icon name="check" size={18} />
          Saved.
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-[10rem_minmax(0,1fr)]">
        <div>
          <div className="relative aspect-[140/360] w-full bg-background">
            {photo ? (
              <Image src={photo.url} alt="Model photo" fill sizes="160px" unoptimized className="object-contain object-bottom" />
            ) : (
              <span className="absolute inset-0 grid place-items-center px-2 text-center text-xs text-muted-foreground">
                No model photo. A drawn figure is shown instead.
              </span>
            )}
          </div>
          <input
            id={`${ids}-file`}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            onChange={onFile}
            className="sr-only"
          />
          <label
            htmlFor={`${ids}-file`}
            className={`${secondaryButton} mt-2 w-full cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring`}
          >
            <Icon name="upload" size={16} />
            {uploading ? "Uploading…" : photo ? "Replace photo" : "Upload photo"}
          </label>
          {photo && (
            <button type="button" onClick={() => setPhoto(null)} className="mt-2 min-h-11 w-full text-sm underline underline-offset-4">
              Remove photo
            </button>
          )}
        </div>

        <div className="min-w-0 space-y-5">
          <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_8rem]">
            <div>
              <label htmlFor={`${ids}-name`} className={labelClass}>
                Name <span aria-hidden="true">*</span>
              </label>
              <input
                id={`${ids}-name`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                placeholder="Look 01"
                className={`${inputClass} mt-1`}
              />
            </div>
            <div>
              <label htmlFor={`${ids}-order`} className={labelClass}>
                Position
              </label>
              <input
                id={`${ids}-order`}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className={`${inputClass} tabular mt-1`}
              />
            </div>
          </div>
          <p className={helpClass}>
            Use a full-body cut-out of the model with a transparent background. Lower positions appear first.
          </p>

          <fieldset>
            <legend className={labelClass}>
              Products in this look <span aria-hidden="true">*</span>
            </legend>
            <div className="mt-2 grid gap-4 sm:grid-cols-3">
              {CATEGORIES.map((category) => {
                const options = products.filter((p) => p.category === category);
                return (
                  <div key={category}>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {CATEGORY_LABEL[category]}
                    </p>
                    {options.length === 0 ? (
                      <p className="mt-2 text-sm text-muted-foreground">None yet.</p>
                    ) : (
                      <ul className="mt-1">
                        {options.map((product) => (
                          <li key={product.id}>
                            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={productIds.includes(product.id)}
                                onChange={() => toggle(product.id)}
                                className="size-4 accent-black"
                              />
                              <span>
                                {product.name}
                                {!product.published && <span className="text-muted-foreground"> (draft)</span>}
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
            <p className={helpClass}>Draft products are left out of the look on the shop until they are published.</p>
          </fieldset>

          <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="size-4 accent-black"
            />
            Show this look on the shop
          </label>

          <button type="submit" disabled={saving || uploading} className={primaryButton}>
            {saving ? "Saving…" : initial.isExisting ? "Save look" : "Create look"}
          </button>
        </div>
      </div>
    </form>
  );
}
