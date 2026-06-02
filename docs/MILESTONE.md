# MILESTONE — 프로젝트 일정 및 마일스톤
## Handwrite2KaTeX — 손글씨 수식 실시간 변환 플랫폼

| 항목 | 내용 |
|------|------|
| 문서 버전 | v1.0 |
| 작성일 | 2026-06-02 |
| 프로젝트 시작 | 2026-06-02 |
| v1.0 목표 | 2027-01-31 |
| 관련 문서 | [PRD.md](PRD.md) · [SRS.md](SRS.md) |

---

## 1. 전체 일정 개요 (Roadmap)

```
2026                                                    2027
Jun    Jul    Aug    Sep    Oct    Nov    Dec    Jan
 │──────│──────│──────│──────│──────│──────│──────│
 ▼      ▼      ▼      ▼      ▼      ▼      ▼      ▼
[M0]  [M1]         [M2]         [M3]  [M4]       [M5]
기획   설계         PoC          Beta  RC         v1.0 GA
```

| 마일스톤 | 코드명 | 목표일 | 핵심 산출물 |
|---------|--------|--------|------------|
| **M0** | Kickoff | 2026-06-30 | 요구사항 문서 완성, 팀 구성, 환경 구축 |
| **M1** | Foundation | 2026-07-31 | 아키텍처 확정, DB 스키마, API 설계 |
| **M2** | PoC | 2026-09-30 | Web Canvas + Backend + LaTeX 변환 동작 데모 |
| **M3** | Beta | 2026-11-30 | KaTeX 렌더링 + 인증 + 이력 저장 + Android/iOS |
| **M4** | RC | 2026-12-31 | 버그픽스, 성능 최적화, 보안 점검 |
| **M5** | v1.0 GA | 2027-01-31 | 전체 플랫폼 정식 출시 |

---

## 2. 팀 구성

| 역할 | 인원 | 주요 담당 |
|------|------|----------|
| Product Manager | 1 | 요구사항 관리, 이해관계자 커뮤니케이션 |
| Frontend Engineer | 2 | React Native/Expo, Canvas, KaTeX |
| Backend Engineer | 2 | FastAPI, DB, LLM 연동, API |
| ML/AI Engineer | 1 | LLM 프롬프트 엔지니어링, 모델 평가 |
| DevOps Engineer | 1 | CI/CD, 인프라, 모니터링 |
| QA Engineer | 1 | 테스트 자동화, E2E, 성능 테스트 |
| UI/UX Designer | 1 | 와이어프레임, 디자인 시스템 |

---

## 3. 마일스톤별 상세 일정

### M0: Kickoff (2026-06-02 ~ 2026-06-30)

**목표**: 프로젝트 기반 구축 및 방향 확정

| 주차 | 작업 항목 | 담당 | 상태 |
|------|----------|------|------|
| W1 (06/02~06/08) | MRD / PRD 작성 완료 | PM | ✅ |
| W1 | SRS / TC 작성 완료 | PM + QA | ✅ |
| W1 | LLM 모델 검토 보고서 작성 | ML Engineer | ✅ |
| W2 (06/09~06/15) | 기술 스택 최종 확정 | Tech Lead | 🔲 |
| W2 | 개발 환경 구성 (Docker, 레포 초기화) | DevOps | 🔲 |
| W2 | UI/UX 와이어프레임 초안 | Designer | 🔲 |
| W3 (06/16~06/22) | DB 스키마 초안 설계 | Backend | 🔲 |
| W3 | API 엔드포인트 설계 문서 작성 | Backend | 🔲 |
| W3 | 프론트엔드 컴포넌트 트리 설계 | Frontend | 🔲 |
| W4 (06/23~06/30) | 팀 킥오프 미팅 및 리뷰 | 전체 | 🔲 |
| W4 | 개발 브랜치 전략 확정 (Git Flow) | DevOps | 🔲 |

**산출물**:
- [x] docs/MRD.md
- [x] docs/PRD.md
- [x] docs/SRS.md
- [x] docs/TC.md
- [x] docs/MILESTONE.md
- [x] docs/LLM_REVIEW.md
- [ ] 와이어프레임 (Figma)
- [ ] 개발 환경 README 작성

---

### M1: Foundation (2026-07-01 ~ 2026-07-31)

**목표**: 개발 기반 구조 완성

| 주차 | 작업 항목 | 담당 | 산출물 |
|------|----------|------|--------|
| W5~W6 | **Backend** FastAPI 프로젝트 구조 초기화 | Backend | `backend/` 폴더 |
| W5~W6 | **Backend** PostgreSQL 연동 + SQLAlchemy 설정 | Backend | DB 연결 확인 |
| W5~W6 | **Backend** Alembic 마이그레이션 초기 스키마 | Backend | `migrations/` |
| W5~W6 | **Frontend** Expo 프로젝트 초기화 (Web+iOS+Android) | Frontend | `frontend/` 폴더 |
| W5~W6 | **Frontend** 네비게이션 구조 설계 | Frontend | 라우터 설정 |
| W7~W8 | **Backend** 인증 API (Register / Login / JWT) | Backend | `/auth` 엔드포인트 |
| W7~W8 | **Frontend** 로그인/회원가입 화면 | Frontend | Auth 화면 |
| W7~W8 | **DevOps** GitHub Actions CI 파이프라인 | DevOps | CI 자동화 |
| W7~W8 | **DevOps** Docker Compose 개발 환경 완성 | DevOps | `docker-compose.yml` |

**완료 기준**:
- [ ] 로컬 `docker compose up` 으로 전체 서비스 실행
- [ ] JWT 기반 로그인 API 정상 동작
- [ ] CI에서 단위 테스트 자동 실행

---

### M2: PoC (2026-08-01 ~ 2026-09-30)

**목표**: 핵심 기능 (Canvas → LaTeX 변환) 동작 증명

| 주차 | 작업 항목 | 담당 |
|------|----------|------|
| W9~W10 | **Frontend** Canvas 컴포넌트 구현 (드로잉, Undo/Redo, Clear) | Frontend |
| W9~W10 | **Frontend** 캔버스 PNG 이미지 직렬화 및 전송 | Frontend |
| W11~W12 | **Backend** 이미지 수신 API (`POST /formula/convert`) | Backend |
| W11~W12 | **Backend** 이미지 전처리 파이프라인 | ML Engineer |
| W11~W12 | **Backend** LLM Vision API 연동 (초기 모델 선정) | ML Engineer |
| W13~W14 | **Frontend** LaTeX 출력 패널 구현 | Frontend |
| W13~W14 | **Frontend** KaTeX 렌더링 패널 구현 | Frontend |
| W13~W14 | **Backend** S3 이미지 업로드 연동 | Backend |
| W15~W16 | **전체** PoC 통합 테스트 및 데모 준비 | 전체 |
| W15~W16 | **ML** 모델 정확도 1차 평가 (120개 수식 테스트셋) | ML Engineer |

**완료 기준**:
- [ ] Canvas에 수식 입력 → LaTeX 변환 → KaTeX 렌더링 전체 흐름 동작 (Web)
- [ ] 수식 인식 정확도 ≥ 85% (PoC 목표)
- [ ] 변환 API 응답 시간 ≤ 5초 (PoC 목표)
- [ ] 내부 데모 발표 완료

---

### M3: Beta (2026-10-01 ~ 2026-11-30)

**목표**: 전체 기능 구현 + Android/iOS 지원

| 주차 | 작업 항목 | 담당 |
|------|----------|------|
| W17~W18 | **Frontend** 이력 패널 UI 구현 | Frontend |
| W17~W18 | **Backend** 이력 저장·조회·삭제 API | Backend |
| W19~W20 | **Frontend** Android 빌드 및 터치 최적화 | Frontend |
| W19~W20 | **Frontend** iOS 빌드 및 Apple Pencil 지원 | Frontend |
| W21~W22 | **Frontend** 다크/라이트 모드, 반응형 레이아웃 | Frontend |
| W21~W22 | **Backend** WebSocket 실시간 스트리밍 | Backend |
| W23~W24 | **ML** 모델 정확도 2차 평가 및 프롬프트 튜닝 | ML Engineer |
| W23~W24 | **QA** 통합 테스트 + E2E 테스트 자동화 | QA |
| W25~W26 | **보안** OWASP Top 10 점검 | DevOps + Backend |
| W25~W26 | **성능** 1차 부하 테스트 (k6) | QA + DevOps |

**완료 기준**:
- [ ] Web / Android / iOS 전 플랫폼 베타 빌드 배포
- [ ] 수식 인식 정확도 ≥ 90%
- [ ] 변환 API P95 ≤ 3초
- [ ] 베타 사용자 20명 초청 테스트 완료

---

### M4: Release Candidate (2026-12-01 ~ 2026-12-31)

**목표**: 품질 안정화 및 출시 준비

| 주차 | 작업 항목 | 담당 |
|------|----------|------|
| W27~W28 | 베타 피드백 버그 수정 | 전체 |
| W27~W28 | 성능 최적화 (DB 쿼리, 캐싱, 이미지 최적화) | Backend + DevOps |
| W29~W30 | 최종 보안 점검 (OWASP ZAP 자동 스캔) | DevOps |
| W29~W30 | App Store / Google Play 제출 준비 | Frontend + PM |
| W31~W32 | 운영 인프라 구성 (AWS ECS, RDS, ElastiCache) | DevOps |
| W31~W32 | 모니터링 설정 (Prometheus + Grafana + Sentry) | DevOps |
| W31~W32 | 최종 E2E + 성능 + 호환성 테스트 전체 실행 | QA |

**완료 기준**:
- [ ] 수식 인식 정확도 ≥ 92%
- [ ] 변환 API P95 ≤ 2초
- [ ] 코드 커버리지 ≥ 80%
- [ ] OWASP 취약점 Critical/High 0건
- [ ] Apple App Store / Google Play 심사 제출 완료

---

### M5: v1.0 GA (2027-01-01 ~ 2027-01-31)

**목표**: 공개 출시 및 초기 운영 안정화

| 주차 | 작업 항목 | 담당 |
|------|----------|------|
| W33~W34 | App Store / Google Play 승인 대기 및 대응 | Frontend + PM |
| W33~W34 | 웹 서비스 카나리 배포 (10% 트래픽) | DevOps |
| W35~W36 | 카나리 안정성 확인 후 전체 배포 | DevOps |
| W35~W36 | 출시 마케팅 (Landing Page, SNS) | PM |
| W37~W38 | 초기 운영 이슈 대응 (On-call 운영) | 전체 |

**완료 기준**:
- [ ] Web / Android / iOS 전 플랫폼 공개 출시
- [ ] 출시 후 1주일 Uptime ≥ 99.5%
- [ ] 에러율 ≤ 0.5%

---

## 4. 위험 관리 (Risk Management)

| 위험 | 발생 가능성 | 영향도 | 대응 전략 |
|------|------------|--------|----------|
| LLM API 비용 초과 | 중 | 높음 | 캐싱 강화 + 모델 선택 최적화, 사용량 모니터링 |
| LLM 정확도 미달 (< 90%) | 중 | 높음 | 다중 모델 앙상블, 후처리 교정 로직 추가 |
| App Store 심사 반려 | 낮음 | 중간 | Apple 가이드라인 사전 검토, 충분한 제출 여유 기간 |
| 핵심 인력 이탈 | 낮음 | 높음 | 지식 문서화, 코드 리뷰 문화로 지식 공유 |
| 예상보다 긴 개발 기간 | 중 | 중간 | 스코프 조정 (P2 기능 후속 버전으로 이동) |
| 보안 취약점 발견 | 낮음 | 매우 높음 | 정기 보안 스캔, 수정 즉시 핫픽스 배포 |

---

## 5. 이후 로드맵 (Post v1.0)

| 버전 | 예상 시기 | 주요 기능 |
|------|----------|----------|
| **v1.1** | 2027 Q1 | 이력 분석 대시보드, 수식 태그·분류 기능 |
| **v1.2** | 2027 Q2 | LaTeX → PDF/Word 내보내기, LaTeX 편집기 강화 |
| **v2.0** | 2027 Q3 | 실시간 협업 캔버스, 강사-학생 공유 세션 |
| **v2.1** | 2027 Q4 | 수식 계산·그래프 연동 (Wolfram/Python), SDK 출시 |

---

*다음 문서: [LLM_REVIEW.md](LLM_REVIEW.md)*
