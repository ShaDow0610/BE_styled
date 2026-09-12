import { notFound } from "next/navigation";
import { getPublicLook } from "@/lib/publicCatalog";
import { buildWhatsAppLookLink } from "@/lib/whatsapp";
import Price from "../../components/Price";

export default async function LookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const look = await getPublicLook(id);

  if (!look) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="grid md:grid-cols-2 gap-10">
        <div>
          {look.photo_couverture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={look.photo_couverture} alt={look.nom} className="w-full rounded-lg bg-ivory-soft object-cover aspect-square" />
          ) : (
            <div className="w-full rounded-lg bg-ivory-soft aspect-square" />
          )}
        </div>

        <div>
          <p className="text-sm text-ink-soft/60">Look</p>
          <h1 className="font-serif text-3xl text-ink mt-1 mb-4">{look.nom}</h1>
          <Price xaf={look.prix_pack} className="block text-2xl font-bold text-ink mb-6" />

          <a
            href={buildWhatsAppLookLink(look.nom)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-3 bg-ink text-ivory rounded-lg font-semibold hover:bg-ink-soft transition-colors">
            Commander sur WhatsApp
          </a>
        </div>
      </div>

      <div className="mt-14">
        <h2 className="font-serif text-2xl text-ink mb-2">Composition du look</h2>
        <p className="text-sm text-ink-soft/60 mb-6">
          Prix indiqués à titre informatif, pièce par pièce — la commande se fait au prix du pack ci-dessus.
        </p>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {look.items.map((item) => (
            <div key={item._id} className="bg-white rounded-lg shadow p-4">
              <h3 className="font-medium text-ink text-sm">{item.nom}</h3>
              <p className="text-xs text-ink-soft/60 mt-2">Prix pièce</p>
              <Price xaf={item.prix} className="block text-sm font-semibold text-ink" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
