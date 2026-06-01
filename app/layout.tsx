import type { Metadata } from "next";
import Navbar from "./components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "ToyHunter AI",
  description: "Vintage speelgoed herkennen, beoordelen en verkopen",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}