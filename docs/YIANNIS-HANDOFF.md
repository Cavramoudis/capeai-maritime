# Local handoff for Yiannis

Open the [CapeAI calculator](https://cavramoudis.github.io/capeai-maritime/).

Read the [user and financial-model manual](https://cavramoudis.github.io/capeai-maritime/manual.html). Download the [PDF reference book](https://cavramoudis.github.io/capeai-maritime/manual.pdf) for offline use.

## Run the same release locally

1. Install Node.js 24 LTS.
2. Open a terminal.
3. Run the commands below.
4. Open http://127.0.0.1:4173.

```sh
git clone https://github.com/Cavramoudis/capeai-maritime.git
cd capeai-maritime
npm run dev
```

No account, API key, database, or npm package installation is needed. The PowerPoint library is already included.

Keep the terminal running while you use the application. Press `Ctrl+C` to stop the server.

For later sessions, open the repository directory and run `npm run dev`. Reuse the same local address and port for existing browser studies.

Use Load example in Device library to explore the workflow. Use New blank study for your own investment.

Save study creates a named library snapshot. Export > Study JSON creates a portable backup.

The deployed website and localhost use separate browser storage. Export and import JSON to move a study between them.

Browser storage is not encrypted. GitHub Pages applications on the same account host share an origin and can access its local storage.

For confidential studies, use the local server with a dedicated browser profile. Keep the JSON backup in an appropriate private folder.

## Prompt to use with a coding assistant

> Help me run and understand the CapeAI vessel-investment calculator at https://github.com/Cavramoudis/capeai-maritime. Clone it, read README.md and docs/MANUAL.md, and inspect package.json before running commands. Use Node.js 24 LTS. Run npm test, npm run check, npm run check:docs, and npm run dev. Open the local URL reported by the server.
>
> Walk me through Device library > Load example, then Study setup, Cash flow, and Scenarios. Explain acquisition funding, annual charter income, OPEX, timed CAPEX, loan amortization, maturity, exit value, fees, taxes, and carry. Explain NPV and IRR using the actual model's asset and investor cash-flow streams. Show how a negative annual investor cash flow creates an additional equity contribution. Test a lower charter-rate case and compare its NPV and funding needs. Explain every changed result.
>
> Save a named local study. Export Study JSON, Cash-flow CSV, Print / PDF report, and PowerPoint. Check that the exports match the displayed assumptions. Explain how browser storage and JSON backups differ. Treat the example as illustrative data. Preserve the single engine in src/model.mjs. If you change the model, update independent tests, docs/MODEL-CONTRACT.md, and the manual together. Discuss a concrete need before adding accounts, cloud storage, or external financial APIs.

## Before a real investment decision

Replace the example assumptions with sourced estimates. Record each source and date in the study notes. Confirm loan terms, fee bases and tax treatment.

The model is annual. It does not test monthly liquidity, covenants, refinancing, currency changes or a contractual hurdle waterfall.

Keep the JSON file with any shared report. It contains the assumptions needed to reproduce the result.
