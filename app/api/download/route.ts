export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const MIME_MAP: Record<string, string> = {
  mp3: 'audio/mpeg', webm: 'audio/webm', ogg: 'audio/ogg',
  wav: 'audio/wav',  m4a: 'audio/mp4',  aac: 'audio/aac',
  pdf: 'application/pdf',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif',  webp: 'image/webp',
  mp4: 'video/mp4',  mov: 'video/quicktime',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

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

    const response = await fetch(fileUrl);
    if (!response.ok) return NextResponse.json({ error: 'File not found' }, { status: 404 });

    const buffer = Buffer.from(await response.arrayBuffer());
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const contentType = MIME_MAP[ext] || response.headers.get('content-type') || 'application/octet-stream';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
