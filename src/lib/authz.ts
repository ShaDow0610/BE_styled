import { NextRequest } from 'next/server';

export function getRole(request: NextRequest): string | null {
  return request.headers.get('x-user-role');
}

export function getUserId(request: NextRequest): string | null {
  return request.headers.get('x-user-id');
}

/**
 * Vérification fraîche du compte, à utiliser dans une route API (Netlify
 * Function Node.js — pas le proxy, qui tourne en Edge Function et ne peut
 * pas exécuter Mongoose). Contrairement au rôle décodé du JWT par le proxy
 * (valable jusqu'à expiration du token), ceci interroge la base à chaque
 * appel : une désactivation ou un changement de rôle prend effet
 * immédiatement sur les routes qui l'utilisent.
 *
 * Retourne le rôle actuel si le compte est actif, sinon null.
 */
export async function requireActiveUser(request: NextRequest): Promise<string | null> {
  const userId = getUserId(request);
  if (!userId) return null;

  const { dbConnect } = await import('@/lib/db/connection');
  const { default: User } = await import('@/lib/models/User');

  await dbConnect();
  const user = await User.findById(userId).select('role active').lean();
  if (!user || !user.active) return null;
  return user.role;
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
