"""Recognizer adapter tests — unit + optional Gemini/Groq API integration."""
import io
import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from PIL import Image

from app.services.recognizer import (
    GeminiRecognizer,
    GroqRecognizer,
    LocalRecognizer,
    MathpixRecognizer,
    MockRecognizer,
    RecognitionResult,
    get_recognizer,
)


def _make_png() -> bytes:
    img = Image.new("RGB", (200, 100), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# ── get_recognizer() 선택 로직 ─────────────────────────────────────────────

def test_get_recognizer_returns_mock_when_no_keys(monkeypatch):
    """API 키가 없으면 MockRecognizer를 반환해야 한다."""
    monkeypatch.setattr("app.services.recognizer.settings.USE_LOCAL_MODEL", False)
    monkeypatch.setattr("app.services.recognizer.settings.GROQ_API_KEY", "")
    monkeypatch.setattr("app.services.recognizer.settings.GEMINI_API_KEY", "")
    monkeypatch.setattr("app.services.recognizer.settings.MATHPIX_APP_ID", "")
    monkeypatch.setattr("app.services.recognizer.settings.MATHPIX_APP_KEY", "")
    assert isinstance(get_recognizer(), MockRecognizer)


def test_get_recognizer_returns_local_when_flag_set(monkeypatch):
    """TC-U-R02: USE_LOCAL_MODEL=true이면 LocalRecognizer를 반환해야 한다 (최우선)."""
    monkeypatch.setattr("app.services.recognizer.settings.USE_LOCAL_MODEL", True)
    assert isinstance(get_recognizer(), LocalRecognizer)


def test_get_recognizer_returns_groq_when_key_set(monkeypatch):
    """TC-U-R03: GROQ_API_KEY가 있으면 GroqRecognizer를 반환해야 한다."""
    monkeypatch.setattr("app.services.recognizer.settings.USE_LOCAL_MODEL", False)
    monkeypatch.setattr("app.services.recognizer.settings.GROQ_API_KEY", "fake-groq-key")
    assert isinstance(get_recognizer(), GroqRecognizer)


def test_get_recognizer_groq_takes_priority_over_gemini(monkeypatch):
    """TC-U-R04: GROQ_API_KEY와 GEMINI_API_KEY 모두 있으면 Groq이 우선이어야 한다."""
    monkeypatch.setattr("app.services.recognizer.settings.USE_LOCAL_MODEL", False)
    monkeypatch.setattr("app.services.recognizer.settings.GROQ_API_KEY", "fake-groq-key")
    monkeypatch.setattr("app.services.recognizer.settings.GEMINI_API_KEY", "fake-gemini-key")
    assert isinstance(get_recognizer(), GroqRecognizer)


def test_get_recognizer_returns_gemini_when_key_set(monkeypatch):
    """TC-U-R05: GROQ 없이 GEMINI_API_KEY가 있으면 GeminiRecognizer를 반환해야 한다."""
    monkeypatch.setattr("app.services.recognizer.settings.USE_LOCAL_MODEL", False)
    monkeypatch.setattr("app.services.recognizer.settings.GROQ_API_KEY", "")
    monkeypatch.setattr("app.services.recognizer.settings.GEMINI_API_KEY", "fake-key")
    assert isinstance(get_recognizer(), GeminiRecognizer)


def test_get_recognizer_returns_mathpix_when_gemini_absent(monkeypatch):
    """TC-U-R06: GROQ/GEMINI 없이 Mathpix 키만 있으면 MathpixRecognizer를 반환해야 한다."""
    monkeypatch.setattr("app.services.recognizer.settings.USE_LOCAL_MODEL", False)
    monkeypatch.setattr("app.services.recognizer.settings.GROQ_API_KEY", "")
    monkeypatch.setattr("app.services.recognizer.settings.GEMINI_API_KEY", "")
    monkeypatch.setattr("app.services.recognizer.settings.MATHPIX_APP_ID", "app_id")
    monkeypatch.setattr("app.services.recognizer.settings.MATHPIX_APP_KEY", "app_key")
    assert isinstance(get_recognizer(), MathpixRecognizer)


# ── MockRecognizer ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_mock_recognizer_returns_fixed_latex():
    """MockRecognizer는 이미지와 무관하게 고정 LaTeX를 반환해야 한다."""
    result = await MockRecognizer().convert(_make_png())
    assert isinstance(result, RecognitionResult)
    assert result.latex == r"\frac{d}{dx}\left(x^{2}\right)=2x"
    assert result.confidence == 0.99
    assert result.model == "mock"


@pytest.mark.asyncio
async def test_mock_recognizer_ignores_image_content():
    """MockRecognizer는 어떤 이미지에도 동일한 결과를 반환해야 한다."""
    r1 = await MockRecognizer().convert(b"not-even-a-real-image")
    r2 = await MockRecognizer().convert(_make_png())
    assert r1.latex == r2.latex


# ── GeminiRecognizer (mocked HTTP) ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_gemini_recognizer_parses_response(monkeypatch):
    """GeminiRecognizer가 API 응답에서 LaTeX를 올바르게 파싱해야 한다."""
    monkeypatch.setattr("app.services.recognizer.settings.GEMINI_API_KEY", "fake-key")
    monkeypatch.setattr("app.services.recognizer.settings.GEMINI_MODEL", "gemini-2.0-flash")
    monkeypatch.setattr("app.services.recognizer.settings.SSL_VERIFY", False)

    mock_response = {
        "candidates": [
            {"content": {"parts": [{"text": "2^{x}"}]}}
        ]
    }

    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json = MagicMock(return_value=mock_response)

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = AsyncMock(return_value=mock_resp)

    with patch("app.services.recognizer.httpx.AsyncClient", return_value=mock_client):
        result = await GeminiRecognizer().convert(_make_png())

    assert result.latex == "2^{x}"
    assert result.model.startswith("gemini/")
    assert result.confidence > 0


@pytest.mark.asyncio
async def test_gemini_recognizer_strips_latex_wrappers(monkeypatch):
    """GeminiRecognizer가 $, $$, \\[\\] 래퍼를 제거해야 한다."""
    monkeypatch.setattr("app.services.recognizer.settings.GEMINI_API_KEY", "fake-key")
    monkeypatch.setattr("app.services.recognizer.settings.GEMINI_MODEL", "gemini-2.0-flash")
    monkeypatch.setattr("app.services.recognizer.settings.SSL_VERIFY", False)

    for wrapped in ["$2^{x}$", "$$2^{x}$$", "\\[2^{x}\\]"]:
        mock_resp = MagicMock()
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json = MagicMock(return_value={
            "candidates": [{"content": {"parts": [{"text": wrapped}]}}]
        })
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_resp)

        with patch("app.services.recognizer.httpx.AsyncClient", return_value=mock_client):
            result = await GeminiRecognizer().convert(_make_png())

        assert result.latex == "2^{x}", f"래퍼 제거 실패: {wrapped!r} → {result.latex!r}"


@pytest.mark.asyncio
async def test_gemini_recognizer_handles_unreadable(monkeypatch):
    """모델이 ERROR:UNREADABLE을 반환하면 빈 latex와 confidence=0이어야 한다."""
    monkeypatch.setattr("app.services.recognizer.settings.GEMINI_API_KEY", "fake-key")
    monkeypatch.setattr("app.services.recognizer.settings.GEMINI_MODEL", "gemini-2.0-flash")
    monkeypatch.setattr("app.services.recognizer.settings.SSL_VERIFY", False)

    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json = MagicMock(return_value={
        "candidates": [{"content": {"parts": [{"text": "ERROR:UNREADABLE"}]}}]
    })
    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = AsyncMock(return_value=mock_resp)

    with patch("app.services.recognizer.httpx.AsyncClient", return_value=mock_client):
        result = await GeminiRecognizer().convert(_make_png())

    assert result.latex == ""
    assert result.confidence == 0.0


# ── Gemini API 실제 연동 테스트 (GEMINI_API_KEY 환경변수 필요) ───────────────

GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")

@pytest.mark.integration
@pytest.mark.skipif(not GEMINI_KEY, reason="GEMINI_API_KEY 환경변수 없음 — 실제 API 테스트 건너뜀")
@pytest.mark.asyncio
async def test_gemini_api_key_connectivity():
    """실제 Gemini API 키가 유효하고 모델에 접근 가능한지 확인한다."""
    import httpx
    from app.core.config import settings

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.GEMINI_MODEL}:generateContent"
    )
    payload = {"contents": [{"parts": [{"text": "output only: hello"}]}]}

    async with httpx.AsyncClient(verify=settings.SSL_VERIFY, timeout=15.0) as client:
        resp = await client.post(url, params={"key": GEMINI_KEY}, json=payload)

    assert resp.status_code != 404, (
        f"모델 '{settings.GEMINI_MODEL}'을 찾을 수 없습니다. GEMINI_MODEL 설정을 확인하세요."
    )
    assert resp.status_code != 401, "API 키가 유효하지 않습니다."
    assert resp.status_code != 403, "API 키 권한이 없습니다."
    assert resp.status_code == 200 or resp.status_code == 429, (
        f"예상치 못한 응답: {resp.status_code} — {resp.text[:200]}"
    )


@pytest.mark.integration
@pytest.mark.skipif(not GEMINI_KEY, reason="GEMINI_API_KEY 환경변수 없음 — 실제 API 테스트 건너뜀")
@pytest.mark.asyncio
async def test_gemini_api_converts_image():
    """실제 Gemini API로 이미지를 전송하면 LaTeX 문자열을 반환해야 한다.
    429(할당량 초과)는 API 자체는 정상이므로 pass 처리한다."""
    import httpx
    from app.core.config import settings

    try:
        result = await GeminiRecognizer().convert(_make_png())
        assert isinstance(result.latex, str)
        assert result.processing_time_ms > 0
        assert result.model.startswith("gemini/")
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 429:
            pytest.skip("Gemini API 할당량 초과(429) — API 키와 모델은 정상, 할당량 리셋 후 재시도")
        raise


# ── GroqRecognizer (mocked HTTP) ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_groq_recognizer_parses_response(monkeypatch):
    """GroqRecognizer가 OpenAI 호환 응답에서 LaTeX를 올바르게 파싱해야 한다."""
    monkeypatch.setattr("app.services.recognizer.settings.GROQ_API_KEY", "fake-groq-key")
    monkeypatch.setattr("app.services.recognizer.settings.GROQ_MODEL", "llama-3.2-11b-vision-preview")
    monkeypatch.setattr("app.services.recognizer.settings.SSL_VERIFY", False)

    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json = MagicMock(return_value={
        "choices": [{"message": {"content": "2^{x}"}}]
    })
    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = AsyncMock(return_value=mock_resp)

    with patch("app.services.recognizer.httpx.AsyncClient", return_value=mock_client):
        result = await GroqRecognizer().convert(_make_png())

    assert result.latex == "2^{x}"
    assert result.model.startswith("groq/")
    assert result.confidence > 0


@pytest.mark.asyncio
async def test_groq_recognizer_strips_wrappers(monkeypatch):
    """GroqRecognizer도 $, $$, \\[\\] 래퍼를 제거해야 한다."""
    monkeypatch.setattr("app.services.recognizer.settings.GROQ_API_KEY", "fake-groq-key")
    monkeypatch.setattr("app.services.recognizer.settings.GROQ_MODEL", "llama-3.2-11b-vision-preview")
    monkeypatch.setattr("app.services.recognizer.settings.SSL_VERIFY", False)

    for wrapped in ["$2^{x}$", "$$2^{x}$$", "\\[2^{x}\\]"]:
        mock_resp = MagicMock()
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json = MagicMock(return_value={
            "choices": [{"message": {"content": wrapped}}]
        })
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_resp)

        with patch("app.services.recognizer.httpx.AsyncClient", return_value=mock_client):
            result = await GroqRecognizer().convert(_make_png())

        assert result.latex == "2^{x}", f"래퍼 제거 실패: {wrapped!r} → {result.latex!r}"


# ── MathpixRecognizer (mocked HTTP) ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_mathpix_recognizer_parses_response(monkeypatch):
    """TC-U-R07: MathpixRecognizer가 latex_simplified 필드를 올바르게 파싱해야 한다."""
    monkeypatch.setattr("app.services.recognizer.settings.GROQ_API_KEY", "")
    monkeypatch.setattr("app.services.recognizer.settings.GEMINI_API_KEY", "")
    monkeypatch.setattr("app.services.recognizer.settings.MATHPIX_APP_ID", "app_id")
    monkeypatch.setattr("app.services.recognizer.settings.MATHPIX_APP_KEY", "app_key")
    monkeypatch.setattr("app.services.recognizer.settings.SSL_VERIFY", False)

    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json = MagicMock(return_value={"latex_simplified": "2^{x}", "confidence": 0.95})

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = AsyncMock(return_value=mock_resp)

    with patch("app.services.recognizer.httpx.AsyncClient", return_value=mock_client):
        result = await MathpixRecognizer().convert(_make_png())

    assert result.latex == "2^{x}"
    assert result.confidence == 0.95
    assert result.model == "mathpix/ocr"


@pytest.mark.asyncio
async def test_mathpix_recognizer_empty_response(monkeypatch):
    """TC-U-R08: latex_simplified 필드가 없으면 latex는 빈 문자열이어야 한다."""
    monkeypatch.setattr("app.services.recognizer.settings.GROQ_API_KEY", "")
    monkeypatch.setattr("app.services.recognizer.settings.GEMINI_API_KEY", "")
    monkeypatch.setattr("app.services.recognizer.settings.MATHPIX_APP_ID", "app_id")
    monkeypatch.setattr("app.services.recognizer.settings.MATHPIX_APP_KEY", "app_key")
    monkeypatch.setattr("app.services.recognizer.settings.SSL_VERIFY", False)

    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json = MagicMock(return_value={})

    mock_client = AsyncMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)
    mock_client.post = AsyncMock(return_value=mock_resp)

    with patch("app.services.recognizer.httpx.AsyncClient", return_value=mock_client):
        result = await MathpixRecognizer().convert(_make_png())

    assert result.latex == ""


@pytest.mark.asyncio
async def test_mathpix_recognizer_strips_wrappers(monkeypatch):
    """TC-U-R09: MathpixRecognizer도 $, $$, \\[\\] 래퍼를 제거해야 한다."""
    monkeypatch.setattr("app.services.recognizer.settings.GROQ_API_KEY", "")
    monkeypatch.setattr("app.services.recognizer.settings.GEMINI_API_KEY", "")
    monkeypatch.setattr("app.services.recognizer.settings.MATHPIX_APP_ID", "app_id")
    monkeypatch.setattr("app.services.recognizer.settings.MATHPIX_APP_KEY", "app_key")
    monkeypatch.setattr("app.services.recognizer.settings.SSL_VERIFY", False)

    for wrapped in ["$2^{x}$", "$$2^{x}$$", "\\[2^{x}\\]"]:
        mock_resp = MagicMock()
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json = MagicMock(return_value={"latex_simplified": wrapped, "confidence": 0.9})
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.post = AsyncMock(return_value=mock_resp)

        with patch("app.services.recognizer.httpx.AsyncClient", return_value=mock_client):
            result = await MathpixRecognizer().convert(_make_png())

        assert result.latex == "2^{x}", f"래퍼 제거 실패: {wrapped!r} → {result.latex!r}"


# ── Mathpix API 실제 연동 테스트 (MATHPIX_APP_ID 환경변수 필요) ─────────────────

MATHPIX_APP_ID = os.environ.get("MATHPIX_APP_ID", "")
MATHPIX_APP_KEY = os.environ.get("MATHPIX_APP_KEY", "")


@pytest.mark.integration
@pytest.mark.skipif(
    not MATHPIX_APP_ID or not MATHPIX_APP_KEY,
    reason="MATHPIX_APP_ID/APP_KEY 환경변수 없음 — 실제 API 테스트 건너뜀",
)
@pytest.mark.asyncio
async def test_mathpix_api_key_connectivity():
    """TC-U-R10: 실제 Mathpix API 키가 유효하고 엔드포인트에 접근 가능한지 확인한다."""
    import httpx
    from app.core.config import settings

    payload = {
        "src": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        "formats": ["latex_simplified"],
    }
    headers = {"app_id": MATHPIX_APP_ID, "app_key": MATHPIX_APP_KEY, "Content-Type": "application/json"}

    async with httpx.AsyncClient(verify=settings.SSL_VERIFY, timeout=15.0) as client:
        resp = await client.post("https://api.mathpix.com/v3/text", json=payload, headers=headers)

    assert resp.status_code != 401, "Mathpix APP_ID 또는 APP_KEY가 유효하지 않습니다."
    assert resp.status_code != 403, "Mathpix API 키 권한이 없습니다."
    assert resp.status_code in (200, 429), f"예상치 못한 응답: {resp.status_code} — {resp.text[:200]}"


# ── Groq API 실제 연동 테스트 (GROQ_API_KEY 환경변수 필요) ────────────────────

# Groq 실제 키는 'gsk_'로 시작 — placeholder이면 integration 테스트 건너뜀
GROQ_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_KEY = GROQ_KEY if GROQ_KEY.startswith("gsk_") else ""


@pytest.mark.integration
@pytest.mark.skipif(not GROQ_KEY, reason="GROQ_API_KEY 환경변수 없음 — 실제 API 테스트 건너뜀")
@pytest.mark.asyncio
async def test_groq_api_key_connectivity():
    """실제 Groq API 키가 유효하고 모델에 접근 가능한지 확인한다."""
    import httpx
    from app.core.config import settings

    payload = {
        "model": settings.GROQ_MODEL,
        "messages": [{"role": "user", "content": [{"type": "text", "text": "hi"}]}],
        "max_tokens": 10,
    }
    headers = {"Authorization": f"Bearer {GROQ_KEY}"}

    async with httpx.AsyncClient(verify=settings.SSL_VERIFY, timeout=15.0) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            json=payload,
            headers=headers,
        )

    assert resp.status_code != 401, "Groq API 키가 유효하지 않습니다."
    assert resp.status_code != 404, f"모델 '{settings.GROQ_MODEL}'을 찾을 수 없습니다."
    assert resp.status_code in (200, 429), f"예상치 못한 응답: {resp.status_code}"


@pytest.mark.integration
@pytest.mark.skipif(not GROQ_KEY, reason="GROQ_API_KEY 환경변수 없음 — 실제 API 테스트 건너뜀")
@pytest.mark.asyncio
async def test_groq_api_converts_image():
    """실제 Groq Vision API로 이미지를 전송하면 LaTeX 문자열을 반환해야 한다."""
    import httpx

    try:
        result = await GroqRecognizer().convert(_make_png())
        assert isinstance(result.latex, str)
        assert result.processing_time_ms > 0
        assert result.model.startswith("groq/")
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 429:
            pytest.skip("Groq API 할당량 초과(429) — 잠시 후 재시도")
        raise
