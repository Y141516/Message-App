export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

// GET /api/download?url=...&filename=reply.mp3
// Server-side proxy that forces file download with proper headers
// Works in all browsers including Telegram WebApp
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get('url');
    const filename = searchParams.get('filename') || 'reply.mp3';

    if (!fileUrl) {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    // Only allow downloads from our own Supabase storage
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const allowedHost = new URL(supabaseUrl).hostname;
    const requestedHost = new URL(fileUrl).hostname;

    if (!requestedHost.endsWith('supabase.co') && requestedHost !== allowedHost) {
      return NextResponse.json({ error: 'Unauthorized source' }, { status: 403 });
    }

    // Fetch the file from Supabase storage
    const response = await fetch(fileUrl);
    if (!response.ok) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const blob = await response.blob();
    const buffer = Buffer.from(await blob.arrayBuffer());

    // Return with Content-Disposition: attachment — forces download in all browsers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': blob.type || 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    console.error('Download proxy error:', err);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}
