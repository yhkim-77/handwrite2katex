FROM python:3.12-slim

WORKDIR /app

# System dependencies for Pillow + OpenCV (required by pix2tex)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc libjpeg-dev zlib1g-dev \
    libgl1 libglib2.0-0 libsm6 libxrender1 libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Bypass corporate SSL proxy (Somansa DLP) for all pip downloads
RUN pip config set global.trusted-host \
    "pypi.org files.pythonhosted.org pypi.python.org download.pytorch.org download-r2.pytorch.org"

# Install CPU-only torch first so pix2tex won't pull GPU version (~2GB)
RUN pip install --no-cache-dir \
    torch==2.5.1 torchvision==0.20.1 \
    --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download pix2tex model weights during build (bypass Somansa SSL proxy)
RUN python3 -c "\
import ssl, requests, urllib3; \
ssl._create_default_https_context = ssl._create_unverified_context; \
urllib3.disable_warnings(); \
_orig = requests.Session.request; \
requests.Session.request = lambda self, *a, **kw: _orig(self, *a, **dict(kw, verify=False)); \
from pix2tex.cli import LatexOCR; \
_ = LatexOCR(); \
print('pix2tex model pre-loaded') \
"

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
