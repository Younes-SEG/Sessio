import { NextResponse } from 'next/server';
import { apiError, validateDeleteOrigin } from '@/lib/server/http';
import { deleteEntity, restoreCourse } from '@/lib/server/mutations';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    validateDeleteOrigin(request);
    const { id } = await context.params;
    return NextResponse.json(await restoreCourse(id));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    validateDeleteOrigin(request);
    const { id } = await context.params;
    return NextResponse.json(await deleteEntity('courses', id, true));
  } catch (error) {
    return apiError(error);
  }
}
