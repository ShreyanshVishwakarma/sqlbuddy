import type { Metadata } from "next";
import { Outfit, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader, SiteFooter } from "@/components/layout";
import { ThemeScript } from "@/components/theme-script";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "sqlbuddy — Practice SQL Interview Questions in Your Browser",
    template: "%s · sqlbuddy",
  },
  description:
    "Practice SQL interview questions with a real SQLite database that runs entirely in your browser. No server, no sign-up — just questions, queries, and instant pass/fail feedback.",
  openGraph: {
    title: "sqlbuddy",
    description:
      "Practice SQL interview questions against a real SQLite database, entirely in your browser.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <a
          href="#main"
          className="focus:bg-accent focus:text-accent-foreground sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
        >
          Skip to content
        </a>
        <SiteHeader />
        <div id="main" className="flex-1">
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
