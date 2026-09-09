"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faPencil, faEye } from "@fortawesome/free-solid-svg-icons";

gsap.registerPlugin(ScrollTrigger);

interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  sku: string;
  images?: string[];
}

interface ProductListProps {
  products: Product[];
  onEdit?: (product: Product) => void;
  onDelete?: (id: string) => void;
  onView?: (product: Product) => void;
}

export const ProductList: React.FC<ProductListProps> = ({
  products,
  onEdit,
  onDelete,
  onView,
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!listRef.current) return;

    // Animer chaque item avec ScrollTrigger
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
        <div
          key={product._id}
          ref={(el) => {
            itemsRef.current[index] = el;
          }}
          className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-ink">
                {product.name}
              </h3>
              <div className="flex gap-4 mt-2 text-sm text-ink-soft/70">
                <span>SKU: {product.sku}</span>
                <span className="capitalize">
                  Catégorie: {product.category}
                </span>
              </div>
              <p className="text-xl font-bold text-ink mt-2">
                ${product.price}
              </p>
            </div>

            <div className="flex gap-2">
              {onView && (
                <button
                  onClick={() => onView(product)}
                  className="p-2 bg-ink text-ivory rounded hover:bg-ink-soft transition-colors"
                  title="Voir">
                  <FontAwesomeIcon icon={faEye} className="w-4 h-4" />
                </button>
              )}
              {onEdit && (
                <button
                  onClick={() => onEdit(product)}
                  className="p-2 bg-silver text-ink rounded hover:bg-silver-soft transition-colors"
                  title="Éditer">
                  <FontAwesomeIcon icon={faPencil} className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(product._id)}
                  className="p-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  title="Supprimer">
                  <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductList;
