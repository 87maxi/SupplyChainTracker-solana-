import { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';

export async function GET(request: NextRequest) {
  const tag = request.nextUrl.searchParams.get('tag');

  if (!tag) {
    return Response.json({ error: 'Tag parameter is required' }, { status: 400 });
  }

  revalidateTag(tag, 'max');
  return Response.json({ revalidated: true, tag }, { status: 200 });
}