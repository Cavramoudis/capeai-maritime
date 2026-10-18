import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ENGINE_VERSION, createBlankStudy, createExampleStudy, validateStudy,
  calculateStudy, calculateIRR, calculateNPV, calculateSensitivity,
} from '../src/model.mjs';

// Reference fixture: purchase for $100 now, sell for $110 in one year.
// No operations, finance, tax or fees. All reference cases are explicit changes.
function simpleStudy() {
  const study = createBlankStudy();
  study.name = 'Independent arithmetic fixture';
  study.acquisition.price = 100;
  study.projection.holdYears = 1;
  study.projection.assetDiscountPct = 10;
  study.projection.equityDiscountPct = 10;
  study.exit.mode = 'manual';
  study.exit.manualValue = 110;
  return study;
}
function near(actual, expected, tolerance = 1e-8) {
  assert.equal(typeof actual, 'number');
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}
function noNonfinite(value) {
  if (typeof value === 'number') assert.ok(Number.isFinite(value));
  else if (value !== null && typeof value === 'object') Object.values(value).forEach(noNonfinite);
}

test('known one-year investment reconciles IRR, NPV, ROI and money multiple', () => {
  const result = calculateStudy(simpleStudy());
  assert.equal(result.valid, true);
  assert.equal(result.engineVersion, ENGINE_VERSION);
  assert.deepEqual(result.flows.investor, [-100, 110]);
  near(result.metrics.investor.irr.value, 0.1);
  near(result.metrics.investor.npv, 0);
  near(result.metrics.investor.roi, 0.1);
  near(result.metrics.investor.multiple, 1.1);
  assert.equal(result.metrics.investor.invested, 100);
  assert.equal(result.metrics.investor.distributions, 110);
});

test('zero debt, interest, annual fees, carry and inflation remain zero', () => {
  const study = simpleStudy();
  study.projection.holdYears = 2;
  study.operations.dailyOpex = 1;
  study.operations.opexDays = 10;
  const result = calculateStudy(study);
  assert.equal(result.funding.initialDebt, 0);
  assert.equal(result.funding.initialEquity, 100);
  assert.deepEqual(result.rows.map((row) => row.opex), [10, 10]);
  for (const key of ['interest', 'principal', 'management', 'brokerage', 'carry']) assert.equal(result.totals[key], 0);
  assert.deepEqual(result.flows.preFees, result.flows.investor);
  assert.equal(result.rows[0].dscr, null);
});

test('individual charter rates change all financial outputs and sensitivity uses the same engine', () => {
  const study = simpleStudy();
  study.projection.holdYears = 2;
  study.operations.baseDailyRate = 100;
  study.operations.baseRevenueDays = 3;
  study.operations.brokeragePct = 10;
  study.charter = [{ year: 1, dailyRate: 50, revenueDays: 2 }];
  const result = calculateStudy(study);
  assert.deepEqual(result.rows.map((row) => row.revenue), [100, 300]);
  assert.deepEqual(result.rows.map((row) => row.brokerage), [10, 30]);
  assert.deepEqual(result.flows.investor, [-100, 90, 380]);
  const scenarios = calculateSensitivity(study, [0.5, 1]);
  near(scenarios[1].npv, result.metrics.investor.npv);
  near(scenarios[1].irr.value, result.metrics.investor.irr.value);
  const halved = structuredClone(study);
  halved.operations.baseDailyRate = 50;
  halved.charter[0].dailyRate = 25;
  near(scenarios[0].npv, calculateStudy(halved).metrics.investor.npv);
});

test('explicit zero charter days and zero charter rate model no hire', () => {
  const study = simpleStudy();
  study.projection.holdYears = 2;
  study.operations.baseDailyRate = 100;
  study.charter = [{ year: 1, dailyRate: 100, revenueDays: 0 }, { year: 2, dailyRate: 0, revenueDays: 350 }];
  const result = calculateStudy(study);
  assert.deepEqual(result.rows.map((row) => row.revenue), [0, 0]);
  assert.equal(result.rows[0].breakevenDailyRate, null);
});

test('early sale settles $3.19M outstanding, not the $1.65M contractual balloon', () => {
  const study = simpleStudy();
  study.acquisition.price = 10000000;
  study.projection.holdYears = 3;
  study.financing = { ltvPct: 55, interestPct: 7.05, tenorYears: 5, balloonPct: 30, arrangementFeePct: 0 };
  study.exit.manualValue = 10000000;
  const result = calculateStudy(study);
  near(result.rows[0].scheduledPrincipal, 770000);
  near(result.rows[2].exitDebtSettlement, 3190000);
  near(result.rows[2].debtClosing, 0);
  near(result.totals.principal, 5500000);
  near(result.exit.debtSettlement, 3190000);
});

test('balloon is paid at maturity with no interest or principal after maturity', () => {
  const study = simpleStudy();
  study.projection.holdYears = 3;
  study.financing = { ltvPct: 50, interestPct: 10, tenorYears: 2, balloonPct: 40, arrangementFeePct: 0 };
  const result = calculateStudy(study);
  assert.deepEqual(result.rows.map((row) => row.interest), [5, 3.5, 0]);
  assert.deepEqual(result.rows.map((row) => row.scheduledPrincipal), [15, 15, 0]);
  assert.deepEqual(result.rows.map((row) => row.maturityPrincipal), [0, 20, 0]);
  assert.deepEqual(result.rows.map((row) => row.debtClosing), [35, 0, 0]);
  assert.equal(result.exit.debtSettlement, 0);
  assert.equal(result.totals.principal, 50);
});

test('sale at maturity does not double count principal', () => {
  const study = simpleStudy();
  study.financing = { ltvPct: 50, interestPct: 0, tenorYears: 1, balloonPct: 100, arrangementFeePct: 0 };
  const result = calculateStudy(study);
  assert.equal(result.rows[0].scheduledPrincipal, 0);
  assert.equal(result.rows[0].maturityPrincipal, 50);
  assert.equal(result.rows[0].exitDebtSettlement, 0);
  assert.equal(result.rows[0].principal, 50);
  assert.deepEqual(result.flows.investor, [-50, 60]);
});

test('transaction costs, initial capex, debt fee and working capital reconcile at funding and exit', () => {
  const study = simpleStudy();
  study.acquisition.transactionCosts = 5;
  study.acquisition.workingCapital = 10;
  study.capex = [{ year: 0, amount: 20, label: 'Initial refit' }];
  study.financing = { ltvPct: 50, interestPct: 10, tenorYears: 2, balloonPct: 0, arrangementFeePct: 2 };
  const result = calculateStudy(study);
  assert.deepEqual(result.funding, { initialUses: 136, initialDebt: 50, initialEquity: 86, arrangementFee: 1, upfrontCapex: 20 });
  assert.deepEqual(result.flows.asset, [-135, 120]);
  assert.deepEqual(result.flows.investor, [-86, 65]);
  assert.equal(result.exit.workingCapitalRelease, 10);
  assert.equal(result.funding.initialDebt + result.funding.initialEquity, result.funding.initialUses);
});

test('capex occurs in the selected year and actual deficits count as additional invested equity', () => {
  const study = simpleStudy();
  study.projection.holdYears = 2;
  study.capex = [{ year: 1, amount: 20, label: 'Dock' }, { year: 2, amount: 30, label: 'Survey' }];
  const result = calculateStudy(study);
  assert.deepEqual(result.flows.investor, [-100, -20, 80]);
  assert.deepEqual(result.rows.map((row) => row.capex), [20, 30]);
  assert.equal(result.metrics.investor.invested, 120);
  assert.equal(result.metrics.investor.distributions, 80);
  assert.equal(result.totals.additionalEquity, 20);
  near(result.metrics.investor.multiple, 2 / 3);
  near(result.metrics.investor.roi, -1 / 3);
  assert.equal(result.rows[1].cumulativeInvestorCashFlow, -40);
});

test('whole-deal carry includes losses and additional contributions, with consistent net metrics', () => {
  const study = simpleStudy();
  study.projection.holdYears = 2;
  study.capex = [{ year: 1, amount: 20, label: 'Dock' }];
  study.exit.manualValue = 170;
  study.carry.ratePct = 20;
  const result = calculateStudy(study);
  // Invest 100+20, recover 170 before carry: $50 profit, $10 carry.
  assert.deepEqual(result.flows.preCarry, [-100, -20, 170]);
  assert.deepEqual(result.flows.investor, [-100, -20, 160]);
  assert.equal(result.totals.carry, 10);
  assert.equal(result.metrics.investor.profit, 40);
  near(result.metrics.investor.multiple, 4 / 3);
  assert.equal(result.metrics.investor.invested, 120);
  const loss = structuredClone(study);
  loss.exit.manualValue = 90;
  assert.equal(calculateStudy(loss).totals.carry, 0);
});

test('annual fees flow into cashflow, metrics and scenarios on an explicit common basis', () => {
  const study = simpleStudy();
  study.operations.baseDailyRate = 10;
  study.operations.baseRevenueDays = 10;
  study.operations.brokeragePct = 10;
  study.operations.managementFeePct = 5;
  study.carry.ratePct = 20;
  const result = calculateStudy(study);
  assert.deepEqual(result.flows.preFees, [-100, 210]);
  assert.deepEqual(result.flows.preCarry, [-100, 195]);
  assert.deepEqual(result.flows.investor, [-100, 176]);
  assert.equal(result.totals.carry, 19);
  near(result.metrics.investor.irr.value, 0.76);
  near(result.metrics.investor.roi, 0.76);
  near(calculateSensitivity(study, [1])[0].irr.value, 0.76);
});

test('terminal depreciation, manual and scrap modes are respected including zero depreciation', () => {
  const study = simpleStudy();
  study.projection.holdYears = 2;
  study.exit.mode = 'depreciation';
  study.exit.depreciationPct = 10;
  study.exit.disposalCostPct = 10;
  near(calculateStudy(study).exit.netValue, 72.9);
  study.exit.depreciationPct = 0;
  assert.equal(calculateStudy(study).exit.grossValue, 100);
  study.exit.mode = 'manual';
  assert.equal(calculateStudy(study).exit.grossValue, 110);
  study.exit.mode = 'scrap';
  study.exit.scrapPerTon = 4;
  study.vessel.ldt = 20;
  assert.equal(calculateStudy(study).exit.grossValue, 80);
});

test('breakeven uses earning days and includes brokerage, fixed fees and actual financing', () => {
  const study = simpleStudy();
  study.operations.dailyOpex = 10;
  study.operations.opexDays = 365;
  study.operations.baseRevenueDays = 350;
  study.operations.brokeragePct = 10;
  study.operations.managementFeePct = 1;
  study.financing = { ltvPct: 50, interestPct: 10, tenorYears: 1, balloonPct: 0, arrangementFeePct: 0 };
  const result = calculateStudy(study);
  // $3650 OPEX + $1 management + $5 interest + $50 principal = $3706;
  // 350 earning days retain 90% of gross revenue => $3706 / 315.
  near(result.rows[0].breakevenDailyRate, 3706 / 315);
  study.operations.baseDailyRate = 3706 / 315;
  const atBreakeven = calculateStudy(study).rows[0];
  near(atBreakeven.investorCashFlow - atBreakeven.saleNet, 0);
  near(atBreakeven.dscr, 1);
});

test('DSCR and breakeven exclude disposal proceeds and early-sale debt settlement', () => {
  const study = simpleStudy();
  study.operations.baseDailyRate = 10;
  study.operations.baseRevenueDays = 10;
  study.operations.dailyOpex = 2;
  study.operations.opexDays = 10;
  study.financing = { ltvPct: 50, interestPct: 10, tenorYears: 2, balloonPct: 0, arrangementFeePct: 0 };
  const first = calculateStudy(study).rows[0];
  near(first.dscr, 80 / 30);
  assert.equal(first.exitDebtSettlement, 25);
  near(first.breakevenDailyRate, 5);
  study.exit.manualValue = 1e8;
  const second = calculateStudy(study).rows[0];
  near(second.dscr, first.dscr);
  near(second.breakevenDailyRate, first.breakevenDailyRate);
});

test('simplified annual tax distinguishes unlevered and equity cash flows and sale gain', () => {
  const study = simpleStudy();
  study.operations.baseDailyRate = 10;
  study.operations.baseRevenueDays = 10;
  study.operations.dailyOpex = 2;
  study.operations.opexDays = 10;
  study.financing = { ltvPct: 50, interestPct: 10, tenorYears: 1, balloonPct: 0, arrangementFeePct: 0 };
  study.tax = { ratePct: 25, annualDepreciationPct: 10, taxSaleGain: true };
  const result = calculateStudy(study);
  // Depreciation 10; book 90; net sale 110 => taxable gain 20.
  // Asset taxable = 100-20-10+20 = 90, equity taxable = 85.
  assert.equal(result.rows[0].taxDepreciation, 10);
  assert.equal(result.exit.taxableGain, 20);
  assert.equal(result.rows[0].assetTax, 22.5);
  assert.equal(result.rows[0].equityTax, 21.25);
  assert.deepEqual(result.flows.asset, [-100, 167.5]);
  assert.deepEqual(result.flows.investor, [-50, 113.75]);
  // Excludes disposal gain in operating break-even: surplus requirement
  // = (55 - 25%*(5+10))/75% = 68 1/3; gross needed 88 1/3.
  near(result.rows[0].breakevenDailyRate, 53 / 6);
  study.operations.baseDailyRate = 53 / 6;
  near(calculateStudy(study).rows[0].dscr, 1);
});

test('tax book depreciates on opening balance; capex joins basis at year end; no loss carryforward', () => {
  const study = simpleStudy();
  study.projection.holdYears = 2;
  study.tax = { ratePct: 25, annualDepreciationPct: 10, taxSaleGain: false };
  study.capex = [{ year: 1, amount: 20, label: 'Capitalized at year end' }];
  study.operations.dailyOpex = 1;
  study.operations.opexDays = 10;
  study.charter = [{ year: 1, dailyRate: 0, revenueDays: 1 }, { year: 2, dailyRate: 100, revenueDays: 1 }];
  const result = calculateStudy(study);
  assert.deepEqual(result.rows.map((row) => row.taxDepreciation), [10, 11]);
  assert.deepEqual(result.rows.map((row) => row.taxBookValue), [110, 99]);
  assert.deepEqual(result.rows.map((row) => row.equityTax), [0, 19.75]);
});

test('IRR never emits a fake rate for no recovery, multiple sign changes or invalid cash flows', () => {
  assert.equal(calculateIRR([-100, 0]).status, 'unavailable');
  assert.equal(calculateIRR([-100, -10]).value, null);
  assert.equal(calculateIRR([0, 100]).value, null);
  assert.equal(calculateIRR([-100, 230, -132]).status, 'ambiguous'); // Real roots 10% and 20%.
  assert.equal(calculateIRR([-100, Infinity]).value, null);
  assert.equal(calculateIRR([]).value, null);
  near(calculateIRR([-100, 50]).value, -0.5);
  near(calculateIRR([-100, 100]).value, 0);
  near(calculateIRR([0, -100, 110]).value, 0.1);
  near(calculateIRR([-100, 10000]).value, 99, 1e-7);
  near(calculateNPV(0.1, [-100, 230, -132]), 0);
  assert.equal(calculateNPV(-1, [-100, 100]), null);
});

test('example satisfies funding, financing and investor identities with no mutation or nonfinite outputs', () => {
  const study = createExampleStudy();
  const before = structuredClone(study);
  const result = calculateStudy(study);
  assert.equal(result.valid, true);
  assert.deepEqual(study, before);
  near(result.funding.initialDebt + result.funding.initialEquity, result.funding.initialUses);
  near(result.totals.principal, result.funding.initialDebt);
  near(result.metrics.investor.invested, result.funding.initialEquity + result.totals.additionalEquity);
  near(result.metrics.investor.distributions, result.totals.distributions);
  near(result.metrics.investor.profit, result.flows.investor.reduce((a, b) => a + b, 0));
  near(result.flows.preCarry.reduce((a, b) => a + b, 0) - result.metrics.investor.profit, result.totals.carry);
  for (const row of result.rows) {
    near(row.debtOpening - row.principal, row.debtClosing);
    near(row.distribution - row.contribution, row.investorCashFlow);
    near(row.revenue - row.opex - row.brokerage - row.management - row.capex - row.equityTax - row.debtService + row.saleNet + row.workingCapitalRelease - row.carry, row.investorCashFlow);
  }
  noNonfinite(result);
  assert.equal(JSON.parse(JSON.stringify(result)).engineVersion, ENGINE_VERSION);
});

test('invalid assumptions and unknown credential fields fail validation instead of being silently accepted', () => {
  for (const mutate of [
    (study) => { study.financing.ltvPct = 101; },
    (study) => { study.operations.baseRevenueDays = 366; },
    (study) => { study.projection.holdYears = 1.5; },
    (study) => { study.operations.dailyOpex = NaN; },
    (study) => { study.tax.ratePct = -1; },
    (study) => { study.schemaVersion = 2; },
    (study) => { study.auth_password = 'must-not-be-stored'; },
    (study) => { study.acquisition.auth_email = 'private@example.test'; },
    (study) => { study.charter = [{ year: 2, dailyRate: 1, revenueDays: 1 }]; },
    (study) => { study.charter = [{ year: 1, dailyRate: 1, revenueDays: 1 }, { year: 1, dailyRate: 2, revenueDays: 1 }]; },
    (study) => { study.capex = [{ year: 1, amount: -1, label: 'invalid' }]; },
  ]) {
    const study = simpleStudy();
    mutate(study);
    assert.ok(validateStudy(study).some((issue) => issue.severity === 'error'));
    const model = calculateStudy(study);
    assert.equal(model.valid, false);
    assert.equal(model.study, null);
    assert.equal(model.metrics, null);
    noNonfinite(model);
  }
  assert.equal(calculateStudy(null).valid, false);
  assert.equal(calculateStudy(createBlankStudy()).valid, false);
});

test('100% financing and 100% brokerage/tax do not create NaN or invented ratios', () => {
  const study = simpleStudy();
  study.financing.ltvPct = 100;
  study.financing.tenorYears = 1;
  study.operations.brokeragePct = 100;
  study.tax.ratePct = 100;
  const result = calculateStudy(study);
  assert.equal(result.valid, true);
  assert.equal(result.funding.initialEquity, 0);
  assert.equal(result.metrics.investor.multiple, null);
  assert.equal(result.metrics.investor.irr.value, null);
  assert.equal(result.rows[0].breakevenDailyRate, null);
  noNonfinite(result);
});
