export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const MIME_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg', webm: 'audio/webm', ogg: 'audio/ogg', wav: 'audio/wav', m4a: 'audio/mp4',
  pdf: 'application/pdf',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
  mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

// GET /api/download?url=...&filename=reply.mp3&type=audio
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get('url');
    const filename = searchParams.get('filename') || 'download';
    const type = searchParams.get('type') || 'audio';

    if (!fileUrl) {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    // Security: only allow Supabase storage URLs
    const parsed = new URL(fileUrl);
    if (!parsed.hostname.endsWith('supabase.co') && !parsed.hostname.endsWith('supabase.in')) {
      return NextResponse.json({ error: 'Unauthorized source' }, { status: 403 });
    }

    // Fetch the file
    const response = await fetch(fileUrl, {
      headers: { 'Cache-Control': 'no-cache' },
    });

    if (!response.ok) {
      return NextResponse.json({ error: `File fetch failed: ${response.status}` }, { status: 404 });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const contentType = MIME_TYPES[ext] || response.headers.get('content-type') || 'application/octet-stream';

    // These headers force the browser to download the file
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: any) {
    console.error('Download error:', err);
    return NextResponse.json({ error: err.message || 'Download failed' }, { status: 500 });
  }
}
