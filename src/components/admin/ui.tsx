import type { ReactNode } from "react";

/* Small shared pieces for the admin dashboard. Plain and dense on purpose. */

export const inputClass =
  "h-11 w-full border border-border bg-paper px-3 text-base placeholder:text-muted-foreground focus:border-foreground disabled:bg-muted";
export const labelClass = "block text-sm font-semibold";
export const helpClass = "mt-1 text-sm text-muted-foreground";
export const primaryButton =
  "inline-flex h-11 items-center justify-center gap-2 bg-primary px-5 text-sm font-semibold text-on-primary transition-opacity hover:opacity-85 disabled:opacity-50";
export const secondaryButton =
  "inline-flex h-11 items-center justify-center gap-2 border border-border bg-paper px-4 text-sm font-semibold transition-colors hover:border-foreground disabled:opacity-50";
export const dangerButton =
  "inline-flex h-11 items-center justify-center gap-2 border border-destructive/40 bg-paper px-4 text-sm font-semibold text-destructive transition-colors hover:bg-destructive hover:text-white disabled:opacity-50";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-[65ch] text-secondary">{description}</p>}
      </div>
      {action}
    </div>
  );
}

const TONES = {
  neutral: "bg-muted text-secondary",
  good: "bg-green-100 text-green-900",
  warn: "bg-amber-100 text-amber-900",
  bad: "bg-red-100 text-red-900",
  info: "bg-sky-100 text-sky-900",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap px-2 py-0.5 text-xs font-semibold ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "bad" | "good"; children: ReactNode }) {
  const style =
    tone === "bad"
      ? "border-destructive/40 bg-red-50 text-red-900"
      : tone === "good"
        ? "border-green-300 bg-green-50 text-green-900"
        : "border-border bg-paper text-secondary";
  return (
    <div role={tone === "bad" ? "alert" : "status"} className={`border px-4 py-3 text-sm ${style}`}>
      {children}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="border border-dashed border-border bg-paper px-6 py-14 text-center">
      <p className="text-lg font-bold">{title}</p>
      {children && <div className="mt-2 text-secondary">{children}</div>}
    </div>
  );
}

/** Dates are shown in Bangladesh time wherever the admin is. */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}
