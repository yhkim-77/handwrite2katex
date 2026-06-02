/**
 * TC-P-02: Load Test — VUser 100명, 10분
 * 정상 부하 처리 (P95 ≤ 2s, 에러율 ≤ 1%)
 *
 * 실행: k6 run tests/k6/load.js
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'

const errorRate = new Rate('error_rate')
const convertDuration = new Trend('convert_duration', true)
const convertErrors = new Counter('convert_errors')

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000'

export const options = {
  stages: [
    { duration: '2m', target: 20 },   // Ramp-up
    { duration: '2m', target: 50 },   // 중간 부하
    { duration: '4m', target: 100 },  // 목표 부하
    { duration: '2m', target: 0 },    // Ramp-down
  ],
  thresholds: {
    error_rate: ['rate<=0.01'],         // 에러율 ≤ 1%
    http_req_duration: ['p(95)<2000'],  // P95 ≤ 2s
    http_req_duration: ['p(50)<1000'],  // P50 ≤ 1s
    convert_duration: ['p(95)<2000'],
  },
}

// ── 1×1 PNG bytes ────────────────────────────────────────────────────────────
const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

function makePngBytes() {
  const decoded = atob(TINY_PNG_B64)
  const bytes = new Uint8Array(decoded.length)
  for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i)
  return bytes.buffer
}

// ── setup: 여러 사용자 미리 등록 ──────────────────────────────────────────────
export function setup() {
  const users = []
  for (let i = 0; i < 10; i++) {
    const email = `load_${Date.now()}_${i}@test.com`
    const password = 'Password1'
    http.post(
      `${BASE_URL}/api/v1/auth/register`,
      JSON.stringify({ email, password }),
      { headers: { 'Content-Type': 'application/json' } },
    )
    const loginResp = http.post(
      `${BASE_URL}/api/v1/auth/login`,
      JSON.stringify({ email, password }),
      { headers: { 'Content-Type': 'application/json' } },
    )
    users.push({ token: loginResp.json('access_token') })
  }
  return { users }
}

export default function (data) {
  // VU마다 순환 사용
  const user = data.users[__VU % data.users.length]
  const token = user.token

  // 수식 변환
  const start = Date.now()
  const convResp = http.post(
    `${BASE_URL}/api/v1/formula/convert`,
    { file: http.file(makePngBytes(), 'f.png', 'image/png') },
    { headers: { Authorization: `Bearer ${token}` } },
  )
  convertDuration.add(Date.now() - start)

  const ok = check(convResp, {
    'convert 200': (r) => r.status === 200,
  })
  errorRate.add(!ok)
  if (!ok) convertErrors.add(1)

  sleep(Math.random() * 2 + 1) // 1~3초 Think Time
}
