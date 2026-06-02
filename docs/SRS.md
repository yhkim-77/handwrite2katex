# SRS (Software Requirements Specification)
## Handwrite2KaTeX — 손글씨 수식 실시간 변환 플랫폼

| 항목 | 내용 |
|------|------|
| 문서 버전 | v1.3 |
| 작성일 | 2026-06-02 |
| 최종 수정일 | 2026-06-02 |
| 상태 | Approved |
| 표준 참조 | IEEE 830-1998, ISO/IEC 25010:2011 |
| 관련 문서 | [MRD.md](MRD.md) · [PRD.md](PRD.md) |

---

## 1. 소개

### 1.1 목적

본 문서는 **Handwrite2KaTeX** 시스템의 소프트웨어 요구사항을 IEEE 830 표준에 준거하여 기술한다. 개발팀, QA팀, 설계팀이 공통적으로 참조하는 기준 문서로 활용된다.

### 1.2 범위

- **프론트엔드**: Web (PWA), Android, iOS 앱 (React Native / Expo)
- **백엔드**: REST API 서버, WebSocket 서버, 인증 서비스 (FastAPI)
- **데이터 계층**: PostgreSQL, Redis, Object Storage (S3)
- **AI 변환 계층**: LLM/Vision 모델 연동 모듈

### 1.3 정의 및 약어

| 용어 | 정의 |
|------|------|
| Canvas | 사용자가 마우스·스타일러스로 수식을 입력하는 드로잉 영역 |
| LaTeX | 수식 조판 마크업 언어 |
| KaTeX | 브라우저에서 LaTeX를 렌더링하는 JavaScript 라이브러리 |
| LLM | Large Language Model (대형 언어 모델) |
| Vision Model | 이미지 이해 능력을 갖춘 멀티모달 AI 모델 |
| OCR | Optical Character Recognition (광학 문자 인식) |
| JWT | JSON Web Token |
| PWA | Progressive Web App |
| RPS | Requests Per Second |

---

## 2. 전체 시스템 설명

### 2.1 시스템 컨텍스트 다이어그램

```
                    ┌──────────────────────────────┐
                    │       외부 사용자              │
                    │  (학생, 교사, 연구자)           │
                    └──────────┬───────────────────┘
                               │ Web / Android / iOS
                    ┌──────────▼───────────────────┐
                    │     Handwrite2KaTeX           │
                    │     (Client App)              │
                    └──────────┬───────────────────┘
                               │ HTTPS / WebSocket
                    ┌──────────▼───────────────────┐
                    │     Backend API Server        │
                    └──┬─────────────────────┬──────┘
                       │                     │
            ┌──────────▼──────┐   ┌──────────▼──────────┐
            │  PostgreSQL DB  │   │  LLM Vision Service │
            │  Redis Cache    │   │  (외부 API /자체서버) │
            │  Object Storage │   └─────────────────────┘
            └─────────────────┘
```

### 2.2 제품 기능 요약

1. **손글씨 수식 입력**: Canvas 기반 자유 드로잉
2. **자동 LaTeX 변환**: 백엔드 LLM/Vision 모델 분석
3. **KaTeX 실시간 렌더링**: 클라이언트 사이드 수식 시각화
4. **이력 관리**: DB 저장·조회·즐겨찾기·내보내기
5. **크로스플랫폼**: Web / Android / iOS 동일 기능 제공

### 2.3 사용자 클래스 및 특성

| 사용자 클래스 | 기술 숙련도 | 사용 빈도 | 주요 관심사 |
|--------------|-----------|----------|------------|
| 학생 | 낮음~중간 | 높음 | 손쉬운 수식 입력, 빠른 변환 |
| 교사/강사 | 중간 | 중간 | 강의 자료 제작, 이력 관리 |
| 연구자 | 높음 | 낮음~중간 | LaTeX 정확도, API 연동 |
| 관리자 | 높음 | 낮음 | 사용자 분석, 시스템 모니터링 |

---

## 3. 기능 요구사항 명세

### 3.1 Canvas 입력 서브시스템

#### SRS-C01: 드로잉 입력
- **설명**: 사용자는 마우스, 터치, 스타일러스 펜으로 Canvas 위에 수식을 자유롭게 그릴 수 있어야 한다.
- **전제 조건**: 사용자가 캔버스 영역 내에 포인터를 위치시킨다.
- **기본 흐름**:
  1. 사용자가 pointer down 이벤트 발생
  2. 이동 경로를 실시간으로 선으로 렌더링
  3. pointer up 이벤트 시 획(stroke) 완성
  4. 완성된 획을 캔버스 상태에 누적
- **예외**: 캔버스 영역 밖으로 나가면 획 종료
- **검증 기준**: 50ms 이하의 드로잉 지연 (60fps 목표)

#### SRS-C02: 이미지 전송
- **설명**: 사용자의 입력이 완료되면 캔버스를 PNG 이미지로 직렬화하여 Backend로 전송한다.
- **자동 전송**: 마지막 획 완료 후 1,500ms Debounce 후 자동 전송
- **수동 전송**: 사용자가 "변환" 버튼 클릭 시 즉시 전송
- **이미지 크기**: 최대 5MB, PNG 형식 강제
- **검증 기준**: 이미지 전송 성공률 ≥ 99.9%

#### SRS-C03: Undo/Redo
- **설명**: 사용자는 획 단위로 실행 취소(Undo) 및 다시 실행(Redo)을 수행할 수 있다.
- **스택 깊이**: 무제한 (PoC) — v1.1에서 최대 50단계 제한 예정
- **단축키**: Ctrl+Z (Undo), Ctrl+Y / Ctrl+Shift+Z (Redo)

### 3.2 LaTeX 변환 서브시스템

#### SRS-L01: 이미지 수신 및 전처리
- **설명**: Backend는 클라이언트로부터 수신한 PNG 이미지를 전처리한 후 LLM Vision 모델에 전달한다.
- **전처리 단계**:
  1. 이미지 해상도 표준화 (최소 256×256, 최대 2048×2048)
  2. 배경 제거 및 이진화(Binarization)
  3. 노이즈 제거 (가우시안 블러)
  4. 여백 자동 크롭
- **검증 기준**: 전처리 처리 시간 ≤ 200ms

#### SRS-L02: LLM Vision 모델 호출 (Adapter 패턴)
- **설명**: 전처리된 이미지를 Adapter 패턴으로 선택된 인식기에 전달하여 LaTeX 코드를 수신한다.
- **인식기 우선순위**: `LocalRecognizer → GroqRecognizer → GeminiRecognizer → MathpixRecognizer → MockRecognizer`
- **선택 기준**: `.env` 설정값에 따라 `get_recognizer()`가 런타임에 자동 선택
- **요청 형식**: Base64 인코딩 이미지 + 시스템 프롬프트 (Mathpix 제외 — 별도 API 스키마)
- **시스템 프롬프트**:
  ```
  You are a specialized mathematical formula OCR engine.
  Output ONLY the raw LaTeX code without explanation or delimiters.
  If unreadable, output: ERROR:UNREADABLE
  ```
- **응답 파싱**: LaTeX 코드만 추출, `$`, `$$`, `\[...\]` 래퍼 자동 제거
- **검증 기준**: 변환 정확도 ≥ 92% (수식 단위 Semantic Match)

#### SRS-L04: 인식기 설정 및 전환 정책
- **설명**: 시스템 관리자는 `.env` 설정만으로 인식기를 무중단 교체할 수 있어야 한다.
- **설정 항목**:

  | 환경변수 | 대상 인식기 | 기본값 |
  |----------|------------|--------|
  | `USE_LOCAL_MODEL=true` | LocalRecognizer (pix2tex) | false |
  | `GROQ_API_KEY=gsk_...` | GroqRecognizer | 미설정 |
  | `GEMINI_API_KEY=...` | GeminiRecognizer | 미설정 |
  | `MATHPIX_APP_ID` + `MATHPIX_APP_KEY` | MathpixRecognizer | 미설정 |

- **제약**: 컨테이너 재시작(`docker-compose up -d --force-recreate backend`) 필요

#### SRS-L03: 변환 결과 반환
- **설명**: 변환된 LaTeX 코드와 신뢰도 점수를 클라이언트에 반환한다.
- **응답 스키마**:
  ```json
  {
    "id": "uuid",
    "latex": "\\frac{d}{dx}(x^2)=2x",
    "confidence": 0.97,
    "model": "gpt-4o",
    "processing_time_ms": 1240,
    "image_url": "https://storage.example.com/formulas/uuid.png"
  }
  ```

### 3.3 KaTeX 렌더링 서브시스템

#### SRS-K01: LaTeX → KaTeX 렌더링
- **설명**: 수신된 LaTeX 코드를 KaTeX 라이브러리로 클라이언트 측에서 렌더링한다.
- **렌더링 모드**: displayMode (블록 수식 기본)
- **오류 처리**: 잘못된 LaTeX 문법 시 에러 메시지와 원문 코드 표시
- **검증 기준**: 렌더링 완료 ≤ 200ms

#### SRS-K02: 실시간 LaTeX 편집 반영
- **설명**: 사용자가 LaTeX 패널에서 코드를 직접 편집하면 KaTeX 패널이 즉시 업데이트된다.
- **업데이트 방식**: React `useEffect([latex])` 직접 반응 (PoC) — v1.1에서 300ms Debounce 적용 예정

### 3.4 인증 서브시스템

#### SRS-A01: 회원가입 / 로그인
- **지원 방식**:
  - 이메일 + 비밀번호 (bcrypt 해싱)
  - Google OAuth 2.0
  - Apple Sign-In
- **비밀번호 정책**: 최소 8자, 영문+숫자+특수문자 조합
- **이메일 인증**: 가입 후 인증 메일 발송 (PoC에서는 생략하며 `is_verified=True` 자동 설정, v1.1에서 업데이트 예정)

#### SRS-A02: JWT 토큰 관리
- **Access Token**: HS256 서명, 유효기간 15분
- **Refresh Token**: 유효기간 30일 (PoC: 메모리 내 저장, v1.1에서 Redis 저장 예정)
- **자동 갱신**: Access Token 만료 시 자동으로 Refresh Token으로 갱신
- **로그아웃**: `POST /api/v1/auth/logout` — PoC에서는 Stateless (Redis 무효화 미구현)

### 3.5 이력 관리 서브시스템

#### SRS-H01: 이력 저장
- **설명**: 모든 변환 요청·결과는 `formula_history` 테이블에 자동 저장된다.
- **저장 항목**: 사용자ID, 이미지URL, LaTeX코드, 신뢰도, 사용모델, 타임스탬프

#### SRS-H02: 이력 조회
- **설명**: 사용자는 자신의 변환 이력을 시간 역순으로 조회할 수 있다.
- **페이지네이션**: Offset 기반 (`page`, `page_size`), 기본 20개/페이지, `has_next` / `total` 반환
- **검색**: LaTeX 코드 전문 검색 (PostgreSQL Full-text Search)

#### SRS-H03: 이력 복원
- **설명**: 이력 항목 선택 시 해당 이미지·LaTeX·KaTeX를 현재 화면에 복원한다.

---

## 4. 외부 인터페이스 요구사항

### 4.1 사용자 인터페이스

| 요구사항 ID | 설명 |
|-------------|------|
| UI-01 | Canvas 영역은 전체 화면의 최소 40% 높이를 차지해야 한다 |
| UI-02 | LaTeX·KaTeX 패널은 Canvas 하단 좌우 50%씩 균등 배치 |
| UI-03 | 변환 중 로딩 인디케이터가 Canvas 위에 오버레이 표시 |
| UI-04 | 모바일(세로 모드)에서 Canvas → LaTeX → KaTeX 순으로 세로 배치 |
| UI-05 | 다크 모드 / 라이트 모드 자동 감지 및 수동 전환 |
| UI-06 | 최소 지원 화면 해상도: 360×640 (모바일) |

### 4.2 하드웨어 인터페이스

| 요구사항 ID | 설명 |
|-------------|------|
| HW-01 | Bluetooth 스타일러스(Apple Pencil, S Pen) 입력 지원 |
| HW-02 | 멀티터치 (10포인트) 지원 |

### 4.3 소프트웨어 인터페이스

| 시스템 | 연동 방식 | 목적 | 설정 키 |
|--------|-----------|------|---------|
| pix2tex (로컬 모델) | Python 라이브러리 직접 호출 | 오프라인 수식 OCR (CROHME Transformer) | `USE_LOCAL_MODEL` |
| Groq API | REST HTTPS (OpenAI 호환) | llama-4-scout Vision 수식 변환 | `GROQ_API_KEY`, `GROQ_MODEL` |
| Google Gemini API | REST HTTPS | Gemini 2.0 수식 변환 | `GEMINI_API_KEY`, `GEMINI_MODEL` |
| **Mathpix OCR API** | **REST HTTPS** | **수식 특화 OCR, LaTeX/MathML 반환** | **`MATHPIX_APP_ID`, `MATHPIX_APP_KEY`** |
| Google OAuth 2.0 | OAuth 2.0 Authorization Code | 소셜 로그인 | — |
| Apple Sign-In | OAuth 2.0 / OIDC | 소셜 로그인 | — |
| AWS S3 / MinIO | AWS SDK / S3 호환 API | 이미지 저장 | `AWS_*`, `MINIO_*` |
| Firebase FCM | HTTP v1 API | 푸시 알림 (향후) | — |

**Mathpix API 상세**:
- 엔드포인트: `https://api.mathpix.com/v3/text`
- 인증: `app_id` / `app_key` HTTP 헤더
- 요청: `{ "src": "data:image/png;base64,...", "formats": ["latex_simplified"] }`
- 응답: `{ "latex_simplified": "\\frac{d}{dx}(x^2)=2x", "confidence": 0.97 }`
- 무료 한도: 100 req/월 → 초과 시 $0.004/req

### 4.4 통신 인터페이스

| 프로토콜 | 용도 |
|----------|------|
| HTTPS (TLS 1.3) | 모든 REST API 통신 |
| WebSocket (WSS) | 실시간 변환 스트리밍 |
| HTTP/2 | 성능 최적화 |

---

## 5. 품질 속성 (Quality Attributes)

### 5.1 성능 (Performance)

| 메트릭 | 목표값 |
|--------|--------|
| 변환 API P50 응답 | ≤ 1,000ms |
| 변환 API P95 응답 | ≤ 2,000ms |
| 변환 API P99 응답 | ≤ 5,000ms |
| KaTeX 렌더링 | ≤ 200ms |
| Canvas 드로잉 FPS | ≥ 60fps |
| 이력 목록 조회 | ≤ 500ms |

### 5.2 신뢰성 (Reliability)

| 메트릭 | 목표값 |
|--------|--------|
| 서비스 가용성 | ≥ 99.5% (월 기준) |
| MTBF (평균 장애 간격) | ≥ 720시간 |
| MTTR (평균 복구 시간) | ≤ 30분 |
| 데이터 백업 | 24시간 주기 자동 백업 |

### 5.3 보안 (Security)

| 항목 | 요구사항 |
|------|----------|
| 전송 암호화 | 모든 통신 TLS 1.3 강제 |
| 저장 암호화 | DB 민감 정보 AES-256 암호화 |
| 인증 | JWT + Refresh Token Rotation |
| 권한 부여 | RBAC (사용자 / 관리자) |
| OWASP 준수 | Top 10 보안 취약점 점검 필수 |
| 개인정보 | GDPR / 개인정보보호법 준수 |

### 5.4 확장성 (Scalability)

- 수평 확장: API 서버 Auto Scaling (AWS ECS / Kubernetes)
- DB 연결 풀: PgBouncer 사용
- CDN: 정적 자산 CloudFront 배포
- 로드 밸런싱: Round-Robin + 헬스체크

### 5.5 유지보수성 (Maintainability)

- 코드 커버리지: ≥ 80%
- API 버전 관리: URL 버전 (`/api/v1/`)
- 모델 교체 용이성: LLM 공급자 추상화 인터페이스 (Adapter 패턴)

---

## 6. 시스템 제약사항

| 제약사항 | 내용 |
|----------|------|
| 언어 | Backend: Python 3.12+, Frontend: TypeScript 5.0+ |
| 런타임 | Node.js 20 LTS, Python 3.12 |
| 컨테이너 | Docker 24+, Docker Compose v2 |
| DB | PostgreSQL 16+ |
| 라이선스 | 오픈소스 컴포넌트는 MIT / Apache 2.0 라이선스만 사용 |
| 이미지 저장 용량 | 사용자당 최대 1GB (Pro: 무제한) |

---

## 7. 오류 처리 및 예외 케이스

| 상황 | 처리 방법 |
|------|-----------|
| LLM API 타임아웃 (> 10초) | 에러 메시지 표시 + 재시도 옵션 제공 |
| 이미지 업로드 실패 | 로컬 재시도 3회, 실패 시 에러 알림 |
| 잘못된 LaTeX 출력 | 사용자에게 원문 코드 표시 + 직접 편집 유도 |
| 네트워크 단절 | 오프라인 감지 배너 표시, 재연결 시 자동 재전송 |
| 인증 토큰 만료 | Silent Refresh 시도, 실패 시 로그인 페이지 리다이렉트 |
| DB 연결 실패 | Health check 실패 → 503 반환, Alert 발송 |

---

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 변경자 |
|------|------|----------|--------|
| v1.3 | 2026-06-02 | SRS-L02 Adapter 패턴 인식기 우선순위 체계 반영; SRS-L04 신규 추가 (인식기 전환 정책); 4.3 소프트웨어 인터페이스에 pix2tex/Groq/Gemini/Mathpix 상세 추가 | AI |
| v1.2 | 2026-06-02 | SRS-A02(HS256, Redis 미구현 PoC 명시), SRS-A01(이메일 인증 PoC 명시), SRS-H02(Offset 기반), SRS-K02(Debounce PoC 명시), SRS-C03(무제한 스택 PoC 명시) | AI |
| v1.0 | 2026-06-02 | 최초 작성 | AI |

---

*다음 문서: [TC.md](TC.md)*
