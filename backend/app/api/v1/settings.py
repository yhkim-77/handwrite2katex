from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.core.config import settings
from app.models.user import User
from app.services.recognizer import (
    get_active_recognizer_id,
    set_recognizer_override,
)

router = APIRouter(prefix="/settings", tags=["settings"])


class RecognizerInfo(BaseModel):
    id: str
    name: str
    description: str
    available: bool
    active: bool


class RecognizerListResponse(BaseModel):
    active: str
    recognizers: list[RecognizerInfo]


class SetRecognizerRequest(BaseModel):
    recognizer: str


_RECOGNIZER_META = [
    {
        "id": "local",
        "name": "pix2tex (Local)",
        "description": "CROHME Transformer 모델 · 오프라인 · API 비용 없음",
    },
    {
        "id": "groq",
        "name": "Groq Vision",
        "description": "llama-4-scout-17b · 무료 티어 · 빠른 응답",
    },
    {
        "id": "gemini",
        "name": "Gemini 2.0",
        "description": "Google Gemini Flash Lite · 무료 1,500 req/day",
    },
    {
        "id": "mathpix",
        "name": "Mathpix OCR",
        "description": "수식 특화 최고 정확도 · 무료 100 req/월",
    },
    {
        "id": "mock",
        "name": "Mock (개발용)",
        "description": "고정 응답 반환 · API 키 불필요",
    },
]


def _build_response() -> RecognizerListResponse:
    active = get_active_recognizer_id()
    availability = {
        "local": settings.USE_LOCAL_MODEL,
        "groq": bool(settings.GROQ_API_KEY),
        "gemini": bool(settings.GEMINI_API_KEY),
        "mathpix": bool(settings.MATHPIX_APP_ID and settings.MATHPIX_APP_KEY),
        "mock": True,
    }
    recognizers = [
        RecognizerInfo(
            id=m["id"],
            name=m["name"],
            description=m["description"],
            available=availability[m["id"]],
            active=m["id"] == active,
        )
        for m in _RECOGNIZER_META
    ]
    return RecognizerListResponse(active=active, recognizers=recognizers)


@router.get("/recognizer", response_model=RecognizerListResponse)
async def get_recognizer_settings(
    _: User = Depends(get_current_user),
) -> RecognizerListResponse:
    return _build_response()


@router.patch("/recognizer", response_model=RecognizerListResponse)
async def set_recognizer_settings(
    body: SetRecognizerRequest,
    _: User = Depends(get_current_user),
) -> RecognizerListResponse:
    valid_ids = {m["id"] for m in _RECOGNIZER_META}
    if body.recognizer not in valid_ids:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"유효하지 않은 인식기: {body.recognizer}. 허용값: {sorted(valid_ids)}",
        )
    set_recognizer_override(body.recognizer)
    return _build_response()
