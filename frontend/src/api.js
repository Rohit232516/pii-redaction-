const BASE = import.meta.env.VITE_API_URL || '';

export async function uploadFile(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BASE}/api/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || 'Upload failed');
  }

  const piiCountsHeader = res.headers.get('X-PII-Counts');
  const piiCounts = piiCountsHeader ? JSON.parse(piiCountsHeader) : {};

  const previewB64 = res.headers.get('X-Preview-Text');
  const previewText = previewB64 ? atob(previewB64) : '';

  const blob = await res.blob();
  const contentDisposition = res.headers.get('Content-Disposition') || '';
  const filenameMatch = contentDisposition.match(/filename="(.+?)"/);
  const filename = filenameMatch ? filenameMatch[1] : 'redacted.docx';

  return { blob, filename, piiCounts, previewText };
}

export async function fetchJobs() {
  const res = await fetch(`${BASE}/api/jobs`);
  if (!res.ok) throw new Error('Failed to fetch jobs');
  return res.json();
}
