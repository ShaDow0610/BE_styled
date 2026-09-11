"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatXAF } from "@/lib/currency";

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

interface LookItem {
  _id: string;
  prix: number | null;
  product_variant_id: {
    _id: string;
    taille: string;
    couleur: string;
    sku_variante: string;
    product_id: { nom: string };
  };
}

interface Look {
  _id: string;
  nom: string;
  prix_pack: number;
  photo_couverture?: string;
  items: LookItem[];
}

export default function LookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [look, setLook] = useState<Look | null>(null);
  const [canWrite, setCanWrite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [variants, setVariants] = useState<VariantOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedVariant, setSelectedVariant] = useState("");
  const [error, setError] = useState("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Échec du téléversement");
      await fetch(`/api/looks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo_couverture: data.data.url }),
      });
      load();
    } catch {
      // silencieux : l'utilisateur peut réessayer
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/looks/${id}`);
      if (res.ok) setLook((await res.json()).data);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

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
  }, [load, router]);

  useEffect(() => {
    if (!selectedProduct) {
      setVariants([]);
      return;
    }
    fetch(`/api/products/${selectedProduct}/variants`)
      .then((r) => r.json())
      .then((d) => setVariants(d.data));
  }, [selectedProduct]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!selectedVariant) {
      setError("Choisis une variante");
      return;
    }
    const res = await fetch(`/api/looks/${id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_variant_id: selectedVariant }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      setError(data.error || "Erreur lors de l'ajout");
      return;
    }
    setSelectedProduct("");
    setSelectedVariant("");
    load();
  };

  const handleRemoveItem = async (itemId: string) => {
    await fetch(`/api/looks/${id}/items/${itemId}`, { method: "DELETE" });
    load();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ink"></div>
      </div>
    );
  }

  if (!look) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-ink-soft/70 mb-4">Look introuvable.</p>
        <Link href="/looks" className="text-ink underline">Retour aux looks</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          {look.photo_couverture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={look.photo_couverture} alt={look.nom} className="h-16 w-16 object-cover rounded border border-silver-soft" />
          ) : (
            <div className="h-16 w-16 rounded bg-ivory-soft border border-silver-soft" />
          )}
          <div>
            <h1 className="font-serif text-3xl text-ink">{look.nom}</h1>
            <p className="text-ink-soft/70 text-sm">Prix pack: {formatXAF(look.prix_pack)}</p>
            {canWrite && (
              <label className="text-xs text-ink underline hover:no-underline cursor-pointer mt-1 inline-block">
                {isUploadingPhoto ? "Téléversement..." : "Changer la photo"}
                <input type="file" accept="image/*" onChange={handlePhotoChange} disabled={isUploadingPhoto} className="hidden" />
              </label>
            )}
          </div>
        </div>
        <Link href="/looks" className="px-4 py-2 border border-silver-soft text-ink-soft rounded-lg hover:bg-ivory-soft transition-colors">
          ← Retour
        </Link>
      </div>

      {canWrite && (
        <form onSubmit={handleAddItem} className="bg-white rounded-lg shadow p-6 mb-6 grid md:grid-cols-3 gap-4">
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
          <div className="flex items-end">
            <button type="submit" className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors">
              Ajouter au look
            </button>
          </div>
          {error && <p className="md:col-span-3 text-sm text-red-600">{error}</p>}
        </form>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-serif text-xl text-ink mb-4">Articles du look</h2>
        {look.items.length === 0 ? (
          <p className="text-ink-soft/70 text-sm">Aucun article ajouté pour le moment.</p>
        ) : (
          <ul className="divide-y divide-silver-soft">
            {look.items.map((item) => (
              <li key={item._id} className="flex justify-between items-center py-3 text-sm">
                <div>
                  <p className="font-medium text-ink">{item.product_variant_id.product_id.nom}</p>
                  <p className="text-ink-soft/70">
                    {item.product_variant_id.sku_variante} · {item.product_variant_id.taille}/{item.product_variant_id.couleur}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-ink-soft">
                    {item.prix != null ? formatXAF(item.prix) : "Prix non défini"}
                  </span>
                  {canWrite && (
                    <button onClick={() => handleRemoveItem(item._id)} className="text-red-600 hover:underline text-xs">
                      Retirer
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
