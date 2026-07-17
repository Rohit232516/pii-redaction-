import React from 'react';

const styles = {
  container: {
    marginTop: 32,
    background: 'var(--surface)',
    borderRadius: 12,
    padding: 24,
    border: '1px solid var(--border)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: 700 },
  downloadBtn: {
    padding: '10px 24px',
    background: 'var(--success)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14,
  },
  stats: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  badge: (color) => ({
    padding: '4px 12px',
    borderRadius: 20,
    background: color,
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
  }),
  pre: {
    background: 'var(--surface2)',
    borderRadius: 8,
    padding: 16,
    fontSize: 13,
    lineHeight: 1.7,
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    maxHeight: 400,
    overflowY: 'auto',
    border: '1px solid var(--border)',
    color: '#cbd5e1',
  },
};

const TYPE_COLORS = {
  NAME: '#6366f1',
  EMAIL: '#0ea5e9',
  PHONE: '#f59e0b',
  COMPANY: '#8b5cf6',
  ADDRESS: '#ec4899',
  SSN: '#ef4444',
  CREDIT_CARD: '#f97316',
  DOB: '#14b8a6',
  IP_ADDRESS: '#84cc16',
};

export default function Preview({ result, onDownload }) {
  if (!result) return null;

  const { piiCounts, previewText } = result;
  const total = Object.values(piiCounts).reduce((a, b) => a + b, 0);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>Redaction Complete</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            {total} unique PII value{total !== 1 ? 's' : ''} replaced
          </div>
        </div>
        <button style={styles.downloadBtn} onClick={onDownload}>
          ⬇ Download Redacted .docx
        </button>
      </div>

      {total > 0 && (
        <div style={styles.stats}>
          {Object.entries(piiCounts).map(([type, count]) => (
            <span key={type} style={styles.badge(TYPE_COLORS[type] || '#475569')}>
              {type.replace('_', ' ')}: {count}
            </span>
          ))}
        </div>
      )}

      {previewText && (
        <>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
            Redacted text preview:
          </div>
          <pre style={styles.pre}>{previewText}</pre>
        </>
      )}
    </div>
  );
}
