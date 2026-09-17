import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getRole } from '@/lib/authz';
import { SITE_URL } from '@/lib/siteUrl';

// Le QR code encode toujours la même URL (la page publique /boutique/carte),
// jamais les données elles-mêmes — donc modifier la carte depuis l'admin
// n'oblige jamais à réimprimer un nouveau QR code : le contenu servi à
// cette URL change, pas le code lui-même.
export async function GET(request: NextRequest) {
  if (!getRole(request)) {
    return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
  }

  const url = `${SITE_URL}/boutique/carte`;
  const png = await QRCode.toBuffer(url, {
    type: 'png',
    width: 512,
    margin: 2,
    color: { dark: '#0b0b0c', light: '#ffffff' },
  });

  return new NextResponse(new Uint8Array(png), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
    },
  });
}
