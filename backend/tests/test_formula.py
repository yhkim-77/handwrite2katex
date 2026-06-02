"""Formula endpoint tests."""
import io
import pytest
from PIL import Image


def _make_png() -> bytes:
    """Create a minimal white canvas PNG in memory."""
    img = Image.new("RGB", (200, 100), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


async def _register_and_login(client, email="formula@example.com"):
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password1"},
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Password1"},
    )
    return resp.json()["access_token"]


@pytest.mark.asyncio
async def test_convert_requires_auth(client):
    png = _make_png()
    resp = await client.post(
        "/api/v1/formula/convert",
        files={"file": ("canvas.png", png, "image/png")},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_convert_success_mock(client):
    """Convert with MockRecognizer (no API key set in test env)."""
    token = await _register_and_login(client)
    png = _make_png()
    resp = await client.post(
        "/api/v1/formula/convert",
        files={"file": ("canvas.png", png, "image/png")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "latex" in data
    assert len(data["latex"]) > 0


@pytest.mark.asyncio
async def test_history_after_convert(client):
    token = await _register_and_login(client, email="hist@example.com")
    png = _make_png()
    # Convert once
    await client.post(
        "/api/v1/formula/convert",
        files={"file": ("canvas.png", png, "image/png")},
        headers={"Authorization": f"Bearer {token}"},
    )
    # Fetch history
    resp = await client.get(
        "/api/v1/formula/history",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_convert_invalid_file_type(client):
    token = await _register_and_login(client, email="badtype@example.com")
    resp = await client.post(
        "/api/v1/formula/convert",
        files={"file": ("doc.pdf", b"%PDF", "application/pdf")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 415
