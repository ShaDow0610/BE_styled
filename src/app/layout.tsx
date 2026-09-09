import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/common/Navbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "Be Styled",
  description:
    "Be Styled — gestion de stock élégante pour votre boutique de vêtements, accessoires, bijoux et chaussures.",
  keywords:
    "be styled, gestion, stock, boutique, vêtements, accessoires, bijoux, chaussures",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} ${playfair.variable} font-sans`}>
        <Navbar />
        <main className="bg-ivory min-h-screen">{children}</main>
      </body>
    </html>
  );
}
