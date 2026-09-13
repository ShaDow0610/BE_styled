"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { formatXAF } from "@/lib/currency";
import { buildWhatsAppReminderLink } from "@/lib/whatsapp";
import { SkeletonPanel } from "@/components/common/Skeleton";
import { useUserRole } from "@/lib/useUserRole";
import { useToast } from "@/components/common/ToastProvider";

interface InvoiceLine {
  produit_nom: string;
  couleur?: string;
  taille?: string;
  quantite: number;
  prix_unitaire: number;
  montant_total: number;
}

interface Invoice {
  _id: string;
  numero_facture: string;
  client_nom: string;
  client_telephone?: string;
  client_adresse?: string;
  date_facture: string;
  lignes: InvoiceLine[];
  montant_total: number;
  montantEncaisse: number;
  resteAPayer: number;
  statut: "emise" | "annulee";
}

const BUSINESS_ADDRESS = process.env.NEXT_PUBLIC_BUSINESS_ADDRESS;
const BUSINESS_PHONE = process.env.NEXT_PUBLIC_BUSINESS_PHONE;

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = params.id as string;
  const { canWrite, isAdmin } = useUserRole();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [clientForm, setClientForm] = useState({ client_nom: "", client_telephone: "", client_adresse: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setIsLoading(true);
    fetch(`/api/invoices/${id}`)
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d?.success) {
          setInvoice(d.data);
          setClientForm({
            client_nom: d.data.client_nom,
            client_telephone: d.data.client_telephone || "",
            client_adresse: d.data.client_adresse || "",
          });
        }
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    const session = localStorage.getItem("user");
    if (!session) {
      router.push("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router]);

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Échec de la mise à jour");
      toast.success("Coordonnées mises à jour");
      setIsEditingClient(false);
      load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelInvoice = async () => {
    if (!window.confirm("Annuler cette facture ? Elle restera visible (marquée Annulée) et les commandes associées redeviendront facturables. Cette action est irréversible.")) return;
    setIsCanceling(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "annuler" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Échec de l'annulation");
      toast.success("Facture annulée");
      load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error(message);
    } finally {
      setIsCanceling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <SkeletonPanel lines={6} />
      </div>
    );
  }

  if (notFound || !invoice) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-ink-soft/70 mb-4">Facture introuvable.</p>
        <Link href="/invoices" className="text-ink underline">
          Retour aux factures
        </Link>
      </div>
    );
  }

  const isAnnulee = invoice.statut === "annulee";
  const reminderLink = buildWhatsAppReminderLink({
    telephone: invoice.client_telephone,
    numeroFacture: invoice.numero_facture,
    montantDu: formatXAF(invoice.resteAPayer),
  });

  return (
    <div className="container mx-auto px-4 py-8 print:py-0 max-w-3xl">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-8 print:hidden">
        <Link href="/invoices" className="px-4 py-2 border border-silver-soft text-ink-soft rounded-lg hover:bg-ivory-soft transition-colors">
          ← Retour aux factures
        </Link>
        <div className="flex flex-wrap gap-3">
          {!isAnnulee && invoice.resteAPayer > 0 && reminderLink && (
            <a
              href={reminderLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-2 border border-ink text-ink rounded-lg hover:bg-ink hover:text-ivory transition-colors">
              <FontAwesomeIcon icon={faWhatsapp} className="w-4 h-4" />
              Relancer sur WhatsApp
            </a>
          )}
          <button
            onClick={() => window.print()}
            className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors">
            Imprimer / Exporter en PDF
          </button>
        </div>
      </div>

      {isAnnulee && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium print:hidden">
          Cette facture a été annulée. Les montants restent affichés pour référence, mais elle n&apos;est plus due.
        </div>
      )}

      <div className={`bg-white rounded-lg shadow p-8 print:shadow-none print:p-0 relative ${isAnnulee ? "opacity-75" : ""}`}>
        {isAnnulee && (
          <div className="hidden print:flex absolute inset-0 items-center justify-center pointer-events-none">
            <span className="text-6xl font-bold text-red-300 rotate-[-20deg] border-4 border-red-300 px-8 py-2">ANNULÉE</span>
          </div>
        )}
        <div className="flex justify-between items-start mb-8">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-full-black.png" alt="Be Styled" className="h-16 w-auto" />
            {BUSINESS_ADDRESS && <p className="text-sm text-ink-soft mt-1">{BUSINESS_ADDRESS}</p>}
            {BUSINESS_PHONE && <p className="text-sm text-ink-soft">{BUSINESS_PHONE}</p>}
          </div>
          <div className="text-right">
            <h2 className="font-serif text-xl text-ink">Facture {invoice.numero_facture}</h2>
            <p className="text-sm text-ink-soft mt-1">
              {new Date(invoice.date_facture).toLocaleDateString("fr-FR")}
            </p>
            {isAnnulee && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                Annulée
              </span>
            )}
          </div>
        </div>

        <div className="mb-8 print:hidden">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs uppercase tracking-wide text-ink-soft/60">Facturé à</p>
            {canWrite && !isAnnulee && !isEditingClient && (
              <button onClick={() => setIsEditingClient(true)} className="text-xs text-ink underline hover:no-underline">
                Modifier
              </button>
            )}
          </div>
          {isEditingClient ? (
            <form onSubmit={handleSaveClient} className="space-y-3 max-w-sm">
              <input
                required
                value={clientForm.client_nom}
                onChange={(e) => setClientForm({ ...clientForm, client_nom: e.target.value })}
                placeholder="Nom du client"
                className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
              />
              <input
                value={clientForm.client_telephone}
                onChange={(e) => setClientForm({ ...clientForm, client_telephone: e.target.value })}
                placeholder="Téléphone"
                className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
              />
              <input
                value={clientForm.client_adresse}
                onChange={(e) => setClientForm({ ...clientForm, client_adresse: e.target.value })}
                placeholder="Adresse"
                className="w-full px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3">
                <button type="submit" disabled={isSaving} className="px-4 py-2 bg-ink text-ivory rounded-lg text-sm disabled:opacity-50">
                  {isSaving ? "Enregistrement..." : "Enregistrer"}
                </button>
                <button type="button" onClick={() => setIsEditingClient(false)} className="px-4 py-2 border border-silver-soft text-ink-soft rounded-lg text-sm">
                  Annuler
                </button>
              </div>
            </form>
          ) : (
            <>
              <p className="font-semibold text-ink">{invoice.client_nom}</p>
              {invoice.client_telephone && <p className="text-sm text-ink-soft">{invoice.client_telephone}</p>}
              {invoice.client_adresse && <p className="text-sm text-ink-soft">{invoice.client_adresse}</p>}
            </>
          )}
        </div>

        {/* Version imprimée : toujours en lecture seule, jamais le formulaire */}
        <div className="hidden print:block mb-8">
          <p className="text-xs uppercase tracking-wide text-ink-soft/60 mb-1">Facturé à</p>
          <p className="font-semibold text-ink">{invoice.client_nom}</p>
          {invoice.client_telephone && <p className="text-sm text-ink-soft">{invoice.client_telephone}</p>}
          {invoice.client_adresse && <p className="text-sm text-ink-soft">{invoice.client_adresse}</p>}
        </div>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="text-left text-ink-soft/70 border-b border-silver-soft">
              <th className="py-2 pr-4">Produit</th>
              <th className="py-2 pr-4">Couleur / Taille</th>
              <th className="py-2 pr-4">Quantité</th>
              <th className="py-2 pr-4">Prix unitaire</th>
              <th className="py-2 pr-4 text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lignes.map((l, idx) => (
              <tr key={idx} className="border-b border-silver-soft/50">
                <td className="py-2 pr-4 text-ink">{l.produit_nom}</td>
                <td className="py-2 pr-4 text-ink-soft">{[l.couleur, l.taille].filter(Boolean).join(" / ")}</td>
                <td className="py-2 pr-4 text-ink-soft">{l.quantite}</td>
                <td className="py-2 pr-4 text-ink-soft">{formatXAF(l.prix_unitaire)}</td>
                <td className="py-2 pr-4 text-ink text-right font-medium">{formatXAF(l.montant_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="text-right space-y-1">
            <p className="text-xs uppercase tracking-wide text-ink-soft/60">Total</p>
            <p className="text-2xl font-bold text-ink">{formatXAF(invoice.montant_total)}</p>
            {!isAnnulee && invoice.resteAPayer > 0 && (
              <>
                <p className="text-xs text-ink-soft/70">Encaissé : {formatXAF(invoice.montantEncaisse)}</p>
                <p className="text-sm font-semibold text-amber-600">Reste à payer : {formatXAF(invoice.resteAPayer)}</p>
              </>
            )}
          </div>
        </div>
      </div>

      {isAdmin && !isAnnulee && (
        <div className="bg-white rounded-lg shadow p-6 mt-6 print:hidden">
          <p className="text-sm font-medium text-red-600 mb-2">Zone dangereuse</p>
          <p className="text-xs text-ink-soft/70 mb-3">
            Les montants et lignes d&apos;une facture ne peuvent jamais être modifiés. En cas d&apos;erreur, annule-la
            (elle reste visible pour l&apos;historique) puis refais une nouvelle facture.
          </p>
          <button
            type="button"
            onClick={handleCancelInvoice}
            disabled={isCanceling}
            className="px-6 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
            {isCanceling ? "Annulation..." : "Annuler la facture"}
          </button>
        </div>
      )}
    </div>
  );
}
