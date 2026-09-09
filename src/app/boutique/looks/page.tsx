import { getPublicLooks } from "@/lib/publicCatalog";
import { buildWhatsAppLookLink } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export default async function LooksPage() {
  const looks = await getPublicLooks();

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="font-serif text-4xl text-ink mb-8">Looks</h1>

      {looks.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-ink-soft/70">Aucun look disponible pour le moment.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {looks.map((look) => (
            <div key={look._id} className="bg-white rounded-lg shadow overflow-hidden">
              {look.photo_couverture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={look.photo_couverture} alt={look.nom} className="w-full h-56 object-cover bg-ivory-soft" />
              ) : (
                <div className="w-full h-56 bg-ivory-soft" />
              )}
              <div className="p-5">
                <h3 className="font-serif text-xl text-ink">{look.nom}</h3>
                <p className="text-ink-soft/70 text-sm mt-1">{look.item_count} article(s)</p>
                <p className="text-2xl font-bold text-ink mt-2">${look.prix_pack}</p>
                <a
                  href={buildWhatsAppLookLink(look.nom)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-4 px-6 py-2 bg-ink text-ivory rounded-lg font-semibold hover:bg-ink-soft transition-colors">
                  Commander sur WhatsApp
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
