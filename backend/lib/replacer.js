const fakeData = require('../utils/fakeData');

const FAKE_GENERATORS = {
  NAME: fakeData.fakeName,
  EMAIL: fakeData.fakeEmail,
  PHONE: fakeData.fakePhone,
  COMPANY: fakeData.fakeCompany,
  ADDRESS: fakeData.fakeAddress,
  SSN: fakeData.fakeSSN,
  CREDIT_CARD: fakeData.fakeCreditCard,
  DOB: fakeData.fakeDOB,
  IP_ADDRESS: fakeData.fakeIP,
};

/**
 * Build a consistent replacement map from detected PII.
 * Returns Map<lowerCaseRealValue, { fake, type }>
 * The same real value always maps to the same fake value within a job.
 */
function buildReplacementMap(detectedByType) {
  const map = new Map();

  for (const [type, values] of Object.entries(detectedByType)) {
    const generator = FAKE_GENERATORS[type];
    if (!generator) continue;

    for (const realValue of values) {
      const key = realValue.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { fake: generator(), type });
      }
    }
  }

  return map;
}

/**
 * Apply the replacement map to text.
 * Replaces all occurrences (case-insensitive) of each real value with its fake.
 * Longer values are replaced first to avoid partial-match collisions.
 */
function applyReplacements(text, replacementMap) {
  // Sort by length descending so longer strings are replaced before substrings
  const entries = [...replacementMap.entries()].sort(
    ([a], [b]) => b.length - a.length
  );

  let redacted = text;
  for (const [realLower, { fake }] of entries) {
    // Escape special regex chars in the real value
    const escaped = realLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'gi');
    redacted = redacted.replace(re, fake);
  }

  return redacted;
}

module.exports = { buildReplacementMap, applyReplacements };
