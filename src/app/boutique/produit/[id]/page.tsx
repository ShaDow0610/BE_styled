import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicProduct } from "@/lib/publicCatalog";
import WhatsAppOrderButton from "./WhatsAppOrderButton";
import ProductGallery from "./ProductGallery";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const product = await getPublicProduct(id);

  if (!product) return {};

  const description = product.description || `${product.nom} — disponible chez Be Styled.`;

  return {
    title: `${product.nom} — Be Styled`,
    description,
    openGraph: {
      title: product.nom,
      description,
      images: product.image ? [product.image] : undefined,
      type: "website",
    },
  };
}

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
          <ProductGallery images={product.images} alt={product.nom} />
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
