---
name: development-guidelines
description: >
  **개발 가이드라인 SKILL** — Handwrite2KaTeX 프로젝트의 AI 어시스턴트(Claude, Copilot 등)가
  코드 변경·설정 수정·기능 추가 시 반드시 준수해야 하는 원칙.
  USE FOR: 모든 코드 수정, 설정 변경, 파일 생성 작업 전 참조.
  ALWAYS ENFORCE: 요청 범위 준수, 최소 변경 원칙, 주석 처리 규칙.
applyTo: "**/*"
---

# 개발 가이드라인 (Handwrite2KaTeX)

## 1. 핵심 원칙: 요청 범위 준수 (Scope Adherence)

> **요청한 것만 구현한다. 요청하지 않은 것은 추가하지 않는다.**

### 1.1 위반 사례 (하지 말 것)

사용자가 "HTTPS port를 .env에서 설정 가능하게 해줘" 라고 요청했을 때:

```ini
# ❌ 잘못된 예 — 요청하지 않은 BACKEND_PORT, FRONTEND_PORT 추가
BACKEND_PORT=8000        ← 요청하지 않음
FRONTEND_PORT=5173       ← 요청하지 않음
HTTPS_PORT=8443
SSL_CERT_PATH=./certs/server.crt
SSL_KEY_PATH=./certs/server.key
```

### 1.2 올바른 예 (해야 할 것)

```ini
# ✅ 올바른 예 — 요청한 HTTPS 포트만 추가
# HTTPS_PORT=8443
# SSL_CERT_PATH=./certs/server.crt
# SSL_KEY_PATH=./certs/server.key
```

---

## 2. 최소 변경 원칙 (Minimal Change)

| 규칙 | 설명 |
|------|------|
| **필요한 것만** | 요청된 기능 구현에 직접 필요한 코드만 추가 |
| **주석은 주석으로** | 선택적·미래 기능은 반드시 주석(`#`)으로 처리 |
| **활성 설정 최소화** | 기본값이 있는 설정은 주석으로 두고 사용자가 필요 시 활성화 |
| **기존 코드 존중** | 동작 중인 코드는 요청 없이 리팩토링하지 않음 |

---

## 3. 설정 파일 (.env) 수정 규칙

### 3.1 활성 설정 vs 주석 설정

```ini
# 활성 설정: 즉시 동작에 영향을 미치는 필수 값
REQUIRED_SETTING=value

# 주석 설정: 선택적 기능, 미래 기능, 사용자가 필요 시 활성화
# OPTIONAL_SETTING=value
```

### 3.2 .env 추가 판단 기준

| 상황 | 처리 |
|------|------|
| 사용자가 명시적으로 요청한 설정 | 활성 상태로 추가 |
| 관련된 선택적 설정 | **주석**으로만 추가 (활성화 안 함) |
| 요청과 무관한 편의 설정 | **추가하지 않음** |

---

## 4. 프로젝트 구조 및 기술 스택

```
handwrite2katex/
├── backend/          # FastAPI (Python 3.12)
│   ├── app/
│   │   ├── api/v1/   # 엔드포인트 (auth, formula, settings)
│   │   ├── core/     # config, database, security
│   │   ├── models/   # SQLAlchemy ORM
│   │   ├── schemas/  # Pydantic 스키마
│   │   └── services/ # recognizer, image, storage
│   └── tests/
├── frontend/         # React + Vite + TypeScript
│   └── src/
│       ├── api/      # axios 클라이언트
│       ├── components/
│       ├── pages/
│       ├── stores/   # Zustand
│       └── types/
├── docs/             # SDLC 문서 (MRD/PRD/SRS/TC/MILESTONE/LLM_REVIEW)
├── .env              # 실제 환경변수 (git 제외)
├── .env.example      # 환경변수 템플릿 (git 포함)
└── docker-compose.yml
```

## 5. AI 인식기 우선순위

```
USE_LOCAL_MODEL=true  → pix2tex (LocalRecognizer)
GROQ_API_KEY          → Groq llama-4-scout (GroqRecognizer)
GEMINI_API_KEY        → Gemini 2.0 (GeminiRecognizer)
MATHPIX_APP_ID+KEY    → Mathpix OCR (MathpixRecognizer)
(없음)                → Mock
```

런타임 변경: `PATCH /api/v1/settings/recognizer`

## 6. Docker 운영 규칙

- 환경변수 변경 시: `docker-compose up -d --force-recreate backend`
- `docker-compose restart`는 `.env`를 다시 읽지 않음 → 반드시 `--force-recreate` 사용
- 포트 설정: `.env`의 `BACKEND_PORT`, `FRONTEND_PORT` → docker-compose.yml이 변수 치환

## 7. Git 운영 규칙

- SSH 방식: `git@github-yhkim77:yhkim-77/handwrite2katex.git`
- `.env`는 `.gitignore`에 포함 → **절대 커밋 금지**
- `__pycache__`, `node_modules`, `dist`는 `.gitignore`에 포함
