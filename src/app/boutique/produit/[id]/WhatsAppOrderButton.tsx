"use client";

import { useMemo, useState } from "react";
import { buildWhatsAppLink } from "@/lib/whatsapp";

interface Variant {
  _id: string;
  taille: string;
  couleur: string;
  stock_quantite: number;
}

interface Props {
  productNom: string;
  productReference: string;
  variants: Variant[];
}

export default function WhatsAppOrderButton({ productNom, productReference, variants }: Props) {
  const tailles = useMemo(() => Array.from(new Set(variants.map((v) => v.taille))), [variants]);
  const couleurs = useMemo(() => Array.from(new Set(variants.map((v) => v.couleur))), [variants]);

  const [taille, setTaille] = useState(tailles[0] ?? "");
  const [couleur, setCouleur] = useState(couleurs[0] ?? "");

  const selectedVariant = variants.find((v) => v.taille === taille && v.couleur === couleur);
  const isAvailable = selectedVariant ? selectedVariant.stock_quantite > 0 : false;

  const link = buildWhatsAppLink({
    nom: productNom,
    reference: productReference,
    taille,
    couleur,
  });

  return (
    <div className="space-y-4">
      {tailles.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-2">Taille</label>
          <div className="flex flex-wrap gap-2">
            {tailles.map((t) => (
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

      {couleurs.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-2">Couleur</label>
          <div className="flex flex-wrap gap-2">
            {couleurs.map((c) => (
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

      {!isAvailable && selectedVariant && (
        <p className="text-sm text-red-600">Ce coloris/taille est en rupture de stock.</p>
      )}

      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={!isAvailable}
        className={`inline-block px-8 py-3 rounded-lg font-semibold transition-colors ${
          isAvailable
            ? "bg-ink text-ivory hover:bg-ink-soft"
            : "bg-silver-soft text-ink-soft/60 pointer-events-none"
        }`}>
        Commander sur WhatsApp
      </a>
    </div>
  );
}
