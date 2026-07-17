const { detectAll } = require('./detector');
const { buildReplacementMap, applyReplacements } = require('./replacer');

/**
 * Full redaction pipeline.
 * @param {string} text - plain text extracted from the uploaded file
 * @returns {{
 *   redactedText: string,
 *   piiCounts: Record<string, number>,
 *   replacementMap: Map<string, {fake: string, type: string}>
 * }}
 */
function redact(text) {
  const detected = detectAll(text);

  // Count unique PII values per type
  const piiCounts = {};
  for (const [type, values] of Object.entries(detected)) {
    piiCounts[type] = values.length;
  }

  const replacementMap = buildReplacementMap(detected);
  const redactedText = applyReplacements(text, replacementMap);

  return { redactedText, piiCounts, replacementMap };
}

module.exports = { redact };
