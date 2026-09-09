import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import Look from '@/lib/models/Look';
import LookItem from '@/lib/models/LookItem';
import { canWrite, getRole } from '@/lib/authz';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    const { id } = await params;

    const look = await Look.findById(id).lean();
    if (!look) {
      return NextResponse.json({ success: false, error: 'Look not found' }, { status: 404 });
    }

    const items = await LookItem.find({ look_id: id })
      .populate({
        path: 'product_variant_id',
        select: 'taille couleur sku_variante product_id',
        populate: { path: 'product_id', select: 'nom' },
      })
      .lean();

    return NextResponse.json({ success: true, data: { ...look, items } });
  } catch (error) {
    console.error('Error fetching look:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch look' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const look = await Look.findByIdAndUpdate(id, body, { new: true });
    if (!look) {
      return NextResponse.json({ success: false, error: 'Look not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: look });
  } catch (error) {
    console.error('Error updating look:', error);
    return NextResponse.json({ success: false, error: 'Failed to update look' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;

    const look = await Look.findByIdAndDelete(id);
    if (!look) {
      return NextResponse.json({ success: false, error: 'Look not found' }, { status: 404 });
    }
    await LookItem.deleteMany({ look_id: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting look:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete look' }, { status: 500 });
  }
}
