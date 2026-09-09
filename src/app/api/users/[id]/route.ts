import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import User from '@/lib/models/User';
import { getRole, isAdmin } from '@/lib/authz';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    if (!isAdmin(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    // Le rôle et l'activation sont les seuls champs modifiables ici — le mot
    // de passe n'est jamais mis à jour par cette route.
    const update: Record<string, unknown> = {};
    if (body.role !== undefined) update.role = body.role;
    if (body.active !== undefined) update.active = body.active;

    const user = await User.findByIdAndUpdate(id, update, { new: true }).select('-password');
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ success: false, error: 'Failed to update user' }, { status: 500 });
  }
}
