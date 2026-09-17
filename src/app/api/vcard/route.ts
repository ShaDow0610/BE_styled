import { NextResponse } from 'next/server';
import { getBusinessCard, buildVCard } from '@/lib/businessCard';

// Route publique (voir src/proxy.ts) — c'est elle que le QR code cible
// indirectement via /boutique/carte. Toujours lue en direct depuis la base,
// jamais un fichier généré à l'avance : un lien ajouté dans l'admin est donc
// immédiatement inclus au prochain scan, sans regénérer le QR code.
export async function GET() {
  const card = await getBusinessCard();
  const vcf = buildVCard(card);

  return new NextResponse(vcf, {
    status: 200,
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': 'inline; filename="be-styled.vcf"',
      'Cache-Control': 'no-store',
    },
  });
}
