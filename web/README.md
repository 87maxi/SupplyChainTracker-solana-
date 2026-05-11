This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Testing

### Unit Tests (Jest)
```bash
npm run test           # Run all unit tests
npm run test:unit      # Same as test
npm run test:coverage  # Run with coverage report
npm run test:watch     # Run in watch mode
```

### E2E Tests (Playwright)
```bash
npm run test:e2e              # Run E2E tests headless
npm run test:e2e:ui           # Run with Playwright UI mode
npm run test:e2e:headed       # Run with browser window visible
npm run test:e2e:report       # Show existing test report
```

### Run All Tests
```bash
npm run test:all  # Run unit + E2E tests sequentially
```

### Test Scripts
```bash
./scripts/run-unit-tests.sh  # Run unit tests via bash script
./scripts/run-e2e-tests.sh   # Run E2E tests via bash script
./scripts/run-all-tests.sh   # Run all tests via bash script
```

### Test Structure
- **Unit/Integration Tests**: Located in `web/src/` with `.test.ts` or `.spec.ts` suffix
- **E2E Tests**: Located in `web/e2e/` using Playwright
- **Solana Program Tests**: Located in `sc-solana/tests/` using Anchor framework
