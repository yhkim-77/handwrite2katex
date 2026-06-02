import React from 'react';
import { useFormulaStore } from '@/stores/useStore';

export default function LaTeXPanel() {
  const { latex, confidence, model, processingTimeMs, isConverting, convertError, setLatex } =
    useFormulaStore();

  const handleCopy = async () => {
    if (!latex) return;
    try {
      await navigator.clipboard.writeText(latex);
    } catch {
      /* clipboard denied — silently ignore */
    }
  };

  const confidenceClass =
    confidence === null
      ? ''
      : confidence >= 0.9
      ? 'confidence-high'
      : confidence >= 0.75
      ? 'confidence-mid'
      : 'confidence-low';

  const confidenceLabel =
    confidence === null ? '' : `${Math.round(confidence * 100)}%`;

  return (
    <div className="panel">
      <div className="panel-header">
        <span>LaTeX</span>
        {model && (
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            via {model}
          </span>
        )}
        {processingTimeMs !== null && (
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            {processingTimeMs}ms
          </span>
        )}
        {confidence !== null && (
          <span className={`confidence-badge ${confidenceClass}`}>{confidenceLabel}</span>
        )}
      </div>

      <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {convertError && (
          <div className="alert alert-error">⚠ {convertError}</div>
        )}

        {isConverting ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
            <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
            변환 중...
          </div>
        ) : (
          <textarea
            className="latex-code"
            value={latex}
            onChange={(e) => setLatex(e.target.value)}
            placeholder="수식을 Canvas에 입력하면 여기에 LaTeX 코드가 표시됩니다."
            spellCheck={false}
          />
        )}

        <div className="latex-actions">
          <button className="btn" onClick={handleCopy} disabled={!latex}>
            📋 복사
          </button>
          <button
            className="btn btn-danger"
            onClick={() => setLatex('')}
            disabled={!latex}
          >
            ✕ 지우기
          </button>
        </div>
      </div>
    </div>
  );
}
