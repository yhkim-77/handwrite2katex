/**
 * Auth E2E 테스트 — 회원가입 / 로그인 / 로그아웃
 */
import { test, expect } from '@playwright/test'

const UNIQUE = () => `e2e_${Date.now()}_${Math.random().toString(36).slice(2)}`

// ─── 회원가입 ─────────────────────────────────────────────────────────────────
test.describe('회원가입', () => {
  test('유효한 이메일과 비밀번호로 회원가입 성공', async ({ page }) => {
    const email = `${UNIQUE()}@test.com`
    await page.goto('/register')

    await page.getByLabel(/이메일/i).fill(email)
    await page.getByLabel(/비밀번호/i).first().fill('Password1!')
    await page.getByRole('button', { name: /가입|register/i }).click()

    // 가입 성공 후 홈 또는 로그인 화면으로 이동
    await expect(page).toHaveURL(/\/|\/login/)
  })

  test('중복 이메일 가입 시 에러 메시지 표시', async ({ page }) => {
    const email = `dup_${UNIQUE()}@test.com`

    // 첫 번째 가입
    await page.goto('/register')
    await page.getByLabel(/이메일/i).fill(email)
    await page.getByLabel(/비밀번호/i).first().fill('Password1!')
    await page.getByRole('button', { name: /가입|register/i }).click()

    // 두 번째 가입 (중복)
    await page.goto('/register')
    await page.getByLabel(/이메일/i).fill(email)
    await page.getByLabel(/비밀번호/i).first().fill('Password1!')
    await page.getByRole('button', { name: /가입|register/i }).click()

    await expect(page.getByText(/이미 등록/i)).toBeVisible()
  })

  test('약한 비밀번호 가입 시 에러 표시', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel(/이메일/i).fill(`weak_${UNIQUE()}@test.com`)
    await page.getByLabel(/비밀번호/i).first().fill('short')
    await page.getByRole('button', { name: /가입|register/i }).click()

    await expect(page.getByText(/비밀번호|password/i)).toBeVisible()
  })
})

// ─── 로그인 ───────────────────────────────────────────────────────────────────
test.describe('로그인', () => {
  let testEmail: string

  test.beforeEach(async ({ request }) => {
    testEmail = `login_${UNIQUE()}@test.com`
    await request.post('/api/v1/auth/register', {
      data: { email: testEmail, password: 'Password1!' },
    })
  })

  test('정상 로그인 후 홈 화면으로 이동', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/이메일/i).fill(testEmail)
    await page.getByLabel(/비밀번호/i).fill('Password1!')
    await page.getByRole('button', { name: /로그인|login/i }).click()

    await expect(page).toHaveURL('/')
  })

  test('잘못된 비밀번호 → 에러 메시지', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/이메일/i).fill(testEmail)
    await page.getByLabel(/비밀번호/i).fill('WrongPassword!')
    await page.getByRole('button', { name: /로그인|login/i }).click()

    await expect(page.getByText(/올바르지 않/i)).toBeVisible()
  })
})

// ─── 로그아웃 ─────────────────────────────────────────────────────────────────
test.describe('로그아웃', () => {
  test('로그아웃 후 로그인 페이지로 리다이렉트', async ({ page, request }) => {
    const email = `logout_${UNIQUE()}@test.com`
    await request.post('/api/v1/auth/register', {
      data: { email, password: 'Password1!' },
    })

    await page.goto('/login')
    await page.getByLabel(/이메일/i).fill(email)
    await page.getByLabel(/비밀번호/i).fill('Password1!')
    await page.getByRole('button', { name: /로그인|login/i }).click()
    await expect(page).toHaveURL('/')

    await page.getByRole('button', { name: /로그아웃|logout/i }).click()
    await expect(page).toHaveURL('/login')
  })
})
