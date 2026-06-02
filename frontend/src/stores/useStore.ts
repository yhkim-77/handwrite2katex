import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, FormulaHistoryItem, Theme, RecognizerInfo } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

interface FormulaState {
  latex: string;
  confidence: number | null;
  model: string | null;
  processingTimeMs: number | null;
  isConverting: boolean;
  convertError: string | null;
  setLatex: (latex: string) => void;
  setConvertResult: (result: {
    latex: string;
    confidence: number | null;
    model: string | null;
    processingTimeMs: number;
  }) => void;
  setConverting: (v: boolean) => void;
  setConvertError: (err: string | null) => void;
  reset: () => void;
}

interface HistoryState {
  items: FormulaHistoryItem[];
  total: number;
  page: number;
  hasNext: boolean;
  isLoading: boolean;
  setHistory: (items: FormulaHistoryItem[], total: number, page: number, hasNext: boolean) => void;
  prependItem: (item: FormulaHistoryItem) => void;
  removeItem: (id: string) => void;
  toggleBookmark: (id: string) => void;
  setLoading: (v: boolean) => void;
}

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({ user: null, isAuthenticated: false });
      },
    }),
    { name: 'auth-store' }
  )
);

export const useFormulaStore = create<FormulaState>((set) => ({
  latex: '',
  confidence: null,
  model: null,
  processingTimeMs: null,
  isConverting: false,
  convertError: null,
  setLatex: (latex) => set({ latex }),
  setConvertResult: ({ latex, confidence, model, processingTimeMs }) =>
    set({ latex, confidence, model, processingTimeMs, convertError: null }),
  setConverting: (v) => set({ isConverting: v }),
  setConvertError: (err) => set({ convertError: err, isConverting: false }),
  reset: () =>
    set({
      latex: '',
      confidence: null,
      model: null,
      processingTimeMs: null,
      convertError: null,
    }),
}));

export const useHistoryStore = create<HistoryState>((set) => ({
  items: [],
  total: 0,
  page: 1,
  hasNext: false,
  isLoading: false,
  setHistory: (items, total, page, hasNext) => set({ items, total, page, hasNext }),
  prependItem: (item) => set((s) => ({ items: [item, ...s.items], total: s.total + 1 })),
  removeItem: (id) =>
    set((s) => ({ items: s.items.filter((i) => i.id !== id), total: Math.max(0, s.total - 1) })),
  toggleBookmark: (id) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.id === id ? { ...i, is_bookmarked: !i.is_bookmarked } : i
      ),
    })),
  setLoading: (v) => set({ isLoading: v }),
}));

interface RecognizerState {
  recognizers: RecognizerInfo[];
  active: string;
  isLoading: boolean;
  setRecognizers: (recognizers: RecognizerInfo[], active: string) => void;
  setLoading: (v: boolean) => void;
}

export const useRecognizerStore = create<RecognizerState>((set) => ({
  recognizers: [],
  active: '',
  isLoading: false,
  setRecognizers: (recognizers, active) => set({ recognizers, active }),
  setLoading: (v) => set({ isLoading: v }),
}));

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        set({ theme: next });
      },
    }),
    { name: 'theme-store' }
  )
);
