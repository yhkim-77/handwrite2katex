from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.formula import FormulaHistory
from app.models.user import User
from app.schemas.formula import (
    BookmarkToggleResponse,
    ConvertResponse,
    FormulaHistoryItem,
    HistoryListResponse,
)
from app.services.image import preprocess_image, validate_image_bytes
from app.services.recognizer import get_recognizer
from app.services.storage import save_image

router = APIRouter(prefix="/formula", tags=["formula"])

ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/webp"}


@router.post("/convert", response_model=ConvertResponse)
async def convert_formula(
    file: UploadFile = File(..., description="Canvas PNG 이미지"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConvertResponse:
    # 1. Validate content-type
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="PNG, JPEG, WEBP 형식만 지원합니다.",
        )

    raw = await file.read()

    # 2. Validate size & format
    try:
        validate_image_bytes(raw)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    # 3. Pre-process
    processed = preprocess_image(raw)

    # 4. LLM recognition
    recognizer = get_recognizer()
    try:
        result = await recognizer.convert(processed)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"수식 변환 중 오류가 발생했습니다: {exc}",
        )

    if not result.latex:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="이미지에서 수식을 인식할 수 없습니다.",
        )

    # 5. Store image
    image_url = await save_image(processed)

    # 6. Persist history
    history = FormulaHistory(
        user_id=current_user.id,
        image_url=image_url,
        latex_result=result.latex,
        confidence=result.confidence,
        model_used=result.model,
    )
    db.add(history)
    await db.flush()

    return ConvertResponse(
        id=str(history.id),
        latex=result.latex,
        confidence=result.confidence,
        model=result.model,
        processing_time_ms=result.processing_time_ms,
        image_url=image_url,
    )


@router.get("/history", response_model=HistoryListResponse)
async def list_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HistoryListResponse:
    offset = (page - 1) * page_size

    count_q = await db.execute(
        select(func.count()).where(FormulaHistory.user_id == current_user.id)
    )
    total = count_q.scalar_one()

    items_q = await db.execute(
        select(FormulaHistory)
        .where(FormulaHistory.user_id == current_user.id)
        .order_by(FormulaHistory.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    items = items_q.scalars().all()

    return HistoryListResponse(
        items=[FormulaHistoryItem.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
        has_next=(offset + page_size) < total,
    )


@router.get("/history/{item_id}", response_model=FormulaHistoryItem)
async def get_history_item(
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FormulaHistoryItem:
    result = await db.execute(
        select(FormulaHistory).where(
            FormulaHistory.id == item_id,
            FormulaHistory.user_id == current_user.id,
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="이력을 찾을 수 없습니다.")
    return FormulaHistoryItem.model_validate(item)


@router.delete("/history/{item_id}", response_model=None)
async def delete_history_item(
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    result = await db.execute(
        select(FormulaHistory).where(
            FormulaHistory.id == item_id,
            FormulaHistory.user_id == current_user.id,
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="이력을 찾을 수 없습니다.")
    await db.delete(item)
    await db.commit()
    return Response(status_code=204)


@router.patch("/history/{item_id}/bookmark", response_model=BookmarkToggleResponse)
async def toggle_bookmark(
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BookmarkToggleResponse:
    result = await db.execute(
        select(FormulaHistory).where(
            FormulaHistory.id == item_id,
            FormulaHistory.user_id == current_user.id,
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="이력을 찾을 수 없습니다.")
    item.is_bookmarked = not item.is_bookmarked
    return BookmarkToggleResponse(id=str(item.id), is_bookmarked=item.is_bookmarked)
