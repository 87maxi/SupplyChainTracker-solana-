/**
 * Playwright Global Setup
 *
 * This file runs once before all tests start.
 * We use it to ensure browser context is ready.
 */

import { FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  // No global setup needed - wallet mock is injected per-test via page.addInitScript
  console.log("[Global Setup] Playwright E2E tests ready");
}

export default globalSetup;
