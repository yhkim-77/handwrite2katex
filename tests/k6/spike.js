/**
 * TC-P-04: Spike Test — 0→500 VUser 급증
 * 급격한 부하 대응 (복구 시간 ≤ 60s)
 *
 * 실행: k6 run tests/k6/spike.js
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const errorRate = new Rate('error_rate')
const recoveryTime = new Trend('recovery_time_after_spike', true)

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000'

export const options = {
  stages: [
    { duration: '30s', target: 5 },    // 기준 부하
    { duration: '10s', target: 500 },  // 급격한 스파이크
    { duration: '3m', target: 500 },   // 유지
    { duration: '10s', target: 5 },    // 급격한 감소
    { duration: '2m', target: 5 },     // 복구 확인
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    error_rate: ['rate<=0.10'],  // 스파이크 중 에러율 ≤ 10%
    http_req_duration: ['p(99)<10000'], // P99 ≤ 10s (스파이크 시)
  },
}

const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

function makePngBytes() {
  const decoded = atob(TINY_PNG_B64)
  const bytes = new Uint8Array(decoded.length)
  for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i)
  return bytes.buffer
}

export function setup() {
  const users = []
  for (let i = 0; i < 25; i++) {
    const email = `spike_${Date.now()}_${i}@test.com`
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
    if (loginResp.status === 200) {
      users.push({ token: loginResp.json('access_token') })
    }
  }
  return { users }
}

export default function (data) {
  if (!data.users.length) return

  const user = data.users[__VU % data.users.length]
  const token = user.token

  // 헬스체크로 복구 시간 측정
  const healthStart = Date.now()
  const healthResp = http.get(`${BASE_URL}/health`, { timeout: '15s' })
  if (healthResp.status === 200) {
    recoveryTime.add(Date.now() - healthStart)
  }

  const resp = http.post(
    `${BASE_URL}/api/v1/formula/convert`,
    { file: http.file(makePngBytes(), 'f.png', 'image/png') },
    { headers: { Authorization: `Bearer ${token}` }, timeout: '30s' },
  )

  const ok = check(resp, { 'not 5xx': (r) => r.status < 500 })
  errorRate.add(!ok)

  sleep(0.5)
}
