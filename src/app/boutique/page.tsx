import Link from "next/link";
import PromoBanner from "./components/PromoBanner";
import { getPublicProducts, getPublicLooks } from "@/lib/publicCatalog";

// Catalogue/stock changent en continu depuis le back-office — pas de cache statique.
export const dynamic = "force-dynamic";

export default async function BoutiqueHomePage() {
  const [nouveautes, looks] = await Promise.all([
    getPublicProducts({ limit: 8 }),
    getPublicLooks(4),
  ]);

  return (
    <div>
      <PromoBanner />

      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="font-serif text-5xl md:text-6xl tracking-wide text-ink mb-4">
          BE STYLED
        </h1>
        <p className="text-xl text-ink-soft mb-8">
          Le style, votre signature
        </p>
        <Link
          href="/boutique/catalogue"
          className="inline-block px-8 py-3 bg-ink text-ivory rounded-lg font-semibold hover:bg-ink-soft transition-colors">
          Découvrir le catalogue
        </Link>
      </div>

      {looks.length > 0 && (
        <div className="container mx-auto px-4 py-12">
          <h2 className="font-serif text-3xl text-ink mb-6">Nos looks</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {looks.map((look) => (
              <Link
                key={look._id}
                href="/boutique/looks"
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
                {look.photo_couverture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={look.photo_couverture} alt={look.nom} className="w-full h-48 object-cover bg-ivory-soft" />
                ) : (
                  <div className="w-full h-48 bg-ivory-soft" />
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-ink">{look.nom}</h3>
                  <p className="text-ink font-bold mt-1">${look.prix_pack}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {nouveautes.length > 0 && (
        <div className="container mx-auto px-4 py-12">
          <h2 className="font-serif text-3xl text-ink mb-6">Nouveautés</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {nouveautes.map((product) => (
              <Link
                key={product._id}
                href={`/boutique/produit/${product._id}`}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
                {product.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.image} alt={product.nom} className="w-full h-48 object-cover bg-ivory-soft" />
                ) : (
                  <div className="w-full h-48 bg-ivory-soft" />
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-ink">{product.nom}</h3>
                  {product.prix != null && (
                    <p className="text-ink font-bold mt-1">${product.prix}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
