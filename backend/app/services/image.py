"""Image preprocessing service for handwritten formula images."""
from __future__ import annotations

import io

from PIL import Image, ImageFilter, ImageOps

from app.core.config import settings


def preprocess_image(raw_bytes: bytes) -> bytes:
    """
    Pipeline:
    1. Load & validate
    2. Convert to grayscale
    3. Auto-crop whitespace
    4. Resize within bounds
    5. Gaussian denoise
    6. Return PNG bytes
    """
    img = Image.open(io.BytesIO(raw_bytes)).convert("RGBA")

    # Flatten alpha channel onto white background
    background = Image.new("RGBA", img.size, (255, 255, 255, 255))
    background.paste(img, mask=img.split()[3])
    img = background.convert("RGB")

    # Grayscale
    img = img.convert("L")

    # Auto-crop: remove uniform border rows/columns
    img = _auto_crop(img)

    # Resize within [MIN, MAX]
    img = _resize_within_bounds(img)

    # Light denoise
    img = img.filter(ImageFilter.GaussianBlur(radius=0.5))

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def _auto_crop(img: Image.Image, padding: int = 10) -> Image.Image:
    """Crop away empty margins."""
    inverted = ImageOps.invert(img)
    bbox = inverted.getbbox()
    if bbox is None:
        return img
    left = max(0, bbox[0] - padding)
    upper = max(0, bbox[1] - padding)
    right = min(img.width, bbox[2] + padding)
    lower = min(img.height, bbox[3] + padding)
    return img.crop((left, upper, right, lower))


def _resize_within_bounds(img: Image.Image) -> Image.Image:
    mn, mx = settings.MIN_IMAGE_DIMENSION, settings.MAX_IMAGE_DIMENSION
    w, h = img.size
    if w < mn or h < mn:
        scale = mn / min(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    w, h = img.size
    if w > mx or h > mx:
        scale = mx / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    return img


def validate_image_bytes(data: bytes) -> None:
    """Raise ValueError if the image data is invalid or exceeds limits."""
    if len(data) > settings.max_image_bytes:
        raise ValueError(
            f"이미지 크기가 최대 {settings.MAX_IMAGE_SIZE_MB}MB를 초과합니다."
        )
    try:
        img = Image.open(io.BytesIO(data))
        img.verify()
    except Exception as exc:
        raise ValueError(f"유효하지 않은 이미지 파일입니다: {exc}") from exc
