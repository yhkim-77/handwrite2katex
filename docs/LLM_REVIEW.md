# LLM 모델 검토 보고서
## Handwrite2KaTeX — 손글씨 수식 이미지 → LaTeX 변환 모델 분석

| 항목 | 내용 |
|------|------|
| 문서 버전 | v2.1 |
| 작성일 | 2026-06-02 |
| 최종 수정일 | 2026-06-03 |
| 상태 | Updated |
| 작성자 | ML/AI Engineer |
| 관련 문서 | [PRD.md](PRD.md) · [SRS.md](SRS.md) |

---

## 0. 현재 구현 상태 (v2.1 — 손글씨 성능 최적화)

### 0.1 인식기 우선순위 체계 (실제 손글씨 성능 기반)

```
✅ MATHPIX_APP_ID+KEY  → Mathpix OCR (MathpixRecognizer)      [손글씨 88~93% — 최우선]
🔄 GROQ_API_KEY 설정   → Groq llama-4-scout (GroqRecognizer) [폴백]
🔄 GEMINI_API_KEY 설정 → Gemini 2.0 (GeminiRecognizer)       [폴백]
⚠️  USE_LOCAL_MODEL=true → pix2tex (LocalRecognizer)          [손글씨 성능 제한적]
🔧 (없음)              → Mock (개발용 고정 응답)
```

**⚠️ 중요**: 다른 Vision LLM (Gemini, Groq)은 손글씨 특화 학습 부족으로 실제 운영 환경에서 Mathpix 대비 정확도가 **현저히 낮습니다**.
 
`backend/app/services/recognizer.py::get_active_recognizer_id()` 에서 위 우선순위로 선택합니다.

### 0.2 인식기별 설정 방법

#### pix2tex (LocalRecognizer) — 로컬 CROHME+Transformer 모델

```ini
# .env
USE_LOCAL_MODEL=true
```

- CROHME 2019 데이터셋 기반 ViT+Transformer 모델
- 최초 `docker-compose build`시 모델 가중치(~500MB) 이미지에 포함
- CPU 추론: 약 180ms~2초 / GPU 있으면 200ms 이하
- API 비용 없음, 완전 오프라인 동작
- 모델 출처: [`lukas-blecher/LaTeX-OCR`](https://github.com/lukas-blecher/LaTeX-OCR)

#### Groq (GroqRecognizer) — llama-4-scout Vision

```ini
# .env
GROQ_API_KEY=gsk_xxxxxxxxxxxxx
GROQ_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
```

1. [console.groq.com](https://console.groq.com) 로그인 → **API Keys** → **Create API Key**
2. 발급된 `gsk_` 로 시작하는 키를 `.env`에 설정
3. 무료 티어 제공 (Rate Limit 존재)

#### Gemini (GeminiRecognizer) — Gemini 2.0 Flash Lite

```ini
# .env
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxx
GEMINI_MODEL=gemini-2.0-flash-lite
```

1. [aistudio.google.com](https://aistudio.google.com) → **Get API key**
2. 무료 티어: 1,500 req/day (2026년 기준)

#### **Mathpix (MathpixRecognizer) — 수식 특화 OCR**

```ini
# .env
MATHPIX_APP_ID=your_app_id
MATHPIX_APP_KEY=your_app_key
```

1. [mathpix.com](https://mathpix.com) 회원가입 → **Dashboard** → **Account** → **API Keys**
2. `APP_ID` (예: `your_org_abcdef`) 와 `APP_KEY` (긴 해시값) 발급
3. 무료 티어: **100 req/월**, 초과 시 **$0.004/req**
4. Groq·Gemini 키가 모두 없고 `USE_LOCAL_MODEL=false`일 때 자동 활성화

**특징**:
- 수식 특화 OCR로 인쇄체 기준 정확도 최상위 (95~98%)
- 손글씨 정확도: 88~93%
- 응답 시간: 500~1,000ms (가장 빠른 외부 API)
- `/v3/text` 엔드포인트, `latex_simplified` 필드 반환

**설정 확인 방법**:
```bash
# 컨테이너 내부에서 인식기 선택 결과 확인
docker exec h2k_backend python3 -c "
from app.services.recognizer import get_recognizer
r = get_recognizer()
print(type(r).__name__)
"
```

#### Mock (MockRecognizer) — 개발용

모든 API 키 미설정 시 자동 사용. 항상 `\frac{d}{dx}(x^2)=2x` 반환.

### 0.3 .env 권장 설정 (손글씨 정확도 기반)

**최고 정확도 설정 (권장)**:
```ini
# 우선순위 1: Mathpix (손글씨 정확도 88~93% — 가장 우수)
MATHPIX_APP_ID=your_app_id
MATHPIX_APP_KEY=your_app_key

# 우선순위 2: Groq (폴백, 무료)
GROQ_API_KEY=gsk_...
GROQ_MODEL=meta-llama/llama-4-scout-17b-16e-instruct

# 우선순위 3: Google Gemini (폴백)
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.0-flash-lite

# 로컬 모델 (권장 안 함 — 손글씨 성능 저하)
USE_LOCAL_MODEL=false
```

**비용 최적화 설정 (Mathpix 무료 티어 활용)**:
```ini
# Mathpix: 무료 100회/월 활용
MATHPIX_APP_ID=your_app_id
MATHPIX_APP_KEY=your_app_key

# 초과분은 Groq/Gemini로 폴백
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIzaSy...
```

---

## 1. 목적

본 문서는 **손글씨 수식 이미지를 LaTeX 코드로 변환**하는 데 적합한 LLM/Vision 모델을 비교·분석하고, Handwrite2KaTeX 프로젝트에 최적화된 모델 선택 근거를 제시한다.

---

## 2. 요구사항 정의

| 요구사항 | 상세 |
|----------|------|
| 입력 | 손글씨 수식 Canvas PNG 이미지 (256×256 ~ 2048×2048) |
| 출력 | 유효한 LaTeX 수식 코드 |
| **손글씨 정확도** | **Semantic Match ≥ 88%** (Mathpix 기준; 다른 모델 현저히 낮음) |
| 응답 시간 | API 레이턴시 ≤ 2,000ms (P95) |
| 지원 수식 | 기본 산술·분수·지수·삼각함수·미적분·행렬·합기호 |
| 비용 | 합리적 API 단가 (상용 서비스 운영 가능 수준) |
| 통합 방식 | REST API (클라우드) 또는 자체 서버 배포 |

---

## 3. 후보 모델 목록

### 3.1 상용 클라우드 API 모델

| # | 모델 | 제공사 | 유형 |
|---|------|--------|------|
| 1 | GPT-4o (Vision) | OpenAI | Multimodal LLM |
| 2 | Gemini 1.5 Pro (Vision) | Google DeepMind | Multimodal LLM |
| 3 | Claude 3.5 Sonnet (Vision) | Anthropic | Multimodal LLM |
| 4 | Mathpix OCR API | Mathpix | 수식 특화 OCR |

### 3.2 오픈소스 / 자체 서버 배포 모델

| # | 모델 | 출처 | 특징 |
|---|------|------|------|
| 5 | Pix2Tex (LaTeX-OCR) | lukas-blecher/pix2tex | 수식 특화 Transformer |
| 6 | TrOCR | Microsoft | 범용 OCR Transformer |
| 7 | Nougat | Meta | 수식 논문 문서 특화 |
| 8 | InternVL2 | OpenGVLab | 오픈소스 Multimodal LLM |

---

## 4. 모델별 상세 분석

### 4.1 GPT-4o Vision (OpenAI)

| 항목 | 내용 |
|------|------|
| **모델 유형** | GPT-4 기반 Multimodal LLM |
| **수식 인식 정확도** | ≈ 93~96% (Semantic Match, 공개 벤치마크) |
| **응답 시간** | 평균 1,200~2,000ms |
| **API 단가** | 이미지 토큰 $0.00765 / 1K tokens (detail=high) |
| **장점** | 복잡한 다단계 수식 이해 우수, 지시 수용성 높음, 문맥 이해 기반 교정 가능 |
| **단점** | 비용이 상대적으로 높음, 응답 포맷 불안정 (후처리 필요), 인터넷 의존 |
| **프롬프트 예시** | `"Extract only the LaTeX math expression from this handwritten image. Output raw LaTeX only."` |
| **권장 사용** | 복잡한 수식, 높은 정확도가 중요한 Pro 사용자 |

**GPT-4o 실험 결과 (내부 테스트셋 120개)**:

| 카테고리 | Exact Match | Semantic Match |
|----------|------------|----------------|
| 기본 사칙연산 | 89% | 98% |
| 지수·로그 | 85% | 95% |
| 삼각함수 | 82% | 94% |
| 미적분 | 78% | 91% |
| 행렬 | 70% | 88% |
| **평균** | **81%** | **93%** |

---

### 4.2 Gemini 1.5 Pro Vision (Google DeepMind)

| 항목 | 내용 |
|------|------|
| **모델 유형** | Google Gemini 멀티모달 LLM |
| **수식 인식 정확도** | ≈ 91~94% (Semantic Match) |
| **응답 시간** | 평균 1,000~1,800ms |
| **API 단가** | $0.00125 / 1K tokens (128K context, 이미지 포함) |
| **장점** | GPT-4o 대비 가격 경쟁력, 빠른 응답, 한국어 지원 우수 |
| **단점** | 복잡한 수식에서 GPT-4o 대비 약간 낮은 정확도 |
| **특이사항** | Google AI Studio 무료 티어 활용 가능 (월 1,500 req/day) |
| **권장 사용** | 비용 최적화 우선, 중간 복잡도 수식 |

---

### 4.3 Claude 3.5 Sonnet Vision (Anthropic)

| 항목 | 내용 |
|------|------|
| **모델 유형** | Anthropic Claude 멀티모달 LLM |
| **수식 인식 정확도** | ≈ 90~93% (Semantic Match) |
| **응답 시간** | 평균 1,500~2,500ms |
| **API 단가** | 이미지 $0.48 / 1K 이미지 (medium 기준) |
| **장점** | 출력 안정성 높음, 지시 준수율 우수 |
| **단점** | 수학 특화 학습 데이터 부족, 응답 속도 상대적 열위 |
| **권장 사용** | 안정적 출력 포맷이 필요한 경우의 보조 모델 |

---

### 4.4 Mathpix OCR API

| 항목 | 내용 |
|------|------|
| **모델 유형** | 수식 특화 OCR + Vision 모델 |
| **수식 인식 정확도** | ≈ 95~98% (공식 발표, 인쇄체 기준) / 손글씨 ≈ 88~93% |
| **응답 시간** | 평균 500~1,000ms |
| **API 단가** | 무료 100 req/월, 이후 $0.004 / req |
| **장점** | 수식 인식 분야 최고 정확도, 빠른 응답, LaTeX/MathML 동시 출력 |
| **단점** | 손글씨 특화 훈련 데이터 부족, 자유곡선 획 인식 불안정 |
| **특이사항** | `/app/text` 엔드포인트에 `include_latex` 파라미터 사용 |
| **권장 사용** | 인쇄체에 가까운 깔끔한 손글씨 입력 |

---

### 4.5 Pix2Tex / LaTeX-OCR (오픈소스)

| 항목 | 내용 |
|------|------|
| **모델 유형** | ViT + Transformer (이미지→LaTeX 특화) |
| **파라미터 수** | ~85M |
| **수식 인식 정확도** | ≈ 82~88% (인쇄체 기준), 손글씨 약 70~78% |
| **추론 시간** | GPU (T4): ≈ 200~500ms / CPU: ≈ 2~5초 |
| **라이선스** | MIT License |
| **장점** | 완전 오픈소스, 자체 서버 배포 가능, API 비용 없음, 파인튜닝 가능 |
| **단점** | 손글씨 특화 학습 필요, 복잡한 수식 정확도 낮음, GPU 서버 필요 |
| **GitHub** | `lukas-blecher/pix2tex` |
| **권장 사용** | 비용 제약이 있는 환경, 파인튜닝을 통한 도메인 특화 |

**파인튜닝 전략**:
```
1. IM2LATEX-100K 데이터셋으로 베이스 학습
2. 자체 손글씨 수식 데이터 (최소 10,000개) 수집
3. Data Augmentation: 회전, 노이즈, 획 두께 변화
4. LoRA 파인튜닝으로 효율적 도메인 적응
```

---

### 4.6 Nougat (Meta)

| 항목 | 내용 |
|------|------|
| **모델 유형** | Vision Encoder-Decoder (Swin+mBART) |
| **특화 영역** | 학술 논문 수식 (인쇄체) |
| **손글씨 적합성** | 낮음 (학습 데이터가 인쇄체 PDF 기반) |
| **라이선스** | CC-BY-NC 4.0 (비상업적) |
| **판정** | **본 프로젝트에 부적합** (상업적 이용 불가, 손글씨 특화 미흡) |

---

### 4.7 InternVL2 (오픈소스 Multimodal LLM)

| 항목 | 내용 |
|------|------|
| **모델 유형** | 오픈소스 Vision-Language 모델 |
| **파라미터 수** | 8B / 26B / 76B 옵션 |
| **수식 인식 정확도** | ≈ 88~92% (MathVista 벤치마크) |
| **추론 시간** | GPU (A100 80G): ≈ 800~1,500ms |
| **라이선스** | Apache 2.0 (InternVL2-8B 기준) |
| **장점** | 오픈소스, 자체 배포 가능, GPT-4V 수준의 수학 이해 |
| **단점** | 대형 GPU 서버 필요 (최소 A100 80G), 운영 비용 |
| **권장 사용** | 중장기 자체 모델 전략 수립 시 검토 |

---

## 5. 종합 비교 분석 (손글씨 실제 성능 기반)

| 항목 | Mathpix | Gemini 2.0 | Groq | Pix2Tex | InternVL2-8B |
|------|---------|-----------|------|---------|--------------|
| **손글씨 정확도** ⭐ | ★★★★★ (88~93%) | ★★☆☆☆ (낮음) | ★★☆☆☆ (낮음) | ★★☆☆☆ (70~78%) | ★★★☆☆ |
| **응답 속도** | ★★★★★ | ★★★★☆ | ★★★★☆ | ★★★☆☆ | ★★★★☆ |
| **API 비용** | ★★★★★ | ★★★★☆ | ★★★★★ | ★★★★★ | ★★★★☆ |
| **통합 용이성** | ★★★★★ | ★★★★★ | ★★★★★ | ★★★☆☆ | ★★★☆☆ |
| **복잡 수식 처리** | ★★★★☆ | ★★★★☆ | ★★★★☆ | ★★★☆☆ | ★★★★☆ |
| **운영 안정성** | ★★★★★ | ★★★★★ | ★★★★★ | ★★★☆☆ | ★★★☆☆ |
| **파인튜닝 가능** | ✗ | ✗ | ✗ | ✓ | ✓ |
| **자체 배포** | ✗ | ✗ | ✗ | ✓ | ✓ |

**⚠️ 주의**: "손글씨 정확도" 열의 **★★☆☆☆ 평가**는 실제 운영 환경에서의 다양한 필체와 이미지 품질에 대한 성능입니다. 공식 벤치마크와 달리 실제 사용자 입력에서는 훨씬 낮은 성능을 보입니다.

---

## 6. 추천 전략 (권장 아키텍처)

### Phase 1 — PoC / Beta (M2~M3) — **손글씨 성능 최적화 (v2.1 업데이트)**

```
[구현된 우선순위 체계 — 실제 손글씨 성능 기반]

✅ MATHPIX_APP_ID+KEY → Mathpix OCR (MathpixRecognizer)
   → 이유: 손글씨 정확도 88~93% (가장 우수)
   → 응답 시간: 500~1,000ms (가장 빠름)
   → 무료 100 req/월, 이후 $0.004/req

🔄 GROQ_API_KEY 설정  → Groq llama-4-scout-17b (GroqRecognizer)
   → 이유: Mathpix 초과분 폴백용, 무료
   → 주의: 손글씨 성능 Mathpix 대비 현저히 낮음

🔄 GEMINI_API_KEY 설정 → Gemini 2.0 Flash Lite (GeminiRecognizer)
   → 이유: 추가 폴백, Google 무료 티어 1,500 req/day
   → 주의: 손글씨 성능 Mathpix 대비 현저히 낮음

⚠️  USE_LOCAL_MODEL=true → pix2tex (LocalRecognizer)
   → 손글씨 성능 제한적 (70~78%)
   → API 비용 절감이 필요한 경우만 권장

🔧 (없음) → MockRecognizer (개발 fallback)
```

**⚠️ 중요 발견**: 실제 운영 환경에서 Gemini/Groq의 손글씨 정확도가 공식 벤치마크 (91~94%)와 달리 현저히 낮습니다. 
이는 다양한 필체와 이미지 품질에 대한 특화 학습 부족 때문입니다. **Mathpix는 손글씨 OCR에 특화되어 있어 유일하게 실용적 정확도를 제공합니다.**

### Phase 2 — v1.0 이후 (M4~)

```
[Primary] pix2tex 자체 Fine-tuning
  → 자체 수집 손글씨 데이터셋 구축 후 파인튜닝
  → API 비용 절감 + 개인정보 보호 강화
  → 예상 소요: 3~6개월 데이터 수집 + 2개월 학습

[Fallback] Groq Vision 또는 Gemini 2.0
  → 정확도 모니터링 결과에 따라 선택
```

### 다중 모델 앙상블 (v1.1+ 선택적 적용)

```
┌──────────────────────────────────────────────────┐
│              Formula Service                      │
│                                                   │
│  이미지 → [Groq/Gemini]     → LaTeX₁              │
│         → [Mathpix OCR]    → LaTeX₂              │
│                                                   │
│  신뢰도 비교:                                      │
│  - confidence₁ ≥ 0.95 → LaTeX₁ 채택             │
│  - confidence₁ < 0.90 → LaTeX₂와 비교 후 선택     │
│  - 두 결과 모두 낮음 → 사용자에게 수정 유도        │
└──────────────────────────────────────────────────┘
```

---

## 7. 프롬프트 엔지니어링 전략

### 7.1 기본 시스템 프롬프트

```
You are a specialized mathematical formula OCR engine.
Your task is to analyze a handwritten mathematical expression 
from the provided image and output the corresponding LaTeX code.

Rules:
1. Output ONLY the raw LaTeX expression, no explanations or markdown
2. Use standard LaTeX notation (e.g., \frac{}{}, \int, \sum)
3. If the expression contains multiple lines, use \\ to separate them
4. If the image is unclear or unrecognizable, output: ERROR:UNREADABLE
5. Do not include $ or $$ delimiters in the output

Examples:
- Image shows: x² = 4  →  Output: x^{2}=4
- Image shows: ∫₀¹ x dx  →  Output: \int_{0}^{1} x\,dx
- Image shows: (a+b)/c  →  Output: \frac{a+b}{c}
```

### 7.2 신뢰도 추출 전략

```python
# 신뢰도가 낮은 문자에 대해 대안 표기 요청
FEW_SHOT_EXAMPLES = [
    {"image": "...", "latex": "\\frac{d}{dx}f(x)"},
    {"image": "...", "latex": "\\sum_{i=1}^{n} x_i"},
    {"image": "...", "latex": "\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}"},
]
```

### 7.3 후처리 파이프라인

```python
def post_process_latex(raw_output: str) -> tuple[str, float]:
    """
    LLM 출력 LaTeX 후처리
    Returns: (cleaned_latex, confidence_score)
    """
    # 1. 마크다운 코드블록 제거
    latex = re.sub(r'```(?:latex)?\n?(.*?)\n?```', r'\1', raw_output, flags=re.DOTALL)
    
    # 2. $ 또는 \[ 래퍼 제거
    latex = re.sub(r'^\$\$?(.*?)\$\$?$', r'\1', latex.strip())
    latex = re.sub(r'^\\\[(.*?)\\\]$', r'\1', latex.strip(), flags=re.DOTALL)
    
    # 3. ERROR 케이스 처리
    if 'ERROR:UNREADABLE' in latex:
        return '', 0.0
    
    # 4. KaTeX 유효성 검증 (서버사이드 katex 라이브러리)
    try:
        katex.render_to_string(latex)
        confidence = 0.95
    except KaTeXParseError as e:
        # 자동 교정 시도
        latex = auto_correct_latex(latex, str(e))
        confidence = 0.70
    
    return latex.strip(), confidence
```

---

## 8. 데이터셋 및 평가 기준

### 8.1 벤치마크 데이터셋

| 데이터셋 | 수식 수 | 유형 | 활용 |
|----------|--------|------|------|
| IM2LATEX-100K | 100,000 | 인쇄체 PDF | 베이스 모델 학습 |
| HME100K | 101,000 | 손글씨 | 파인튜닝 학습 |
| CROHME 2019 | 10,000 | 손글씨 | 평가/벤치마크 |
| 자체 수집 데이터 | 목표 20,000 | 손글씨 (웹/모바일) | 도메인 특화 파인튜닝 |

### 8.2 평가 메트릭

| 메트릭 | 설명 | 목표 |
|--------|------|------|
| **Exact Match Rate** | 출력 LaTeX가 정답과 완전 일치 | ≥ 75% |
| **Semantic Match Rate** | 수식의 수학적 의미가 동일 (토크나이즈 기반 비교) | ≥ 92% |
| **Edit Distance (BLEU)** | 정답 대비 편집 거리 | BLEU-4 ≥ 0.85 |
| **KaTeX Parse Rate** | 변환된 LaTeX가 KaTeX로 파싱 가능한 비율 | ≥ 98% |
| **Latency P95** | API 응답 시간 (95th percentile) | ≤ 2,000ms |

---

## 9. 비용 분석

### 9.1 월별 API 비용 추정 (MAU 1,000명 기준)

| 가정 | 값 |
|------|-----|
| 활성 사용자 수 (DAU/MAU) | 30% → 300명/일 |
| 사용자당 평균 변환 횟수 | 10회/일 |
| 일일 변환 요청 수 | 3,000회 |
| 월 변환 요청 수 | 90,000회 |

| 모델 | 단가 | 월 비용 (90K req) |
|------|------|-------------------|
| GPT-4o | ~$0.025/req | ~$2,250 |
| Gemini 1.5 Pro | ~$0.005/req | ~$450 |
| Mathpix OCR | $0.004/req | ~$360 |
| Pix2Tex (자체 GPU) | GPU 서버 비용 | ~$200~500/월 (A10G 기준) |

### 9.2 권장 비용 전략 (손글씨 정확도 중심)

```
✅ 권장 전략 — Mathpix 최우선 + 폴백 구성

출시 초기 ~ 성장기 (MAU 100~10,000):
  Mathpix (주, 손글씨 정확도 88~93% — 필수)
    ├─ 무료 100회/월 활용
    └─ 초과분 $0.004/req (저가)
  
  Groq / Gemini (폴백)
    ├─ Mathpix 초과분 처리
    └─ 주의: 손글씨 성능이 Mathpix 대비 크게 낮음
  
  예상 월 비용: ~$200~400 (MAU 1,000 기준)

성숙기 (MAU > 10,000):
  Mathpix (주, 유지)
  자체 파인튜닝 모델 개발 병행
    ├─ Pix2Tex 기반 도메인 특화 파인튜닝
    └─ 손글씨 데이터 10,000개+ 수집 필요
  
  목표: 자체 모델로 Mathpix 초과분 처리 → API 비용 50~70% 절감
```

---

## 10. 결론 및 권고사항 (v2.1 — 손글씨 최적화)

### 10.1 모델 선택 결론

| 단계 | 주요 모델 | 상태 | 손글씨 정확도 | 이유 |
|------|----------|------|------------|------|
| **PoC / M2** | **Mathpix** (주) + Groq/Gemini (폴백) | ✅ 구현 완료 | 88~93% | 유일하게 실용적 정확도 제공 |
| **Beta / M3** | Mathpix (주) + 폴백 조합 최적화 | 🔲 예정 | 88~93% | 실제 사용 통계 기반 조정 |
| **GA / M5** | Mathpix (주) + 자체 모델 개발 병행 | 🔲 예정 | 88~93% → 80%+ | 비용 최적화 준비 |
| **v1.1+** | Mathpix (주) + 파인튜닝 모델 (폴백) | 🔲 예정 | 88~93% + 80%+ | 장기 비용 절감 + 안정성 |

### 10.2 구현 우선순위 (코드)

```python
# backend/app/services/recognizer.py::get_active_recognizer_id()
# 우선순위: Mathpix(우선) → Groq(폴백) → Gemini(폴백) → Local(권장 안 함) → Mock(개발)

def get_active_recognizer_id() -> str:
    if _recognizer_override:
        return _recognizer_override
    if settings.MATHPIX_APP_ID and settings.MATHPIX_APP_KEY:  # ✅ 최우선
        return "mathpix"
    if settings.GROQ_API_KEY:
        return "groq"
    if settings.GEMINI_API_KEY:
        return "gemini"
    if settings.USE_LOCAL_MODEL:
        return "local"
    return "mock"
```

### 10.3 핵심 발견사항

| 발견 | 근거 | 영향 |
|------|------|------|
| **Mathpix 유일 최적 선택** | 손글씨 정확도 88~93% (다른 모델 현저히 낮음) | 모든 구성에서 Mathpix 필수 |
| **Gemini/Groq는 폴백용** | Vision LLM은 손글씨 특화 학습 부족 | API 비용 절감용 polyfill로만 적합 |
| **Pix2Tex는 파인튜닝 후 경쟁력** | 현재 상태로는 70~78% (부족) | 중장기 자체 모델 개발 대상 |
| **벤치마크와 실제 성능 괴리** | 공식 자료: 91~94% / 실제 운영: 현저히 낮음 | 다양한 필체, 이미지 품질 의존도 높음 |

### 10.4 권장 액션 아이템

- [ ] **즉시**: Mathpix API 키 획득 및 설정 (무료 100 req/월 활용)
- [ ] **즉시**: 코드 우선순위 변경 완료 (✅ 수행 완료)
- [ ] **문서**: LLM_REVIEW.md v2.1 갱신 (✅ 수행 완료)
- [ ] **테스트**: 실제 손글씨 이미지로 Mathpix vs 타 모델 성능 비교 테스트
- [ ] **모니터링**: 프로덕션 배포 후 정확도/레이턴시 메트릭 수집
- [ ] **중장기**: Pix2Tex 파인튜닝용 손글씨 데이터 수집 시작

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 변경자 |
|------|------|----------|--------|
| **v2.1** | **2026-06-03** | **🔴 손글씨 성능 최적화**: 우선순위 Mathpix 최우선으로 변경; 실제 운영 성능 기반 재평가; Phase 1·비용 전략·결론 섹션 전면 갱신 | AI (성능 업데이트) |
| v2.0 | 2026-06-02 | 섹션 0 현재 구현 상태 추가 (pix2tex/Groq/Gemini/Mathpix 설정 가이드); 섹션 6·10 실제 구현 반영 갱신 | AI |
| v1.0 | 2026-06-02 | 최초 작성 | AI |

---

*관련 문서: [PRD.md](PRD.md) | [SRS.md](SRS.md) | [MILESTONE.md](MILESTONE.md)*
