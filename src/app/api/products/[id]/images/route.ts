import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import ProductImage from '@/lib/models/ProductImage';
import { canWrite, getRole } from '@/lib/authz';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    const { id } = await params;
    const images = await ProductImage.find({ product_id: id }).sort({ ordre_affichage: 1 }).lean();
    return NextResponse.json({ success: true, data: images });
  } catch (error) {
    console.error('Error fetching images:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch images' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    const image = await ProductImage.create({ ...body, product_id: id });
    return NextResponse.json({ success: true, data: image }, { status: 201 });
  } catch (error) {
    console.error('Error creating image:', error);
    return NextResponse.json({ success: false, error: 'Failed to create image' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!canWrite(getRole(request))) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId');

    if (!imageId) {
      return NextResponse.json({ success: false, error: 'imageId is required' }, { status: 400 });
    }

    const image = await ProductImage.findByIdAndDelete(imageId);
    if (!image) {
      return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete image' }, { status: 500 });
  }
}
