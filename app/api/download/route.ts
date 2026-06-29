export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const MIME_MAP: Record<string, string> = {
  mp3: 'audio/mpeg', webm: 'audio/webm', ogg: 'audio/ogg',
  wav: 'audio/wav', m4a: 'audio/mp4', aac: 'audio/aac',
  pdf: 'application/pdf',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp',
  mp4: 'video/mp4', mov: 'video/quicktime',
};

// GET /api/download?url=...&filename=reply.mp3
// Server-side proxy — forces download with correct headers
// Works in Telegram WebApp unlike client-side blob URLs
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileUrl  = searchParams.get('url');
    const filename = searchParams.get('filename') || 'download';

    if (!fileUrl) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

    // Security: only allow Supabase storage URLs
    const parsed = new URL(fileUrl);
    if (!parsed.hostname.endsWith('supabase.co') && !parsed.hostname.endsWith('supabase.in')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const response = await fetch(fileUrl, { cache: 'no-store' });
    if (!response.ok) {
      return NextResponse.json({ error: `File fetch failed: ${response.status}` }, { status: 404 });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const contentType = MIME_MAP[ext] || response.headers.get('content-type') || 'application/octet-stream';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: any) {
    console.error('Download error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
