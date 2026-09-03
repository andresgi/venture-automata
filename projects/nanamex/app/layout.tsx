import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

// UI/body typeface -- design/UI-SYSTEM.md §0.4: nearly all interface text.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Display serif -- UI-SYSTEM §0.4 reserves Fraunces for a small, deliberate set of
// emotionally significant moments only (landing hero, empty-state headlines, paywall
// headline, verification-outcome banners) -- never the default body/UI typeface, and
// never in the admin area. Loaded once here (root layout) but only ever applied via the
// `.text-display`/`.text-headline` utility classes in app/globals.css.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500"],
});

export const metadata: Metadata = {
  title: "Clin",
  description: "Clin — familias y niñeras confiables en México.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-bg text-ink-900">{children}</body>
    </html>
  );
}
