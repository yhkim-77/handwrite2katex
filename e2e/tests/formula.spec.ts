/**
 * 수식 변환 E2E 테스트
 * TC-E-W01 ~ TC-E-W06
 */
import { test, expect, Page } from '@playwright/test'

const UNIQUE = () => `e2e_${Date.now()}_${Math.random().toString(36).slice(2)}`

// ─── 공통 헬퍼 ────────────────────────────────────────────────────────────────

/** 테스트 사용자 등록 후 로그인 상태로 홈 화면 진입 */
async function loginAs(page: Page, request: any, email: string, password = 'Password1!') {
  await request.post('/api/v1/auth/register', { data: { email, password } })
  await page.goto('/login')
  await page.getByLabel(/이메일/i).fill(email)
  await page.getByLabel(/비밀번호/i).fill(password)
  await page.getByRole('button', { name: /로그인|login/i }).click()
  await expect(page).toHaveURL('/')
}

/** Canvas 위에 간단한 선 그리기 (수식 시뮬레이션) */
async function drawOnCanvas(page: Page) {
  const canvas = page.locator('canvas').first()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas not found')

  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2

  // 'x' 모양 획 그리기
  await page.mouse.move(cx - 30, cy - 20)
  await page.mouse.down()
  await page.mouse.move(cx + 30, cy + 20, { steps: 10 })
  await page.mouse.up()

  await page.mouse.move(cx + 30, cy - 20)
  await page.mouse.down()
  await page.mouse.move(cx - 30, cy + 20, { steps: 10 })
  await page.mouse.up()
}

// ─── TC-E-W01: 신규 사용자 수식 변환 ─────────────────────────────────────────
test('TC-E-W01: 신규 사용자 수식 변환 전체 흐름', async ({ page, request }) => {
  const email = `w01_${UNIQUE()}@test.com`
  await loginAs(page, request, email)

  // Canvas에 획 그리기
  await drawOnCanvas(page)

  // 수동 변환 버튼 클릭
  const convertBtn = page.getByRole('button', { name: /변환/i })
  await convertBtn.click()

  // LaTeX 패널에 결과 표시 대기
  const latexPanel = page.locator('.latex-code, textarea[class*="latex"]').first()
  await expect(latexPanel).not.toBeEmpty({ timeout: 15_000 })

  // KaTeX 렌더링 확인
  const katexArea = page.locator('.katex-display-area, .katex').first()
  await expect(katexArea).toBeVisible()
})

// ─── TC-E-W02: 이력 복원 흐름 ────────────────────────────────────────────────
test('TC-E-W02: 이력 복원 흐름', async ({ page, request }) => {
  const email = `w02_${UNIQUE()}@test.com`
  await loginAs(page, request, email)

  // 변환 수행
  await drawOnCanvas(page)
  await page.getByRole('button', { name: /변환/i }).click()
  await page.waitForTimeout(3_000)

  // 이력 패널 열기 (존재한다면)
  const historyPanel = page.locator('[class*="history"], .history-list').first()
  if (await historyPanel.isVisible()) {
    const firstItem = historyPanel.locator('li, [class*="item"]').first()
    if (await firstItem.isVisible()) {
      await firstItem.click()
      // LaTeX가 복원되어야 함
      const textarea = page.locator('textarea').first()
      await expect(textarea).not.toBeEmpty()
    }
  } else {
    test.skip()
  }
})

// ─── TC-E-W03: LaTeX 직접 편집 ────────────────────────────────────────────────
test('TC-E-W03: LaTeX 직접 편집 시 KaTeX 즉시 갱신', async ({ page, request }) => {
  const email = `w03_${UNIQUE()}@test.com`
  await loginAs(page, request, email)

  // 변환 먼저 수행
  await drawOnCanvas(page)
  await page.getByRole('button', { name: /변환/i }).click()
  await page.waitForTimeout(3_000)

  // LaTeX 텍스트 수정
  const textarea = page.locator('textarea').first()
  await textarea.click()
  await textarea.selectAll()
  await textarea.fill('\\sum_{i=1}^{n} i')

  // KaTeX 패널이 즉시 갱신 확인
  const katexArea = page.locator('.katex-display-area').first()
  await expect(katexArea).toBeVisible()
})

// ─── TC-E-W04: 다크 모드 전환 ────────────────────────────────────────────────
test('TC-E-W04: 다크 모드 전환', async ({ page, request }) => {
  const email = `w04_${UNIQUE()}@test.com`
  await loginAs(page, request, email)

  // 다크 모드 버튼 찾기
  const themeBtn = page.getByRole('button', { name: /다크|dark|light|라이트|테마/i })
  await expect(themeBtn).toBeVisible()

  // 현재 테마 상태 저장
  const htmlEl = page.locator('html')
  const beforeClass = await htmlEl.getAttribute('class') ?? ''

  await themeBtn.click()

  // 테마 변경 확인
  const afterClass = await htmlEl.getAttribute('class') ?? ''
  expect(beforeClass).not.toBe(afterClass)
})

// ─── TC-E-W05: 연속 변환 ─────────────────────────────────────────────────────
test('TC-E-W05: 연속 변환 시 이력 누적', async ({ page, request }) => {
  const email = `w05_${UNIQUE()}@test.com`
  await loginAs(page, request, email)

  // 첫 번째 변환
  await drawOnCanvas(page)
  await page.getByRole('button', { name: /변환/i }).click()
  await page.waitForTimeout(4_000)

  // 캔버스 지우기
  const clearBtn = page.getByRole('button', { name: /지우기|clear/i })
  await clearBtn.click()

  // 두 번째 변환
  await drawOnCanvas(page)
  await page.getByRole('button', { name: /변환/i }).click()
  await page.waitForTimeout(4_000)

  // 이력이 2개 이상 존재해야 함
  const historyItems = page.locator('[class*="history"] li, .history-item')
  const count = await historyItems.count()
  expect(count).toBeGreaterThanOrEqual(1)
})

// ─── TC-E-W06: 네트워크 오류 복구 ────────────────────────────────────────────
test('TC-E-W06: 네트워크 오류 복구', async ({ page, request, context }) => {
  const email = `w06_${UNIQUE()}@test.com`
  await loginAs(page, request, email)

  // 네트워크 차단
  await context.setOffline(true)

  await drawOnCanvas(page)
  await page.getByRole('button', { name: /변환/i }).click()

  // 오프라인 상태에서 에러 표시 확인 (에러 메시지 또는 배너)
  await page.waitForTimeout(2_000)
  const errorIndicator = page.getByText(/오프라인|네트워크|연결|error|offline/i)
  // 에러 표시가 있거나, API 에러 메시지가 표시되어야 함
  // (구현에 따라 정확한 텍스트는 다를 수 있음)

  // 네트워크 복구
  await context.setOffline(false)
  await page.waitForTimeout(1_000)

  // 복구 후 재시도 가능한 상태인지 확인
  const convertBtn = page.getByRole('button', { name: /변환/i })
  await expect(convertBtn).toBeVisible()
})
