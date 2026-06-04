---
name: docker-operation
description: >
  **Docker 운영 SKILL** — docker-compose 서비스 시작/재시작/빌드/로그 확인 절차.
  USE FOR: 서버 재시작, .env 변경 적용, 이미지 빌드, 로그 확인.
  ALWAYS ENFORCE: 환경변수 변경 시 반드시 --force-recreate 사용.
applyTo: "docker-compose.yml,backend/Dockerfile,.env"
---

# Docker 운영 가이드 (Handwrite2KaTeX)

## 1. 핵심 원칙

> `docker-compose restart`는 `.env`를 **다시 읽지 않는다**.
> 환경변수 변경 후에는 반드시 `--force-recreate` 사용.

---

## 2. 주요 명령어

### 서비스 시작 / 재시작

```bash
# .env 변경 후 backend만 재시작 (가장 자주 사용)
docker-compose up -d --force-recreate backend

# 전체 스택 재시작
docker-compose up -d --force-recreate

# 특정 서비스만 재시작 (환경변수 변경 없을 때만)
docker-compose restart frontend
```

### 이미지 빌드

```bash
# backend 이미지 새로 빌드 (requirements.txt, Dockerfile 변경 시)
docker-compose build backend

# 캐시 없이 완전 재빌드
docker-compose build --no-cache backend

# 빌드 후 바로 시작
docker-compose up -d --build backend
```

### 로그 확인

```bash
# 실시간 로그 스트림
docker-compose logs -f backend

# 최근 N줄만
docker-compose logs --tail=50 backend

# 오류만 필터
docker-compose logs backend 2>&1 | grep -E "ERROR|error|Exception"
```

### 컨테이너 내부 접속

```bash
# backend 셸 진입
docker exec -it h2k_backend bash

# 단일 명령 실행
docker exec h2k_backend python3 -c "from app.services.recognizer import get_recognizer; print(type(get_recognizer()).__name__)"

# 환경변수 확인
docker exec h2k_backend sh -c 'echo "GROQ_MODEL=$GROQ_MODEL"'
```

### 상태 확인

```bash
# 전체 서비스 상태
docker-compose ps

# 디스크 사용량
docker system df

# 컨테이너 리소스 사용량
docker stats --no-stream
```

---

## 3. 서비스 구성

| 컨테이너 | 이름 | 내부 포트 | 호스트 포트 |
|---------|------|----------|------------|
| FastAPI Backend | `h2k_backend` | 8000 | `${BACKEND_PORT:-8000}` |
| Vite Frontend | `h2k_frontend` | `${FRONTEND_PORT:-5173}` | `${FRONTEND_PORT:-5173}` |
| PostgreSQL | `h2k_db` | 5432 | 5432 |
| Redis | `h2k_redis` | 6379 | 6379 |

---

## 4. 볼륨

| 볼륨 | 용도 |
|------|------|
| `db_data` | PostgreSQL 데이터 영구 보관 |
| `storage_data` | 변환 이미지 파일 (`/tmp/h2k_storage`) |
| `hf_cache` | HuggingFace 모델 캐시 (pix2tex 가중치) |
| `node_modules` | Frontend node_modules (컨테이너 내부 관리) |

---

## 5. 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| `.env` 변경 후 반영 안 됨 | `restart` 사용 | `--force-recreate` 사용 |
| backend 빌드 SSL 오류 | Somansa DLP | Dockerfile에 pip trusted-host 설정됨 (이미 적용) |
| pix2tex 모델 로딩 실패 | GitHub SSL 차단 | 빌드 타임에 가중치 포함됨 (이미 적용) |
| 포트 충돌 | 다른 프로세스 | `.env`의 `BACKEND_PORT`, `FRONTEND_PORT` 변경 |
