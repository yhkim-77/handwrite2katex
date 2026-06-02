from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class ConvertResponse(BaseModel):
    id: str
    latex: str
    confidence: float | None
    model: str | None
    processing_time_ms: int
    image_url: str | None


class FormulaHistoryItem(BaseModel):
    id: uuid.UUID
    latex_result: str
    confidence: float | None
    model_used: str | None
    image_url: str | None
    is_bookmarked: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class HistoryListResponse(BaseModel):
    items: list[FormulaHistoryItem]
    total: int
    page: int
    page_size: int
    has_next: bool


class BookmarkToggleResponse(BaseModel):
    id: str
    is_bookmarked: bool
