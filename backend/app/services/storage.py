"""Object storage service — supports local filesystem, MinIO, and AWS S3."""
from __future__ import annotations

import io
import os
import uuid
from pathlib import Path

from app.core.config import settings


async def save_image(image_bytes: bytes, filename: str | None = None) -> str:
    """Persist image and return its public URL / path."""
    key = filename or f"formulas/{uuid.uuid4()}.png"

    if settings.STORAGE_BACKEND == "local":
        return _save_local(image_bytes, key)
    else:
        return await _save_s3(image_bytes, key)


def _save_local(data: bytes, key: str) -> str:
    base = Path(settings.LOCAL_STORAGE_PATH)
    target = base / key
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    return f"/storage/{key}"


async def _save_s3(data: bytes, key: str) -> str:
    import boto3  # imported lazily to avoid import errors in local mode

    kwargs: dict = {
        "region_name": settings.S3_REGION,
        "aws_access_key_id": settings.AWS_ACCESS_KEY_ID,
        "aws_secret_access_key": settings.AWS_SECRET_ACCESS_KEY,
    }
    if settings.STORAGE_BACKEND == "minio":
        kwargs["endpoint_url"] = settings.MINIO_ENDPOINT

    s3 = boto3.client("s3", **kwargs)
    s3.upload_fileobj(
        io.BytesIO(data),
        settings.S3_BUCKET_NAME,
        key,
        ExtraArgs={"ContentType": "image/png"},
    )

    if settings.STORAGE_BACKEND == "minio":
        return f"{settings.MINIO_ENDPOINT}/{settings.S3_BUCKET_NAME}/{key}"

    return f"https://{settings.S3_BUCKET_NAME}.s3.{settings.S3_REGION}.amazonaws.com/{key}"
