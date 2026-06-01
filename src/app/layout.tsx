import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "FormCoach — AI Push-Up Coach",
  description:
    "Real-time push-up form feedback using your laptop webcam and AI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">
        <header className="border-b border-border sticky top-0 z-50 bg-bg/90 backdrop-blur-md">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link
              href="/"
              className="text-text-secondary hover:text-text-primary text-sm"
            >
              ← Home
            </Link>
            <Link href="/" className="font-bold text-lg">
              FormCoach
            </Link>
            <div className="w-16" />
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-8 page-fade">
          {children}
        </main>
      </body>
    </html>
  );
}
