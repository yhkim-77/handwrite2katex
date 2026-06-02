"""Integration Tests — TC-I-01 ~ TC-I-08, TC-I-DB01 ~ TC-I-DB03."""
from __future__ import annotations

import asyncio
import io
import uuid
from unittest.mock import AsyncMock, patch

import pytest
from PIL import Image


# ─── Helper ──────────────────────────────────────────────────────────────────

def _make_png(width: int = 100, height: int = 100) -> bytes:
    """최소한의 PNG bytes를 생성한다."""
    buf = io.BytesIO()
    img = Image.new("RGB", (width, height), color=(255, 255, 255))
    img.save(buf, format="PNG")
    return buf.getvalue()


async def _register_and_login(client, email: str, password: str = "Password1") -> str:
    """사용자 등록 + 로그인 후 access_token 반환."""
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ─── TC-I-01: 수식 변환 전체 흐름 ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_full_convert_flow(client):
    """TC-I-01: 로그인 → 이미지 업로드 → LaTeX 수신."""
    token = await _register_and_login(client, "int01@example.com")

    files = {"file": ("formula.png", _make_png(), "image/png")}
    resp = await client.post("/api/v1/formula/convert", files=files, headers=_auth(token))

    assert resp.status_code == 200
    data = resp.json()
    assert "latex" in data
    assert "id" in data


# ─── TC-I-02: 변환 이력 자동 저장 ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_history_auto_save(client):
    """TC-I-02: 변환 후 이력 조회 시 레코드가 존재해야 한다."""
    token = await _register_and_login(client, "int02@example.com")
    files = {"file": ("f.png", _make_png(), "image/png")}
    await client.post("/api/v1/formula/convert", files=files, headers=_auth(token))

    resp = await client.get("/api/v1/formula/history", headers=_auth(token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert len(data["items"]) >= 1


# ─── TC-I-03: 인증 없이 변환 요청 ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_convert_no_auth(client):
    """TC-I-03: Bearer 토큰 없이 POST /formula/convert → 403 반환."""
    files = {"file": ("f.png", _make_png(), "image/png")}
    resp = await client.post("/api/v1/formula/convert", files=files)
    assert resp.status_code == 403


# ─── TC-I-04: 이력 목록 페이지네이션 ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_history_pagination(client):
    """TC-I-04: 이력 25개 생성 후 page_size=20 조회 → 20개 + has_next=True."""
    token = await _register_and_login(client, "int04@example.com")
    files_payload = {"file": ("f.png", _make_png(), "image/png")}

    # 25번 변환
    for _ in range(25):
        await client.post("/api/v1/formula/convert", files=files_payload, headers=_auth(token))

    resp = await client.get(
        "/api/v1/formula/history?page=1&page_size=20",
        headers=_auth(token),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 20
    assert data["has_next"] is True
    assert data["total"] >= 25


# ─── TC-I-05: 이력 삭제 ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_history_delete(client):
    """TC-I-05: 특정 이력 ID DELETE → 204, DB에서 삭제."""
    token = await _register_and_login(client, "int05@example.com")
    files = {"file": ("f.png", _make_png(), "image/png")}
    convert_resp = await client.post(
        "/api/v1/formula/convert", files=files, headers=_auth(token)
    )
    item_id = convert_resp.json()["id"]

    del_resp = await client.delete(
        f"/api/v1/formula/history/{item_id}", headers=_auth(token)
    )
    assert del_resp.status_code == 204

    # 삭제 후 조회 → 404
    get_resp = await client.get(
        f"/api/v1/formula/history/{item_id}", headers=_auth(token)
    )
    assert get_resp.status_code == 404


# ─── TC-I-06: 다른 사용자 이력 접근 ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_cross_user_access(client):
    """TC-I-06: 타 사용자 이력 ID 조회 → 404 반환 (정보 노출 방지)."""
    token_a = await _register_and_login(client, "int06a@example.com")
    token_b = await _register_and_login(client, "int06b@example.com")

    files = {"file": ("f.png", _make_png(), "image/png")}
    convert_resp = await client.post(
        "/api/v1/formula/convert", files=files, headers=_auth(token_a)
    )
    item_id = convert_resp.json()["id"]

    # user B가 user A의 이력 조회
    resp = await client.get(
        f"/api/v1/formula/history/{item_id}", headers=_auth(token_b)
    )
    assert resp.status_code == 404


# ─── TC-I-07: LLM API 타임아웃 처리 ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_llm_timeout(client):
    """TC-I-07: LLM 10초 지연 → 502 Bad Gateway."""
    token = await _register_and_login(client, "int07@example.com")

    async def slow_convert(image_bytes: bytes):
        await asyncio.sleep(0.01)  # 테스트에서는 짧은 지연 후 에러 시뮬레이션
        raise TimeoutError("LLM API timeout")

    with patch(
        "app.services.recognizer.MockRecognizer.convert",
        new_callable=AsyncMock,
        side_effect=TimeoutError("LLM API timeout"),
    ):
        files = {"file": ("f.png", _make_png(), "image/png")}
        resp = await client.post(
            "/api/v1/formula/convert", files=files, headers=_auth(token)
        )
    assert resp.status_code == 502


# ─── TC-I-08: Rate Limit (실제 Rate Limit 미구현 — PoC 알림) ─────────────────

@pytest.mark.asyncio
async def test_rate_limit_not_implemented(client):
    """TC-I-08: Rate Limit은 v1.1 예정, 현재는 스킵."""
    pytest.skip("Rate Limit (TC-I-08) is planned for v1.1")


# ─── TC-I-DB01: 사용자 삭제 시 이력 연쇄 삭제 ───────────────────────────────

@pytest.mark.asyncio
async def test_cascade_delete(client, db_session):
    """TC-I-DB01: 사용자 삭제 시 formula_history CASCADE 삭제."""
    from app.models.formula import FormulaHistory
    from app.models.user import User
    from sqlalchemy import select

    token = await _register_and_login(client, "dbdel@example.com")
    files = {"file": ("f.png", _make_png(), "image/png")}
    await client.post("/api/v1/formula/convert", files=files, headers=_auth(token))

    # user 조회
    result = await db_session.execute(
        select(User).where(User.email == "dbdel@example.com")
    )
    user = result.scalar_one()
    user_id = user.id

    # 이력 존재 확인
    hist = await db_session.execute(
        select(FormulaHistory).where(FormulaHistory.user_id == user_id)
    )
    assert hist.scalars().all()

    # 사용자 삭제
    await db_session.delete(user)
    await db_session.commit()

    # CASCADE 확인
    hist_after = await db_session.execute(
        select(FormulaHistory).where(FormulaHistory.user_id == user_id)
    )
    assert hist_after.scalars().all() == []
