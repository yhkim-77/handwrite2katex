# Handwrite2KaTeX

> 손글씨 수식 → LaTeX 변환 → KaTeX 실시간 렌더링 크로스플랫폼 플랫폼

사용자가 마우스 또는 스타일러스 펜으로 입력한 수식을 LLM Vision 모델을 통해 **LaTeX 코드로 자동 변환**하고,
**KaTeX 엔진으로 실시간 수식 렌더링**을 제공하는 Web / Android / iOS 통합 서비스입니다.

---

## 주요 기능

```
┌──────────────────────────────────────────────────┐
│         Canvas (손글씨 수식 입력 영역)             │
│         마우스 · 터치 · 스타일러스 펜 지원          │
├─────────────────────┬────────────────────────────┤
│  LaTeX 코드 출력     │  KaTeX 수식 렌더링          │
│  \frac{d}{dx}x²=2x  │       d                   │
│                     │      ─── x² = 2x           │
│                     │      dx                    │
└─────────────────────┴────────────────────────────┘
```

- **실시간 변환**: Canvas 입력 완료 후 1.5초 내 자동 LaTeX 변환
- **크로스플랫폼**: Web (PWA), Android, iOS 동일 기능 제공
- **이력 관리**: 변환 결과 DB 저장·조회·즐겨찾기
- **직접 편집**: LaTeX 코드 인라인 편집 → KaTeX 즉시 재렌더링
- **보안**: HTTPS/TLS 1.3, JWT 인증, OWASP Top 10 준수

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React Native + Expo (Web/Android/iOS 공통) |
| 수식 렌더링 | KaTeX |
| Backend | FastAPI (Python 3.12) |
| 데이터베이스 | PostgreSQL 16 + Redis 7 |
| 파일 저장 | AWS S3 / MinIO |
| AI 변환 | Gemini 1.5 Pro Vision + Mathpix (폴백) |
| 인프라 | Docker + GitHub Actions + AWS ECS |

---

## 프로젝트 문서 (docs/)

| 문서 | 설명 |
|------|------|
| [MRD.md](docs/MRD.md) | 시장 요구사항 문서 — 시장 분석, 경쟁사, 비즈니스 목표 |
| [PRD.md](docs/PRD.md) | 제품 요구사항 문서 — UI 설계, 기능 요구사항, 아키텍처, API |
| [SRS.md](docs/SRS.md) | 소프트웨어 요구사항 명세 — 기능·비기능·품질·보안 요구사항 |
| [TC.md](docs/TC.md) | 테스트 케이스 — 단위·통합·E2E·성능·보안 테스트 |
| [MILESTONE.md](docs/MILESTONE.md) | 프로젝트 마일스톤 — 상세 개발 일정 및 위험 관리 |
| [LLM_REVIEW.md](docs/LLM_REVIEW.md) | LLM 모델 검토 — 모델 비교·분석·선택 근거·비용 전략 |

---

## 빠른 시작

### 요구사항
- Docker 24+ / Docker Compose v2
- (선택) Gemini API Key 또는 Mathpix API Key

### 1. 환경 설정
```bash
git clone https://github.com/yhkim-77/handwrite2katex.git
cd handwrite2katex
cp .env.example .env

# .env 파일에서 GEMINI_API_KEY 또는 MATHPIX_APP_ID/KEY 입력
# API 키가 없으면 MockRecognizer(개발용)가 자동으로 사용됩니다
```

### 2. 실행
```bash
docker compose up --build
```

| 서비스 | URL |
|--------|-----|
| 웹 클라이언트 | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API 문서 (Swagger) | http://localhost:8000/docs |

### 3. 로컬 개발 (Docker 없이)

> **DB 없이 바로 실행 가능** — SQLite(aiosqlite) + MockRecognizer로 동작합니다.

**Backend**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend** (별도 터미널)
```bash
cd frontend
npm install
npm run dev
```

**접속 URL**

| 서비스 | URL |
|--------|-----|
| 웹 클라이언트 | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API 문서 (Swagger) | http://localhost:8000/docs |

### 4. 테스트

```bash
# Backend 단위·통합·보안 테스트 (SQLite 자동 사용)
cd backend && pytest tests/ -v
f(x)=2x
# Frontend 단위 테스트 (Vitest + jsdom)
cd frontend && npm test

# E2E 테스트 (서버 실행 중 상태에서)
cd e2e && npx playwright test

# k6 성능 테스트 (k6 설치 필요)
k6 run tests/k6/smoke.js
k6 run tests/k6/load.js
```

---

## 프로젝트 일정

| 마일스톤 | 기간 | 목표 |
|---------|------|------|
| M0: Kickoff | 2026-06 | 요구사항·문서 완성, 환경 구축 |
| M1: Foundation | 2026-07 | Backend/Frontend 기반 구조, 인증 API |
| M2: PoC | 2026-08~09 | Canvas → LaTeX 변환 동작 데모 |
| M3: Beta | 2026-10~11 | 전체 기능 + Android/iOS |
| M4: RC | 2026-12 | 안정화, 성능·보안 최적화 |
| **M5: v1.0 GA** | **2027-01** | **공개 출시** |

---

## 라이선스

[LICENSE](LICENSE) 파일을 참고하세요.

