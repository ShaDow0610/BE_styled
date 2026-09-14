/**
 * URL publique du site, utilisée pour les métadonnées Open Graph
 * (nécessite une URL absolue pour que les aperçus WhatsApp/Facebook
 * fonctionnent). Netlify expose automatiquement URL sur les déploiements ;
 * NEXT_PUBLIC_SITE_URL permet de la fixer explicitement en production.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.URL ||
  "http://localhost:3000";
