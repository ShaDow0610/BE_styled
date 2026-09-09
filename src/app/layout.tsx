import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/common/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Zephyr - Gestion de Stock Boutique",
  description:
    "Application moderne de gestion de stock pour votre boutique de vêtements, accessoires, bijoux et chaussures.",
  keywords:
    "gestion, stock, boutique, vêtements, accessoires, bijoux, chaussures",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <Navbar />
        <main className="bg-gray-50 min-h-screen">{children}</main>
      </body>
    </html>
  );
}
