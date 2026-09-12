import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock } from "@fortawesome/free-solid-svg-icons";
import { faInstagram, faFacebook, faTiktok } from "@fortawesome/free-brands-svg-icons";

const SOCIALS = [
  { url: process.env.NEXT_PUBLIC_INSTAGRAM_URL, icon: faInstagram, label: "Instagram" },
  { url: process.env.NEXT_PUBLIC_FACEBOOK_URL, icon: faFacebook, label: "Facebook" },
  { url: process.env.NEXT_PUBLIC_TIKTOK_URL, icon: faTiktok, label: "TikTok" },
].filter((s) => s.url);

export default function BoutiqueFooter() {
  return (
    <footer className="mt-20 border-t border-silver-soft bg-white">
      <div className="container mx-auto px-4 py-12 grid sm:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/icon-black.png" alt="" className="h-7 w-auto" />
            <p className="font-serif text-xl text-ink">BE STYLED</p>
          </div>
          <p className="text-sm text-ink-soft/70">Le style, votre signature.</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-ink mb-3">Navigation</p>
          <ul className="space-y-2 text-sm text-ink-soft/70">
            <li><Link href="/boutique/catalogue" className="hover:text-ink transition-colors">Catalogue</Link></li>
            <li><Link href="/boutique/looks" className="hover:text-ink transition-colors">Looks</Link></li>
            <li><Link href="/boutique/contact" className="hover:text-ink transition-colors">Contact</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-ink mb-3">Suivez-nous</p>
          {SOCIALS.length > 0 ? (
            <div className="flex gap-4">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-9 h-9 rounded-full bg-ivory-soft flex items-center justify-center text-ink hover:bg-ink hover:text-ivory transition-colors">
                  <FontAwesomeIcon icon={s.icon} className="w-4 h-4" />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-soft/50">Bientôt disponibles.</p>
          )}
        </div>
      </div>

      <div className="border-t border-silver-soft py-6 text-center text-sm text-ink-soft/60">
        <p>© {new Date().getFullYear()} Be Styled — Commandes via WhatsApp uniquement.</p>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 mt-3 text-xs text-ink-soft/40 hover:text-ink-soft transition-colors">
          <FontAwesomeIcon icon={faLock} className="w-3 h-3" />
          Espace équipe
        </Link>
      </div>
    </footer>
  );
}
