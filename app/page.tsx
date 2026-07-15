'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// ─── Icon Components ──────────────────────────────────────────────────────────

function IconChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function IconChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
function IconZoomIn() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}>
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}
function IconZoomOut() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}>
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}
function IconFullscreen() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}>
      <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}
function IconExitFullscreen() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}>
      <polyline points="8 3 3 3 3 8" /><polyline points="21 8 21 3 16 3" />
      <polyline points="3 16 3 21 8 21" /><polyline points="16 21 21 21 21 16" />
    </svg>
  );
}
function IconRotateCW() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}>
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}
function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PDF_URL   = '/proposal.pdf';
const PDF_TITLE = 'Proposal Penawaran';

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PDFViewerPage() {
  const [zoom, setZoom]               = useState<string>('page');
  const [rotation, setRotation]       = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [pageInputVal, setPageInputVal]     = useState('1');
  // Deteksi mobile (viewport width < 768px)
  const [isMobile, setIsMobile]       = useState(false);

  const viewerRef       = useRef<HTMLDivElement>(null);
  const iframeRef       = useRef<HTMLIFrameElement>(null);
  const toolbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Deteksi ukuran layar
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync page input
  useEffect(() => { setPageInputVal(String(currentPage)); }, [currentPage]);

  // ── Keyboard shortcuts (desktop only)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT') return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setCurrentPage(p => Math.min(p + 1, totalPages));
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   setCurrentPage(p => Math.max(p - 1, 1));
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      if (e.key === '+' || e.key === '=') setZoom(z => {
        const steps = ['50','75','100','125','150','200'];
        const idx = steps.indexOf(z);
        return idx < steps.length - 1 ? steps[idx + 1] : z;
      });
      if (e.key === '-') setZoom(z => {
        const steps = ['50','75','100','125','150','200'];
        const idx = steps.indexOf(z);
        return idx > 0 ? steps[idx - 1] : z;
      });
      if (e.key === 'Escape' && isFullscreen) exitFullscreen();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages, isFullscreen]);

  // ── Auto-hide toolbar in fullscreen
  useEffect(() => {
    if (!isFullscreen) { setToolbarVisible(true); return; }
    const resetTimer = () => {
      setToolbarVisible(true);
      if (toolbarTimerRef.current) clearTimeout(toolbarTimerRef.current);
      toolbarTimerRef.current = setTimeout(() => setToolbarVisible(false), 3500);
    };
    resetTimer();
    const events = ['mousemove', 'touchstart'];
    events.forEach(ev => window.addEventListener(ev, resetTimer));
    return () => {
      events.forEach(ev => window.removeEventListener(ev, resetTimer));
      if (toolbarTimerRef.current) clearTimeout(toolbarTimerRef.current);
    };
  }, [isFullscreen]);

  // ── Fullscreen events
  useEffect(() => {
    const onFSChange = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener('fullscreenchange', onFSChange);
    return () => document.removeEventListener('fullscreenchange', onFSChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      viewerRef.current?.requestFullscreen?.();
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
      if (!isNaN(v) && v >= 1 && v <= totalPages) setCurrentPage(v);
      else setPageInputVal(String(currentPage));
    }
  };

  // Build PDF src — view=Fit → satu halaman penuh di semua layar
  const buildPdfHash = () => {
    const base = `page=${currentPage}&toolbar=0&navpanes=0&scrollbar=1`;
    if (zoom === 'page')       return `${base}&view=Fit`;
    if (zoom === 'page-width') return `${base}&view=FitH`;
    return `${base}&zoom=${zoom}`;
  };
  const pdfSrc = `${PDF_URL}#${buildPdfHash()}`;

  // Tinggi toolbar (digunakan untuk kalkulasi tinggi area PDF)
  const TOOLBAR_H = isMobile ? 48 : 54;

  return (
    <>
      {/* ── CSS: dvh fix untuk mobile ── */}
      <style>{`
        #pdf-root {
          position: fixed;
          inset: 0;
          display: flex;
          flex-direction: column;
          background: #0d0f14;
          /* dvh: dynamic viewport height — memperhitungkan address bar browser mobile */
          height: 100dvh;
          width: 100dvw;
          overflow: hidden;
        }
        #pdf-toolbar {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 12px;
          height: ${TOOLBAR_H}px;
          background: rgba(10,12,18,0.95);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          border-bottom: 1px solid rgba(255,255,255,0.07);
          overflow: hidden;
          /* Sembunyikan saat fullscreen + tidak terlihat */
          transition: opacity 0.3s ease, transform 0.3s ease;
          z-index: 200;
        }
        #pdf-main {
          flex: 1;
          min-height: 0;     /* PENTING: agar flex child tidak meluber */
          position: relative;
          overflow: hidden;
          background: #111318;
        }
        #pdf-iframe {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border: none;
          display: block;
        }
        /* Mobile: sembunyikan elemen yang tidak penting */
        @media (max-width: 640px) {
          .hide-mobile { display: none !important; }
          .compact-mobile { gap: 4px !important; padding: 0 8px !important; }
          #pdf-logo-text { display: none !important; }
        }
        @media (max-width: 480px) {
          .hide-sm { display: none !important; }
        }
      `}</style>

      <div id="pdf-root" ref={viewerRef}>
        {/* ── Toolbar ── */}
        <header
          id="pdf-toolbar"
          className="compact-mobile"
          style={{
            opacity: toolbarVisible ? 1 : 0,
            transform: toolbarVisible ? 'translateY(0)' : 'translateY(-100%)',
            pointerEvents: toolbarVisible ? 'auto' : 'none',
          }}
        >
          {/* Logo + Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <img
              src="/logo.png"
              alt="TeknaRupa"
              style={{
                width: isMobile ? 30 : 34,
                height: isMobile ? 30 : 34,
                borderRadius: 7,
                objectFit: 'contain',
                background: 'white',
                padding: 2,
                flexShrink: 0,
              }}
            />
            <div id="pdf-logo-text" style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
                <span style={{ color: '#3b82f6' }}>Tekna</span>
                <span style={{ color: '#f97316' }}>Rupa</span>
              </p>
              <p style={{ fontSize: 10, color: '#5a6478' }}>Proposal Penawaran</p>
            </div>
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* ── Navigasi Halaman ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <ToolBtn
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage <= 1}
              title="Halaman sebelumnya"
            >
              <IconChevronLeft />
            </ToolBtn>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                value={pageInputVal}
                onChange={e => setPageInputVal(e.target.value)}
                onKeyDown={handlePageInput}
                aria-label="Nomor halaman"
                inputMode="numeric"
                style={{
                  width: 36, textAlign: 'center', fontSize: 12, fontWeight: 600,
                  background: 'rgba(255,255,255,0.06)', color: '#f0f2f7',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6,
                  padding: '4px 2px', outline: 'none',
                }}
                onFocus={e => (e.target.style.borderColor = '#6366f1')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
              <span style={{ fontSize: 11, color: '#5a6478', whiteSpace: 'nowrap' }}>
                / {totalPages}
              </span>
            </div>

            <ToolBtn
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage >= totalPages}
              title="Halaman berikutnya"
            >
              <IconChevronRight />
            </ToolBtn>
          </div>

          {/* ── Separator (desktop only) ── */}
          <div className="hide-mobile" style={{ width: 1, height: 26, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

          {/* ── Zoom (desktop only) ── */}
          <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <ToolBtn
              onClick={() => setZoom(z => {
                const s = ['50','75','100','125','150','200'];
                const i = s.indexOf(z);
                return i > 0 ? s[i - 1] : z;
              })}
              disabled={zoom === '50' || zoom === 'page' || zoom === 'page-width'}
              title="Perkecil"
            >
              <IconZoomOut />
            </ToolBtn>

            <select
              value={zoom}
              onChange={e => setZoom(e.target.value)}
              aria-label="Level zoom"
              style={{
                fontSize: 11, fontWeight: 600, color: '#f0f2f7',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6, padding: '4px 6px', cursor: 'pointer',
                outline: 'none', minWidth: 90,
                appearance: 'none', textAlign: 'center',
              }}
            >
              <option value="page"       style={{ background: '#1e2330' }}>Fit Halaman</option>
              <option value="page-width" style={{ background: '#1e2330' }}>Fit Lebar</option>
              <option value="75"         style={{ background: '#1e2330' }}>75%</option>
              <option value="100"        style={{ background: '#1e2330' }}>100%</option>
              <option value="125"        style={{ background: '#1e2330' }}>125%</option>
              <option value="150"        style={{ background: '#1e2330' }}>150%</option>
              <option value="200"        style={{ background: '#1e2330' }}>200%</option>
            </select>

            <ToolBtn
              onClick={() => setZoom(z => {
                const s = ['50','75','100','125','150','200'];
                const i = s.indexOf(z);
                return i < s.length - 1 ? s[i + 1] : z;
              })}
              disabled={zoom === '200'}
              title="Perbesar"
            >
              <IconZoomIn />
            </ToolBtn>
          </div>

          {/* ── Separator ── */}
          <div style={{ width: 1, height: 26, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

          {/* ── Aksi ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Rotate — sembunyikan di mobile sangat kecil */}
            <div className="hide-sm">
              <ToolBtn onClick={() => setRotation(r => (r + 90) % 360)} title="Putar 90°">
                <IconRotateCW />
              </ToolBtn>
            </div>

            <ToolBtn onClick={handleDownload} title="Unduh PDF">
              <IconDownload />
            </ToolBtn>

            {/* Fullscreen — hanya desktop (mobile tidak support requestFullscreen dengan baik) */}
            <div className="hide-mobile">
              <ToolBtn onClick={toggleFullscreen} title={isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh (F)'} accent>
                {isFullscreen ? <IconExitFullscreen /> : <IconFullscreen />}
              </ToolBtn>
            </div>
          </div>

          {/* Keyboard hints — desktop only */}
          {!isFullscreen && !isMobile && (
            <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4, flexShrink: 0 }}>
              {[['← →', 'hal.'], ['+−', 'zoom'], ['F', 'full']].map(([k, l]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#5a6478' }}>
                  <kbd style={{
                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 3, padding: '1px 4px', fontFamily: 'monospace', fontSize: 9, color: '#8892a4',
                  }}>{k}</kbd>
                  <span>{l}</span>
                </div>
              ))}
            </div>
          )}
        </header>

        {/* ── Area PDF ── */}
        <main id="pdf-main">
          <iframe
            ref={iframeRef}
            id="pdf-iframe"
            src={pdfSrc}
            title={PDF_TITLE}
            allow="fullscreen"
            style={{
              transform: rotation !== 0 ? `rotate(${rotation}deg)` : undefined,
              transformOrigin: 'center center',
              transition: 'transform 0.35s ease',
            }}
          />
        </main>
      </div>
    </>
  );
}

// ─── ToolBtn ──────────────────────────────────────────────────────────────────

function ToolBtn({
  children, onClick, disabled, title, accent,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  accent?: boolean;
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
      style={{
        width: 32, height: 32, borderRadius: 7,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: bg, color,
        border: accent && hov ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s ease',
        flexShrink: 0,
        outline: 'none',
        // Touch-friendly tap area
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
      }}
    >
      {children}
    </button>
  );
}
