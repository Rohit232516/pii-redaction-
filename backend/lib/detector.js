const nlp = require('compromise');

// ---------------------------------------------------------------------------
// DETECTORS array — to add a new PII type, append one object here.
//
// Each detector:
//   type   : string label used throughout the pipeline
//   detect : function(text) => string[]  — returns all matched raw values
// ---------------------------------------------------------------------------

// Luhn algorithm to validate credit card numbers
function luhn(numStr) {
  const digits = numStr.replace(/\D/g, '');
  let sum = 0, alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function regexDetector(pattern) {
  return (text) => {
    const matches = [];
    const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
    let m;
    while ((m = re.exec(text)) !== null) matches.push(m[0].trim());
    return [...new Set(matches)];
  };
}

const DETECTORS = [
  // ── Structured PII — high-confidence regex ──────────────────────────────

  {
    type: 'EMAIL',
    detect: regexDetector(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g),
  },

  {
    type: 'PHONE',
    // Strict phone patterns — won't accidentally match credit card digit groups
    detect: (text) => {
      const patterns = [
        // +91 XXXXX XXXXX  or  +91-XXXXXXXXXX
        /\+91[\s\-]?\d{5}[\s\-]?\d{5}/g,
        // 0[1-9]X-XXXX-XXXX  (Indian landline — area code starts with non-zero after 0)
        /0[1-9]\d{1,3}[\s\-]\d{4}[\s\-]\d{4}/g,
        // (XXX) XXX-XXXX  US format
        /\(\d{3}\)\s?\d{3}[\s\-]\d{4}/g,
        // bare 10-digit Indian mobile (must be at word boundary, not inside longer number)
        /(?<!\d)[6-9]\d{9}(?!\d)/g,
      ];
      const results = [];
      for (const pat of patterns) {
        let m;
        while ((m = pat.exec(text)) !== null) results.push(m[0].trim());
      }
      return [...new Set(results)];
    },
  },

  {
    type: 'SSN',
    detect: regexDetector(/\b\d{3}-\d{2}-\d{4}\b/g),
  },

  {
    type: 'CREDIT_CARD',
    detect: (text) => {
      const patterns = [
        // Standard 4-4-4-4 (Visa/MC/Discover)
        /\b\d{4}[\s\-]\d{4}[\s\-]\d{4}[\s\-]\d{4}\b/g,
        // Amex 4-6-5
        /\b\d{4}[\s\-]\d{6}[\s\-]\d{5}\b/g,
        // Bare 13-16 digit (no spaces)
        /\b\d{13,16}\b/g,
      ];
      const candidates = new Set();
      for (const pat of patterns) {
        let m;
        while ((m = pat.exec(text)) !== null) {
          const raw = m[0].trim();
          const digits = raw.replace(/\D/g, '');
          if (digits.length >= 13 && digits.length <= 19 && luhn(digits)) {
            candidates.add(raw);
          }
        }
      }
      return [...candidates];
    },
  },

  {
    type: 'IP_ADDRESS',
    detect: regexDetector(
      /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g
    ),
  },

  {
    type: 'DOB',
    // Only flag dates preceded by explicit DOB-signal words (avoids redacting ticket timestamps)
    detect: (text) => {
      const dobSignalRe =
        /(?:dob|date of birth|born on|d\.o\.b\.?)\s*[:\-]?\s*(\d{1,2}[\s]\w{3,}[\s]\d{2,4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi;
      const matches = [];
      let m;
      while ((m = dobSignalRe.exec(text)) !== null) matches.push(m[1].trim());
      return [...new Set(matches)];
    },
  },

  // ── Unstructured PII — NER + pattern heuristics ─────────────────────────

  {
    type: 'NAME',
    detect: (text) => {
      // 1. compromise NER
      const doc = nlp(text);
      const nerPeople = doc.people().out('array').filter((p) => p.split(/\s+/).length >= 2 && p.length > 4);

      // 2. Keyword-anchored pattern: "Customer Name:", "Full name:", "Agent X", etc.
      const signalRe =
        /(?:customer[ \t]+name|full[ \t]+name|name[ \t]*:|contact[ \t]+name|case[ \t]+owner|agent)\s*:?[ \t]*([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+)+)/gi;
      const signalNames = [];
      let m;
      while ((m = signalRe.exec(text)) !== null) signalNames.push(m[1].trim());

      // 3. Capitalised-bigram/trigram heuristic (consecutive Title Case words, 2–3 tokens, no newlines)
      const titleRe = /\b([A-Z][a-z]{1,}(?:[ \t]+[A-Z][a-z]{1,}){1,2})\b/g;
      const titleNames = [];
      while ((m = titleRe.exec(text)) !== null) {
        const candidate = m[1].trim();
        // Exclude known non-name Title Case phrases
        const stopPhrases = /^(Support Team|Internal Notes|Customer Name|Date Of|Credit Card|Social Security|American Express|Tech Bridge|Tata Consultancy|Infosys Limited|Export|Ticket|System Administrator|Priority|Status|Issue Description|Created|Assigned Agent|Customer Rashi|Customer Arjun|Customer Meena|Shivaji Nagar|Central Mall|Jayanagar Block|Support Beta|Team Alpha|Team Beta|Sector|Dwarka New|Bengaluru Karnataka|Issue Description|Near Pune)$/i;
        if (!stopPhrases.test(candidate)) titleNames.push(candidate);
      }

      const nonNameLeads = /^(Customer|Called|Verified|Confirmed|Updated|Forwarded|Escalated|Contact|Alternate|Primary|Secondary|Office|Home|Billing|New|Old|Current|Near|North|South|East|West|Central|Internal|External|System|Export|Support|Case|Plot|Flat|House|Block|Sector|Phase|Tech|Bridge|Tata|Infosys)/i;

      const all = [...new Set([...nerPeople, ...signalNames, ...titleNames])];
      // Keep only values that look like real person names (2+ words, not all-caps, no newlines, no non-name lead words)
      return all.filter((n) => {
        if (/\n/.test(n)) return false; // discard cross-line captures
        const words = n.split(/\s+/);
        return words.length >= 2 && words.length <= 4 && n !== n.toUpperCase() && !nonNameLeads.test(n);
      });
    },
  },

  {
    type: 'COMPANY',
    detect: (text) => {
      // compromise orgs + explicit keyword anchors
      const doc = nlp(text);
      const nerOrgs = doc.organizations().out('array').filter((o) => o.length > 3);

      // "works at X", "employed at X", "Workplace: X" — stop before newline or address token
      const signalRe =
        /(?:works?\s+at|employed\s+at|workplace\s*:|company\s*:|employer\s*:)\s*([A-Z][^\n,]{2,60?})(?:\n|,\s+(?:Sector|Plot|No\.|Campus|[A-Z]{1,2}\s*\d))/gi;
      const signalOrgs = [];
      let m;
      while ((m = signalRe.exec(text)) !== null) signalOrgs.push(m[1].trim());

      return [...new Set([...nerOrgs, ...signalOrgs].filter((o) => o.length > 2))];
    },
  },

  {
    type: 'ADDRESS',
    // Street-pattern heuristic — anchored to known address-like prefixes; avoids timestamps
    detect: (text) => {
      const results = [];
      // Match lines that look like postal addresses (start with number + street, or Plot/No./Flat)
      const streetRe =
        /(?:^|\n)((?:(?:No\.|Plot|Flat|House|H\.No\.|F-|B-|Sector)[\s\-]?\w+|#\d+|\d+[A-Z]?)\s*,?\s*[\w\s,](?:Street|St\b|Road|Rd\b|Avenue|Ave\b|Nagar|Colony|Sector|Block|Cross|Layout|Park|Lane|Marg|Chowk|Bazaar|Phase|Extension)[^\n]*)/gi;
      let m;
      while ((m = streetRe.exec(text)) !== null) results.push(m[1].trim());

      return [...new Set(results.filter((a) => a.length > 8 && !/UTC|Status|Priority/i.test(a)))];
    },
  },
];

/**
 * Run all detectors over text.
 * Returns { [type]: string[] } — unique values per PII type
 */
function detectAll(text) {
  const results = {};
  for (const detector of DETECTORS) {
    const found = detector.detect(text);
    if (found.length > 0) results[detector.type] = found;
  }
  return results;
}

module.exports = { detectAll, DETECTORS };
