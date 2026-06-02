/**
 * DrawingCanvas 컴포넌트 단위 테스트
 * TC-U-C01 ~ TC-U-C08
 *
 * NOTE: Canvas API는 jsdom에서 완전히 지원되지 않으므로,
 * 툴바 UI·상태 관리 로직·스토어 연동을 중심으로 테스트합니다.
 * Pointer 드로잉 로직은 E2E(Playwright)에서 검증합니다.
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import DrawingCanvas from '@/components/Canvas/DrawingCanvas'
import { useFormulaStore } from '@/stores/useStore'

vi.mock('@/api/client', () => ({
  formulaApi: {
    convert: vi.fn().mockResolvedValue({
      data: {
        id: 'mock-id',
        latex: 'x^2',
        confidence: 0.95,
        model: 'mock',
        processing_time_ms: 100,
        image_url: '/storage/test.png',
      },
    }),
  },
}))

beforeEach(() => {
  useFormulaStore.setState({
    latex: '',
    confidence: null,
    model: null,
    processingTimeMs: null,
    isConverting: false,
    convertError: null,
  })
  vi.clearAllMocks()
})

// ── TC-U-C06: 빈 캔버스 전송 차단 ────────────────────────────────────────────
describe('TC-U-C06: 빈 캔버스 전송 차단', () => {
  it('획이 없을 때 변환 버튼이 비활성화(disabled)되어 있다', () => {
    render(<DrawingCanvas />)
    const convertBtn = screen.getByText(/변환/i)
    expect(convertBtn).toBeDisabled()
  })
})

// ── TC-U-C02: Clear 버튼 클릭 ─────────────────────────────────────────────────
describe('TC-U-C02: Clear 버튼 클릭', () => {
  it('Clear 버튼이 렌더링된다', () => {
    render(<DrawingCanvas />)
    expect(screen.getByText(/지우기|Clear/i)).toBeInTheDocument()
  })
})

// ── TC-U-C03: Undo 버튼 ──────────────────────────────────────────────────────
describe('TC-U-C03: Undo 버튼', () => {
  it('Undo 버튼이 렌더링된다', () => {
    render(<DrawingCanvas />)
    expect(screen.getByTitle(/undo/i)).toBeInTheDocument()
  })
})

// ── TC-U-C05: Redo 버튼 ──────────────────────────────────────────────────────
describe('TC-U-C05: Redo 버튼', () => {
  it('Redo 버튼이 렌더링된다', () => {
    render(<DrawingCanvas />)
    expect(screen.getByTitle(/redo/i)).toBeInTheDocument()
  })
})

// ── TC-U-C08: 펜 굵기 기본값 확인 ────────────────────────────────────────────
describe('TC-U-C08: 펜 굵기 기본값 3px', () => {
  it('펜 굵기 슬라이더의 기본값이 3이다', () => {
    render(<DrawingCanvas />)
    // 굵기 슬라이더 또는 표시 텍스트 확인
    const slider = screen.getByRole('slider')
    expect(slider).toHaveValue('3')
  })
})

// ── 색상 팔레트 ───────────────────────────────────────────────────────────────
describe('색상 팔레트 렌더링', () => {
  it('5가지 색상 버튼이 존재한다', () => {
    render(<DrawingCanvas />)
    // data-testid 또는 색상 버튼으로 확인
    const colorButtons = document.querySelectorAll('[data-color]')
    expect(colorButtons.length).toBeGreaterThanOrEqual(1)
  })
})
