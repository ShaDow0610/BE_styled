import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { dbConnect } from '@/lib/db/connection';
import User from '@/lib/models/User';

const JWT_SECRET_ENV = process.env.JWT_SECRET;
if (!JWT_SECRET_ENV) {
  // Pas de filet de secours : signer/vérifier des tokens avec une valeur par
  // défaut connue permettrait de forger un token admin.
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET: string = JWT_SECRET_ENV;

// Seules ces zones sont accessibles sans compte : la vitrine publique et
// l'écran de connexion. Tout le reste du gestionnaire (produits, commandes,
// factures, looks, rapports, packaging, dashboard, admin...) exige un compte
// actif — évite d'oublier un préfixe de page à chaque nouvelle section.
function isPublicPath(pathname: string): boolean {
  return pathname === '/login' || pathname === '/api/auth/login' || pathname.startsWith('/boutique');
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isApi = pathname.startsWith('/api');

  // La racine mène directement à la vitrine publique
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/boutique', request.url));
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('authorization');
  const token = (isApi && authHeader?.replace('Bearer ', '')) || request.cookies.get('token')?.value;

  const reject = () =>
    isApi
      ? NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url));

  if (!token) {
    return reject();
  }

  let decoded: { userId: string };
  try {
    decoded = jwt.verify(token, JWT_SECRET) as unknown as { userId: string };
  } catch {
    return reject();
  }

  // Revérifie le compte en base à chaque requête plutôt que de faire
  // confiance au rôle figé dans le JWT : une désactivation ou un changement
  // de rôle (fait depuis /admin/users) doit prendre effet immédiatement,
  // pas seulement dans 7 jours quand le token expire.
  await dbConnect();
  const user = await User.findById(decoded.userId).select('role active').lean();

  if (!user || !user.active) {
    const response = reject();
    response.cookies.delete('token');
    return response;
  }

  if (isApi) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', decoded.userId);
    requestHeaders.set('x-user-role', user.role);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
