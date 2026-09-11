"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/common/ToastProvider";

interface OrderEntry {
  _id: string;
  quantite: number;
  montant_total?: number | null;
  product_variant_id: {
    sku_variante: string;
    product_id: { nom: string };
  } | null;
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
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({
    client_nom: "",
    client_telephone: "",
    client_adresse: "",
    date_facture: new Date().toISOString().slice(0, 10),
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => {
        const all: OrderEntry[] = d.data || [];
        setOrders(all.filter((o) => ids.includes(o._id)));
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const total = orders.reduce((sum, o) => sum + (o.montant_total ?? 0), 0);

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
        body: JSON.stringify({ ...form, order_tracking_ids: ids }),
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
                  <th className="py-2 pr-4">SKU</th>
                  <th className="py-2 pr-4">Quantité</th>
                  <th className="py-2 pr-4">Montant</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id} className="border-b border-silver-soft/50">
                    <td className="py-2 pr-4 text-ink">{o.product_variant_id?.product_id?.nom ?? "Produit supprimé"}</td>
                    <td className="py-2 pr-4 text-ink-soft">{o.product_variant_id?.sku_variante}</td>
                    <td className="py-2 pr-4 text-ink-soft">{o.quantite}</td>
                    <td className="py-2 pr-4 font-semibold text-ink">{(o.montant_total ?? 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-right font-bold text-ink mt-3">Total : {total.toLocaleString()}</p>
          </div>
        )}
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
