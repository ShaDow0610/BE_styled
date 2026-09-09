"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface ProductOption {
  _id: string;
  nom: string;
}

interface VariantOption {
  _id: string;
  taille: string;
  couleur: string;
  sku_variante: string;
}

interface OrderEntry {
  _id: string;
  type: "reappro_fournisseur" | "commande_client";
  statut: string;
  product_variant_id: {
    sku_variante: string;
    taille: string;
    couleur: string;
    product_id: { nom: string };
  } | null;
}

const STATUSES = [
  { key: "commande", label: "Commandé" },
  { key: "en_transit", label: "En transit" },
  { key: "recu", label: "Reçu" },
  { key: "en_confection", label: "En confection" },
  { key: "pret", label: "Prêt" },
  { key: "livre_client", label: "Livré" },
];

const TYPE_LABELS: Record<string, string> = {
  reappro_fournisseur: "Réappro fournisseur",
  commande_client: "Commande client",
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderEntry[]>([]);
  const [canWrite, setCanWrite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [variants, setVariants] = useState<VariantOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedVariant, setSelectedVariant] = useState("");
  const [selectedType, setSelectedType] = useState<"reappro_fournisseur" | "commande_client">("reappro_fournisseur");
  const [error, setError] = useState("");
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const draggedIdRef = useRef<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (!token) {
      router.push("/login");
      return;
    }
    if (userData) {
      const role = JSON.parse(userData).role;
      setCanWrite(role === "admin" || role === "gestion_stock");
    }
    load();
    fetch("/api/products?limit=100")
      .then((r) => r.json())
      .then((d) => setProducts(d.data.map((p: { _id: string; nom: string }) => ({ _id: p._id, nom: p.nom }))));
  }, [router]);

  useEffect(() => {
    if (!selectedProduct) {
      setVariants([]);
      return;
    }
    fetch(`/api/products/${selectedProduct}/variants`)
      .then((r) => r.json())
      .then((d) => setVariants(d.data));
  }, [selectedProduct]);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/orders");
      if (res.ok) setOrders((await res.json()).data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!selectedVariant) {
      setError("Choisis une variante");
      return;
    }
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_variant_id: selectedVariant, type: selectedType }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      setError(data.error || "Erreur lors de la création");
      return;
    }
    setSelectedProduct("");
    setSelectedVariant("");
    setShowForm(false);
    load();
  };

  const updateStatus = async (orderId: string, statut: string) => {
    setOrders((prev) => prev.map((o) => (o._id === orderId ? { ...o, statut } : o)));
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut }),
    });
  };

  const handleDrop = async (statut: string) => {
    setDragOverColumn(null);
    const orderId = draggedIdRef.current;
    if (!orderId) return;
    updateStatus(orderId, statut);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-serif text-3xl text-ink">Suivi des commandes</h1>
        {canWrite && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors">
            Nouvelle entrée
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-lg shadow p-6 mb-6 grid md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Produit</label>
            <select
              value={selectedProduct}
              onChange={(e) => { setSelectedProduct(e.target.value); setSelectedVariant(""); }}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink">
              <option value="">Choisir un produit</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>{p.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Variante</label>
            <select
              value={selectedVariant}
              onChange={(e) => setSelectedVariant(e.target.value)}
              disabled={!selectedProduct}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink disabled:bg-ivory-soft">
              <option value="">Choisir une variante</option>
              {variants.map((v) => (
                <option key={v._id} value={v._id}>{v.sku_variante} ({v.taille}/{v.couleur})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as typeof selectedType)}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink">
              <option value="reappro_fournisseur">Réappro fournisseur</option>
              <option value="commande_client">Commande client</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors">
              Créer
            </button>
          </div>
          {error && <p className="md:col-span-4 text-sm text-red-600">{error}</p>}
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ink"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {STATUSES.map((col) => (
            <div
              key={col.key}
              onDragOver={(e) => { e.preventDefault(); setDragOverColumn(col.key); }}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => { e.preventDefault(); handleDrop(col.key); }}
              className={`rounded-lg p-3 min-h-[200px] transition-colors ${
                dragOverColumn === col.key ? "bg-silver-soft/60" : "bg-ivory-soft"
              }`}>
              <h3 className="font-semibold text-ink text-sm mb-3">{col.label}</h3>
              <div className="space-y-2">
                {orders
                  .filter((o) => o.statut === col.key)
                  .map((o) => (
                    <div
                      key={o._id}
                      draggable={canWrite}
                      onDragStart={() => { draggedIdRef.current = o._id; }}
                      className={`bg-white rounded-lg shadow p-3 text-xs ${canWrite ? "cursor-move" : ""}`}>
                      <p className="font-medium text-ink">
                        {o.product_variant_id?.product_id?.nom ?? "Produit supprimé"}
                      </p>
                      <p className="text-ink-soft/70 mt-1">
                        {o.product_variant_id?.sku_variante}
                      </p>
                      <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-ivory-soft text-ink-soft text-[10px]">
                        {TYPE_LABELS[o.type]}
                      </span>
                      {canWrite && (
                        <select
                          value={o.statut}
                          onChange={(e) => updateStatus(o._id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="md:hidden mt-2 w-full text-[11px] px-2 py-1 border border-silver-soft rounded">
                          {STATUSES.map((s) => (
                            <option key={s.key} value={s.key}>{s.label}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
