import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ToyHunter AI",
  description: "AI hunter voor vintage toys en collectibles",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body>
        <nav className="bg-slate-950 text-white border-b border-slate-800">
          <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
            <Link href="/" className="font-bold text-xl">
              ToyHunter AI
            </Link>

            <div className="flex gap-4 text-sm text-slate-300">
              <Link href="/" className="hover:text-white">Home</Link>
              <Link href="/hunt" className="hover:text-white">Hunt</Link>
              <Link href="/analyse" className="hover:text-white">Analyse</Link>
              <Link href="/sell" className="hover:text-white">Sell</Link>
            </div>
          </div>
        </nav>

        {children}
      </body>
    </html>
  );
}