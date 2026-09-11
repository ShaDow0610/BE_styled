"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Look {
  _id: string;
  nom: string;
  prix_pack: number;
  photo_couverture?: string;
  item_count: number;
}

const EMPTY_FORM = { nom: "", prix_pack: "", photo_couverture: "" };

export default function LooksPage() {
  const router = useRouter();
  const [looks, setLooks] = useState<Look[]>([]);
  const [canWrite, setCanWrite] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setIsUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Échec du téléversement");
      }
      setForm((f) => ({ ...f, photo_couverture: data.data.url }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

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
  }, [router]);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/looks");
      if (res.ok) setLooks((await res.json()).data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/looks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, prix_pack: Number(form.prix_pack) || 0 }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      setError(data.error || "Erreur lors de la création");
      return;
    }
    router.push(`/looks/${data.data._id}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-serif text-3xl text-ink">Looks</h1>
        {canWrite && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors">
            Nouveau look
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-6 grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Nom</label>
            <input required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })}
              placeholder='Ex: "Look Business Casual"'
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Prix pack</label>
            <input type="number" step="0.01" min="0" required value={form.prix_pack} onChange={(e) => setForm({ ...form, prix_pack: e.target.value })}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">Photo de couverture</label>
            <input type="file" accept="image/*" onChange={handleFileChange}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink file:mr-3 file:px-3 file:py-1 file:rounded file:border-0 file:bg-ink file:text-ivory file:text-sm" />
            {isUploading && <p className="text-xs text-ink-soft/70 mt-1">Téléversement...</p>}
            {form.photo_couverture && !isUploading && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.photo_couverture} alt="Aperçu" className="mt-2 h-16 w-16 object-cover rounded border border-silver-soft" />
            )}
          </div>
          {error && <p className="md:col-span-3 text-sm text-red-600">{error}</p>}
          <div className="md:col-span-3">
            <button type="submit" disabled={isUploading} className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors disabled:opacity-50">
              Créer et ajouter des articles
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ink"></div>
        </div>
      ) : looks.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-ink-soft/70">Aucun look pour le moment.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {looks.map((look) => (
            <Link
              key={look._id}
              href={`/looks/${look._id}`}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
              {look.photo_couverture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={look.photo_couverture} alt={look.nom} className="w-full h-40 object-cover bg-ivory-soft" />
              ) : (
                <div className="w-full h-40 bg-ivory-soft" />
              )}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-ink">{look.nom}</h3>
                <p className="text-ink-soft/70 text-sm mt-1">{look.item_count} article(s)</p>
                <p className="text-xl font-bold text-ink mt-2">${look.prix_pack}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
