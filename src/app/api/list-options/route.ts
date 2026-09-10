import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import ListOption from '@/lib/models/ListOption';
import { canWrite, getRole } from '@/lib/authz';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type) {
      return NextResponse.json({ success: false, error: 'type is required' }, { status: 400 });
    }

    const options = await ListOption.find({ type }).sort({ valeur: 1 }).lean();
    return NextResponse.json({ success: true, data: options });
  } catch (error) {
    console.error('Error fetching list options:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch list options' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const body = await request.json();
    const valeur = String(body.valeur || '').trim();

    if (!body.type || !valeur) {
      return NextResponse.json({ success: false, error: 'type et valeur requis' }, { status: 400 });
    }

    const option = await ListOption.findOneAndUpdate(
      { type: body.type, valeur },
      { type: body.type, valeur },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, data: option }, { status: 201 });
  } catch (error) {
    console.error('Error creating list option:', error);
    return NextResponse.json({ success: false, error: 'Failed to create list option' }, { status: 500 });
  }
}
