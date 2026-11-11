"use client";

import { useRef } from "react";
import { Icon } from "@/components/site/Icon";
import type { Category } from "@/lib/types";

interface Guide {
  title: string;
  note: string;
  columns: string[];
  rows: string[][];
}

export const SIZE_GUIDES: Record<Category, Guide> = {
  shirt: {
    title: "Shirt sizes",
    note: "Measured flat across the garment. Our shirts are cut wide; choose your usual size for the intended loose fit.",
    columns: ["Size", "Chest (in)", "Length (in)", "Chest (cm)", "Length (cm)"],
    rows: [
      ["S", "40", "27", "102", "69"],
      ["M", "42", "28", "107", "71"],
      ["L", "44", "29", "112", "74"],
      ["XL", "46", "30", "117", "76"],
      ["XXL", "48", "31", "122", "79"],
    ],
  },
  pant: {
    title: "Pant sizes",
    note: "Waist is measured around the waistband. Inseam runs from the crotch seam to the hem.",
    columns: ["Size", "Waist (in)", "Inseam (in)", "Waist (cm)", "Inseam (cm)"],
    rows: [
      ["28", "28", "30", "71", "76"],
      ["30", "30", "30", "76", "76"],
      ["32", "32", "31", "81", "79"],
      ["34", "34", "31", "86", "79"],
      ["36", "36", "32", "91", "81"],
    ],
  },
  shoe: {
    title: "Shoe sizes",
    note: "Measure your foot from heel to longest toe while standing. If you are between sizes, take the larger one.",
    columns: ["EU", "UK", "US", "Foot length (cm)"],
    rows: [
      ["39", "6", "7", "24.5"],
      ["40", "6.5", "7.5", "25.0"],
      ["41", "7.5", "8.5", "26.0"],
      ["42", "8", "9", "26.5"],
      ["43", "9", "10", "27.5"],
      ["44", "9.5", "10.5", "28.0"],
      ["45", "10.5", "11.5", "29.0"],
    ],
  },
};

export function SizeTable({ category }: { category: Category }) {
  const guide = SIZE_GUIDES[category];
  return (
    <div>
      <p className="text-sm text-secondary">{guide.note}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="tabular w-full min-w-[420px] border-collapse text-left text-sm">
          <caption className="sr-only">{guide.title}</caption>
          <thead>
            <tr className="border-b border-foreground">
              {guide.columns.map((column) => (
                <th key={column} scope="col" className="py-2 pr-4 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {guide.rows.map((row) => (
              <tr key={row[0]} className="border-b border-border">
                {row.map((cell, index) =>
                  index === 0 ? (
                    <th key={index} scope="row" className="py-2 pr-4 font-semibold">
                      {cell}
                    </th>
                  ) : (
                    <td key={index} className="py-2 pr-4">
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** "Size guide" link that opens the chart for this category in a dialog. */
export function SizeGuideButton({ category }: { category: Category }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const guide = SIZE_GUIDES[category];
  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="min-h-11 text-xs font-semibold uppercase tracking-[0.14em] underline underline-offset-4"
      >
        Size guide
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="size-guide-title"
        onClick={(event) => {
          // A click on the backdrop lands on the dialog element itself.
          if (event.target === dialog.current) dialog.current?.close();
        }}
        className="m-auto w-[min(92vw,640px)] bg-paper p-0 text-foreground backdrop:bg-black/50"
      >
        <div className="p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <h2 id="size-guide-title" className="text-2xl font-extrabold uppercase tracking-tight">
              {guide.title}
            </h2>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Close size guide"
              className="-mr-2 -mt-2 grid size-11 place-items-center"
            >
              <Icon name="close" />
            </button>
          </div>
          <div className="mt-4">
            <SizeTable category={category} />
          </div>
        </div>
      </dialog>
    </>
  );
}
