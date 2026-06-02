/**
 * TC-P-01: Smoke Test — VUser 1명, 5분
 * 기본 동작 확인 (에러율 0% 목표)
 *
 * 실행: k6 run tests/k6/smoke.js
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'
import { SharedArray } from 'k6/data'

// ── 커스텀 메트릭 ────────────────────────────────────────────────────────────
const errorRate = new Rate('error_rate')
const convertDuration = new Trend('convert_duration', true)

// ── 설정 ─────────────────────────────────────────────────────────────────────
export const options = {
  vus: 1,
  duration: '5m',
  thresholds: {
    error_rate: ['rate==0'],           // 에러율 0%
    http_req_duration: ['p(95)<2000'], // P95 ≤ 2s
    http_req_failed: ['rate==0'],
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000'

// ── 테스트 이미지 (1×1 흰색 PNG base64) ─────────────────────────────────────
const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

function makePngBytes() {
  const decoded = atob(TINY_PNG_B64)
  const bytes = new Uint8Array(decoded.length)
  for (let i = 0; i < decoded.length; i++) {
    bytes[i] = decoded.charCodeAt(i)
  }
  return bytes.buffer
}

// ── 사용자 등록·로그인 셋업 ──────────────────────────────────────────────────
export function setup() {
  const ts = Date.now()
  const email = `smoke_${ts}@test.com`
  const password = 'Password1'

  const regResp = http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' } },
  )
  check(regResp, { 'register 201': (r) => r.status === 201 })

  const loginResp = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' } },
  )
  check(loginResp, { 'login 200': (r) => r.status === 200 })

  return { token: loginResp.json('access_token') }
}

// ── 메인 시나리오 ─────────────────────────────────────────────────────────────
export default function (data) {
  const token = data.token

  // 1. Health check
  const healthResp = http.get(`${BASE_URL}/health`)
  check(healthResp, { 'health 200': (r) => r.status === 200 })
  errorRate.add(healthResp.status !== 200)

  sleep(0.5)

  // 2. 수식 변환 요청
  const pngBuf = makePngBytes()
  const formData = {
    file: http.file(pngBuf, 'formula.png', 'image/png'),
  }
  const start = Date.now()
  const convResp = http.post(`${BASE_URL}/api/v1/formula/convert`, formData, {
    headers: { Authorization: `Bearer ${token}` },
  })
  convertDuration.add(Date.now() - start)

  const convOk = check(convResp, {
    'convert 200': (r) => r.status === 200,
    'has latex': (r) => r.json('latex') !== undefined,
  })
  errorRate.add(!convOk)

  sleep(1)

  // 3. 이력 조회
  const histResp = http.get(`${BASE_URL}/api/v1/formula/history`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  check(histResp, { 'history 200': (r) => r.status === 200 })
  errorRate.add(histResp.status !== 200)

  sleep(1)
}
