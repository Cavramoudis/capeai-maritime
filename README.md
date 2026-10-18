# CapeAI — vessel investment calculator

A device-first tool for analysts and owners who review a vessel acquisition. Model acquisition, annual operations, debt, fees, capital payments, tax assumptions and exit value. Keep the assumptions with the results.

- [Live calculator](https://cavramoudis.github.io/capeai-maritime/)
- [User and financial-model manual](https://cavramoudis.github.io/capeai-maritime/manual.html)
- [Download the PDF manual](https://cavramoudis.github.io/capeai-maritime/manual.pdf)

## Run locally

Install Node.js 20 or newer; Node.js 24 LTS is recommended. No npm install or API keys are required.

```sh
git clone https://github.com/Cavramoudis/capeai-maritime.git
cd capeai-maritime
npm run dev
```

Open http://127.0.0.1:4173. Keep the terminal running. Press Ctrl+C to stop it.

```sh
npm test
npm run check
npm run check:docs
npm run build
npm run check:release
```

The static production files are in `dist/`. After source edits, run `npm run build` and reload the browser. `PORT=8080 npm run dev` selects another local port.

## What it does

- Four explicit cash-flow bases: asset, equity before annual fees, equity before carry, and investor net.
- Annual charter overrides and dated capital payments, including Year 0.
- Equal-principal debt, contractual balloon, maturity and early-exit settlement.
- NPV, conservative IRR, money multiple, ROI, additional equity, DSCR and operating funding breakeven.
- Three exit modes and charter-rate sensitivity using one financial engine.
- Local draft and named studies. Portable JSON, full CSV, printable report and PowerPoint exports.
- No account, cloud study service, credentials, analytics, model API, or live financial data feed.

The included case is illustrative. The model uses annual year-end cash flows, one fixed-rate loan and USD. Tax and carry are explicitly simplified; see the manual before interpreting them.

## Privacy and backup

Studies stay in the current browser's local storage. Local storage is not encryption. Anyone with access to the browser profile can access the studies. Clearing site data removes them. Private browsing and storage limits can prevent saving.

Export a JSON backup before closing a private session, clearing browser data, changing device, or moving between localhost and the deployed site. Those are different storage origins. The app does not upload study data.

Storage is scoped by scheme, host and port, not repository path. Other GitHub Pages apps under the same account domain share that origin. For confidential studies, use the local server and a dedicated browser profile.

## Documentation

- [User and financial-model manual](docs/MANUAL.md)
- [Glossary](docs/GLOSSARY.md)
- [Original system and verified defects](docs/CURRENT-SYSTEM.md)
- [Target behavior](docs/TARGET-SYSTEM.md)
- [Exact model contract](docs/MODEL-CONTRACT.md)
- [Primary references](docs/references.md)
- [Local-use handoff for Yiannis](docs/YIANNIS-HANDOFF.md)
- [Release verification and test scope](docs/VERIFICATION.md)

The prose follows an ASD-STE100-inspired writing target. It does not claim formal conformity, certification or Damodaran endorsement.

## Architecture and deployment

The application uses browser-native JavaScript modules and CSS. `src/model.mjs` is the only financial engine. Node's built-in test runner checks independent numeric cases, debt identities, cash-flow bridges, imports and real PowerPoint output. PptxGenJS 4.0.1 is pinned and self-hosted for optional presentation export; no CDN is needed.

GitHub Pages serves the `gh-pages` branch, which contains only the verified `dist/` output. Run the test, syntax, documentation, build and release checks above before publishing that output. `release.json` records the source commit and every deployed file's SHA-256 hash. Source changes on `main` do not automatically publish.

A complete optional Actions workflow is saved in `.github/pages-workflow.yml`. Its actions are pinned to commit IDs; it verifies source, builds the site and deploys only after checks pass. To enable it, use GitHub access with workflow permission, move it to `.github/workflows/pages.yml`, and select GitHub Actions as the Pages source. The initial release uses branch publishing because the available OAuth token does not have workflow scope. No production secrets are required.

The legacy React application, account client and unverified AI features are retired. The original Git history remains available for provenance. This fork does not update the upstream author's deployment.

## PDF regeneration

The checked PDF is committed so normal startup needs no Python installation. To rebuild it after documentation edits, install Python 3, `reportlab`, and DejaVu fonts, then use `scripts/build-pdf.py`. Read that script's command options for font configuration. Rebuild the static site afterward.

## Provenance

Rebuilt from `yiannisk9/capeai.com` at `e45add581ef9adc3a84ff203363e428c3b29225b`. Original authorship and history are retained. Third-party export code keeps its own license notices in `vendor/`. No blanket license is inferred for the original repository.
