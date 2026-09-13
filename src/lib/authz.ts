import { NextRequest } from 'next/server';

export function getRole(request: NextRequest): string | null {
  return request.headers.get('x-user-role');
}

export function canWrite(role: string | null): boolean {
  return role === 'admin' || role === 'gestion_stock';
}

export function isAdmin(role: string | null): boolean {
  return role === 'admin';
}

// lecture_seule ne voit aucun montant financier nulle part dans l'app —
// doit être appliqué côté API (pas seulement côté UI) partout où une route
// renvoie des prix, marges, chiffre d'affaires ou paiements.
export function canSeeFinancials(role: string | null): boolean {
  return role !== null && role !== 'lecture_seule';
}
