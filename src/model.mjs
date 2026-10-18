/**
 * CapeAI's single financial engine. Currency: USD. Percent inputs use 55 for 55%.
 * Year 0 is funding; all subsequent cash flows occur at year end.
 * See docs/MODEL-CONTRACT.md for timing, taxes, fee bases and limitations.
 */
export const SCHEMA_VERSION = 1;
export const ENGINE_VERSION = '1.0.0';

const sum = (values) => values.reduce((total, value) => total + value, 0);
const pct = (value) => value / 100;
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const clone = (value) => JSON.parse(JSON.stringify(value));

/** A deliberate empty study, with valid model conventions and no invented vessel. */
export function createBlankStudy() {
  return {
    schemaVersion: SCHEMA_VERSION,
    name: 'Untitled study',
    notes: '',
    vessel: { name: '', type: '', builtYear: 0, deadweight: 0, ldt: 0 },
    acquisition: { price: 0, transactionCosts: 0, workingCapital: 0 },
    financing: { ltvPct: 0, interestPct: 0, tenorYears: 5, balloonPct: 0, arrangementFeePct: 0 },
    operations: {
      dailyOpex: 0, opexDays: 365, inflationPct: 0, baseDailyRate: 0,
      baseRevenueDays: 350, brokeragePct: 0, managementFeePct: 0,
    },
    projection: { holdYears: 5, assetDiscountPct: 8, equityDiscountPct: 12 },
    charter: [],
    capex: [],
    exit: { mode: 'depreciation', depreciationPct: 5, manualValue: 0, scrapPerTon: 0, disposalCostPct: 0 },
    tax: { ratePct: 0, annualDepreciationPct: 0, taxSaleGain: false },
    carry: { ratePct: 0 },
  };
}

/** Illustrative assumptions, not market data or an investment recommendation. */
export function createExampleStudy() {
  const study = createBlankStudy();
  study.name = 'Aegean bulk carrier · illustrative case';
  study.notes = 'Editable example. Rates, costs and vessel details are illustrative assumptions. No live market data.';
  study.vessel = { name: 'MV Aegean Example', type: 'Supramax bulk carrier', builtYear: 2014, deadweight: 56000, ldt: 10000 };
  study.acquisition = { price: 16000000, transactionCosts: 320000, workingCapital: 500000 };
  study.financing = { ltvPct: 50, interestPct: 7, tenorYears: 5, balloonPct: 30, arrangementFeePct: 1 };
  study.operations = {
    dailyOpex: 6500, opexDays: 365, inflationPct: 2.5, baseDailyRate: 18000,
    baseRevenueDays: 350, brokeragePct: 1.25, managementFeePct: 1,
  };
  study.charter = [
    { year: 1, dailyRate: 18000, revenueDays: 350 },
    { year: 2, dailyRate: 17500, revenueDays: 350 },
    { year: 3, dailyRate: 18500, revenueDays: 330 },
    { year: 4, dailyRate: 19000, revenueDays: 350 },
    { year: 5, dailyRate: 19000, revenueDays: 350 },
  ];
  study.capex = [{ year: 3, amount: 1000000, label: 'Scheduled dry dock / special survey' }];
  study.exit.disposalCostPct = 2;
  study.carry.ratePct = 20;
  return study;
}

/** @typedef {{path:string,severity:'error'|'warning',message:string}} Issue */

/** Strict validation also rejects unknown keys; no credential fields belong in studies. */
export function validateStudy(study) {
  /** @type {Issue[]} */
  const issues = [];
  const error = (path, message) => issues.push({ path, severity: 'error', message });
  const warning = (path, message) => issues.push({ path, severity: 'warning', message });
  const shape = (object, path, allowed) => {
    if (!isRecord(object)) { error(path, 'Expected an object.'); return false; }
    for (const key of Object.keys(object)) {
      if (!allowed.includes(key)) error(path ? `${path}.${key}` : key, 'Unknown field. Remove it before loading this study.');
    }
    return true;
  };
  const number = (value, path, min, max, integer = false) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      error(path, 'Enter a finite number.');
    } else if (value < min || value > max || (integer && !Number.isInteger(value))) {
      error(path, `Enter ${integer ? 'a whole number' : 'a number'} from ${min} to ${max}.`);
    }
  };
  const string = (value, path, max = 200) => {
    if (typeof value !== 'string' || value.length > max) error(path, `Enter text with at most ${max} characters.`);
    else if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF\uFFFE\uFFFF]/u.test(value)) error(path, 'Remove unsupported control characters or incomplete Unicode characters.');
  };
  const section = (name, fields) => {
    if (!shape(study[name], name, Object.keys(fields))) return;
    for (const [key, range] of Object.entries(fields)) number(study[name][key], `${name}.${key}`, ...range);
  };
  if (!shape(study, '', ['schemaVersion', 'name', 'notes', 'vessel', 'acquisition', 'financing', 'operations', 'projection', 'charter', 'capex', 'exit', 'tax', 'carry'])) return issues;
  if (study.schemaVersion !== SCHEMA_VERSION) error('schemaVersion', `Expected study schema version ${SCHEMA_VERSION}.`);
  string(study.name, 'name');
  string(study.notes, 'notes', 10000);
  if (shape(study.vessel, 'vessel', ['name', 'type', 'builtYear', 'deadweight', 'ldt'])) {
    string(study.vessel.name, 'vessel.name');
    string(study.vessel.type, 'vessel.type');
    number(study.vessel.builtYear, 'vessel.builtYear', 0, 2200, true);
    number(study.vessel.deadweight, 'vessel.deadweight', 0, 1000000);
    number(study.vessel.ldt, 'vessel.ldt', 0, 1000000);
  }
  section('acquisition', { price: [0.01, 1e12], transactionCosts: [0, 1e12], workingCapital: [0, 1e12] });
  section('financing', { ltvPct: [0, 100], interestPct: [0, 100], tenorYears: [1, 30, true], balloonPct: [0, 100], arrangementFeePct: [0, 100] });
  section('operations', {
    dailyOpex: [0, 1e8], opexDays: [0, 365, true], inflationPct: [-100, 100],
    baseDailyRate: [0, 1e8], baseRevenueDays: [0, 365, true], brokeragePct: [0, 100], managementFeePct: [0, 100],
  });
  section('projection', { holdYears: [1, 30, true], assetDiscountPct: [0, 100], equityDiscountPct: [0, 100] });
  section('carry', { ratePct: [0, 100] });
  if (shape(study.exit, 'exit', ['mode', 'depreciationPct', 'manualValue', 'scrapPerTon', 'disposalCostPct'])) {
    if (!['depreciation', 'manual', 'scrap'].includes(study.exit.mode)) error('exit.mode', 'Choose depreciation, manual or scrap.');
    number(study.exit.depreciationPct, 'exit.depreciationPct', 0, 100);
    number(study.exit.manualValue, 'exit.manualValue', 0, 1e12);
    number(study.exit.scrapPerTon, 'exit.scrapPerTon', 0, 1e8);
    number(study.exit.disposalCostPct, 'exit.disposalCostPct', 0, 100);
    if (study.exit.mode === 'scrap' && study.vessel?.ldt === 0) warning('vessel.ldt', 'Scrap value is zero because light displacement is zero.');
  }
  if (shape(study.tax, 'tax', ['ratePct', 'annualDepreciationPct', 'taxSaleGain'])) {
    number(study.tax.ratePct, 'tax.ratePct', 0, 100);
    number(study.tax.annualDepreciationPct, 'tax.annualDepreciationPct', 0, 100);
    if (typeof study.tax.taxSaleGain !== 'boolean') error('tax.taxSaleGain', 'Choose whether positive disposal gains are taxable.');
    if (study.tax.ratePct > 0) warning('tax.ratePct', 'Simplified tax is enabled. Confirm local tax treatment independently.');
  }
  if (!Array.isArray(study.charter) || study.charter.length > 30) {
    error('charter', 'Provide at most 30 annual charter rows.');
  } else {
    const years = new Set();
    study.charter.forEach((row, index) => {
      const path = `charter.${index}`;
      if (!shape(row, path, ['year', 'dailyRate', 'revenueDays'])) return;
      number(row.year, `${path}.year`, 1, study.projection?.holdYears ?? 30, true);
      number(row.dailyRate, `${path}.dailyRate`, 0, 1e8);
      number(row.revenueDays, `${path}.revenueDays`, 0, 365, true);
      if (years.has(row.year)) error(`${path}.year`, 'Each charter year must appear once.');
      years.add(row.year);
    });
  }
  if (!Array.isArray(study.capex) || study.capex.length > 300) {
    error('capex', 'Provide at most 300 capital expenditure rows.');
  } else {
    study.capex.forEach((row, index) => {
      const path = `capex.${index}`;
      if (!shape(row, path, ['year', 'amount', 'label'])) return;
      number(row.year, `${path}.year`, 0, study.projection?.holdYears ?? 30, true);
      number(row.amount, `${path}.amount`, 0, 1e12);
      string(row.label, `${path}.label`);
    });
  }
  return issues;
}

/** NPV uses decimal rate (0.10 = 10%); the array begins at time zero. */
export function calculateNPV(rate, cashflows) {
  if (!Number.isFinite(rate) || rate <= -1 || !Array.isArray(cashflows) || !cashflows.length || cashflows.some((cf) => !Number.isFinite(cf))) return null;
  let value = 0;
  for (let i = cashflows.length - 1; i >= 0; i -= 1) value = cashflows[i] + value / (1 + rate);
  return Number.isFinite(value) ? value : null;
}

/**
 * Conservative annual IRR. Multiple sign changes are reported as ambiguous,
 * even when a particular sequence could have only one real root.
 * Bisection in log(1+r) avoids Newton's false convergence and arbitrary guesses.
 */
export function calculateIRR(cashflows) {
  const result = (status, message, value = null) => ({ value, status, message });
  if (!Array.isArray(cashflows) || cashflows.length < 2 || cashflows.some((cf) => !Number.isFinite(cf))) return result('unavailable', 'IRR needs finite cash flows over at least two periods.');
  const nonzero = cashflows.filter((value) => value !== 0);
  if (!nonzero.some((value) => value < 0) || !nonzero.some((value) => value > 0)) return result('unavailable', 'IRR requires both an investment and a positive distribution.');
  const changes = nonzero.slice(1).filter((value, index) => Math.sign(value) !== Math.sign(nonzero[index])).length;
  if (changes > 1) return result('ambiguous', 'Cash flows change sign more than once. Use NPV; a unique IRR is not assured.');
  if (nonzero[0] > 0) return result('unavailable', 'Investment IRR requires an outflow before the first inflow.');
  const maxCash = Math.max(...cashflows.map(Math.abs));
  // Scale the exponential terms before summation so extreme trial rates stay finite.
  const residual = (logRate) => {
    const powers = cashflows.map((cf, year) => cf === 0 ? -Infinity : -year * logRate);
    const maxPower = Math.max(...powers);
    return sum(cashflows.map((cf, year) => (cf / maxCash) * Math.exp(powers[year] - maxPower)));
  };
  let low = -1;
  let high = 1;
  while (residual(low) <= 0 && low > -512) low *= 2;
  while (residual(high) >= 0 && high < 512) high *= 2;
  if (residual(low) <= 0 || residual(high) >= 0) return result('unavailable', 'No representable finite IRR was bracketed.');
  let middle = 0;
  for (let i = 0; i < 250; i += 1) {
    middle = (low + high) / 2;
    // Continue until floating-point endpoints meet. An absolute log-rate
    // tolerance can leave a material NPV residual for steep, negative IRRs.
    if (middle === low || middle === high) break;
    const value = residual(middle);
    if (value === 0) break;
    if (value > 0) low = middle;
    else high = middle;
  }
  const rate = Math.expm1(middle);
  if (!Number.isFinite(rate) || rate <= -1 || Math.abs(residual(middle)) > 1e-9) return result('unavailable', 'A numerically reliable finite IRR could not be calculated.');
  return result('ok', 'Unique annual IRR for this cash-flow sign pattern.', Math.abs(rate) < 1e-12 ? 0 : rate);
}

function returnMetrics(cashflows, discountPct) {
  const invested = -sum(cashflows.filter((cf) => cf < 0));
  const distributions = sum(cashflows.filter((cf) => cf > 0));
  const profit = distributions - invested;
  return {
    irr: calculateIRR(cashflows), npv: calculateNPV(pct(discountPct), cashflows), discountPct,
    invested, distributions, profit, multiple: invested > 0 ? distributions / invested : null,
    roi: invested > 0 ? profit / invested : null,
  };
}

/**
 * Charter rate needed to cover this year's operating costs, actual capex,
 * tax, interest and contractual principal. Sale proceeds and sale debt
 * settlement are excluded. Returns null when no finite earning rate exists.
 */
function breakevenRate(row, study) {
  const days = row.revenueDays;
  const revenueShare = 1 - pct(study.operations.brokeragePct);
  if (days === 0 || revenueShare === 0) return null;
  const taxRate = pct(study.tax.ratePct);
  const cashNeed = row.capex + row.interest + row.scheduledPrincipal + row.maturityPrincipal;
  const taxShield = row.interest + row.taxDepreciation;
  let requiredOperatingSurplus = cashNeed;
  if (cashNeed > taxShield) {
    if (taxRate === 1) return null;
    requiredOperatingSurplus = (cashNeed - taxRate * taxShield) / (1 - taxRate);
  }
  return (row.opex + row.management + requiredOperatingSurplus) / (days * revenueShare);
}

/**
 * Calculate a validated version-1 Study. Invalid input returns valid:false and
 * null summaries; it never substitutes defaults for invalid or zero values.
 */
export function calculateStudy(input) {
  const issues = validateStudy(input);
  if (issues.some((issue) => issue.severity === 'error')) {
    return {
      valid: false, issues, engineVersion: ENGINE_VERSION, study: null, rows: [],
      flows: { asset: [], preFees: [], preCarry: [], investor: [] },
      metrics: null, funding: null, exit: null, totals: null, warnings: [],
    };
  }
  const study = clone(input);
  const { acquisition: a, financing: f, operations: o, projection: p, tax, exit: e } = study;
  const upfrontCapex = sum(study.capex.filter((item) => item.year === 0).map((item) => item.amount));
  const debt = a.price * pct(f.ltvPct);
  const arrangementFee = debt * pct(f.arrangementFeePct);
  const assetUses = a.price + a.transactionCosts + a.workingCapital + upfrontCapex;
  const initialUses = assetUses + arrangementFee;
  const initialEquity = initialUses - debt;
  const funding = { initialUses, initialDebt: debt, initialEquity, arrangementFee, upfrontCapex };
  const grossValue = e.mode === 'manual' ? e.manualValue
    : e.mode === 'scrap' ? study.vessel.ldt * e.scrapPerTon
      : a.price * (1 - pct(e.depreciationPct)) ** p.holdYears;
  const disposalCosts = grossValue * pct(e.disposalCostPct);
  const netValue = grossValue - disposalCosts;
  const annualPrincipal = debt * (1 - pct(f.balloonPct)) / f.tenorYears;
  let balance = debt;
  let taxBook = a.price + a.transactionCosts + upfrontCapex;
  const flows = { asset: [-assetUses], preFees: [-initialEquity], preCarry: [-initialEquity], investor: [-initialEquity] };
  const rows = [];
  for (let year = 1; year <= p.holdYears; year += 1) {
    const last = year === p.holdYears;
    const charter = study.charter.find((item) => item.year === year);
    const dailyRate = charter ? charter.dailyRate : o.baseDailyRate;
    const revenueDays = charter ? charter.revenueDays : o.baseRevenueDays;
    const revenue = dailyRate * revenueDays;
    const opex = o.dailyOpex * o.opexDays * (1 + pct(o.inflationPct)) ** (year - 1);
    const brokerage = revenue * pct(o.brokeragePct);
    const management = a.price * pct(o.managementFeePct);
    const capex = sum(study.capex.filter((item) => item.year === year).map((item) => item.amount));
    const taxDepreciation = taxBook * pct(tax.annualDepreciationPct);
    taxBook = Math.max(0, taxBook - taxDepreciation) + capex;
    const debtOpening = balance;
    const interest = debtOpening * pct(f.interestPct);
    const scheduledPrincipal = year <= f.tenorYears ? Math.min(balance, annualPrincipal) : 0;
    balance = Math.max(0, balance - scheduledPrincipal);
    const maturityPrincipal = year === f.tenorYears ? balance : 0;
    balance = Math.max(0, balance - maturityPrincipal);
    const exitDebtSettlement = last ? balance : 0;
    balance = Math.max(0, balance - exitDebtSettlement);
    const principal = scheduledPrincipal + maturityPrincipal + exitDebtSettlement;
    const debtService = interest + principal;
    const saleValue = last ? grossValue : 0;
    const saleNet = last ? netValue : 0;
    const saleGain = last && tax.taxSaleGain ? Math.max(0, netValue - taxBook) : 0;
    const operatingSurplus = revenue - opex - brokerage - management;
    const assetTax = Math.max(0, operatingSurplus - taxDepreciation + saleGain) * pct(tax.ratePct);
    const equityTax = Math.max(0, operatingSurplus - interest - taxDepreciation + saleGain) * pct(tax.ratePct);
    // "Pre-fees" excludes annual brokerage, SPV management and carry. Loan
    // arrangement costs remain in every levered-equity funding basis.
    const preFeeTax = Math.max(0, revenue - opex - interest - taxDepreciation + saleGain) * pct(tax.ratePct);
    const workingCapitalRelease = last ? a.workingCapital : 0;
    const terminalCash = saleNet + workingCapitalRelease;
    const assetCashFlow = operatingSurplus - capex - assetTax + terminalCash;
    const equityPreFees = revenue - opex - capex - preFeeTax - debtService + terminalCash;
    const equityPreCarry = operatingSurplus - capex - equityTax - debtService + terminalCash;
    const operatingTax = Math.max(0, operatingSurplus - interest - taxDepreciation) * pct(tax.ratePct);
    const operatingCashFlow = operatingSurplus - capex - operatingTax;
    const contractualDebtService = interest + scheduledPrincipal + maturityPrincipal;
    const row = {
      year, dailyRate, revenueDays, revenue, opex, brokerage, management, capex,
      taxDepreciation, taxBookValue: taxBook, assetTax, equityTax, preFeeTax,
      interest, scheduledPrincipal, maturityPrincipal, exitDebtSettlement, principal,
      debtService, debtOpening, debtClosing: balance, saleValue,
      disposalCosts: last ? disposalCosts : 0, saleNet, workingCapitalRelease,
      assetCashFlow, equityPreFees, equityPreCarry, carry: 0,
      investorCashFlow: equityPreCarry, contribution: 0, distribution: 0,
      operatingCashFlow, dscr: contractualDebtService > 0 ? operatingCashFlow / contractualDebtService : null,
      breakevenDailyRate: null, cumulativeInvestorCashFlow: 0,
    };
    row.breakevenDailyRate = breakevenRate(row, study);
    rows.push(row);
    flows.asset.push(assetCashFlow);
    flows.preFees.push(equityPreFees);
    flows.preCarry.push(equityPreCarry);
    flows.investor.push(equityPreCarry);
  }
  const carryAmount = Math.max(0, sum(flows.preCarry)) * pct(study.carry.ratePct);
  rows.at(-1).carry = carryAmount;
  rows.at(-1).investorCashFlow -= carryAmount;
  flows.investor[flows.investor.length - 1] -= carryAmount;
  let cumulative = -initialEquity;
  for (const row of rows) {
    row.contribution = Math.max(0, -row.investorCashFlow);
    row.distribution = Math.max(0, row.investorCashFlow);
    cumulative += row.investorCashFlow;
    row.cumulativeInvestorCashFlow = cumulative;
  }
  const metrics = {
    asset: returnMetrics(flows.asset, p.assetDiscountPct),
    preFees: returnMetrics(flows.preFees, p.equityDiscountPct),
    preCarry: returnMetrics(flows.preCarry, p.equityDiscountPct),
    investor: returnMetrics(flows.investor, p.equityDiscountPct),
  };
  const total = (key) => sum(rows.map((row) => row[key]));
  const totals = {
    revenue: total('revenue'), opex: total('opex'), capex: upfrontCapex + total('capex'),
    brokerage: total('brokerage'), management: total('management'), interest: total('interest'),
    principal: total('principal'), tax: total('equityTax'), carry: carryAmount,
    additionalEquity: total('contribution'), distributions: total('distribution'),
  };
  const exit = {
    grossValue, disposalCosts, netValue, debtSettlement: rows.at(-1).exitDebtSettlement,
    workingCapitalRelease: a.workingCapital, taxBookValue: taxBook,
    taxableGain: tax.taxSaleGain ? Math.max(0, netValue - taxBook) : 0,
  };
  const warnings = issues.filter((issue) => issue.severity === 'warning').map((issue) => issue.message);
  if (totals.additionalEquity > 0) warnings.push('The study requires additional equity contributions in one or more years.');
  if (debt > 0 && f.tenorYears < p.holdYears) warnings.push('The loan is repaid at maturity before exit. No refinancing is assumed.');
  if (rows.some((row) => row.revenueDays === 0)) warnings.push('One or more years have no earning days. A daily breakeven is unavailable for those years.');
  if (metrics.investor.irr.status !== 'ok') warnings.push(metrics.investor.irr.message);
  return { valid: true, issues, engineVersion: ENGINE_VERSION, study, rows, flows, metrics, funding, exit, totals, warnings };
}

/** Recalculate the same engine with all base and override charter rates scaled. */
export function calculateSensitivity(study, multipliers = [0.7, 0.85, 1, 1.15, 1.3]) {
  if (!Array.isArray(multipliers) || multipliers.some((value) => !Number.isFinite(value) || value < 0) || !calculateStudy(study).valid) return [];
  return multipliers.map((multiplier) => {
    const scenario = clone(study);
    scenario.operations.baseDailyRate *= multiplier;
    scenario.charter = scenario.charter.map((row) => ({ ...row, dailyRate: row.dailyRate * multiplier }));
    const result = calculateStudy(scenario);
    return {
      multiplier, valid: result.valid,
      irr: result.valid ? result.metrics.investor.irr : { value: null, status: 'unavailable', message: 'Scenario inputs are outside supported bounds.' },
      npv: result.valid ? result.metrics.investor.npv : null,
      multiple: result.valid ? result.metrics.investor.multiple : null,
      additionalEquity: result.valid ? result.totals.additionalEquity : null,
    };
  });
}
