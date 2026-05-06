# E2E Testing Documentation

End-to-end testing for the SupplyChainTracker frontend using Playwright.

## Overview

The E2E test suite validates the complete user journey from homepage to dashboard, including:
- Wallet connection flow
- Dashboard rendering and responsiveness
- Role management UI
- Netbook registration forms
- Transaction confirmation dialogs

## Prerequisites

1. Node.js 18+ installed
2. Playwright browsers installed:
   ```bash
   npx playwright install
   ```

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run tests in UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### View HTML report
```bash
npm run test:e2e:report
```

### Run specific test file
```bash
npx playwright test e2e/homepage.spec.ts
```

### Run tests in a specific project (browser)
```bash
npx playwright test --project=chromium
```

### Run tests with parallelism disabled
```bash
npx playwright test --workers=1
```

## Test Structure

```
e2e/
├── e2e/
│   ├── homepage.spec.ts        # Homepage tests
│   ├── dashboard.spec.ts       # Dashboard tests
│   ├── wallet-connection.spec.ts  # Wallet flow tests
│   ├── role-management.spec.ts # Role management tests
│   ├── netbook-registration.spec.ts  # Registration tests
│   └── helpers/
│       ├── index.ts            # Helper exports
│       └── test-utils.ts       # Utility functions
└── playwright.config.ts        # Playwright configuration
```

## Writing Tests

### Basic Test Structure
```typescript
import { test, expect } from "@playwright/test";
import { waitForPageLoad, mockWalletConnection } from "./helpers/test-utils";

test.describe("Feature Name", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForPageLoad(page);
  });

  test("should do something", async ({ page }) => {
    await expect(page).toHaveTitle(/Supply Chain Tracker/i);
  });
});
```

### Mocking Wallet Connection
```typescript
import { test } from "./fixtures/test-fixtures";

test("with mocked wallet", async ({ page, mockWallet }) => {
  await mockWallet();
  // Wallet is now mocked
});
```

### Taking Screenshots
```typescript
import { takeScreenshot } from "./helpers/test-utils";

test("take screenshot", async ({ page }) => {
  await takeScreenshot(page, "my-test-screenshot");
  // Screenshot saved to e2e/screenshots/my-test-screenshot-{timestamp}.png
});
```

### Waiting for Elements
```typescript
import { waitForElementVisible } from "./helpers/test-utils";

test("wait for element", async ({ page }) => {
  await waitForElementVisible(page, "[data-testid='loading']");
  // Element is now visible
});
```

## Test Environment

The test suite automatically:
1. Starts the Next.js dev server before tests
2. Waits for the server to be ready
3. Cleans up the server after tests

## Best Practices

1. **Use data-testid attributes** for reliable element selection
2. **Wait for network idle** before asserting page state
3. **Mock external dependencies** (wallet, API) when testing UI
4. **Take screenshots on failure** for debugging
5. **Use descriptive test names** that explain the behavior being tested

## CI/CD Integration

For CI environments, the configuration:
- Retries failed tests 2 times
- Runs workers sequentially
- Captures traces on failure
- Records video on failure

## Troubleshooting

### Tests failing with timeout
- Check if the dev server is running
- Increase timeout in `playwright.config.ts`
- Check console for hydration errors

### Screenshots not captured
- Ensure `e2e/screenshots/` directory exists
- Check file permissions

### Wallet mock not working
- Ensure `addInitScript` is called before page navigation
- Check browser console for injection errors
