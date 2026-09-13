"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatXAF } from "@/lib/currency";
import { SkeletonTable } from "@/components/common/Skeleton";

interface InvoiceListItem {
  _id: string;
  numero_facture: string;
  client_nom: string;
  montant_total: number;
  date_facture: string;
}

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const session = localStorage.getItem("user");
    if (!session) {
      router.push("/login");
      return;
    }
    fetch("/api/invoices")
      .then((r) => r.json())
      .then((d) => setInvoices(d.data || []))
      .finally(() => setIsLoading(false));
  }, [router]);

  const filtered = invoices.filter(
    (i) =>
      i.numero_facture.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.client_nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-serif text-3xl text-ink mb-6">Factures</h1>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Rechercher par numéro ou client..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-silver-soft rounded-lg focus:outline-none focus:border-ink bg-white"
        />
      </div>

      {isLoading ? (
        <SkeletonTable rows={6} cols={5} />
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-ink-soft/70 text-sm">Aucune facture pour le moment.</p>
        </div>
      ) : (
        <>
          {/* Mobile : une carte par facture */}
          <div className="sm:hidden space-y-3">
            {filtered.map((i) => (
              <Link
                key={i._id}
                href={`/invoices/${i._id}`}
                className="block bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-medium text-ink">{i.numero_facture}</p>
                    <p className="text-xs text-ink-soft/70">
                      {i.client_nom} · {new Date(i.date_facture).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <p className="font-semibold text-ink whitespace-nowrap">{formatXAF(i.montant_total)}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop/tablette : tableau */}
          <div className="hidden sm:block bg-white rounded-lg shadow p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-soft/70 border-b border-silver-soft">
                    <th className="py-2 pr-4">Numéro</th>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Client</th>
                    <th className="py-2 pr-4">Montant</th>
                    <th className="py-2 pr-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((i) => (
                    <tr key={i._id} className="border-b border-silver-soft/50">
                      <td className="py-2 pr-4 text-ink font-medium">{i.numero_facture}</td>
                      <td className="py-2 pr-4 text-ink-soft">
                        {new Date(i.date_facture).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-2 pr-4 text-ink-soft">{i.client_nom}</td>
                      <td className="py-2 pr-4 font-semibold text-ink">{formatXAF(i.montant_total)}</td>
                      <td className="py-2 pr-4">
                        <Link href={`/invoices/${i._id}`} className="text-ink underline hover:no-underline">
                          Voir / Imprimer
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
