/**
 * Code couleur partagé pour les badges de statut — permet de scanner une
 * liste d'un coup d'œil au lieu de devoir lire chaque étiquette.
 */
export const PRODUCT_STATUT_COLORS: Record<string, string> = {
  brouillon: "bg-silver-soft text-ink-soft",
  en_commande: "bg-sky-100 text-sky-700",
  en_transit: "bg-sky-100 text-sky-700",
  en_confection: "bg-violet-100 text-violet-700",
  disponible: "bg-emerald-100 text-emerald-700",
  rupture: "bg-red-100 text-red-700",
  archive: "bg-ink-soft/10 text-ink-soft/60",
};

export function productStatutClasses(statut: string): string {
  return PRODUCT_STATUT_COLORS[statut] ?? "bg-ivory-soft text-ink-soft";
}

export function activeToggleClasses(active: boolean): string {
  return active ? "bg-emerald-100 text-emerald-700" : "bg-silver-soft text-ink-soft/60";
}
