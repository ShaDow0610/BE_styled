export type Periode = 'jour' | 'semaine' | 'mois';

/**
 * Numéro de semaine ISO-8601 (lundi, semaine contenant le premier jeudi de
 * l'année) — évite la dérive d'un simple Math.floor(jourDeL'année/7) aux
 * limites d'année.
 */
function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-S${String(weekNo).padStart(2, '0')}`;
}

export function bucketKey(date: Date, periode: Periode): string {
  if (periode === 'jour') return date.toISOString().slice(0, 10);
  if (periode === 'mois') return date.toISOString().slice(0, 7);
  return isoWeekKey(date);
}
