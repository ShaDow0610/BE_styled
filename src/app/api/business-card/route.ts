import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import BusinessCard from '@/lib/models/BusinessCard';
import { canWrite, getRole } from '@/lib/authz';

export async function GET(request: NextRequest) {
  try {
    if (!getRole(request)) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }
    await dbConnect();
    let card = await BusinessCard.findOne();
    if (!card) {
      card = await BusinessCard.create({ nom: 'Be Styled', organisation: 'Be Styled', telephone: '', liens: [] });
    }
    return NextResponse.json({ success: true, data: card });
  } catch (error) {
    console.error('Error fetching business card:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch business card' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }
    await dbConnect();
    const body = await request.json();

    const update = {
      nom: String(body.nom || '').trim() || 'Be Styled',
      organisation: String(body.organisation || '').trim(),
      telephone: String(body.telephone || '').trim(),
      liens: Array.isArray(body.liens)
        ? body.liens
            .map((l: { label?: string; url?: string }) => ({
              label: String(l.label || '').trim(),
              url: String(l.url || '').trim(),
            }))
            .filter((l: { label: string; url: string }) => l.label && l.url)
        : [],
    };

    let card = await BusinessCard.findOne();
    if (!card) {
      card = await BusinessCard.create(update);
    } else {
      Object.assign(card, update);
      await card.save();
    }

    return NextResponse.json({ success: true, data: card });
  } catch (error) {
    console.error('Error updating business card:', error);
    return NextResponse.json({ success: false, error: 'Failed to update business card' }, { status: 500 });
  }
}
