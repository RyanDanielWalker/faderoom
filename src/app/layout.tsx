import type { Metadata } from "next";
import { JetBrains_Mono, Unbounded } from "next/font/google";
import "./globals.css";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
});

const display = Unbounded({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "800"],
});

export const metadata: Metadata = {
  title: "Faderoom",
  description: "A browser-based DJ mixer.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${mono.variable} ${display.variable}`}>
      <body className="font-mono bg-bg text-text antialiased">{children}</body>
    </html>
  );
}