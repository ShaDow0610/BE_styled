"use client";

import Link from "next/link";
import { useUserRole } from "@/lib/useUserRole";
import { formatXAF } from "@/lib/currency";

export interface ProductListItem {
  _id: string;
  nom: string;
  reference: string;
  categorie: string;
  origine: "import_chine" | "local";
  statut: string;
  stock_total?: number;
  tailles?: string[];
  prix_actuel?: number | null;
  prix_a_partir_de?: number | null;
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
  const { canSeeFinancials } = useUserRole();

  return (
    <div className="bg-white rounded-lg shadow overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-ink-soft/70 border-b border-silver-soft">
            <th className="py-3 px-4">Référence</th>
            <th className="py-3 px-4">Nom</th>
            <th className="py-3 px-4">Catégorie</th>
            <th className="py-3 px-4">Statut</th>
            <th className="py-3 px-4">Stock</th>
            <th className="py-3 px-4">Tailles dispo.</th>
            {canSeeFinancials && <th className="py-3 px-4">Prix</th>}
            <th className="py-3 px-4"></th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product._id} className="border-b border-silver-soft/50 hover:bg-ivory-soft/60">
              <td className="py-3 px-4 text-ink-soft whitespace-nowrap">{product.reference}</td>
              <td className="py-3 px-4 text-ink font-medium">{product.nom}</td>
              <td className="py-3 px-4 text-ink-soft capitalize">{product.categorie}</td>
              <td className="py-3 px-4">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-ivory-soft text-ink-soft whitespace-nowrap">
                  {STATUT_LABELS[product.statut] ?? product.statut}
                </span>
              </td>
              <td className="py-3 px-4 text-ink-soft">{product.stock_total ?? 0}</td>
              <td className="py-3 px-4 text-ink-soft">
                {product.tailles && product.tailles.length > 0 ? product.tailles.join(", ") : "—"}
              </td>
              {canSeeFinancials && (
                <td className="py-3 px-4 text-ink font-semibold whitespace-nowrap">
                  {product.prix_actuel != null
                    ? formatXAF(product.prix_actuel)
                    : product.prix_a_partir_de != null
                      ? `à partir de ${formatXAF(product.prix_a_partir_de)}`
                      : "—"}
                </td>
              )}
              <td className="py-3 px-4">
                <Link href={`/products/${product._id}`} className="text-ink underline hover:no-underline whitespace-nowrap">
                  Modifier
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductList;
