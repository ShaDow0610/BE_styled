"use client";

import { useState } from "react";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { useCurrency } from "../../components/CurrencyProvider";

interface Props {
  productNom: string;
  productReference: string;
  prix: number | null;
  couleursDisponibles: string[];
  taillesDisponibles: string[];
}

export default function WhatsAppOrderButton({
  productNom,
  productReference,
  prix,
  couleursDisponibles,
  taillesDisponibles,
}: Props) {
  const { formatPrice } = useCurrency();
  const [couleur, setCouleur] = useState(couleursDisponibles[0] ?? "");
  const [taille, setTaille] = useState(taillesDisponibles[0] ?? "");

  const link = buildWhatsAppLink({
    nom: productNom,
    reference: productReference,
    taille: taille || undefined,
    couleur: couleur || undefined,
  });

  return (
    <div className="space-y-4">
      {prix != null && <p className="text-2xl font-bold text-ink">{formatPrice(prix)}</p>}

      {couleursDisponibles.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-2">Couleur</label>
          <div className="flex flex-wrap gap-2">
            {couleursDisponibles.map((c) => (
              <button
                key={c}
                onClick={() => setCouleur(c)}
                className={`px-4 py-2 rounded-lg text-sm border ${
                  couleur === c ? "bg-ink text-ivory border-ink" : "border-silver-soft text-ink-soft"
                }`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {taillesDisponibles.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-2">Taille</label>
          <div className="flex flex-wrap gap-2">
            {taillesDisponibles.map((t) => (
              <button
                key={t}
                onClick={() => setTaille(t)}
                className={`px-4 py-2 rounded-lg text-sm border ${
                  taille === t ? "bg-ink text-ivory border-ink" : "border-silver-soft text-ink-soft"
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block px-8 py-3 rounded-lg font-semibold transition-colors bg-ink text-ivory hover:bg-ink-soft">
        Commander sur WhatsApp
      </a>
    </div>
  );
}
