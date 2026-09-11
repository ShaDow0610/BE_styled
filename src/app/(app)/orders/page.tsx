"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShirt,
  faSocks,
  faRing,
  faGem,
  faClock,
  faShoePrints,
  faHatCowboy,
  faGlasses,
  faTags,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { useToast } from "@/components/common/ToastProvider";
import { useUserRole } from "@/lib/useUserRole";

const CATEGORY_ICONS: Record<string, IconDefinition> = {
  pantalon: faSocks,
  chemise: faShirt,
  tricot: faShirt,
  culotte: faSocks,
  bracelet: faGem,
  montre: faClock,
  chaussure: faShoePrints,
  bague: faRing,
  chapeau: faHatCowboy,
  lunette: faGlasses,
  autre: faTags,
};

interface ProductOption {
  _id: string;
  nom: string;
  categorie: string;
  stock_total: number;
  prix_actuel: number | null;
}

interface VariantOption {
  _id: string;
  taille: string;
  couleur: string;
  modele?: string;
  stock_quantite: number;
  sku_variante: string;
  prix: number | null;
}

interface OrderEntry {
  _id: string;
  type: "reappro_fournisseur" | "commande_client";
  statut: string;
  quantite: number;
  montant_total?: number | null;
  montant_encaisse?: number;
  facture_id?: string | null;
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
  const toast = useToast();
  const { canSeeFinancials } = useUserRole();
  const [orders, setOrders] = useState<OrderEntry[]>([]);
  const [canWrite, setCanWrite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showReapproForm, setShowReapproForm] = useState(false);
  const [showVenteModal, setShowVenteModal] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [variants, setVariants] = useState<VariantOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedVariant, setSelectedVariant] = useState("");
  const [quantite, setQuantite] = useState("1");
  const [error, setError] = useState("");
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [factureMode, setFactureMode] = useState(false);
  const [selectedForInvoice, setSelectedForInvoice] = useState<Set<string>>(new Set());
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
      .then((d) =>
        setProducts(
          (d.data || []).map((p: ProductOption) => ({
            _id: p._id,
            nom: p.nom,
            categorie: p.categorie,
            stock_total: p.stock_total,
            prix_actuel: p.prix_actuel,
          }))
        )
      );
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

  const handleCreateReappro = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!selectedVariant) {
      setError("Choisis une variante");
      return;
    }
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_variant_id: selectedVariant,
        type: "reappro_fournisseur",
        quantite: Number(quantite) || 1,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      setError(data.error || "Erreur lors de la création");
      toast.error(data.error || "Erreur lors de la création");
      return;
    }
    setSelectedProduct("");
    setSelectedVariant("");
    setQuantite("1");
    setShowReapproForm(false);
    toast.success("Entrée créée");
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

  const toggleSelected = (orderId: string) => {
    setSelectedForInvoice((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="font-serif text-3xl text-ink">Suivi des commandes</h1>
        {canWrite && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => { setFactureMode((v) => !v); setSelectedForInvoice(new Set()); }}
              className={`px-6 py-2 rounded-lg transition-colors ${
                factureMode ? "bg-ink text-ivory" : "border border-silver-soft text-ink-soft hover:bg-ivory-soft"
              }`}>
              {factureMode ? "Annuler la sélection" : "Mode facturation"}
            </button>
            <button
              onClick={() => setShowVenteModal(true)}
              className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors">
              Nouvelle vente
            </button>
            <button
              onClick={() => setShowReapproForm((v) => !v)}
              className="px-6 py-2 border border-silver-soft text-ink-soft rounded-lg hover:bg-ivory-soft transition-colors">
              Réappro fournisseur
            </button>
          </div>
        )}
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Rechercher par produit ou SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink bg-white"
        />
      </div>

      {showReapproForm && (
        <form onSubmit={handleCreateReappro} className="bg-white rounded-lg shadow p-6 mb-6 grid md:grid-cols-4 gap-4">
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
            <label className="block text-sm font-medium text-ink-soft mb-2">Quantité</label>
            <input
              type="number"
              min="1"
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
            />
          </div>
          <div className="flex items-end">
            <button type="submit" className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors">
              Créer
            </button>
          </div>
          {error && <p className="md:col-span-4 text-sm text-red-600">{error}</p>}
        </form>
      )}

      {showVenteModal && (
        <NouvelleVenteModal
          products={products}
          onClose={() => setShowVenteModal(false)}
          onCreated={load}
        />
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
                  .filter((o) => {
                    if (!searchTerm) return true;
                    const term = searchTerm.toLowerCase();
                    return (
                      o.product_variant_id?.product_id?.nom?.toLowerCase().includes(term) ||
                      o.product_variant_id?.sku_variante?.toLowerCase().includes(term)
                    );
                  })
                  .map((o) => {
                    const eligible = o.type === "commande_client" && o.montant_total != null && !o.facture_id;
                    return (
                    <div
                      key={o._id}
                      draggable={canWrite && !factureMode}
                      onDragStart={() => { draggedIdRef.current = o._id; }}
                      className={`bg-white rounded-lg shadow p-3 text-xs ${canWrite && !factureMode ? "cursor-move" : ""}`}>
                      {factureMode && o.type === "commande_client" && (
                        <div
                          className="flex items-center justify-between mb-2"
                          onClick={(e) => e.stopPropagation()}>
                          <label className="flex items-center gap-1.5 text-[11px] text-ink-soft">
                            <input
                              type="checkbox"
                              disabled={!eligible}
                              checked={selectedForInvoice.has(o._id)}
                              onChange={() => toggleSelected(o._id)}
                            />
                            Sélectionner
                          </label>
                          {o.facture_id && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px]">
                              Facturé
                            </span>
                          )}
                        </div>
                      )}
                      <p className="font-medium text-ink">
                        {o.product_variant_id?.product_id?.nom ?? "Produit supprimé"}
                      </p>
                      <p className="text-ink-soft/70 mt-1">
                        {o.product_variant_id?.sku_variante}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="px-2 py-0.5 rounded-full bg-ivory-soft text-ink-soft text-[10px]">
                          {TYPE_LABELS[o.type]}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-ivory-soft text-ink-soft text-[10px]">
                          x{o.quantite}
                        </span>
                      </div>
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
                      {o.type === "commande_client" && canSeeFinancials && (
                        <PaymentSection
                          order={o}
                          canWrite={canWrite}
                          onPaid={load}
                        />
                      )}
                    </div>
                  );
                  })}
              </div>
            </div>
          ))}
        </div>
      )}

      {factureMode && selectedForInvoice.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-ink text-ivory shadow-lg py-4 px-6 flex flex-col sm:flex-row justify-between items-center gap-3 z-30">
          <span className="text-sm">{selectedForInvoice.size} commande(s) sélectionnée(s)</span>
          <Link
            href={`/orders/invoice/new?ids=${Array.from(selectedForInvoice).join(",")}`}
            className="px-6 py-2 bg-ivory text-ink rounded-lg font-semibold hover:bg-silver-soft transition-colors">
            Générer une facture ({selectedForInvoice.size})
          </Link>
        </div>
      )}
    </div>
  );
}

function NouvelleVenteModal({
  products,
  onClose,
  onCreated,
}: {
  products: ProductOption[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [variants, setVariants] = useState<VariantOption[]>([]);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);
  const [selectedModele, setSelectedModele] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<VariantOption | null>(null);
  const [prix, setPrix] = useState("");
  const [quantite, setQuantite] = useState("1");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  const availableProducts = products
    .filter((p) => p.stock_total > 0)
    .filter((p) => p.nom.toLowerCase().includes(search.toLowerCase()));

  const handlePickProduct = async (product: ProductOption) => {
    setSelectedProduct(product);
    setSelectedModele(null);
    setSelectedVariant(null);
    setIsLoadingVariants(true);
    try {
      const res = await fetch(`/api/products/${product._id}/variants`);
      const data = await res.json();
      setVariants((data.data || []).filter((v: VariantOption) => v.stock_quantite > 0));
    } finally {
      setIsLoadingVariants(false);
    }
  };

  const modeles = Array.from(new Set(variants.map((v) => v.modele).filter((m): m is string => !!m)));
  const variantsAffiches = modeles.length > 0
    ? variants.filter((v) => v.modele === selectedModele)
    : variants;

  const handlePickVariant = (variant: VariantOption) => {
    setSelectedVariant(variant);
    setPrix(variant.prix != null ? String(variant.prix) : "");
  };

  const reset = () => {
    setSelectedProduct(null);
    setVariants([]);
    setSelectedModele(null);
    setSelectedVariant(null);
    setPrix("");
    setQuantite("1");
    setError("");
    setCreatedOrderId(null);
  };

  const handleSubmit = async () => {
    if (!selectedVariant) return;
    setError("");
    setIsSaving(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_variant_id: selectedVariant._id,
          type: "commande_client",
          quantite: Number(quantite) || 1,
          prix_unitaire: Number(prix) || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erreur lors de l'enregistrement");
      }
      toast.success("Vente enregistrée");
      setCreatedOrderId(data.data._id);
      onCreated();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/60 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-serif text-2xl text-ink">Nouvelle vente</h2>
          <button onClick={onClose} className="text-ink-soft hover:text-ink text-2xl leading-none">×</button>
        </div>

        {createdOrderId ? (
          <div className="text-center py-8">
            <p className="text-ink font-semibold mb-6">Vente enregistrée avec succès.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href={`/orders/invoice/new?ids=${createdOrderId}`}
                className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors">
                Imprimer la facture
              </Link>
              <button
                onClick={reset}
                className="px-6 py-2 border border-silver-soft text-ink-soft rounded-lg hover:bg-ivory-soft transition-colors">
                Nouvelle vente
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 border border-silver-soft text-ink-soft rounded-lg hover:bg-ivory-soft transition-colors">
                Fermer
              </button>
            </div>
          </div>
        ) : !selectedProduct ? (
          <>
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink mb-4"
            />
            {availableProducts.length === 0 ? (
              <p className="text-ink-soft/70 text-sm">Aucun produit en stock.</p>
            ) : (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {availableProducts.map((p) => (
                  <button
                    key={p._id}
                    onClick={() => handlePickProduct(p)}
                    className="flex items-center gap-3 p-3 border border-silver-soft rounded-lg hover:border-ink hover:bg-ivory-soft transition-colors text-left">
                    <FontAwesomeIcon icon={CATEGORY_ICONS[p.categorie] || faTags} className="w-5 h-5 text-ink-soft shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{p.nom}</p>
                      {p.prix_actuel != null && (
                        <p className="text-xs text-ink-soft/70">{p.prix_actuel.toLocaleString()}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div>
            <button
              onClick={() => { setSelectedProduct(null); setVariants([]); }}
              className="text-sm text-ink-soft underline hover:no-underline mb-4">
              ← Changer de produit
            </button>
            <p className="font-semibold text-ink mb-4">{selectedProduct.nom}</p>

            {isLoadingVariants ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ink"></div>
              </div>
            ) : variants.length === 0 ? (
              <p className="text-ink-soft/70 text-sm">Aucune variante en stock pour ce produit.</p>
            ) : (
              <>
                {modeles.length > 0 && !selectedModele && (
                  <div>
                    <p className="text-sm font-medium text-ink-soft mb-2">Modèle</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {modeles.map((m) => (
                        <button
                          key={m}
                          onClick={() => setSelectedModele(m)}
                          className="px-4 py-2 rounded-lg text-sm border border-silver-soft text-ink-soft hover:border-ink hover:text-ink">
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {(modeles.length === 0 || selectedModele) && !selectedVariant && (
                  <div>
                    <p className="text-sm font-medium text-ink-soft mb-2">Taille / Couleur</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {variantsAffiches.map((v) => (
                        <button
                          key={v._id}
                          onClick={() => handlePickVariant(v)}
                          className="px-4 py-2 rounded-lg text-sm border border-silver-soft text-ink-soft hover:border-ink hover:text-ink">
                          {v.taille} / {v.couleur}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedVariant && (
                  <div className="grid sm:grid-cols-2 gap-4 mt-4">
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
                    {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
                    <div className="sm:col-span-2 flex gap-3">
                      <button
                        onClick={handleSubmit}
                        disabled={isSaving || !prix || Number(prix) <= 0}
                        className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors disabled:opacity-50">
                        {isSaving ? "Enregistrement..." : "Enregistrer la vente"}
                      </button>
                      <button
                        onClick={() => setSelectedVariant(null)}
                        className="px-6 py-2 border border-silver-soft text-ink-soft rounded-lg hover:bg-ivory-soft transition-colors">
                        Changer
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const MODE_LABELS: Record<string, string> = {
  especes: "Espèces",
  mobile_money: "Mobile money",
  virement: "Virement",
  autre: "Autre",
};

function PaymentSection({
  order,
  canWrite,
  onPaid,
}: {
  order: OrderEntry;
  canWrite: boolean;
  onPaid: () => void;
}) {
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [montant, setMontant] = useState("");
  const [mode, setMode] = useState("especes");
  const [isSaving, setIsSaving] = useState(false);

  const total = order.montant_total ?? 0;
  const encaisse = order.montant_encaisse ?? 0;
  const reste = Math.max(0, total - encaisse);
  const pct = total > 0 ? Math.min(100, Math.round((encaisse / total) * 100)) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(montant);
    if (!value || value <= 0) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/orders/${order._id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ montant: value, mode_paiement: mode }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Erreur lors de l'enregistrement du paiement");
        return;
      }
      toast.success("Paiement enregistré");
      setMontant("");
      setShowForm(false);
      onPaid();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-2 pt-2 border-t border-silver-soft/60" onClick={(e) => e.stopPropagation()}>
      {order.montant_total != null ? (
        <>
          <div className="flex justify-between text-[10px] text-ink-soft/70 mb-1">
            <span>Encaissé ${encaisse.toLocaleString()} / ${total.toLocaleString()}</span>
            {reste > 0 && <span className="text-amber-600">Reste ${reste.toLocaleString()}</span>}
          </div>
          <div className="w-full h-1.5 bg-ivory-soft rounded-full overflow-hidden">
            <div
              className={`h-full ${pct >= 100 ? "bg-emerald-600" : "bg-ink"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </>
      ) : (
        <p className="text-[10px] text-ink-soft/50">Prix non défini pour ce produit</p>
      )}

      {canWrite && (
        <>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="mt-2 text-[11px] text-ink underline hover:no-underline">
              + Paiement
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-1.5">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Montant"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                className="w-full text-[11px] px-2 py-1 border border-silver-soft rounded"
              />
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full text-[11px] px-2 py-1 border border-silver-soft rounded">
                {Object.entries(MODE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 text-[11px] px-2 py-1 bg-ink text-ivory rounded disabled:opacity-50">
                  Valider
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 text-[11px] px-2 py-1 border border-silver-soft text-ink-soft rounded">
                  Annuler
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
