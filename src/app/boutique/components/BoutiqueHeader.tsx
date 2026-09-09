"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import gsap from "gsap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faTimes } from "@fortawesome/free-solid-svg-icons";

const NAV_ITEMS = [
  { href: "/boutique", label: "Accueil" },
  { href: "/boutique/catalogue", label: "Catalogue" },
  { href: "/boutique/looks", label: "Looks" },
  { href: "/boutique/contact", label: "Contact" },
];

export default function BoutiqueHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuRef.current) return;
    gsap.to(menuRef.current, {
      height: isOpen ? "auto" : 0,
      opacity: isOpen ? 1 : 0,
      duration: 0.3,
      ease: isOpen ? "power2.out" : "power2.in",
    });
  }, [isOpen]);

  return (
    <header className="bg-ink text-ivory shadow-lg sticky top-0 z-20">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/boutique" className="font-serif text-2xl tracking-wide text-ivory">
          BE STYLED
        </Link>

        <nav className="hidden md:flex gap-8 text-sm tracking-wide">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-silver transition-colors">
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          className="md:hidden"
          onClick={() => setIsOpen((v) => !v)}
          aria-label="Toggle menu">
          <FontAwesomeIcon icon={isOpen ? faTimes : faBars} className="w-6 h-6" />
        </button>
      </div>

      <div ref={menuRef} className="md:hidden overflow-hidden" style={{ height: 0, opacity: 0 }}>
        <div className="bg-ink-soft px-4 py-3 flex flex-col gap-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className="text-sm tracking-wide hover:text-silver transition-colors py-2">
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
