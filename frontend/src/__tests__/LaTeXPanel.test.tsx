/**
 * LaTeXPanel 컴포넌트 단위 테스트
 * TC-U-L01 ~ TC-U-L05
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import LaTeXPanel from '@/components/LaTeXPanel/LaTeXPanel'
import { useFormulaStore } from '@/stores/useStore'

// ── Store 초기화 ───────────────────────────────────────────────────────────────
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

// ── TC-U-L01: LaTeX 코드 표시 ─────────────────────────────────────────────────
describe('TC-U-L01: LaTeX 코드 표시', () => {
  it('store의 latex 값이 textarea에 표시된다', () => {
    useFormulaStore.setState({ latex: '\\frac{1}{2}' })
    render(<LaTeXPanel />)
    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveValue('\\frac{1}{2}')
  })

  it('빈 latex 값일 때 textarea는 비어있다', () => {
    useFormulaStore.setState({ latex: '' })
    render(<LaTeXPanel />)
    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveValue('')
  })
})

// ── TC-U-L02: 복사 버튼 동작 ──────────────────────────────────────────────────
describe('TC-U-L02: 복사 버튼 동작', () => {
  it('복사 버튼 클릭 시 navigator.clipboard.writeText가 LaTeX 값으로 호출된다', async () => {
    useFormulaStore.setState({ latex: '\\int_0^1 x dx' })
    render(<LaTeXPanel />)

    const copyBtn = screen.getByText(/복사/i)
    await act(async () => {
      fireEvent.click(copyBtn)
    })

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('\\int_0^1 x dx')
  })

  it('latex가 없을 때 복사 버튼 클릭해도 clipboard.writeText가 호출되지 않는다', async () => {
    useFormulaStore.setState({ latex: '' })
    render(<LaTeXPanel />)

    const copyBtn = screen.getByText(/복사/i)
    await act(async () => {
      fireEvent.click(copyBtn)
    })

    expect(navigator.clipboard.writeText).not.toHaveBeenCalled()
  })
})

// ── TC-U-L03: 직접 편집 후 KaTeX 갱신 ────────────────────────────────────────
describe('TC-U-L03: 직접 편집 후 store 업데이트', () => {
  it('textarea 수정 시 useFormulaStore의 latex가 즉시 갱신된다 (Debounce 없음)', async () => {
    useFormulaStore.setState({ latex: '\\frac{1}{2}' })
    render(<LaTeXPanel />)

    const textarea = screen.getByRole('textbox')
    await act(async () => {
      fireEvent.change(textarea, { target: { value: '\\sum_{i=0}^n i' } })
    })

    expect(useFormulaStore.getState().latex).toBe('\\sum_{i=0}^n i')
  })
})

// ── TC-U-L04: 로딩 상태 표시 ──────────────────────────────────────────────────
describe('TC-U-L04: 로딩 상태 표시', () => {
  it('isConverting=true일 때 로딩 스피너가 렌더링된다', () => {
    useFormulaStore.setState({ isConverting: true })
    render(<LaTeXPanel />)
    expect(screen.getByText(/변환 중/i)).toBeInTheDocument()
  })

  it('isConverting=false일 때 textarea가 렌더링된다', () => {
    useFormulaStore.setState({ isConverting: false })
    render(<LaTeXPanel />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })
})

// ── TC-U-L05: 에러 상태 표시 ──────────────────────────────────────────────────
describe('TC-U-L05: 에러 상태 표시', () => {
  it('convertError가 있을 때 에러 메시지가 표시된다', () => {
    useFormulaStore.setState({ convertError: '변환 중 오류가 발생했습니다.' })
    render(<LaTeXPanel />)
    expect(screen.getByText(/변환 중 오류/i)).toBeInTheDocument()
  })

  it('convertError가 null이면 에러 메시지가 표시되지 않는다', () => {
    useFormulaStore.setState({ convertError: null })
    render(<LaTeXPanel />)
    expect(screen.queryByText(/오류/i)).not.toBeInTheDocument()
  })

  it('에러 메시지 텍스트에 XSS 스크립트가 실행 가능한 형태로 렌더링되지 않는다', () => {
    useFormulaStore.setState({ convertError: '<script>alert(1)</script>' })
    render(<LaTeXPanel />)
    // React는 기본적으로 HTML 이스케이프를 수행함
    expect(document.querySelector('script')).toBeNull()
  })
})
