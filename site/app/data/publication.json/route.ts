import { readPublication } from '@/lib/publication/read-publication.ts';

export const dynamic = 'force-static';

export async function GET() {
  const publication = readPublication();
  const body = JSON.stringify(publication);
  return new Response(body, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
