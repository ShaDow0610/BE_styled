"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatXAF } from "@/lib/currency";
import { SkeletonTable } from "@/components/common/Skeleton";
import { useUserRole } from "@/lib/useUserRole";
import { useToast } from "@/components/common/ToastProvider";
import { activeToggleClasses } from "@/lib/statusColors";

interface Look {
  _id: string;
  nom: string;
  prix_pack: number;
  photo_couverture?: string;
  item_count: number;
  statut: "actif" | "archive";
}

const EMPTY_FORM = { nom: "", prix_pack: "", photo_couverture: "" };

export default function LooksPage() {
  const router = useRouter();
  const toast = useToast();
  const { canWrite, isAdmin } = useUserRole();
  const [looks, setLooks] = useState<Look[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

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
    const session = localStorage.getItem("user");
    if (!session) {
      router.push("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleToggleArchive = async (look: Look) => {
    const nextStatut = look.statut === "archive" ? "actif" : "archive";
    setPendingId(look._id);
    try {
      const res = await fetch(`/api/looks/${look._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: nextStatut }),
      });
      if (!res.ok) throw new Error("Échec de la mise à jour");
      toast.success(nextStatut === "archive" ? "Look archivé" : "Look désarchivé");
      load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error(message);
    } finally {
      setPendingId(null);
    }
  };

  const handleDelete = async (look: Look) => {
    if (!window.confirm(`Supprimer définitivement "${look.nom}" ? Cette action est irréversible.`)) return;
    setPendingId(look._id);
    try {
      const res = await fetch(`/api/looks/${look._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Échec de la suppression");
      toast.success("Look supprimé");
      load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error(message);
    } finally {
      setPendingId(null);
    }
  };

  const visibleLooks = looks.filter((l) => showArchived || l.statut !== "archive");

  const RowActions = ({ look }: { look: Look }) => (
    <div className="flex items-center gap-3 flex-wrap">
      <Link href={`/looks/${look._id}`} className="text-ink underline hover:no-underline">
        Modifier
      </Link>
      {canWrite && (
        <button
          type="button"
          disabled={pendingId === look._id}
          onClick={() => handleToggleArchive(look)}
          className="text-ink-soft underline hover:no-underline disabled:opacity-50">
          {look.statut === "archive" ? "Désarchiver" : "Archiver"}
        </button>
      )}
      {isAdmin && (
        <button
          type="button"
          disabled={pendingId === look._id}
          onClick={() => handleDelete(look)}
          className="text-red-600 underline hover:no-underline disabled:opacity-50">
          Supprimer
        </button>
      )}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h1 className="font-serif text-3xl text-ink">Looks</h1>
        {canWrite && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors">
            {showForm ? "Annuler" : "Nouveau look"}
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

      <label className="flex items-center gap-2 text-sm text-ink-soft mb-4">
        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
        Afficher les looks archivés
      </label>

      {isLoading ? (
        <SkeletonTable rows={5} cols={4} />
      ) : visibleLooks.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-ink-soft/70">Aucun look pour le moment.</p>
        </div>
      ) : (
        <>
          {/* Mobile : une carte par look */}
          <div className="sm:hidden space-y-3">
            {visibleLooks.map((look) => (
              <div key={look._id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="flex">
                  {look.photo_couverture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={look.photo_couverture} alt={look.nom} className="w-20 h-20 object-cover bg-ivory-soft shrink-0" />
                  ) : (
                    <div className="w-20 h-20 bg-ivory-soft shrink-0" />
                  )}
                  <div className="p-3 min-w-0 flex-1">
                    <div className="flex justify-between items-start gap-2">
                      <Link href={`/looks/${look._id}`} className="font-medium text-ink hover:underline truncate">
                        {look.nom}
                      </Link>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${activeToggleClasses(look.statut === "actif")}`}>
                        {look.statut === "actif" ? "Actif" : "Archivé"}
                      </span>
                    </div>
                    <p className="text-xs text-ink-soft/70">{look.item_count} article(s) · {formatXAF(look.prix_pack)}</p>
                  </div>
                </div>
                <div className="px-3 pb-3">
                  <RowActions look={look} />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop/tablette : tableau */}
          <div className="hidden sm:block bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-soft/70 border-b border-silver-soft">
                  <th className="py-3 px-4">Look</th>
                  <th className="py-3 px-4">Articles</th>
                  <th className="py-3 px-4">Prix pack</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {visibleLooks.map((look) => (
                  <tr key={look._id} className="border-b border-silver-soft/50 hover:bg-ivory-soft/60">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {look.photo_couverture ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={look.photo_couverture} alt={look.nom} className="w-10 h-10 object-cover rounded bg-ivory-soft shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-ivory-soft shrink-0" />
                        )}
                        <Link href={`/looks/${look._id}`} className="font-medium text-ink hover:underline">
                          {look.nom}
                        </Link>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-ink-soft">{look.item_count}</td>
                    <td className="py-3 px-4 font-semibold text-ink">{formatXAF(look.prix_pack)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${activeToggleClasses(look.statut === "actif")}`}>
                        {look.statut === "actif" ? "Actif" : "Archivé"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <RowActions look={look} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
