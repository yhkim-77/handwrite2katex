import React, { useRef, useCallback, useEffect, useState } from 'react';
import type { Stroke } from '@/types';
import { useFormulaStore } from '@/stores/useStore';
import { formulaApi } from '@/api/client';
import { useHistoryStore } from '@/stores/useStore';
import type { FormulaHistoryItem } from '@/types';

const COLORS = ['#000000', '#1d4ed8', '#dc2626', '#16a34a', '#7c3aed'];
const DEBOUNCE_MS = 1500;

export default function DrawingCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const redoStackRef = useRef<Stroke[]>([]);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [penSize, setPenSize] = useState(3);
  const [penColor, setPenColor] = useState('#000000');
  const [isEraser, setIsEraser] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  const { setConvertResult, setConverting, setConvertError, isConverting } = useFormulaStore();
  const { prependItem } = useHistoryStore();

  // ── resize canvas to wrapper size ──────────────────────────────────────
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const { width, height } = wrapper.getBoundingClientRect();
    if (canvas.width === width && canvas.height === height) return;

    // Preserve existing drawing
    const snapshot = canvas.toDataURL();
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    const img = new Image();
    img.src = snapshot;
    img.onload = () => ctx.drawImage(img, 0, 0);
  }, []);

  useEffect(() => {
    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    if (wrapperRef.current) observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, [resizeCanvas]);

  // ── redraw all strokes ─────────────────────────────────────────────────
  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokesRef.current) {
      drawStroke(ctx, stroke);
    }
  }, []);

  function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    if (stroke.points.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
  }

  // ── pointer helpers ────────────────────────────────────────────────────
  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    canvasRef.current?.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const pos = getPos(e);
    const stroke: Stroke = {
      points: [pos],
      color: isEraser ? '#ffffff' : penColor,
      size: isEraser ? penSize * 4 : penSize,
    };
    currentStrokeRef.current = stroke;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    const pos = getPos(e);
    currentStrokeRef.current.points.push(pos);

    // Incremental draw
    const ctx = canvasRef.current!.getContext('2d')!;
    const pts = currentStrokeRef.current.points;
    if (pts.length >= 2) {
      ctx.beginPath();
      ctx.strokeStyle = currentStrokeRef.current.color;
      ctx.lineWidth = currentStrokeRef.current.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
    }
  };

  const onPointerUp = () => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    isDrawingRef.current = false;

    if (currentStrokeRef.current.points.length >= 2) {
      strokesRef.current.push(currentStrokeRef.current);
      redoStackRef.current = [];
      setIsEmpty(false);
      scheduleAutoConvert();
    }
    currentStrokeRef.current = null;
  };

  // ── toolbar actions ────────────────────────────────────────────────────
  const undo = () => {
    if (!strokesRef.current.length) return;
    const last = strokesRef.current.pop()!;
    redoStackRef.current.push(last);
    setIsEmpty(strokesRef.current.length === 0);
    redrawAll();
  };

  const redo = () => {
    if (!redoStackRef.current.length) return;
    const next = redoStackRef.current.pop()!;
    strokesRef.current.push(next);
    setIsEmpty(false);
    redrawAll();
  };

  const clear = () => {
    strokesRef.current = [];
    redoStackRef.current = [];
    setIsEmpty(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  // ── convert ─────────────────────────────────────────────────────────────
  const convertNow = useCallback(async () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const canvas = canvasRef.current;
    if (!canvas || strokesRef.current.length === 0) return;

    setConverting(true);
    setConvertError(null);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setConvertError('캔버스 이미지를 생성할 수 없습니다.');
        return;
      }
      const form = new FormData();
      form.append('file', blob, 'canvas.png');

      try {
        const { data } = await formulaApi.convert(form);
        setConvertResult({
          latex: data.latex,
          confidence: data.confidence,
          model: data.model,
          processingTimeMs: data.processing_time_ms,
        });

        // Prepend to history store (optimistic)
        const histItem: FormulaHistoryItem = {
          id: data.id,
          latex_result: data.latex,
          confidence: data.confidence,
          model_used: data.model,
          image_url: data.image_url,
          is_bookmarked: false,
          created_at: new Date().toISOString(),
        };
        prependItem(histItem);
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          '수식 변환 중 오류가 발생했습니다.';
        setConvertError(msg);
      }
    }, 'image/png');
  }, [prependItem, setConvertError, setConvertResult, setConverting]);

  const scheduleAutoConvert = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(convertNow, DEBOUNCE_MS);
  }, [convertNow]);

  // ── keyboard shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
        if (e.key === 'y') { e.preventDefault(); redo(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <section className="canvas-section">
      {/* Toolbar */}
      <div className="canvas-toolbar">
        <button className="btn" onClick={undo} title="Undo (Ctrl+Z)">↩ Undo</button>
        <button className="btn" onClick={redo} title="Redo (Ctrl+Y)">↪ Redo</button>
        <button className="btn btn-danger" onClick={clear} disabled={isEmpty}>🗑 Clear</button>

        <span style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch', margin: '0 4px' }} />

        {/* Pen/Eraser toggle */}
        <button
          className={`btn-icon${isEraser ? '' : ' active'}`}
          onClick={() => setIsEraser(false)}
          title="펜"
        >✏️</button>
        <button
          className={`btn-icon${isEraser ? ' active' : ''}`}
          onClick={() => setIsEraser(true)}
          title="지우개"
        >🧹</button>

        {/* Pen size */}
        <input
          className="pen-size-input"
          type="range"
          min={1}
          max={12}
          value={penSize}
          onChange={(e) => setPenSize(Number(e.target.value))}
          title={`굵기: ${penSize}px`}
        />

        {/* Colors */}
        {COLORS.map((c) => (
          <button
            key={c}
            className={`color-dot${penColor === c ? ' selected' : ''}`}
            style={{ background: c }}
            onClick={() => { setPenColor(c); setIsEraser(false); }}
            title={c}
          />
        ))}

        <div style={{ flex: 1 }} />

        <button
          className="btn btn-primary"
          onClick={convertNow}
          disabled={isEmpty || isConverting}
        >
          {isConverting ? '변환 중…' : '🔄 변환'}
        </button>
      </div>

      {/* Canvas wrapper */}
      <div ref={wrapperRef} className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="drawing-canvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
        {isConverting && (
          <div className="loading-overlay">
            <div className="spinner" />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>수식 인식 중…</span>
          </div>
        )}
      </div>
    </section>
  );
}
