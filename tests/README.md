# DivScout E2E Tests

End-to-end tests for the DivScout web application using Playwright.

## Setup

1. Install dependencies:
```bash
cd tests
npm install
npx playwright install
```

## Running Tests

### Run smoke tests (recommended, fast)
```bash
npm test
# or
npm run test:smoke
```

### Run full test suite (comprehensive, slower)
```bash
npm run test:full
```

### Run tests with browser visible
```bash
npm run test:headed
```

### Run tests in UI mode (interactive)
```bash
npm run test:ui
```

### Run tests in debug mode
```bash
npm run test:debug
```

### Run tests in specific browser
```bash
npm run test:chromium
npm run test:firefox
npm run test:webkit
```

### View test report
```bash
npm run report
```

## Test Coverage

The test suite covers all major features:

### Dashboard
- Stats loading (companies, dividends, paying companies)
- Recent dividends table
- Pagination controls
- Pagination navigation
- Company modal from ticker links

### Companies Page
- Companies list loading
- Search functionality
- Sector filtering
- Industry filtering
- Company modal from ticker links

### Calendar Page
- Date range selection with pre-filled defaults
- Calendar data loading
- Custom date range filtering
- Company modal from calendar items

### Global Search (Header)
- Search results display
- Arrow key navigation (up/down)
- Enter key to open modal
- Escape to close results
- Click outside to close results

### Company Modal
- Company information display (title, CIK, sector, industry)
- Wikipedia description (if available)
- Website link (if available)
- Stats cards (total dividends, average amount, last ex-div date)
- Dividend history table
- Pagination in modal
- Close via X button
- Close via backdrop click

### Navigation
- Page switching via nav links
- Browser back/forward navigation
- Direct URL hash navigation
- Active nav link highlighting

### Responsive Design
- Mobile viewport (375x667)
- Tablet viewport (768x1024)

### API Integration
- Error handling
- No results handling

### Footer
- Footer display
- GitHub links

## Test Reports

After running tests, an HTML report is generated at `playwright-report/index.html`.

View it with:
```bash
npm run report
```

## CI/CD

Tests can be integrated into CI/CD pipelines. The config automatically:
- Uses retries in CI environments
- Captures screenshots on failure
- Records video on failure
- Generates HTML reports

## Browser Support

Tests run against:
- Chromium (Chrome/Edge)
- Firefox
- WebKit (Safari)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)

## Timeouts

- Test timeout: 30 seconds
- Expect timeout: 5 seconds
- Adjust in `playwright.config.js` if needed

## Debugging

For debugging failing tests:

1. Run in debug mode:
```bash
npm run test:debug
```

2. Use UI mode for interactive debugging:
```bash
npm run test:ui
```

3. Check screenshots/videos in `test-results/` folder

4. View the HTML report for detailed failure information
