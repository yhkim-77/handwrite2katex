/**
 * Vitest global setup — jest-dom matchers + browser API mocks.
 */
import '@testing-library/jest-dom'

// ── navigator.clipboard mock ─────────────────────────────────────────────────
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
  writable: true,
})

// ── KaTeX mock ────────────────────────────────────────────────────────────────
// KaTeX relies on DOM metrics unavailable in jsdom, so we mock it.
vi.mock('katex', () => ({
  default: {
    render: vi.fn((latex: string, el: HTMLElement) => {
      if (latex.includes('\\invalid') || latex === '\\frac{') {
        throw new Error('KaTeX parse error: Expected \'}\', got EOF')
      }
      el.innerHTML = `<span class="katex-mock">${latex}</span>`
    }),
    renderToString: vi.fn((latex: string) => `<span class="katex-mock">${latex}</span>`),
  },
}))

// ── ResizeObserver stub ───────────────────────────────────────────────────────
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// ── HTMLCanvasElement mock ────────────────────────────────────────────────────
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  drawImage: vi.fn(),
  getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(4) }),
  putImageData: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  fillRect: vi.fn(),
  arc: vi.fn(),
  lineCap: 'round',
  lineJoin: 'round',
  lineWidth: 1,
  strokeStyle: '#000',
  fillStyle: '#000',
})

HTMLCanvasElement.prototype.toBlob = vi.fn((cb) => {
  cb(new Blob(['fake-png'], { type: 'image/png' }))
})

// ── URL.createObjectURL mock ──────────────────────────────────────────────────
global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock')
global.URL.revokeObjectURL = vi.fn()

// ── XMLSerializer mock ────────────────────────────────────────────────────────
global.XMLSerializer = vi.fn().mockImplementation(() => ({
  serializeToString: vi.fn().mockReturnValue('<svg></svg>'),
})) as unknown as typeof XMLSerializer
