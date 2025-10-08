# Quick Start - Testing DivScout

## Installation (One-time setup)

```bash
cd tests
npm install
npx playwright install chromium
```

## Run Tests

```bash
# Quick smoke test (10 tests, ~35 seconds)
npm test

# Full comprehensive test (34 tests, ~2-3 minutes)
npm run test:full
```

## What Gets Tested

### Smoke Tests (critical paths)
- Homepage stats loading
- Recent dividends table
- Companies page
- Global search
- Company modal
- Navigation
- Calendar
- Keyboard shortcuts
- Filters
- Footer

### Full Test Suite (comprehensive)
Everything in smoke tests PLUS:
- Pagination (dashboard and modal)
- All filter combinations
- Arrow key navigation
- Wikipedia info display
- Website links
- Responsive design (mobile/tablet)
- API error handling
- Browser back/forward
- Modal close methods

## Latest Results

**Last Run**: October 7, 2025
**Status**: All smoke tests passed
**Site**: https://divscout.app

- 400+ companies loaded
- Thousands of dividend records
- All features working

See [TEST_RESULTS.md](TEST_RESULTS.md) for detailed results.
