'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const PDF_URL   = '/proposal.pdf';
const PDF_TITLE = 'Proposal Penawaran';

// ─── Icons ────────────────────────────────────────────────────────────────────
const Ic = {
  zoomIn:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>,
  zoomOut:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>,
  full:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>,
  exitFull: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}><polyline points="8 3 3 3 3 8"/><polyline points="21 8 21 3 16 3"/><polyline points="3 16 3 21 8 21"/><polyline points="16 21 21 21 21 16"/></svg>,
  download: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
};

export default function PDFViewer() {
  const [numPages, setNumPages]             = useState<number>(0);
  const [visiblePage, setVisiblePage]       = useState(1);   // halaman yang sedang terlihat
  const [scale, setScale]                   = useState(1.0);
  const [isFullscreen, setIsFullscreen]     = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isLoading, setIsLoading]           = useState(true);
  const [isMobile, setIsMobile]             = useState(false);

  const rootRef         = useRef<HTMLDivElement>(null);
  const mainRef         = useRef<HTMLDivElement>(null);
  const toolbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref ke setiap elemen halaman untuk IntersectionObserver
  const pageRefs        = useRef<(HTMLDivElement | null)[]>([]);

  // ── Ukur container
  useEffect(() => {
    const measure = () => {
      if (mainRef.current) setContainerWidth(mainRef.current.clientWidth);
      setIsMobile(window.innerWidth < 768);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (mainRef.current) ro.observe(mainRef.current);
    return () => ro.disconnect();
  }, []);

  // ── IntersectionObserver: deteksi halaman yang paling terlihat saat scroll
  useEffect(() => {
    if (numPages === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        // Ambil entry dengan intersectionRatio terbesar
        let best = entries[0];
        for (const entry of entries) {
          if (entry.intersectionRatio > (best?.intersectionRatio ?? 0)) best = entry;
        }
        if (best?.isIntersecting) {
          const idx = pageRefs.current.findIndex(el => el === best.target);
          if (idx >= 0) setVisiblePage(idx + 1);
        }
      },
      { root: mainRef.current, threshold: Array.from({ length: 11 }, (_, i) => i * 0.1) }
    );
    const els = pageRefs.current.filter(Boolean) as HTMLDivElement[];
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [numPages]);

  // ── Fullscreen
  useEffect(() => {
    const onFSChange = () => { if (!document.fullscreenElement) setIsFullscreen(false); };
    document.addEventListener('fullscreenchange', onFSChange);
    return () => document.removeEventListener('fullscreenchange', onFSChange);
  }, []);

  // ── Auto-hide toolbar saat fullscreen
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
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === '+' || e.key === '=') setScale(s => Math.min(+(s + 0.15).toFixed(2), 3.0));
      if (e.key === '-') setScale(s => Math.max(+(s - 0.15).toFixed(2), 0.4));
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      if (e.key === 'Escape' && isFullscreen) exitFullscreen();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullscreen, scale]);

  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) { rootRef.current?.requestFullscreen?.(); setIsFullscreen(true); }
    else exitFullscreen();
  }, [isFullscreen]);

  const exitFullscreen = () => { document.exitFullscreen?.(); setIsFullscreen(false); };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = PDF_URL; a.download = `${PDF_TITLE}.pdf`; a.click();
  };

  // Scroll ke halaman tertentu
  const scrollToPage = (page: number) => {
    pageRefs.current[page - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  }, []);

  const pageWidth = containerWidth > 0 ? containerWidth : undefined;

  return (
    <>
      <style>{`
        html, body { margin:0; padding:0; overflow:hidden; height:100%; }
        #vwr-root {
          position:fixed; inset:0;
          height:100dvh; width:100dvw;
          display:flex; flex-direction:column;
          background:#0d0f14; overflow:hidden;
        }
        #vwr-bar {
          flex-shrink:0;
          display:flex; align-items:center; gap:8px;
          padding:0 12px;
          background:rgba(8,10,16,0.96);
          backdrop-filter:blur(28px); -webkit-backdrop-filter:blur(28px);
          border-bottom:1px solid rgba(255,255,255,0.07);
          transition:opacity 0.3s, transform 0.3s;
          z-index:200; overflow:hidden;
        }
        /* Area scroll — SEMUA halaman ditumpuk ke bawah */
        #vwr-main {
          flex:1; min-height:0;
          overflow-y:scroll;   /* selalu bisa scroll */
          overflow-x:hidden;
          display:flex; flex-direction:column; align-items:center;
          background:#111318;
          -webkit-overflow-scrolling:touch;
          scroll-behavior:smooth;
        }
        /* Setiap halaman PDF diberi margin bawah agar ada jarak */
        .pdf-page-wrap {
          width:100%;
          display:flex; justify-content:center;
          padding:8px 0;
        }
        .pdf-page-wrap:first-child { padding-top:12px; }
        .pdf-page-wrap:last-child  { padding-bottom:24px; }
        .react-pdf__Page { display:flex !important; justify-content:center; }
        .react-pdf__Page__canvas {
          max-width:100% !important; height:auto !important;
          box-shadow:0 2px 20px rgba(0,0,0,0.45);
        }
        @keyframes spin2 { to { transform:rotate(360deg); } }
        .pdf-spin { animation:spin2 1s linear infinite; }
        @media (max-width:640px) { .hide-sm { display:none !important; } }
        @media (max-width:480px) { .hide-xs { display:none !important; } }
      `}</style>

      <div id="vwr-root" ref={rootRef}>

        {/* ── Toolbar ── */}
        <header id="vwr-bar" style={{
          height: isMobile ? 48 : 54,
          opacity: toolbarVisible ? 1 : 0,
          transform: toolbarVisible ? 'translateY(0)' : 'translateY(-100%)',
          pointerEvents: toolbarVisible ? 'auto' : 'none',
        }}>
          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:7, flexShrink:0 }}>
            <img src="/logo.png" alt="TeknaRupa" style={{
              width:isMobile?28:32, height:isMobile?28:32,
              borderRadius:6, objectFit:'contain', background:'#fff', padding:2,
            }}/>
            <div className="hide-sm">
              <p style={{ fontSize:12, fontWeight:700, lineHeight:1.2 }}>
                <span style={{ color:'#3b82f6' }}>Tekna</span>
                <span style={{ color:'#f97316' }}>Rupa</span>
              </p>
              <p style={{ fontSize:9, color:'#5a6478' }}>Proposal Penawaran</p>
            </div>
          </div>

          <div style={{ flex:1 }}/>

          {/* Indikator halaman — klik untuk loncat ke halaman */}
          {numPages > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              {/* Tombol halaman sebelumnya */}
              <Btn
                onClick={() => scrollToPage(Math.max(visiblePage-1,1))}
                disabled={visiblePage<=1} title="Scroll ke halaman sebelumnya"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width:18, height:18 }}><polyline points="15 18 9 12 15 6"/></svg>
              </Btn>

              <span style={{ fontSize:12, color:'#8892a4', whiteSpace:'nowrap', minWidth:50, textAlign:'center' }}>
                <span style={{ color:'#f0f2f7', fontWeight:600 }}>{visiblePage}</span>
                <span style={{ color:'#5a6478' }}> / {numPages}</span>
              </span>

              <Btn
                onClick={() => scrollToPage(Math.min(visiblePage+1,numPages))}
                disabled={visiblePage>=numPages} title="Scroll ke halaman berikutnya"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width:18, height:18 }}><polyline points="9 18 15 12 9 6"/></svg>
              </Btn>
            </div>
          )}

          <Sep/>

          {/* Zoom */}
          <div className="hide-sm" style={{ display:'flex', alignItems:'center', gap:3 }}>
            <Btn onClick={() => setScale(s => Math.max(+(s-0.15).toFixed(2),0.4))} disabled={scale<=0.4} title="Perkecil (-)"><Ic.zoomOut/></Btn>
            <button
              onClick={() => setScale(1.0)}
              title="Reset zoom ke 100%"
              style={{
                fontSize:11, fontWeight:600, color:'#f0f2f7',
                background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
                borderRadius:5, padding:'4px 7px', cursor:'pointer', minWidth:46, outline:'none',
              }}
            >{Math.round(scale*100)}%</button>
            <Btn onClick={() => setScale(s => Math.min(+(s+0.15).toFixed(2),3.0))} disabled={scale>=3.0} title="Perbesar (+)"><Ic.zoomIn/></Btn>
          </div>

          <Sep className="hide-sm"/>

          {/* Aksi */}
          <div style={{ display:'flex', alignItems:'center', gap:2 }}>
            <Btn onClick={handleDownload} title="Unduh PDF"><Ic.download/></Btn>
            <div className="hide-sm">
              <Btn onClick={toggleFullscreen} title={isFullscreen?'Keluar Fullscreen':'Layar Penuh (F)'} accent>
                {isFullscreen ? <Ic.exitFull/> : <Ic.full/>}
              </Btn>
            </div>
          </div>
        </header>

        {/* ── Area PDF Scrollable ── */}
        <main id="vwr-main" ref={mainRef}>
          {/* Spinner loading awal */}
          {isLoading && (
            <div style={{
              padding:48, display:'flex', flexDirection:'column', alignItems:'center', gap:16,
            }}>
              <div style={{
                width:44, height:44,
                border:'3px solid rgba(99,102,241,0.2)', borderTopColor:'#6366f1',
                borderRadius:'50%',
              }} className="pdf-spin"/>
              <p style={{ color:'#5a6478', fontSize:13 }}>Memuat dokumen...</p>
            </div>
          )}

          <Document
            file={PDF_URL}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={null}
            error={
              <div style={{ padding:40, textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" style={{ width:40, height:40 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p style={{ fontSize:14, color:'#f87171' }}>Gagal memuat PDF</p>
              </div>
            }
          >
            {/* Render SEMUA halaman — bisa discroll ke bawah */}
            {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
              <div
                key={pageNum}
                className="pdf-page-wrap"
                ref={el => { pageRefs.current[pageNum - 1] = el; }}
              >
                <Page
                  pageNumber={pageNum}
                  width={pageWidth}
                  scale={scale}
                  renderTextLayer
                  renderAnnotationLayer
                  loading={
                    <div style={{
                      width: pageWidth ?? 300,
                      height: pageWidth ? Math.round(pageWidth * 1.414) : 424,
                      background:'linear-gradient(90deg,#1a1e28 25%,#22283a 50%,#1a1e28 75%)',
                      backgroundSize:'200% 100%',
                      animation:'shimmer 1.5s infinite',
                      borderRadius:2,
                    }}/>
                  }
                />
              </div>
            ))}
          </Document>
        </main>
      </div>
      <style>{`
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
      `}</style>
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Btn({ children, onClick, disabled, title, accent, className }: {
  children: React.ReactNode; onClick?: ()=>void; disabled?: boolean;
  title?: string; accent?: boolean; className?: string;
}) {
  const [hov, setHov] = useState(false);
  const bg    = disabled ? 'transparent' : hov && accent ? 'rgba(99,102,241,0.25)' : hov ? 'rgba(255,255,255,0.08)' : 'transparent';
  const color = disabled ? '#374151' : accent ? (hov?'#c7d2fe':'#818cf8') : hov?'#f0f2f7':'#8892a4';
  return (
    <button
      onClick={disabled?undefined:onClick} title={title} disabled={disabled}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      className={className}
      style={{
        width:32, height:32, borderRadius:7,
        display:'flex', alignItems:'center', justifyContent:'center',
        background:bg, color,
        border: accent&&hov?'1px solid rgba(99,102,241,0.4)':'1px solid transparent',
        cursor:disabled?'not-allowed':'pointer',
        transition:'all 0.15s', flexShrink:0, outline:'none',
        WebkitTapHighlightColor:'transparent', touchAction:'manipulation',
      }}
    >{children}</button>
  );
}

function Sep({ className }: { className?: string }) {
  return <div className={className} style={{ width:1, height:24, background:'rgba(255,255,255,0.07)', flexShrink:0 }}/>;
}
