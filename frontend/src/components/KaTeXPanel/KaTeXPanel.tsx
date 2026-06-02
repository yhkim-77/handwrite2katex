import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import { useFormulaStore } from '@/stores/useStore';

export default function KaTeXPanel() {
  const { latex } = useFormulaStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (!latex.trim()) {
      el.innerHTML = '<span style="color:var(--text-muted);font-size:0.85rem">수식이 여기에 렌더링됩니다.</span>';
      errorRef.current = null;
      return;
    }

    try {
      katex.render(latex, el, {
        displayMode: true,
        throwOnError: true,
        strict: false,
      });
      errorRef.current = null;
    } catch (err) {
      errorRef.current = (err as Error).message;
      el.innerHTML = `<div class="katex-error">⚠ LaTeX 파싱 오류:<br/><code>${escapeHtml((err as Error).message)}</code></div>`;
    }
  }, [latex]);

  const handleDownload = () => {
    const el = containerRef.current;
    if (!el) return;

    // Serialize SVG from KaTeX output
    const svg = el.querySelector('svg');
    if (!svg) return;

    const data = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'formula.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <span>KaTeX 렌더링</span>
        <div style={{ flex: 1 }} />
        <button className="btn" style={{ fontSize: '0.72rem' }} onClick={handleDownload} disabled={!latex}>
          ⬇ SVG
        </button>
      </div>

      <div className="panel-body">
        <div className="katex-display-area" ref={containerRef} />
      </div>
    </div>
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
