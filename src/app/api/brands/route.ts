import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import Brand from '@/lib/models/Brand';
import { canWrite, getRole } from '@/lib/authz';

export async function GET() {
  try {
    await dbConnect();
    const brands = await Brand.find().sort({ nom: 1 }).lean();
    return NextResponse.json({ success: true, data: brands });
  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch brands' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const body = await request.json();
    const brand = await Brand.create(body);
    return NextResponse.json({ success: true, data: brand }, { status: 201 });
  } catch (error) {
    console.error('Error creating brand:', error);
    return NextResponse.json({ success: false, error: 'Failed to create brand' }, { status: 500 });
  }
}
