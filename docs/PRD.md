# PRD (Product Requirements Document)
## Handwrite2KaTeX — 손글씨 수식 실시간 변환 플랫폼

| 항목 | 내용 |
|------|------|
| 문서 버전 | v1.2 |
| 작성일 | 2026-06-02 |
| 최종 수정일 | 2026-06-04 |
| 상태 | Draft |
| 관련 문서 | [MRD.md](MRD.md) · [SRS.md](SRS.md) |

---

## 1. 제품 비전

> 수식 손글씨 입력 → LaTeX 변환 → KaTeX 렌더링까지의 과정을 **단 하나의 화면** 안에서 실시간으로 경험할 수 있는 크로스플랫폼 수학 입력 도구

---

## 2. 주요 화면 구성 (UI Layout)

```
┌──────────────────────────────────────────────────────────┐
│                  HEADER (로고·사용자 정보·설정)            │
├──────────────────────────────────────────────────────────┤
│                                                          │
│           CANVAS AREA (손글씨 입력 영역)                  │
│           Mouse / Stylus Pen 입력 지원                   │
│           도구 모음: 펜·지우개·초기화·전송 버튼            │
│                                                          │
├─────────────────────────┬────────────────────────────────┤
│  LaTeX OUTPUT           │  KaTeX RENDERED                │
│  (변환된 LaTeX 코드)     │  (수학 수식 렌더링 결과)         │
│                         │                                │
│  \frac{d}{dx}(x^2)=2x  │       d                       │
│                         │      ─── (x²) = 2x            │
│  [복사] [편집] [저장]    │      dx                       │
│                         │                                │
└─────────────────────────┴────────────────────────────────┘
│  HISTORY PANEL (이전 수식 이력 — 접기/펼치기 가능)         │
└──────────────────────────────────────────────────────────┘
```

---

## 3. 기능 요구사항 (Functional Requirements)

### 3.1 Canvas 입력 모듈

| ID | 기능 | 우선순위 |
|----|------|----------|
| FR-C01 | 마우스·스타일러스 펜으로 자유 곡선 그리기 | P0 |
| FR-C02 | 펜 굵기·색상 선택 | P1 |
| FR-C03 | 부분 지우기(Eraser) 및 전체 초기화(Clear) | P0 |
| FR-C04 | 실행 취소(Undo) / 다시 실행(Redo) | P1 |
| FR-C05 | 캔버스 이미지 PNG 형식으로 Backend 전송 | P0 |
| FR-C06 | 입력 완료 감지 후 자동 전송(Debounce 방식, 1.5초) | P1 |
| FR-C07 | 수동 전송 버튼(즉시 변환 요청) | P0 |
| FR-C08 | 터치 및 멀티터치 제스처 지원 (모바일) | P0 |

### 3.2 LaTeX 출력 모듈

| ID | 기능 | 우선순위 |
|----|------|----------|
| FR-L01 | Backend 응답 LaTeX 코드 텍스트 출력 | P0 |
| FR-L02 | LaTeX 코드 클립보드 복사 버튼 | P1 |
| FR-L03 | LaTeX 코드 직접 편집 (인라인 텍스트에디터) | P1 |
| FR-L04 | 편집 변경 시 KaTeX 패널 즉시 재렌더링 | P1 |
| FR-L05 | 변환 중 로딩 인디케이터 표시 | P0 |
| FR-L06 | 변환 실패 시 에러 메시지 및 재시도 버튼 | P0 |

### 3.3 KaTeX 렌더링 모듈

| ID | 기능 | 우선순위 |
|----|------|----------|
| FR-K01 | LaTeX → KaTeX 렌더링 (클라이언트 사이드) | P0 |
| FR-K02 | 렌더링 결과 이미지(PNG/SVG) 다운로드 | P1 |
| FR-K03 | 폰트 크기 조절 | P2 |
| FR-K04 | 다크/라이트 모드 지원 | P1 |

### 3.4 Backend 변환 API

| ID | 기능 | 우선순위 |
|----|------|----------|
| FR-B01 | Canvas 이미지(PNG) 수신 및 전처리 | P0 |
| FR-B02 | LLM/Vision 모델 호출 → LaTeX 변환 | P0 |
| FR-B03 | 변환 결과 및 신뢰도 점수 클라이언트 반환 | P0 |
| FR-B04 | 변환 요청·결과 DB 저장 (사용자 이력) | P0 |
| FR-B05 | WebSocket 기반 실시간 스트리밍 응답 | P1 |
| FR-B06 | REST API 형태의 외부 연동 엔드포인트 | P1 |

### 3.5 사용자 인증 및 이력 관리

| ID | 기능 | 우선순위 |
|----|------|----------|
| FR-U01 | 이메일/소셜(Google, Apple) 로그인 | P0 |
| FR-U02 | 수식 변환 이력 목록 조회 (타임스탬프·썸네일) | P0 |
| FR-U03 | 이력 항목 클릭 시 LaTeX/KaTeX 패널 복원 | P1 |
| FR-U04 | 이력 항목 삭제 | P1 |
| FR-U05 | 수식 즐겨찾기(북마크) 등록 | P2 |
| FR-U06 | 이력 CSV/LaTeX 일괄 내보내기 | P2 |
| FR-U07 | 관리자용 사용자 분석 대시보드 | P2 |

---

## 4. 비기능 요구사항 (Non-Functional Requirements)

| 카테고리 | 요구사항 | 목표값 |
|----------|----------|--------|
| **성능** | 변환 API 응답 시간 (P95) | ≤ 2,000ms |
| **성능** | KaTeX 클라이언트 렌더링 | ≤ 200ms |
| **가용성** | 서비스 업타임 | ≥ 99.5% |
| **확장성** | 동시 요청 처리 | ≥ 500 RPS |
| **보안** | 이미지 전송 암호화 | HTTPS/TLS 1.3 |
| **보안** | 사용자 인증 | JWT (Access + Refresh Token) |
| **보안** | OWASP Top 10 준수 | 필수 |
| **접근성** | WCAG 2.1 AA 준수 | 필수 |
| **호환성** | 브라우저 지원 | Chrome 110+, Safari 16+, Firefox 115+ |
| **호환성** | 모바일 OS | Android 10+, iOS 15+ |
| **국제화** | 다국어 지원 (초기 버전) | 한국어, 영어 |

---

## 5. 시스템 아키텍처 개요

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Web App    │  │ Android App │  │      iOS App            │  │
│  │ (React/TS)  │  │             │  │                         │  │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘  │
│         │  Expo / React Native (공유 코드베이스)  │               │
│         └──────────────────┬─────────────────────┘              │
└────────────────────────────┼─────────────────────────────────────┘
                             │  HTTPS / WebSocket
┌────────────────────────────▼─────────────────────────────────────┐
│                       API GATEWAY                                │
│              (Nginx / AWS API Gateway)                           │
└────────┬────────────────────────────────────────┬────────────────┘
         │                                        │
┌────────▼──────────┐                  ┌──────────▼──────────┐
│  Auth Service     │                  │  Formula Service     │
│  (FastAPI + JWT)  │                  │  (FastAPI + Async)   │
│  - 로그인/회원가입 │                  │  - 이미지 수신        │
│  - 토큰 발급      │                  │  - LLM 모델 호출      │
└────────┬──────────┘                  │  - LaTeX 반환         │
         │                            └──────────┬──────────────┘
┌────────▼──────────────────────────────────────▼──────────────────┐
│                        DATA LAYER                                 │
│  ┌─────────────────┐   ┌──────────────────┐   ┌───────────────┐  │
│  │   PostgreSQL     │   │   Redis (Cache)  │   │  Object Store │  │
│  │  - users         │   │  - 세션 토큰      │   │  (S3/MinIO)   │  │
│  │  - formulas      │   │  - API 응답 캐시  │   │  - 캔버스 이미지│  │
│  │  - history       │   └──────────────────┘   └───────────────┘  │
│  └─────────────────┘                                              │
└───────────────────────────────────────────────────────────────────┘
         │
┌────────▼──────────┐
│   LLM Service     │
│  (외부 API or     │
│   자체 모델 서버)  │
│  - Vision Model   │
└───────────────────┘
```

---

## 6. 기술 스택

| 영역 | 기술 | 선정 이유 |
|------|------|-----------|
| **Frontend (Web, 현재)** | React 18 + Vite + TypeScript | 빠른 HMR, 경량 번들, 현재 구현 |
| **Frontend (모바일, 예정)** | React Native + Expo | Web 코드 최대 재사용, Android/iOS 대응 |
| **수식 렌더링** | KaTeX | 빠른 클라이언트 렌더링, MIT 라이선스 |
| **상태 관리** | Zustand | 경량, React 호환, persist 미들웨어 |
| **Backend** | FastAPI (Python 3.12) | 비동기 처리, LLM 라이브러리 생태계 |
| **ORM** | SQLAlchemy 2.0 + Alembic | 비동기 지원, 마이그레이션 관리 |
| **DB** | PostgreSQL 16 | JSONB 지원, 확장성 |
| **캐시** | Redis 7 | 세션·API 응답 캐싱 |
| **파일 저장** | AWS S3 / MinIO | 캔버스 이미지 영구 보관 |
| **인증** | JWT (python-jose) | Stateless, 모바일 친화적 |
| **컨테이너** | Docker + Docker Compose | 로컬 개발 환경 통일 |
| **CI/CD** | GitHub Actions | 자동 테스트·배포 |
| **모니터링** | Prometheus + Grafana | 메트릭 수집·시각화 |
| **AI — 로컬 모델** | pix2tex (LaTeX-OCR) | CROHME Transformer, 오프라인 추론, API 비용 없음 |
| **AI — Vision API 1** | Groq llama-4-scout-17b | 무료 Vision API, OpenAI 호환 |
| **AI — Vision API 2** | Google Gemini 2.0 Flash Lite | 무료 티어 1,500 req/day |
| **AI — 수식 특화 OCR** | Mathpix OCR API | 수식 특화 최고 정확도, 무료 100 req/월 |

---

## 7. 데이터 모델 (핵심 엔티티)

```sql
-- 사용자
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) UNIQUE NOT NULL,
    provider    VARCHAR(50),          -- 'email' | 'google' | 'apple'
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 수식 변환 이력
CREATE TABLE formula_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    image_url       TEXT,             -- S3 오브젝트 경로
    latex_result    TEXT NOT NULL,    -- 변환된 LaTeX 코드
    confidence      FLOAT,            -- 모델 신뢰도 (0.0~1.0)
    model_used      VARCHAR(100),     -- 사용된 LLM/Vision 모델명
    is_bookmarked   BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_formula_history_user_id ON formula_history(user_id);
CREATE INDEX idx_formula_history_created_at ON formula_history(created_at DESC);
```

---

## 8. API 엔드포인트 정의 (주요)

| Method | Path | 설명 |
|--------|------|------|
| `POST` | `/api/v1/auth/register` | 회원가입 |
| `POST` | `/api/v1/auth/login` | 로그인 (JWT 발급) |
| `POST` | `/api/v1/auth/refresh` | 토큰 갱신 |
| `POST` | `/api/v1/formula/convert` | Canvas 이미지 → LaTeX 변환 |
| `GET`  | `/api/v1/formula/history` | 수식 변환 이력 목록 |
| `GET`  | `/api/v1/formula/history/{id}` | 특정 이력 상세 조회 |
| `DELETE` | `/api/v1/formula/history/{id}` | 이력 삭제 |
| `PATCH` | `/api/v1/formula/history/{id}/bookmark` | 즐겨찾기 토글 |
| `WS`   | `/ws/formula/stream` | 실시간 변환 스트리밍 |

---

## 9. 보안 요구사항

| 항목 | 구현 방법 |
|------|-----------|
| 전송 암호화 | TLS 1.3 (HTTPS 필수) |
| 인증 | JWT Access Token (15분) + Refresh Token (30일) |
| 이미지 접근 제어 | S3 Pre-signed URL (유효기간 제한) |
| 입력 검증 | 파일 타입·크기 제한 (PNG/JPEG, ≤ 5MB) |
| API Rate Limiting | Nginx: IP당 60 req/min |
| CORS | 허용 도메인 화이트리스트 관리 |
| SQL Injection 방지 | SQLAlchemy ORM Parameterized Query |
| XSS 방지 | KaTeX 렌더링 시 sanitize 적용 |

---

## 10. 릴리즈 계획

| 버전 | 범위 | 예상 시기 |
|------|------|-----------|
| **v0.1 (PoC)** | Canvas + Backend API + LaTeX 변환 (Web Only) | M2 |
| **v0.5 (Beta)** | KaTeX 렌더링 + 이력 저장 + 인증 | M4 |
| **v1.0 (GA)** | Android/iOS 앱 + 전체 기능 | M7 |
| **v1.1** | 이력 분석 대시보드 + API 파트너 연동 | M9 |

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 변경자 |
|------|------|----------|--------|
| v1.2 | 2026-06-04 | 6. 기술 스택 Frontend 현재 구현 반영 (React Native → React+Vite, 모바일은 예정으로 변경) | AI |
| v1.1 | 2026-06-02 | 6. 기술 스택에 AI 모델 4종 추가 (pix2tex/Groq/Gemini/Mathpix) | AI |
| v1.0 | 2026-06-02 | 최초 작성 | AI |

---

*다음 문서: [SRS.md](SRS.md)*
