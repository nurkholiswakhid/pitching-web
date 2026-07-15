'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// ── Setup PDF.js worker (CDN — no bundling needed, v5 compatible)
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

// ─── Constants ────────────────────────────────────────────────────────────────
const PDF_URL   = '/proposal.pdf';
const PDF_TITLE = 'Proposal Penawaran';

// ─── Icons ────────────────────────────────────────────────────────────────────
const Ic = {
  prev: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><polyline points="15 18 9 12 15 6"/></svg>,
  next: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><polyline points="9 18 15 12 9 6"/></svg>,
  zoomIn: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>,
  zoomOut: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>,
  full: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>,
  exitFull: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}><polyline points="8 3 3 3 3 8"/><polyline points="21 8 21 3 16 3"/><polyline points="3 16 3 21 8 21"/><polyline points="16 21 21 21 21 16"/></svg>,
  rotate: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  download: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PDFViewerPage() {
  const [numPages, setNumPages]         = useState<number>(0);
  const [currentPage, setCurrentPage]   = useState(1);
  const [scale, setScale]               = useState(1.0);
  const [rotation, setRotation]         = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [pageInputVal, setPageInputVal] = useState('1');
  const [containerWidth, setContainerWidth] = useState(0);
  const [isLoading, setIsLoading]       = useState(true);
  const [isMobile, setIsMobile]         = useState(false);

  const rootRef         = useRef<HTMLDivElement>(null);
  const mainRef         = useRef<HTMLDivElement>(null);
  const toolbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Ukur container untuk scaling responsif
  useEffect(() => {
    const measure = () => {
      if (mainRef.current) {
        setContainerWidth(mainRef.current.clientWidth);
      }
      setIsMobile(window.innerWidth < 768);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (mainRef.current) ro.observe(mainRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Fullscreen sync
  useEffect(() => {
    const onFSChange = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener('fullscreenchange', onFSChange);
    return () => document.removeEventListener('fullscreenchange', onFSChange);
  }, []);

  // ── Auto-hide toolbar di fullscreen
  useEffect(() => {
    if (!isFullscreen) { setToolbarVisible(true); return; }
    const reset = () => {
      setToolbarVisible(true);
      if (toolbarTimerRef.current) clearTimeout(toolbarTimerRef.current);
      toolbarTimerRef.current = setTimeout(() => setToolbarVisible(false), 3500);
    };
    reset();
    ['mousemove', 'touchstart'].forEach(ev => window.addEventListener(ev, reset));
    return () => {
      ['mousemove', 'touchstart'].forEach(ev => window.removeEventListener(ev, reset));
      if (toolbarTimerRef.current) clearTimeout(toolbarTimerRef.current);
    };
  }, [isFullscreen]);

  // ── Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT') return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setCurrentPage(p => Math.min(p + 1, numPages));
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   setCurrentPage(p => Math.max(p - 1, 1));
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-') handleZoomOut();
      if (e.key === 'Escape' && isFullscreen) exitFullscreen();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numPages, isFullscreen, scale]);

  // Sync page input
  useEffect(() => { setPageInputVal(String(currentPage)); }, [currentPage]);

  // ── Kalkulasi scale agar PDF mengisi lebar container
  // Kita set scale berdasarkan container width (di-pass ke komponen Page)
  const pageWidth = containerWidth > 0 ? containerWidth : undefined;

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  }, []);

  const handleZoomIn  = () => setScale(s => Math.min(+(s + 0.15).toFixed(2), 3.0));
  const handleZoomOut = () => setScale(s => Math.max(+(s - 0.15).toFixed(2), 0.5));
  const handleZoomReset = () => setScale(1.0);

  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      rootRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else exitFullscreen();
  }, [isFullscreen]);

  const exitFullscreen = () => {
    document.exitFullscreen?.();
    setIsFullscreen(false);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = PDF_URL;
    a.download = `${PDF_TITLE}.pdf`;
    a.click();
  };

  const handlePageInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const v = parseInt(pageInputVal);
      if (!isNaN(v) && v >= 1 && v <= numPages) setCurrentPage(v);
      else setPageInputVal(String(currentPage));
    }
  };

  const TOOLBAR_H = isMobile ? 48 : 54;

  return (
    <>
      <style>{`
        html, body { margin: 0; padding: 0; overflow: hidden; height: 100%; }

        #vwr-root {
          position: fixed;
          inset: 0;
          height: 100dvh;
          width: 100dvw;
          display: flex;
          flex-direction: column;
          background: #0d0f14;
          overflow: hidden;
        }

        #vwr-bar {
          flex-shrink: 0;
          height: ${TOOLBAR_H}px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 12px;
          background: rgba(8,10,16,0.96);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          border-bottom: 1px solid rgba(255,255,255,0.07);
          transition: opacity 0.3s, transform 0.3s;
          z-index: 200;
          flex-shrink: 0;
          overflow: hidden;
        }

        #vwr-main {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: #111318;
          /* Smooth momentum scrolling on iOS */
          -webkit-overflow-scrolling: touch;
        }

        /* react-pdf canvas wrapper */
        .react-pdf__Page {
          display: flex !important;
          justify-content: center;
        }
        .react-pdf__Page__canvas {
          max-width: 100% !important;
          height: auto !important;
          border-radius: 2px;
          box-shadow: 0 4px 32px rgba(0,0,0,0.5);
        }

        /* Loading skeleton */
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .pdf-skeleton {
          background: linear-gradient(90deg, #1a1e28 25%, #22283a 50%, #1a1e28 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
        }

        /* Hide on mobile */
        @media (max-width: 640px) {
          .hide-sm { display: none !important; }
        }
        @media (max-width: 480px) {
          .hide-xs { display: none !important; }
        }
      `}</style>

      <div id="vwr-root" ref={rootRef}>

        {/* ── Toolbar ── */}
        <header
          id="vwr-bar"
          style={{
            opacity: toolbarVisible ? 1 : 0,
            transform: toolbarVisible ? 'translateY(0)' : 'translateY(-100%)',
            pointerEvents: toolbarVisible ? 'auto' : 'none',
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
            <img
              src="/logo.png" alt="TeknaRupa"
              style={{ width: isMobile ? 28 : 32, height: isMobile ? 28 : 32, borderRadius: 6, objectFit: 'contain', background: '#fff', padding: 2 }}
            />
            <div className="hide-sm">
              <p style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>
                <span style={{ color: '#3b82f6' }}>Tekna</span>
                <span style={{ color: '#f97316' }}>Rupa</span>
              </p>
              <p style={{ fontSize: 9, color: '#5a6478' }}>Proposal Penawaran</p>
            </div>
          </div>

          <div style={{ flex: 1 }} />

          {/* Page nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Btn onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage <= 1} title="Sebelumnya">
              <Ic.prev />
            </Btn>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <input
                value={pageInputVal}
                onChange={e => setPageInputVal(e.target.value)}
                onKeyDown={handlePageInput}
                inputMode="numeric"
                aria-label="Halaman"
                style={{
                  width: 34, textAlign: 'center', fontSize: 12, fontWeight: 600,
                  background: 'rgba(255,255,255,0.06)', color: '#f0f2f7',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 5,
                  padding: '4px 2px', outline: 'none',
                }}
                onFocus={e => (e.target.style.borderColor = '#6366f1')}
                onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
              <span style={{ fontSize: 11, color: '#5a6478', whiteSpace: 'nowrap' }}>/ {numPages}</span>
            </div>
            <Btn onClick={() => setCurrentPage(p => Math.min(p + 1, numPages))} disabled={currentPage >= numPages} title="Berikutnya">
              <Ic.next />
            </Btn>
          </div>

          <Sep />

          {/* Zoom — sembunyikan di mobile kecil */}
          <div className="hide-sm" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Btn onClick={handleZoomOut} disabled={scale <= 0.5} title="Perkecil"><Ic.zoomOut /></Btn>
            <button
              onClick={handleZoomReset}
              style={{
                fontSize: 11, fontWeight: 600, color: '#f0f2f7',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 5, padding: '4px 7px', cursor: 'pointer', minWidth: 46, outline: 'none',
              }}
            >{Math.round(scale * 100)}%</button>
            <Btn onClick={handleZoomIn} disabled={scale >= 3.0} title="Perbesar"><Ic.zoomIn /></Btn>
          </div>

          <Sep className="hide-sm" />

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <div className="hide-xs">
              <Btn onClick={() => setRotation(r => (r + 90) % 360)} title="Putar 90°"><Ic.rotate /></Btn>
            </div>
            <Btn onClick={handleDownload} title="Unduh PDF"><Ic.download /></Btn>
            <div className="hide-sm">
              <Btn onClick={toggleFullscreen} title={isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh (F)'} accent>
                {isFullscreen ? <Ic.exitFull /> : <Ic.full />}
              </Btn>
            </div>
          </div>
        </header>

        {/* ── Area PDF ── */}
        <main id="vwr-main" ref={mainRef}>
          {/* Loading skeleton */}
          {isLoading && (
            <div style={{ width: '100%', maxWidth: 700, padding: 16, flexShrink: 0 }}>
              <div className="pdf-skeleton" style={{ width: '100%', aspectRatio: '210/297', borderRadius: 4 }} />
            </div>
          )}

          <Document
            file={PDF_URL}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={null}
            error={
              <div style={{
                padding: 32, textAlign: 'center', color: '#8892a4',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" style={{ width: 40, height: 40 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p style={{ fontSize: 14, color: '#f87171' }}>Gagal memuat PDF</p>
              </div>
            }
          >
            <Page
              pageNumber={currentPage}
              width={pageWidth}
              scale={scale}
              rotate={rotation}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              loading={
                <div style={{ width: pageWidth || '100%', aspectRatio: '210/297' }}
                  className="pdf-skeleton" />
              }
            />
          </Document>

          {/* Bottom padding agar tidak terpotong di mobile */}
          <div style={{ height: 16, flexShrink: 0 }} />
        </main>
      </div>
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Btn({
  children, onClick, disabled, title, accent, className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  accent?: boolean;
  className?: string;
}) {
  const [hov, setHov] = useState(false);
  const bg    = disabled ? 'transparent' : hov && accent ? 'rgba(99,102,241,0.25)' : hov ? 'rgba(255,255,255,0.08)' : 'transparent';
  const color = disabled ? '#374151' : accent ? (hov ? '#c7d2fe' : '#818cf8') : hov ? '#f0f2f7' : '#8892a4';
  return (
    <button
      onClick={disabled ? undefined : onClick}
      title={title}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className={className}
      style={{
        width: 32, height: 32, borderRadius: 7,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: bg, color,
        border: accent && hov ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s', flexShrink: 0, outline: 'none',
        WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
      }}
    >{children}</button>
  );
}

function Sep({ className }: { className?: string }) {
  return <div className={className} style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />;
}
