/**
 * KaTeXPanel 컴포넌트 단위 테스트
 * TC-U-K01 ~ TC-U-K05
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import katex from 'katex'
import KaTeXPanel from '@/components/KaTeXPanel/KaTeXPanel'
import { useFormulaStore } from '@/stores/useStore'

beforeEach(() => {
  useFormulaStore.setState({ latex: '' })
  vi.clearAllMocks()
})

// ── TC-U-K01: 기본 분수 렌더링 ───────────────────────────────────────────────
describe('TC-U-K01: 기본 분수 렌더링', () => {
  it('\\frac{1}{2} 입력 시 katex.render가 호출된다', async () => {
    render(<KaTeXPanel />)
    await act(async () => {
      useFormulaStore.setState({ latex: '\\frac{1}{2}' })
    })
    expect(katex.render).toHaveBeenCalledWith(
      '\\frac{1}{2}',
      expect.any(HTMLElement),
      expect.objectContaining({ displayMode: true }),
    )
  })
})

// ── TC-U-K02: 적분 수식 렌더링 ───────────────────────────────────────────────
describe('TC-U-K02: 적분 수식 렌더링', () => {
  it('적분 수식 입력 시 katex.render가 정상 호출된다', async () => {
    render(<KaTeXPanel />)
    await act(async () => {
      useFormulaStore.setState({ latex: '\\int_0^\\infty e^{-x} dx' })
    })
    expect(katex.render).toHaveBeenCalledWith(
      '\\int_0^\\infty e^{-x} dx',
      expect.any(HTMLElement),
      expect.objectContaining({ displayMode: true }),
    )
  })
})

// ── TC-U-K03: 잘못된 LaTeX 처리 ──────────────────────────────────────────────
describe('TC-U-K03: 잘못된 LaTeX 처리', () => {
  it('잘못된 LaTeX 시 에러 메시지가 표시되고 앱이 크래시되지 않는다', async () => {
    render(<KaTeXPanel />)
    await act(async () => {
      useFormulaStore.setState({ latex: '\\frac{' })  // 불완전한 수식
    })
    // 에러 메시지가 DOM에 표시되어야 함
    expect(screen.getByText(/LaTeX 파싱 오류/i)).toBeInTheDocument()
  })

  it('잘못된 수식 후에도 컴포넌트가 정상 렌더링된다', async () => {
    const { container } = render(<KaTeXPanel />)
    await act(async () => {
      useFormulaStore.setState({ latex: '\\frac{' })
    })
    // 컴포넌트가 마운트된 상태를 유지해야 함
    expect(container.firstChild).toBeInTheDocument()
  })
})

// ── TC-U-K04: 빈 문자열 처리 ─────────────────────────────────────────────────
describe('TC-U-K04: 빈 문자열 처리', () => {
  it('빈 latex 값 시 "수식이 여기에 렌더링됩니다" 문구가 표시된다', async () => {
    render(<KaTeXPanel />)
    await act(async () => {
      useFormulaStore.setState({ latex: '' })
    })
    expect(screen.getByText(/수식이 여기에 렌더링됩니다/i)).toBeInTheDocument()
  })

  it('빈 문자열일 때 katex.render가 호출되지 않는다', async () => {
    render(<KaTeXPanel />)
    vi.clearAllMocks()
    await act(async () => {
      useFormulaStore.setState({ latex: '' })
    })
    expect(katex.render).not.toHaveBeenCalled()
  })

  it('공백 문자열도 빈 값으로 처리된다', async () => {
    render(<KaTeXPanel />)
    vi.clearAllMocks()
    await act(async () => {
      useFormulaStore.setState({ latex: '   ' })
    })
    expect(katex.render).not.toHaveBeenCalled()
  })
})

// ── TC-U-K05: displayMode 적용 ────────────────────────────────────────────────
describe('TC-U-K05: displayMode 적용', () => {
  it('katex.render가 항상 displayMode: true 옵션과 함께 호출된다', async () => {
    render(<KaTeXPanel />)
    await act(async () => {
      useFormulaStore.setState({ latex: 'x^2 + y^2' })
    })
    expect(katex.render).toHaveBeenCalledWith(
      'x^2 + y^2',
      expect.any(HTMLElement),
      expect.objectContaining({ displayMode: true }),
    )
  })
})
