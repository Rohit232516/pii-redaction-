# PII Redaction Tool — Evaluation Report

_Generated: 2026-07-17T13:18:16.445Z_

## Test Setup

- **Input**: `evaluation/synthetic_ticket_log.txt` — 3 synthetic support tickets
- **Ground truth**: `evaluation/ground_truth.json` — manually annotated spans for all 9 PII types
- **Detection**: regex + compromise.js NER hybrid (Node.js, no Python)

## How the Ground Truth Was Built

1. Authored a synthetic ticket log containing known PII instances of every required type, each appearing at least twice to test consistency.
2. Manually listed every PII value and its surface forms in `ground_truth.json`.
3. The evaluator normalises both detected values and ground-truth values (lowercase, collapsed whitespace) before comparison — so casing differences don't penalise the detector.

## Results

| Type         | GT | Det | TP | FP | FN | Prec   | Recall | F1     |
|--------------|-----|-----|----|----|-----|--------|--------|--------|
| NAME         | 5 | 5 | 4 | 1 | 1 | 80.0% | 80.0% | 80.0% |
| EMAIL        | 5 | 5 | 5 | 0 | 0 | 100.0% | 100.0% | 100.0% |
| PHONE        | 4 | 4 | 4 | 0 | 0 | 100.0% | 100.0% | 100.0% |
| CREDIT_CARD  | 3 | 3 | 3 | 0 | 0 | 100.0% | 100.0% | 100.0% |
| SSN          | 3 | 3 | 3 | 0 | 0 | 100.0% | 100.0% | 100.0% |
| IP_ADDRESS   | 3 | 3 | 3 | 0 | 0 | 100.0% | 100.0% | 100.0% |
| DOB          | 5 | 4 | 4 | 0 | 1 | 100.0% | 80.0% | 88.9% |
| COMPANY      | 3 | 5 | 2 | 3 | 1 | 40.0% | 66.7% | 50.0% |
| ADDRESS      | 3 | 2 | 0 | 2 | 3 | 0.0% | 0.0% | 0.0% |

### Aggregate

| Metric | Precision | Recall | F1 |
|--------|-----------|--------|----|
| **Micro avg** | 82.4% | 82.4% | 82.4% |
| **Macro avg** | 80.0% | 80.7% | 79.9% |

## Known False Positives

- **PHONE**: Short numeric sequences near text (e.g. account IDs like `ACC-887234`) may partially match the phone regex if they hit the digit-count threshold. Mitigated by requiring 10+ digits.
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
| Extending | Add one entry to `DETECTORS` array | Add a pipeline component |
| Verdict | **Chosen** for scope fit | Better for production at scale |
