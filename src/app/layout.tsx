import type { Metadata, Viewport } from "next";
import { Manrope, Syne } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DISTRICT 19 — Shirts, pants and shoes",
    template: "%s — DISTRICT 19",
  },
  description:
    "DISTRICT 19 is a streetwear label releasing shirts, pants and shoes in small runs. Delivered across Bangladesh.",
  // The palette is part of the brand: ask dark-mode browser extensions to leave it alone.
  other: { "darkreader-lock": "true", "color-scheme": "light only" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Browser extensions add their own attributes to <html> and <body>; ignore those when hydrating.
    <html
      lang="en"
      className={`${manrope.variable} ${syne.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
