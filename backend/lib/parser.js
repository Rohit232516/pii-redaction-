const mammoth = require('mammoth');
const path = require('path');

/**
 * Extract plain text from a .txt or .docx buffer/file.
 * Returns { text: string, format: 'txt'|'docx' }
 */
async function parseFile(buffer, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  if (ext === '.txt') {
    return { text: buffer.toString('utf8'), format: 'txt' };
  }

  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value, format: 'docx' };
  }

  throw new Error(`Unsupported file type: ${ext}. Please upload .txt or .docx`);
}

module.exports = { parseFile };
