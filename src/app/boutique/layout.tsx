import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock } from "@fortawesome/free-solid-svg-icons";

export default function BoutiqueLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ivory">
      <header className="bg-ink text-ivory shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/boutique" className="font-serif text-2xl tracking-wide text-ivory">
            BE STYLED
          </Link>
          <nav className="flex gap-6 text-sm tracking-wide">
            <Link href="/boutique" className="hover:text-silver transition-colors">
              Accueil
            </Link>
            <Link href="/boutique/catalogue" className="hover:text-silver transition-colors">
              Catalogue
            </Link>
            <Link href="/boutique/looks" className="hover:text-silver transition-colors">
              Looks
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="mt-20 border-t border-silver-soft py-8 text-center text-sm text-ink-soft/60">
        <p>© {new Date().getFullYear()} Be Styled — Commandes via WhatsApp uniquement.</p>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 mt-3 text-xs text-ink-soft/40 hover:text-ink-soft transition-colors">
          <FontAwesomeIcon icon={faLock} className="w-3 h-3" />
          Espace équipe
        </Link>
      </footer>
    </div>
  );
}
