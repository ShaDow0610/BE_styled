"use client";

import { useState } from "react";
import Link from "next/link";
import { useUserRole } from "@/lib/useUserRole";
import { useToast } from "@/components/common/ToastProvider";
import { formatXAF } from "@/lib/currency";

export interface ProductListItem {
  _id: string;
  nom: string;
  reference: string;
  categorie: string;
  origine: "import_chine" | "local";
  statut: string;
  couleurs_disponibles?: string[];
  tailles_disponibles?: string[];
  prix_actuel?: number | null;
}

interface ProductListProps {
  products: ProductListItem[];
  onChanged?: () => void;
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

export const ProductList: React.FC<ProductListProps> = ({ products, onChanged }) => {
  const { canWrite, isAdmin, canSeeFinancials } = useUserRole();
  const toast = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleToggleArchive = async (product: ProductListItem) => {
    const nextStatut = product.statut === "archive" ? "disponible" : "archive";
    setPendingId(product._id);
    try {
      const res = await fetch(`/api/products/${product._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: nextStatut }),
      });
      if (!res.ok) throw new Error("Échec de la mise à jour du statut");
      toast.success(nextStatut === "archive" ? "Produit archivé" : "Produit désarchivé");
      onChanged?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error(message);
    } finally {
      setPendingId(null);
    }
  };

  const handleDelete = async (product: ProductListItem) => {
    if (!window.confirm(`Supprimer définitivement "${product.nom}" ? Cette action supprime aussi ses prix et images. Elle est irréversible.`)) {
      return;
    }
    setPendingId(product._id);
    try {
      const res = await fetch(`/api/products/${product._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Échec de la suppression");
      toast.success("Produit supprimé");
      onChanged?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error(message);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-ink-soft/70 border-b border-silver-soft">
            <th className="py-3 px-4">Référence</th>
            <th className="py-3 px-4">Nom</th>
            <th className="py-3 px-4">Catégorie</th>
            <th className="py-3 px-4">Statut</th>
            <th className="py-3 px-4">Couleurs dispo.</th>
            <th className="py-3 px-4">Tailles dispo.</th>
            {canSeeFinancials && <th className="py-3 px-4">Prix</th>}
            <th className="py-3 px-4"></th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product._id} className="border-b border-silver-soft/50 hover:bg-ivory-soft/60">
              <td className="py-3 px-4 text-ink-soft whitespace-nowrap">{product.reference}</td>
              <td className="py-3 px-4 text-ink font-medium">
                <Link href={`/products/${product._id}`} className="hover:underline">
                  {product.nom}
                </Link>
              </td>
              <td className="py-3 px-4 text-ink-soft capitalize">{product.categorie}</td>
              <td className="py-3 px-4">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-ivory-soft text-ink-soft whitespace-nowrap">
                  {STATUT_LABELS[product.statut] ?? product.statut}
                </span>
              </td>
              <td className="py-3 px-4 text-ink-soft">
                {product.couleurs_disponibles && product.couleurs_disponibles.length > 0 ? product.couleurs_disponibles.join(", ") : "—"}
              </td>
              <td className="py-3 px-4 text-ink-soft">
                {product.tailles_disponibles && product.tailles_disponibles.length > 0 ? product.tailles_disponibles.join(", ") : "—"}
              </td>
              {canSeeFinancials && (
                <td className="py-3 px-4 text-ink font-semibold whitespace-nowrap">
                  {product.prix_actuel != null ? formatXAF(product.prix_actuel) : "—"}
                </td>
              )}
              <td className="py-3 px-4">
                <div className="flex items-center gap-3 whitespace-nowrap">
                  <Link href={`/products/${product._id}`} className="text-ink underline hover:no-underline">
                    Modifier
                  </Link>
                  {canWrite && (
                    <button
                      type="button"
                      disabled={pendingId === product._id}
                      onClick={() => handleToggleArchive(product)}
                      className="text-ink-soft underline hover:no-underline disabled:opacity-50">
                      {product.statut === "archive" ? "Désarchiver" : "Archiver"}
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      disabled={pendingId === product._id}
                      onClick={() => handleDelete(product)}
                      className="text-red-600 underline hover:no-underline disabled:opacity-50">
                      Supprimer
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductList;
