"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/common/ToastProvider";
import { useUserRole } from "@/lib/useUserRole";

export default function ExchangeRatesPage() {
  const router = useRouter();
  const toast = useToast();
  const { isAdmin } = useUserRole();
  const [form, setForm] = useState({ xaf_par_usd: "", xaf_par_eur: "" });
  const [dateMaj, setDateMaj] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    const userData = localStorage.getItem("user");
    if (userData && JSON.parse(userData).role !== "admin") {
      router.push("/admin");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/exchange-rate");
      if (res.ok) {
        const data = (await res.json()).data;
        setForm({ xaf_par_usd: String(data.xaf_par_usd), xaf_par_eur: String(data.xaf_par_eur) });
        setDateMaj(data.date_maj);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      const res = await fetch("/api/exchange-rate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          xaf_par_usd: Number(form.xaf_par_usd),
          xaf_par_eur: Number(form.xaf_par_eur),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Échec de l'enregistrement");
      }
      setDateMaj(data.data.date_maj);
      toast.success("Taux de change enregistrés");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="font-serif text-3xl text-ink">Taux de change</h1>
        <Link href="/admin" className="px-4 py-2 border border-silver-soft text-ink-soft rounded-lg hover:bg-ivory-soft transition-colors">
          ← Retour
        </Link>
      </div>

      <p className="text-sm text-ink-soft/70 mb-6">
        Les prix sont enregistrés en XAF. Ces taux définissent la conversion affichée sur la
        boutique publique lorsqu&apos;un visiteur choisit $ ou €. Le back-office reste toujours en XAF.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ink"></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 grid gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">1 USD ($) = ... XAF</label>
            <input
              type="number" step="0.01" min="0" required
              value={form.xaf_par_usd}
              onChange={(e) => setForm({ ...form, xaf_par_usd: e.target.value })}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-2">1 EUR (€) = ... XAF</label>
            <input
              type="number" step="0.01" min="0" required
              value={form.xaf_par_eur}
              onChange={(e) => setForm({ ...form, xaf_par_eur: e.target.value })}
              className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
            />
          </div>
          {dateMaj && (
            <p className="text-xs text-ink-soft/60">
              Dernière mise à jour : {new Date(dateMaj).toLocaleString("fr-FR")}
            </p>
          )}
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
      )}
    </div>
  );
}
