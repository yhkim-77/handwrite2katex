/**
 * TC-P-03: Stress Test — VUser 500명, 10분
 * 한계 용량 확인 (에러율 ≤ 5%)
 *
 * 실행: k6 run tests/k6/stress.js
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const errorRate = new Rate('error_rate')
const convertDuration = new Trend('convert_duration', true)

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000'

export const options = {
  stages: [
    { duration: '1m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '2m', target: 350 },
    { duration: '3m', target: 500 },  // 최대 스트레스
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    error_rate: ['rate<=0.05'],  // 에러율 ≤ 5%
    http_req_failed: ['rate<=0.05'],
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
  for (let i = 0; i < 20; i++) {
    const email = `stress_${Date.now()}_${i}@test.com`
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

  const start = Date.now()
  const resp = http.post(
    `${BASE_URL}/api/v1/formula/convert`,
    { file: http.file(makePngBytes(), 'f.png', 'image/png') },
    { headers: { Authorization: `Bearer ${token}` }, timeout: '30s' },
  )
  convertDuration.add(Date.now() - start)

  const ok = check(resp, { 'success': (r) => r.status < 500 })
  errorRate.add(!ok)

  sleep(Math.random() * 1.5 + 0.5)
}
