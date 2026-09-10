import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShirt,
  faSocks,
  faRing,
  faGem,
  faClock,
  faShoePrints,
  faHatCowboy,
  faGlasses,
  faTags,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { getPublicProducts } from "@/lib/publicCatalog";
import { buildWhatsAppLink } from "@/lib/whatsapp";

const CATEGORIES: { key: string; icon: IconDefinition }[] = [
  { key: "pantalon", icon: faSocks },
  { key: "chemise", icon: faShirt },
  { key: "tricot", icon: faShirt },
  { key: "culotte", icon: faSocks },
  { key: "bracelet", icon: faGem },
  { key: "montre", icon: faClock },
  { key: "chaussure", icon: faShoePrints },
  { key: "bague", icon: faRing },
  { key: "chapeau", icon: faHatCowboy },
  { key: "lunette", icon: faGlasses },
  { key: "autre", icon: faTags },
];

type SearchParams = Promise<{ categorie?: string; couleur?: string; taille?: string; q?: string }>;

export default async function CataloguePage({ searchParams }: { searchParams: SearchParams }) {
  const { categorie, couleur, taille, q } = await searchParams;

  const products = await getPublicProducts({ categorie, couleur, taille, q, limit: 100 });

  const buildLink = (params: Record<string, string | undefined>) => {
    const merged = { categorie, couleur, taille, q, ...params };
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

      <form action="/boutique/catalogue" method="get" className="mb-6 max-w-md">
        {categorie && <input type="hidden" name="categorie" value={categorie} />}
        {couleur && <input type="hidden" name="couleur" value={couleur} />}
        {taille && <input type="hidden" name="taille" value={taille} />}
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Rechercher un produit..."
          className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink bg-white"
        />
      </form>

      <div className="flex flex-wrap gap-3 mb-8">
        <Link
          href={buildLink({ categorie: undefined })}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-colors ${!categorie ? "bg-ink text-ivory" : "bg-white text-ink-soft border border-silver-soft hover:border-ink"}`}>
          <FontAwesomeIcon icon={faTags} className="w-3.5 h-3.5" />
          Toutes catégories
        </Link>
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.key}
            href={buildLink({ categorie: cat.key })}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm capitalize transition-colors ${categorie === cat.key ? "bg-ink text-ivory" : "bg-white text-ink-soft border border-silver-soft hover:border-ink"}`}>
            <FontAwesomeIcon icon={cat.icon} className="w-3.5 h-3.5" />
            {cat.key}
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
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
          {products.map((product) => (
            <div
              key={product._id}
              className="bg-white rounded-lg shadow hover:shadow-xl transition-shadow overflow-hidden group">
              <Link href={`/boutique/produit/${product._id}`}>
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
                  <p className="text-ink-soft/70 text-xs capitalize mt-1">{product.categorie}</p>
                  {product.prix != null && (
                    <p className="text-ink font-bold mt-2">${product.prix}</p>
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
      )}
    </div>
  );
}
