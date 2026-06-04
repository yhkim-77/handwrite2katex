# GitHub Copilot Instructions — Handwrite2KaTeX

## 프로젝트 개요

손글씨 수식 이미지를 LaTeX 코드로 변환하는 웹 플랫폼.

- **Frontend**: React + Vite + TypeScript + KaTeX (port: `FRONTEND_PORT`, 기본 5173)
- **Backend**: FastAPI + Python 3.12 + SQLAlchemy (port: `BACKEND_PORT`, 기본 8000)
- **DB**: PostgreSQL 16 + Redis 7
- **AI**: pix2tex / Groq / Gemini / Mathpix OCR (Adapter 패턴)

---

## 핵심 원칙

### 요청 범위만 구현한다

- 요청된 기능만 추가하고, 관련 없는 코드·설정·변수는 건드리지 않는다.
- 선택적 설정은 활성화하지 않고 주석(`#`)으로만 추가한다.
- 기존 동작 코드는 요청 없이 리팩토링하지 않는다.

---

## 아키텍처

### Backend (`backend/app/`)

```
api/v1/
  auth.py      — JWT 인증 (register/login/me/refresh/logout)
  formula.py   — 수식 변환 (convert/history CRUD)
  settings.py  — 인식기 선택 (GET/PATCH /settings/recognizer)
core/
  config.py    — Pydantic Settings (환경변수 → Python 객체)
  database.py  — SQLAlchemy async engine
  security.py  — bcrypt, JWT
services/
  recognizer.py — FormulaRecognizer Adapter (Local/Groq/Gemini/Mathpix/Mock)
  image.py      — 이미지 전처리
  storage.py    — S3/MinIO/local 저장
```

### AI 인식기 우선순위

```python
# backend/app/services/recognizer.py::get_active_recognizer_id()
USE_LOCAL_MODEL=true  → LocalRecognizer  (pix2tex, 오프라인)
GROQ_API_KEY          → GroqRecognizer   (llama-4-scout)
GEMINI_API_KEY        → GeminiRecognizer (gemini-2.0-flash-lite)
MATHPIX_APP_ID+KEY    → MathpixRecognizer (수식 특화 OCR)
(없음)                → MockRecognizer   (개발용)
```

런타임 변경: `PATCH /api/v1/settings/recognizer { "recognizer": "groq" }`

### Frontend (`frontend/src/`)

```
api/client.ts        — axios 인스턴스 + authApi / formulaApi / settingsApi
stores/useStore.ts   — Zustand (Auth/Formula/History/Recognizer/Theme)
components/
  Canvas/            — 손글씨 드로잉
  LaTeXPanel/        — LaTeX 코드 표시·편집
  KaTeXPanel/        — KaTeX 수식 렌더링
  HistoryPanel/      — 변환 이력
  RecognizerPanel/   — 인식기 선택 UI (⚙️ 버튼)
  Header/            — 네비게이션
```

---

## 환경변수 (.env)

> 상세 가이드: [`.github/skills/env-configuration/SKILL.md`](.github/skills/env-configuration/SKILL.md)

### 앱 기본

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `APP_ENV` | `development` | `development` \| `staging` \| `production` |
| `DEBUG` | `false` | `true` → Swagger(/docs) 노출 |
| `SSL_VERIFY` | `true` | 사내망 Somansa DLP 우회 시 `false` |

### 포트

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `BACKEND_PORT` | `8000` | FastAPI 호스트 포트 (`docker-compose ${BACKEND_PORT:-8000}`) |
| `FRONTEND_PORT` | `5173` | Vite dev server 호스트 포트 |

선택적 HTTPS (주석 처리):
```ini
# HTTPS_PORT=8443
# SSL_CERT_PATH=./certs/server.crt
# SSL_KEY_PATH=./certs/server.key
```

### JWT

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `JWT_SECRET_KEY` | `change-me-...` | 운영 시 반드시 강력한 랜덤값 교체 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | Access Token 유효기간(분) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `30` | Refresh Token 유효기간(일) |

### 관리자 계정 (선택)

| 변수 | 설명 |
|------|------|
| `ADMIN_EMAIL` | 서버 시작 시 자동 생성. 비워두면 생략 |
| `ADMIN_PASSWORD` | 8자 이상, 영문+숫자+특수문자 |

### AI 인식기 (우선순위 순)

| 변수 | 예시 | 설명 |
|------|------|------|
| `USE_LOCAL_MODEL` | `false` | `true` → pix2tex 로컬 CROHME Transformer |
| `GROQ_API_KEY` | `gsk_...` | Groq Vision API (`gsk_`로 시작) |
| `GROQ_MODEL` | `meta-llama/llama-4-scout-17b-16e-instruct` | |
| `GEMINI_API_KEY` | `AIzaSy...` | Google Gemini |
| `GEMINI_MODEL` | `gemini-2.0-flash-lite` | |
| `MATHPIX_APP_ID` | `your_org_xxx` | Mathpix 수식 특화 OCR |
| `MATHPIX_APP_KEY` | `...` | |

### 스토리지

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `STORAGE_BACKEND` | `local` | `local` \| `s3` \| `minio` |
| `LOCAL_STORAGE_PATH` | `/tmp/h2k_storage` | 로컬 저장 경로 |
| `AWS_ACCESS_KEY_ID` | `` | S3 사용 시 |
| `AWS_SECRET_ACCESS_KEY` | `` | S3 사용 시 |
| `S3_BUCKET_NAME` | `handwrite2katex` | |
| `S3_REGION` | `ap-northeast-2` | |
| `MINIO_ENDPOINT` | `http://localhost:9000` | |

### .env 수정 규칙

- `.env` 항목 추가 시 → `.env.example`에도 동기화 (값 비움)
- `.env`는 git 커밋 금지 (`.gitignore` 포함)
- 변경 후 반드시 `docker-compose up -d --force-recreate backend`
- 선택적 기능은 주석(`#`)으로만 추가, 활성화하지 않음

---

## 코딩 컨벤션

### Python (Backend)

- `from __future__ import annotations` 항상 포함
- 타입 힌트 필수, Pydantic v2 사용
- 비동기 함수: `async def`, httpx `AsyncClient`
- DB: SQLAlchemy 2.0 async 스타일 (`async with session`)
- 테스트: pytest + pytest-asyncio, `MagicMock`(sync) / `AsyncMock`(async) 구분

### TypeScript (Frontend)

- 함수형 컴포넌트 + React hooks
- Zustand로 전역 상태 관리
- `api/client.ts`에 API 함수 집중, 컴포넌트에서 직접 axios 호출 금지
- CSS: `index.css` CSS 변수 사용 (`var(--primary)`, `var(--bg)` 등)

---

## Docker 운영

```bash
# 환경변수 변경 후 반드시 --force-recreate (restart는 .env 반영 안 됨)
docker-compose up -d --force-recreate backend

# 전체 재시작
docker-compose up -d --force-recreate

# 로그 확인
docker-compose logs -f backend
```

---

## SDLC 문서 (`docs/`)

코드 변경 시 영향받는 문서 동시 갱신 필수:

| 변경 유형 | 갱신 문서 |
|----------|----------|
| AI 모델 변경 | `LLM_REVIEW.md` |
| API 엔드포인트 추가 | `SRS.md`, `TC.md` |
| 기술 스택 변경 | `PRD.md`, `MILESTONE.md` |
| 테스트 추가 | `TC.md` (TC-ID 부여, Traceability Matrix 갱신) |

---

## Git

- SSH: `git@github-yhkim77:yhkim-77/handwrite2katex.git`
- `.env`는 `.gitignore` 포함 — 커밋 금지
- `__pycache__`, `node_modules`, `dist` — 커밋 금지
