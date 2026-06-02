import React from 'react';
import DrawingCanvas from '@/components/Canvas/DrawingCanvas';
import LaTeXPanel from '@/components/LaTeXPanel/LaTeXPanel';
import KaTeXPanel from '@/components/KaTeXPanel/KaTeXPanel';
import HistoryPanel from '@/components/HistoryPanel/HistoryPanel';

export default function HomePage() {
  return (
    <main className="main-content">
      <DrawingCanvas />
      <div className="bottom-section">
        <LaTeXPanel />
        <KaTeXPanel />
      </div>
      <HistoryPanel />
    </main>
  );
}
