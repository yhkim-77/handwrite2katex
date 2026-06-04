---
name: env-configuration
description: >
  **환경변수(.env) 설정 SKILL** — .env 전체 항목 정의, 설정 방법, 적용 절차.
  USE FOR: .env 항목 추가·수정·설명, config.py 연동, 서버 재시작 절차.
  ALWAYS ENFORCE: .env 커밋 금지 / 변경 후 force-recreate / .env.example 동기화.
applyTo: ".env,.env.example,docker-compose.yml,backend/app/core/config.py"
---

# .env 설정 레퍼런스 (Claude용)

## 전체 변수 목록

### 앱

| 변수 | 기본값 | 비고 |
|------|--------|------|
| `APP_ENV` | `development` | `development` \| `staging` \| `production` |
| `DEBUG` | `false` | `true` → Swagger(/docs) 노출, 상세 로그 |
| `SSL_VERIFY` | `true` | 사내망(Somansa DLP) 우회: `false` |

### 포트

| 변수 | 기본값 | 비고 |
|------|--------|------|
| `BACKEND_PORT` | `8000` | FastAPI 호스트 포트. docker-compose `${BACKEND_PORT:-8000}` |
| `FRONTEND_PORT` | `5173` | Vite dev server 호스트 포트 |

선택적 HTTPS (현재 주석):
```ini
# HTTPS_PORT=8443
# SSL_CERT_PATH=./certs/server.crt
# SSL_KEY_PATH=./certs/server.key
```

### JWT

| 변수 | 기본값 | 비고 |
|------|--------|------|
| `JWT_SECRET_KEY` | `change-me-...` | 운영 시 반드시 강력한 랜덤값으로 교체 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `30` | |

### 관리자 계정 (선택)

| 변수 | 비고 |
|------|------|
| `ADMIN_EMAIL` | 서버 시작 시 계정 자동 생성. 비워두면 생략 |
| `ADMIN_PASSWORD` | 8자 이상, 영문+숫자+특수문자 |

### AI 인식기 (우선순위 순)

| 변수 | 예시 | 비고 |
|------|------|------|
| `USE_LOCAL_MODEL` | `false` | `true` → pix2tex 로컬 모델 (오프라인) |
| `GROQ_API_KEY` | `gsk_...` | Groq Vision API. `gsk_`로 시작 |
| `GROQ_MODEL` | `meta-llama/llama-4-scout-17b-16e-instruct` | |
| `GEMINI_API_KEY` | `AIzaSy...` | Google Gemini |
| `GEMINI_MODEL` | `gemini-2.0-flash-lite` | |
| `MATHPIX_APP_ID` | `your_org_xxx` | Mathpix 수식 특화 OCR |
| `MATHPIX_APP_KEY` | `...` | |

### 스토리지

| 변수 | 기본값 | 비고 |
|------|--------|------|
| `STORAGE_BACKEND` | `local` | `local` \| `s3` \| `minio` |
| `LOCAL_STORAGE_PATH` | `/tmp/h2k_storage` | |
| `AWS_ACCESS_KEY_ID` | `` | S3 사용 시 |
| `AWS_SECRET_ACCESS_KEY` | `` | S3 사용 시 |
| `S3_BUCKET_NAME` | `handwrite2katex` | |
| `S3_REGION` | `ap-northeast-2` | |
| `MINIO_ENDPOINT` | `http://localhost:9000` | |

---

## .env 수정 후 적용

```bash
# 반드시 --force-recreate (restart는 .env 미반영)
docker-compose up -d --force-recreate backend

# 변수 확인
docker exec h2k_backend sh -c 'echo $변수명'
```

---

## 수정 규칙

1. `.env` 항목 추가 시 → `.env.example`에도 동일 항목 추가 (값 비움)
2. `.env`는 절대 git 커밋 금지
3. 선택적 기능은 주석(`#`)으로만 추가, 활성화하지 않음
4. `config.py`에 없는 변수는 코드에서 읽히지 않음 → 함께 추가

---

## 데이터 흐름

```
.env  →  docker-compose.yml (env_file + ${PORT} 치환)
      →  backend/app/core/config.py (Pydantic Settings)
      →  settings.VARIABLE 로 코드 참조
```
