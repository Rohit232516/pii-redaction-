import React, { useState } from 'react';
import Uploader from './components/Uploader';
import Preview from './components/Preview';
import JobHistory from './components/JobHistory';
import { uploadFile } from './api';

const styles = {
  page: {
    maxWidth: 860,
    margin: '0 auto',
    padding: '40px 20px 80px',
  },
  header: {
    marginBottom: 40,
    textAlign: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 800,
    background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: 8,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 15,
  },
  card: {
    background: '#1e2130',
    border: '1px solid #2d3550',
    borderRadius: 16,
    padding: 32,
  },
  error: {
    marginTop: 16,
    padding: '12px 16px',
    background: '#3b0f0f',
    border: '1px solid #ef4444',
    borderRadius: 8,
    color: '#fca5a5',
    fontSize: 14,
  },
};

export default function App() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [blobUrl, setBlobUrl] = useState(null);
  const [downloadName, setDownloadName] = useState('redacted.docx');

  const handleUpload = async (file) => {
    setLoading(true);
    setError('');
    setResult(null);
    if (blobUrl) URL.revokeObjectURL(blobUrl);

    try {
      const { blob, filename, piiCounts, previewText } = await uploadFile(file);
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
      setDownloadName(filename);
      setResult({ piiCounts, previewText });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = downloadName;
    a.click();
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>PII Redaction Tool</h1>
        <p style={styles.subtitle}>
          Upload a support ticket log — get back a .docx with all personal data replaced by realistic fakes
        </p>
      </div>

      <div style={styles.card}>
        <Uploader onUpload={handleUpload} loading={loading} />
        {error && <div style={styles.error}>⚠ {error}</div>}
      </div>

      <Preview result={result} onDownload={handleDownload} />
      <JobHistory />
    </div>
  );
}
