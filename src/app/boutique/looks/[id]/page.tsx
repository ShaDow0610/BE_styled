import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicLook } from "@/lib/publicCatalog";
import { buildWhatsAppLookLink } from "@/lib/whatsapp";
import Price from "../../components/Price";
import PhotoStage from "../../components/PhotoStage";

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
      <div className="relative z-10 container mx-auto px-4 py-14 md:py-20">
        {/* En-tête de marque */}
        <div className="text-center mb-12 md:mb-16">
          <p className="text-xs tracking-[0.35em] uppercase text-ink-soft/50 mb-2">Be Styled</p>
          <h1 className="font-serif text-2xl md:text-3xl text-ink tracking-wide">{look.nom.toUpperCase()}</h1>
          <div className="flex items-center justify-center gap-3 mt-3 text-ink-soft/30">
            <span className="w-10 h-px bg-ink/15" />
            <span className="text-xs">◆</span>
            <span className="w-10 h-px bg-ink/15" />
          </div>
        </div>

        {/* Breakdown : photo du look à gauche, grille d'articles à droite */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-14 items-start">
          <div className="md:sticky md:top-24">
            <PhotoStage
              src={look.photo_couverture}
              alt={look.nom}
              aspect="aspect-[3/4]"
              rounded="rounded-lg"
              className="shadow-xl"
            />
          </div>

          <div>
            <div className="grid grid-cols-2 gap-4 md:gap-5">
              {look.items.map((item) => (
                <Link
                  key={item._id}
                  href={`/boutique/produit/${item.product_id}`}
                  className="group block">
                  <PhotoStage
                    src={item.image}
                    alt={item.nom}
                    aspect="aspect-square"
                    rounded="rounded-lg"
                    className="shadow"
                  />
                  <p className="text-center text-[11px] md:text-xs tracking-[0.15em] uppercase text-ink-soft/60 mt-3 group-hover:text-ink transition-colors">
                    {item.categorie || item.nom}
                  </p>
                  {item.prix != null && (
                    <Price xaf={item.prix} className="block text-center text-[11px] text-ink-soft/40 mt-1" />
                  )}
                </Link>
              ))}
            </div>

            <div className="mt-10 pt-8 border-t border-ink/10 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs text-ink-soft/50 mb-1">Prix du pack</p>
                <Price xaf={look.prix_pack} className="block text-2xl font-bold text-ink" />
              </div>
              <a
                href={buildWhatsAppLookLink(look.nom)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-8 py-3 bg-ink text-ivory rounded-lg font-semibold hover:bg-ink-soft transition-colors">
                Commander sur WhatsApp
              </a>
            </div>
          </div>
        </div>

        {/* Pied de page façon affiche */}
        <div className="text-center mt-16 md:mt-24">
          <p className="font-serif text-3xl md:text-4xl text-ink">
            OUTFIT IDEAS
          </p>
          <p className="font-serif italic text-lg text-ink-soft/60 mt-1">for you</p>
          <div className="flex items-center justify-center gap-3 mt-4 text-ink-soft/30">
            <span className="w-10 h-px bg-ink/15" />
            <span className="text-xs">◆</span>
            <span className="w-10 h-px bg-ink/15" />
          </div>
        </div>
      </div>
    </div>
  );
}
