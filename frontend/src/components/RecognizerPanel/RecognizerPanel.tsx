import React, { useEffect, useRef } from 'react';
import { settingsApi } from '@/api/client';
import { useRecognizerStore } from '@/stores/useStore';
import type { RecognizerInfo } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function RecognizerPanel({ open, onClose }: Props) {
  const { recognizers, active, isLoading, setRecognizers, setLoading } =
    useRecognizerStore();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) fetchStatus();
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [onClose]);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const { data } = await settingsApi.getRecognizer();
      setRecognizers(data.recognizers, data.active);
    } catch {
      /* 인증 전이면 무시 */
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (id: string) => {
    if (id === active) return;
    try {
      setLoading(true);
      const { data } = await settingsApi.setRecognizer(id);
      setRecognizers(data.recognizers, data.active);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="recognizer-overlay">
      <div className="recognizer-panel" ref={panelRef}>
        <div className="recognizer-panel-header">
          <span className="recognizer-panel-title">🔍 OCR 인식기 선택</span>
          <button className="recognizer-close" onClick={onClose}>✕</button>
        </div>

        {isLoading && recognizers.length === 0 ? (
          <div className="recognizer-loading">로딩 중...</div>
        ) : (
          <ul className="recognizer-list">
            {recognizers.map((r: RecognizerInfo) => (
              <li
                key={r.id}
                className={[
                  'recognizer-item',
                  r.active ? 'active' : '',
                  !r.available ? 'unavailable' : '',
                ].join(' ')}
                onClick={() => r.available && handleSelect(r.id)}
                title={!r.available ? 'API 키 미설정 — .env에서 활성화' : ''}
              >
                <label className="recognizer-label">
                  <input
                    type="radio"
                    name="recognizer"
                    value={r.id}
                    checked={r.active}
                    disabled={!r.available}
                    onChange={() => r.available && handleSelect(r.id)}
                    className="recognizer-radio"
                  />
                  <span className="recognizer-radio-custom" />
                  <span className="recognizer-text">
                    <span className="recognizer-name">
                      {r.name}
                      {!r.available && <span className="recognizer-badge">미설정</span>}
                      {r.active && <span className="recognizer-badge active-badge">사용 중</span>}
                    </span>
                    <span className="recognizer-desc">{r.description}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}

        <p className="recognizer-hint">
          API 키 설정은 <code>.env</code> 파일에서 변경 후 서버 재시작이 필요합니다.
        </p>
      </div>
    </div>
  );
}
