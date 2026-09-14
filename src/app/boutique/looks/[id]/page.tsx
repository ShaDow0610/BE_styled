import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicLook } from "@/lib/publicCatalog";
import { buildWhatsAppLookLink } from "@/lib/whatsapp";
import Price from "../../components/Price";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const look = await getPublicLook(id);

  if (!look) return {};

  const description = `Le look "${look.nom}" — ${look.item_count} article${look.item_count > 1 ? "s" : ""}, disponible chez Be Styled.`;

  return {
    title: `${look.nom} — Be Styled`,
    description,
    openGraph: {
      title: look.nom,
      description,
      images: look.photo_couverture ? [look.photo_couverture] : undefined,
      type: "website",
    },
  };
}

export default async function LookDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const look = await getPublicLook(id);

  if (!look) {
    notFound();
  }

  return (
    <div className="outfit-hero-bg">
      <div className="relative container mx-auto px-4 py-14 md:py-20">
        {/* En-tête de marque */}
        <div className="text-center mb-12 md:mb-16">
          <p className="text-xs tracking-[0.35em] uppercase text-silver-soft/70 mb-2">Be Styled</p>
          <h1 className="font-serif text-2xl md:text-3xl text-ivory tracking-wide">{look.nom.toUpperCase()}</h1>
          <div className="flex items-center justify-center gap-3 mt-3 text-silver-soft/50">
            <span className="w-10 h-px bg-silver-soft/30" />
            <span className="text-xs">◆</span>
            <span className="w-10 h-px bg-silver-soft/30" />
          </div>
        </div>

        {/* Breakdown : photo du look à gauche, grille d'articles à droite */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-14 items-start">
          <div className="md:sticky md:top-24">
            {look.photo_couverture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={look.photo_couverture}
                alt={look.nom}
                className="w-full rounded-lg bg-ivory-soft object-cover aspect-[3/4] shadow-2xl"
              />
            ) : (
              <div className="w-full rounded-lg bg-ivory-soft/10 aspect-[3/4]" />
            )}
          </div>

          <div>
            <div className="grid grid-cols-2 gap-4 md:gap-5">
              {look.items.map((item) => (
                <Link
                  key={item._id}
                  href={`/boutique/produit/${item.product_id}`}
                  className="group block">
                  <div className="bg-ivory rounded-lg overflow-hidden shadow-lg">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image}
                        alt={item.nom}
                        className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full aspect-square bg-ivory-soft" />
                    )}
                  </div>
                  <p className="text-center text-[11px] md:text-xs tracking-[0.15em] uppercase text-silver-soft mt-3 group-hover:text-ivory transition-colors">
                    {item.categorie || item.nom}
                  </p>
                  {item.prix != null && (
                    <Price xaf={item.prix} className="block text-center text-[11px] text-silver-soft/50 mt-1" />
                  )}
                </Link>
              ))}
            </div>

            <div className="mt-10 pt-8 border-t border-silver-soft/20 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs text-silver-soft/60 mb-1">Prix du pack</p>
                <Price xaf={look.prix_pack} className="block text-2xl font-bold text-ivory" />
              </div>
              <a
                href={buildWhatsAppLookLink(look.nom)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-8 py-3 bg-ivory text-ink rounded-lg font-semibold hover:bg-silver-soft transition-colors">
                Commander sur WhatsApp
              </a>
            </div>
          </div>
        </div>

        {/* Pied de page façon affiche */}
        <div className="text-center mt-16 md:mt-24">
          <p className="font-serif text-3xl md:text-4xl text-ivory">
            OUTFIT IDEAS
          </p>
          <p className="font-serif italic text-lg text-silver-soft/70 mt-1">for you</p>
          <div className="flex items-center justify-center gap-3 mt-4 text-silver-soft/50">
            <span className="w-10 h-px bg-silver-soft/30" />
            <span className="text-xs">◆</span>
            <span className="w-10 h-px bg-silver-soft/30" />
          </div>
        </div>
      </div>
    </div>
  );
}
