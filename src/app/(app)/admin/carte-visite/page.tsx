"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faDownload } from "@fortawesome/free-solid-svg-icons";
import { useToast } from "@/components/common/ToastProvider";
import { SkeletonPanel } from "@/components/common/Skeleton";

interface Lien {
  label: string;
  url: string;
}

export default function CarteVisitePage() {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({ nom: "", organisation: "", telephone: "" });
  const [liens, setLiens] = useState<Lien[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

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
      const res = await fetch("/api/business-card");
      const data = await res.json();
      if (res.ok && data.success) {
        setForm({
          nom: data.data.nom || "",
          organisation: data.data.organisation || "",
          telephone: data.data.telephone || "",
        });
        setLiens(data.data.liens || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLien = () => {
    setLiens((prev) => [...prev, { label: "", url: "" }]);
  };

  const handleUpdateLien = (index: number, field: keyof Lien, value: string) => {
    setLiens((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  };

  const handleRemoveLien = (index: number) => {
    setLiens((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      const res = await fetch("/api/business-card", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, liens }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Échec de l'enregistrement");
      }
      setLiens(data.data.liens || []);
      toast.success("Carte de visite mise à jour");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="font-serif text-3xl text-ink">Carte de visite</h1>
        <Link href="/admin" className="px-4 py-2 border border-silver-soft text-ink-soft rounded-lg hover:bg-ivory-soft transition-colors">
          ← Retour
        </Link>
      </div>

      <p className="text-sm text-ink-soft/70 mb-6">
        Ces informations alimentent la page publique <code className="text-xs bg-ivory-soft px-1.5 py-0.5 rounded">/boutique/carte</code>{" "}
        et le fichier de contact proposé au visiteur. Le QR code ci-dessous pointe toujours vers
        cette même page — ajouter ou modifier un lien ici s&apos;applique immédiatement au prochain
        scan, sans jamais avoir à réimprimer le QR code.
      </p>

      {isLoading ? (
        <SkeletonPanel lines={5} />
      ) : (
        <div className="grid md:grid-cols-[1fr_auto] gap-6 items-start">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 grid gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-2">Nom affiché</label>
              <input
                required
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-2">Organisation (optionnel)</label>
              <input
                value={form.organisation}
                onChange={(e) => setForm({ ...form, organisation: e.target.value })}
                className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-2">Téléphone</label>
              <input
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                placeholder="Ex: 6 75 05 97 98"
                className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-soft mb-2">Liens (réseaux, site web...)</label>
              <div className="space-y-3">
                {liens.map((lien, index) => (
                  <div key={index} className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
                    <input
                      placeholder="Label (ex: TikTok)"
                      value={lien.label}
                      onChange={(e) => handleUpdateLien(index, "label", e.target.value)}
                      className="w-full sm:w-40 px-3 py-2 border border-silver-soft rounded-lg text-sm focus:outline-none focus:border-ink"
                    />
                    <input
                      placeholder="https://..."
                      value={lien.url}
                      onChange={(e) => handleUpdateLien(index, "url", e.target.value)}
                      className="flex-1 min-w-0 px-3 py-2 border border-silver-soft rounded-lg text-sm focus:outline-none focus:border-ink"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveLien(index)}
                      className="text-red-600 hover:text-red-700 shrink-0 px-2"
                      aria-label="Retirer ce lien">
                      <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAddLien}
                className="mt-3 text-sm text-ink underline hover:no-underline">
                + Ajouter un lien
              </button>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <div>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors disabled:opacity-50">
                {isSaving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </form>

          <div className="bg-white rounded-lg shadow p-6 text-center w-full md:w-56">
            <p className="text-sm font-medium text-ink-soft mb-3">QR code à scanner</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/api/business-card/qrcode" alt="QR code de la carte de visite" className="w-full rounded-lg border border-silver-soft" />
            <a
              href="/api/business-card/qrcode"
              download="be-styled-qrcode.png"
              className="mt-4 inline-flex items-center gap-2 text-sm text-ink underline hover:no-underline">
              <FontAwesomeIcon icon={faDownload} className="w-3.5 h-3.5" />
              Télécharger
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
