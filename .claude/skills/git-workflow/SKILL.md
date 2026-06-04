---
name: git-workflow
description: >
  **Git 워크플로우 SKILL** — SSH remote 설정, gitignore 규칙, 커밋·push 절차.
  USE FOR: git push/pull, 커밋 생성, gitignore 적용.
applyTo: ".gitignore,.git/**"
---

# Git 워크플로우 (Handwrite2KaTeX)

## 1. Remote 설정

이 프로젝트는 HTTPS가 Somansa DLP에 의해 차단되므로 **SSH 방식만 사용**.

```bash
# 현재 remote 확인
git remote -v

# SSH로 변경
git remote set-url origin git@github-yhkim77:yhkim-77/handwrite2katex.git

# push
git push git@github-yhkim77:yhkim-77/handwrite2katex.git main
```

`~/.ssh/config` 필수 설정:
```
Host github-yhkim77
    HostName ssh.github.com
    Port 443
    User git
    IdentityFile ~/.ssh/id_rsa_yhkim77
```

---

## 2. gitignore 규칙

| 항목 | 이유 |
|------|------|
| `.env` | API 키 등 민감 정보 포함 |
| `__pycache__/`, `*.pyc` | Python 바이트코드 |
| `.pytest_cache/` | pytest 임시 파일 |
| `frontend/node_modules/` | npm 의존성 (용량 수백 MB) |
| `frontend/dist/` | 빌드 결과물 |
| `.vscode/` | 개인 에디터 설정 |

커밋 전 staged 파일 확인:
```bash
git status --short | grep -v "^??"
```

---

## 3. 커밋 규칙

### 커밋 타입

| 타입 | 용도 |
|------|------|
| `feat:` | 신규 기능 |
| `fix:` | 버그 수정 |
| `docs:` | 문서 변경 (코드 변경 없음) |
| `chore:` | 빌드, 설정, 의존성 변경 |
| `test:` | 테스트 추가·수정 |
| `refactor:` | 기능 변경 없는 코드 개선 |

### 커밋 메시지 예시

```
feat: add runtime OCR recognizer selector with settings panel
fix: MathpixRecognizer apply _post_process for wrapper stripping
docs: add Mathpix setup guide per SDLC standard
chore: make HTTP/HTTPS ports configurable via .env
```

---

## 4. 주의사항

- `.env`는 절대 커밋 금지 → 대신 `.env.example` 갱신
- `node_modules`, `dist`, `__pycache__` 이미 staged된 경우:
```bash
git rm -r --cached frontend/node_modules/
git rm -r --cached backend/app/__pycache__/
```
- 이미지 빌드 캐시 정리:
```bash
docker builder prune   # 빌드 캐시만 삭제
docker system prune    # 전체 정리 (주의)
```
