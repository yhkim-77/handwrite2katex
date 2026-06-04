---
name: troubleshooting
description: >
  **트러블슈팅 SKILL** — 이 프로젝트에서 발생한 알려진 오류와 해결 방법 모음.
  USE FOR: 오류 발생 시 원인 파악 및 해결책 참조.
applyTo: "**/*"
---

# 트러블슈팅 가이드 (Handwrite2KaTeX)

## 1. 네트워크 / SSL

### Somansa DLP SSL 인증서 오류
```
[SSL: CERTIFICATE_VERIFY_FAILED] self-signed certificate in certificate chain
```
**원인**: 사내망 Somansa Integrated Network Agent가 HTTPS를 가로채 자체 인증서 삽입.

**해결**:
```ini
# .env
SSL_VERIFY=false
```
Docker 빌드 내부 pip에도 적용됨 (Dockerfile에 trusted-host 설정).

---

### git push 403 (Somansa DLP 차단)
```
remote: Permission to yhkim-77/handwrite2katex.git denied
fatal: unable to access ... 403
```
**원인**: Somansa DLP가 HTTPS POST(`/git-receive-pack`)를 차단.

**해결**: SSH 방식 사용.
```bash
git remote set-url origin git@github-yhkim77:yhkim-77/handwrite2katex.git
git push git@github-yhkim77:yhkim-77/handwrite2katex.git main
```
`~/.ssh/config`에 `Host github-yhkim77` 설정 필요.

---

## 2. AI 인식기

### Groq 400 Bad Request — 모델 폐기
```
{"error": {"code": "model_decommissioned", "message": "The model `llama-3.2-11b-vision-preview` has been decommissioned"}}
```
**해결**:
```ini
# .env
GROQ_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
```
현재 Groq에서 Vision 지원 모델: `meta-llama/llama-4-scout-17b-16e-instruct` (2026년 기준 유일).

---

### Gemini 404 Not Found — 모델 없음
```
Client error '404 Not Found' for url '.../gemini-1.5-pro:generateContent'
```
**해결**:
```ini
GEMINI_MODEL=gemini-2.0-flash-lite
```

---

### Gemini 429 — 할당량 초과
```
Resource has been exhausted (quota exceeded)
```
**해결**: Groq 또는 pix2tex로 전환. UI의 ⚙️ 버튼 또는 PATCH API 사용.

---

### ASCII codec 오류 — 한글 API 키 placeholder
```
'ascii' codec can't encode characters in position 7-9
```
**원인**: `.env`에 한글 placeholder(`여기에_발급받은_Groq_키_입력`)가 실제 키로 사용됨.

**해결**: `.env`에 실제 API 키 입력. 빈 값(`GROQ_API_KEY=`)으로 두면 해당 인식기 건너뜀.

---

## 3. Docker

### .env 변경 후 반영 안 됨
**원인**: `docker-compose restart`는 `.env`를 다시 읽지 않음.

**해결**:
```bash
docker-compose up -d --force-recreate backend
```

---

### .pytest_cache 권한 오류 (빌드 시)
```
open /data6/youngho/workspace/handwrite2katex/backend/.pytest_cache: permission denied
```
**해결**: `backend/.dockerignore` 파일에 이미 `/.pytest_cache/` 포함됨.

---

## 4. Backend

### Pydantic ValidationError — FormulaHistoryItem.id UUID 타입 불일치
```
pydantic_core.ValidationError: id — Input should be a valid string [input_type=UUID]
```
**원인**: SQLAlchemy가 `UUID` 객체 반환, Pydantic 스키마가 `str` 기대.

**해결**: `schemas/formula.py`에서 `id: str` → `id: uuid.UUID`로 변경 (이미 적용됨).

---

### `field_validator` NameError
```
NameError: name 'field_validator' is not defined
```
**원인**: import 없이 사용.

**해결**: `from pydantic import BaseModel, field_validator` 로 import.

---

## 5. Frontend

### Vite HMR 미반영
**해결**: 브라우저 강제 새로고침 (`Ctrl+Shift+R`) 또는 Vite 재시작.
```bash
docker-compose restart frontend
```
