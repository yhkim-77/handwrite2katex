"""Image preprocessing unit tests."""
import io
import pytest
from PIL import Image

from app.services.image import preprocess_image, validate_image_bytes
from app.core.config import settings


def _png(w: int = 300, h: int = 200) -> bytes:
    img = Image.new("RGB", (w, h), (255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_validate_normal_image():
    validate_image_bytes(_png())  # should not raise


def test_validate_too_large():
    big = b"x" * (settings.MAX_IMAGE_SIZE_MB * 1024 * 1024 + 1)
    with pytest.raises(ValueError, match="초과"):
        validate_image_bytes(big)


def test_validate_invalid_bytes():
    with pytest.raises(ValueError, match="유효하지 않은"):
        validate_image_bytes(b"not an image")


def test_preprocess_returns_png():
    result = preprocess_image(_png())
    img = Image.open(io.BytesIO(result))
    assert img.format == "PNG"


def test_preprocess_resize_up():
    """Small images should be upscaled to at least MIN_IMAGE_DIMENSION."""
    tiny = _png(10, 10)
    result = preprocess_image(tiny)
    img = Image.open(io.BytesIO(result))
    assert min(img.size) >= settings.MIN_IMAGE_DIMENSION
