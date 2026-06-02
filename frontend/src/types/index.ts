export interface User {
  id: string;
  email: string;
  provider: string;
  is_verified: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface ConvertResponse {
  id: string;
  latex: string;
  confidence: number | null;
  model: string | null;
  processing_time_ms: number;
  image_url: string | null;
}

export interface FormulaHistoryItem {
  id: string;
  latex_result: string;
  confidence: number | null;
  model_used: string | null;
  image_url: string | null;
  is_bookmarked: boolean;
  created_at: string;
}

export interface HistoryListResponse {
  items: FormulaHistoryItem[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

export interface ApiError {
  detail: string;
}

export type Theme = 'light' | 'dark';

export interface Stroke {
  points: { x: number; y: number }[];
  color: string;
  size: number;
}
