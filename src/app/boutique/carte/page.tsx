import type { Metadata } from "next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAddressCard, faPhone, faLink } from "@fortawesome/free-solid-svg-icons";
import { faTiktok, faInstagram, faFacebook, faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { getBusinessCard } from "@/lib/businessCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Carte de visite — Be Styled",
  description: "Enregistrez nos coordonnées directement dans vos contacts.",
};

function iconForLabel(label: string): IconDefinition {
  const l = label.toLowerCase();
  if (l.includes("tiktok")) return faTiktok;
  if (l.includes("instagram")) return faInstagram;
  if (l.includes("facebook")) return faFacebook;
  if (l.includes("whatsapp")) return faWhatsapp;
  return faLink;
}

export default async function CartePage() {
  const card = await getBusinessCard();

  return (
    <div className="container mx-auto px-4 py-16 max-w-md text-center">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="w-20 h-20 rounded-full bg-ink text-ivory flex items-center justify-center mx-auto mb-5">
          <FontAwesomeIcon icon={faAddressCard} className="w-8 h-8" />
        </div>
        <h1 className="font-serif text-2xl text-ink mb-1">{card.nom}</h1>
        {card.organisation && card.organisation !== card.nom && (
          <p className="text-sm text-ink-soft/60 mb-4">{card.organisation}</p>
        )}

        {card.telephone && (
          <a
            href={`tel:${card.telephone.replace(/\s+/g, "")}`}
            className="flex items-center justify-center gap-2 text-ink-soft mt-2 mb-6 hover:text-ink transition-colors">
            <FontAwesomeIcon icon={faPhone} className="w-4 h-4" />
            {card.telephone}
          </a>
        )}

        <a
          href="/api/vcard"
          className="block w-full px-6 py-3 bg-ink text-ivory rounded-lg font-semibold hover:bg-ink-soft transition-colors mb-6">
          Ajouter à mes contacts
        </a>

        {card.liens.length > 0 && (
          <div className="space-y-3 pt-6 border-t border-silver-soft">
            {card.liens.map((lien) => (
              <a
                key={lien.url}
                href={lien.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 px-4 py-2.5 border border-silver-soft rounded-lg text-ink hover:border-ink transition-colors">
                <FontAwesomeIcon icon={iconForLabel(lien.label)} className="w-4 h-4" />
                {lien.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
