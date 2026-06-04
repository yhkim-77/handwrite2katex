# TC (Test Cases)
## Handwrite2KaTeX — 손글씨 수식 실시간 변환 플랫폼

| 항목 | 내용 |
|------|------|
| 문서 버전 | v1.4 |
| 작성일 | 2026-06-02 |
| 최종 수정일 | 2026-06-02 |
| 상태 | Approved |
| 참조 문서 | [SRS.md](SRS.md) · [PRD.md](PRD.md) |

---

## 1. 테스트 전략

### 1.1 테스트 레벨 구성

```
┌─────────────────────────────────────────────────────────┐
│              E2E Tests (Playwright / Detox)             │  ← 10%
├─────────────────────────────────────────────────────────┤
│          Integration Tests (pytest / Jest)              │  ← 20%
├─────────────────────────────────────────────────────────┤
│             Unit Tests (pytest / Jest / Vitest)         │  ← 70%
└─────────────────────────────────────────────────────────┘
```

### 1.2 테스트 도구

| 레벨 | 도구 | 대상 |
|------|------|------|
| Unit | pytest 8.x | Backend Python 코드 |
| Unit | Vitest + React Testing Library | Frontend 컴포넌트 |
| Integration | pytest + httpx | Backend API 통합 |
| E2E Web | Playwright | 웹 브라우저 전체 흐름 |
| E2E Mobile | Detox | React Native Android/iOS |
| 성능 | k6 | API 부하 테스트 |
| 보안 | OWASP ZAP | 취약점 스캔 |

### 1.3 테스트 환경

| 환경 | 설명 |
|------|------|
| Local | 개발자 로컬 (Docker Compose) |
| CI | GitHub Actions (각 PR마다 자동 실행) |
| Staging | 프로덕션 미러 환경 (실제 LLM API 모킹) |
| Production | 카나리 배포 후 스모크 테스트 |

---

## 2. 단위 테스트 (Unit Tests)

### 2.1 Canvas 컴포넌트

| TC-ID | 테스트 케이스 | 전제 조건 | 입력 | 예상 결과 | 우선순위 |
|-------|-------------|---------|------|----------|---------|
| TC-U-C01 | 드로잉 시 획 추가 | Canvas 마운트됨 | PointerDown → Move → Up 이벤트 | 획 배열에 1개 추가 | P0 |
| TC-U-C02 | Clear 버튼 클릭 | 획 3개 존재 | Clear 클릭 | 획 배열 빈 배열 | P0 |
| TC-U-C03 | Undo 1회 | 획 3개 존재 | Ctrl+Z | 획 2개, Redo 스택 1개 | P0 |
| TC-U-C04 | Undo 연속 50회 | 획 100개 존재 | Ctrl+Z × 50 | 획 50개 남음 (무제한 스택, PoC) | P1 |
| TC-U-C05 | Redo 동작 | Undo 후 획 2개 | Ctrl+Y | 획 3개 복원 | P0 |
| TC-U-C06 | 빈 캔버스 전송 차단 | 획 0개 | 변환 버튼 클릭 | 에러 메시지 표시, API 미호출 | P0 |
| TC-U-C07 | 자동 전송 Debounce | 획 1개 추가 | 1,500ms 대기 | API 호출 1회 | P1 |
| TC-U-C08 | 펜 굵기 변경 | 기본 굵기 3px | 굵기 5px 선택 후 드로잉 | 새 획의 lineWidth = 5 | P1 |

### 2.2 LaTeX 출력 컴포넌트

| TC-ID | 테스트 케이스 | 입력 | 예상 결과 | 우선순위 |
|-------|-------------|------|----------|---------|
| TC-U-L01 | LaTeX 코드 표시 | `\frac{1}{2}` | 텍스트 영역에 `\frac{1}{2}` 표시 | P0 |
| TC-U-L02 | 복사 버튼 동작 | 복사 버튼 클릭 | 클립보드에 LaTeX 코드 복사 | P1 |
| TC-U-L03 | 직접 편집 후 KaTeX 갱신 | LaTeX 텍스트 수정 | 즉시 KaTeX 패널 재렌더링 (Debounce 없음, PoC) | P1 |
| TC-U-L04 | 로딩 상태 표시 | API 호출 중 | 로딩 스피너 표시 | P0 |
| TC-U-L05 | 에러 상태 표시 | API 500 응답 | 에러 메시지 표시 (재시도 버튼은 v1.1 예정) | P0 |

### 2.3 KaTeX 렌더링 컴포넌트

| TC-ID | 테스트 케이스 | 입력 | 예상 결과 | 우선순위 |
|-------|-------------|------|----------|---------|
| TC-U-K01 | 기본 분수 렌더링 | `\frac{1}{2}` | KaTeX DOM 정상 생성 | P0 |
| TC-U-K02 | 적분 수식 렌더링 | `\int_0^\infty e^{-x} dx` | KaTeX DOM 정상 생성 | P0 |
| TC-U-K03 | 잘못된 LaTeX 처리 | `\frac{` (불완전) | 에러 메시지 표시, 앱 크래시 없음 | P0 |
| TC-U-K04 | 빈 문자열 처리 | `""` | 빈 패널 표시, 에러 없음 | P0 |
| TC-U-K05 | displayMode 적용 | 임의 수식 | 블록 레벨 수식으로 렌더링 | P1 |

### 2.4 Backend 이미지 전처리

| TC-ID | 테스트 케이스 | 입력 | 예상 결과 | 우선순위 |
|-------|-------------|------|----------|---------|
| TC-U-B01 | 정상 PNG 처리 | 100×100 PNG | 전처리 완료, 결과 이미지 반환 | P0 |
| TC-U-B02 | 최소 크기 미달 | 50×50 PNG | 업스케일 처리 후 진행 | P1 |
| TC-U-B03 | 최대 크기 초과 | 4096×4096 PNG | 다운스케일 후 진행 | P1 |
| TC-U-B04 | 미지원 파일 타입 | PDF·EXE 업로드 | 415 Unsupported Media Type 반환 (PNG/JPEG/WEBP는 허용) | P0 |
| TC-U-B05 | 파일 크기 초과 | 6MB PNG | 400 Bad Request 반환 (5MB 제한) | P0 |
| TC-U-B06 | 빈 캔버스 이미지 | 흰 배경만 있는 PNG | 빈 캔버스 감지 → 400 에러 | P1 |

### 2.5 인증 모듈

| TC-ID | 테스트 케이스 | 입력 | 예상 결과 | 우선순위 |
|-------|-------------|------|----------|---------|
| TC-U-A01 | 유효한 이메일 회원가입 | 정상 이메일 + 비밀번호 | 201 (PoC: 이메일 인증 생략, `is_verified=True` 자동 설정) | P0 |
| TC-U-A02 | 중복 이메일 회원가입 | 기존 이메일 | 409 Conflict | P0 |
| TC-U-A03 | 비밀번호 정책 미달 | 숫자만 8자 | 400 + 정책 안내 메시지 | P0 |
| TC-U-A04 | 정상 로그인 | 등록된 이메일 + 비밀번호 | 200, Access/Refresh Token 반환 | P0 |
| TC-U-A05 | 잘못된 비밀번호 | 등록된 이메일 + 틀린 비밀번호 | 401 Unauthorized | P0 |
| TC-U-A06 | Access Token 만료 | 만료된 토큰 사용 | 401 → 클라이언트 자동 갱신 | P0 |
| TC-U-A07 | Refresh Token 무효화 | 로그아웃 후 Refresh Token 재사용 | 401 Unauthorized | P0 |

### 2.6 AI 인식기 (Recognizer) — 선택 로직 & 응답 파싱

#### 2.6.1 인식기 선택 로직 (get_recognizer)

| TC-ID | 테스트 케이스 | 환경 설정 | 예상 결과 | 우선순위 |
|-------|-------------|----------|----------|---------|
| TC-U-R01 | 모든 키 미설정 → MockRecognizer | 전체 API 키 비어 있음 | `isinstance(get_recognizer(), MockRecognizer)` | P0 |
| TC-U-R02 | USE_LOCAL_MODEL=true → LocalRecognizer | `USE_LOCAL_MODEL=true` | `isinstance(get_recognizer(), LocalRecognizer)` | P0 |
| TC-U-R03 | GROQ_API_KEY 설정 → GroqRecognizer | `GROQ_API_KEY=fake-key` | `isinstance(get_recognizer(), GroqRecognizer)` | P0 |
| TC-U-R04 | Groq+Gemini 동시 설정 → Groq 우선 | 두 키 모두 설정 | `isinstance(get_recognizer(), GroqRecognizer)` | P0 |
| TC-U-R05 | Groq 없이 GEMINI 설정 → GeminiRecognizer | `GROQ_API_KEY=""`, `GEMINI_API_KEY=fake` | `isinstance(get_recognizer(), GeminiRecognizer)` | P0 |
| TC-U-R06 | Groq·Gemini 없이 Mathpix 설정 → MathpixRecognizer | `MATHPIX_APP_ID=app_id`, `MATHPIX_APP_KEY=app_key` | `isinstance(get_recognizer(), MathpixRecognizer)` | P0 |

#### 2.6.2 MathpixRecognizer 응답 파싱

| TC-ID | 테스트 케이스 | 입력 (mock 응답) | 예상 결과 | 우선순위 |
|-------|-------------|-----------------|----------|---------|
| TC-U-R07 | 정상 응답 파싱 | `{"latex_simplified": "2^{x}", "confidence": 0.95}` | `result.latex == "2^{x}"`, `result.confidence == 0.95` | P0 |
| TC-U-R08 | latex_simplified 필드 없음 | `{}` | `result.latex == ""` | P1 |
| TC-U-R09 | 응답에 래퍼 포함 시 제거 | `{"latex_simplified": "$2^{x}$", "confidence": 0.9}` | `result.latex == "2^{x}"` ($래퍼 제거) | P1 |

#### 2.6.3 API 실제 연동 (Integration, 키 없으면 Skip)

| TC-ID | 테스트 케이스 | 조건 | 예상 결과 | 우선순위 |
|-------|-------------|------|----------|---------|
| TC-U-R10 | Mathpix API 키 유효성 확인 | `MATHPIX_APP_ID` 환경변수 존재 | 200 응답 (401/403 아닌 것 확인) | P1 |
| TC-U-R11 | Groq API 키 유효성 확인 | `GROQ_API_KEY=gsk_...` | 200 또는 429 응답 | P0 |
| TC-U-R12 | Gemini API 키 유효성 확인 | `GEMINI_API_KEY` 환경변수 존재 | 200 또는 429 응답 | P0 |

---

## 3. 통합 테스트 (Integration Tests)

### 3.1 API 통합 테스트

| TC-ID | 테스트 케이스 | 시나리오 | 예상 결과 | 우선순위 |
|-------|-------------|---------|----------|---------|
| TC-I-01 | 수식 변환 전체 흐름 | 로그인 → 이미지 업로드 → LaTeX 수신 | 200, LaTeX 코드 포함 응답 | P0 |
| TC-I-02 | 변환 이력 자동 저장 | TC-I-01 수행 후 이력 조회 | formula_history에 레코드 생성 | P0 |
| TC-I-03 | 인증 없이 변환 요청 | Bearer 토큰 없이 POST /formula/convert | 403 반환 (HTTPBearer: credentials 미제공) | P0 |
| TC-I-04 | 이력 목록 페이지네이션 | 이력 25개 생성 후 조회 (page_size=20) | 첫 페이지 20개, `has_next=true`, `total=25` 반환 (Offset 기반) | P1 |
| TC-I-05 | 이력 삭제 | 특정 이력 ID DELETE | 204, 해당 레코드 DB 삭제 | P1 |
| TC-I-06 | 다른 사용자 이력 접근 | 타 사용자 이력 ID 조회 | 403 Forbidden | P0 |
| TC-I-07 | LLM API 타임아웃 처리 | LLM Mock 10초 지연 설정 | 502 Bad Gateway + 에러 응답 | P0 |
| TC-I-08 | Rate Limit 초과 | 1분 내 61회 요청 | 429 Too Many Requests | P1 |

### 3.2 데이터베이스 통합 테스트

| TC-ID | 테스트 케이스 | 시나리오 | 예상 결과 | 우선순위 |
|-------|-------------|---------|----------|---------|
| TC-I-DB01 | 사용자 삭제 시 이력 연쇄 삭제 | 사용자 DELETE | 해당 사용자의 formula_history 모두 삭제 | P0 |
| TC-I-DB02 | 전문 검색 | LaTeX 코드로 이력 검색 | 매칭되는 이력만 반환 | P1 |
| TC-I-DB03 | 동시 쓰기 트랜잭션 | 100개 동시 INSERT | 데이터 손실 없이 100개 저장 | P1 |

---

## 4. E2E 테스트 (End-to-End Tests)

### 4.1 Web E2E (Playwright)

| TC-ID | 시나리오 | 단계 | 예상 결과 | 우선순위 |
|-------|---------|------|----------|---------|
| TC-E-W01 | 신규 사용자 수식 변환 | 1. 회원가입 → 2. Canvas에 `x^2` 그리기 → 3. 변환 버튼 클릭 → 4. 결과 확인 | LaTeX 패널: `x^{2}`, KaTeX 패널: x² 렌더링 | P0 |
| TC-E-W02 | 이력 복원 흐름 | 1. 로그인 → 2. 이력 패널 열기 → 3. 과거 항목 선택 | 해당 LaTeX/KaTeX 복원 | P1 |
| TC-E-W03 | LaTeX 직접 편집 | 1. 변환 결과 수신 → 2. LaTeX 패널 수정 | KaTeX 패널 즉시 갱신 | P1 |
| TC-E-W04 | 다크 모드 전환 | 테마 전환 버튼 클릭 | 전체 UI 다크 모드 적용 | P2 |
| TC-E-W05 | 연속 변환 | 새 수식 입력 → 기존 이력 누적 | 이력 목록에 항목 증가 | P1 |
| TC-E-W06 | 네트워크 오류 복구 | 네트워크 차단 → 수식 입력 → 네트워크 복원 | 재연결 후 자동 재전송 | P1 |

### 4.2 Mobile E2E (Detox — React Native)

| TC-ID | 시나리오 | 단계 | 예상 결과 | 우선순위 |
|-------|---------|------|----------|---------|
| TC-E-M01 | 터치 드로잉 | 화면 터치로 Canvas 획 그리기 | 획 렌더링 정상 | P0 |
| TC-E-M02 | 스타일러스 입력 | Apple Pencil / S Pen으로 수식 입력 | 획 렌더링 및 변환 정상 | P0 |
| TC-E-M03 | 세로/가로 모드 전환 | 기기 회전 | Layout 자동 전환, 데이터 유지 | P1 |
| TC-E-M04 | 백그라운드 복귀 | 앱 백그라운드 → 포그라운드 | 마지막 상태 유지 | P1 |
| TC-E-M05 | 오프라인 감지 | Wi-Fi 비활성화 | 오프라인 배너 표시 | P1 |

---

## 5. 성능 테스트 (Performance Tests — k6)

### 5.1 부하 테스트 시나리오

| TC-ID | 테스트 유형 | 시나리오 | 목표 | 판정 기준 |
|-------|------------|---------|------|----------|
| TC-P-01 | 스모크 테스트 | VUser 1명, 5분 | 기본 동작 확인 | 에러율 0% |
| TC-P-02 | 부하 테스트 | VUser 100명, 10분 | 정상 부하 처리 | P95 ≤ 2s, 에러율 ≤ 1% |
| TC-P-03 | 스트레스 테스트 | VUser 500명, 10분 | 한계 용량 확인 | 에러율 ≤ 5% |
| TC-P-04 | 스파이크 테스트 | 0→500 VUser 급증 | 급격한 부하 대응 | 복구 시간 ≤ 60s |
| TC-P-05 | 내구 테스트 | VUser 50명, 8시간 | 메모리 누수 확인 | 메모리 증가율 ≤ 5% |

### 5.2 성능 테스트 측정 지표

| 지표 | 측정 방법 | 목표값 |
|------|----------|--------|
| Throughput | RPS | ≥ 200 RPS (변환 API) |
| Latency P50 | 응답 시간 | ≤ 1,000ms |
| Latency P95 | 응답 시간 | ≤ 2,000ms |
| Error Rate | 4xx+5xx 비율 | ≤ 1% |
| CPU 사용률 | 서버 메트릭 | ≤ 70% |
| Memory 사용률 | 서버 메트릭 | ≤ 80% |

---

## 6. 보안 테스트 (Security Tests)

| TC-ID | 테스트 항목 | 방법 | 예상 결과 |
|-------|------------|------|----------|
| TC-S-01 | SQL Injection | `'; DROP TABLE users; --` 주입 | 400 또는 422, DB 변경 없음 |
| TC-S-02 | XSS (KaTeX 입력) | `<script>alert(1)</script>` LaTeX 입력 | Sanitize 처리, 스크립트 미실행 |
| TC-S-03 | 인증 없이 API 접근 | 토큰 없이 보호된 엔드포인트 호출 | 403 반환 (HTTPBearer scheme 누락) |
| TC-S-04 | 타인 리소스 접근 | 다른 사용자 formula ID 조회 | 404 반환 (정보 노출 방지) |
| TC-S-05 | JWT 변조 | 서명 변조된 토큰 사용 | 401 반환 |
| TC-S-06 | 파일 업로드 공격 | .exe 파일 업로드 시도 | 415 Unsupported Media Type |
| TC-S-07 | Rate Limit 우회 | 헤더 조작 Rate Limit 우회 시도 | 429 반환 |
| TC-S-08 | HTTPS 강제 | HTTP로 접근 시도 | 301 HTTPS 리다이렉트 |

---

## 7. 호환성 테스트 (Compatibility Tests)

### 7.1 브라우저 호환성

| TC-ID | 브라우저 | 버전 | Canvas 입력 | 변환 | KaTeX |
|-------|---------|------|------------|------|-------|
| TC-C-W01 | Chrome | 110+ | ✓ | ✓ | ✓ |
| TC-C-W02 | Safari | 16+ | ✓ | ✓ | ✓ |
| TC-C-W03 | Firefox | 115+ | ✓ | ✓ | ✓ |
| TC-C-W04 | Edge | 110+ | ✓ | ✓ | ✓ |
| TC-C-W05 | Chrome (Android) | 110+ | ✓ | ✓ | ✓ |
| TC-C-W06 | Safari (iOS) | 16+ | ✓ | ✓ | ✓ |

### 7.2 기기 해상도 호환성

| TC-ID | 디바이스 유형 | 해상도 | Layout |
|-------|-------------|--------|--------|
| TC-C-D01 | 소형 스마트폰 | 360×640 | 세로 단일 컬럼 |
| TC-C-D02 | 일반 스마트폰 | 390×844 | 세로 단일 컬럼 |
| TC-C-D03 | 태블릿 (세로) | 768×1024 | 2단 레이아웃 |
| TC-C-D04 | 태블릿 (가로) | 1024×768 | 3단 레이아웃 |
| TC-C-D05 | 데스크톱 | 1920×1080 | 3단 레이아웃 |

---

## 8. 수식 인식 정확도 테스트 (Accuracy Tests)

### 8.1 테스트 데이터셋

| 카테고리 | 수식 예시 | 테스트 케이스 수 |
|----------|----------|---------------|
| 기본 사칙연산 | `a + b`, `x - y`, `ab`, `\frac{a}{b}` | 20 |
| 지수·로그 | `x^2`, `e^x`, `\log_2 x`, `\ln x` | 20 |
| 삼각함수 | `\sin x`, `\cos\theta`, `\tan^{-1}x` | 20 |
| 미적분 | `\frac{d}{dx}`, `\int_a^b`, `\lim_{x\to 0}` | 20 |
| 행렬 | `\begin{pmatrix}a&b\\c&d\end{pmatrix}` | 10 |
| 합·곱 기호 | `\sum_{i=0}^n`, `\prod_{k=1}^n` | 10 |
| 복잡한 수식 | 다중 중첩 수식 | 20 |
| 총계 | | **120** |

### 8.2 정확도 판정 기준

| 레벨 | 기준 | 목표 비율 |
|------|------|----------|
| Exact Match | 완전 일치 | ≥ 75% |
| Semantically Correct | 수식 의미 동일 (표기 차이) | ≥ 92% |
| Partial Match | 일부 기호 오인식 | ≤ 8% |
| Failure | 변환 실패 또는 완전 오인식 | ≤ 3% |

---

## 9. 회귀 테스트 (Regression Tests)

- **실행 시점**: 모든 PR 머지 전 (GitHub Actions CI)
- **자동화 범위**: 단위 테스트 + 통합 테스트 전체
- **E2E 자동화**: 주요 P0 시나리오 (TC-E-W01, TC-E-M01, TC-E-M02)
- **커버리지 목표**: 라인 커버리지 ≥ 80%

---

---

## 10. TC ↔ 테스트 함수 추적 행렬 (Traceability Matrix)

| TC-ID | 파일 | 함수명 | 상태 |
|-------|------|--------|------|
| TC-U-A01 | `backend/tests/test_auth.py` | `test_register_success` | ✅ 구현 |
| TC-U-A02 | `backend/tests/test_auth.py` | `test_register_duplicate` | ✅ 구현 |
| TC-U-A03 | `backend/tests/test_auth.py` | `test_register_weak_password` | ✅ 구현 |
| TC-U-A04 | `backend/tests/test_auth.py` | `test_login_success` | ✅ 구현 |
| TC-U-A05 | `backend/tests/test_auth.py` | `test_login_wrong_password` | ✅ 구현 |
| TC-U-A06 | `backend/tests/test_auth.py` | `test_me_with_token` | 🔶 부분 구현 |
| TC-U-A07 | `backend/tests/test_auth.py` | `test_logout` | ✅ 구현 |
| TC-U-B01 | `backend/tests/test_image.py` | `test_validate_normal_image` | ✅ 구현 |
| TC-U-B02 | `backend/tests/test_image.py` | `test_preprocess_resize_up` | ✅ 구현 |
| TC-U-B03 | `backend/tests/test_image.py` | `test_preprocess_large_image` | ✅ 구현 |
| TC-U-B04 | `backend/tests/test_formula.py` | `test_convert_invalid_file_type` | ✅ 구현 |
| TC-U-B05 | `backend/tests/test_image.py` | `test_validate_too_large` | ✅ 구현 |
| TC-U-B06 | `backend/tests/test_image.py` | `test_validate_invalid_bytes` | ✅ 구현 |
| TC-U-C01~C08 | `frontend/src/__tests__/DrawingCanvas.test.tsx` | `test_drawing_*` | ✅ 구현 |
| TC-U-L01~L05 | `frontend/src/__tests__/LaTeXPanel.test.tsx` | `test_latex_*` | ✅ 구현 |
| TC-U-K01~K05 | `frontend/src/__tests__/KaTeXPanel.test.tsx` | `test_katex_*` | ✅ 구현 |
| TC-U-R01 | `backend/tests/test_recognizer.py` | `test_get_recognizer_returns_mock_when_no_keys` | ✅ 구현 |
| TC-U-R02 | `backend/tests/test_recognizer.py` | `test_get_recognizer_returns_local_when_flag_set` | ✅ 구현 |
| TC-U-R03 | `backend/tests/test_recognizer.py` | `test_get_recognizer_returns_groq_when_key_set` | ✅ 구현 |
| TC-U-R04 | `backend/tests/test_recognizer.py` | `test_get_recognizer_groq_takes_priority_over_gemini` | ✅ 구현 |
| TC-U-R05 | `backend/tests/test_recognizer.py` | `test_get_recognizer_returns_gemini_when_key_set` | ✅ 구현 |
| TC-U-R06 | `backend/tests/test_recognizer.py` | `test_get_recognizer_returns_mathpix_when_gemini_absent` | ✅ 구현 |
| TC-U-R07 | `backend/tests/test_recognizer.py` | `test_mathpix_recognizer_parses_response` | ✅ 구현 |
| TC-U-R08 | `backend/tests/test_recognizer.py` | `test_mathpix_recognizer_empty_response` | ✅ 구현 |
| TC-U-R09 | `backend/tests/test_recognizer.py` | `test_mathpix_recognizer_strips_wrappers` | ✅ 구현 |
| TC-U-R10 | `backend/tests/test_recognizer.py` | `test_mathpix_api_key_connectivity` | ✅ 구현 |
| TC-U-R11 | `backend/tests/test_recognizer.py` | `test_groq_api_key_connectivity` | ✅ 구현 |
| TC-U-R12 | `backend/tests/test_recognizer.py` | `test_gemini_api_key_connectivity` | ✅ 구현 |
| TC-U-F01 | `backend/tests/test_formula.py` | `test_convert_requires_auth` | ✅ 구현 |
| TC-U-F02 | `backend/tests/test_formula.py` | `test_convert_success_mock` | ✅ 구현 |
| TC-U-F03 | `backend/tests/test_formula.py` | `test_history_after_convert` | ✅ 구현 |
| TC-U-IM01 | `backend/tests/test_image.py` | `test_preprocess_returns_png` | ✅ 구현 |
| TC-I-01 | `backend/tests/test_integration.py` | `test_full_convert_flow` | ✅ 구현 |
| TC-I-02 | `backend/tests/test_integration.py` | `test_history_auto_save` | ✅ 구현 |
| TC-I-03 | `backend/tests/test_integration.py` | `test_convert_no_auth` | ✅ 구현 |
| TC-I-04 | `backend/tests/test_integration.py` | `test_history_pagination` | ✅ 구현 |
| TC-I-05 | `backend/tests/test_integration.py` | `test_history_delete` | ✅ 구현 |
| TC-I-06 | `backend/tests/test_integration.py` | `test_cross_user_access` | ✅ 구현 |
| TC-I-07 | `backend/tests/test_integration.py` | `test_llm_timeout` | ✅ 구현 |
| TC-I-DB01 | `backend/tests/test_integration.py` | `test_cascade_delete` | ✅ 구현 |
| TC-S-01 | `backend/tests/test_security.py` | `test_sql_injection` | ✅ 구현 |
| TC-S-02 | `backend/tests/test_security.py` | `test_xss_latex_input` | ✅ 구현 |
| TC-S-03 | `backend/tests/test_security.py` | `test_no_token_access` | ✅ 구현 |
| TC-S-04 | `backend/tests/test_security.py` | `test_cross_user_formula` | ✅ 구현 |
| TC-S-05 | `backend/tests/test_security.py` | `test_tampered_jwt` | ✅ 구현 |
| TC-S-06 | `backend/tests/test_security.py` | `test_exe_upload` | ✅ 구현 |
| TC-E-W01 | `e2e/formula.spec.ts` | `신규 사용자 수식 변환` | ✅ 구현 |
| TC-E-W02 | `e2e/formula.spec.ts` | `이력 복원 흐름` | ✅ 구현 |
| TC-E-W03 | `e2e/formula.spec.ts` | `LaTeX 직접 편집` | ✅ 구현 |
| TC-E-W04 | `e2e/formula.spec.ts` | `다크 모드 전환` | ✅ 구현 |
| TC-P-01 | `tests/k6/smoke.js` | — | ✅ 구현 |
| TC-P-02 | `tests/k6/load.js` | — | ✅ 구현 |
| TC-P-03 | `tests/k6/stress.js` | — | ✅ 구현 |
| TC-P-04 | `tests/k6/spike.js` | — | ✅ 구현 |

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 변경자 |
|------|------|----------|--------|
| v1.4 | 2026-06-04 | TC-U-R02·R07~R10 미구현→구현 수정; TC-U-F01~F03, TC-U-IM01 Matrix 추가; 실제 테스트 코드와 동기화 | AI |
| v1.3 | 2026-06-02 | 섹션 2.6 AI 인식기 TC 신규 추가 (TC-U-R01~R12); Traceability Matrix에 Recognizer 항목 추가; TC-U-R07~R10 미구현 표시 | AI |
| v1.2 | 2026-06-02 | 코드-문서 불일치 수정: TC-U-C08(3px), TC-U-B04(415), TC-U-B05(400), TC-U-L03(즉시반영), TC-U-L05(재시도버튼 미구현), TC-U-A01(PoC), TC-I-03(403), TC-I-04(offset), TC-I-07(502), TC-S-03(403), TC-S-04(404); Traceability Matrix 추가 | AI |
| v1.1 | 2026-06-02 | TC-U-C04 스택 한도 무제한(PoC) 수정 | AI |
| v1.0 | 2026-06-02 | 최초 작성 | AI |

---

*다음 문서: [MILESTONE.md](MILESTONE.md)*
