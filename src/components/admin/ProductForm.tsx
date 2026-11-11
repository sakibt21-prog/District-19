"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { saveProduct, type ProductInput } from "@/app/admin/actions";
import { Icon } from "@/components/site/Icon";
import { getBrowserClient } from "@/lib/supabase/browser";
import { IMAGE_BUCKET, IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/supabase/env";
import { CATEGORIES, CATEGORY_LABEL, type Category, type ImageRole } from "@/lib/types";
import { helpClass, inputClass, labelClass, primaryButton, secondaryButton } from "./ui";

const SIZE_PRESETS: Record<Category, string[]> = {
  shirt: ["S", "M", "L", "XL", "XXL"],
  pant: ["28", "30", "32", "34", "36"],
  shoe: ["39", "40", "41", "42", "43", "44", "45"],
};

const CUTS: Record<Category, { value: string; label: string }[]> = {
  shirt: [
    { value: "tee", label: "T-shirt" },
    { value: "jersey", label: "Jersey" },
    { value: "overshirt", label: "Long-sleeve shirt" },
  ],
  pant: [
    { value: "baggy", label: "Baggy" },
    { value: "cargo", label: "Cargo" },
    { value: "trouser", label: "Trouser" },
  ],
  shoe: [
    { value: "low", label: "Low-top" },
    { value: "high", label: "High-top" },
    { value: "runner", label: "Runner" },
  ],
};

const MAX_PHOTOS = 12;

interface FormColor {
  name: string;
  hex: string;
}

interface FormImage {
  id: string;
  storagePath: string;
  previewUrl: string;
  role: ImageRole;
  isPrimary: boolean;
  /** True for photos that were already saved with the product before this edit. */
  saved: boolean;
  uploading: boolean;
  error?: string;
}

export interface ProductFormInitial {
  id: string;
  isExisting: boolean;
  name: string;
  category: Category;
  description: string;
  price: number | null;
  salePrice: number | null;
  status: "draft" | "published";
  isFeatured: boolean;
  isNew: boolean;
  cut: string;
  sizes: string[];
  colors: FormColor[];
  stock: Record<string, number>;
  images: { id: string; storagePath: string; url: string; role: ImageRole; isPrimary: boolean }[];
}

const stockKey = (size: string, color: string) => `${size}|${color}`;

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="border border-border bg-paper p-5 md:p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      {hint && <p className={helpClass}>{hint}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

export function ProductForm({ initial }: { initial: ProductFormInitial }) {
  const router = useRouter();
  const ids = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const errorBox = useRef<HTMLDivElement>(null);

  const [name, setName] = useState(initial.name);
  const [category, setCategory] = useState<Category>(initial.category);
  const [description, setDescription] = useState(initial.description);
  const [price, setPrice] = useState(initial.price?.toString() ?? "");
  const [salePrice, setSalePrice] = useState(initial.salePrice?.toString() ?? "");
  const [status, setStatus] = useState(initial.status);
  const [isFeatured, setIsFeatured] = useState(initial.isFeatured);
  const [isNew, setIsNew] = useState(initial.isNew);
  const [cut, setCut] = useState(initial.cut);
  const [sizes, setSizes] = useState<string[]>(initial.sizes);
  const [customSize, setCustomSize] = useState("");
  const [colors, setColors] = useState<FormColor[]>(initial.colors);
  const [stock, setStock] = useState<Record<string, number>>(initial.stock);
  const [images, setImages] = useState<FormImage[]>(
    initial.images.map((image) => ({
      id: image.id,
      storagePath: image.storagePath,
      previewUrl: image.url,
      role: image.role,
      isPrimary: image.isPrimary,
      saved: true,
      uploading: false,
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Bumped whenever the error message should take focus; the effect runs once it is on screen.
  const [focusTick, setFocusTick] = useState(0);
  useEffect(() => {
    if (focusTick > 0) errorBox.current?.focus();
  }, [focusTick]);

  function fail(message: string) {
    setError(message);
    // Move focus to the message so it is seen and announced.
    setFocusTick((n) => n + 1);
  }

  /* ---------- Category ---------- */

  function changeCategory(next: Category) {
    setCategory(next);
    // A brand-new product follows the category's usual sizes and shape; an existing one keeps its own.
    if (!initial.isExisting) {
      setSizes(SIZE_PRESETS[next]);
      setCut(CUTS[next][0].value);
    } else if (!CUTS[next].some((option) => option.value === cut)) {
      setCut(CUTS[next][0].value);
    }
  }

  /* ---------- Sizes and colours ---------- */

  function toggleSize(size: string) {
    setSizes((current) => (current.includes(size) ? current.filter((s) => s !== size) : [...current, size]));
  }

  function addCustomSize() {
    const size = customSize.trim().toUpperCase();
    if (!size || size.length > 12 || sizes.includes(size)) return;
    setSizes((current) => [...current, size]);
    setCustomSize("");
  }

  function updateColor(index: number, patch: Partial<FormColor>) {
    const before = colors[index].name.trim();
    const after = patch.name?.trim();
    setColors((current) => current.map((color, i) => (i === index ? { ...color, ...patch } : color)));
    // Stock is keyed by colour name, so carry the numbers across a rename.
    if (after !== undefined && after !== before) {
      setStock((existing) => {
        const moved = { ...existing };
        for (const size of sizes) {
          const from = stockKey(size, before);
          if (from in moved) {
            moved[stockKey(size, after)] = moved[from];
            delete moved[from];
          }
        }
        return moved;
      });
    }
  }

  const optionSizes = [...new Set([...SIZE_PRESETS[category], ...sizes])];

  /* ---------- Photos ---------- */

  async function onFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    setError(null);

    const room = MAX_PHOTOS - images.length;
    if (files.length > room) {
      fail(`A product can have up to ${MAX_PHOTOS} photos. There is room for ${Math.max(0, room)} more.`);
    }
    const accepted: { file: File; image: FormImage }[] = [];
    for (const file of files.slice(0, Math.max(0, room))) {
      if (!IMAGE_TYPES.includes(file.type)) {
        fail(`"${file.name}" is not a PNG, WebP, JPEG or AVIF image.`);
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        fail(`"${file.name}" is larger than 8 MB. Export a smaller version and try again.`);
        continue;
      }
      const id = crypto.randomUUID();
      const extension = file.type.split("/")[1].replace("jpeg", "jpg");
      const position = images.length + accepted.length;
      accepted.push({
        file,
        image: {
          id,
          storagePath: `products/${initial.id}/${id}.${extension}`,
          previewUrl: URL.createObjectURL(file),
          // First photo is the front, second the back, the rest are gallery shots.
          role: position === 0 ? "front" : position === 1 ? "back" : "gallery",
          isPrimary: position === 0,
          saved: false,
          uploading: true,
        },
      });
    }
    if (accepted.length === 0) return;
    setImages((current) => [...current, ...accepted.map((a) => a.image)]);

    const storage = getBrowserClient().storage.from(IMAGE_BUCKET);
    await Promise.all(
      accepted.map(async ({ file, image }) => {
        const { error: uploadError } = await storage.upload(image.storagePath, file, {
          contentType: file.type,
          cacheControl: "31536000",
          upsert: false,
        });
        setImages((current) =>
          current.map((item) =>
            item.id === image.id
              ? { ...item, uploading: false, error: uploadError ? uploadError.message : undefined }
              : item,
          ),
        );
      }),
    );
  }

  function moveImage(index: number, direction: -1 | 1) {
    setImages((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeImage(image: FormImage) {
    setImages((current) => {
      const next = current.filter((item) => item.id !== image.id);
      // Removing the primary photo promotes the first remaining one.
      if (image.isPrimary && next.length > 0) next[0] = { ...next[0], isPrimary: true };
      return next;
    });
    // A photo uploaded in this visit and never saved is deleted now. Saved ones are deleted on save.
    if (!image.saved && !image.error) {
      void getBrowserClient().storage.from(IMAGE_BUCKET).remove([image.storagePath]);
    }
  }

  /* ---------- Save ---------- */

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const cleanColors = colors.map((c) => ({ name: c.name.trim(), hex: c.hex })).filter((c) => c.name);
    if (!name.trim()) return fail("Give the product a name.");
    const priceNumber = Number(price);
    if (price.trim() === "" || !Number.isInteger(priceNumber) || priceNumber < 0) {
      return fail("Enter the price as a whole number of taka.");
    }
    const saleNumber = salePrice.trim() === "" ? null : Number(salePrice);
    if (saleNumber !== null && (!Number.isInteger(saleNumber) || saleNumber < 0 || saleNumber >= priceNumber)) {
      return fail("The discounted price must be a whole number lower than the price. Leave it empty for no discount.");
    }
    if (sizes.length === 0) return fail("Choose at least one size.");
    if (cleanColors.length === 0) return fail("Add at least one colour.");
    if (new Set(cleanColors.map((c) => c.name.toLowerCase())).size !== cleanColors.length) {
      return fail("Two colours have the same name. Give each colour its own name.");
    }
    if (images.some((image) => image.uploading)) return fail("Photos are still uploading. Wait a moment and save again.");
    if (images.some((image) => image.error)) return fail("One photo failed to upload. Remove it, then save.");

    const input: ProductInput = {
      id: initial.id,
      name,
      category,
      description,
      price: priceNumber,
      salePrice: saleNumber,
      status,
      isFeatured,
      isNew,
      cut,
      variants: cleanColors.flatMap((color) =>
        sizes.map((size) => ({
          size,
          color: color.name,
          colorHex: color.hex,
          stock: Math.max(0, Math.floor(stock[stockKey(size, color.name)] ?? 0)),
        })),
      ),
      images: images.map((image) => ({
        id: image.id,
        storagePath: image.storagePath,
        role: image.role,
        isPrimary: image.isPrimary,
      })),
    };

    setSaving(true);
    try {
      const result = await saveProduct(input);
      if (!result.ok) {
        setSaving(false);
        return fail(result.error ?? "The product could not be saved.");
      }
      router.push("/admin/products");
      router.refresh();
    } catch {
      setSaving(false);
      fail("The product could not be saved. Check your connection and try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-6">
        {error && (
          <div
            ref={errorBox}
            tabIndex={-1}
            role="alert"
            className="flex items-start gap-2 border border-destructive/40 bg-red-50 px-4 py-3 text-sm text-red-900 outline-none"
          >
            <Icon name="alert" size={18} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <Section title="Details">
          <div>
            <label htmlFor={`${ids}-name`} className={labelClass}>
              Product name <span aria-hidden="true">*</span>
            </label>
            <input
              id={`${ids}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              required
              className={`${inputClass} mt-1`}
            />
          </div>

          <fieldset>
            <legend className={labelClass}>
              Category <span aria-hidden="true">*</span>
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORIES.map((option) => (
                <label key={option} className="relative">
                  <input
                    type="radio"
                    name="category"
                    checked={category === option}
                    onChange={() => changeCategory(option)}
                    className="peer sr-only"
                  />
                  <span className="inline-flex h-11 cursor-pointer items-center border border-border px-4 text-sm font-semibold transition-colors peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-paper peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
                    {CATEGORY_LABEL[option]}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor={`${ids}-description`} className={labelClass}>
              Description
            </label>
            <textarea
              id={`${ids}-description`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              maxLength={4000}
              className={`${inputClass} mt-1 h-auto py-2`}
            />
            <p className={helpClass}>Fabric, fit and anything a buyer should know.</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor={`${ids}-price`} className={labelClass}>
                Price (৳) <span aria-hidden="true">*</span>
              </label>
              <input
                id={`${ids}-price`}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className={`${inputClass} tabular mt-1`}
              />
            </div>
            <div>
              <label htmlFor={`${ids}-sale`} className={labelClass}>
                Discounted price (৳)
              </label>
              <input
                id={`${ids}-sale`}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                aria-describedby={`${ids}-sale-help`}
                className={`${inputClass} tabular mt-1`}
              />
              <p id={`${ids}-sale-help`} className={helpClass}>
                Leave empty for no discount. Shows a Sale badge on the shop.
              </p>
            </div>
          </div>
        </Section>

        <Section
          title="Photos"
          hint="Cut-out photos with a transparent background look best. The Front and Back photos are the two sides of the turning product; Gallery photos are extra shots. PNG, WebP, JPEG or AVIF, up to 8 MB each."
        >
          <div>
            <input
              ref={fileInput}
              id={`${ids}-files`}
              type="file"
              accept={IMAGE_TYPES.join(",")}
              multiple
              onChange={onFiles}
              className="sr-only"
            />
            <label
              htmlFor={`${ids}-files`}
              className={`${secondaryButton} cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring`}
            >
              <Icon name="upload" size={16} />
              Upload photos
            </label>
            <span className="tabular ml-3 text-sm text-muted-foreground">
              {images.length} of {MAX_PHOTOS}
            </span>
          </div>

          {images.length > 0 && (
            <ol className="grid gap-3 sm:grid-cols-2">
              {images.map((image, index) => (
                <li key={image.id} className="flex gap-3 border border-border p-3">
                  <div className="relative size-24 shrink-0 bg-background">
                    <Image
                      src={image.previewUrl}
                      alt={`Photo ${index + 1}`}
                      fill
                      sizes="96px"
                      unoptimized
                      className="object-contain"
                    />
                    {image.uploading && (
                      <span className="absolute inset-0 grid place-items-center bg-paper/80 text-xs font-semibold">
                        Uploading…
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    {image.error && (
                      <p role="alert" className="text-xs text-destructive">
                        Upload failed: {image.error}
                      </p>
                    )}
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="primary-photo"
                        checked={image.isPrimary}
                        onChange={() =>
                          setImages((current) => current.map((item) => ({ ...item, isPrimary: item.id === image.id })))
                        }
                        className="size-4 accent-black"
                      />
                      Primary photo
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <span className="sr-only">Photo {index + 1} shows the</span>
                      <select
                        value={image.role}
                        onChange={(e) =>
                          setImages((current) =>
                            current.map((item) =>
                              item.id === image.id ? { ...item, role: e.target.value as ImageRole } : item,
                            ),
                          )
                        }
                        className="h-9 border border-border bg-paper px-2 text-sm"
                      >
                        <option value="front">Front</option>
                        <option value="back">Back</option>
                        <option value="gallery">Gallery</option>
                      </select>
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveImage(index, -1)}
                        disabled={index === 0}
                        aria-label={`Move photo ${index + 1} earlier`}
                        className="grid size-9 place-items-center border border-border disabled:opacity-30"
                      >
                        <Icon name="arrowLeft" size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(index, 1)}
                        disabled={index === images.length - 1}
                        aria-label={`Move photo ${index + 1} later`}
                        className="grid size-9 place-items-center border border-border disabled:opacity-30"
                      >
                        <Icon name="arrowRight" size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(image)}
                        aria-label={`Remove photo ${index + 1}`}
                        className="ml-auto grid size-9 place-items-center border border-border text-destructive hover:border-destructive"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div className="max-w-xs">
            <label htmlFor={`${ids}-cut`} className={labelClass}>
              Placeholder shape
            </label>
            <select
              id={`${ids}-cut`}
              value={cut}
              onChange={(e) => setCut(e.target.value)}
              className={`${inputClass} mt-1`}
            >
              {CUTS[category].map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className={helpClass}>Drawn in the product&apos;s colour only while it has no photos.</p>
          </div>
        </Section>

        <Section title="Sizes, colours and stock" hint="Stock is counted per size and colour.">
          <fieldset>
            <legend className={labelClass}>
              Sizes <span aria-hidden="true">*</span>
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {optionSizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  aria-pressed={sizes.includes(size)}
                  onClick={() => toggleSize(size)}
                  className={`tabular h-11 min-w-12 border px-3 text-sm font-semibold transition-colors ${
                    sizes.includes(size)
                      ? "border-foreground bg-foreground text-paper"
                      : "border-border hover:border-foreground"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
            <div className="mt-3 flex max-w-xs gap-2">
              <label htmlFor={`${ids}-custom-size`} className="sr-only">
                Another size
              </label>
              <input
                id={`${ids}-custom-size`}
                value={customSize}
                onChange={(e) => setCustomSize(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomSize();
                  }
                }}
                maxLength={12}
                placeholder="Another size"
                className={inputClass}
              />
              <button type="button" onClick={addCustomSize} className={secondaryButton}>
                Add
              </button>
            </div>
          </fieldset>

          <fieldset>
            <legend className={labelClass}>
              Colours <span aria-hidden="true">*</span>
            </legend>
            <ul className="mt-2 space-y-2">
              {colors.map((color, index) => (
                <li key={index} className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={`${ids}-color-hex-${index}`}>
                    Swatch for colour {index + 1}
                  </label>
                  <input
                    id={`${ids}-color-hex-${index}`}
                    type="color"
                    value={color.hex}
                    onChange={(e) => updateColor(index, { hex: e.target.value })}
                    className="size-11 shrink-0 cursor-pointer border border-border bg-paper p-1"
                  />
                  <label className="sr-only" htmlFor={`${ids}-color-name-${index}`}>
                    Name of colour {index + 1}
                  </label>
                  <input
                    id={`${ids}-color-name-${index}`}
                    value={color.name}
                    onChange={(e) => updateColor(index, { name: e.target.value })}
                    maxLength={40}
                    placeholder="Colour name, e.g. Black"
                    className={`${inputClass} max-w-xs`}
                  />
                  <button
                    type="button"
                    onClick={() => setColors((current) => current.filter((_, i) => i !== index))}
                    disabled={colors.length === 1}
                    aria-label={`Remove colour ${color.name || index + 1}`}
                    className="grid size-11 shrink-0 place-items-center border border-border text-destructive disabled:opacity-30"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setColors((current) => [...current, { name: "", hex: "#a8a29e" }])}
              className={`${secondaryButton} mt-3`}
            >
              <Icon name="plus" size={16} />
              Add colour
            </button>
          </fieldset>

          {sizes.length > 0 && colors.some((c) => c.name.trim()) && (
            <div>
              <p className={labelClass}>Stock quantities</p>
              <div className="mt-2 overflow-x-auto">
                <table className="border-collapse text-sm">
                  <thead>
                    <tr>
                      <th scope="col" className="py-2 pr-4 text-left font-semibold">
                        Size
                      </th>
                      {colors
                        .filter((c) => c.name.trim())
                        .map((color) => (
                          <th key={color.name} scope="col" className="px-2 py-2 text-left font-semibold">
                            <span className="inline-flex items-center gap-2">
                              <span
                                aria-hidden="true"
                                className="size-3 rounded-full ring-1 ring-black/20"
                                style={{ backgroundColor: color.hex }}
                              />
                              {color.name}
                            </span>
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sizes.map((size) => (
                      <tr key={size} className="border-t border-border">
                        <th scope="row" className="tabular py-2 pr-4 text-left font-semibold">
                          {size}
                        </th>
                        {colors
                          .filter((c) => c.name.trim())
                          .map((color) => {
                            const key = stockKey(size, color.name.trim());
                            return (
                              <td key={color.name} className="px-2 py-2">
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  step={1}
                                  aria-label={`Stock for size ${size}, ${color.name}`}
                                  value={stock[key] ?? 0}
                                  onChange={(e) =>
                                    setStock((current) => ({
                                      ...current,
                                      [key]: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                                    }))
                                  }
                                  className="tabular h-11 w-24 border border-border bg-paper px-2 text-base focus:border-foreground"
                                />
                              </td>
                            );
                          })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Section>
      </div>

      <aside className="space-y-6 lg:sticky lg:top-6 lg:h-fit">
        <Section title="Visibility">
          <fieldset>
            <legend className="sr-only">Status</legend>
            <div className="space-y-2">
              {(
                [
                  { value: "draft", label: "Draft", help: "Saved, but not on the shop." },
                  { value: "published", label: "Published", help: "Visible on the shop as soon as you save." },
                ] as const
              ).map((option) => (
                <label key={option.value} className="flex cursor-pointer items-start gap-3">
                  <input
                    type="radio"
                    name="status"
                    checked={status === option.value}
                    onChange={() => setStatus(option.value)}
                    className="mt-1 size-4 accent-black"
                  />
                  <span>
                    <span className="block text-sm font-semibold">{option.label}</span>
                    <span className="block text-sm text-muted-foreground">{option.help}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={isNew}
              onChange={(e) => setIsNew(e.target.checked)}
              className="mt-1 size-4 accent-black"
            />
            <span>
              <span className="block text-sm font-semibold">New release</span>
              <span className="block text-sm text-muted-foreground">Shows the badge and puts it first on the rail.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="mt-1 size-4 accent-black"
            />
            <span>
              <span className="block text-sm font-semibold">Featured</span>
              <span className="block text-sm text-muted-foreground">Used for the collection tiles on the home page.</span>
            </span>
          </label>
        </Section>

        <div className="flex flex-col gap-2">
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? "Saving…" : status === "published" ? "Save and publish" : "Save draft"}
          </button>
          <Link href="/admin/products" className={secondaryButton}>
            Cancel
          </Link>
        </div>
      </aside>
    </form>
  );
}
