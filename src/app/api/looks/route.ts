import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import Look from '@/lib/models/Look';
import LookItem from '@/lib/models/LookItem';
import { canWrite, getRole } from '@/lib/authz';

export async function GET() {
  try {
    await dbConnect();
    const looks = await Look.find().sort({ nom: 1 }).lean();
    const lookIds = looks.map((l) => l._id);

    const itemCounts = await LookItem.aggregate([
      { $match: { look_id: { $in: lookIds } } },
      { $group: { _id: '$look_id', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(itemCounts.map((c) => [c._id.toString(), c.count]));

    const data = looks.map((l) => ({ ...l, item_count: countMap.get(l._id.toString()) ?? 0 }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching looks:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch looks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const body = await request.json();
    const look = await Look.create(body);
    return NextResponse.json({ success: true, data: look }, { status: 201 });
  } catch (error) {
    console.error('Error creating look:', error);
    return NextResponse.json({ success: false, error: 'Failed to create look' }, { status: 500 });
  }
}
