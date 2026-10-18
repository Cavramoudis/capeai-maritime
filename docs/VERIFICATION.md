# Release verification

Date: 18 October 2026. Engine: 1.0.0. Study schema: 1.

## Automated checks

All 41 tests pass with Node’s built-in test runner. Coverage includes seven published manual examples, 32 seeded independent reference cases, debt settlement, tax, cash-flow reconciliation, NPV, IRR edge cases, funding breakeven, import validation, storage failures and real PowerPoint output.

The syntax check, documentation check, static build and release-file verification pass. The release checker inventories the actual output tree, verifies every checksum, rejects unsafe paths and symbolic links, and checks local documentation links and the PDF header. An independent fixture review confirmed that seven invalid release variants fail.

The initial release is published through the GitHub Pages `gh-pages` branch. The OAuth token permits repository and Pages changes but lacks workflow scope. The optional pinned Actions workflow is retained as a template; it is not active. The checks in this report ran locally before publication.

A separate numerical review exercised 4,000 studies, 60,214 breakeven evaluations and 3,084 IRR residual checks. This supplements the committed reproducible regression suite; it is not a guarantee for every possible input.

## Browser acceptance

The main journey was exercised in the Codex in-app browser on desktop and mobile viewports.

- The synthetic example shows investor IRR 19.73%, NPV $2,455,196 at 12%, and initial equity $8,900,000.
- A negative purchase price suppresses results. The error link returns focus to the relevant input.
- Setting Year 1 charter hire to zero gives zero Year 1 revenue and shows $4,212,500 additional equity.
- Switching the cash-flow basis updates the displayed returns and chart.
- Shortening the holding period flags annual rows outside the new horizon; those rows are not silently lost.
- Keyboard arrow navigation changes the assumption tab and focus.
- Named saving and reload preserve a study. Markup characters in study names remain literal text.
- An exported JSON study imports successfully. Replacing an unsaved imported study opens the copy-protection dialog; Cancel preserves it.
- JSON, CSV and PowerPoint files download through the actual interface. The downloaded seven-slide deck contains the expected 19.73% IRR, and every XML part parses.
- The no-charter-income stress case shows the funding requirement without changing the base study.

Desktop 1440 px, mobile 390 px and narrow mobile 351 px captures were inspected. The document has no horizontal overflow at the tested phone widths. Wide financial tables and charts have their own scroll regions. Financial amounts do not split across lines in the inspected states. The manual also has no document overflow at 351 px.

Report HTML escaping, calculations, Blob creation, opener isolation, blocked-popup recovery and URL cleanup are covered by tests. The automation browser blocks navigation to HTML Blob URLs under its security policy. Physical print-dialog behavior was therefore not verified through that browser. Open the report in a normal browser and use its Print command to save PDF.

## Independent reviews

The source/security review found and resolved an asynchronous export snapshot race and an imported-draft replacement gap. Its detailed scope and vendor analysis are in RELEASE-REVIEW.md. PptxGenJS is self-hosted; the Node-only image parser flagged in registry dependency metadata is excluded from the deployed browser bundle.

The fresh design reviewer inspected the six required captures and found no material UI repair. Its sole documentation finding concerned seed provenance. The final scoped verdict was `ship` after that finding was resolved. The review records an installed-tool compatibility limitation; it does not claim a successful provenance verifier run. The design detector returned no findings on the changed interface targets.

## Manual checks and limits

The downloadable reference book has 51 pages. Representative tables, equations, navigation and setup instructions were visually inspected. Text checks found no replacement glyphs or content crossing the page boundaries. All 472 prose sentences measured by the documentation check contain at most 25 words. This mechanical measure supports the editorial target; it is not ASD-STE100 certification.

This verification is not a full browser, assistive-technology or jurisdiction-specific financial audit. The release models one vessel, USD, annual year-end periods and one fixed-rate loan. The manual states the simplified tax and whole-deal carry rules, conservative IRR policy, storage boundaries and excluded risks.
