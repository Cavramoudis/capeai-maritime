# CapeAI user and financial-model manual

**Model version:** 1.0.0.  
**Study schema:** 1.  
**Date:** 18 October 2026.  
**Scope:** one vessel, one fixed-rate loan, annual cash flows, USD.

This manual describes the rebuilt calculation engine. [Current system](CURRENT-SYSTEM.md) preserves the original application's behavior and defects.

The writing follows an STE-inspired editorial target. It does not claim ASD-STE100 certification or formal conformity.

## Contents

1. [Purpose and interpretation](#1-purpose-and-interpretation)
2. [Complete a study](#2-complete-a-study)
3. [Units, signs, and timing](#3-units-signs-and-timing)
4. [Input register](#4-input-register)
5. [Equations and model sequence](#5-equations-and-model-sequence)
6. [Worked examples](#6-worked-examples)
7. [Saving, importing, and sharing](#7-saving-importing-and-sharing)
8. [Local operation](#8-local-operation)
9. [Errors and unavailable results](#9-errors-and-unavailable-results)
10. [Limits and analyst checks](#10-limits-and-analyst-checks)
11. [Implementation reference](#11-implementation-reference)
12. [Editorial verification](#12-editorial-verification)

The [glossary](GLOSSARY.md) defines the project's terminology. [References](references.md) identifies the primary sources and their scope.

## 1. Purpose and interpretation

CapeAI calculates the cash consequences of a vessel investment. It connects acquisition, operations, debt, fees, tax assumptions, and disposal.

The tool answers three related questions:

- What cash does the vessel generate before financing?
- What cash do equity investors contribute and receive?
- Which years require more funding under the entered assumptions?

The tool does not estimate market prices or predict charter rates. Its example contains illustrative assumptions, not current market observations.

### 1.1 Separate the asset from its financing

Asset cash flow measures the investment before borrowing. Equity cash flow measures the investor's remaining cash after financing payments.

Debt reduces initial equity funding. It also creates interest, principal, and maturity payments.

Higher equity IRR does not establish lower risk. A financing structure can increase both the return percentage and cash shortfalls.

Use the asset discount rate for asset cash flows. Use the equity discount rate for investor cash flows.

This separation follows the valuation principles in Damodaran's [Approaches to Valuation](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/lectures/approach.html).

### 1.2 Read NPV, IRR, and funding together

NPV measures discounted value after the investment cost. Positive NPV means the entered cash flows exceed the entered required return.

IRR reports a percentage return for a valid cash-flow pattern. It does not show the investment's absolute dollar value.

The equity multiple reports distributions per dollar contributed. It does not account for payment timing.

Additional equity reports modeled funding needs after acquisition. A positive lifetime profit can coexist with substantial interim funding needs.

The discount rates are assumptions. CapeAI does not derive a cost of capital or certify an acceptable investment hurdle.

Damodaran's [Capital Budgeting under Certainty](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/lectures/cbcert.html) discusses these differences and IRR limitations.

## 2. Complete a study

The interface separates assumption entry, result inspection, and study management.

| Navigation item | Use it to |
|---|---|
| Study setup | Enter and revise the investment assumptions. |
| Cash flow | Reconcile annual operations, financing, exit, and investor returns. |
| Scenarios | Compare charter-rate changes with the current study. |
| Device library | Open named studies, create a blank study, load the example, or import JSON. |
| Manual & equations | Open this reference and download the manual PDF. |

Study setup contains Acquisition, Operations, Financing, and Exit & returns tabs.

### 2.1 Start and identify the investment

1. Open Device library.
2. Select New blank study or Load example.
3. Open Study setup.
4. Select Acquisition.
5. Enter a study name.
6. Enter the purchase price.
7. Set the holding period.
8. Enter acquisition transaction costs.
9. Enter initial working capital.
10. Open Vessel details & study notes.
11. Enter the vessel's identifying details.
12. Record the source and date of your assumptions in the notes.

The blank study contains no invented purchase price or operating forecast. Results remain unavailable until the required inputs are valid.

### 2.2 Build the forecast

1. Select Operations.
2. Enter the base daily charter rate.
3. Enter base earning days.
4. Enter daily operating costs.
5. Enter annual cost days.
6. Enter operating-cost inflation.
7. Enter brokerage and management fees.
8. Add annual charter assumptions where the base forecast differs.
9. Add each survey or capital payment to its payment year.

A zero charter rate or zero earning days produces zero revenue. An absent annual row uses the base charter assumptions.

An annual row replaces both the rate and earning-day assumptions for that year. It does not add extra revenue.

In Operations, use Add year override for an annual charter exception. Use Add capital cost for a dated payment.

If you shorten the holding period, review rows beyond the new exit year. Remove or move those rows deliberately.

The removal action names your selected holding year, such as Remove rows after Year 3.

It deletes all affected rows without another confirmation. It does not move their cash flows into another year.

### 2.3 Define financing and exit

1. Select Financing.
2. Enter the debt percentage of purchase price.
3. Enter the fixed annual interest rate.
4. Enter the loan tenor.
5. Enter the balloon percentage of initial debt.
6. Enter the debt arrangement fee.
7. Select Exit & returns.
8. Select the terminal-value method.
9. Enter the selected method's assumptions.
10. Enter disposal costs.
11. Enter the carry percentage.
12. Set the asset and equity discount rates.

Set debt to zero for an all-equity acquisition. There is no automatic refinancing after maturity.

### 2.4 Apply tax assumptions deliberately

1. Select Exit & returns.
2. Enter the modeled tax rate.
3. Enter annual tax depreciation.
4. Select whether positive disposal gains enter taxable income.
5. Check the tax assumptions against the intended investment structure.

The default tax rate is zero. This is a blank assumption, not a statement that the investment is tax-exempt.

Tax treatment requires an independent jurisdiction-specific assessment. The exact simplified formula appears in Section 5.5.

### 2.5 Inspect the results

1. Open Cash flow.
2. Reconcile initial debt and equity to acquisition uses.
3. Inspect each year's charter revenue.
4. Check CAPEX payment years.
5. Inspect the loan maturity payment.
6. Inspect the exit-year debt settlement.
7. Read each additional-equity warning.
8. Compare asset and investor returns.
9. Open Scenarios.
10. Inspect lower charter-rate cases.
11. Export the completed study.

Do not approve an investment from its headline IRR alone. Review its assumptions, downside cash needs, and terminal-value dependence.

## 3. Units, signs, and timing

| Item | Convention |
|---|---|
| Currency | All monetary inputs and outputs use USD. |
| Daily amounts | Charter and operating rates use USD/day. |
| Scrap rate | USD per metric tonne of light displacement. |
| Percentage input | Enter `7` for 7%, not `0.07`. |
| Equation percentage | Divide each percentage input by 100. |
| Holding period | Whole years from 1 through 30. |
| Loan tenor | Whole years from 1 through 30. |
| Time zero | Acquisition funding and year-zero CAPEX. |
| Later cash flows | End of each model year. |
| Positive investor cash | A distribution to investors. |
| Negative investor cash | A contribution from investors. |
| Expense columns | Positive amounts that the cash-flow equation subtracts. |
| Maximum annual days | 365; leap years are not modeled. |
| Display rounding | Presentation rounding only; the engine retains numerical precision. |

Every charter row represents that future year's nominal rate. OPEX inflation does not automatically increase charter rates, management fees, CAPEX, or terminal value.

All annual amounts are netted at year end. The model cannot reveal a cash shortfall within a year.

Debt interest uses the year's opening debt balance. Principal repayments occur after that year's interest calculation.

The exit occurs after operating cash flow, scheduled principal, and any maturity payment in the final year.

Initial working capital remains committed throughout the holding period. The model releases the same amount at exit.

It does not spend this working capital to absorb interim losses. Negative annual investor cash still requires a separate equity contribution.

## 4. Input register

The field paths below also identify values in the exported study JSON. Technical bounds prevent unsupported calculations; they do not establish commercial plausibility.

Text must not contain unsupported control characters or incomplete Unicode characters. Normal tabs, line breaks, and complete Unicode characters are permitted.

### 4.1 Identification and acquisition

| Field | Meaning | Unit or limit |
|---|---|---|
| `schemaVersion` | Study data structure | Must equal `1`. |
| `name` | Study name | Text, maximum 200 characters. |
| `notes` | Assumption sources and analyst notes | Text, maximum 10,000 characters. |
| `vessel.name` | Vessel name | Text, maximum 200 characters. |
| `vessel.type` | Vessel type | Text, maximum 200 characters. |
| `vessel.builtYear` | Descriptive build year | Whole number, 0–2200; 0 can mean unspecified. |
| `vessel.deadweight` | Descriptive deadweight tonnage | Tonnes, 0–1,000,000. |
| `vessel.ldt` | Light displacement for scrap calculation | Tonnes, 0–1,000,000. |
| `acquisition.price` | Vessel purchase price | USD, 0.01–1,000,000,000,000. |
| `acquisition.transactionCosts` | Initial transaction costs | USD, 0–1,000,000,000,000. |
| `acquisition.workingCapital` | Initial funding released at exit | USD, 0–1,000,000,000,000. |

Name, type, build year, and deadweight do not change returns. LDT changes returns only when scrap mode sets the terminal value.

### 4.2 Financing and projection

| Field | Meaning | Unit or limit |
|---|---|---|
| `financing.ltvPct` | Initial debt as a percentage of purchase price | 0–100%. |
| `financing.interestPct` | Fixed annual interest on opening debt | 0–100%. |
| `financing.tenorYears` | Year of full loan maturity | Whole years, 1–30. |
| `financing.balloonPct` | Initial debt fraction excluded from regular amortization | 0–100%. |
| `financing.arrangementFeePct` | Fee on initial debt draw | 0–100%. |
| `projection.holdYears` | Year of vessel disposal | Whole years, 1–30. |
| `projection.assetDiscountPct` | Required return for asset NPV | 0–100% annually. |
| `projection.equityDiscountPct` | Required return for equity NPVs | 0–100% annually. |

Debt funds only its specified percentage of purchase price. Transaction costs, working capital, CAPEX, and loan fees increase the remaining equity requirement.

### 4.3 Operations and schedules

| Field | Meaning | Unit or limit |
|---|---|---|
| `operations.dailyOpex` | First-year operating cost per cost day | USD/day, 0–100,000,000. |
| `operations.opexDays` | Annual days that accrue operating cost | Whole days, 0–365. |
| `operations.inflationPct` | Annual OPEX change after year one | −100–100%. |
| `operations.baseDailyRate` | Charter rate when no annual override exists | USD/day, 0–100,000,000. |
| `operations.baseRevenueDays` | Earning days when no annual override exists | Whole days, 0–365. |
| `operations.brokeragePct` | Percentage of gross charter revenue | 0–100%. |
| `operations.managementFeePct` | Annual percentage of original purchase price | 0–100%. |
| `charter[].year` | Year to override | Whole year, 1 through holding period. |
| `charter[].dailyRate` | Override daily charter rate | USD/day, 0–100,000,000. |
| `charter[].revenueDays` | Override earning days | Whole days, 0–365. |
| `capex[].year` | Year of capital payment | Whole year, 0 through holding period. |
| `capex[].amount` | Capital payment | USD, 0–1,000,000,000,000. |
| `capex[].label` | Payment description | Text, maximum 200 characters. |

Each charter year can appear once. Several CAPEX payments may occur in the same year; the engine adds them.

The engine and native importer accept at most 30 charter rows and 300 CAPEX rows.

OPEX and earning days are independent assumptions. Reduced earning days do not automatically reduce operating costs.

Avoid double counting technical management costs. Enter them in daily OPEX or the separate management fee according to their actual contractual basis.

### 4.4 Exit, tax, and carry

| Field | Meaning | Unit or limit |
|---|---|---|
| `exit.mode` | Terminal-value method | `depreciation`, `manual`, or `scrap`. |
| `exit.depreciationPct` | Annual decline used only by declining-value exit | 0–100%. |
| `exit.manualValue` | Gross vessel sale value for manual exit | USD, 0–1,000,000,000,000. |
| `exit.scrapPerTon` | Scrap price applied to LDT | USD/tonne, 0–100,000,000. |
| `exit.disposalCostPct` | Selling costs on gross terminal value | 0–100%. |
| `tax.ratePct` | Simplified annual tax rate | 0–100%. |
| `tax.annualDepreciationPct` | Annual declining-balance tax depreciation | 0–100%. |
| `tax.taxSaleGain` | Include positive sale gains in final-year taxable income | `true` or `false`. |
| `carry.ratePct` | Sponsor share of positive aggregate nominal equity profit | 0–100%. |

Exit-value decline and tax depreciation are separate inputs. Neither is an appraisal or an automatic tax-law assumption.

Inactive exit fields remain in the study. Only the selected exit mode determines gross terminal value.

## 5. Equations and model sequence

### 5.1 Symbols

All currency variables below use USD unless another unit is stated. Rates in equations are decimal fractions.

| Symbol | Definition |
|---|---|
| `t`, `H`, `T` | Current year, holding years, loan tenor years. |
| `P`, `X`, `W` | Purchase price, transaction costs, initial working capital. |
| `K_t` | Sum of CAPEX paid at time `t`. |
| `λ`, `i`, `b`, `a` | Debt fraction, interest rate, balloon fraction, arrangement-fee rate. |
| `D_0`, `E_0` | Initial debt and equity funding. |
| `F_D` | Initial debt arrangement fee. |
| `h_t`, `e_t` | Charter rate in USD/day and earning days in year `t`. |
| `o`, `d_o`, `g` | First-year daily OPEX, annual cost days, OPEX inflation. |
| `β`, `m`, `c` | Brokerage rate, annual management-fee rate, carry rate. |
| `R_t`, `O_t`, `B_t`, `M_t` | Revenue, OPEX, brokerage, management fee. |
| `S_t` | Operating surplus after brokerage and management. |
| `L_t`, `I_t` | Opening debt and annual interest. |
| `A`, `A_t` | Scheduled annual principal amount and actual scheduled payment. |
| `J_t`, `Q_t` | Maturity principal and additional exit debt settlement. |
| `V`, `s`, `N` | Gross terminal value, disposal-cost rate, net sale cash. |
| `δ`, `q`, `ℓ` | Exit-value decline rate, scrap price per tonne, vessel LDT. |
| `τ`, `p`, `TB_t`, `Dep_t` | Tax rate, tax-depreciation rate, closing tax book, tax depreciation. |
| `G_t` | Positive taxable sale gain, if enabled. |
| `TaxA_t`, `TaxE_t`, `TaxF_t` | Asset tax, equity tax, and pre-annual-fee equity tax. |
| `Z_t` | Net sale cash plus working-capital release. |
| `ACF_t`, `FCF_t`, `PCF_t`, `ECF_t` | Asset, pre-annual-fee equity, pre-carry equity, and final investor cash flow. |
| `C` | Total carry paid in the final year. |
| `r_A`, `r_E` | Asset and equity discount rates. |

### 5.2 Acquisition funding

```text
K_0 = sum of all CAPEX entries assigned to year 0
D_0 = P × λ
F_D = D_0 × a
Asset uses = P + X + W + K_0
Total initial uses = P + X + W + K_0 + F_D
E_0 = Total initial uses − D_0
```

The initial funding identity is:

```text
Initial debt + Initial equity = Total initial uses
```

The asset stream excludes the financing arrangement fee. All equity streams include that fee in initial equity.

### 5.3 Annual revenue, costs, and fees

For an overridden year, use its entered `h_t` and `e_t`. Otherwise, use the base rate and base earning days.

```text
R_t = h_t × e_t
O_t = o × d_o × (1 + g)^(t − 1)
B_t = R_t × β
M_t = P × m
S_t = R_t − O_t − B_t − M_t
K_t = sum of CAPEX entries assigned to year t
```

Year one has no OPEX inflation uplift. Year two applies one uplift; year three applies two.

Management fees use original purchase price every year. They do not decline with debt or terminal value.

CAPEX is a cash payment when scheduled. The model does not spread that payment across the holding period.

### 5.4 Debt and terminal value

The regular principal schedule is equal-principal amortization, not an annuity payment.

```text
A = D_0 × (1 − b) / T
L_1 = D_0
I_t = L_t × i
A_t = min(L_t, A), when t ≤ T; otherwise 0
Debt after scheduled principal = max(0, L_t − A_t)
J_t = Debt after scheduled principal, when t = T; otherwise 0
Debt after maturity payment = max(0, L_t − A_t − J_t)
Q_t = Debt after maturity payment, when t = H; otherwise 0
Closing debt = max(0, L_t − A_t − J_t − Q_t)
L_(t+1) = Closing debt
Total principal_t = A_t + J_t + Q_t
Total debt service_t = I_t + A_t + J_t + Q_t
```

The sale payment `Q_t` is additional to scheduled principal. If maturity occurs at exit, `J_t` already clears the balance.

If maturity precedes exit, later debt and interest are zero. The model does not insert a replacement loan.

Gross terminal value follows the selected mode:

```text
Declining-value mode: V = P × (1 − δ)^H
Manual mode:          V = entered manual value
Scrap mode:           V = ℓ × q
Disposal costs = V × s
N = V − Disposal costs
```

Terminal value is a sale assumption, not a perpetuity. Transaction costs and later CAPEX do not automatically increase it.

Net sale cash is calculated before debt settlement and tax. The annual cash-flow equations deduct those items separately.

### 5.5 Simplified tax

The initial tax book includes purchase price, transaction costs, and initial CAPEX. It excludes working capital and the loan arrangement fee.

```text
TB_0 = P + X + K_0
Dep_t = TB_(t−1) × p
TB_t = max(0, TB_(t−1) − Dep_t) + K_t
G_H = max(0, N − TB_H), when sale-gain taxation is enabled
G_t = 0 in every other case
TaxA_t = τ × max(0, S_t − Dep_t + G_t)
TaxE_t = τ × max(0, S_t − I_t − Dep_t + G_t)
TaxF_t = τ × max(0, R_t − O_t − I_t − Dep_t + G_t)
```

Annual CAPEX enters the tax book after that year's depreciation. It begins depreciating in the following year.

Asset tax excludes the interest deduction. Equity tax includes it.

The pre-annual-fee stream removes brokerage and management fees. Its tax must therefore be recalculated on the higher taxable operating result.

A positive sale gain enters final-year taxable income. A sale below tax book does not create a modeled deductible sale loss.

Within the final year, a negative operating tax base can offset a positive modeled sale gain. The final tax amount cannot be negative.

There are no refunds, loss carryforwards, tax credits, tonnage taxes, VAT, withholding taxes, or investor-level taxes.

Debt arrangement costs receive no tax deduction in this model. Principal repayment and working-capital release do not enter taxable income.

This is an explicit screening convention. It is not a jurisdiction-specific tax calculation.

### 5.6 The four cash-flow streams

At time zero:

```text
ACF_0 = −(P + X + W + K_0)
FCF_0 = PCF_0 = ECF_0 = −E_0
```

During operation:

```text
Z_t = 0, for t < H
Z_H = N + W
ACF_t = S_t − K_t − TaxA_t + Z_t
FCF_t = R_t − O_t − K_t − TaxF_t − I_t − A_t − J_t − Q_t + Z_t
PCF_t = S_t − K_t − TaxE_t − I_t − A_t − J_t − Q_t + Z_t
```

| Stream | Annual fees | Debt | Carry | NPV rate |
|---|---|---|---|---|
| Asset, `ACF` | Included | Excluded | Excluded | Asset rate. |
| Pre-annual-fee equity, `FCF` | Excluded | Included | Excluded | Equity rate. |
| Pre-carry equity, `PCF` | Included | Included | Excluded | Equity rate. |
| Final investor, `ECF` | Included | Included | Included | Equity rate. |

“Pre-fees” in engine output means before annual brokerage and management fees. It still includes transaction costs, disposal costs, and debt arrangement fees.

The asset stream includes the same operating management and brokerage charges as the vessel investment. It excludes investor carry and all financing effects.

### 5.7 Carry

```text
Aggregate pre-carry profit = Σ PCF_t, for t = 0 through H
C = c × max(0, Aggregate pre-carry profit)
ECF_t = PCF_t, for t < H
ECF_H = PCF_H − C
```

The initial investment and later negative cash flows reduce the carry base. Carry is zero when aggregate pre-carry profit is zero or negative.

Carry has no preferred-return hurdle, catch-up tier, investor split, escrow, or clawback model.

Carry is charged at exit even if earlier distributions generated the aggregate profit. This can increase the final year's equity contribution.

### 5.8 Returns and funding

For any cash-flow stream `CF_t`, CapeAI calculates:

```text
Invested capital = −Σ min(CF_t, 0), for t = 0 through H
Distributions = Σ max(CF_t, 0), for t = 0 through H
Nominal profit = Distributions − Invested capital
Multiple = Distributions / Invested capital
ROI = Nominal profit / Invested capital
NPV(r) = Σ [CF_t / (1 + r)^t], for t = 0 through H
```

Multiple and ROI are unavailable when invested capital is zero. ROI is a total holding-period percentage, not an annual return.

Asset NPV uses `r_A`. All three equity NPVs use `r_E`.

IRR solves this equation:

```text
0 = Σ [CF_t / (1 + IRR)^t], for t = 0 through H
```

The engine requires finite cash flows, a negative investment, and a positive distribution. It ignores zero cash flows when counting sign changes.

More than one sign change produces an ambiguous status. This conservative rule does not assert that multiple roots always exist.

A positive first nonzero cash flow is outside the supported investment-IRR convention. A missing valid numerical solution produces an unavailable status.

The solver brackets and bisects `log(1 + IRR)`. It verifies a scaled residual before returning a rate above −100%.

Annual investor funding is calculated as follows:

```text
Contribution_t = max(0, −ECF_t), for t ≥ 1
Distribution_t = max(0, ECF_t), for t ≥ 1
Additional equity = Σ Contribution_t, for t = 1 through H
Cumulative investor cash_t = Σ ECF_j, for j = 0 through t
Total investor contributions = E_0 + Additional equity
```

These are gross contributions and distributions under immediate annual distribution. Earlier positive cash is not retained to offset a later deficit.

### 5.9 Debt-service coverage

The coverage calculation excludes vessel sale proceeds and working-capital release. It also excludes sale-gain tax and carry.

```text
Operating tax_t = τ × max(0, S_t − I_t − Dep_t)
CFADS_t = S_t − K_t − Operating tax_t
Contractual debt service_t = I_t + A_t + J_t
DSCR_t = CFADS_t / Contractual debt service_t
```

The denominator includes the maturity balloon. It excludes debt repaid only because of early disposal.

The numerator deducts actual scheduled CAPEX. It uses the operating equity-tax assumption, which includes an interest deduction.

DSCR is unavailable when contractual debt service is zero. It is not displayed as infinity.

A ratio below 1 means operating cash does not cover the defined contractual payments. Disposal cash may still fund the final-year payment.

A lender's covenant definition can differ. Use the facility agreement for covenant compliance.

### 5.10 Daily charter breakeven

The breakeven rate covers OPEX, annual fees, CAPEX, operating tax, interest, and contractual principal.

It excludes early-sale debt settlement, sale proceeds, working-capital release, sale-gain tax, and carry.

Define the following values for each year:

```text
Cash need = K_t + I_t + A_t + J_t
Tax shield = I_t + Dep_t
Net revenue share = 1 − β
```

The required operating surplus is piecewise:

```text
If Cash need ≤ Tax shield:
    Required surplus = Cash need
If Cash need > Tax shield and τ < 1:
    Required surplus = (Cash need − τ × Tax shield) / (1 − τ)
Breakeven daily rate = (O_t + M_t + Required surplus) / [e_t × (1 − β)]
```

The result is unavailable with zero earning days or 100% brokerage. It is also unavailable when 100% tax prevents finite coverage.

This is a one-year cash-coverage rate. It does not recover the initial investment or achieve the equity discount rate.

### 5.11 Scenarios and totals

The charter sensitivity uses multipliers of 0.70, 0.85, 1.00, 1.15, and 1.30.

```text
Scenario base rate = Original base rate × multiplier
Scenario annual rate_t = Original annual rate_t × multiplier
```

Earning days, OPEX, debt terms, and other assumptions remain unchanged in this comparison. Each case runs through the full engine.

Changing revenue therefore changes brokerage, taxable income, carry, funding needs, and returns where applicable.

The scenarios have no assigned probabilities. A 30% reduction is a selected stress, not an estimated confidence interval.

Totals sum their corresponding annual columns. Total CAPEX also includes year-zero CAPEX.

Total principal must equal the original debt draw. Closing debt must be zero after the final model year.

## 6. Worked examples

All examples use invented inputs. Outputs below were calculated with model version 1.0.0.

### 6.1 All-equity investment: profit with negative NPV

Use the following inputs. Set all unlisted costs, fees, tax, inflation, debt, and carry to zero.

| Input | Value |
|---|---:|
| Purchase price | $10,000,000 |
| Holding period | 2 years |
| Daily charter rate | $10,000 |
| Earning days | 350 |
| Daily OPEX | $6,000 |
| Cost days | 365 |
| Manual sale value | $9,000,000 |
| Asset and equity discount rates | 10% |

Annual revenue is `$10,000 × 350 = $3,500,000`. Annual OPEX is `$6,000 × 365 = $2,190,000`.

Annual operating cash is $1,310,000. The year-two sale adds $9,000,000.

| Time | Investor cash flow |
|---|---:|
| 0 | −$10,000,000 |
| 1 | $1,310,000 |
| 2 | $10,310,000 |

```text
NPV = −10,000,000 + 1,310,000/1.10 + 10,310,000/1.10²
    = −$288,429.75
IRR = 8.2992%
Equity multiple = 11,620,000 / 10,000,000 = 1.1620×
Nominal profit = $1,620,000
Breakeven hire = 2,190,000 / 350 = $6,257.14/day
```

The study has positive nominal profit. It fails to earn the entered 10% required return.

Asset and equity returns match because the study has no financing or carry.

### 6.2 Early sale: repay the actual loan balance

Start with Example 6.1. Change the holding period to three years and manual sale value to $8 million.

Set debt to 50%, interest to 6%, tenor to five years, and balloon to 40%.

Retain Example 6.1's operating assumptions. Set additional costs, fees, tax, inflation, and carry to zero.

```text
Initial debt = $10,000,000 × 50% = $5,000,000
Initial equity = $5,000,000
Annual scheduled principal = $5,000,000 × (1 − 40%) / 5 = $600,000
```

| Item | Year 1 | Year 2 | Year 3 |
|---|---:|---:|---:|
| Opening debt | $5,000,000 | $4,400,000 | $3,800,000 |
| Interest | $300,000 | $264,000 | $228,000 |
| Scheduled principal | $600,000 | $600,000 | $600,000 |
| Additional sale settlement | $0 | $0 | $3,200,000 |
| Closing debt | $4,400,000 | $3,800,000 | $0 |
| Investor cash | $410,000 | $446,000 | $5,282,000 |

The final-year investor cash is:

```text
1,310,000 − 228,000 − 600,000 − 3,200,000 + 8,000,000
= $5,282,000
```

The original balloon assumption is $2 million. Early sale requires $3.2 million after the scheduled payment.

Investor IRR is 7.6483%. Investor NPV at 10% is −$290,232.91. The equity multiple is 1.2276×.

Year-three DSCR is `1,310,000 / 828,000 = 1.5821×`. It excludes both the sale proceeds and early-sale debt settlement.

### 6.3 Tax, fees, CAPEX, working capital, and carry

Use a one-year holding period with these inputs:

| Input | Value |
|---|---:|
| Purchase price | $1,000,000 |
| Transaction costs | $20,000 |
| Initial working capital | $50,000 |
| Year-zero CAPEX | $30,000 |
| Year-one CAPEX | $40,000 |
| Debt percentage | 50% |
| Interest / tenor / balloon | 8% / 5 years / 20% |
| Debt arrangement fee | 1% |
| Charter rate / earning days | $2,000 / 300 |
| Daily OPEX / cost days | $500 / 360 |
| Brokerage / management | 5% / 2% |
| Manual sale value / disposal cost | $1,100,000 / 2% |
| Tax rate / tax depreciation | 20% / 10% |
| Sale-gain taxation | Enabled |
| Carry | 20% |
| Asset / equity discount rates | 10% / 12% |

Set inflation to zero. Acquisition funding is:

```text
Debt = $500,000
Arrangement fee = $5,000
Asset uses = 1,000,000 + 20,000 + 50,000 + 30,000 = $1,100,000
Initial equity = 1,100,000 + 5,000 − 500,000 = $605,000
```

Year-one operations and tax are:

```text
Revenue = 2,000 × 300 = $600,000
OPEX = 500 × 360 = $180,000
Brokerage = 600,000 × 5% = $30,000
Management = 1,000,000 × 2% = $20,000
Operating surplus = 600,000 − 180,000 − 30,000 − 20,000 = $370,000
Interest = 500,000 × 8% = $40,000
Tax depreciation = 1,050,000 × 10% = $105,000
Closing tax book = 1,050,000 − 105,000 + 40,000 = $985,000
Net sale cash = 1,100,000 × 98% = $1,078,000
Positive sale gain = 1,078,000 − 985,000 = $93,000
Equity tax = (370,000 − 40,000 − 105,000 + 93,000) × 20% = $63,600
Asset tax = (370,000 − 105,000 + 93,000) × 20% = $71,600
```

Scheduled principal is $80,000. Early sale settles another $420,000, so total principal is $500,000.

```text
Pre-carry equity cash = 370,000 − 40,000 − 63,600 − 40,000 − 500,000 + 1,078,000 + 50,000
                     = $854,400
Aggregate pre-carry profit = 854,400 − 605,000 = $249,400
Carry = 249,400 × 20% = $49,880
Final investor cash = 854,400 − 49,880 = $804,520
Investor IRR = 804,520 / 605,000 − 1 = 32.9785%
Investor NPV at 12% = −605,000 + 804,520 / 1.12 = $113,321.43
```

The equation contains two $40,000 deductions. One is CAPEX; the other is interest.

The asset stream is `[-1,100,000, 1,386,400]`. Its IRR is 26.0364%, with NPV of $160,363.64 at 10%.

Operating tax excludes the disposal gain: `(370,000 − 40,000 − 105,000) × 20% = $45,000`.

CFADS is `370,000 − 40,000 − 45,000 = $285,000`. DSCR is `285,000 / (40,000 + 80,000) = 2.3750×`.

### 6.4 The editable Aegean example

The application example has a $16 million purchase price and $8 million initial debt. Its holding period and loan tenor are five years.

It includes $320,000 transaction costs, $500,000 working capital, and an $80,000 loan arrangement fee. Initial equity is $8.9 million.

Annual charter rates and earning days vary. Year three includes a $1 million survey payment.

| Output | Expected value |
|---|---:|
| Asset IRR | 16.7741% |
| Asset NPV at 8% | $5,452,348.62 |
| Investor IRR after carry | 19.7261% |
| Investor NPV at 12% | $2,455,196.42 |
| Investor multiple | 1.977831× |
| Gross terminal value | $12,380,495.00 |
| Disposal costs | $247,609.90 |
| Total carry | $2,175,674.14 |
| Additional equity | $0.00 |

The fifth-year scheduled principal is $1.12 million. The maturity payment is another $2.4 million.

Year-five operating DSCR is about 1.0058×. This near-one ratio deserves attention despite the positive lifetime returns.

The example's tax rate is zero. Its result does not establish a tax treatment for a real investment.

### 6.5 When IRR is unavailable or ambiguous

For cash flows `[-100, 0]`, the investor recovers nothing. The engine reports IRR as unavailable.

For `[-100, 230, -132]`, cash flows change sign twice. The mathematical equation has roots at 10% and 20%.

The engine reports an ambiguous status instead of selecting one rate. Use NPV at a justified discount rate.

### 6.6 Additional equity reduces the carry base

Use a $100 purchase, a two-year hold, $20 year-one CAPEX, and a $170 manual sale value.

Set revenue, operating costs, debt, fees, and tax to zero. Set carry to 20%.

```text
Pre-carry cash flows = [−100, −20, 170]
Whole-deal pre-carry profit = −100 − 20 + 170 = $50
Carry = $50 × 20% = $10
Investor cash flows = [−100, −20, 160]
Total contributions = $100 + $20 = $120
Additional equity = $20
Distributions = $160
Investor multiple = $160 / $120 = 1.3333×
```

The $20 contribution is part of invested capital. Ignoring it would overstate both the carry base and the investor multiple.

### 6.7 Maturity before disposal requires funding

Use a $100 purchase, 50% debt, two-year loan tenor, 40% balloon, and three-year holding period.

Set interest, costs, revenue, fees, tax, and carry to zero. Set the manual sale value to $100.

```text
Initial debt = $50
Initial equity = $50
Scheduled principal = $50 × (1 − 40%) / 2 = $15
Year-one principal = $15
Year-two principal = $15 scheduled + $20 maturity = $35
Year-three debt = $0
Investor cash flows = [−50, −15, −35, 100]
Additional equity = $50
Investor IRR = 0%
```

The sale occurs after the loan matures. Investors must fund the intervening principal payments under this model.

The calculation does not silently postpone the balloon until sale.

## 7. Saving, importing, and sharing

### 7.1 Device-first data model

This release has no account and no cloud study database. It has no external AI integration or market-data connector.

The application saves study data in the current browser's local storage. A named library can hold up to 40 studies.

Storage belongs to the website origin, browser profile, and device. Another browser or device will not automatically see the same studies.

An origin is its scheme, host, and port; URL paths do not create storage boundaries.

GitHub Pages apps under the same `username.github.io` share an origin, so their scripts can access the same browser storage.

For confidential studies, use a separate browser profile or a trusted local server.

Browser storage is not encrypted by CapeAI. Someone with access to the same unlocked browser profile may access its studies.

Clearing site data can remove the local draft and library. Private browsing, browser policies, or storage limits can prevent saving.

The hosting service still receives ordinary requests for the application files. Study fields are not submitted to a cloud study service.

### 7.2 Save the draft and a named study

The editable draft saves automatically after changes when browser storage is available. A named library entry is a separate saved snapshot.

1. Enter a recognizable study name.
2. Select Save study.
3. Open Device library.
4. Check that the named entry appears.

Use Save a copy to create another named entry. This supports separate base, downside, and alternative-exit studies.

Replacing unsaved work can open Keep a copy of this study? Choose Save & continue to preserve a named copy first.

Continue without a copy proceeds without making that copy. Cancel returns to the current study.

If saving fails, the dialog shows the error and keeps the current study unchanged.

Automatic draft saving is not a portable backup. Export JSON before changing browsers, clearing site data, or moving to another device.

### 7.3 Keep a portable backup

1. Open Export.
2. Select Study JSON.
3. Save the file in your chosen folder.
4. Include a study date in the filename.
5. Keep the file with its supporting assumptions.

JSON contains readable study data. It is not password-protected or encrypted.

The native export identifies `capeai.study`, export version 1, and study schema version 1. It includes the export timestamp and supported study fields.

### 7.4 Import a study

1. Open Device library.
2. Select Import JSON.
3. Choose the exported study file.
4. Read the import warnings.
5. Correct any invalid inputs.
6. Review the calculated results.
7. Select Save study.

The import limit is 2,097,152 bytes, or 2 MiB. Unsupported native study fields are excluded with a warning.

An unsupported schema version or wrong data type blocks import. Supported data with invalid numerical bounds can load for correction.

Results remain unavailable until all blocking model errors are fixed. Import validation does not authenticate a file's author or assumptions.

### 7.5 Migrate original HTML studies

The importer recognizes original flat-field JSON exports. It maps supported acquisition, financing, cost, charter, and exit fields.

Original authentication fields and unsupported content are excluded. They do not enter the replacement study schema.

Legacy survey budgets lack reliable payment years. The migration assigns recognized budgets to year one and displays a warning.

1. Open the migrated CAPEX schedule.
2. Set each payment's actual year.
3. Check all annual charter rows.
4. Review the new transaction-cost and working-capital fields.
5. Review discount rates, taxes, and disposal costs.
6. Export the corrected study in the new format.

New fields use the blank-study defaults during migration. These defaults require review.

Empty legacy exit depreciation, OPEX inflation, and brokerage fields use 0%, 2.5%, and 1.25%, respectively. Explicit zero values remain zero.

The migration reports these assumptions. Review the values before comparing the imported study with an earlier report.

The old React application's separate JSON structure is not the original flat-field format. Unsupported files must be entered manually.

The importer does not remove credentials from old files or historical cloud records. Keep the historical security finding separate from the new app's behavior.

### 7.6 Explain the shared result

A study file preserves inputs. A report records an interpreted result at a particular model version.

Include both when another analyst must reproduce the work. Include the underlying evidence for rates, costs, financing, and terminal value.

Use the application's print view for a browser-generated PDF. PDF appearance can vary with browser print settings.

1. Open Export.
2. Select Print / PDF report.
3. Open the browser's Print command in the report tab.
4. Select the browser's PDF destination.
5. Save the report with the study JSON.

Download manual PDF opens the reference book. Print / PDF report creates a report for the current study.

| Output | Contents and purpose |
|---|---|
| Study JSON | Supported editable inputs, format version, and export timestamp. Use it to reopen or reproduce a study. |
| Cash-flow CSV | Time-zero and annual rows, four return bases, full input paths, and model warnings. Use it for reconciliation. |
| Print report | Formatted returns, funding, cash flows, scenarios, and complete assumptions. Use the browser's Print command for PDF. |
| PowerPoint deck | Presentation summary of returns, funding, annual cash flows, scenarios, and core assumptions. Keep JSON and CSV beside it. |

CSV IRR and ROI values use decimal fractions. A value of `0.10` means 10%; input percentage fields still use whole percentages.

The CSV's year-zero cash-flow columns include the complete initial funding. Its expense columns describe operating years and show zero at acquisition.

Initial CAPEX remains in the input record and initial cash outflow. Do not infer total CAPEX from the annual expense column alone.

CSV text that could start a spreadsheet formula receives a protective apostrophe. Numeric amounts remain numeric.

Reports and presentation decks recalculate the selected study with the same engine. They do not use the original application's separate export formulas.

PowerPoint creation runs locally with a bundled library. It does not send the study to a presentation service.

Exported calculated results require valid model inputs. JSON can preserve supported draft data that still needs input corrections.

The original sign-in, cloud saving, and unfinished AI actions have been retired. They are not part of this release.

## 8. Local operation

The application is static browser software. It does not require a study server, database, or API key.

Use Node.js 20 or later. Node.js 24 is recommended for the documented workflow.

No dependency installation is required to run the application. The repository contains its browser assets and development scripts.

The source repository is [Cavramoudis/capeai-maritime](https://github.com/Cavramoudis/capeai-maritime).

The hosted application is [CapeAI](https://cavramoudis.github.io/capeai-maritime/). Its [web manual](https://cavramoudis.github.io/capeai-maritime/manual.html) and [PDF reference book](https://cavramoudis.github.io/capeai-maritime/manual.pdf) accompany the calculator.

1. Clone the published repository.
2. Open its directory in a terminal.
3. Run the documented local server command.
4. Open the displayed local URL.
5. Import your exported study JSON.

For a new local copy, run:

```sh
git clone https://github.com/Cavramoudis/capeai-maritime.git
cd capeai-maritime
npm run dev
```

Open `http://127.0.0.1:4173` in your browser. Keep the terminal running while you use the application.

Press `Ctrl+C` in the terminal to stop the server. For later sessions, run `npm run dev` from the existing repository directory.

Use the same local address and port to reopen existing local studies. A different host or port creates a separate storage origin.

To run the automated checks:

```sh
npm test
```

To create the static deployment output:

```sh
npm run build
```

Local and hosted URLs have separate browser storage. Use JSON export and import to move studies between them.

The local server serves only this computer through `127.0.0.1`. It is not configured to share the calculator with other devices.

After source edits, rebuild with `npm run build` and reload the browser. The production files are generated in `dist/`.

## 9. Errors and unavailable results

| Message or state | Meaning | Action |
|---|---|---|
| Invalid purchase price | The model needs a positive price. | Enter the actual study price. |
| Invalid number | A value is missing, nonfinite, or outside supported bounds. | Correct the identified field. |
| Duplicate charter year | Two rows describe the same year. | Keep one row for that year. |
| Schedule beyond holding period | A charter or CAPEX row occurs after disposal. | Correct the year or holding period. |
| IRR unavailable | The cash-flow pattern or numerical result does not support an investment IRR. | Read the detailed reason and inspect NPV. |
| IRR ambiguous | Cash flows change sign more than once. | Use NPV and inspect funding dates. |
| DSCR unavailable | Contractual debt service is zero. | Inspect operating cash directly. |
| Breakeven unavailable | Earning days or net revenue share prevent a finite rate. | Inspect the year's assumptions. |
| Additional equity required | One or more annual investor cash flows are negative. | Arrange funding or revise assumptions. |
| Storage unavailable | The browser cannot retain the study. | Export a JSON backup. |
| Damaged saved data | Some records cannot load safely; the original browser data remains unchanged. | Export readable studies before changing site storage. |
| Unsupported import version | The file uses an unknown schema or export version. | Use a supported version or enter the study manually. |

A blank cell or unavailable result is not zero. Zero is a valid numerical result when the model calculates it.

## 10. Limits and analyst checks

### 10.1 Model boundaries

- Annual timing can conceal monthly and seasonal cash shortages.
- The model uses one vessel and one fixed-rate loan.
- It does not simulate refinancing, floating interest, hedges, or foreign exchange.
- It does not model lender covenants, enforcement, defaults, or limited-recourse loss allocation.
- It does not model a debt-service reserve account or cash sweep.
- Working capital is a fixed initial amount with full terminal recovery.
- It does not forecast receivables, payables, inventory, or working-capital losses.
- All capital payments enter one declining tax book under the simplified tax convention.
- It does not model component-specific tax lives or special survey amortization rules.
- It does not apply a preferred-return waterfall or investor-specific tax treatment.
- It does not include emissions, fuel, or regulatory costs unless the analyst enters their cash effect.
- It does not fetch market data or assign scenario probabilities.
- It assumes full collection of entered charter revenue and full recovery of entered sale proceeds.

Negative investor cash represents another contribution. It does not automatically represent a legal obligation or feasible funding commitment.

The annual model also nets inflows against outflows within the same year. Actual payment dates can require more peak liquidity than the displayed contribution.

### 10.2 Validate the investment case

1. Confirm the vessel's technical condition.
2. Verify the acquisition price and transaction costs.
3. Check charter counterparty and collection assumptions.
4. Estimate off-hire consistently with maintenance plans.
5. Verify operating-cost coverage and fee definitions.
6. Check the loan's actual repayment terms.
7. Confirm the tax structure independently.
8. Test lower charter rates and fewer earning days.
9. Test higher costs and earlier CAPEX.
10. Test a lower sale value.
11. Confirm the source of every required equity contribution.
12. Record the model version with the investment decision.

These checks concern the assumptions supporting the calculation. Software correctness alone cannot establish their reliability.

## 11. Implementation reference

| File | Responsibility |
|---|---|
| [`src/model.mjs`](../src/model.mjs) | Validation, annual calculations, return metrics, and sensitivity. |
| [`src/studies.mjs`](../src/studies.mjs) | Import, export, legacy migration, and local storage. |
| [`docs/MODEL-CONTRACT.md`](MODEL-CONTRACT.md) | Concise engineering contract for the model. |
| [`docs/CURRENT-SYSTEM.md`](CURRENT-SYSTEM.md) | Evidence-based description of the original application. |
| [`docs/TARGET-SYSTEM.md`](TARGET-SYSTEM.md) | Product requirements and acceptance criteria. |
| [`docs/GLOSSARY.md`](GLOSSARY.md) | Controlled project terminology. |

`calculateStudy()` returns validation issues before calculating an invalid study. A valid result contains funding, annual rows, four cash-flow streams, metrics, totals, and warnings.

`calculateSensitivity()` calls the same financial engine for each charter case. Reports must use these results instead of reimplementing equations.

Study schema version and model version serve different purposes. The schema identifies data structure; the model version identifies calculation rules.

The manual's equations are original explanations of this implementation. The financial references provide general valuation principles, not an endorsement of the software.

## 12. Editorial verification

The project's target is at least 80% of prose sentences with no more than 25 words.

At release, 100% of measured prose sentence candidates met the 25-word limit. Run `npm run check:docs` for current counts.

All measured procedural sentences contained no more than 20 words. The procedures use one principal action per step.

The repository check excludes headings, tables, fenced equations, and code samples. A separate editorial check included punctuated table cells and numbered procedures.

The check normalized Markdown links and retained inline field names. It counted words with punctuation-based sentence boundaries.

This verifies a bounded writing metric. It does not certify the ASD-STE100 grammar rules, dictionary, or full standard.

Read the [writing-source note](references.md#writing-guidance) for the distinction between this editorial target and formal conformity.
