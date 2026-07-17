const { Document, Paragraph, TextRun, HeadingLevel, Packer } = require('docx');

/**
 * Convert redacted plain text to a .docx Buffer.
 * Preserves paragraph breaks; lines starting with '---' or '===' become dividers.
 */
async function buildDocx(redactedText, originalFilename) {
  const lines = redactedText.split('\n');
  const children = [];

  // Title
  children.push(
    new Paragraph({
      text: `Redacted: ${originalFilename}`,
      heading: HeadingLevel.HEADING_1,
    })
  );

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('===') || trimmed.startsWith('---')) {
      // Horizontal rule substitute — bold dashes
      children.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed, bold: true, color: '888888' })],
        })
      );
    } else if (trimmed === '') {
      children.push(new Paragraph({ text: '' }));
    } else {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line })],
        })
      );
    }
  }

  const doc = new Document({
    creator: 'PII Redaction Tool',
    title: `Redacted — ${originalFilename}`,
    sections: [{ children }],
  });

  return Packer.toBuffer(doc);
}

module.exports = { buildDocx };
