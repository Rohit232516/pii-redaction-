import React, { useRef, useState } from 'react';

const styles = {
  dropzone: (dragging) => ({
    border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 12,
    padding: '48px 32px',
    textAlign: 'center',
    cursor: 'pointer',
    background: dragging ? '#1a1d2e' : 'var(--surface)',
    transition: 'all 0.2s',
  }),
  btn: (disabled) => ({
    marginTop: 20,
    padding: '12px 32px',
    background: disabled ? '#374151' : 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.2s',
  }),
  fileName: {
    marginTop: 12,
    color: 'var(--accent)',
    fontWeight: 500,
    fontSize: 14,
  },
  muted: { color: 'var(--text-muted)', fontSize: 14, marginTop: 6 },
  icon: { fontSize: 40, marginBottom: 12 },
};

export default function Uploader({ onUpload, loading }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const inputRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const handleChange = (e) => {
    if (e.target.files[0]) setFile(e.target.files[0]);
  };

  const handleSubmit = () => {
    if (file && !loading) onUpload(file);
  };

  return (
    <div>
      <div
        style={styles.dropzone(dragging)}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current.click()}
      >
        <div style={styles.icon}>📄</div>
        <div style={{ fontWeight: 600, fontSize: 16 }}>
          {dragging ? 'Drop it here' : 'Drag & drop your ticket log here'}
        </div>
        <div style={styles.muted}>or click to browse — .txt or .docx, max 4 MB</div>
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.docx"
          style={{ display: 'none' }}
          onChange={handleChange}
        />
      </div>

      {file && <div style={styles.fileName}>Selected: {file.name}</div>}

      <button
        style={styles.btn(!file || loading)}
        disabled={!file || loading}
        onClick={handleSubmit}
      >
        {loading ? 'Redacting…' : 'Redact PII'}
      </button>
    </div>
  );
}
