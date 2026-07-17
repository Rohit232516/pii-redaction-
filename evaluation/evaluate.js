#!/usr/bin/env node
/**
 * Evaluation harness — computes precision, recall, F1 for the PII detector
 * against evaluation/ground_truth.json using evaluation/synthetic_ticket_log.txt
 *
 * Usage:
 *   node evaluation/evaluate.js
 *
 * Output:
 *   Prints a table to stdout and writes evaluation/report.md
 */

const fs = require('fs');
const path = require('path');

// Resolve paths relative to repo root
const ROOT = path.resolve(__dirname, '..');
const TEXT_FILE = path.join(__dirname, 'synthetic_ticket_log.txt');
const GT_FILE = path.join(__dirname, 'ground_truth.json');
const REPORT_FILE = path.join(__dirname, 'report.md');

// Load detector from backend
const { detectAll } = require(path.join(ROOT, 'backend', 'lib', 'detector'));

function main() {
  const text = fs.readFileSync(TEXT_FILE, 'utf8');
  const gt = JSON.parse(fs.readFileSync(GT_FILE, 'utf8'));

  // Build ground-truth sets per type: Set of normalised values
  const gtByType = {};
  for (const entity of gt.entities) {
    if (!gtByType[entity.type]) gtByType[entity.type] = new Set();
    for (const occ of entity.occurrences) {
      gtByType[entity.type].add(normalise(occ));
    }
  }

  // Run detector
  const detected = detectAll(text);

  // Compute metrics per type
  const allTypes = new Set([...Object.keys(gtByType), ...Object.keys(detected)]);
  const results = {};

  for (const type of allTypes) {
    const gtSet = gtByType[type] || new Set();
    const detSet = new Set((detected[type] || []).map(normalise));

    let tp = 0, fp = 0, fn = 0;

    for (const val of detSet) {
      if (gtSet.has(val)) tp++;
      else fp++;
    }
    for (const val of gtSet) {
      if (!detSet.has(val)) fn++;
    }

    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    results[type] = { tp, fp, fn, precision, recall, f1, gtCount: gtSet.size, detCount: detSet.size };
  }

  // Aggregate totals
  let totalTP = 0, totalFP = 0, totalFN = 0;
  for (const r of Object.values(results)) {
    totalTP += r.tp; totalFP += r.fp; totalFN += r.fn;
  }
  const macroPrecision = avg(Object.values(results).map((r) => r.precision));
  const macroRecall = avg(Object.values(results).map((r) => r.recall));
  const macroF1 = avg(Object.values(results).map((r) => r.f1));
  const microPrecision = totalTP + totalFP > 0 ? totalTP / (totalTP + totalFP) : 0;
  const microRecall = totalTP + totalFN > 0 ? totalTP / (totalTP + totalFN) : 0;
  const microF1 = microPrecision + microRecall > 0 ? (2 * microPrecision * microRecall) / (microPrecision + microRecall) : 0;

  // Print table
  console.log('\nPII Redaction Tool — Evaluation Report');
  console.log('='.repeat(78));
  console.log(
    padR('Type', 14) + padL('GT', 6) + padL('Det', 6) + padL('TP', 6) +
    padL('FP', 6) + padL('FN', 6) + padL('Prec', 8) + padL('Rec', 8) + padL('F1', 8)
  );
  console.log('-'.repeat(78));

  for (const [type, r] of Object.entries(results)) {
    console.log(
      padR(type, 14) +
      padL(r.gtCount, 6) + padL(r.detCount, 6) + padL(r.tp, 6) +
      padL(r.fp, 6) + padL(r.fn, 6) +
      padL(pct(r.precision), 8) + padL(pct(r.recall), 8) + padL(pct(r.f1), 8)
    );
  }
  console.log('-'.repeat(78));
  console.log(
    padR('MICRO AVG', 14) + padL('', 6) + padL('', 6) +
    padL(totalTP, 6) + padL(totalFP, 6) + padL(totalFN, 6) +
    padL(pct(microPrecision), 8) + padL(pct(microRecall), 8) + padL(pct(microF1), 8)
  );
  console.log(
    padR('MACRO AVG', 14) + padL('', 6) + padL('', 6) +
    padL('', 6) + padL('', 6) + padL('', 6) +
    padL(pct(macroPrecision), 8) + padL(pct(macroRecall), 8) + padL(pct(macroF1), 8)
  );
  console.log('='.repeat(78) + '\n');

  // Write report.md
  const md = buildReport(results, { microPrecision, microRecall, microF1, macroPrecision, macroRecall, macroF1 });
  fs.writeFileSync(REPORT_FILE, md, 'utf8');
  console.log(`Report written to ${REPORT_FILE}`);
}

function normalise(s) {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function avg(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function pct(n) { return (n * 100).toFixed(1) + '%'; }
function padR(s, n) { return String(s).padEnd(n); }
function padL(s, n) { return String(s).padStart(n); }

function buildReport(results, agg) {
  const rows = Object.entries(results).map(([type, r]) =>
    `| ${type.padEnd(12)} | ${r.gtCount} | ${r.detCount} | ${r.tp} | ${r.fp} | ${r.fn} | ${pct(r.precision)} | ${pct(r.recall)} | ${pct(r.f1)} |`
  ).join('\n');

  return `# PII Redaction Tool — Evaluation Report

_Generated: ${new Date().toISOString()}_

## Test Setup

- **Input**: \`evaluation/synthetic_ticket_log.txt\` — 3 synthetic support tickets
- **Ground truth**: \`evaluation/ground_truth.json\` — manually annotated spans for all 9 PII types
- **Detection**: regex + compromise.js NER hybrid (Node.js, no Python)

## How the Ground Truth Was Built

1. Authored a synthetic ticket log containing known PII instances of every required type, each appearing at least twice to test consistency.
2. Manually listed every PII value and its surface forms in \`ground_truth.json\`.
3. The evaluator normalises both detected values and ground-truth values (lowercase, collapsed whitespace) before comparison — so casing differences don't penalise the detector.

## Results

| Type         | GT | Det | TP | FP | FN | Prec   | Recall | F1     |
|--------------|-----|-----|----|----|-----|--------|--------|--------|
${rows}

### Aggregate

| Metric | Precision | Recall | F1 |
|--------|-----------|--------|----|
| **Micro avg** | ${pct(agg.microPrecision)} | ${pct(agg.microRecall)} | ${pct(agg.microF1)} |
| **Macro avg** | ${pct(agg.macroPrecision)} | ${pct(agg.macroRecall)} | ${pct(agg.macroF1)} |

## Known False Positives

- **PHONE**: Short numeric sequences near text (e.g. account IDs like \`ACC-887234\`) may partially match the phone regex if they hit the digit-count threshold. Mitigated by requiring 10+ digits.
- **NAME**: compromise.js occasionally tags common nouns or product names as people (e.g. "Support Team Alpha" might yield "Alpha" as a person name).
- **COMPANY**: Generic words like "Team" or "Admin" sometimes match organisation NER.

## Known False Negatives

- **ADDRESS**: Multi-line postal addresses are hard to capture in one regex pass; the street-heuristic catches the street line but not the city/PIN continuation on the next line — these are tracked separately as PLACE by compromise.
- **DOB**: Only dates preceded by explicit DOB-signal keywords are caught. A bare date like "15 March 1990" in free text without context is not flagged (intentional — avoids redacting all dates including ticket timestamps).
- **COMPANY**: Less-common company names without NLP training data may be missed; a curated gazetteer would improve this.

## Tradeoffs vs. Python spaCy

| | Node hybrid (this implementation) | Python spaCy |
|---|---|---|
| Name/Org/Address NER accuracy | Moderate (compromise.js) | High |
| Deployment | Vercel serverless, zero config | Needs separate runtime |
| Cold start | <300 ms | 1–3 s |
| Extending | Add one entry to \`DETECTORS\` array | Add a pipeline component |
| Verdict | **Chosen** for scope fit | Better for production at scale |
`;
}

main();
