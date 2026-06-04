---
name: env-configuration
description: >
  **환경변수(.env) 설정 SKILL** — Handwrite2KaTeX 프로젝트의 .env 파일 전체 항목 정의,
  설정 방법, 적용 규칙을 기술한다.
  USE FOR: .env 신규 설정, 항목 추가/수정, 서버 재시작 절차, .env.example 동기화.
  ALWAYS ENFORCE: .env는 git 커밋 금지 / 변경 후 --force-recreate 적용 / .env.example 동기화.
applyTo: ".env,.env.example,docker-compose.yml,backend/app/core/config.py"
---

# .env 설정 가이드 (Handwrite2KaTeX)

## 1. 파일 구조 및 역할

| 파일 | Git 포함 | 용도 |
|------|----------|------|
| `.env` | ❌ (gitignore) | 실제 운영 환경변수 (API 키 포함) |
| `.env.example` | ✅ | 항목 템플릿 (값 없음 또는 기본값만) |

> **규칙**: `.env`에 항목 추가 시 반드시 `.env.example`에도 동일 항목을 (값 비워서) 추가한다.

---

## 2. 전체 환경변수 목록

### 2.1 앱 기본 설정

| 변수 | 기본값 | 타입 | 설명 |
|------|--------|------|------|
| `APP_ENV` | `development` | `development\|staging\|production` | 실행 환경 |
| `DEBUG` | `false` | bool | uvicorn 로그 상세 출력, Swagger UI 노출 |
| `SSL_VERIFY` | `true` | bool | 외부 API HTTPS 인증서 검증. 사내망(Somansa DLP)은 `false` |

### 2.2 포트 설정

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `BACKEND_PORT` | `8000` | FastAPI 호스트 노출 포트 (docker-compose `${BACKEND_PORT:-8000}`) |
| `FRONTEND_PORT` | `5173` | Vite dev server 호스트 노출 포트 |

> **HTTPS**: nginx reverse proxy + SSL 인증서 필요. 현재는 주석 처리.
> ```ini
> # HTTPS_PORT=8443
> # SSL_CERT_PATH=./certs/server.crt
> # SSL_KEY_PATH=./certs/server.key
> ```

### 2.3 JWT 인증

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `JWT_SECRET_KEY` | `change-me-...` | HS256 서명 키. **운영 시 반드시 강력한 랜덤 값으로 변경** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | Access Token 유효기간 (분) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `30` | Refresh Token 유효기간 (일) |

### 2.4 관리자 계정 (선택)

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `ADMIN_EMAIL` | `` | 서버 시작 시 자동 생성할 admin 이메일 |
| `ADMIN_PASSWORD` | `` | admin 계정 비밀번호 (8자 이상, 영문+숫자+특수문자) |

> 비워두면 자동 생성 생략. 일반 회원가입으로 대체 가능.

### 2.5 AI 인식기 (우선순위 순)

**인식기 우선순위**:
```
USE_LOCAL_MODEL=true  → pix2tex (오프라인, API 비용 없음)
GROQ_API_KEY 설정     → Groq llama-4-scout (무료 tier)
GEMINI_API_KEY 설정   → Gemini 2.0 (무료 1,500 req/day)
MATHPIX_APP_ID+KEY    → Mathpix OCR (수식 특화, 무료 100 req/월)
(없음)                → Mock (개발용 고정 응답)
```

런타임 전환 (재시작 없이): `PATCH /api/v1/settings/recognizer {"recognizer": "groq"}`

---

#### USE_LOCAL_MODEL — pix2tex 로컬 모델

```ini
USE_LOCAL_MODEL=true
```

- 별도 API 키 불필요. `docker-compose build` 시 모델 가중치 자동 포함
- CPU 추론 약 180ms~2초, 완전 오프라인 동작
- 모델: [lukas-blecher/LaTeX-OCR](https://github.com/lukas-blecher/LaTeX-OCR) (CROHME 학습)

---

#### GROQ_API_KEY — Groq Vision API

**발급 사이트**: https://console.groq.com

```
1. https://console.groq.com 접속 후 회원가입 / 로그인
2. 좌측 메뉴 "API Keys" 클릭
3. "Create API Key" 버튼 → 키 이름 입력 → 생성
4. 생성된 키 복사 (gsk_ 로 시작, 재확인 불가 — 즉시 저장 필수)
```

```ini
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GROQ_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
```

| 항목 | 내용 |
|------|------|
| 무료 한도 | Rate limit 있음 (분당 요청 수 제한) |
| 키 형식 | `gsk_` 로 시작 |
| 현재 Vision 모델 | `meta-llama/llama-4-scout-17b-16e-instruct` (2026년 기준 유일) |
| 주의 | `llama-3.2-11b-vision-preview` 는 2026년 폐기(decommissioned) |

---

#### GEMINI_API_KEY — Google Gemini

**발급 사이트**: https://aistudio.google.com

```
1. https://aistudio.google.com 접속 후 Google 계정 로그인
2. 상단 "Get API key" 버튼 클릭
3. "Create API key in new project" 또는 기존 프로젝트 선택
4. 생성된 키 복사 (AIzaSy 로 시작)
```

```ini
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GEMINI_MODEL=gemini-2.0-flash-lite
```

| 항목 | 내용 |
|------|------|
| 무료 한도 | 1,500 req/day (2026년 기준) |
| 키 형식 | `AIzaSy` 로 시작 |
| 주의 | 사내망에서 SSL 오류 시 `SSL_VERIFY=false` 설정 필요 |
| 주의 | `gemini-1.5-pro` 엔드포인트는 404 오류 → `gemini-2.0-flash-lite` 사용 |

---

#### MATHPIX_APP_ID / MATHPIX_APP_KEY — Mathpix OCR

**발급 사이트**: https://mathpix.com

```
1. https://mathpix.com 접속 후 회원가입 / 로그인
2. 우측 상단 아바타 아이콘 클릭 → "Account" 선택
3. "API Keys" 탭 클릭
4. "Create App" 버튼 → App Name 입력 (예: handwrite2katex)
5. 생성된 APP_ID 와 APP_KEY 복사
```

```ini
MATHPIX_APP_ID=your_org_abcdef
MATHPIX_APP_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

| 항목 | 내용 |
|------|------|
| 무료 한도 | 100 req/월 |
| 초과 요금 | $0.004 / req |
| 손글씨 정확도 | 88~93% (프로젝트 내 인식기 중 최상위) |
| 인쇄체 정확도 | 95~98% |
| API 엔드포인트 | `https://api.mathpix.com/v3/text` |

### 2.6 스토리지

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `STORAGE_BACKEND` | `local` | `local` \| `s3` \| `minio` |
| `LOCAL_STORAGE_PATH` | `/tmp/h2k_storage` | 로컬 저장 경로 (컨테이너 내부) |
| `AWS_ACCESS_KEY_ID` | `` | S3 사용 시 |
| `AWS_SECRET_ACCESS_KEY` | `` | S3 사용 시 |
| `S3_BUCKET_NAME` | `handwrite2katex` | S3 버킷명 |
| `S3_REGION` | `ap-northeast-2` | S3 리전 |
| `MINIO_ENDPOINT` | `http://localhost:9000` | MinIO 엔드포인트 |

---

## 3. .env 초기 설정 (최소 구성)

```ini
# 필수
APP_ENV=development
DEBUG=true
JWT_SECRET_KEY=<랜덤 32자 이상 문자열>

# AI 인식기 중 하나 이상 설정
GROQ_API_KEY=gsk_...
# 또는
GEMINI_API_KEY=AIzaSy...
# 또는
USE_LOCAL_MODEL=true
```

---

## 4. 변경 적용 방법

```bash
# .env 수정 후 반드시 --force-recreate
# (docker-compose restart는 .env를 다시 읽지 않음)
docker-compose up -d --force-recreate backend

# 특정 값 확인
docker exec h2k_backend sh -c 'echo $GROQ_API_KEY'
```

---

## 5. .env ↔ config.py ↔ docker-compose 관계

```
.env
 └─ docker-compose.yml  (env_file: .env, ${VAR:-default} 포트 치환)
      └─ backend 컨테이너
           └─ backend/app/core/config.py  (Pydantic Settings, env_file=".env")
                └─ settings.GROQ_API_KEY 등으로 코드에서 참조
```

---

## 6. 금지 사항

| 금지 | 이유 |
|------|------|
| `.env` git 커밋 | API 키 유출 위험 |
| `docker-compose restart` 사용 | `.env` 변경사항 미반영 |
| `.env.example`에 실제 키 값 기입 | git에 노출됨 |
| 항목 추가 시 `.env.example` 미동기화 | 신규 개발자가 항목 누락 |
