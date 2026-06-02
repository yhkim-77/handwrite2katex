"""LLM / Vision model adapter layer.

Adapter pattern — all providers implement FormulaRecognizer.
Swap provider by changing settings.GEMINI_API_KEY / provider selection.
"""
from __future__ import annotations

import base64
import re
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass

import httpx

from app.core.config import settings


@dataclass
class RecognitionResult:
    latex: str
    confidence: float
    model: str
    processing_time_ms: int


SYSTEM_PROMPT = (
    "You are a specialized mathematical formula OCR engine.\n"
    "Analyze the handwritten mathematical expression in the provided image "
    "and output ONLY the corresponding LaTeX code without any explanation, "
    "markdown formatting, or delimiters.\n"
    "Rules:\n"
    "1. Output raw LaTeX only (e.g. \\frac{d}{dx}x^2=2x)\n"
    "2. Do NOT include $, $$, \\[, \\] wrappers\n"
    "3. If unreadable, output exactly: ERROR:UNREADABLE\n"
    "4. Use standard LaTeX: \\frac{}{}, \\int, \\sum, \\prod, \\lim, etc."
)


class FormulaRecognizer(ABC):
    @abstractmethod
    async def convert(self, image_bytes: bytes) -> RecognitionResult:
        ...


class GeminiRecognizer(FormulaRecognizer):
    """Google Gemini Vision API recognizer."""

    def __init__(self) -> None:
        self._api_key = settings.GEMINI_API_KEY
        self._model = settings.GEMINI_MODEL
        self._base_url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self._model}:generateContent"
        )

    async def convert(self, image_bytes: bytes) -> RecognitionResult:
        start = time.monotonic()
        b64 = base64.b64encode(image_bytes).decode()

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": SYSTEM_PROMPT},
                        {
                            "inline_data": {
                                "mime_type": "image/png",
                                "data": b64,
                            }
                        },
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 512,
            },
        }

        async with httpx.AsyncClient(timeout=30.0, verify=settings.SSL_VERIFY) as client:
            resp = await client.post(
                self._base_url,
                params={"key": self._api_key},
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()

        raw = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
        ).strip()

        latex, confidence = _post_process(raw)
        elapsed = int((time.monotonic() - start) * 1000)
        return RecognitionResult(
            latex=latex,
            confidence=confidence,
            model=f"gemini/{self._model}",
            processing_time_ms=elapsed,
        )


class MathpixRecognizer(FormulaRecognizer):
    """Mathpix OCR API recognizer (fallback)."""

    _URL = "https://api.mathpix.com/v3/text"

    def __init__(self) -> None:
        self._app_id = settings.MATHPIX_APP_ID
        self._app_key = settings.MATHPIX_APP_KEY

    async def convert(self, image_bytes: bytes) -> RecognitionResult:
        start = time.monotonic()
        b64 = base64.b64encode(image_bytes).decode()

        payload = {
            "src": f"data:image/png;base64,{b64}",
            "formats": ["latex_simplified"],
            "include_detected_alphabets": False,
        }
        headers = {
            "app_id": self._app_id,
            "app_key": self._app_key,
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=20.0, verify=settings.SSL_VERIFY) as client:
            resp = await client.post(self._URL, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()

        latex = data.get("latex_simplified", "").strip()
        confidence = float(data.get("confidence", 0.8))
        elapsed = int((time.monotonic() - start) * 1000)
        return RecognitionResult(
            latex=latex,
            confidence=confidence,
            model="mathpix/ocr",
            processing_time_ms=elapsed,
        )


class GroqRecognizer(FormulaRecognizer):
    """Groq Cloud Vision API recognizer (OpenAI-compatible)."""

    _URL = "https://api.groq.com/openai/v1/chat/completions"

    def __init__(self) -> None:
        self._api_key = settings.GROQ_API_KEY
        self._model = settings.GROQ_MODEL

    async def convert(self, image_bytes: bytes) -> RecognitionResult:
        start = time.monotonic()
        b64 = base64.b64encode(image_bytes).decode()

        payload = {
            "model": self._model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": SYSTEM_PROMPT},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/png;base64,{b64}"},
                        },
                    ],
                }
            ],
            "temperature": 0.1,
            "max_tokens": 512,
        }
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30.0, verify=settings.SSL_VERIFY) as client:
            resp = await client.post(self._URL, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()

        raw = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        ).strip()

        latex, confidence = _post_process(raw)
        elapsed = int((time.monotonic() - start) * 1000)
        return RecognitionResult(
            latex=latex,
            confidence=confidence,
            model=f"groq/{self._model}",
            processing_time_ms=elapsed,
        )


class MockRecognizer(FormulaRecognizer):
    """Development mock — returns a sample LaTeX without calling any API."""

    async def convert(self, image_bytes: bytes) -> RecognitionResult:  # noqa: ARG002
        return RecognitionResult(
            latex=r"\frac{d}{dx}\left(x^{2}\right)=2x",
            confidence=0.99,
            model="mock",
            processing_time_ms=50,
        )


def _post_process(raw: str) -> tuple[str, float]:
    """Strip wrappers, check validity."""
    if "ERROR:UNREADABLE" in raw:
        return "", 0.0

    # Remove markdown code fences
    latex = re.sub(r"```(?:latex)?\n?(.*?)\n?```", r"\1", raw, flags=re.DOTALL)
    # Remove $$ or $ wrappers
    latex = re.sub(r"^\$\$?(.*?)\$\$?$", r"\1", latex.strip(), flags=re.DOTALL)
    # Remove \[ \] wrappers
    latex = re.sub(r"^\\\[(.*?)\\\]$", r"\1", latex.strip(), flags=re.DOTALL)

    return latex.strip(), 0.92


def get_recognizer() -> FormulaRecognizer:
    """Return appropriate recognizer based on config."""
    if settings.GROQ_API_KEY:
        return GroqRecognizer()
    if settings.GEMINI_API_KEY:
        return GeminiRecognizer()
    if settings.MATHPIX_APP_ID and settings.MATHPIX_APP_KEY:
        return MathpixRecognizer()
    # Development fallback
    return MockRecognizer()
