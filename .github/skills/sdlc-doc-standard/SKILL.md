---
name: sdlc-doc-standard
description: >
  **SDLC 문서 표준 SKILL** — Handwrite2KaTeX 프로젝트의 모든 문서(MRD/PRD/SRS/TC/MILESTONE/LLM_REVIEW)를
  IEEE 830 / ISO/IEC 25010 기반 SDLC(Software Development Life Cycle) 표준에 따라 작성·검토·갱신한다.
  USE FOR: 새 기능 추가 시 요구사항 문서 갱신; 코드 변경으로 인한 docs 불일치 수정;
  테스트 케이스 추가·변경; 릴리즈 마일스톤 업데이트; 아키텍처 변경 반영.
  ALWAYS ENFORCE: 문서-코드 일관성 유지; TC ID와 실제 테스트 함수 매핑; 변경 이력 기록.
applyTo: "docs/**/*.md"
---

# SDLC 문서 표준 (Handwrite2KaTeX)

## 1. SDLC 단계별 문서 매핑

```
┌──────────────────────────────────────────────────────────────────────┐
│  SDLC Phase          │  산출 문서              │  파일                │
├──────────────────────┼─────────────────────────┼──────────────────────┤
│  1. 시장/요구사항 분석 │  MRD                   │  docs/MRD.md         │
│  2. 제품 기획         │  PRD                   │  docs/PRD.md         │
│  3. 시스템 분석/설계  │  SRS                   │  docs/SRS.md         │
│  4. 개발              │  (코드 + 주석)          │  backend/ frontend/  │
│  5. 테스트            │  TC (Test Cases)        │  docs/TC.md          │
│                      │  Test Scripts          │  tests/              │
│  6. 배포              │  MILESTONE             │  docs/MILESTONE.md   │
│  7. 운영/유지보수     │  릴리즈 노트 (v1.1+)    │  docs/RELEASE.md     │
│  부가: AI 모델 선택   │  LLM_REVIEW            │  docs/LLM_REVIEW.md  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. 필수 준수 원칙 (MUST Rules)

### 2.1 문서-코드 일관성 (Doc-Code Consistency)

> **코드가 변경되면 반드시 해당 문서를 동시에 갱신한다.**

| 코드 변경 유형 | 갱신 대상 문서 |
|--------------|--------------|
| 신규 API 엔드포인트 추가 | SRS (인터페이스), PRD (기능), TC (테스트 케이스) |
| API 응답 코드 변경 | TC (예상 결과), SRS (예외 처리) |
| 데이터 모델 변경 | SRS (데이터 요구사항), PRD (데이터 모델) |
| 인증 방식 변경 | SRS (보안), PRD (보안) |
| 기술 스택 변경 | PRD (기술 스택), MILESTONE |
| AI 모델 변경 | LLM_REVIEW |
| 일정 변경 | MILESTONE |

### 2.2 TC-코드 매핑 (TC-Code Traceability)

모든 TC-ID는 실제 테스트 함수와 1:1 매핑되어야 한다.

```
TC-U-A01  →  tests/test_auth.py::test_register_success
TC-U-A02  →  tests/test_auth.py::test_register_duplicate
TC-I-01   →  tests/test_integration.py::test_full_convert_flow
TC-S-01   →  tests/test_security.py::test_sql_injection
TC-E-W01  →  e2e/formula.spec.ts::신규 사용자 수식 변환
TC-P-01   →  tests/k6/smoke.js
```

### 2.3 버전 관리 (Versioning)

모든 문서 헤더에는 다음 메타데이터가 있어야 한다:

```markdown
| 문서 버전 | vX.Y |
| 최종 수정일 | YYYY-MM-DD |
| 상태 | Draft / Review / Approved / Deprecated |
| 변경 이력 | ## 변경 이력 섹션 필수 |
```

### 2.4 변경 이력 형식

```markdown
## 변경 이력

| 버전 | 날짜 | 변경 내용 | 변경자 |
|------|------|----------|--------|
| v1.1 | 2026-06-02 | TC-I-03 401→403 수정, TC-S-04 403→404 수정 | AI |
| v1.0 | 2026-06-02 | 최초 작성 | AI |
```

---

## 3. 각 문서별 필수 섹션

### MRD (시장 요구사항)
- [ ] 시장 규모 및 동향
- [ ] Pain Points (문제 정의)
- [ ] 경쟁사 분석
- [ ] 목표 사용자 (Persona)
- [ ] 비즈니스 목표 + KPI
- [ ] 성공 기준

### PRD (제품 요구사항)
- [ ] 제품 비전
- [ ] UI/UX 레이아웃
- [ ] 기능 요구사항 (FR-*) — 우선순위 포함
- [ ] 비기능 요구사항 (NFR-*)
- [ ] 시스템 아키텍처 다이어그램
- [ ] 기술 스택 결정 근거
- [ ] 데이터 모델
- [ ] API 엔드포인트 목록
- [ ] 보안 요구사항
- [ ] 릴리즈 계획

### SRS (소프트웨어 요구사항 명세)
- [ ] IEEE 830 / ISO 25010 참조 표기
- [ ] 시스템 컨텍스트 다이어그램
- [ ] 기능 요구사항 (SRS-*) — 선/후조건, 기본 흐름, 예외 흐름
- [ ] 외부 인터페이스 요구사항
- [ ] 품질 속성 (성능/신뢰성/보안/확장성)
- [ ] 시스템 제약사항
- [ ] 오류 처리 정책

### TC (테스트 케이스)
- [ ] 테스트 전략 (피라미드 비율)
- [ ] 각 TC에 TC-ID 부여 (TC-U-*/TC-I-*/TC-E-*/TC-P-*/TC-S-*/TC-C-*)
- [ ] TC-ID ↔ 테스트 함수 추적 행렬 (Traceability Matrix)
- [ ] 실제 구현 상태 컬럼 (미구현/구현완료/자동화)

### MILESTONE (일정)
- [ ] 전체 Roadmap 요약
- [ ] 팀 구성 및 역할
- [ ] 마일스톤별 완료 기준 (Definition of Done)
- [ ] 위험 관리 (Risk Register)
- [ ] 이후 로드맵 (v1.1+)

---

## 4. 문서 갱신 절차 (Update Procedure)

1. **변경 감지**: 코드 PR/커밋 시 영향받는 문서 목록 파악
2. **불일치 목록 작성**: `[문서명] TC-ID / 섹션 → 현재 내용 vs 실제 코드` 형식으로 기록
3. **문서 수정**: 실제 구현 기준으로 수정 (코드가 진실의 원천)
4. **버전 증가**: Patch 수정 → v1.0→v1.1, 기능 추가 → v1.0→v2.0
5. **변경 이력 기록**: 문서 하단 `## 변경 이력` 섹션에 추가
6. **검토**: PR에서 docs/ 변경 사항 리뷰 필수

---

## 5. 자동화 체크리스트

다음 항목은 CI (GitHub Actions)에서 자동 검증:

```yaml
# .github/workflows/ci.yml 에 추가할 체크
- name: Docs consistency check
  run: |
    # TC-ID와 pytest 함수 매핑 검증
    python scripts/check_tc_mapping.py
    # API 응답 코드 일관성 검증
    python scripts/check_api_docs.py
```

---

## 6. 문서 품질 기준 (Quality Gate)

| 기준 | 최소 요건 |
|------|---------|
| TC 구현률 | P0 TC 100% 자동화 |
| 문서-코드 불일치 | 0건 (PR 머지 시) |
| API 커버리지 | 모든 엔드포인트 TC 존재 |
| 변경 이력 | 모든 수정에 이력 기록 |
| 버전 태그 | 릴리즈마다 문서 버전 증가 |
