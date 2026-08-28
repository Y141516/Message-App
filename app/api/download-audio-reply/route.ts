export const dynamic = 'force-dynamic';
export const maxDuration = 30; // ffmpeg transcode needs more than the 10s default on Vercel Hobby

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { writeFile, readFile, unlink } from 'fs/promises';
import path from 'path';
import os from 'os';

// GET /api/download-audio-reply?message_id=xxx&telegram_id=xxx
//
// Downloads the leader's audio reply for one of the user's messages,
// transcodes it to a real .mp3 file (the original recording is stored as
// .webm from the browser's MediaRecorder), and returns it named
// "Audio Reply - N.mp3" where N is the same stable per-user audio-reply
// number shown in the app (see /api/dashboard).
//
// Falls back to serving the original file if ffmpeg conversion fails for
// any reason (e.g. an unsupported runtime) — a download that isn't
// technically mp3 is much better than no download at all.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get('message_id');
    const telegramId = searchParams.get('telegram_id');
    if (!messageId || !telegramId) {
      return NextResponse.json({ error: 'Missing message_id or telegram_id' }, { status: 400 });
    }

    const { data: user } = await supabaseAdmin
      .from('users').select('id').eq('telegram_id', telegramId).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Verify the requester owns this message before returning anything.
    const { data: message } = await supabaseAdmin
      .from('messages').select('id').eq('id', messageId).eq('sender_id', user.id).single();
    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

    const { data: reply } = await supabaseAdmin
      .from('replies')
      .select('id, audio_url, reply_type, created_at')
      .eq('message_id', messageId)
      .eq('reply_type', 'audio')
      .single();
    if (!reply?.audio_url) return NextResponse.json({ error: 'No audio reply found' }, { status: 404 });

    // Same numbering as /api/dashboard: chronological position among all of
    // this user's audio replies (oldest = 1). Recomputed here rather than
    // stored, so it always matches what's shown in the app.
    const { data: userMessages } = await supabaseAdmin.from('messages').select('id').eq('sender_id', user.id);
    const userMessageIds = (userMessages || []).map(m => m.id);
    const { data: allAudioReplies } = await supabaseAdmin
      .from('replies')
      .select('id, created_at')
      .eq('reply_type', 'audio')
      .in('message_id', userMessageIds.length ? userMessageIds : ['00000000-0000-0000-0000-000000000000']);

    const sorted = (allAudioReplies || []).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const number = sorted.findIndex(r => r.id === reply.id) + 1 || 1;
    const filename = `Audio Reply - ${number}.mp3`;

    // Fetch the original audio file
    const sourceRes = await fetch(reply.audio_url);
    if (!sourceRes.ok) return NextResponse.json({ error: 'Could not fetch audio file' }, { status: 502 });
    const sourceBuffer = Buffer.from(await sourceRes.arrayBuffer());

    const mp3Buffer = await transcodeToMp3(sourceBuffer).catch((err) => {
      console.error('mp3 transcode failed, falling back to original file:', err);
      return null;
    });

    if (mp3Buffer) {
      return new NextResponse(new Uint8Array(mp3Buffer), {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
          'Content-Length': String(mp3Buffer.length),
          'Cache-Control': 'no-store',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Fallback: original codec, but still named with the numbered filename
    // (extension reflects what it actually is, since a wrong extension can
    // break playback in strict players).
    const origExt = reply.audio_url.split('?')[0].split('.').pop()?.toLowerCase() || 'webm';
    const fallbackName = `Audio Reply - ${number}.${origExt}`;
    return new NextResponse(new Uint8Array(sourceBuffer), {
      status: 200,
      headers: {
        'Content-Type': sourceRes.headers.get('content-type') || 'audio/webm',
        'Content-Disposition': `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(fallbackName)}`,
        'Content-Length': String(sourceBuffer.length),
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    console.error('download-audio-reply error:', err);
    return NextResponse.json({ error: err.message || 'Failed to download audio' }, { status: 500 });
  }
}

async function transcodeToMp3(input: Buffer): Promise<Buffer> {
  // Lazy-import so this route still loads even if these packages are
  // somehow unavailable in a given deploy environment — the catch above
  // will fall back gracefully.
  const ffmpegStatic = (await import('ffmpeg-static')).default as unknown as string;
  const ffmpeg = (await import('fluent-ffmpeg')).default;
  if (!ffmpegStatic) throw new Error('ffmpeg binary not available in this environment');
  ffmpeg.setFfmpegPath(ffmpegStatic);

  const tmpDir = os.tmpdir();
  const inPath = path.join(tmpDir, `in-${Date.now()}-${Math.random().toString(36).slice(2)}.webm`);
  const outPath = path.join(tmpDir, `out-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`);

  await writeFile(inPath, input);

  try {
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inPath)
        .audioCodec('libmp3lame')
        .audioBitrate('96k')
        .format('mp3')
        .on('end', () => resolve())
        .on('error', reject)
        .save(outPath);
    });
    return await readFile(outPath);
  } finally {
    await unlink(inPath).catch(() => {});
    await unlink(outPath).catch(() => {});
  }
}
