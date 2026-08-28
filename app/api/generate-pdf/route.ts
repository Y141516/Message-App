export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/generate-pdf?message_id=xxx&telegram_id=xxx
// Generates the reply PDF SERVER-SIDE (pdf-lib) and streams it back with
// Content-Disposition: attachment. This avoids Telegram WebApp's sandbox
// restrictions on data: URIs / window.open('', '_blank') + document.write,
// which silently fail to produce a real download inside the Telegram
// in-app browser. Uses the same window.open(url) pattern that already
// works for /api/download.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get('message_id');
    const telegramId = searchParams.get('telegram_id');

    if (!messageId || !telegramId) {
      return NextResponse.json({ error: 'Missing message_id or telegram_id' }, { status: 400 });
    }

    // Verify the requester owns this message (security: prevent reading others' replies)
    const { data: user } = await supabaseAdmin
      .from('users').select('id').eq('telegram_id', telegramId).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { data: message } = await supabaseAdmin
      .from('messages')
      .select(`
        id, content, created_at, sender_id,
        leaders(display_name),
        replies(id, content, reply_type, created_at)
      `)
      .eq('id', messageId)
      .eq('sender_id', user.id)
      .single();

    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

    const reply = (message.replies as any)?.[0];
    if (!reply) return NextResponse.json({ error: 'No reply yet' }, { status: 400 });

    const leaderName = (message.leaders as any)?.display_name || 'Leader';
    const userMessage = message.content || '(No text content)';

    let replyContent: string;
    if (reply.reply_type === 'audio') {
      // Same numbering scheme as /api/dashboard and /api/download-audio-reply,
      // so the number referenced here always matches the downloaded filename.
      const { data: userMessages } = await supabaseAdmin.from('messages').select('id').eq('sender_id', user.id);
      const userMessageIds = (userMessages || []).map((m: any) => m.id);
      const { data: allAudioReplies } = await supabaseAdmin
        .from('replies')
        .select('id, created_at')
        .eq('reply_type', 'audio')
        .in('message_id', userMessageIds.length ? userMessageIds : ['00000000-0000-0000-0000-000000000000']);
      const sorted = (allAudioReplies || []).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const number = sorted.findIndex((r: any) => r.id === reply.id) + 1 || 1;
      replyContent = `[This was an audio reply — "Audio Reply - ${number}". Download the corresponding audio file from the app to listen.]`;
    } else {
      replyContent = reply.content || '';
    }

    const messageDate = new Date(message.created_at).toLocaleString('en-IN');
    const replyDate = new Date(reply.created_at).toLocaleString('en-IN');

    const pdfBytes = await buildReplyPDF({ leaderName, userMessage, replyContent, messageDate, replyDate });

    const safeLeaderName = leaderName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `reply-from-${safeLeaderName}-${Date.now()}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBytes.length),
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: any) {
    console.error('generate-pdf error:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate PDF' }, { status: 500 });
  }
}

async function buildReplyPDF(opts: {
  leaderName: string; userMessage: string; replyContent: string; messageDate: string; replyDate: string;
}) {
  const { leaderName, userMessage, replyContent, messageDate, replyDate } = opts;

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;  // A4 in points
  const pageHeight = 841.89;
  const margin = 42;
  const contentWidth = pageWidth - margin * 2;

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - 40;

  const orange = rgb(0.961, 0.651, 0.137);
  const dark = rgb(0.2, 0.2, 0.2);
  const gray = rgb(0.55, 0.55, 0.55);
  const cream = rgb(1, 0.973, 0.933);
  const lightGray = rgb(0.96, 0.96, 0.96);

  // Header bar
  page.drawRectangle({ x: 0, y: pageHeight - 62, width: pageWidth, height: 62, color: orange });
  page.drawText('Message Reply', { x: margin, y: pageHeight - 40, size: 16, font: boldFont, color: rgb(1, 1, 1) });
  page.drawText('Downloaded from Messenger App', {
    x: pageWidth - margin - font.widthOfTextAtSize('Downloaded from Messenger App', 9),
    y: pageHeight - 40, size: 9, font, color: rgb(1, 1, 1),
  });

  y = pageHeight - 62 - 30;

  // Helper: wrap text to fit width
  const wrapText = (text: string, size: number, useFont = font, maxWidth = contentWidth - 20) => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (useFont.widthOfTextAtSize(test, size) > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < 50) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - 50;
    }
  };

  // "Your Message" label + date
  page.drawText('YOUR MESSAGE', { x: margin, y, size: 8, font: boldFont, color: gray });
  const dateWidth = font.widthOfTextAtSize(messageDate, 8);
  page.drawText(messageDate, { x: pageWidth - margin - dateWidth, y, size: 8, font, color: gray });
  y -= 16;

  const msgLines = wrapText(userMessage, 10);
  const msgBoxH = msgLines.length * 14 + 16;
  ensureSpace(msgBoxH + 10);
  page.drawRectangle({ x: margin, y: y - msgBoxH, width: contentWidth, height: msgBoxH, color: lightGray });
  let ly = y - 14;
  for (const line of msgLines) {
    page.drawText(line, { x: margin + 10, y: ly, size: 10, font, color: dark });
    ly -= 14;
  }
  y -= msgBoxH + 22;

  // Reply divider
  ensureSpace(30);
  page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1, color: orange });
  y -= 14;
  page.drawText(`Reply from ${leaderName} ji`, { x: margin, y, size: 9, font: boldFont, color: orange });
  const rDateWidth = font.widthOfTextAtSize(replyDate, 8);
  page.drawText(replyDate, { x: pageWidth - margin - rDateWidth, y, size: 8, font, color: gray });
  y -= 16;

  const replyLines = wrapText(replyContent, 10);
  const replyBoxH = replyLines.length * 14 + 16;
  ensureSpace(replyBoxH + 30);

  // Left accent border + cream background
  page.drawRectangle({ x: margin, y: y - replyBoxH, width: 3, height: replyBoxH, color: orange });
  page.drawRectangle({ x: margin + 3, y: y - replyBoxH, width: contentWidth - 3, height: replyBoxH, color: cream });
  ly = y - 14;
  for (const line of replyLines) {
    page.drawText(line, { x: margin + 14, y: ly, size: 10, font, color: dark });
    ly -= 14;
  }
  y -= replyBoxH + 30;

  // Footer on last page
  const footerText = `Generated on ${new Date().toLocaleString('en-IN')}`;
  const footerWidth = font.widthOfTextAtSize(footerText, 7);
  page.drawText(footerText, { x: (pageWidth - footerWidth) / 2, y: 28, size: 7, font, color: gray });

  return doc.save();
}
