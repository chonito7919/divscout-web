const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://divscout.app';

test.describe('DivScout E2E Tests', () => {

  test.describe('Dashboard Page', () => {
    test('should load stats correctly', async ({ page }) => {
      await page.goto(BASE_URL);

      // Wait for stats to load
      await page.waitForSelector('.stat-card:not(.loading)', { timeout: 10000 });

      // Check all three stat cards loaded
      const statCards = await page.locator('.stat-card').all();
      expect(statCards.length).toBe(3);

      // Check stat values are not empty or "-"
      const totalCompanies = await page.locator('.stat-card').nth(0).locator('.stat-value').textContent();
      const totalDividends = await page.locator('.stat-card').nth(1).locator('.stat-value').textContent();
      const companiesWithDividends = await page.locator('.stat-card').nth(2).locator('.stat-value').textContent();

      expect(totalCompanies).not.toBe('-');
      expect(totalDividends).not.toBe('-');
      expect(companiesWithDividends).not.toBe('-');

      console.log(`Stats - Companies: ${totalCompanies}, Dividends: ${totalDividends}, Paying: ${companiesWithDividends}`);
    });

    test('should load recent dividends table', async ({ page }) => {
      await page.goto(BASE_URL);

      // Wait for table to load
      await page.waitForSelector('#recent-dividends table', { timeout: 10000 });

      // Check table has rows
      const rows = await page.locator('#recent-dividends tbody tr').all();
      expect(rows.length).toBeGreaterThan(0);

      // Check table headers
      const headers = await page.locator('#recent-dividends th').allTextContents();
      expect(headers).toContain('Ticker');
      expect(headers).toContain('Company');
      expect(headers).toContain('Ex-Dividend Date');
      expect(headers).toContain('Amount');
      expect(headers).toContain('Frequency');

      console.log(`Recent dividends: ${rows.length} rows loaded`);
    });

    test('should change pagination limit', async ({ page }) => {
      await page.goto(BASE_URL);

      await page.waitForSelector('#recent-dividends table', { timeout: 10000 });

      // Change limit to 10
      await page.selectOption('#recent-limit', '10');

      // Wait a bit for re-render
      await page.waitForTimeout(500);

      // Count rows (should be 10 or less)
      const rows = await page.locator('#recent-dividends tbody tr').all();
      expect(rows.length).toBeLessThanOrEqual(10);

      console.log(`After changing to 10 per page: ${rows.length} rows`);
    });

    test('should navigate pagination', async ({ page }) => {
      await page.goto(BASE_URL);

      await page.waitForSelector('#recent-dividends table', { timeout: 10000 });

      // Check if pagination controls exist
      const paginationExists = await page.locator('#pagination-controls .pagination').count();

      if (paginationExists > 0) {
        const nextButton = page.locator('#pagination-controls button:has-text("Next")');

        if (await nextButton.isEnabled()) {
          await nextButton.click();
          await page.waitForTimeout(500);

          // Check URL or page content changed
          const pageInfo = await page.locator('.pagination-info').textContent();
          expect(pageInfo).toContain('Page 2');

          console.log('Pagination working:', pageInfo);
        } else {
          console.log('Only one page of results, pagination disabled');
        }
      } else {
        console.log('No pagination needed (all results fit on one page)');
      }
    });

    test('should open company modal from recent dividends', async ({ page }) => {
      await page.goto(BASE_URL);

      await page.waitForSelector('#recent-dividends table', { timeout: 10000 });

      // Click first ticker link
      await page.locator('#recent-dividends .ticker-link').first().click();

      // Wait for modal
      await page.waitForSelector('#company-modal.active', { timeout: 5000 });

      // Check modal content
      const modalTitle = await page.locator('.company-title').textContent();
      expect(modalTitle).toBeTruthy();

      console.log('Modal opened for:', modalTitle);

      // Close modal
      await page.locator('#modal-close').click();
      await page.waitForSelector('#company-modal:not(.active)', { timeout: 2000 });
    });
  });

  test.describe('Companies Page', () => {
    test('should load companies list', async ({ page }) => {
      await page.goto(`${BASE_URL}#companies`);

      // Wait for companies table
      await page.waitForSelector('#companies-list table', { timeout: 10000 });

      // Check table has rows
      const rows = await page.locator('#companies-list tbody tr').all();
      expect(rows.length).toBeGreaterThan(0);

      // Check headers
      const headers = await page.locator('#companies-list th').allTextContents();
      expect(headers).toContain('Ticker');
      expect(headers).toContain('Company Name');
      expect(headers).toContain('Sector');
      expect(headers).toContain('Industry');

      console.log(`Companies loaded: ${rows.length} companies`);
    });

    test('should filter companies by search', async ({ page }) => {
      await page.goto(`${BASE_URL}#companies`);

      await page.waitForSelector('#companies-list table', { timeout: 10000 });

      const initialRows = await page.locator('#companies-list tbody tr').all();

      // Search for "AAPL"
      await page.fill('#company-search', 'AAPL');
      await page.waitForTimeout(500);

      const filteredRows = await page.locator('#companies-list tbody tr').all();
      expect(filteredRows.length).toBeLessThanOrEqual(initialRows.length);

      // Check that results contain AAPL
      const firstTicker = await page.locator('#companies-list tbody tr').first().locator('.ticker-link').textContent();
      expect(firstTicker).toContain('AAPL');

      console.log(`Search "AAPL": ${filteredRows.length} results`);
    });

    test('should filter by sector', async ({ page }) => {
      await page.goto(`${BASE_URL}#companies`);

      await page.waitForSelector('#companies-list table', { timeout: 10000 });

      // Get available sectors
      const sectorOptions = await page.locator('#sector-filter option').all();

      if (sectorOptions.length > 1) {
        // Select second option (first is "All Sectors")
        const sectorValue = await sectorOptions[1].getAttribute('value');
        await page.selectOption('#sector-filter', sectorValue);
        await page.waitForTimeout(500);

        const rows = await page.locator('#companies-list tbody tr').all();
        expect(rows.length).toBeGreaterThan(0);

        console.log(`Sector filter "${sectorValue}": ${rows.length} companies`);
      } else {
        console.log('No sector filters available');
      }
    });

    test('should filter by industry', async ({ page }) => {
      await page.goto(`${BASE_URL}#companies`);

      await page.waitForSelector('#companies-list table', { timeout: 10000 });

      // Get available industries
      const industryOptions = await page.locator('#industry-filter option').all();

      if (industryOptions.length > 1) {
        // Select second option
        const industryValue = await industryOptions[1].getAttribute('value');
        await page.selectOption('#industry-filter', industryValue);
        await page.waitForTimeout(500);

        const rows = await page.locator('#companies-list tbody tr').all();
        expect(rows.length).toBeGreaterThan(0);

        console.log(`Industry filter "${industryValue}": ${rows.length} companies`);
      } else {
        console.log('No industry filters available');
      }
    });

    test('should open company modal from companies list', async ({ page }) => {
      await page.goto(`${BASE_URL}#companies`);

      await page.waitForSelector('#companies-list table', { timeout: 10000 });

      // Click first ticker
      const ticker = await page.locator('#companies-list .ticker-link').first().textContent();
      await page.locator('#companies-list .ticker-link').first().click();

      // Wait for modal
      await page.waitForSelector('#company-modal.active', { timeout: 5000 });

      const modalTitle = await page.locator('.company-title').textContent();
      expect(modalTitle).toContain(ticker);

      console.log('Modal opened from companies list:', modalTitle);

      // Close modal
      await page.locator('#modal-close').click();
    });
  });

  test.describe('Calendar Page', () => {
    test('should load calendar with date range', async ({ page }) => {
      await page.goto(`${BASE_URL}#calendar`);

      // Dates should be pre-filled
      const startDate = await page.locator('#calendar-start').inputValue();
      const endDate = await page.locator('#calendar-end').inputValue();

      expect(startDate).toBeTruthy();
      expect(endDate).toBeTruthy();

      // Click filter button
      await page.click('#calendar-filter-btn');

      // Wait for calendar to load
      await page.waitForSelector('#calendar-view .calendar-grid, #calendar-view .calendar-hint', { timeout: 10000 });

      // Check if calendar loaded or shows "no results" message
      const hasCalendarGrid = await page.locator('#calendar-view .calendar-grid').count();
      const hasHintMessage = await page.locator('#calendar-view .calendar-hint').count();

      expect(hasCalendarGrid + hasHintMessage).toBeGreaterThan(0);

      if (hasCalendarGrid > 0) {
        const calendarDays = await page.locator('.calendar-day').all();
        console.log(`Calendar loaded: ${calendarDays.length} days with dividends`);
      } else {
        const message = await page.locator('#calendar-view .calendar-hint').textContent();
        console.log('Calendar message:', message);
      }
    });

    test('should open company modal from calendar', async ({ page }) => {
      await page.goto(`${BASE_URL}#calendar`);

      // Click filter
      await page.click('#calendar-filter-btn');
      await page.waitForSelector('#calendar-view .calendar-grid, #calendar-view .calendar-hint', { timeout: 10000 });

      const hasResults = await page.locator('.calendar-item .ticker-link').count();

      if (hasResults > 0) {
        await page.locator('.calendar-item .ticker-link').first().click();

        await page.waitForSelector('#company-modal.active', { timeout: 5000 });

        const modalTitle = await page.locator('.company-title').textContent();
        console.log('Modal opened from calendar:', modalTitle);

        await page.locator('#modal-close').click();
      } else {
        console.log('No calendar results to test modal opening');
      }
    });

    test('should handle custom date range', async ({ page }) => {
      await page.goto(`${BASE_URL}#calendar`);

      // Set custom date range (next 30 days)
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + 30);

      const startStr = today.toISOString().split('T')[0];
      const endStr = futureDate.toISOString().split('T')[0];

      await page.fill('#calendar-start', startStr);
      await page.fill('#calendar-end', endStr);

      await page.click('#calendar-filter-btn');
      await page.waitForSelector('#calendar-view .calendar-grid, #calendar-view .calendar-hint', { timeout: 10000 });

      console.log(`Custom date range: ${startStr} to ${endStr}`);
    });
  });

  test.describe('Global Search', () => {
    test('should show search results', async ({ page }) => {
      await page.goto(BASE_URL);

      // Type in global search
      await page.fill('#global-search', 'AAPL');

      // Wait for results
      await page.waitForSelector('#search-results:not(.hidden)', { timeout: 2000 });

      // Check results appear
      const results = await page.locator('.search-result-item').all();
      expect(results.length).toBeGreaterThan(0);

      // Check first result contains AAPL
      const firstResult = await page.locator('.search-result-ticker').first().textContent();
      expect(firstResult).toContain('AAPL');

      console.log(`Global search "AAPL": ${results.length} results`);
    });

    test('should navigate results with arrow keys', async ({ page }) => {
      await page.goto(BASE_URL);

      await page.fill('#global-search', 'A');
      await page.waitForSelector('#search-results:not(.hidden)', { timeout: 2000 });

      // Press down arrow
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(200);

      // Check first item is selected
      const selectedCount = await page.locator('.search-result-item.selected').count();
      expect(selectedCount).toBe(1);

      // Press down again
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(200);

      console.log('Arrow key navigation working');
    });

    test('should open modal on Enter key', async ({ page }) => {
      await page.goto(BASE_URL);

      await page.fill('#global-search', 'AAPL');
      await page.waitForSelector('#search-results:not(.hidden)', { timeout: 2000 });

      // Press Enter
      await page.keyboard.press('Enter');

      // Wait for modal
      await page.waitForSelector('#company-modal.active', { timeout: 5000 });

      const modalTitle = await page.locator('.company-title').textContent();
      console.log('Enter key opened modal:', modalTitle);

      await page.locator('#modal-close').click();
    });

    test('should close results on Escape', async ({ page }) => {
      await page.goto(BASE_URL);

      await page.fill('#global-search', 'AAPL');
      await page.waitForSelector('#search-results:not(.hidden)', { timeout: 2000 });

      // Press Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);

      // Check results are hidden
      const isHidden = await page.locator('#search-results.hidden').count();
      expect(isHidden).toBe(1);

      console.log('Escape key closes search results');
    });

    test('should close results when clicking outside', async ({ page }) => {
      await page.goto(BASE_URL);

      await page.fill('#global-search', 'AAPL');
      await page.waitForSelector('#search-results:not(.hidden)', { timeout: 2000 });

      // Click on the page header
      await page.click('.logo');
      await page.waitForTimeout(200);

      // Check results are hidden
      const isHidden = await page.locator('#search-results.hidden').count();
      expect(isHidden).toBe(1);

      console.log('Click outside closes search results');
    });
  });

  test.describe('Company Modal', () => {
    test('should display company information', async ({ page }) => {
      await page.goto(BASE_URL);

      // Open modal via search
      await page.fill('#global-search', 'AAPL');
      await page.waitForSelector('#search-results:not(.hidden)', { timeout: 2000 });
      await page.keyboard.press('Enter');

      await page.waitForSelector('#company-modal.active', { timeout: 5000 });

      // Check all key elements exist
      const title = await page.locator('.company-title').textContent();
      expect(title).toBeTruthy();

      const metaInfo = await page.locator('.company-meta').textContent();
      expect(metaInfo).toContain('CIK');
      expect(metaInfo).toContain('Sector');
      expect(metaInfo).toContain('Industry');

      // Check stats cards
      const statCards = await page.locator('#modal-body .stat-card').all();
      expect(statCards.length).toBe(3);

      console.log('Company modal info loaded:', title);
    });

    test('should display Wikipedia info if available', async ({ page }) => {
      await page.goto(BASE_URL);

      await page.fill('#global-search', 'AAPL');
      await page.waitForSelector('#search-results:not(.hidden)', { timeout: 2000 });
      await page.keyboard.press('Enter');

      await page.waitForSelector('#company-modal.active', { timeout: 5000 });

      // Check if Wikipedia section exists
      const wikiSection = await page.locator('.company-info-section').count();

      if (wikiSection > 0) {
        const wikiContent = await page.locator('.company-info-content').textContent();
        expect(wikiContent).toBeTruthy();

        console.log('Wikipedia description found');

        // Check for attribution
        const attribution = await page.locator('.wikipedia-attribution').count();
        expect(attribution).toBe(1);
      } else {
        console.log('No Wikipedia info for this company');
      }

      await page.locator('#modal-close').click();
    });

    test('should display website link if available', async ({ page }) => {
      await page.goto(BASE_URL);

      await page.fill('#global-search', 'AAPL');
      await page.waitForSelector('#search-results:not(.hidden)', { timeout: 2000 });
      await page.keyboard.press('Enter');

      await page.waitForSelector('#company-modal.active', { timeout: 5000 });

      // Check for website link
      const websiteLink = await page.locator('.company-website-link').count();

      if (websiteLink > 0) {
        const href = await page.locator('.company-website-link').getAttribute('href');
        expect(href).toBeTruthy();
        console.log('Website link found:', href);
      } else {
        console.log('No website link for this company');
      }

      await page.locator('#modal-close').click();
    });

    test('should display dividend history table', async ({ page }) => {
      await page.goto(BASE_URL);

      await page.fill('#global-search', 'AAPL');
      await page.waitForSelector('#search-results:not(.hidden)', { timeout: 2000 });
      await page.keyboard.press('Enter');

      await page.waitForSelector('#company-modal.active', { timeout: 5000 });

      // Check dividend history section
      const historyTable = await page.locator('.dividend-history table').count();

      if (historyTable > 0) {
        const rows = await page.locator('.dividend-history tbody tr').all();
        expect(rows.length).toBeGreaterThan(0);

        console.log(`Dividend history: ${rows.length} records (page 1)`);
      } else {
        const noDataMessage = await page.locator('.dividend-history .calendar-hint').count();
        expect(noDataMessage).toBe(1);
        console.log('No dividend history available');
      }

      await page.locator('#modal-close').click();
    });

    test('should paginate dividend history', async ({ page }) => {
      await page.goto(BASE_URL);

      await page.fill('#global-search', 'AAPL');
      await page.waitForSelector('#search-results:not(.hidden)', { timeout: 2000 });
      await page.keyboard.press('Enter');

      await page.waitForSelector('#company-modal.active', { timeout: 5000 });

      // Check for pagination in modal
      const paginationExists = await page.locator('.dividend-history .pagination').count();

      if (paginationExists > 0) {
        const nextButton = page.locator('.dividend-history .pagination button:has-text("Next")');

        if (await nextButton.isEnabled()) {
          await nextButton.click();
          await page.waitForTimeout(500);

          const pageInfo = await page.locator('.dividend-history .pagination-info').textContent();
          expect(pageInfo).toContain('Page 2');

          console.log('Modal pagination working:', pageInfo);
        } else {
          console.log('Only one page of dividend history');
        }
      } else {
        console.log('No pagination needed in modal');
      }

      await page.locator('#modal-close').click();
    });

    test('should close modal via X button', async ({ page }) => {
      await page.goto(BASE_URL);

      await page.fill('#global-search', 'AAPL');
      await page.waitForSelector('#search-results:not(.hidden)', { timeout: 2000 });
      await page.keyboard.press('Enter');

      await page.waitForSelector('#company-modal.active', { timeout: 5000 });

      // Click X button
      await page.locator('#modal-close').click();

      // Wait for modal to close
      await page.waitForSelector('#company-modal:not(.active)', { timeout: 2000 });

      const isActive = await page.locator('#company-modal.active').count();
      expect(isActive).toBe(0);

      console.log('Modal closed via X button');
    });

    test('should close modal by clicking backdrop', async ({ page }) => {
      await page.goto(BASE_URL);

      await page.fill('#global-search', 'AAPL');
      await page.waitForSelector('#search-results:not(.hidden)', { timeout: 2000 });
      await page.keyboard.press('Enter');

      await page.waitForSelector('#company-modal.active', { timeout: 5000 });

      // Click backdrop (the modal itself, not modal-content)
      await page.locator('#company-modal').click({ position: { x: 5, y: 5 } });

      await page.waitForTimeout(500);

      const isActive = await page.locator('#company-modal.active').count();
      expect(isActive).toBe(0);

      console.log('Modal closed via backdrop click');
    });
  });

  test.describe('Navigation', () => {
    test('should switch between pages via nav links', async ({ page }) => {
      await page.goto(BASE_URL);

      // Click Companies
      await page.click('[data-page="companies"]');
      await page.waitForTimeout(500);

      expect(await page.locator('#companies-page.active').count()).toBe(1);
      expect(page.url()).toContain('#companies');

      // Click Calendar
      await page.click('[data-page="calendar"]');
      await page.waitForTimeout(500);

      expect(await page.locator('#calendar-page.active').count()).toBe(1);
      expect(page.url()).toContain('#calendar');

      // Click Dashboard
      await page.click('[data-page="dashboard"]');
      await page.waitForTimeout(500);

      expect(await page.locator('#dashboard-page.active').count()).toBe(1);
      expect(page.url()).toContain('#dashboard');

      console.log('Navigation between pages working');
    });

    test('should handle browser back/forward', async ({ page }) => {
      await page.goto(`${BASE_URL}#dashboard`);
      await page.waitForTimeout(500);

      await page.click('[data-page="companies"]');
      await page.waitForTimeout(500);

      await page.click('[data-page="calendar"]');
      await page.waitForTimeout(500);

      // Go back
      await page.goBack();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('#companies');
      expect(await page.locator('#companies-page.active').count()).toBe(1);

      // Go back again
      await page.goBack();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('#dashboard');
      expect(await page.locator('#dashboard-page.active').count()).toBe(1);

      // Go forward
      await page.goForward();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('#companies');

      console.log('Browser back/forward working');
    });

    test('should load correct page from URL hash', async ({ page }) => {
      await page.goto(`${BASE_URL}#companies`);
      await page.waitForTimeout(500);

      expect(await page.locator('#companies-page.active').count()).toBe(1);
      expect(await page.locator('[data-page="companies"].active').count()).toBe(1);

      console.log('Direct URL hash navigation working');
    });

    test('should highlight active nav link', async ({ page }) => {
      await page.goto(BASE_URL);

      // Check dashboard is active
      expect(await page.locator('[data-page="dashboard"].active').count()).toBe(1);

      await page.click('[data-page="companies"]');
      await page.waitForTimeout(500);

      // Check companies is active, dashboard is not
      expect(await page.locator('[data-page="companies"].active').count()).toBe(1);
      expect(await page.locator('[data-page="dashboard"].active').count()).toBe(0);

      console.log('Active nav link highlighting working');
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL);

      await page.waitForSelector('.stat-card:not(.loading)', { timeout: 10000 });

      // Check elements are visible
      expect(await page.locator('.header').isVisible()).toBe(true);
      expect(await page.locator('.nav').isVisible()).toBe(true);
      expect(await page.locator('.stats-grid').isVisible()).toBe(true);

      console.log('Mobile viewport (375x667) working');
    });

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(BASE_URL);

      await page.waitForSelector('.stat-card:not(.loading)', { timeout: 10000 });

      expect(await page.locator('.header').isVisible()).toBe(true);

      console.log('Tablet viewport (768x1024) working');
    });
  });

  test.describe('API Integration', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      await page.goto(BASE_URL);

      // Intercept API call and return error
      await page.route('**/api/index.cgi/companies/INVALID', route => {
        route.fulfill({
          status: 404,
          body: JSON.stringify({ success: false, error: 'Company not found' })
        });
      });

      await page.fill('#global-search', 'INVALID');
      await page.waitForTimeout(500);

      // App should handle this gracefully
      console.log('API error handling test (intercepted request)');
    });

    test('should show no results message', async ({ page }) => {
      await page.goto(BASE_URL);

      // Search for something that doesn't exist
      await page.fill('#global-search', 'XYZABC123');
      await page.waitForTimeout(500);

      const noResults = await page.locator('.search-no-results').count();

      if (noResults > 0) {
        const message = await page.locator('.search-no-results').textContent();
        expect(message).toContain('No companies found');
        console.log('No results message displayed correctly');
      }
    });
  });

  test.describe('Footer', () => {
    test('should display footer with links', async ({ page }) => {
      await page.goto(BASE_URL);

      // Scroll to footer
      await page.locator('.footer').scrollIntoViewIfNeeded();

      // Check footer sections exist
      expect(await page.locator('.footer-section').count()).toBeGreaterThan(0);

      // Check for GitHub links
      const githubLinks = await page.locator('.footer-links a[href*="github"]').all();
      expect(githubLinks.length).toBeGreaterThan(0);

      console.log(`Footer loaded with ${githubLinks.length} GitHub links`);
    });
  });
});
