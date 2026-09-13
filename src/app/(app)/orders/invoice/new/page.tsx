"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/common/ToastProvider";
import { formatXAF } from "@/lib/currency";

interface OrderEntry {
  _id: string;
  quantite: number;
  couleur?: string;
  taille?: string;
  montant_total?: number | null;
  product_id: { nom: string } | null;
}

interface ProductOption {
  _id: string;
  nom: string;
  couleurs_disponibles: string[];
  tailles_disponibles: string[];
  prix_actuel: number | null;
}

export default function NewInvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ink"></div>
        </div>
      }>
      <NewInvoiceForm />
    </Suspense>
  );
}

function NewInvoiceForm() {
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const ids = (searchParams.get("ids") || "").split(",").filter(Boolean);

  const [orders, setOrders] = useState<OrderEntry[]>([]);
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({
    client_nom: "",
    client_telephone: "",
    client_adresse: "",
    date_facture: new Date().toISOString().slice(0, 10),
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const loadOrdersFor = async (idsList: string[]) => {
    const r = await fetch("/api/orders");
    const d = await r.json();
    const all: OrderEntry[] = d.data || [];
    setOrders(all.filter((o) => idsList.includes(o._id)));
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    Promise.all([
      fetch("/api/orders").then((r) => r.json()),
      fetch("/api/products?limit=100").then((r) => r.json()),
    ])
      .then(([ordersData, productsData]) => {
        const all: OrderEntry[] = ordersData.data || [];
        setOrders(all.filter((o) => ids.includes(o._id)));
        setProducts(
          (productsData.data || []).map((p: ProductOption) => ({
            _id: p._id,
            nom: p.nom,
            couleurs_disponibles: p.couleurs_disponibles || [],
            tailles_disponibles: p.tailles_disponibles || [],
            prix_actuel: p.prix_actuel,
          }))
        );
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const total = orders.reduce((sum, o) => sum + (o.montant_total ?? 0), 0);

  const handleAddProduct = async (payload: { product_id: string; couleur?: string; taille?: string; quantite: number; prix_unitaire?: number }) => {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "commande_client", ...payload }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Erreur lors de l'ajout du produit");
    }
    const newId = data.data._id;
    // La vente est déjà conclue (on facture immédiatement) — on marque
    // l'entrée comme livrée pour rester cohérent avec le kanban.
    await fetch(`/api/orders/${newId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: "livre_client" }),
    });
    setExtraIds((prev) => {
      const next = [...prev, newId];
      loadOrdersFor([...ids, ...next]);
      return next;
    });
  };

  const handleRemoveLine = async (orderId: string) => {
    await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
    setExtraIds((prev) => prev.filter((id) => id !== orderId));
    setOrders((prev) => prev.filter((o) => o._id !== orderId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.client_nom.trim()) {
      setError("Le nom du client est requis");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, order_tracking_ids: [...ids, ...extraIds] }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Échec de la création de la facture");
      }
      toast.success("Facture créée");
      router.push(`/invoices/${data.data._id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ink"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-serif text-3xl text-ink">Nouvelle facture</h1>
        <Link href="/orders" className="px-4 py-2 border border-silver-soft text-ink-soft rounded-lg hover:bg-ivory-soft transition-colors">
          ← Retour aux commandes
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="font-serif text-xl text-ink mb-4">Lignes sélectionnées</h2>
        {orders.length === 0 ? (
          <p className="text-red-600 text-sm">Aucune commande valide sélectionnée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-soft/70 border-b border-silver-soft">
                  <th className="py-2 pr-4">Produit</th>
                  <th className="py-2 pr-4">Couleur / Taille</th>
                  <th className="py-2 pr-4">Quantité</th>
                  <th className="py-2 pr-4">Montant</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id} className="border-b border-silver-soft/50">
                    <td className="py-2 pr-4 text-ink">{o.product_id?.nom ?? "Produit supprimé"}</td>
                    <td className="py-2 pr-4 text-ink-soft">{[o.couleur, o.taille].filter(Boolean).join(" / ")}</td>
                    <td className="py-2 pr-4 text-ink-soft">{o.quantite}</td>
                    <td className="py-2 pr-4 font-semibold text-ink">{formatXAF(o.montant_total ?? 0)}</td>
                    <td className="py-2 pr-4">
                      {extraIds.includes(o._id) && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(o._id)}
                          className="text-red-600 hover:underline text-xs">
                          Retirer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-right font-bold text-ink mt-3">Total : {formatXAF(total)}</p>
          </div>
        )}

        <AddProductLine products={products} onAdd={handleAddProduct} />
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-2">Nom du client</label>
          <input
            required
            value={form.client_nom}
            onChange={(e) => setForm({ ...form, client_nom: e.target.value })}
            className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-2">Téléphone (optionnel)</label>
          <input
            value={form.client_telephone}
            onChange={(e) => setForm({ ...form, client_telephone: e.target.value })}
            className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-ink-soft mb-2">Adresse (optionnel)</label>
          <input
            value={form.client_adresse}
            onChange={(e) => setForm({ ...form, client_adresse: e.target.value })}
            className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-2">Date de facture</label>
          <input
            type="date"
            value={form.date_facture}
            onChange={(e) => setForm({ ...form, date_facture: e.target.value })}
            className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
          />
        </div>
        {error && <p className="md:col-span-2 text-sm text-red-600">{error}</p>}
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={isSaving || orders.length === 0}
            className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors disabled:opacity-50">
            {isSaving ? "Création..." : "Créer la facture"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AddProductLine({
  products,
  onAdd,
}: {
  products: ProductOption[];
  onAdd: (payload: { product_id: string; couleur?: string; taille?: string; quantite: number; prix_unitaire?: number }) => Promise<void>;
}) {
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [productId, setProductId] = useState("");
  const [couleur, setCouleur] = useState("");
  const [taille, setTaille] = useState("");
  const [quantite, setQuantite] = useState("1");
  const [prix, setPrix] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedProduct = products.find((p) => p._id === productId) || null;

  const handlePick = (id: string) => {
    setProductId(id);
    const product = products.find((p) => p._id === id);
    setCouleur("");
    setTaille("");
    setPrix(product?.prix_actuel != null ? String(product.prix_actuel) : "");
  };

  const reset = () => {
    setProductId("");
    setCouleur("");
    setTaille("");
    setQuantite("1");
    setPrix("");
    setError("");
    setShowForm(false);
  };

  const handleAdd = async () => {
    if (!productId) return;
    setError("");
    setIsSaving(true);
    try {
      await onAdd({
        product_id: productId,
        couleur: couleur || undefined,
        taille: taille || undefined,
        quantite: Number(quantite) || 1,
        prix_unitaire: Number(prix) || undefined,
      });
      toast.success("Produit ajouté à la facture");
      reset();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!showForm) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="mt-4 text-sm text-ink underline hover:no-underline">
        + Ajouter un produit à cette facture
      </button>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-silver-soft space-y-4">
      <div>
        <label className="block text-sm font-medium text-ink-soft mb-2">Produit</label>
        <select
          value={productId}
          onChange={(e) => handlePick(e.target.value)}
          className="w-full max-w-sm px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink">
          <option value="">Choisir un produit</option>
          {products.map((p) => (
            <option key={p._id} value={p._id}>{p.nom}</option>
          ))}
        </select>
      </div>

      {selectedProduct && selectedProduct.couleurs_disponibles.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-2">Couleur</label>
          <div className="flex flex-wrap gap-2">
            {selectedProduct.couleurs_disponibles.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCouleur(c)}
                className={`px-3 py-1.5 rounded-lg text-sm border ${
                  couleur === c ? "bg-ink text-ivory border-ink" : "border-silver-soft text-ink-soft"
                }`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedProduct && selectedProduct.tailles_disponibles.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-2">Taille</label>
          <div className="flex flex-wrap gap-2">
            {selectedProduct.tailles_disponibles.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTaille(t)}
                className={`px-3 py-1.5 rounded-lg text-sm border ${
                  taille === t ? "bg-ink text-ivory border-ink" : "border-silver-soft text-ink-soft"
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedProduct && (
        <div className="grid sm:grid-cols-2 gap-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Prix unitaire</label>
            <input
              type="number" step="0.01" min="0"
              value={prix}
              onChange={(e) => setPrix(e.target.value)}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Quantité</label>
            <input
              type="number" min="1"
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
            />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleAdd}
          disabled={isSaving || !productId || !prix || Number(prix) <= 0}
          className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors disabled:opacity-50">
          {isSaving ? "Ajout..." : "Ajouter à la facture"}
        </button>
        <button
          type="button"
          onClick={reset}
          className="px-6 py-2 border border-silver-soft text-ink-soft rounded-lg hover:bg-ivory-soft transition-colors">
          Annuler
        </button>
      </div>
    </div>
  );
}
