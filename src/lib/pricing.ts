export interface PricingInput {
  cout_achat: number;
  taux_change_applique: number;
  cout_transport: number;
  cout_douane: number;
  cout_packaging: number;
  cout_main_oeuvre: number;
  marge_pourcentage: number;
}

export interface PricingResult {
  prix_revient_total: number;
  prix_revente_final: number;
}

/**
 * Seule implémentation du calcul de prix de revient / revente (cahier des
 * charges §4) — utilisée à la fois pour l'enregistrement d'un prix et pour
 * l'aperçu du calculateur, afin que back-office et vitrine restent cohérents.
 */
export function calculatePricing(input: PricingInput): PricingResult {
  const coutAchatConverti = input.cout_achat * input.taux_change_applique;

  const prix_revient_total =
    coutAchatConverti +
    input.cout_transport +
    input.cout_douane +
    input.cout_packaging +
    input.cout_main_oeuvre;

  const prix_revente_final = prix_revient_total * (1 + input.marge_pourcentage / 100);

  return {
    prix_revient_total: Math.round(prix_revient_total * 100) / 100,
    prix_revente_final: Math.round(prix_revente_final * 100) / 100,
  };
}
