import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGem, faBolt } from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import PromoBanner from "./components/PromoBanner";
import Price from "./components/Price";
import { getPublicProducts, getPublicLooks } from "@/lib/publicCatalog";
import { buildWhatsAppLink, buildWhatsAppLookLink } from "@/lib/whatsapp";

// Catalogue/stock changent en continu depuis le back-office — pas de cache statique.
export const dynamic = "force-dynamic";

const REASSURANCE = [
  { icon: faGem, text: "Pièces sélectionnées avec soin" },
  { icon: faWhatsapp, text: "Commande simple, directement sur WhatsApp" },
  { icon: faBolt, text: "Réponse rapide à vos questions" },
];

export default async function BoutiqueHomePage() {
  const [nouveautes, looks] = await Promise.all([
    getPublicProducts({ limit: 8 }),
    getPublicLooks(4),
  ]);

  const heroVideo = process.env.NEXT_PUBLIC_HERO_VIDEO_URL;

  return (
    <div>
      <PromoBanner />

      {/* Hero */}
      <div className="relative overflow-hidden">
        {heroVideo && (
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            src={heroVideo}
          />
        )}
        {heroVideo && <div className="absolute inset-0 bg-ink/60" />}

        <div className="relative container mx-auto px-4 py-24 md:py-32 text-center">
          <p
            className={`text-xs tracking-[0.3em] uppercase mb-4 ${heroVideo ? "text-silver-soft" : "text-ink-soft/60"}`}>
            Collection actuelle
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroVideo ? "/brand/logo-full-white.png" : "/brand/logo-full-black.png"}
            alt="Be Styled — Le style, votre signature"
            className="mx-auto h-40 md:h-56 w-auto mb-10"
          />
          <Link
            href="/boutique/catalogue"
            className="inline-block px-8 py-3 bg-ink text-ivory rounded-lg font-semibold hover:bg-ink-soft transition-colors">
            Découvrir le catalogue
          </Link>
        </div>
      </div>

      {/* Réassurance */}
      <div className="border-y border-silver-soft bg-white">
        <div className="container mx-auto px-4 py-6 grid sm:grid-cols-3 gap-4 text-center">
          {REASSURANCE.map((item) => (
            <div key={item.text} className="flex items-center justify-center gap-3 text-sm text-ink-soft">
              <FontAwesomeIcon icon={item.icon} className="w-4 h-4 text-ink" />
              {item.text}
            </div>
          ))}
        </div>
      </div>

      {looks.length > 0 && (
        <div className="container mx-auto px-4 py-16">
          <h2 className="font-serif text-3xl text-ink mb-8">Nos looks</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {looks.map((look) => (
              <div
                key={look._id}
                className="bg-white rounded-lg shadow hover:shadow-xl transition-shadow overflow-hidden group">
                <Link href="/boutique/looks">
                  {look.photo_couverture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={look.photo_couverture}
                      alt={look.nom}
                      className="w-full h-48 object-cover bg-ivory-soft group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-48 bg-ivory-soft" />
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-ink">{look.nom}</h3>
                    <Price xaf={look.prix_pack} className="block text-ink font-bold mt-1" />
                  </div>
                </Link>
                <div className="px-4 pb-4">
                  <a
                    href={buildWhatsAppLookLink(look.nom)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2 border border-ink text-ink rounded-lg text-sm font-medium hover:bg-ink hover:text-ivory transition-colors">
                    <FontAwesomeIcon icon={faWhatsapp} className="w-4 h-4" />
                    Commander
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {nouveautes.length > 0 && (
        <div className="container mx-auto px-4 py-16">
          <h2 className="font-serif text-3xl text-ink mb-8">Nouveautés</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {nouveautes.map((product, index) => (
              <div
                key={product._id}
                className="bg-white rounded-lg shadow hover:shadow-xl transition-shadow overflow-hidden group">
                <Link href={`/boutique/produit/${product._id}`} className="block relative">
                  {index < 3 && (
                    <span className="absolute top-3 left-3 z-10 px-2 py-1 bg-ink text-ivory text-[10px] tracking-wide rounded-full">
                      NOUVEAU
                    </span>
                  )}
                  {product.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image}
                      alt={product.nom}
                      className="w-full h-48 object-cover bg-ivory-soft group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-48 bg-ivory-soft" />
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-ink">{product.nom}</h3>
                    {product.prix != null && (
                      <Price xaf={product.prix} className="block text-ink font-bold mt-1" />
                    )}
                  </div>
                </Link>
                <div className="px-4 pb-4">
                  <a
                    href={buildWhatsAppLink({ nom: product.nom, reference: product.reference })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2 border border-ink text-ink rounded-lg text-sm font-medium hover:bg-ink hover:text-ivory transition-colors">
                    <FontAwesomeIcon icon={faWhatsapp} className="w-4 h-4" />
                    Commander
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
