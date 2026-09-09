"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export interface ProductListItem {
  _id: string;
  nom: string;
  reference: string;
  categorie: string;
  origine: "import_chine" | "local";
  statut: string;
  stock_total?: number;
  prix_actuel?: number | null;
}

interface ProductListProps {
  products: ProductListItem[];
}

const STATUT_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  en_commande: "En commande",
  en_transit: "En transit",
  en_confection: "En confection",
  disponible: "Disponible",
  rupture: "Rupture",
  archive: "Archivé",
};

export const ProductList: React.FC<ProductListProps> = ({ products }) => {
  const listRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    if (!listRef.current) return;

    itemsRef.current.forEach((item, index) => {
      if (item) {
        gsap.fromTo(
          item,
          { opacity: 0, x: -50 },
          {
            opacity: 1,
            x: 0,
            duration: 0.5,
            delay: index * 0.1,
            scrollTrigger: {
              trigger: item,
              start: "top 85%",
              once: true,
            },
          },
        );
      }
    });

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, [products]);

  return (
    <div ref={listRef} className="space-y-4">
      {products.map((product, index) => (
        <Link
          key={product._id}
          href={`/products/${product._id}`}
          ref={(el) => {
            itemsRef.current[index] = el;
          }}
          className="block bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-ink">{product.nom}</h3>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-ink-soft/70">
                <span>Réf: {product.reference}</span>
                <span className="capitalize">Catégorie: {product.categorie}</span>
                <span>Stock: {product.stock_total ?? 0}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {product.prix_actuel != null && (
                <p className="text-xl font-bold text-ink">${product.prix_actuel}</p>
              )}
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-ivory-soft text-ink-soft">
                {STATUT_LABELS[product.statut] ?? product.statut}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default ProductList;
