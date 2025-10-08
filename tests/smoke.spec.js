const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://divscout.app';

test.describe('DivScout Smoke Tests', () => {

  test('homepage loads and displays stats', async ({ page }) => {
    await page.goto(BASE_URL);

    // Wait for stats to load
    await page.waitForSelector('.stat-card:not(.loading)', { timeout: 15000 });

    const statCards = await page.locator('.stat-card').all();
    expect(statCards.length).toBe(3);

    const totalCompanies = await page.locator('.stat-card').nth(0).locator('.stat-value').textContent();
    expect(totalCompanies).not.toBe('-');

    console.log(`✓ Stats loaded successfully`);
  });

  test('recent dividends table loads', async ({ page }) => {
    await page.goto(BASE_URL);

    await page.waitForSelector('#recent-dividends table', { timeout: 15000 });

    const rows = await page.locator('#recent-dividends tbody tr').all();
    expect(rows.length).toBeGreaterThan(0);

    console.log(`✓ Recent dividends table loaded`);
  });

  test('companies page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}#companies`);

    await page.waitForSelector('#companies-list table', { timeout: 15000 });

    const rows = await page.locator('#companies-list tbody tr').all();
    expect(rows.length).toBeGreaterThan(0);

    console.log(`✓ Companies page loaded`);
  });

  test('global search works', async ({ page }) => {
    await page.goto(BASE_URL);

    await page.waitForSelector('.stat-card:not(.loading)', { timeout: 15000 });

    await page.fill('#global-search', 'AAPL');
    await page.waitForSelector('#search-results:not(.hidden)', { timeout: 3000 });

    const results = await page.locator('.search-result-item').all();
    expect(results.length).toBeGreaterThan(0);

    console.log(`✓ Global search working`);
  });

  test('company modal opens and displays data', async ({ page }) => {
    await page.goto(BASE_URL);

    await page.waitForSelector('.stat-card:not(.loading)', { timeout: 15000 });

    await page.fill('#global-search', 'AAPL');
    await page.waitForSelector('#search-results:not(.hidden)', { timeout: 3000 });
    await page.keyboard.press('Enter');

    await page.waitForSelector('#company-modal.active', { timeout: 5000 });

    const title = await page.locator('.company-title').textContent();
    expect(title).toContain('AAPL');

    const statCards = await page.locator('#modal-body .stat-card').all();
    expect(statCards.length).toBe(3);

    console.log(`✓ Company modal opened successfully`);

    await page.locator('#modal-close').click();
  });

  test('navigation between pages works', async ({ page }) => {
    await page.goto(BASE_URL);

    await page.click('[data-page="companies"]');
    await page.waitForTimeout(500);
    expect(await page.locator('#companies-page.active').count()).toBe(1);

    await page.click('[data-page="calendar"]');
    await page.waitForTimeout(500);
    expect(await page.locator('#calendar-page.active').count()).toBe(1);

    await page.click('[data-page="dashboard"]');
    await page.waitForTimeout(500);
    expect(await page.locator('#dashboard-page.active').count()).toBe(1);

    console.log('✓ Navigation working');
  });

  test('calendar loads with date range', async ({ page }) => {
    await page.goto(`${BASE_URL}#calendar`);

    const startDate = await page.locator('#calendar-start').inputValue();
    const endDate = await page.locator('#calendar-end').inputValue();

    expect(startDate).toBeTruthy();
    expect(endDate).toBeTruthy();

    await page.click('#calendar-filter-btn');
    await page.waitForSelector('#calendar-view .calendar-grid, #calendar-view .calendar-hint', { timeout: 15000 });

    const hasResults = await page.locator('#calendar-view .calendar-grid').count();
    const hasMessage = await page.locator('#calendar-view .calendar-hint').count();

    expect(hasResults + hasMessage).toBeGreaterThan(0);

    console.log(`✓ Calendar loaded successfully`);
  });

  test('keyboard navigation in search works', async ({ page }) => {
    await page.goto(BASE_URL);

    await page.waitForSelector('.stat-card:not(.loading)', { timeout: 15000 });

    await page.fill('#global-search', 'A');
    await page.waitForSelector('#search-results:not(.hidden)', { timeout: 3000 });

    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);

    const selectedCount = await page.locator('.search-result-item.selected').count();
    expect(selectedCount).toBe(1);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    const isHidden = await page.locator('#search-results.hidden').count();
    expect(isHidden).toBe(1);

    console.log('✓ Keyboard navigation working');
  });

  test('filters work on companies page', async ({ page }) => {
    await page.goto(`${BASE_URL}#companies`);

    await page.waitForSelector('#companies-list table', { timeout: 15000 });

    const initialRows = await page.locator('#companies-list tbody tr').all();

    await page.fill('#company-search', 'Apple');
    await page.waitForTimeout(500);

    const filteredRows = await page.locator('#companies-list tbody tr').all();
    expect(filteredRows.length).toBeLessThanOrEqual(initialRows.length);

    console.log(`✓ Company search filter working`);
  });

  test('footer displays correctly', async ({ page }) => {
    await page.goto(BASE_URL);

    await page.locator('.footer').scrollIntoViewIfNeeded();

    expect(await page.locator('.footer-section').count()).toBeGreaterThan(0);

    const githubLinks = await page.locator('.footer-links a[href*="github"]').all();
    expect(githubLinks.length).toBeGreaterThan(0);

    console.log(`✓ Footer loaded successfully`);
  });

});
