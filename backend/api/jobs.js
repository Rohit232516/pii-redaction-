const express = require('express');
const { getDb } = require('../db/client');
const Job = require('../db/jobModel');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.json({ jobs: [], message: 'No database connected — job history unavailable' });
    }
    const jobs = await Job.find().sort({ uploadedAt: -1 }).limit(50);
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
