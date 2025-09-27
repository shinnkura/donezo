import { test, expect } from '@playwright/test'

test.describe('Donezo App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
  })

  test('should display login page', async ({ page }) => {
    await expect(page).toHaveTitle(/Donezo/)
    await expect(page.locator('text=ログイン')).toBeVisible()
  })

  test('should navigate to register page', async ({ page }) => {
    await page.click('text=アカウントを作成')
    await expect(page).toHaveURL(/.*register/)
    await expect(page.locator('text=新規登録')).toBeVisible()
  })

  test('should show error with invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button:has-text("ログイン")')

    await expect(page.locator('text=メールアドレスまたはパスワードが正しくありません')).toBeVisible()
  })

  test('should register new user', async ({ page }) => {
    await page.click('text=アカウントを作成')

    const timestamp = Date.now()
    await page.fill('input[name="email"]', `test${timestamp}@example.com`)
    await page.fill('input[name="password"]', 'password123')
    await page.fill('input[name="confirmPassword"]', 'password123')
    await page.fill('input[name="name"]', 'Test User')

    await page.click('button:has-text("登録")')

    await expect(page.locator('text=アカウントが作成されました')).toBeVisible()
  })
})

test.describe('Authenticated Features', () => {
  test.use({
    storageState: 'tests/e2e/auth.json',
  })

  test('should create new task', async ({ page }) => {
    await page.goto('http://localhost:3000/tasks')
    await page.click('text=新規タスク')

    await page.fill('input[name="title"]', 'E2Eテストタスク')
    await page.selectOption('select[name="priority"]', 'HIGH')
    await page.fill('input[name="estimatePomos"]', '3')

    await page.click('button:has-text("作成")')

    await expect(page.locator('text=E2Eテストタスク')).toBeVisible()
  })

  test('should start pomodoro timer', async ({ page }) => {
    await page.goto('http://localhost:3000/timer')

    await expect(page.locator('text=25:00')).toBeVisible()
    await page.click('button:has-text("開始")')

    await page.waitForTimeout(2000)
    await expect(page.locator('text=24:5')).toBeVisible()

    await page.click('button:has-text("一時停止")')
  })

  test('should show reports', async ({ page }) => {
    await page.goto('http://localhost:3000/reports')

    await expect(page.locator('text=日別集中時間')).toBeVisible()
    await expect(page.locator('text=プロジェクト別配分')).toBeVisible()
    await expect(page.locator('text=統計サマリー')).toBeVisible()
  })
})