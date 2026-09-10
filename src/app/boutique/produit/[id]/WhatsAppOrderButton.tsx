"use client";

import { useMemo, useState } from "react";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { useCurrency } from "../../components/CurrencyProvider";

interface Variant {
  _id: string;
  taille: string;
  couleur: string;
  modele?: string;
  stock_quantite: number;
  prix: number | null;
}

interface Props {
  productNom: string;
  productReference: string;
  variants: Variant[];
}

export default function WhatsAppOrderButton({ productNom, productReference, variants }: Props) {
  const { formatPrice } = useCurrency();
  const modeles = useMemo(
    () => Array.from(new Set(variants.map((v) => v.modele).filter((m): m is string => !!m))),
    [variants]
  );

  const [modele, setModele] = useState(modeles[0] ?? "");

  // Un modèle donné peut n'avoir que certaines couleurs/tailles disponibles.
  const variantsDuModele = useMemo(
    () => (modeles.length > 0 ? variants.filter((v) => v.modele === modele) : variants),
    [variants, modeles, modele]
  );

  const tailles = useMemo(
    () => Array.from(new Set(variantsDuModele.map((v) => v.taille))),
    [variantsDuModele]
  );
  const couleurs = useMemo(
    () => Array.from(new Set(variantsDuModele.map((v) => v.couleur))),
    [variantsDuModele]
  );

  const [taille, setTaille] = useState(tailles[0] ?? "");
  const [couleur, setCouleur] = useState(couleurs[0] ?? "");

  const effectiveTaille = tailles.includes(taille) ? taille : tailles[0] ?? "";
  const effectiveCouleur = couleurs.includes(couleur) ? couleur : couleurs[0] ?? "";

  const selectedVariant = variantsDuModele.find(
    (v) => v.taille === effectiveTaille && v.couleur === effectiveCouleur
  );
  const isAvailable = selectedVariant ? selectedVariant.stock_quantite > 0 : false;

  const link = buildWhatsAppLink({
    nom: productNom,
    reference: productReference,
    modele: modele || undefined,
    taille: effectiveTaille,
    couleur: effectiveCouleur,
  });

  return (
    <div className="space-y-4">
      {selectedVariant?.prix != null && (
        <p className="text-2xl font-bold text-ink">{formatPrice(selectedVariant.prix)}</p>
      )}

      {modeles.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-2">Modèle</label>
          <div className="flex flex-wrap gap-2">
            {modeles.map((m) => (
              <button
                key={m}
                onClick={() => setModele(m)}
                className={`px-4 py-2 rounded-lg text-sm border ${
                  modele === m ? "bg-ink text-ivory border-ink" : "border-silver-soft text-ink-soft"
                }`}>
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      {tailles.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-2">Taille</label>
          <div className="flex flex-wrap gap-2">
            {tailles.map((t) => (
              <button
                key={t}
                onClick={() => setTaille(t)}
                className={`px-4 py-2 rounded-lg text-sm border ${
                  effectiveTaille === t ? "bg-ink text-ivory border-ink" : "border-silver-soft text-ink-soft"
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
                  effectiveCouleur === c ? "bg-ink text-ivory border-ink" : "border-silver-soft text-ink-soft"
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
