import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGem, faBolt, faFire } from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import PromoBanner from "./components/PromoBanner";
import Price from "./components/Price";
import AnimatedHeroLogo from "./components/AnimatedHeroLogo";
import ColorSwatches from "./components/ColorSwatches";
import { getPublicProducts, getPublicLooks, getPublicBestSellers } from "@/lib/publicCatalog";
import { buildWhatsAppLink, buildWhatsAppLookLink } from "@/lib/whatsapp";

// Catalogue/stock changent en continu depuis le back-office — pas de cache statique.
export const dynamic = "force-dynamic";

const REASSURANCE = [
  { icon: faGem, text: "Pièces sélectionnées avec soin" },
  { icon: faWhatsapp, text: "Commande simple, directement sur WhatsApp" },
  { icon: faBolt, text: "Réponse rapide à vos questions" },
];

export default async function BoutiqueHomePage() {
  const [nouveautes, looks, meilleuresVentes] = await Promise.all([
    getPublicProducts({ limit: 8 }),
    getPublicLooks(7),
    getPublicBestSellers(8),
  ]);

  const heroVideo = process.env.NEXT_PUBLIC_HERO_VIDEO_URL;
  const [featuredLook, ...otherLooks] = looks;

  return (
    <div>
      <PromoBanner />

      {/* Hero — porté par les looks pour poser l'ambiance de marque dès l'arrivée */}
      <div className="outfit-hero-bg">
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
        {heroVideo && <div className="absolute inset-0 bg-ink/70" />}

        <div className="relative container mx-auto px-4 pt-20 pb-16 md:pt-28 text-center">
          <p className="text-xs tracking-[0.3em] uppercase mb-4 text-silver-soft/70">
            Collection actuelle
          </p>
          <AnimatedHeroLogo src="/brand/logo-full-white.png" alt="Be Styled — Le style, votre signature" />
          <p className="font-serif italic text-lg text-silver-soft/70 -mt-4 mb-8">
            Des tenues pensées, pas juste des pièces.
          </p>
          <Link
            href="/boutique/catalogue"
            className="inline-block px-8 py-3 bg-ivory text-ink rounded-lg font-semibold hover:bg-silver-soft transition-colors">
            Découvrir le catalogue
          </Link>
        </div>

        {featuredLook && (
          <div className="relative container mx-auto px-4 pb-16 md:pb-20">
            <Link
              href={`/boutique/looks/${featuredLook._id}`}
              className="group block relative rounded-xl overflow-hidden shadow-2xl">
              {featuredLook.photo_couverture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={featuredLook.photo_couverture}
                  alt={featuredLook.nom}
                  className="w-full aspect-[16/9] md:aspect-[21/9] object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full aspect-[16/9] md:aspect-[21/9] bg-ivory-soft/10" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 text-left">
                <p className="text-xs tracking-[0.25em] uppercase text-silver-soft/70 mb-2">Look du moment</p>
                <h2 className="font-serif text-2xl md:text-4xl text-ivory mb-3">{featuredLook.nom}</h2>
                <div className="flex items-center gap-4 flex-wrap">
                  <Price xaf={featuredLook.prix_pack} className="text-lg font-bold text-ivory" />
                  <span className="inline-flex items-center gap-2 px-5 py-2 border border-ivory/40 text-ivory rounded-lg text-sm font-medium group-hover:bg-ivory group-hover:text-ink transition-colors">
                    Découvrir la composition
                  </span>
                </div>
              </div>
            </Link>
          </div>
        )}

        {otherLooks.length > 0 && (
          <div className="relative container mx-auto px-4 pb-20 md:pb-24">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-xl md:text-2xl text-ivory">Plus de looks</h3>
              <Link href="/boutique/looks" className="text-xs tracking-wide uppercase text-silver-soft/70 hover:text-ivory transition-colors">
                Voir tous les looks →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 md:gap-5">
              {otherLooks.map((look) => (
                <Link key={look._id} href={`/boutique/looks/${look._id}`} className="group block">
                  <div className="rounded-lg overflow-hidden shadow-lg">
                    {look.photo_couverture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={look.photo_couverture}
                        alt={look.nom}
                        className="w-full aspect-[3/4] object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full aspect-[3/4] bg-ivory-soft/10" />
                    )}
                  </div>
                  <p className="text-center text-[11px] tracking-[0.1em] uppercase text-silver-soft mt-2 group-hover:text-ivory transition-colors truncate">
                    {look.nom}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
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

      {meilleuresVentes.length > 0 && (
        <div className="container mx-auto px-4 py-16">
          <h2 className="font-serif text-3xl text-ink mb-8 flex items-center gap-3">
            <FontAwesomeIcon icon={faFire} className="w-6 h-6 text-ink-soft/60" />
            Meilleures ventes
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {meilleuresVentes.map((product) => (
              <div
                key={product._id}
                className="bg-white rounded-lg shadow hover:shadow-xl transition-shadow overflow-hidden group">
                <Link href={`/boutique/produit/${product._id}`} className="block relative">
                  {product.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image}
                      alt={product.nom}
                      className="w-full aspect-[3/4] object-cover bg-ivory-soft group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full aspect-[3/4] bg-ivory-soft" />
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-ink">{product.nom}</h3>
                    {product.prix != null && (
                      <Price xaf={product.prix} className="block text-ink font-bold mt-1" />
                    )}
                    <ColorSwatches couleurs={product.couleurs_disponibles} />
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

      {nouveautes.length > 0 && (
        <div className="container mx-auto px-4 py-16">
          <h2 className="font-serif text-3xl text-ink mb-8">Nouveautés</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
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
                      className="w-full aspect-[3/4] object-cover bg-ivory-soft group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full aspect-[3/4] bg-ivory-soft" />
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-ink">{product.nom}</h3>
                    {product.prix != null && (
                      <Price xaf={product.prix} className="block text-ink font-bold mt-1" />
                    )}
                    <ColorSwatches couleurs={product.couleurs_disponibles} />
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
