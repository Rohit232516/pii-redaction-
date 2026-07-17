# PII Redaction Tool

Upload a support-ticket log (`.txt` or `.docx`), get back a `.docx` with all personal data replaced by realistic fake alternatives — consistently, so the same real value always maps to the same fake value throughout the document.

**Live demo:** _add Vercel URL here after deployment_

---

## What it does

| Step | Detail |
|---|---|
| Upload | `.txt` or `.docx`, up to 4 MB |
| Detect | Hybrid: regex (structured PII) + compromise.js NER (names/orgs/addresses) |
| Replace | Each real PII value → one consistent fake via `@faker-js/faker` |
| Download | Redacted `.docx` built with the `docx` library |
| Store | Job metadata (filename, timestamp, PII counts) in MongoDB Atlas (optional) |

---

## PII types detected

| Type | Method | Example |
|---|---|---|
| Email | Regex | `rashi.patil@example.com` → `amelia.jones@fakemail.com` |
| Phone (+91 / intl) | Regex | `+91 98765 43210` → `+91 71234 56789` |
| SSN | Regex | `523-41-8837` → `891-23-4567` |
| Credit card (Visa/MC/Amex) | Regex + Luhn validation | `4111 1111 1111 1111` → `4539 1488 0343 6467` |
| IP address | Regex | `192.168.45.201` → `10.22.33.44` |
| Date of birth | Contextual regex (DOB-signal keyword required) | `DOB: 14/03/1990` → `DOB: 22/08/1985` |
| Full names | compromise.js NER + keyword anchors + Title Case heuristic | `Rashi Patil` → `Emily Carter` |
| Company names | compromise.js NER + "works at / employed at" signal | `Infosys Limited` → `Acme Corp` |
| Physical addresses | Street-pattern regex + compromise places | `42 Shivaji Nagar…` → `7 Baker Street…` |

### What is NOT redacted

- **Ticket / order numbers** (`TKT-20240115-001`, `ACC-887234`) — these are operational identifiers, not personal PII. Redacting them would make the log unnavigable. This is a conscious product decision; change it by adding a `TICKET_ID` detector to `backend/lib/detector.js`.
- **Ticket creation timestamps** — only dates preceded by DOB-signal keywords (`DOB:`, `born on`, `date of birth`) are flagged, so timestamps like `2024-01-15 09:23` are preserved.

---

## Architecture

```
scalar_assignment/
├── backend/
│   ├── server.js            Express entry point
│   ├── api/
│   │   ├── upload.js        POST /api/upload — parse → redact → docx → respond
│   │   └── jobs.js          GET  /api/jobs   — list stored job records
│   ├── lib/
│   │   ├── parser.js        .txt / .docx → plain text (mammoth)
│   │   ├── detector.js      ← ADD NEW PII TYPES HERE
│   │   ├── replacer.js      Build consistent real→fake map + apply
│   │   ├── redactor.js      Orchestrate detect → map → replace
│   │   └── docxWriter.js    Build output .docx (docx library)
│   ├── db/
│   │   ├── client.js        Mockable MongoDB connection
│   │   └── jobModel.js      Mongoose schema
│   └── utils/
│       └── fakeData.js      @faker-js/faker wrappers per PII type
├── frontend/                React + Vite
│   └── src/
│       ├── App.jsx
│       ├── api.js
│       └── components/
│           ├── Uploader.jsx
│           ├── Preview.jsx
│           └── JobHistory.jsx
├── evaluation/
│   ├── synthetic_ticket_log.txt   Test input (3 tickets, all 9 PII types)
│   ├── ground_truth.json          Annotated spans for evaluation
│   ├── evaluate.js                Precision / recall / F1 harness
│   └── report.md                  Generated evaluation report
├── vercel.json
└── .env.example
```

### How to add a new PII type

Open **`backend/lib/detector.js`** and append to the `DETECTORS` array:

```js
// Regex-based example (e.g. Aadhaar number)
{
  type: 'AADHAAR',
  detect: regexDetector(/\b\d{4}[\s\-]\d{4}[\s\-]\d{4}\b/g),
},
```

Then add a fake generator in **`backend/utils/fakeData.js`**:

```js
function fakeAadhaar() {
  faker.seed(nextSeed());
  return `${faker.string.numeric(4)} ${faker.string.numeric(4)} ${faker.string.numeric(4)}`;
}
```

And register it in **`backend/lib/replacer.js`**:

```js
AADHAAR: fakeAadhaar,
```

That's it — detection, replacement, and docx output all pick it up automatically.

---

## Detection approach: why Node-only hybrid instead of Python spaCy?

| | Node hybrid (this implementation) | Python spaCy |
|---|---|---|
| Name/Org/Address NER | Moderate (compromise.js) | High (en_core_web_trf) |
| Structured PII (email/phone/SSN/CC/IP) | Excellent (regex + Luhn) | Same |
| Deployment | Vercel serverless, zero config | Separate runtime needed |
| Cold start | ~200 ms | 1–3 s |
| Extending | One entry in `DETECTORS` array | New pipeline component |

For this scope (support-ticket logs where structured PII dominates), the Node hybrid gives 82%+ F1 overall with clean serverless deployment. A production system handling free-form clinical notes or legal documents would benefit from spaCy.

---

## Evaluation results

See `evaluation/report.md` for the full table. Summary:

| Metric | Score |
|---|---|
| Micro precision | 82.4% |
| Micro recall | 82.4% |
| Micro F1 | **82.4%** |

Run it yourself:
```bash
node evaluation/evaluate.js
```

### Known false positives
- **COMPANY**: "American Express" sometimes caught as a company name even when it appears as a card-type label.
- **NAME**: Title Case heuristic occasionally picks up place names (e.g. "Shivaji Nagar") that escape the stop-phrase filter.

### Known false negatives
- **ADDRESS**: Multi-line postal blocks where the city/PIN is on a second line are not fully captured in a single match.
- **DOB**: Bare dates without a signal keyword (e.g. `15 March 1990` in running text) are intentionally skipped.
- **NAME**: Compromise.js has lower recall for South Indian names; the keyword-anchor fallback compensates partly.

---

## Local development

```bash
# Backend
cd backend && npm install
cp ../.env.example ../.env   # edit MONGO_URI if you have Atlas
node server.js               # http://localhost:4000

# Frontend (separate terminal)
cd frontend && npm install
npm run dev                  # http://localhost:5173

# Evaluation
node evaluation/evaluate.js
```

---

## Deployment on Vercel

### Prerequisites
- Vercel account (free tier)
- GitHub repo with this code

### Steps

1. **Push to GitHub** (see instructions below)

2. **Import to Vercel**
   - Go to vercel.com → New Project → Import your GitHub repo
   - Framework preset: **Other**
   - Build command: `cd frontend && npm install && npm run build`
   - Output directory: `frontend/dist`
   - Root directory: `.` (repo root)

3. **Set environment variables** in Vercel dashboard → Settings → Environment Variables:
   ```
   MONGO_URI        = mongodb+srv://...   (optional — skip if you don't have Atlas)
   FRONTEND_URL     = https://your-app.vercel.app
   ```

4. **Deploy** — Vercel builds frontend static assets and wraps `backend/server.js` as a serverless function.

5. **Redeploy after changes**: just `git push` — Vercel auto-deploys on every push to `main`.

### MongoDB Atlas setup (optional)
1. atlas.mongodb.com → Create free M0 cluster
2. Database Access → Add user
3. Network Access → Allow `0.0.0.0/0` (for Vercel serverless IPs)
4. Connect → Drivers → copy connection string → paste into Vercel env var `MONGO_URI`

---

## Tradeoffs & limitations

- **4 MB file limit** — Vercel serverless request body cap. Larger files need pre-signed S3 upload.
- **No streaming** — the redacted docx is buffered in memory before sending. Fine for demo docs.
- **No PII stored** — only counts per type are persisted in MongoDB. Raw PII never touches the DB.
- **Consistency scope** — the real→fake mapping is per-job (per upload), not global. The same person appearing across two different uploads will get different fake names.
