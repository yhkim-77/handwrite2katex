---
name: development-guidelines
description: >
  **개발 가이드라인 SKILL** — Claude가 이 프로젝트에서 작업할 때 반드시 따르는 원칙.
  USE FOR: 코드 수정, 설정 변경, 파일 추가 등 모든 작업 전 참조.
  ALWAYS ENFORCE: 요청 범위만 구현, 주석 처리 규칙, 최소 변경 원칙.
applyTo: "**/*"
---

# Claude 작업 가이드라인 (Handwrite2KaTeX)

## 1. 가장 중요한 원칙

> **요청한 것만 구현한다. 요청하지 않은 것은 절대 추가하지 않는다.**

### 위반 사례 (2026-06-04 기록)

**사용자 요청**: ".env에 HTTP port 및 HTTPS port를 설정 가능하도록 수정해줘"

**잘못된 응답** (Claude가 한 것):
```ini
BACKEND_PORT=8000    ← 요청하지 않은 활성 설정 추가
FRONTEND_PORT=5173   ← 요청하지 않은 활성 설정 추가
# HTTPS_PORT=8443
```

**올바른 응답** (했어야 하는 것):
```ini
# HTTPS_PORT=8443
# SSL_CERT_PATH=./certs/server.crt
# SSL_KEY_PATH=./certs/server.key
```

**Why:** 사용자는 HTTPS 포트 설정만 요청했으나, Claude가 연관된 HTTP 포트 변수까지 자의적으로 추가함. 이는 기존 동작하는 시스템에 불필요한 변경을 야기하고 사용자를 혼란스럽게 함.

---

## 2. .env 파일 수정 규칙

| 상황 | 처리 방법 |
|------|----------|
| 사용자가 명시적으로 요청한 설정 | 활성 상태로 추가 |
| 요청과 관련된 선택적 설정 | 주석(`#`)으로만 추가 |
| 요청과 무관한 편의성 설정 | **추가하지 않음** |

## 3. docker-compose.yml 변경 시

- 변경 후 반드시 `docker-compose up -d --force-recreate [서비스명]` 실행
- `docker-compose restart`는 `.env`를 다시 읽지 않음

## 4. 파일별 담당 역할

| 파일 | 역할 |
|------|------|
| `.env` | 실제 환경변수 (git 제외, API 키 포함) |
| `.env.example` | 환경변수 템플릿 (git 포함, 값 없음) |
| `docker-compose.yml` | 서비스 오케스트레이션, `${VAR:-default}` 문법 사용 |
| `backend/app/core/config.py` | Pydantic Settings, `.env` 읽기 |

## 5. 코드 변경 최소화 원칙

- 버그 수정: 버그가 있는 부분만 수정
- 기능 추가: 요청된 기능만 추가, 주변 코드 리팩토링 금지
- 설정 변경: 요청된 설정만 변경, 연관 설정 자의적 추가 금지
