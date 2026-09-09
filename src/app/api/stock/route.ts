import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db/connection';
import Stock from '@/lib/models/Stock';
import Product from '@/lib/models/Product';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const warehouse = searchParams.get('warehouse');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    let query: any = {};

    if (status) query.status = status;
    if (warehouse) query.warehouse = warehouse;

    const stocks = await Stock.find(query)
      .populate('productId')
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Stock.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: stocks,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching stock:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stock' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();

    // Vérifier que le produit existe
    const product = await Product.findById(body.productId);
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Déterminer le statut du stock
    let status = 'in-stock';
    if (body.quantity === 0) status = 'out-of-stock';
    else if (body.quantity <= body.minQuantity) status = 'low-stock';

    const stock = await Stock.create({
      ...body,
      status,
    });

    return NextResponse.json(
      { success: true, data: stock },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating stock:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create stock' },
      { status: 500 }
    );
  }
}

// Update stock quantity
export async function PATCH(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { stockId, quantity } = body;

    let status = 'in-stock';
    if (quantity === 0) status = 'out-of-stock';
    else if (quantity <= 5) status = 'low-stock'; // Assume min is 5

    const stock = await Stock.findByIdAndUpdate(
      stockId,
      { quantity, status, lastRestocked: new Date() },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      data: stock,
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update stock' },
      { status: 500 }
    );
  }
}
