# CapeAI: target system and acceptance criteria

**Status:** design specification for the replacement release.  
**Decision date:** 18 October 2026.  
**Product model:** device-first calculator, without accounts.

This document defines the intended behavior. [The release manual](MANUAL.md) describes what the implementation supports.

## 1. The job to complete

An analyst must understand the cash consequences of buying, operating, financing, and selling one vessel.

The tool must expose assumptions and funding needs. Every headline metric must reconcile to a visible annual cash-flow stream.

The tool must help users compare cases. It must not convert uncertain forecasts into an automatic investment recommendation.

## 2. User journey

| Stage | User action | Required result |
|---|---|---|
| Start | Open the example or create a blank study. | An editable study with clear units and validation. |
| Study setup | Enter acquisition, income, operating, financing, tax, and exit assumptions. | One consistent set of model inputs. |
| Cash flow | Inspect annual operations, debt, sale proceeds, and investor cash. | A reconciled explanation of returns and funding gaps. |
| Scenarios | Compare charter-rate cases; edit exit assumptions in a separate study. | Comparable outputs from the same engine. |
| Manual & equations | Read equations, definitions, and limits. | An explanation matching the implemented model. |
| Device library and Export | Save locally or export a study and report. | Portable data and a reproducible record. |

The desktop interface must support detailed comparison. The mobile interface must preserve the same calculations and essential actions.

Large financial tables may scroll horizontally. The page layout must remain usable without horizontal page overflow.

## 3. Financial contract

The detailed implementation contract is [Model contract](MODEL-CONTRACT.md).

| Area | Required behavior |
|---|---|
| Currency | Use USD consistently; do not imply an exchange-rate service. |
| Timing | Use time zero plus annual, end-of-year cash flows. |
| Acquisition | Include purchase price, transaction costs, initial working capital, and initial CAPEX. |
| Debt funding | Calculate debt from purchase price; fund the remaining acquisition uses with equity. |
| Debt fees | Charge a stated percentage of initial debt at time zero. |
| Revenue | Use each year's actual rate and earning days. |
| OPEX | Apply the cost-day basis and explicit annual inflation. |
| CAPEX | Pay each scheduled amount in its selected year. |
| Annual fees | Define brokerage and management fee bases separately. |
| Debt service | Charge interest on opening debt; pay scheduled principal at year end. |
| Maturity | Settle all remaining debt at maturity without assumed refinancing. |
| Early exit | Settle the actual remaining debt after that year's scheduled principal. |
| Exit | Support explicit manual, declining-value, and scrap assumptions. |
| Working capital | Fund the initial amount and release that amount at exit. |
| Tax | Provide an explicit simplified assumption; document jurisdictional exclusions. |
| Carry | Share positive cumulative nominal equity profit through an explicit final-year charge. |
| Asset return | Calculate cash flow before debt financing and investor carry. |
| Equity return | Calculate cash flow after debt, fees, tax assumptions, and carry. |
| NPV | Match the asset rate to asset cash flows and equity rate to equity cash flows. |
| IRR | Report unavailable or ambiguous results when appropriate. |
| Liquidity | Show extra equity contributions when annual cash is negative. |
| Breakeven | Use earning days and disclose excluded terminal items. |

Zero is a valid assumption where the input permits it. Missing values must not silently replace explicit zero values.

## 4. Data and privacy contract

The first release has no account, cloud study database, external AI service, or market-data integration.

Study content stays in the browser until the user exports or shares it. Browser storage is not an encrypted vault.

Study JSON must have a version. Imports must validate types, bounds, and supported fields before use.

Imported content must never execute as HTML or script. Credential fields must never become study fields.

Legacy imports must report changed assumptions. A legacy file must not silently inherit obsolete calculation behavior.

Local saving does not replace backups. A downloaded study file must support recovery after browser storage is cleared.

## 5. Report contract

The screen, sensitivity analysis, CSV, printable report, and PowerPoint deck must use the same financial engine.

Reports must identify the study, model version, assumptions, cash-flow basis, and calculation limitations.

The release replaces the original presentation engine with a local PowerPoint exporter. Its results must match the screen's financial engine.

## 6. Design contract

Controls must show units beside values. Error messages must identify the field and explain the necessary correction.

Navigation must distinguish input preparation from result inspection. The current stage must remain visible.

The interface must support keyboard operation, visible focus, readable contrast, and comfortable touch targets.

Long explanations belong in field help and the manual. Essential basis labels belong beside the corresponding financial result.

## 7. Verification gates

| Gate | Evidence required |
|---|---|
| Financial correctness | Independent examples and regression tests for every material forensic defect. |
| Reconciliation | Initial funding balances, debt closes at zero, and cash-flow identities hold. |
| Zero assumptions | All-equity, zero-fee, zero-inflation, and no-hire cases remain explicit. |
| Debt timing | Early sale and maturity before sale both settle the correct debt. |
| Return limits | No-recovery and multiple-sign-change cash flows do not display invented IRRs. |
| Import safety | Invalid fields fail validation; known legacy data maps deliberately. |
| Browser journey | Create, edit, inspect, save, reload, import, export, and print work. |
| Responsive layout | Core actions work on desktop and mobile viewports. |
| Documentation | Equations and examples match the released engine. |
| Deployment | The production URL loads and its core journey works. |

## 8. Deliberate scope limits

The release is a deterministic annual screening model. It is not a monthly treasury model, accounting ledger, or fleet optimizer.

It does not price vessels or forecast charter markets. It does not provide tax advice or a contractual loan-covenant opinion.

The release does not model refinancing, floating rates, derivative hedges, exchange rates, probabilistic simulations, or a preferred-return waterfall.

Future additions require clear definitions and independent test cases. Their absence must remain visible in the manual.
