import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import ExchangeRate from '@/lib/models/ExchangeRate';
import { isAdmin, getRole } from '@/lib/authz';

const DEFAULT_RATES = { xaf_par_usd: 610, xaf_par_eur: 655 };

export async function GET() {
  try {
    await dbConnect();
    const rate = await ExchangeRate.findOne().lean();
    if (!rate) {
      return NextResponse.json({ success: true, data: { ...DEFAULT_RATES, date_maj: null } });
    }
    return NextResponse.json({ success: true, data: rate });
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    return NextResponse.json({ success: true, data: { ...DEFAULT_RATES, date_maj: null } });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!isAdmin(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const body = await request.json();
    const xaf_par_usd = Number(body.xaf_par_usd);
    const xaf_par_eur = Number(body.xaf_par_eur);
    if (!xaf_par_usd || !xaf_par_eur) {
      return NextResponse.json({ success: false, error: 'Taux invalides' }, { status: 400 });
    }

    const rate = await ExchangeRate.findOneAndUpdate(
      {},
      { xaf_par_usd, xaf_par_eur, date_maj: new Date() },
      { upsert: true, returnDocument: 'after' }
    );
    return NextResponse.json({ success: true, data: rate });
  } catch (error) {
    console.error('Error updating exchange rate:', error);
    return NextResponse.json({ success: false, error: 'Failed to update exchange rate' }, { status: 500 });
  }
}
