import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/siteUrl";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Be Styled",
  description:
    "Be Styled — gestion de stock élégante pour votre boutique de vêtements, accessoires, bijoux et chaussures.",
  keywords:
    "be styled, gestion, stock, boutique, vêtements, accessoires, bijoux, chaussures",
  openGraph: {
    title: "Be Styled",
    description: "Le style, votre signature.",
    siteName: "Be Styled",
    images: ["/brand/social-black-on-white.png"],
    locale: "fr_FR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} ${playfair.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
