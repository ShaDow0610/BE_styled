import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWhatsapp, faInstagram, faFacebook, faTiktok } from "@fortawesome/free-brands-svg-icons";

const SOCIALS = [
  { url: process.env.NEXT_PUBLIC_INSTAGRAM_URL, icon: faInstagram, label: "Instagram" },
  { url: process.env.NEXT_PUBLIC_FACEBOOK_URL, icon: faFacebook, label: "Facebook" },
  { url: process.env.NEXT_PUBLIC_TIKTOK_URL, icon: faTiktok, label: "TikTok" },
].filter((s) => s.url);

export default function ContactPage() {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "000000000000";
  const message = "Bonjour, j'aimerais avoir plus d'informations sur vos produits Be Styled.";
  const whatsappLink = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

  return (
    <div className="container mx-auto px-4 py-16 text-center max-w-2xl">
      <p className="text-sm tracking-widest text-ink-soft/60 uppercase mb-3">Contact</p>
      <h1 className="font-serif text-4xl text-ink mb-4">Une question ?</h1>
      <p className="text-ink-soft mb-10">
        Nous répondons directement sur WhatsApp — le moyen le plus rapide de nous joindre
        pour une question sur un produit, une taille, ou pour passer commande.
      </p>

      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-3 px-8 py-4 bg-ink text-ivory rounded-lg font-semibold hover:bg-ink-soft transition-colors">
        <FontAwesomeIcon icon={faWhatsapp} className="w-5 h-5" />
        Nous écrire sur WhatsApp
      </a>

      {SOCIALS.length > 0 && (
        <div className="mt-16">
          <p className="text-sm font-semibold text-ink mb-4">Retrouvez-nous aussi sur</p>
          <div className="flex justify-center gap-4">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="w-11 h-11 rounded-full bg-ivory-soft flex items-center justify-center text-ink hover:bg-ink hover:text-ivory transition-colors">
                <FontAwesomeIcon icon={s.icon} className="w-5 h-5" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
