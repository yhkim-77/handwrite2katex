import React, { useEffect } from 'react';
import { formulaApi } from '@/api/client';
import { useHistoryStore, useFormulaStore } from '@/stores/useStore';

export default function HistoryPanel() {
  const { items, isLoading, total, setHistory, setLoading, removeItem, toggleBookmark } =
    useHistoryStore();
  const { setLatex } = useFormulaStore();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await formulaApi.listHistory(1, 50);
        if (!cancelled)
          setHistory(data.items, data.total, data.page, data.has_next);
      } catch {
        /* silently ignore — user may not be logged in yet */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [setHistory, setLoading]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await formulaApi.deleteHistoryItem(id);
      removeItem(id);
    } catch { /* noop */ }
  };

  const handleBookmark = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await formulaApi.toggleBookmark(id);
      toggleBookmark(id);
    } catch { /* noop */ }
  };

  const handleSelect = (latex: string) => {
    setLatex(latex);
  };

  if (items.length === 0 && !isLoading) return null;

  return (
    <div className="history-panel">
      <div className="history-header">
        <span>변환 이력</span>
        <span style={{ fontWeight: 400 }}>총 {total}개</span>
        {isLoading && <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />}
      </div>
      <div className="history-list">
        {items.map((item) => (
          <div
            key={item.id}
            className="history-item"
            onClick={() => handleSelect(item.latex_result)}
            title="클릭하여 복원"
          >
            <div className="history-item-latex">{item.latex_result}</div>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <span className="history-item-time">
                {new Date(item.created_at).toLocaleString('ko-KR', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </span>
              <button
                onClick={(e) => handleBookmark(e, item.id)}
                title={item.is_bookmarked ? '즐겨찾기 해제' : '즐겨찾기'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                {item.is_bookmarked ? '⭐' : '☆'}
              </button>
              <button
                className="history-item-delete"
                onClick={(e) => handleDelete(e, item.id)}
                title="삭제"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
