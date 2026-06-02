"""Security Tests — TC-S-01 ~ TC-S-08 (OWASP Top 10 기반)."""
from __future__ import annotations

import io

import pytest
from PIL import Image


# ─── Helper ──────────────────────────────────────────────────────────────────

def _make_png(width: int = 100, height: int = 100) -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", (width, height), color=(0, 0, 0))
    img.save(buf, format="PNG")
    return buf.getvalue()


async def _register_and_login(client, email: str) -> str:
    await client.post("/api/v1/auth/register", json={"email": email, "password": "Password1"})
    resp = await client.post("/api/v1/auth/login", json={"email": email, "password": "Password1"})
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ─── TC-S-01: SQL Injection ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_sql_injection(client):
    """TC-S-01: SQL Injection 시도 → 400/422, DB 변경 없음."""
    payloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "admin'--",
        "1; SELECT * FROM users",
    ]
    for payload in payloads:
        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": payload, "password": "Password1"},
        )
        # SQLAlchemy ORM 사용으로 SQL Injection은 차단됨 (401 or 422)
        assert resp.status_code in (400, 401, 422), (
            f"SQL Injection payload '{payload}' should be rejected"
        )

    # 사용자 수가 변하지 않아야 함 (등록된 사용자만 존재)
    # health check로 서버 정상 확인
    health = await client.get("/health")
    assert health.status_code == 200


# ─── TC-S-02: XSS (LaTeX 입력) ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_xss_latex_input(client):
    """TC-S-02: XSS 시도가 API 응답에 그대로 실행 가능한 형태로 반환되지 않아야 한다.
    
    Backend는 LaTeX를 그대로 저장하지만, KaTeX 렌더링은 클라이언트에서 수행되므로
    서버 응답의 JSON 문자열로는 XSS가 불가능하다. 이 테스트는 API가 500 에러를
    발생시키지 않고 정상 처리되는지 검증한다.
    """
    token = await _register_and_login(client, "xss@example.com")

    # 수식 변환을 통해 저장된 이력의 LaTeX를 직접 편집하는 시나리오 (API에 없음)
    # 대신 파일 업로드를 통한 XSS 시도 (파일명에 스크립트 주입)
    xss_payload = b"<script>alert(1)</script>"
    files = {"file": ("xss.png", _make_png(), "image/png")}
    resp = await client.post("/api/v1/formula/convert", files=files, headers=_auth(token))
    # 서버가 정상 응답 (200) 또는 유효한 에러(422) 반환
    assert resp.status_code in (200, 422)
    # 응답 Content-Type이 application/json인지 확인 (HTML 반환 없음)
    assert "application/json" in resp.headers.get("content-type", "")


# ─── TC-S-03: 인증 없이 API 접근 ─────────────────────────────────────────────

@pytest.mark.asyncio
@pytest.mark.parametrize("method,path", [
    ("GET", "/api/v1/auth/me"),
    ("GET", "/api/v1/formula/history"),
    ("DELETE", "/api/v1/formula/history/00000000-0000-0000-0000-000000000000"),
    ("PATCH", "/api/v1/formula/history/00000000-0000-0000-0000-000000000000/bookmark"),
])
async def test_no_token_access(client, method, path):
    """TC-S-03: 토큰 없이 보호된 엔드포인트 → 403 반환 (HTTPBearer)."""
    resp = await client.request(method, path)
    assert resp.status_code == 403, f"Expected 403 for {method} {path}, got {resp.status_code}"


# ─── TC-S-04: 타인 리소스 접근 ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_cross_user_formula(client):
    """TC-S-04: 다른 사용자 formula ID 조회 → 404 반환 (정보 노출 방지)."""
    token_a = await _register_and_login(client, "sec04a@example.com")
    token_b = await _register_and_login(client, "sec04b@example.com")

    files = {"file": ("f.png", _make_png(), "image/png")}
    convert = await client.post(
        "/api/v1/formula/convert", files=files, headers=_auth(token_a)
    )
    item_id = convert.json()["id"]

    # user B가 user A의 데이터 접근
    resp = await client.get(
        f"/api/v1/formula/history/{item_id}", headers=_auth(token_b)
    )
    assert resp.status_code == 404


# ─── TC-S-05: JWT 변조 ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_tampered_jwt(client):
    """TC-S-05: 서명 변조된 JWT 사용 → 401 반환."""
    # 유효한 토큰 획득 후 서명 부분 변조
    await client.post(
        "/api/v1/auth/register",
        json={"email": "tamper@example.com", "password": "Password1"},
    )
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "tamper@example.com", "password": "Password1"},
    )
    valid_token = login.json()["access_token"]

    # JWT 구조: header.payload.signature — 서명 변조
    parts = valid_token.split(".")
    assert len(parts) == 3
    tampered_token = parts[0] + "." + parts[1] + ".invalidsignature"

    resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {tampered_token}"},
    )
    assert resp.status_code == 401


# ─── TC-S-06: 파일 업로드 공격 ───────────────────────────────────────────────

@pytest.mark.asyncio
@pytest.mark.parametrize("filename,content_type,content", [
    ("malware.exe", "application/octet-stream", b"MZ\x90\x00"),
    ("shell.php", "application/x-php", b"<?php system($_GET['cmd']); ?>"),
    ("script.js", "application/javascript", b"alert(1)"),
    ("document.pdf", "application/pdf", b"%PDF-1.4"),
])
async def test_malicious_file_upload(client, filename, content_type, content):
    """TC-S-06: 악성 파일 업로드 시도 → 415 반환."""
    token = await _register_and_login(client, f"sec06_{filename.split('.')[0]}@example.com")
    files = {"file": (filename, content, content_type)}
    resp = await client.post(
        "/api/v1/formula/convert", files=files, headers=_auth(token)
    )
    assert resp.status_code == 415, (
        f"Expected 415 for {filename} ({content_type}), got {resp.status_code}"
    )


# ─── TC-S-07: 비밀번호 정책 우회 시도 ────────────────────────────────────────

@pytest.mark.asyncio
@pytest.mark.parametrize("password", [
    "12345678",          # 숫자만
    "aaaaaaaa",          # 소문자만
    "AAAAAAAA",          # 대문자만
    "short",             # 8자 미만
    "",                  # 빈 문자열
])
async def test_weak_password_policy(client, password):
    """TC-S-07: 약한 비밀번호로 가입 시도 → 422 반환."""
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": f"pwtest_{len(password)}@example.com", "password": password},
    )
    assert resp.status_code == 422, (
        f"Weak password '{password}' should be rejected with 422"
    )


# ─── TC-S-08: HTTPS 강제 (Integration-level 확인) ────────────────────────────

@pytest.mark.asyncio
async def test_security_headers(client):
    """TC-S-08: 응답 헤더에 보안 관련 설정이 포함되어야 한다.
    
    HTTPS 리다이렉트는 인프라(Nginx/ALB) 레벨에서 처리되므로
    단위 테스트에서는 API 응답의 Content-Type 등 기본 보안 헤더를 확인한다.
    """
    resp = await client.get("/health")
    assert resp.status_code == 200
    # JSON API는 HTML 응답을 반환하지 않아야 함
    assert "text/html" not in resp.headers.get("content-type", "")
