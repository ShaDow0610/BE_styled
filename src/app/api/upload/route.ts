import { NextRequest, NextResponse } from 'next/server';
import { canWrite, getRole } from '@/lib/authz';
import { uploadImage } from '@/lib/cloudinary';

const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo

export async function POST(request: NextRequest) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Aucun fichier reçu' }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ success: false, error: 'Le fichier doit être une image' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, error: 'Image trop volumineuse (5 Mo max)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadImage(buffer);

    return NextResponse.json({ success: true, data: { url } });
  } catch (error) {
    console.error('Error uploading image:', error);
    const message = error instanceof Error ? error.message : 'Failed to upload image';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
