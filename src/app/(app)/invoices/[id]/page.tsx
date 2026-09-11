"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatXAF } from "@/lib/currency";

interface InvoiceLine {
  produit_nom: string;
  sku_variante: string;
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
}

const BUSINESS_ADDRESS = process.env.NEXT_PUBLIC_BUSINESS_ADDRESS;
const BUSINESS_PHONE = process.env.NEXT_PUBLIC_BUSINESS_PHONE;

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetch(`/api/invoices/${id}`)
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d?.success) setInvoice(d.data);
      })
      .finally(() => setIsLoading(false));
  }, [id, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ink"></div>
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

  return (
    <div className="container mx-auto px-4 py-8 print:py-0 max-w-3xl">
      <div className="flex justify-between items-center mb-8 print:hidden">
        <Link href="/invoices" className="px-4 py-2 border border-silver-soft text-ink-soft rounded-lg hover:bg-ivory-soft transition-colors">
          ← Retour aux factures
        </Link>
        <button
          onClick={() => window.print()}
          className="px-6 py-2 bg-ink text-ivory rounded-lg hover:bg-ink-soft transition-colors">
          Imprimer / Exporter en PDF
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-8 print:shadow-none print:p-0">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="font-serif text-3xl text-ink">BE STYLED</h1>
            {BUSINESS_ADDRESS && <p className="text-sm text-ink-soft mt-1">{BUSINESS_ADDRESS}</p>}
            {BUSINESS_PHONE && <p className="text-sm text-ink-soft">{BUSINESS_PHONE}</p>}
          </div>
          <div className="text-right">
            <h2 className="font-serif text-xl text-ink">Facture {invoice.numero_facture}</h2>
            <p className="text-sm text-ink-soft mt-1">
              {new Date(invoice.date_facture).toLocaleDateString("fr-FR")}
            </p>
          </div>
        </div>

        <div className="mb-8">
          <p className="text-xs uppercase tracking-wide text-ink-soft/60 mb-1">Facturé à</p>
          <p className="font-semibold text-ink">{invoice.client_nom}</p>
          {invoice.client_telephone && <p className="text-sm text-ink-soft">{invoice.client_telephone}</p>}
          {invoice.client_adresse && <p className="text-sm text-ink-soft">{invoice.client_adresse}</p>}
        </div>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="text-left text-ink-soft/70 border-b border-silver-soft">
              <th className="py-2 pr-4">Produit</th>
              <th className="py-2 pr-4">SKU</th>
              <th className="py-2 pr-4">Quantité</th>
              <th className="py-2 pr-4">Prix unitaire</th>
              <th className="py-2 pr-4 text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lignes.map((l, idx) => (
              <tr key={idx} className="border-b border-silver-soft/50">
                <td className="py-2 pr-4 text-ink">{l.produit_nom}</td>
                <td className="py-2 pr-4 text-ink-soft">{l.sku_variante}</td>
                <td className="py-2 pr-4 text-ink-soft">{l.quantite}</td>
                <td className="py-2 pr-4 text-ink-soft">{formatXAF(l.prix_unitaire)}</td>
                <td className="py-2 pr-4 text-ink text-right font-medium">{formatXAF(l.montant_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-ink-soft/60">Total</p>
            <p className="text-2xl font-bold text-ink">{formatXAF(invoice.montant_total)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
