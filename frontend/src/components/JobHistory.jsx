import React, { useEffect, useState } from 'react';
import { fetchJobs } from '../api';

const styles = {
  container: {
    marginTop: 40,
    background: 'var(--surface)',
    borderRadius: 12,
    padding: 24,
    border: '1px solid var(--border)',
  },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 16 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    textAlign: 'left',
    padding: '8px 12px',
    color: 'var(--text-muted)',
    borderBottom: '1px solid var(--border)',
    fontWeight: 600,
  },
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid var(--border)',
    verticalAlign: 'top',
  },
  empty: { color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 24 },
};

export default function JobHistory() {
  const [jobs, setJobs] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs()
      .then(({ jobs, message }) => {
        setJobs(jobs || []);
        if (message) setMessage(message);
      })
      .catch(() => setMessage('Could not load job history'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (message && jobs.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.title}>Job History</div>
        <div style={styles.empty}>{message}</div>
      </div>
    );
  }
  if (jobs.length === 0) return null;

  return (
    <div style={styles.container}>
      <div style={styles.title}>Job History</div>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>File</th>
            <th style={styles.th}>Date</th>
            <th style={styles.th}>PII Found</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
            const counts = job.piiCounts || {};
            const total = Object.values(counts).reduce((a, b) => a + b, 0);
            return (
              <tr key={job._id}>
                <td style={styles.td}>{job.filename}</td>
                <td style={styles.td}>{new Date(job.uploadedAt).toLocaleString()}</td>
                <td style={styles.td}>{total} items</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
