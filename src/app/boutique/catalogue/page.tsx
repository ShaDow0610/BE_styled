import Link from "next/link";
import { getPublicProducts } from "@/lib/publicCatalog";

const CATEGORIES = [
  "pantalon", "chemise", "tricot", "culotte", "bracelet",
  "montre", "chaussure", "bague", "chapeau", "lunette", "autre",
];

type SearchParams = Promise<{ categorie?: string; couleur?: string; taille?: string }>;

export default async function CataloguePage({ searchParams }: { searchParams: SearchParams }) {
  const { categorie, couleur, taille } = await searchParams;

  const products = await getPublicProducts({ categorie, couleur, taille, limit: 100 });

  const buildLink = (params: Record<string, string | undefined>) => {
    const merged = { categorie, couleur, taille, ...params };
    const query = new URLSearchParams();
    Object.entries(merged).forEach(([k, v]) => {
      if (v) query.set(k, v);
    });
    const qs = query.toString();
    return `/boutique/catalogue${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="font-serif text-4xl text-ink mb-8">Catalogue</h1>

      <div className="flex flex-wrap gap-3 mb-8">
        <Link
          href={buildLink({ categorie: undefined })}
          className={`px-4 py-2 rounded-full text-sm ${!categorie ? "bg-ink text-ivory" : "bg-white text-ink-soft border border-silver-soft"}`}>
          Toutes catégories
        </Link>
        {CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={buildLink({ categorie: cat })}
            className={`px-4 py-2 rounded-full text-sm capitalize ${categorie === cat ? "bg-ink text-ivory" : "bg-white text-ink-soft border border-silver-soft"}`}>
            {cat}
          </Link>
        ))}
      </div>

      {(couleur || taille) && (
        <div className="flex gap-3 mb-8 text-sm text-ink-soft">
          {couleur && (
            <Link href={buildLink({ couleur: undefined })} className="px-3 py-1 bg-ivory-soft rounded-full">
              Couleur: {couleur} ✕
            </Link>
          )}
          {taille && (
            <Link href={buildLink({ taille: undefined })} className="px-3 py-1 bg-ivory-soft rounded-full">
              Taille: {taille} ✕
            </Link>
          )}
        </div>
      )}

      {products.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-ink-soft/70">Aucun produit ne correspond à ces critères.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-4 gap-6">
          {products.map((product) => (
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
                <p className="text-ink-soft/70 text-xs capitalize mt-1">{product.categorie}</p>
                {product.prix != null && (
                  <p className="text-ink font-bold mt-2">${product.prix}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
