import { NextResponse } from 'next/server';

import { contentService } from '@/lib/content';

export async function GET() {
  const content = await contentService.getPageContent();
  return NextResponse.json(content);
}
