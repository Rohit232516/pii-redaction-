const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    piiCounts: { type: Map, of: Number, default: {} },
    metrics: {
      precision: Number,
      recall: Number,
      f1: Number,
    },
  },
  { versionKey: false }
);

const Job = mongoose.models.Job || mongoose.model('Job', jobSchema);

module.exports = Job;
