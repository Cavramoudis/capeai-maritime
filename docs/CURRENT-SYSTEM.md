# CapeAI: the original system

**Status:** historical description, before the rebuild.  
**Reviewed snapshot:** `e45add581ef9adc3a84ff203363e428c3b29225b`.  
**Review date:** 18 October 2026.  
**Audience:** analysts, owners, developers, and reviewers.

This document describes observed behavior in the original application. It does not describe the replacement release.

Read [Target system](TARGET-SYSTEM.md) for the intended correction. Read [User and model manual](MANUAL.md) for the replacement's actual behavior.

## 1. Purpose and operating model

The original application screens one vessel acquisition. A user supplies vessel details, financing terms, operating assumptions, and an expected exit value.

The browser calculates annual cash flows and investment metrics. No live market-price service supplies its financial assumptions.

Its intended journey has eleven sections. These cover the vessel, acquisition, costs, surveys, charter income, cash flow, SPV fees, sensitivity, and a conclusion.

Vessel descriptions provide context. Purchase price, financing, income, costs, and exit assumptions drive the numerical results.

The application offers study saving, JSON export, printing, and presentation export. Several features have defects described below.

## 2. Three calculation paths

| Path | Location at the reviewed snapshot | Role |
|---|---|---|
| Root application | `index.html` | The observed production website. |
| Presentation generator | A second script in `index.html` | A separate financial model for PowerPoint output. |
| React application | `app 2/src/lib/calculations.ts` | An alternative application with separate defaults and calculations. |

These paths do not share one financial engine. Their definitions and results differ.

The reviewed production HTML matched the repository file byte for byte. Its SHA-256 was `bbc030786ec90e0f7c2ff7a4825720154d1034f9a21b7f949d1978e14ead8109`.

## 3. Inputs and their original role

| Input group | Main fields | Original use |
|---|---|---|
| Vessel | Name, type, DWT, build year, flag, class, specifications, LDT | Identification; LDT feeds scrap value. |
| Acquisition | Price, equity percentage, debt percentage, ownership vehicle | Initial funding and investment structure. |
| Debt | Interest rate, tenor, balloon percentage | Annual interest and principal schedule. |
| Operations | Crew, stores, repairs, insurance, management, miscellaneous costs | Annual operating expense estimate. |
| Cost escalation | OPEX inflation and optional daily override | Future operating expenses. |
| Surveys | Special survey, intermediate survey, other CAPEX | A pooled budget divided across the holding period. |
| Charter | Daily hire, earning days, annual overrides | Base revenue; overrides affect a separate table only. |
| Timing | Holding period, OPEX days | Number of projected years and cost accrual. |
| Exit | Depreciation mode, scrap mode, manual sale value | Terminal vessel value, except in the presentation model. |
| SPV | Management fee, commercial fee, carry, minimum investment | Annual fees and nominal-profit sharing. |
| Commentary | Risks, mitigations, analyst, recommendation | Presentation text; no independent underwriting assessment. |

The engine omits explicit transaction costs, working capital, tax, and NPV. It has no contractual refinancing schedule.

The survey-date fields do not establish dated payments. The calculation spreads the pooled survey budget across every holding year.

## 4. Original financial mechanics

Use the following symbols to read this section:

| Symbol | Meaning | Unit |
|---|---|---|
| `P` | Purchase price | USD |
| `d`, `b`, `i` | Debt fraction, balloon fraction, annual interest rate | Decimal fraction |
| `T`, `H` | Loan tenor and holding period | Years |
| `h`, `e` | Base charter hire and annual earning days | USD/day; days/year |
| `D`, `B`, `A` | Initial debt, original balloon, scheduled annual principal | USD |

The debt schedule starts with these equations:

```text
D = P × d
B = D × b
A = (D − B) / T
Annual interest = opening debt balance × i
```

The principal model calculates base revenue as `h × e` in every year. Annual charter overrides do not feed these cash flows.

The initial cash outflow includes equity only. Later cash flows deduct debt service.

Therefore, the original label “Project IRR” describes a leveraged equity return. It does not describe an unlevered asset return.

At exit, the model subtracts the original balloon from vessel sale value. It does not settle the actual outstanding debt correctly for all timings.

The original carry deducts a percentage of positive aggregate nominal profit. It has no preferred-return hurdle or detailed investor waterfall.

The [original financial source](https://github.com/yiannisk9/capeai.com/blob/e45add581ef9adc3a84ff203363e428c3b29225b/index.html#L1291-L1439) records these mechanics.

## 5. Confirmed defects and their effect

| Defect | Reproducible effect | Required correction |
|---|---|---|
| Annual charter overrides bypass the return model | Lowering one year's hire changes its charter table but leaves headline returns unchanged. | Use annual revenue inputs in every output. |
| Early sale deducts only the balloon | A five-year sale can omit remaining scheduled principal on a ten-year loan. | Settle the actual outstanding loan. |
| Late maturity handling is incomplete | Holding beyond maturity does not fund the balloon at its due date. | Pay all remaining debt at maturity. |
| Breakeven uses the wrong day basis | A displayed breakeven hire rate can still produce a cash loss. | Divide required annual revenue by earning days. |
| Zero inputs become defaults | Zero debt, inflation, fees, or hire can become positive assumptions. | Preserve explicit zero values. |
| Metrics use different fee bases | Headline IRR, charts, and sensitivity can describe different cash-flow streams. | Label each basis and share one engine. |
| IRR lacks failure handling | Cash flows `[-100, 0]` return 10%. | Return an unavailable state when no valid solution exists. |
| Export has a separate engine | Manual and scrap exits can differ between the screen and presentation. | Generate reports from the same calculated result. |
| PowerPoint script redeclares a constant | The script fails before its export function initializes. | Retire or replace the faulty exporter. |

### Example: overstated early-sale proceeds

Assume a $10 million purchase and 50% debt. The loan has a ten-year tenor and a 30% balloon.

Initial debt is $5 million. The original balloon is $1.5 million. Annual principal is $350,000.

After five annual principal payments, debt remains $3.25 million. The original model deducts $1.5 million at sale.

The resulting equity sale proceeds are overstated by $1.75 million. This difference directly distorts investment returns.

### Example: false breakeven

Assume daily OPEX of $6,000, 365 cost days, and 350 earning days. Set debt, surveys, and fees to zero.

Annual OPEX is $2,190,000. The original displayed breakeven is $6,000/day.

At that hire rate, annual revenue is $2,100,000. The vessel loses $90,000 before fees.

The cost-covering rate is `$2,190,000 / 350 = $6,257.14/day`.

### Example: disconnected charter forecast

Use a $15,000/day base hire and 350 earning days. Reduce year-one hire to $5,000/day.

The charter table loses $3.5 million of year-one revenue. The original headline return calculation does not change.

These examples use invented inputs. They do not describe a real vessel investment.

## 6. Storage, privacy, and unfinished functions

The root application includes Supabase sign-in and cloud study saving. Its study serializer collects every input, select, and text area.

This includes the hidden email and password fields. Offline execution confirmed that dummy credentials entered the export and cloud-save payloads.

The review did not inspect historical cloud records. It did not establish whether real passwords were stored.

Study names and other external values enter unsafe HTML rendering paths. Backend row-level access policies are absent from the repository.

The public Supabase anonymous key is not an administrator secret. Its presence does not prove a database-access defect.

The root AI functions lack a complete authenticated integration. The React alternative uses demonstration extraction and a templated conclusion.

The reviewed application provides no verified market data, document intelligence, or investment advice service.

See the [original export serializer](https://github.com/yiannisk9/capeai.com/blob/e45add581ef9adc3a84ff203363e428c3b29225b/index.html#L2631-L2638) and [cloud serializer](https://github.com/yiannisk9/capeai.com/blob/e45add581ef9adc3a84ff203363e428c3b29225b/index.html#L4080-L4093).

## 7. How to use historical studies during migration

1. Keep a separate copy of the original study file.
2. Import a copy into the replacement application.
3. Read each migration warning.
4. Check every financing and exit assumption.
5. Assign survey payments to their actual years.
6. Review the annual charter forecast.
7. Recalculate the study with the replacement engine.
8. Export a new versioned study file.

Do not treat matching old and new IRRs as a migration requirement. Corrected debt, fee, and cash-flow timing can change the result materially.

## 8. Review boundary

The forensic work combined source inspection, isolated function tests, and read-only production checks. It did not certify the original software.

No live study, account, database record, or private financial document was changed during that review.

The original repository history remains the evidence source. The replacement manual records the new implementation separately.
