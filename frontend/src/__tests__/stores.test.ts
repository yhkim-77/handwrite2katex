/**
 * Zustand 스토어 단위 테스트
 * useFormulaStore, useAuthStore, useHistoryStore 핵심 액션 검증
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useFormulaStore, useAuthStore, useHistoryStore } from '@/stores/useStore'

// ─── FormulaStore ────────────────────────────────────────────────────────────

describe('useFormulaStore', () => {
  beforeEach(() => {
    useFormulaStore.setState({
      latex: '',
      confidence: null,
      model: null,
      processingTimeMs: null,
      isConverting: false,
      convertError: null,
    })
  })

  it('setLatex: latex 값이 갱신된다', () => {
    useFormulaStore.getState().setLatex('\\frac{1}{2}')
    expect(useFormulaStore.getState().latex).toBe('\\frac{1}{2}')
  })

  it('setConvertResult: 변환 결과가 저장되고 convertError가 초기화된다', () => {
    useFormulaStore.setState({ convertError: 'previous error' })
    useFormulaStore.getState().setConvertResult({
      latex: 'x^2',
      confidence: 0.95,
      model: 'mock',
      processingTimeMs: 120,
    })
    const state = useFormulaStore.getState()
    expect(state.latex).toBe('x^2')
    expect(state.confidence).toBe(0.95)
    expect(state.model).toBe('mock')
    expect(state.processingTimeMs).toBe(120)
    expect(state.convertError).toBeNull()
  })

  it('setConverting: isConverting이 변경된다', () => {
    useFormulaStore.getState().setConverting(true)
    expect(useFormulaStore.getState().isConverting).toBe(true)
    useFormulaStore.getState().setConverting(false)
    expect(useFormulaStore.getState().isConverting).toBe(false)
  })

  it('setConvertError: 에러 설정 시 isConverting이 false로 된다', () => {
    useFormulaStore.setState({ isConverting: true })
    useFormulaStore.getState().setConvertError('서버 오류')
    const state = useFormulaStore.getState()
    expect(state.convertError).toBe('서버 오류')
    expect(state.isConverting).toBe(false)
  })

  it('reset: 모든 값이 초기화된다', () => {
    useFormulaStore.setState({
      latex: '\\pi',
      confidence: 0.8,
      model: 'gemini',
      processingTimeMs: 500,
      convertError: 'error',
    })
    useFormulaStore.getState().reset()
    const state = useFormulaStore.getState()
    expect(state.latex).toBe('')
    expect(state.confidence).toBeNull()
    expect(state.convertError).toBeNull()
  })
})

// ─── AuthStore ───────────────────────────────────────────────────────────────

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
    })
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('setUser: 사용자 설정 시 isAuthenticated가 true가 된다', () => {
    const mockUser = { id: 'uuid-1', email: 'test@example.com', provider: 'email', is_verified: true }
    useAuthStore.getState().setUser(mockUser as any)
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(useAuthStore.getState().user?.email).toBe('test@example.com')
  })

  it('setUser(null): 사용자 해제 시 isAuthenticated가 false가 된다', () => {
    useAuthStore.setState({ user: {} as any, isAuthenticated: true })
    useAuthStore.getState().setUser(null)
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('logout: user가 null이 되고 localStorage 토큰이 제거된다', () => {
    localStorage.setItem('access_token', 'abc')
    localStorage.setItem('refresh_token', 'def')
    useAuthStore.setState({ user: {} as any, isAuthenticated: true })

    useAuthStore.getState().logout()

    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().user).toBeNull()
    expect(localStorage.getItem('access_token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
  })
})

// ─── HistoryStore ─────────────────────────────────────────────────────────────

describe('useHistoryStore', () => {
  const mockItem = (id: string) => ({
    id,
    image_url: '/img/test.png',
    latex_result: '\\frac{1}{2}',
    confidence: 0.9,
    model_used: 'mock',
    is_bookmarked: false,
    created_at: new Date().toISOString(),
  })

  beforeEach(() => {
    useHistoryStore.setState({
      items: [],
      total: 0,
      page: 1,
      hasNext: false,
      isLoading: false,
    })
  })

  it('setHistory: items/total/page/hasNext가 설정된다', () => {
    const items = [mockItem('id-1'), mockItem('id-2')]
    useHistoryStore.getState().setHistory(items, 25, 1, true)
    const state = useHistoryStore.getState()
    expect(state.items).toHaveLength(2)
    expect(state.total).toBe(25)
    expect(state.hasNext).toBe(true)
  })

  it('prependItem: 새 아이템이 목록 맨 앞에 추가된다', () => {
    useHistoryStore.setState({ items: [mockItem('old')], total: 1 })
    useHistoryStore.getState().prependItem(mockItem('new'))
    const items = useHistoryStore.getState().items
    expect(items[0].id).toBe('new')
    expect(items).toHaveLength(2)
  })

  it('removeItem: 해당 아이템이 목록에서 제거된다', () => {
    useHistoryStore.setState({ items: [mockItem('a'), mockItem('b')], total: 2 })
    useHistoryStore.getState().removeItem('a')
    const items = useHistoryStore.getState().items
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('b')
  })

  it('toggleBookmark: is_bookmarked가 반전된다', () => {
    useHistoryStore.setState({ items: [mockItem('x')], total: 1 })
    useHistoryStore.getState().toggleBookmark('x')
    expect(useHistoryStore.getState().items[0].is_bookmarked).toBe(true)
    useHistoryStore.getState().toggleBookmark('x')
    expect(useHistoryStore.getState().items[0].is_bookmarked).toBe(false)
  })
})
