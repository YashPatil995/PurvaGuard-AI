import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PurvaGuard AI — Disaster Intelligence & Early Warning",
  description:
    "PurvaGuard AI is an AI-powered early warning, landslide risk monitoring, and community disaster response platform for the Himalayan & North Eastern Region.",
  keywords: ["PurvaGuard AI", "landslide early warning", "disaster management", "Himalaya", "SIH 2026", "MDoNER"],
  authors: [{ name: "PurvaGuard AI Team" }],
  openGraph: {
    title: "PurvaGuard AI — Disaster Intelligence & Early Warning",
    description: "From risk signal to last-mile action. AI-powered disaster intelligence for the Himalayan belt.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
