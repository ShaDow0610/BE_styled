import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

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
  return (
    pathname === '/login' ||
    pathname === '/api/auth/login' ||
    pathname === '/api/vcard' ||
    pathname.startsWith('/boutique')
  );
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

  // Décodé depuis le JWT uniquement — pas d'appel base de données ici : ce
  // fichier tourne en Edge Function sur Netlify (runtime Deno), où Mongoose
  // ne peut pas s'exécuter (il a besoin de vrais sockets Node/TLS). Le rôle
  // et le statut actif viennent donc du JWT signé à la connexion, pas d'une
  // vérification en base à chaque requête (voir requireActiveUser() dans
  // src/lib/authz.ts pour la vérification fraîche, utilisable route par route).
  let decoded: { userId: string; role: string };
  try {
    decoded = jwt.verify(token, JWT_SECRET) as unknown as { userId: string; role: string };
  } catch {
    return reject();
  }

  if (isApi) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', decoded.userId);
    requestHeaders.set('x-user-role', decoded.role);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  // Exclut aussi les fichiers statiques servis depuis /public (logos,
  // icônes...) : sans ça, un visiteur non connecté sur la vitrine se
  // voyait rediriger vers /login à chaque image demandée (ex: /brand/*.png),
  // donc logo et icônes ne s'affichaient jamais pour un public anonyme.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|otf)$).*)',
  ],
};
