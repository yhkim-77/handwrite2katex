---
name: testing-guide
description: >
  **테스트 가이드 SKILL** — pytest 실행법, 테스트 분류(unit/integration/e2e), TC-ID 매핑.
  USE FOR: 테스트 추가, 실행, TC.md Traceability Matrix 갱신.
applyTo: "backend/tests/**,e2e/**,frontend/src/__tests__/**"
---

# 테스트 가이드 (Handwrite2KaTeX)

## 1. 테스트 실행

### 컨테이너 내부에서 실행 (권장)

```bash
# 전체 단위 테스트 (integration 제외)
docker exec h2k_backend bash -c "cd /app && python -m pytest tests/ -q --tb=short -k 'not integration'"

# 특정 파일만
docker exec h2k_backend bash -c "cd /app && python -m pytest tests/test_recognizer.py -v"

# 특정 함수만
docker exec h2k_backend bash -c "cd /app && python -m pytest tests/test_recognizer.py::test_groq_recognizer_parses_response -v"

# Integration 테스트 포함 (실제 API 키 필요)
docker exec h2k_backend bash -c "cd /app && python -m pytest tests/ -v -m integration"

# 커버리지 리포트
docker exec h2k_backend bash -c "cd /app && python -m pytest tests/ --cov=app --cov-report=term-missing -k 'not integration'"
```

---

## 2. 테스트 파일 구조

```
backend/tests/
  conftest.py          — pytest fixtures (DB, auth token 등)
  test_auth.py         — 인증 API (register/login/me/logout)
  test_formula.py      — 수식 변환 API (convert/history)
  test_image.py        — 이미지 전처리 유닛 테스트
  test_recognizer.py   — AI 인식기 선택 + 응답 파싱 (unit + integration)
  test_integration.py  — 전체 흐름 통합 테스트
  test_security.py     — OWASP 보안 테스트

frontend/src/__tests__/
  DrawingCanvas.test.tsx
  LaTeXPanel.test.tsx
  KaTeXPanel.test.tsx
  stores.test.ts

e2e/tests/
  auth.spec.ts         — Playwright E2E 인증 흐름
  formula.spec.ts      — Playwright E2E 수식 변환 흐름
```

---

## 3. pytest 마커 구분

| 마커 | 설명 | 실행 조건 |
|------|------|---------|
| (없음) | 단위 테스트 — mock 사용 | 항상 실행 가능 |
| `@pytest.mark.integration` | 실제 API 호출 | 환경변수에 실제 키 필요 |
| `@pytest.mark.asyncio` | 비동기 테스트 | pytest-asyncio 필요 |

Integration 테스트 skip 조건:
```python
# GROQ: gsk_ 로 시작하지 않으면 skip
GROQ_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_KEY = GROQ_KEY if GROQ_KEY.startswith("gsk_") else ""

# GEMINI: 키 없으면 skip
@pytest.mark.skipif(not GEMINI_KEY, reason="GEMINI_API_KEY 없음")

# MATHPIX: APP_ID 없으면 skip
@pytest.mark.skipif(not MATHPIX_APP_ID or not MATHPIX_APP_KEY, reason="MATHPIX 키 없음")
```

---

## 4. Mock 사용 원칙

| 대상 | 사용할 Mock |
|------|------------|
| `httpx.AsyncClient` | `AsyncMock` (context manager) |
| `resp.json()` | `MagicMock(return_value=...)` — **동기** 메서드 |
| `resp.raise_for_status()` | `MagicMock()` — **동기** 메서드 |
| DB 세션 | `AsyncMock` |

```python
# 올바른 패턴
mock_resp = MagicMock()
mock_resp.raise_for_status = MagicMock()       # 동기 → MagicMock
mock_resp.json = MagicMock(return_value={...}) # 동기 → MagicMock

mock_client = AsyncMock()
mock_client.__aenter__ = AsyncMock(return_value=mock_client)
mock_client.__aexit__ = AsyncMock(return_value=False)
mock_client.post = AsyncMock(return_value=mock_resp)

with patch("app.services.recognizer.httpx.AsyncClient", return_value=mock_client):
    result = await SomeRecognizer().convert(image_bytes)
```

---

## 5. TC-ID 규칙

새 테스트 추가 시 TC.md Traceability Matrix 갱신 필수.

| 접두사 | 대상 |
|--------|------|
| `TC-U-A*` | 인증(Auth) 단위 테스트 |
| `TC-U-B*` | Backend 이미지 처리 단위 테스트 |
| `TC-U-R*` | Recognizer 단위 테스트 |
| `TC-I-*` | 통합(Integration) 테스트 |
| `TC-E-W*` | E2E Web (Playwright) |
| `TC-E-M*` | E2E Mobile (Detox) |
| `TC-P-*` | 성능(k6) 테스트 |
| `TC-S-*` | 보안 테스트 |
| `TC-C-*` | 호환성 테스트 |
