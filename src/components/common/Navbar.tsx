"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import gsap from "gsap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faTimes,
  faBox,
  faCubes,
  faCog,
  faShirt,
  faTruck,
} from "@fortawesome/free-solid-svg-icons";

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (isOpen && menuRef.current) {
      gsap.to(menuRef.current, {
        height: "auto",
        opacity: 1,
        duration: 0.3,
        ease: "power2.out",
      });
    } else if (menuRef.current) {
      gsap.to(menuRef.current, {
        height: 0,
        opacity: 0,
        duration: 0.3,
        ease: "power2.in",
      });
    }
  }, [isOpen]);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: faCubes },
    { href: "/products", label: "Produits", icon: faBox },
    { href: "/looks", label: "Looks", icon: faShirt },
    { href: "/orders", label: "Commandes", icon: faTruck },
    { href: "/admin", label: "Admin", icon: faCog },
  ];

  return (
    <nav ref={navRef} className="bg-ink text-ivory shadow-lg">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link
          href="/dashboard"
          className="font-serif text-2xl tracking-wide text-ivory">
          BE STYLED
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 text-sm tracking-wide hover:text-silver transition-colors">
              <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu">
          <FontAwesomeIcon
            icon={isOpen ? faTimes : faBars}
            className="w-6 h-6"
          />
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        ref={menuRef}
        className="md:hidden overflow-hidden"
        style={{ height: 0, opacity: 0 }}>
        <div className="bg-ink-soft px-4 py-3 flex flex-col gap-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 text-sm tracking-wide hover:text-silver transition-colors py-2"
              onClick={() => setIsOpen(false)}>
              <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
