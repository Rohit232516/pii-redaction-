require('dotenv').config();
const express = require('express');
const cors = require('cors');
const uploadRouter = require('./api/upload');
const jobsRouter = require('./api/jobs');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  exposedHeaders: ['X-PII-Counts', 'Content-Disposition', 'X-Preview-Text'],
}));

app.use(express.json());

app.use('/api/upload', uploadRouter);
app.use('/api/jobs', jobsRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`[server] Listening on http://localhost:${PORT}`));

module.exports = app;
