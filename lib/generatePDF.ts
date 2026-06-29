'use client';

/**
 * Generates a real PDF using jsPDF and triggers download.
 * Works in Telegram WebApp by opening as a data URL in new tab.
 */
export async function downloadReplyAsPDF(
  replyContent: string,
  leaderName: string,
  userMessage: string,
  messageDate: string,
  replyDate: string
): Promise<void> {
  // Dynamic import so jsPDF is only loaded when needed
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth  = doc.internal.pageSize.getWidth();
  const margin     = 15;
  const contentWidth = pageWidth - margin * 2;

  // ── Header ──────────────────────────────────────────
  doc.setFillColor(245, 166, 35); // accent orange
  doc.rect(0, 0, pageWidth, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Message Reply', margin, 14);

  // ── App name ─────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Downloaded from Messenger App', pageWidth - margin, 14, { align: 'right' });

  let y = 32;

  // ── Your Message section ─────────────────────────────
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('YOUR MESSAGE', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(messageDate, pageWidth - margin, y, { align: 'right' });
  y += 4;

  doc.setFillColor(245, 245, 245);
  const msgLines = doc.splitTextToSize(userMessage || '(No text content)', contentWidth - 8);
  const msgBoxH = msgLines.length * 5 + 8;
  doc.roundedRect(margin, y, contentWidth, msgBoxH, 3, 3, 'F');
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(10);
  doc.text(msgLines, margin + 4, y + 6);
  y += msgBoxH + 8;

  // ── Leader divider ───────────────────────────────────
  doc.setDrawColor(245, 166, 35);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;
  doc.setTextColor(245, 166, 35);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Reply from ${leaderName} ji`, margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(replyDate, pageWidth - margin, y, { align: 'right' });
  y += 4;

  // ── Reply content ─────────────────────────────────────
  doc.setFillColor(255, 248, 238); // warm cream
  const replyLines = doc.splitTextToSize(replyContent, contentWidth - 8);
  const replyBoxH  = replyLines.length * 5 + 8;

  // Left accent border
  doc.setFillColor(245, 166, 35);
  doc.rect(margin, y, 3, replyBoxH, 'F');

  doc.setFillColor(255, 248, 238);
  doc.rect(margin + 3, y, contentWidth - 3, replyBoxH, 'F');

  doc.setTextColor(50, 50, 50);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(replyLines, margin + 7, y + 6);
  y += replyBoxH + 10;

  // ── Footer ────────────────────────────────────────────
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Generated on ${new Date().toLocaleString('en-IN')}`,
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 8,
    { align: 'center' }
  );

  // ── Output — open in new tab (works in Telegram WebApp) ──
  const pdfDataUri = doc.output('datauristring');
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(`
      <html><head><title>Reply from ${leaderName}</title></head>
      <body style="margin:0;padding:0">
        <embed src="${pdfDataUri}" type="application/pdf" width="100%" height="100%" />
        <p style="text-align:center;font-family:sans-serif;padding:16px">
          If the PDF does not display, 
          <a href="${pdfDataUri}" download="reply-${leaderName}-${Date.now()}.pdf">click here to download</a>
        </p>
      </body></html>
    `);
    win.document.close();
  } else {
    // Fallback: direct download
    doc.save(`reply-${leaderName}-${Date.now()}.pdf`);
  }
}
