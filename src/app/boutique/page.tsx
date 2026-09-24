import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGem, faBolt, faFire } from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import PromoBanner from "./components/PromoBanner";
import Price from "./components/Price";
import AnimatedHeroLogo from "./components/AnimatedHeroLogo";
import ColorSwatches from "./components/ColorSwatches";
import ScrollReveal from "./components/ScrollReveal";
import StorytellingSection from "./components/StorytellingSection";
import FeaturedLookReveal from "./components/FeaturedLookReveal";
import PhotoStage from "./components/PhotoStage";
import { getPublicProducts, getPublicLooks, getPublicBestSellers } from "@/lib/publicCatalog";
import { buildWhatsAppLink } from "@/lib/whatsapp";

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
    getPublicLooks(200),
    getPublicBestSellers(8),
  ]);

  const heroVideo = process.env.NEXT_PUBLIC_HERO_VIDEO_URL;
  const [featuredLook, ...otherLooks] = looks;

  return (
    // Un seul décor clair et chaleureux, continu pour toute la page — les
    // looks sont ce qui doit se voir en premier et en priorité, du haut
    // jusqu'en bas, sans jamais passer par un fond noir.
    <div className="outfit-hero-bg">
      <div className="relative z-10">
        <PromoBanner />

        {/* Hero */}
        <div className="relative">
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
          {heroVideo && <div className="absolute inset-0 bg-ink/50" />}

          <div className="relative container mx-auto px-4 pt-20 pb-16 md:pt-28 text-center">
            <p className={`text-xs tracking-[0.3em] uppercase mb-4 ${heroVideo ? "text-silver-soft" : "text-ink-soft/50"}`}>
              Collection actuelle
            </p>
            <AnimatedHeroLogo
              src={heroVideo ? "/brand/logo-full-white.png" : "/brand/logo-full-black.png"}
              alt="Be Styled — Le style, votre signature"
            />
            <p className={`font-serif italic text-lg -mt-4 mb-8 ${heroVideo ? "text-silver-soft" : "text-ink-soft/70"}`}>
              Des tenues pensées, pas juste des pièces.
            </p>
            <div className="flex items-center justify-center gap-5 flex-wrap">
              <a
                href="#looks"
                className="inline-block px-8 py-3 bg-ink text-ivory rounded-lg font-semibold hover:bg-ink-soft transition-colors">
                Voir nos looks
              </a>
              <Link
                href="/boutique/catalogue"
                className="text-sm text-ink-soft/60 hover:text-ink transition-colors underline underline-offset-4">
                Ou parcourir les articles à l&apos;unité
              </Link>
            </div>
          </div>
        </div>

        {featuredLook && <FeaturedLookReveal look={featuredLook} />}

        {otherLooks.length > 0 && (
          <div className="relative container mx-auto px-4 pb-20 md:pb-24">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-serif text-2xl md:text-3xl text-ink">Tous nos looks</h3>
              <Link href="/boutique/looks" className="text-xs tracking-wide uppercase text-ink-soft/50 hover:text-ink transition-colors">
                Voir tout →
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
              {otherLooks.map((look, index) => (
                <ScrollReveal key={look._id} delay={(index % 3) * 0.08}>
                  <Link
                    href={`/boutique/looks/${look._id}`}
                    className="group block bg-white rounded-lg overflow-hidden shadow hover:shadow-xl transition-shadow">
                    <PhotoStage src={look.photo_couverture} alt={look.nom} aspect="aspect-[4/5]" rounded="" />
                    <div className="p-5">
                      <h4 className="font-serif text-lg text-ink">{look.nom}</h4>
                      <p className="text-xs text-ink-soft/50 mt-1">{look.item_count} article{look.item_count > 1 ? "s" : ""}</p>
                      <div className="flex items-center justify-between mt-4">
                        <Price xaf={look.prix_pack} className="font-bold text-ink" />
                        <span className="text-xs uppercase tracking-wide text-ink-soft/60 group-hover:text-ink transition-colors">
                          Voir la composition →
                        </span>
                      </div>
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        )}

        <StorytellingSection />

        {/* Réassurance */}
        <div className="border-y border-ink/10">
          <div className="container mx-auto px-4 py-6 grid sm:grid-cols-3 gap-4 text-center">
            {REASSURANCE.map((item) => (
              <div key={item.text} className="flex items-center justify-center gap-3 text-sm text-ink-soft">
                <FontAwesomeIcon icon={item.icon} className="w-4 h-4 text-ink" />
                {item.text}
              </div>
            ))}
          </div>
        </div>

        {(meilleuresVentes.length > 0 || nouveautes.length > 0) && (
          <div>
            <div className="container mx-auto px-4 pt-14 text-center">
              <p className="text-xs tracking-[0.3em] uppercase text-ink-soft/40">Vous préférez composer vous-même ?</p>
              <h2 className="font-serif text-2xl text-ink mt-2">Nos articles à l&apos;unité</h2>
            </div>

            {meilleuresVentes.length > 0 && (
              <div className="container mx-auto px-4 py-12">
                <h3 className="font-serif text-xl text-ink mb-6 flex items-center gap-3">
                  <FontAwesomeIcon icon={faFire} className="w-4 h-4 text-ink-soft/60" />
                  Meilleures ventes
                </h3>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {meilleuresVentes.map((product, index) => (
                    <ScrollReveal key={product._id} delay={(index % 3) * 0.08}>
                    <div
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
                          <h4 className="font-semibold text-ink">{product.nom}</h4>
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
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            )}

            {nouveautes.length > 0 && (
              <div className="container mx-auto px-4 py-12">
                <h3 className="font-serif text-xl text-ink mb-6">Nouveautés</h3>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {nouveautes.map((product, index) => (
                    <ScrollReveal key={product._id} delay={(index % 3) * 0.08}>
                    <div
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
                          <h4 className="font-semibold text-ink">{product.nom}</h4>
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
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
