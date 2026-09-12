import { notFound } from "next/navigation";
import { getPublicProduct } from "@/lib/publicCatalog";
import WhatsAppOrderButton from "./WhatsAppOrderButton";

type Params = Promise<{ id: string }>;

export default async function ProductDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const product = await getPublicProduct(id);

  if (!product) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="grid md:grid-cols-2 gap-10">
        <div>
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image} alt={product.nom} className="w-full rounded-lg bg-ivory-soft object-cover aspect-square" />
          ) : (
            <div className="w-full rounded-lg bg-ivory-soft aspect-square" />
          )}
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2 mt-3">
              {product.images.slice(1).map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url} src={url} alt={product.nom} className="w-full aspect-square object-cover rounded bg-ivory-soft" />
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-sm text-ink-soft/60 capitalize">{product.categorie}</p>
          <h1 className="font-serif text-3xl text-ink mt-1 mb-4">{product.nom}</h1>
          {product.matiere && (
            <p className="text-sm text-ink-soft mb-2">Matière : {product.matiere}</p>
          )}
          <p className="text-ink-soft mb-8">{product.description}</p>

          <WhatsAppOrderButton
            productNom={product.nom}
            productReference={product.reference}
            prix={product.prix}
            couleursDisponibles={product.couleurs_disponibles}
            taillesDisponibles={product.tailles_disponibles}
          />
        </div>
      </div>
    </div>
  );
}
