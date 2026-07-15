'use client';

import dynamic from 'next/dynamic';

// ── Muat PDF viewer hanya di browser (ssr: false)
// Ini mencegah error "DOMMatrix is not defined" di Node.js / Vercel build
const PDFViewer = dynamic(() => import('./pdf-viewer'), {
  ssr: false,
  loading: () => (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0d0f14',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 16,
    }}>
      {/* Spinner */}
      <div style={{
        width: 44, height: 44,
        border: '3px solid rgba(99,102,241,0.2)',
        borderTopColor: '#6366f1',
        borderRadius: '50%',
        animation: 'spin 0.9s linear infinite',
      }} />
      <p style={{ color: '#5a6478', fontSize: 13 }}>Memuat dokumen...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  ),
});

export default function Page() {
  return <PDFViewer />;
}
