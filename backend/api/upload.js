const express = require('express');
const multer = require('multer');
const { parseFile } = require('../lib/parser');
const { redact } = require('../lib/redactor');
const { buildDocx } = require('../lib/docxWriter');
const { getDb } = require('../db/client');
const Job = require('../db/jobModel');

const router = express.Router();

// Store uploads in memory (Vercel serverless has no writable disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }, // 4 MB
  fileFilter: (_req, file, cb) => {
    if (['.txt', '.docx'].some((ext) => file.originalname.toLowerCase().endsWith(ext))) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt and .docx files are supported'));
    }
  },
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // 1. Parse
    const { text } = await parseFile(req.file.buffer, req.file.originalname);

    // 2. Redact
    const { redactedText, piiCounts } = redact(text);

    // 3. Build .docx
    const docxBuffer = await buildDocx(redactedText, req.file.originalname);

    // 4. Persist job record (no-op if DB unavailable)
    try {
      const db = await getDb();
      if (db) {
        await Job.create({ filename: req.file.originalname, piiCounts });
      }
    } catch (dbErr) {
      console.warn('[upload] DB write failed (non-fatal):', dbErr.message);
    }

    // 5. Return docx + metadata
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="redacted_${req.file.originalname.replace(/\.[^.]+$/, '')}.docx"`);
    res.setHeader('X-PII-Counts', JSON.stringify(piiCounts));
    res.setHeader('X-Preview-Text', Buffer.from(redactedText.slice(0, 2000)).toString('base64'));
    res.send(docxBuffer);
  } catch (err) {
    console.error('[upload] Error:', err);
    res.status(500).json({ error: err.message || 'Redaction failed' });
  }
});

module.exports = router;
