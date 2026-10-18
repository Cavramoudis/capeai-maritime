# CapeAI financial model contract

Engine version: **1.0.0**. Study schema version: **1**.

`src/model.mjs` is the only calculation engine. Interfaces, scenarios and reports must consume its results. They must not reimplement formulas.

## Conventions

- All currency amounts are USD. The model performs no currency conversion.
- Input fields ending in `Pct` contain whole percentages. For example, `55` means 55%.
- Output IRR and ROI values are decimal fractions. For example, `0.10` means 10%.
- `calculateNPV` accepts a decimal discount rate.
- Time zero records acquisition, financing and initial funding.
- Years 1 through `holdYears` represent equal annual periods.
- All annual operating payments, taxes and distributions occur at year end.
- Exit occurs after the final year's operations, tax depreciation and contractual principal payment.
- Positive investor cash flow means a distribution. Negative investor cash flow means an equity contribution.
- Annual inflows and outflows are netted. The model does not estimate funding needed within a year.
- Amounts remain unrounded in the engine. Round only for presentation.
- Missing fields are validation errors. Explicit zero values remain zero.

## Public API

```js
createBlankStudy()              // Complete schema; price 0 requires user input.
createExampleStudy()            // Complete, valid illustrative assumptions.
validateStudy(study)            // [{ path, severity: 'error'|'warning', message }]
calculateStudy(study)           // Model described below.
calculateNPV(rate, cashflows)   // number|null; cashflows start at time zero.
calculateIRR(cashflows)         // { value: number|null, status, message }
calculateSensitivity(study, multipliers = [0.7, 0.85, 1, 1.15, 1.3])
```

`calculateStudy` does not mutate its input. A valid result contains a copied study.

An invalid result has `valid: false`, validation issues, empty rows and flows, and null summaries. It does not echo invalid study data.

Unknown fields are rejected, including authentication fields. Import adapters must explicitly map legacy data into the versioned schema before calculation.

## Study fields

Every field below is required. Empty arrays and permitted zero values are valid.

| Path | Meaning and bounds |
| --- | --- |
| `schemaVersion` | Exactly `1` |
| `name` | Study label, at most 200 characters |
| `notes` | User notes, at most 10,000 characters |
| `vessel.name`, `vessel.type` | Text, at most 200 characters each |
| `vessel.builtYear` | Integer 0–2200; zero means unspecified; informational |
| `vessel.deadweight` | Tonnes, 0–1,000,000; informational |
| `vessel.ldt` | Light displacement tonnes, 0–1,000,000; used in scrap value |
| `acquisition.price` | Vessel purchase price, $0.01–$1 trillion |
| `acquisition.transactionCosts` | Fixed acquisition costs, $0–$1 trillion |
| `acquisition.workingCapital` | Initial operating cash investment, $0–$1 trillion |
| `financing.ltvPct` | Debt as a percentage of vessel price, 0–100% |
| `financing.interestPct` | Fixed annual interest on opening debt, 0–100% |
| `financing.tenorYears` | Contractual loan maturity, integer 1–30 years |
| `financing.balloonPct` | Percentage of original debt due after scheduled amortization, 0–100% |
| `financing.arrangementFeePct` | Time-zero fee as a percentage of debt drawn, 0–100% |
| `operations.dailyOpex` | Base daily vessel operating costs, $0–$100 million |
| `operations.opexDays` | Annual cost days, integer 0–365 |
| `operations.inflationPct` | Compound annual change in OPEX, −100–100% |
| `operations.baseDailyRate` | Base daily charter rate, $0–$100 million |
| `operations.baseRevenueDays` | Base earning days, integer 0–365 |
| `operations.brokeragePct` | Annual brokerage as a percentage of gross revenue, 0–100% |
| `operations.managementFeePct` | Annual SPV fee as a percentage of original vessel price, 0–100% |
| `projection.holdYears` | Integer 1–30 years |
| `projection.assetDiscountPct` | Discount rate for asset cash flows, 0–100% |
| `projection.equityDiscountPct` | Discount rate for each equity cash-flow basis, 0–100% |
| `charter` | At most 30 `{ year, dailyRate, revenueDays }` rows |
| `charter[].year` | Unique integer 1 through holding period |
| `charter[].dailyRate` | Annual override, $0–$100 million |
| `charter[].revenueDays` | Annual override, integer 0–365 |
| `capex` | At most 300 `{ year, amount, label }` rows; repeated years are allowed |
| `capex[].year` | Payment year, integer 0 through holding period |
| `capex[].amount` | Nominal payment, $0–$1 trillion |
| `capex[].label` | Text, at most 200 characters |
| `exit.mode` | `depreciation`, `manual` or `scrap` |
| `exit.depreciationPct` | Annual decline for the depreciation exit estimate, 0–100% |
| `exit.manualValue` | User's gross sale estimate, $0–$1 trillion |
| `exit.scrapPerTon` | Scrap price per light displacement tonne, $0–$100 million |
| `exit.disposalCostPct` | Sale cost as a percentage of gross exit value, 0–100% |
| `tax.ratePct` | Simplified tax rate, 0–100% |
| `tax.annualDepreciationPct` | Annual declining tax-book depreciation rate, 0–100% |
| `tax.taxSaleGain` | Boolean: include positive disposal gains in taxable income |
| `carry.ratePct` | Whole-deal nominal profit share, 0–100% |

All numeric values must be finite numbers, not numeric strings. Unknown object keys are errors.

Text rejects unsupported control characters, unpaired UTF-16 surrogates, and U+FFFE/U+FFFF. Tabs, line breaks, and complete Unicode characters are permitted.

When holding period changes, charter and CAPEX years outside the new period require explicit correction. The engine does not discard them.

Warnings do not block calculation. Current input warnings cover enabled simplified tax and zero light displacement for scrap valuation.

## Funding and debt

Use these symbols:

- `P`: acquisition price.
- `A`: acquisition transaction costs.
- `W`: initial working capital.
- `C0`: sum of CAPEX payments at time zero.
- `D`: initial loan draw.
- `F`: loan arrangement fee.
- `H`: holding period.
- `T`: loan tenor.
- Percentage symbols below denote decimal fractions.

```text
D = P × LTV
F = D × arrangement-fee rate
Asset uses = P + A + W + C0
Total initial uses = Asset uses + F
Initial equity = Total initial uses − D
Annual scheduled principal = D × (1 − balloon rate) / T
```

Debt finances the vessel price only. Acquisition costs, initial CAPEX, working capital and arrangement fees require equity.

Each year follows this order:

1. Calculate interest on the opening loan balance.
2. Pay scheduled principal, limited to the remaining balance.
3. At maturity, repay every remaining dollar as `maturityPrincipal`.
4. At exit, settle any balance still outstanding as `exitDebtSettlement`.

No refinancing is assumed. A balloon paid at maturity can require additional equity before disposal.

On early sale, settlement includes all outstanding scheduled principal and balloon. On sale at maturity, no duplicate settlement occurs.

```text
Interest = opening balance × interest rate
Total principal = scheduled principal + maturity principal + exit settlement
Debt service = interest + total principal
Closing balance = opening balance − total principal
```

## Operations and fees

An override row replaces both the base daily rate and earning days for its year. Without a row, both base assumptions apply.

Explicit zero days or a zero rate produce zero revenue. They never restore the base assumptions.

```text
Revenue[y] = daily charter rate[y] × earning days[y]
OPEX[y] = daily OPEX × annual cost days × (1 + inflation)^(y−1)
Brokerage[y] = revenue[y] × brokerage rate
Management[y] = original vessel price × management-fee rate
Operating surplus[y] = revenue[y] − OPEX[y] − brokerage[y] − management[y]
CAPEX[y] = sum of nominal payments assigned to year y
```

Management fees do not inflate or decline with vessel value. Brokerage changes with each year's actual revenue.

CAPEX is paid in its selected year. It is not amortized into an invented annual cash payment.

## Exit and working capital

```text
Depreciation-mode gross value = P × (1 − exit depreciation)^H
Manual-mode gross value = manual value
Scrap-mode gross value = light displacement tonnes × scrap price per tonne
Disposal costs = gross value × disposal-cost rate
Net sale proceeds = gross value − disposal costs
```

These are alternative user assumptions. They do not constitute an independent valuation or use live market data.

CAPEX does not automatically increase the gross sale estimate. Use a manual exit estimate when that effect matters.

All initial working capital returns at exit at its original nominal amount. No interest, growth or impairment is modeled.

`exit.debtSettlement` reports only the additional early-sale balance settlement. Final-year contractual principal remains in the annual debt schedule.

## Simplified tax

Tax is zero unless the user enables a positive rate. This is an illustrative calculation, not a jurisdiction-specific tax model.

```text
Initial tax book = P + acquisition transaction costs + year-zero CAPEX
Tax depreciation[y] = opening tax book[y] × annual tax-depreciation rate
Closing tax book[y] = opening book − depreciation + current-year CAPEX
Taxable disposal gain = max(0, net sale proceeds − closing tax book)
```

Current-year CAPEX joins the book at year end. It starts depreciation in the following year.

The disposal gain is included only in the exit year when `taxSaleGain` is true. Disposal losses are not deducted.

Let `G` be that year's taxable disposal gain, or zero otherwise.

```text
Asset tax = tax rate × max(0, operating surplus − tax depreciation + G)
Equity tax = tax rate × max(0, operating surplus − interest − tax depreciation + G)
Pre-fee equity tax = tax rate × max(0, revenue − OPEX − interest − tax depreciation + G)
```

Operating losses can offset a positive disposal gain within the same year. No loss carries forward or back; there are no tax refunds.

Principal, working capital and carry are not tax deductions. Arrangement fees are not deducted or amortized for tax.

Tax is recalculated for each cash-flow basis. Removing a deductible annual fee can therefore increase tax in the pre-fee comparison.

## Cash-flow bases and carry

Each cash-flow array begins with its time-zero outlay.

| Basis | Time zero | Annual flow |
| --- | --- | --- |
| `asset` | Negative asset uses | Operating surplus − CAPEX − asset tax + terminal cash |
| `preFees` | Negative initial equity | Revenue − OPEX − CAPEX − pre-fee equity tax − debt service + terminal cash |
| `preCarry` | Negative initial equity | Operating surplus − CAPEX − equity tax − debt service + terminal cash |
| `investor` | Negative initial equity | Pre-carry equity cash flow − carry payment |

Terminal cash is net sale proceeds plus working-capital release. It is zero before exit.

Asset flows include brokerage and SPV management as operating expenses. They exclude debt proceeds, debt payments, arrangement fees and carry.

The pre-fee equity comparison excludes annual brokerage, management and carry. It retains loan arrangement costs in the initial equity outlay.

```text
Whole-deal nominal profit = sum of every pre-carry equity flow, including time zero
Carry = max(0, whole-deal nominal profit) × carry rate
Final investor flow = final pre-carry flow − carry
```

Negative annual flows reduce the carry base. No preferred return, hurdle, catch-up or interim carry is modeled.

Carry is paid at exit, even if that requires a final equity contribution. Earlier distributions are not automatically held in reserve.

## Return metrics

Every basis has the same metric shape:

```text
invested = absolute sum of negative cash flows
distributions = sum of positive cash flows
profit = distributions − invested
multiple = distributions / invested
ROI = profit / invested
NPV(r) = sum from t=0 through H of cashflow[t] / (1+r)^t
```

Multiple and ROI are null when invested capital is zero. Additional contributions count as invested capital.

Asset NPV uses `assetDiscountPct`. All three equity NPVs use `equityDiscountPct`. The engine does not estimate either required return.

IRR is the annual rate that sets NPV to zero. It needs an initial outflow pattern followed by positive receipts.

The solver ignores exact zero entries when counting sign changes. With one change from negative to positive, a unique investment IRR exists.

With more than one sign change, the engine reports `ambiguous`. This conservative label means uniqueness is not assured; it does not assert multiple real roots.

Without both positive and negative flows, IRR is `unavailable`. Unrepresentable or unreliable numerical roots are also unavailable.

The solver uses bracketed bisection in `log(1+r)` and checks the residual. It never returns an unconverged starting guess.

## DSCR and operating funding breakeven

These measures exclude sale proceeds and working-capital release. They also exclude carry and additional early-sale debt settlement.

Operating tax excludes disposal gains:

```text
Operating tax = tax rate × max(0, operating surplus − interest − tax depreciation)
Operating cash flow = operating surplus − actual CAPEX − operating tax
Contractual debt service = interest + scheduled principal + maturity principal
DSCR = operating cash flow / contractual debt service
```

DSCR is null when contractual debt service is zero. At maturity, its denominator includes the balloon.

Operating funding breakeven is the minimum daily charter rate that covers the year's cash requirements without sale proceeds.

Let:

```text
K = CAPEX + interest + scheduled principal + maturity principal
S = interest + tax depreciation
q = tax rate
b = brokerage rate
d = actual earning days
```

Required operating surplus `X` follows:

```text
If K ≤ S: X = K
If K > S and q < 1: X = (K − qS) / (1 − q)
Required daily rate = (OPEX + management + X) / (d × (1 − b))
```

The result is null for zero earning days or 100% brokerage. It is also null when 100% tax prevents a finite solution.

This metric uses actual earning days. It can rise sharply in a CAPEX or loan-maturity year.

## Result shape

```js
{
  valid, issues, engineVersion, study,
  rows,                         // Years 1..hold; includes all components below.
  flows: { asset, preFees, preCarry, investor }, // Arrays include time zero.
  metrics: { asset, preFees, preCarry, investor },
  funding: { initialUses, initialDebt, initialEquity, arrangementFee, upfrontCapex },
  exit: { grossValue, disposalCosts, netValue, debtSettlement,
          workingCapitalRelease, taxBookValue, taxableGain },
  totals: { revenue, opex, capex, brokerage, management, interest, principal,
            tax, carry, additionalEquity, distributions },
  warnings                     // Plain text; input and calculated conditions.
}
```

Each `metrics` item contains `irr`, `npv`, `discountPct`, `invested`, `distributions`, `profit`, `multiple` and `roi`.

Each `irr` contains `value`, `status` (`ok`, `unavailable`, or `ambiguous`) and `message`.

Each annual row contains:

```text
year, dailyRate, revenueDays, revenue, opex, brokerage, management, capex,
taxDepreciation, taxBookValue, assetTax, equityTax, preFeeTax,
interest, scheduledPrincipal, maturityPrincipal, exitDebtSettlement,
principal, debtService, debtOpening, debtClosing,
saleValue, disposalCosts, saleNet, workingCapitalRelease,
assetCashFlow, equityPreFees, equityPreCarry, carry, investorCashFlow,
contribution, distribution, operatingCashFlow, dscr, breakevenDailyRate,
cumulativeInvestorCashFlow
```

`contribution = max(0, −investorCashFlow)`. `distribution = max(0, investorCashFlow)`.

Cumulative investor cash flow includes the initial equity outlay. It is not cumulative gross distributions.

## Sensitivity

Sensitivity multiplies every base and overridden daily charter rate by the selected factor. It preserves earning days and all other assumptions.

Each point runs `calculateStudy`. It reports the after-carry investor IRR, NPV, multiple and additional equity.

Scenario results therefore use the same fees, tax, debt, CAPEX and carry rules as the main report.

## Regression evidence

Run `node --test tests/model.test.mjs`.

Independent reference cases cover zero inputs, charter overrides, no-hire years, early sale, maturity, terminal modes, fees, tax and carry.

They also cover timed CAPEX, funding reconciliation, additional contributions, consistent investor metrics and invalid or ambiguous IRR.

The tests verify investor cash-flow identities and total debt repayment. Model output must remain finite or explicitly null.

## Scope limits

The model excludes monthly payment dates, day-count conventions, floating rates, refinancing and covenant tests.

It excludes detailed jurisdictional taxes, tax-loss carryforwards, currency conversion, hedging, reserve-account interest and intra-year liquidity.

It does not forecast charter markets, vessel values, technical condition, survey dates or downtime. Users must enter those assumptions.

Negative equity flows assume the investor can fund every shortfall. The model does not enforce limited liability or simulate insolvency.

There is no automated investment recommendation. Positive NPV depends on the user's assumptions and chosen required return.

## Primary references

The cash-flow and discount-rate separation follows the principles in Damodaran's [Approaches to Valuation](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/lectures/approach.html).

Cash-flow timing and required returns are also discussed in [First Principles](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cfin2E/firstprin.htm).

The annual timing, tax approximation and carry convention above are CapeAI implementation choices. They are not presented as Damodaran's prescribed vessel model.
