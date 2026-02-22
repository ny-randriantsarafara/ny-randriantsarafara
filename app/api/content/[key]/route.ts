import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { contentService } from '@/lib/content';
import { getSchemaForKey } from '@/lib/content/schemas';

interface RouteContext {
  params: Promise<{ key: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { key } = await context.params;
  const data = await contentService.getContentByKey(key);

  if (data === null) {
    return NextResponse.json({ error: 'Content not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PUT(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { key } = await context.params;
  const body: unknown = await request.json();

  const schema = getSchemaForKey(key);
  if (!schema) {
    return NextResponse.json({ error: 'Unknown content key' }, { status: 400 });
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.flatten() },
      { status: 422 }
    );
  }

  await contentService.updateContentByKey(key, result.data);
  revalidatePath('/');

  return NextResponse.json({ success: true });
}
