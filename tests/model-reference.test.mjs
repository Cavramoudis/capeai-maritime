import test from 'node:test';
import assert from 'node:assert/strict';
import { createBlankStudy, createExampleStudy, calculateStudy, calculateNPV, calculateIRR } from '../src/model.mjs';

const close = (actual, expected, absolute = 0.000001) => {
  assert.ok(Number.isFinite(actual));
  assert.ok(Math.abs(actual - expected) <= absolute, `${actual} differs from ${expected}`);
};

test('all seven published manual examples agree with the financial engine', () => {
  const study = createBlankStudy();
  study.acquisition.price = 10000000;
  study.projection = { holdYears: 2, assetDiscountPct: 10, equityDiscountPct: 10 };
  study.operations.baseDailyRate = 10000;
  study.operations.baseRevenueDays = 350;
  study.operations.dailyOpex = 6000;
  study.exit.mode = 'manual';
  study.exit.manualValue = 9000000;
  let model = calculateStudy(study);
  assert.deepEqual(model.flows.investor, [-10000000, 1310000, 10310000]);
  close(model.metrics.investor.npv, -288429.75, 0.005);
  close(model.metrics.investor.irr.value * 100, 8.2992, 0.00005);
  close(model.metrics.investor.multiple, 1.162);
  close(model.rows[0].breakevenDailyRate, 6257.14, 0.005);

  study.projection.holdYears = 3;
  study.exit.manualValue = 8000000;
  study.financing = { ltvPct: 50, interestPct: 6, tenorYears: 5, balloonPct: 40, arrangementFeePct: 0 };
  model = calculateStudy(study);
  assert.deepEqual(model.flows.investor, [-5000000, 410000, 446000, 5282000]);
  close(model.exit.debtSettlement, 3200000);
  close(model.metrics.investor.npv, -290232.91, 0.005);
  close(model.metrics.investor.irr.value * 100, 7.6483, 0.00005);
  close(model.metrics.investor.multiple, 1.2276);

  const taxCase = createBlankStudy();
  taxCase.acquisition = { price: 1000000, transactionCosts: 20000, workingCapital: 50000 };
  taxCase.projection = { holdYears: 1, assetDiscountPct: 10, equityDiscountPct: 12 };
  taxCase.financing = { ltvPct: 50, interestPct: 8, tenorYears: 5, balloonPct: 20, arrangementFeePct: 1 };
  taxCase.operations = { dailyOpex: 500, opexDays: 360, inflationPct: 0, baseDailyRate: 2000, baseRevenueDays: 300, brokeragePct: 5, managementFeePct: 2 };
  taxCase.capex = [{ year: 0, amount: 30000, label: 'Refit' }, { year: 1, amount: 40000, label: 'Dock' }];
  taxCase.exit.mode = 'manual';
  taxCase.exit.manualValue = 1100000;
  taxCase.exit.disposalCostPct = 2;
  taxCase.tax = { ratePct: 20, annualDepreciationPct: 10, taxSaleGain: true };
  taxCase.carry.ratePct = 20;
  model = calculateStudy(taxCase);
  assert.deepEqual(model.flows.investor, [-605000, 804520]);
  assert.deepEqual(model.flows.asset, [-1100000, 1386400]);
  close(model.totals.carry, 49880);
  close(model.rows[0].equityTax, 63600);
  close(model.rows[0].assetTax, 71600);
  close(model.rows[0].dscr, 2.375);
  close(model.metrics.investor.npv, 113321.43, 0.005);
  close(model.metrics.investor.irr.value * 100, 32.9785, 0.00005);
  close(model.metrics.asset.npv, 160363.64, 0.005);

  model = calculateStudy(createExampleStudy());
  close(model.metrics.asset.irr.value * 100, 16.7741, 0.00005);
  close(model.metrics.asset.npv, 5452348.62, 0.005);
  close(model.metrics.investor.irr.value * 100, 19.7261, 0.00005);
  close(model.metrics.investor.npv, 2455196.42, 0.005);
  close(model.metrics.investor.multiple, 1.977831, 0.0000005);
  close(model.totals.carry, 2175674.14, 0.005);
  close(model.exit.grossValue, 12380495);
  close(model.rows[4].maturityPrincipal, 2400000);

  assert.equal(calculateIRR([-100, 0]).status, 'unavailable');
  assert.equal(calculateIRR([-100, 230, -132]).status, 'ambiguous');
  close(calculateNPV(0.1, [-100, 230, -132]), 0);
  close(calculateNPV(0.2, [-100, 230, -132]), 0);

  const contributionCase = createBlankStudy();
  contributionCase.acquisition.price = 100;
  contributionCase.projection.holdYears = 2;
  contributionCase.capex = [{ year: 1, amount: 20, label: 'Dock' }];
  contributionCase.exit.mode = 'manual';
  contributionCase.exit.manualValue = 170;
  contributionCase.carry.ratePct = 20;
  model = calculateStudy(contributionCase);
  assert.deepEqual(model.flows.investor, [-100, -20, 160]);
  close(model.totals.carry, 10);
  close(model.metrics.investor.invested, 120);
  close(model.metrics.investor.multiple, 4 / 3);

  const maturityCase = createBlankStudy();
  maturityCase.acquisition.price = 100;
  maturityCase.projection.holdYears = 3;
  maturityCase.financing.ltvPct = 50;
  maturityCase.financing.tenorYears = 2;
  maturityCase.financing.balloonPct = 40;
  maturityCase.exit.mode = 'manual';
  maturityCase.exit.manualValue = 100;
  model = calculateStudy(maturityCase);
  assert.deepEqual(model.flows.investor, [-50, -15, -35, 100]);
  close(model.totals.additionalEquity, 50);
  close(model.metrics.investor.irr.value, 0);
});

test('32 seeded edge cases reconcile funding, debt, tax shields, NPV and earning-day breakeven', () => {
  let seed = 0xCAFE01;
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  const choose = (values) => values[Math.floor(random() * values.length)];
  for (let caseNumber = 0; caseNumber < 32; caseNumber += 1) {
    const study = createBlankStudy();
    study.acquisition = { price: 100000 + Math.floor(random() * 10000000), transactionCosts: 10000, workingCapital: 20000 };
    study.projection.holdYears = choose([1, 2, 3, 5, 10]);
    study.financing = { ltvPct: choose([0, 50, 100]), interestPct: choose([0, 5, 12]), tenorYears: choose([1, 3, 5]), balloonPct: choose([0, 30, 100]), arrangementFeePct: choose([0, 1]) };
    study.operations = { dailyOpex: choose([0, 500, 6500]), opexDays: choose([0, 365]), inflationPct: choose([-100, 0, 2.5]), baseDailyRate: choose([0, 1000, 15000]), baseRevenueDays: choose([0, 100, 350]), brokeragePct: choose([0, 5, 100]), managementFeePct: choose([0, 2]) };
    study.charter = [{ year: 1, dailyRate: choose([0, 12000]), revenueDays: choose([0, 300, 365]) }];
    study.capex = [{ year: 0, amount: 10000, label: 'Upfront' }, { year: study.projection.holdYears, amount: choose([0, 100000]), label: 'Final year' }];
    study.tax = { ratePct: choose([0, 20, 100]), annualDepreciationPct: choose([0, 10, 100]), taxSaleGain: random() > 0.5 };
    study.exit.mode = choose(['manual', 'depreciation', 'scrap']);
    study.exit.manualValue = study.acquisition.price * 1.2;
    study.exit.depreciationPct = choose([0, 5, 100]);
    study.exit.scrapPerTon = 300;
    study.vessel.ldt = 10000;
    study.exit.disposalCostPct = choose([0, 2, 100]);
    study.carry.ratePct = choose([0, 20, 100]);
    const model = calculateStudy(study);
    assert.equal(model.valid, true, `case ${caseNumber}`);
    const tolerance = 1e-7 * Math.max(1, model.funding.initialUses);
    close(model.funding.initialEquity + model.funding.initialDebt, model.funding.initialUses, tolerance);
    close(model.totals.principal, model.funding.initialDebt, tolerance);
    close(model.rows.at(-1).debtClosing, 0, tolerance);
    close(model.metrics.investor.invested, model.funding.initialEquity + model.totals.additionalEquity, tolerance);
    close(model.metrics.investor.profit, model.metrics.preCarry.profit - model.totals.carry, tolerance);
    for (const [basis, flows] of Object.entries(model.flows)) {
      // Independent direct discounted sum checks the engine's Horner evaluation.
      const rate = model.metrics[basis].discountPct / 100;
      const directNPV = flows.reduce((total, amount, year) => total + amount / ((1 + rate) ** year), 0);
      close(model.metrics[basis].npv, directNPV, tolerance);
      const irr = model.metrics[basis].irr;
      if (irr.status === 'ok') assert.ok(Math.abs(calculateNPV(irr.value, flows)) <= tolerance, JSON.stringify({ caseNumber, basis, irr, flows, tolerance, npv: calculateNPV(irr.value, flows) }));
    }
    for (const row of model.rows) {
      close(row.debtOpening - row.principal, row.debtClosing, tolerance);
      assert.ok(row.equityTax <= row.assetTax + tolerance, 'Interest deduction cannot increase modeled tax.');
      assert.ok(row.equityTax <= row.preFeeTax + tolerance, 'Deductible annual fees cannot increase modeled tax.');
      if (row.breakevenDailyRate === null || row.breakevenDailyRate > 1e8) continue;
      const atRate = structuredClone(study);
      atRate.charter = atRate.charter.filter((item) => item.year !== row.year);
      atRate.charter.push({ year: row.year, dailyRate: row.breakevenDailyRate, revenueDays: row.revenueDays });
      const reference = calculateStudy(atRate).rows[row.year - 1];
      const contractualService = reference.interest + reference.scheduledPrincipal + reference.maturityPrincipal;
      close(reference.operatingCashFlow - contractualService, 0, tolerance);
    }
  }
});
