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
  faLayerGroup,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { useToast } from "@/components/common/ToastProvider";
import { useUserRole } from "@/lib/useUserRole";
import { formatXAF } from "@/lib/currency";
import { SkeletonKanban } from "@/components/common/Skeleton";

const CATEGORY_ICONS: Record<string, IconDefinition> = {
  pantalon: faSocks,
  chemise: faShirt,
  tricot: faShirt,
  culotte: faSocks,
  ensemble: faLayerGroup,
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
  couleurs_disponibles: string[];
  tailles_disponibles: string[];
  prix_actuel: number | null;
}

interface OrderEntry {
  _id: string;
  type: "reappro_fournisseur" | "commande_client";
  statut: string;
  quantite: number;
  couleur?: string;
  taille?: string;
  montant_total?: number | null;
  montant_encaisse?: number;
  facture_id?: string | null;
  product_id: { _id: string; nom: string } | null;
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
  const [bestSellerIds, setBestSellerIds] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedCouleur, setSelectedCouleur] = useState("");
  const [selectedTaille, setSelectedTaille] = useState("");
  const [quantite, setQuantite] = useState("1");
  const [error, setError] = useState("");
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"tous" | "commande_client" | "reappro_fournisseur">("tous");
  const [productFilter, setProductFilter] = useState("");
  const [factureMode, setFactureMode] = useState(false);
  const [selectedForInvoice, setSelectedForInvoice] = useState<Set<string>>(new Set());
  const draggedIdRef = useRef<string | null>(null);

  useEffect(() => {
    const session = localStorage.getItem("user");
    const userData = localStorage.getItem("user");
    if (!session) {
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
            couleurs_disponibles: p.couleurs_disponibles || [],
            tailles_disponibles: p.tailles_disponibles || [],
            prix_actuel: p.prix_actuel,
          }))
        )
      );
    // Utilisé pour remonter les articles les plus vendus en tête du
    // sélecteur de vente rapide — évite de chercher/scroller pour les
    // articles vendus tous les jours.
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((d) => {
        const top = d?.data?.ventes30j?.meilleuresVentes ?? [];
        setBestSellerIds(top.map((v: { productId: string }) => v.productId).filter(Boolean));
      })
      .catch(() => {});
  }, [router]);

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
    if (!selectedProduct) {
      setError("Choisis un produit");
      return;
    }
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: selectedProduct,
        couleur: selectedCouleur || undefined,
        taille: selectedTaille || undefined,
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
    setSelectedCouleur("");
    setSelectedTaille("");
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

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Rechercher par produit..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink bg-white"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className="px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink bg-white">
          <option value="tous">Tous types</option>
          <option value="commande_client">Ventes</option>
          <option value="reappro_fournisseur">Réappros</option>
        </select>
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink bg-white">
          <option value="">Tous produits</option>
          {products.map((p) => (
            <option key={p._id} value={p._id}>{p.nom}</option>
          ))}
        </select>
        {(typeFilter !== "tous" || productFilter || searchTerm) && (
          <button
            type="button"
            onClick={() => { setTypeFilter("tous"); setProductFilter(""); setSearchTerm(""); }}
            className="text-sm text-ink-soft underline hover:text-ink">
            Réinitialiser
          </button>
        )}
      </div>

      {showReapproForm && (
        <form onSubmit={handleCreateReappro} className="bg-white rounded-lg shadow p-6 mb-6 grid md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Produit</label>
            <select
              value={selectedProduct}
              onChange={(e) => { setSelectedProduct(e.target.value); setSelectedCouleur(""); setSelectedTaille(""); }}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink">
              <option value="">Choisir un produit</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>{p.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Couleur</label>
            <select
              value={selectedCouleur}
              onChange={(e) => setSelectedCouleur(e.target.value)}
              disabled={!selectedProduct}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink disabled:bg-ivory-soft">
              <option value="">—</option>
              {(products.find((p) => p._id === selectedProduct)?.couleurs_disponibles || []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Taille</label>
            <select
              value={selectedTaille}
              onChange={(e) => setSelectedTaille(e.target.value)}
              disabled={!selectedProduct}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink disabled:bg-ivory-soft">
              <option value="">—</option>
              {(products.find((p) => p._id === selectedProduct)?.tailles_disponibles || []).map((t) => (
                <option key={t} value={t}>{t}</option>
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
          bestSellerIds={bestSellerIds}
          onClose={() => setShowVenteModal(false)}
          onCreated={load}
        />
      )}

      {isLoading ? (
        <SkeletonKanban columns={6} />
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
                  .filter((o) => typeFilter === "tous" || o.type === typeFilter)
                  .filter((o) => !productFilter || o.product_id?._id === productFilter)
                  .filter((o) => {
                    if (!searchTerm) return true;
                    const term = searchTerm.toLowerCase();
                    return o.product_id?.nom?.toLowerCase().includes(term);
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
                        {o.product_id?.nom ?? "Produit supprimé"}
                      </p>
                      <p className="text-ink-soft/70 mt-1">
                        {[o.couleur, o.taille].filter(Boolean).join(" / ")}
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

interface PanierLigne {
  key: string;
  product: ProductOption;
  couleur: string | null;
  taille: string | null;
  quantite: number;
  prix: string;
}

function NouvelleVenteModal({
  products,
  bestSellerIds,
  onClose,
  onCreated,
}: {
  products: ProductOption[];
  bestSellerIds: string[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [selectedCouleur, setSelectedCouleur] = useState<string | null>(null);
  const [selectedTaille, setSelectedTaille] = useState<string | null>(null);
  const [prix, setPrix] = useState("");
  const [quantite, setQuantite] = useState("1");
  const [panier, setPanier] = useState<PanierLigne[]>([]);
  const [step, setStep] = useState<"produits" | "recap">("produits");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdOrderIds, setCreatedOrderIds] = useState<string[] | null>(null);
  const [isPastSale, setIsPastSale] = useState(false);
  const [dateVente, setDateVente] = useState(new Date().toISOString().slice(0, 10));
  const [montantEncaisse, setMontantEncaisse] = useState("");
  const [modePaiement, setModePaiement] = useState("especes");
  const [montantTotalConnu, setMontantTotalConnu] = useState("");

  // Les articles les plus vendus récemment remontent en premier — pas
  // besoin de chercher/scroller pour ceux vendus tous les jours.
  const availableProducts = products
    .filter((p) => p.nom.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const rankA = bestSellerIds.indexOf(a._id);
      const rankB = bestSellerIds.indexOf(b._id);
      if (rankA === -1 && rankB === -1) return 0;
      if (rankA === -1) return 1;
      if (rankB === -1) return -1;
      return rankA - rankB;
    });

  const handlePickProduct = (product: ProductOption) => {
    setSelectedProduct(product);
    setSelectedCouleur(null);
    setSelectedTaille(null);
    setPrix(product.prix_actuel != null ? String(product.prix_actuel) : "");
    setQuantite("1");
  };

  const needsChoice = selectedProduct
    ? (selectedProduct.couleurs_disponibles.length > 0 && selectedCouleur == null) ||
      (selectedProduct.tailles_disponibles.length > 0 && selectedTaille == null)
    : false;

  const reset = () => {
    setSelectedProduct(null);
    setSelectedCouleur(null);
    setSelectedTaille(null);
    setPrix("");
    setQuantite("1");
    setPanier([]);
    setStep("produits");
    setError("");
    setCreatedOrderIds(null);
    setIsPastSale(false);
    setDateVente(new Date().toISOString().slice(0, 10));
    setMontantEncaisse("");
    setModePaiement("especes");
    setMontantTotalConnu("");
  };

  const handleAddToPanier = () => {
    if (!selectedProduct) return;
    setPanier((prev) => [
      ...prev,
      {
        key: `${selectedProduct._id}-${selectedCouleur ?? ""}-${selectedTaille ?? ""}-${Date.now()}`,
        product: selectedProduct,
        couleur: selectedCouleur,
        taille: selectedTaille,
        quantite: Number(quantite) || 1,
        prix,
      },
    ]);
    setSelectedProduct(null);
    setSelectedCouleur(null);
    setSelectedTaille(null);
    setPrix("");
    setQuantite("1");
  };

  const handleRemoveLigne = (key: string) => {
    setPanier((prev) => prev.filter((l) => l.key !== key));
  };

  const panierTotal = panier.reduce((sum, l) => sum + (Number(l.prix) || 0) * l.quantite, 0);

  // Répartit un montant total connu (vente groupée à un prix global, ex:
  // "50 000 pour la chemise + le pantalon + le t-shirt") sur les lignes du
  // panier, proportionnellement au prix catalogue de chaque article — la
  // dernière ligne absorbe l'arrondi pour retomber exactement sur le total.
  const handleSplitTotal = () => {
    const totalAmount = Number(montantTotalConnu);
    if (!totalAmount || totalAmount <= 0 || panier.length === 0) return;

    const weights = panier.map((l) => {
      const catalogPrice = l.product.prix_actuel;
      return (catalogPrice && catalogPrice > 0 ? catalogPrice : 1) * l.quantite;
    });
    const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;

    let allocated = 0;
    setPanier((prev) =>
      prev.map((l, i) => {
        const isLast = i === prev.length - 1;
        const share = isLast
          ? Math.round((totalAmount - allocated) * 100) / 100
          : Math.round(((totalAmount * weights[i]) / totalWeight) * 100) / 100;
        allocated += share;
        const prixUnitaire = Math.round((share / l.quantite) * 100) / 100;
        return { ...l, prix: String(prixUnitaire) };
      })
    );
  };

  const handleSubmit = async () => {
    if (panier.length === 0) return;
    setError("");
    setIsSaving(true);
    try {
      const newIds: string[] = [];
      for (const ligne of panier) {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: ligne.product._id,
            couleur: ligne.couleur || undefined,
            taille: ligne.taille || undefined,
            type: "commande_client",
            quantite: ligne.quantite,
            prix_unitaire: Number(ligne.prix) || undefined,
            // Une vente passée est directement marquée livrée, à la vraie
            // date de la vente — sinon elle fausserait les statistiques du
            // jour de saisie au lieu du jour réel de la vente.
            ...(isPastSale ? { statut: "livre_client", date_maj: dateVente } : {}),
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Erreur lors de l'enregistrement");
        }
        newIds.push(data.data._id);
      }

      const encaisse = Number(montantEncaisse);
      if (isPastSale && encaisse > 0 && newIds.length > 0) {
        // Le paiement encaissé porte sur l'ensemble de la vente — rattaché
        // à la première ligne pour rester traçable sans le dupliquer.
        await fetch(`/api/orders/${newIds[0]}/payments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ montant: encaisse, mode_paiement: modePaiement, date_paiement: dateVente }),
        });
      }

      toast.success(panier.length > 1 ? "Vente enregistrée (plusieurs articles)" : "Vente enregistrée");
      setCreatedOrderIds(newIds);
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

        {createdOrderIds ? (
          <div className="text-center py-8">
            <p className="text-ink font-semibold mb-6">
              Vente enregistrée avec succès ({createdOrderIds.length} article{createdOrderIds.length > 1 ? "s" : ""}).
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href={`/orders/invoice/new?ids=${createdOrderIds.join(",")}`}
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
        ) : step === "recap" ? (
          <div>
            <button
              onClick={() => setStep("produits")}
              className="text-sm text-ink-soft underline hover:no-underline mb-4">
              ← Ajouter un autre article
            </button>

            <div className="border border-silver-soft rounded-lg divide-y divide-silver-soft mb-4">
              {panier.map((l) => (
                <div key={l.key} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">
                      {l.quantite}× {l.product.nom}
                    </p>
                    <p className="text-xs text-ink-soft/60">{[l.couleur, l.taille].filter(Boolean).join(" / ")}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <input
                      type="number" step="0.01" min="0"
                      value={l.prix}
                      onChange={(e) =>
                        setPanier((prev) => prev.map((x) => (x.key === l.key ? { ...x, prix: e.target.value } : x)))
                      }
                      className="w-28 px-2 py-1 border border-silver-soft rounded text-sm focus:outline-none focus:border-ink"
                    />
                    <button onClick={() => handleRemoveLigne(l.key)} className="text-red-600 hover:underline text-xs">
                      Retirer
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-right font-bold text-ink mb-4">Total : {formatXAF(panierTotal)}</p>

            {panier.length > 1 && (
              <div className="flex flex-wrap items-end gap-3 mb-4 pb-4 border-b border-silver-soft">
                <div>
                  <label className="block text-sm font-medium text-ink-soft mb-2">
                    Ou : montant total pour le tout (si pas de prix par article)
                  </label>
                  <input
                    type="number" step="0.01" min="0"
                    value={montantTotalConnu}
                    onChange={(e) => setMontantTotalConnu(e.target.value)}
                    placeholder="Ex: 50000"
                    className="w-48 px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSplitTotal}
                  disabled={!montantTotalConnu}
                  className="px-4 py-2 border border-ink text-ink rounded-lg text-sm hover:bg-ink hover:text-ivory transition-colors disabled:opacity-50">
                  Répartir sur les articles
                </button>
              </div>
            )}

            <div className="pt-2">
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <input type="checkbox" checked={isPastSale} onChange={(e) => setIsPastSale(e.target.checked)} />
                C&apos;est une vente déjà effectuée (à enregistrer rétroactivement)
              </label>
            </div>

            {isPastSale && (
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-ink-soft mb-2">Date de la vente</label>
                  <input
                    type="date" max={new Date().toISOString().slice(0, 10)}
                    value={dateVente}
                    onChange={(e) => setDateVente(e.target.value)}
                    className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-soft mb-2">Déjà encaissé (optionnel)</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={montantEncaisse}
                    onChange={(e) => setMontantEncaisse(e.target.value)}
                    placeholder="Laisser vide si rien reçu"
                    className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
                  />
                </div>
                {Number(montantEncaisse) > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-ink-soft mb-2">Mode de paiement</label>
                    <select
                      value={modePaiement}
                      onChange={(e) => setModePaiement(e.target.value)}
                      className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink">
                      <option value="especes">Espèces</option>
                      <option value="mobile_money">Mobile money</option>
                      <option value="virement">Virement</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSubmit}
                disabled={isSaving || panier.length === 0}
                className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors disabled:opacity-50">
                {isSaving ? "Enregistrement..." : "Enregistrer la vente"}
              </button>
            </div>
          </div>
        ) : !selectedProduct ? (
          <>
            {panier.length > 0 && (
              <div className="mb-4 p-3 bg-ivory-soft rounded-lg flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-ink">
                  Panier : {panier.length} article{panier.length > 1 ? "s" : ""} — {formatXAF(panierTotal)}
                </p>
                <button
                  onClick={() => setStep("recap")}
                  className="px-4 py-1.5 bg-ink text-ivory rounded-lg text-sm hover:bg-ink-soft transition-colors">
                  Voir le panier →
                </button>
              </div>
            )}
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
                    className="relative flex items-center gap-3 p-3 border border-silver-soft rounded-lg hover:border-ink hover:bg-ivory-soft transition-colors text-left">
                    {bestSellerIds.includes(p._id) && (
                      <span
                        title="Parmi les plus vendus récemment"
                        className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500"
                      />
                    )}
                    <FontAwesomeIcon icon={CATEGORY_ICONS[p.categorie] || faTags} className="w-5 h-5 text-ink-soft shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{p.nom}</p>
                      {p.prix_actuel != null && (
                        <p className="text-xs text-ink-soft/70">{formatXAF(p.prix_actuel)}</p>
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
              onClick={() => setSelectedProduct(null)}
              className="text-sm text-ink-soft underline hover:no-underline mb-4">
              ← Changer de produit
            </button>
            <p className="font-semibold text-ink mb-4">{selectedProduct.nom}</p>

            {selectedProduct.couleurs_disponibles.length > 0 && selectedCouleur == null && (
              <div>
                <p className="text-sm font-medium text-ink-soft mb-2">Couleur</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedProduct.couleurs_disponibles.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedCouleur(c)}
                      className="px-4 py-2 rounded-lg text-sm border border-silver-soft text-ink-soft hover:border-ink hover:text-ink">
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(selectedProduct.couleurs_disponibles.length === 0 || selectedCouleur != null) &&
              selectedProduct.tailles_disponibles.length > 0 && selectedTaille == null && (
              <div>
                <p className="text-sm font-medium text-ink-soft mb-2">Taille</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedProduct.tailles_disponibles.map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedTaille(t)}
                      className="px-4 py-2 rounded-lg text-sm border border-silver-soft text-ink-soft hover:border-ink hover:text-ink">
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!needsChoice && (
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

                <div className="sm:col-span-2 flex gap-3">
                  <button
                    onClick={handleAddToPanier}
                    className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors">
                    + Ajouter au panier
                  </button>
                  <button
                    onClick={() => { setSelectedCouleur(null); setSelectedTaille(null); }}
                    className="px-6 py-2 border border-silver-soft text-ink-soft rounded-lg hover:bg-ivory-soft transition-colors">
                    Changer
                  </button>
                </div>
              </div>
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
            <span>Encaissé {formatXAF(encaisse)} / {formatXAF(total)}</span>
            {reste > 0 && <span className="text-amber-600">Reste {formatXAF(reste)}</span>}
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
