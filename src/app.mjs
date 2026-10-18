import { ENGINE_VERSION, createBlankStudy, createExampleStudy, calculateStudy, calculateSensitivity } from './model.mjs';
import { loadWorkspace, saveDraft, saveStudy, deleteStudy, getSavedStudies, parseStudyJSON, MAX_IMPORT_BYTES } from './studies.mjs';
import { exportJSON, exportCSV, exportReport, exportPowerPoint } from './exports.mjs';

const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]));
const copy = value => JSON.parse(JSON.stringify(value));
const currency = new Intl.NumberFormat('en-US', {style:'currency', currency:'USD', maximumFractionDigits:0});
const money = value => Number.isFinite(value) ? currency.format(value === 0 ? 0 : value) : '—';
const compact = value => Number.isFinite(value) ? new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:2}).format(value) : '—';
const metricMoney = value => Math.abs(value) >= 1e9 ? `<span title="${money(value)}" aria-label="${money(value)}">${compact(value)}</span>` : money(value);
const percent = value => Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : '—';
const multiple = value => Number.isFinite(value) ? `${value.toFixed(2)}×` : '—';
const fid = path => `field-${path.replaceAll('.', '-')}`;
const at = (object, path) => path.split('.').reduce((value,key) => value?.[key], object);
function setAt(object, path, value) { const keys = path.split('.'); const key = keys.pop(); keys.reduce((part,k) => part[k],object)[key] = value; }
const icons = {
  setup:'M4 5h16M4 12h16M4 19h16M8 3v4M16 10v4M10 17v4',
  flow:'M4 20V4M4 20h17M8 16V9M13 16V5M18 16v-5',
  scenarios:'M4 18 10 12l4 3 6-9M15 6h5v5',
  library:'M3 6h7l2 3h9v11H3zM3 6V4h7l2 2h8v3',
  manual:'M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1m0-15c3-2 6-2 9-1v15c-3-1-6-1-9 1V5',
  arrow:'M5 12h14m-5-5 5 5-5 5',
  down:'m6 9 6 6 6-6',
  plus:'M12 5v14M5 12h14',
  trash:'M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 10v7M14 10v7',
  save:'M5 3h12l4 4v14H3V3h2m2 0v6h10V3M7 21v-8h10v8',
  export:'M12 15V3m-4 4 4-4 4 4M4 13v8h16v-8',
  check:'m5 12 4 4L19 6',
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[name] || icons.arrow}"/></svg>`;
const workspace = loadWorkspace();
const initialStudy = workspace.activeStudy || createExampleStudy();
const matched = workspace.savedStudies.find(entry => JSON.stringify(entry.study) === JSON.stringify(initialStudy));
const state = {
  study:initialStudy, model:calculateStudy(initialStudy), view:['cash-flow','scenarios','library'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'setup',
  step:'acquisition', basis:'investor', activeId:matched?.id, dirty:Boolean(workspace.activeStudy && !matched),
  persisted:Boolean(workspace.activeStudy), storageError:workspace.warning || '', importWarnings:[], scenarioPct:-20,
};
let saveTimer, toastTimer, pendingReplacement, exporting = false;
const steps = [['acquisition','Acquisition'],['operations','Operations'],['financing','Financing'],['exit','Exit & returns']];
const bases = {
  investor:{label:'Investor net', description:'After debt, annual fees, simplified tax and carry.', flow:'investorCashFlow'},
  preCarry:{label:'Equity before carry', description:'After debt, annual fees and simplified tax; before carry.', flow:'equityPreCarry'},
  preFees:{label:'Equity before annual fees', description:'Before brokerage, management and carry. Loan arrangement fees remain included.', flow:'equityPreFees'},
  asset:{label:'Asset cash flow', description:'After annual fees and unlevered tax. Excludes financing and carry.', flow:'assetCashFlow'},
};
const fields = {
  name:['Study name','','Give this analysis a name you can recognize.',{type:'text',wide:true}],
  'vessel.name':['Vessel name','','Optional. Use a proposed name if the vessel is not confirmed.',{type:'text'}],
  'vessel.type':['Vessel type','','Optional. For example, Supramax bulk carrier.',{type:'text'}],
  'vessel.builtYear':['Year built','year','Use 0 when unknown. Informational only.',{max:2200,step:1}],
  'vessel.deadweight':['Deadweight','tonnes','Cargo-carrying capacity. Informational only.',{max:1000000}],
  'vessel.ldt':['Light displacement','tonnes','Used only when the exit value is based on scrap.',{max:1000000}],
  'acquisition.price':['Purchase price','USD','Vessel price before acquisition costs.',{min:.01}],
  'acquisition.transactionCosts':['Acquisition costs','USD','Legal, technical and transaction costs paid at purchase.'],
  'acquisition.workingCapital':['Initial working capital','USD','Funded at purchase; released in full at exit.'],
  'projection.holdYears':['Holding period','years','The vessel is sold after the final year of operations.',{min:1,max:30,step:1}],
  'operations.baseDailyRate':['Base charter rate','USD / earning day','Used in each year without an annual override.',{max:100000000}],
  'operations.baseRevenueDays':['Base earning days','days / year','Days that earn charter income. Zero means no income.',{max:365,step:1}],
  'operations.dailyOpex':['Base daily operating cost','USD / cost day','Crew, insurance, stores and recurring vessel expenses.',{max:100000000}],
  'operations.opexDays':['Operating cost days','days / year','Costs can continue when the vessel is not earning.',{max:365,step:1}],
  'operations.inflationPct':['Annual OPEX change','% / year','Compounds from Year 2. Does not change charter rates.',{min:-100,max:100}],
  'operations.brokeragePct':['Brokerage','% of revenue','Applied to each year’s actual gross charter revenue.',{max:100}],
  'operations.managementFeePct':['Annual SPV management fee','% of purchase price','Fixed percentage of the original vessel price each year.',{max:100}],
  'financing.ltvPct':['Loan to value','% of purchase price','Debt funds vessel price only. Use 0 for all-equity funding.',{max:100}],
  'financing.interestPct':['Annual interest rate','%','Fixed rate applied to the opening debt balance.',{max:100}],
  'financing.tenorYears':['Loan maturity','years','All remaining debt is paid at maturity. No refinancing.',{min:1,max:30,step:1}],
  'financing.balloonPct':['Balloon at maturity','% of original loan','The rest of the loan amortizes evenly over its tenor.',{max:100}],
  'financing.arrangementFeePct':['Loan arrangement fee','% of loan drawn','Paid from equity at purchase.',{max:100}],
  'exit.mode':['Exit valuation method','','Choose an explicit sale assumption.',{type:'select',options:[['depreciation','Annual value decline'],['manual','Manual sale value'],['scrap','Scrap value']]}],
  'exit.depreciationPct':['Annual vessel value decline','% / year','Compounds on purchase price. This is an assumption, not a valuation.',{max:100}],
  'exit.manualValue':['Gross sale estimate','USD','Your estimated sale price before disposal costs.'],
  'exit.scrapPerTon':['Scrap price','USD / light displacement tonne','Multiplied by vessel light displacement.',{max:100000000}],
  'exit.disposalCostPct':['Disposal costs','% of gross sale value','Broker and other sale costs deducted at exit.',{max:100}],
  'carry.ratePct':['Whole-deal carry','% of nominal equity profit','Paid at exit on positive total profit. No hurdle or catch-up.',{max:100}],
  'projection.assetDiscountPct':['Asset discount rate','% / year','Used only for asset NPV; match it to unlevered cash-flow risk.',{max:100}],
  'projection.equityDiscountPct':['Equity discount rate','% / year','Used for all three equity NPV measures.',{max:100}],
  'tax.ratePct':['Simplified tax rate','%','Use 0 to exclude tax. This is not a jurisdiction-specific model.',{max:100}],
  'tax.annualDepreciationPct':['Annual tax-book depreciation','% / year','Declining balance. Distinct from the vessel exit-value assumption.',{max:100}],
  notes:['Study notes','','Record sources, dates and assumptions. Notes stay with the study.',{type:'textarea',wide:true,maxlength:10000}],
};
function field(path, definition = fields[path]) {
  const [label,unit,help,settings = {}] = definition;
  const value = at(state.study,path);
  const id = fid(path);
  const error = state.model.issues.find(issue => issue.path === path && issue.severity === 'error');
  const attrs = `id="${id}" data-path="${esc(path)}" aria-describedby="${id}-help ${id}-error" aria-invalid="${Boolean(error)}"`;
  let input;
  if (settings.type === 'select') input = `<select ${attrs}>${settings.options.map(([key,text]) => `<option value="${key}" ${value===key?'selected':''}>${text}</option>`).join('')}</select>`;
  else if (settings.type === 'textarea') input = `<textarea ${attrs} maxlength="${settings.maxlength || 10000}">${esc(value)}</textarea>`;
  else if (settings.type === 'text') input = `<input ${attrs} type="text" value="${esc(value)}" maxlength="${settings.maxlength || 200}" autocomplete="off">`;
  else input = `<input ${attrs} type="number" inputmode="decimal" min="${settings.min ?? 0}" max="${settings.max ?? 1e12}" step="${settings.step || 'any'}" value="${value ?? ''}">`;
  return `<div class="field ${settings.wide?'wide':''}"><label for="${id}">${esc(label)}${unit?`<span class="unit">· ${esc(unit)}</span>`:''}</label>${input}<span class="field-help" id="${id}-help">${esc(help)}</span><span class="field-error" id="${id}-error">${esc(error?.message || '')}</span></div>`;
}
function checkbox() { return `<label class="checkbox-field"><input type="checkbox" data-path="tax.taxSaleGain" id="${fid('tax.taxSaleGain')}" ${state.study.tax.taxSaleGain?'checked':''}><span>Tax positive disposal gains<br><span class="field-help">Adds positive net sale proceeds above tax book value to taxable income.</span></span></label>`; }
function stepFor(path) {
  if (/^(operations|charter|capex)/.test(path)) return 'operations';
  if (/^financing/.test(path)) return 'financing';
  if (/^(exit|carry|tax)|^projection\.(asset|equity)/.test(path)) return 'exit';
  return 'acquisition';
}
function issueLabel(path) {
  if (fields[path]) return fields[path][0];
  const schedule = path.match(/^(charter|capex)\.(\d+)\.(\w+)$/);
  if (schedule) return `${schedule[1]==='charter'?'Charter override':'Capital cost'} ${Number(schedule[2])+1}, ${schedule[3]}`;
  return path || 'Study';
}
function validationMarkup() {
  const errors = state.model.issues.filter(issue => issue.severity === 'error');
  if (!errors.length) return '';
  return `<section class="validation-box" aria-labelledby="validation-title"><h2 id="validation-title">${errors.length===1?'One input needs attention':`${errors.length} inputs need attention`}</h2><ul>${errors.slice(0,12).map(issue => `<li><button type="button" data-action="fix-field" data-path="${esc(issue.path)}">${esc(issueLabel(issue.path))}: ${esc(issue.message)}</button></li>`).join('')}</ul>${errors.length>12?'<p class="field-error">Correct these inputs to continue reviewing the remaining errors.</p>':''}</section>`;
}
function header() {
  const disabled = state.model.valid ? '' : 'disabled';
  return `<header class="app-header"><a href="#setup" class="brand" data-action="navigate" data-view="setup" aria-label="CapeAI study setup"><svg class="brand-mark" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="7" fill="currentColor"/><path d="M29 12H14L10 20l4 8h15M20 12v16" fill="none" stroke="var(--paper)" stroke-width="2.6"/></svg><strong>CapeAI</strong></a><span class="brand-description">Vessel investment workspace</span><div class="header-actions"><span id="save-status" class="save-status">${state.persisted?'Draft saved on this device':'Example ready to explore'}</span><button type="button" data-action="save">${icon('save')}Save study</button><details class="export-menu"><summary class="button">${icon('export')}Export${icon('down')}</summary><div class="export-actions"><button type="button" data-action="export-json">Study JSON</button><button type="button" data-action="export-csv" data-needs-valid ${disabled}>Cash-flow CSV</button><button type="button" data-action="export-report" data-needs-valid ${disabled}>Print / PDF report</button><button type="button" data-action="export-pptx" data-needs-valid ${disabled}>PowerPoint</button><p>Keep the JSON file to reopen and reproduce the complete study.</p></div></details></div></header>`;
}
function sidebar() {
  const nav = [['setup','Study setup','setup'],['cash-flow','Cash flow','flow'],['scenarios','Scenarios','scenarios'],['library','Device library','library']];
  return `<aside class="sidebar"><nav aria-label="Workspace">${nav.map(([view,label,symbol]) => `<button type="button" data-action="navigate" data-view="${view}" ${state.view===view?'aria-current="page"':''}>${icon(symbol)}${label}</button>`).join('')}<span class="nav-separator"></span><a class="button" href="./manual.html" target="_blank" rel="noopener">${icon('manual')}Manual &amp; equations</a></nav><div class="sidebar-footer"><strong>Your study stays with you.</strong><span>Saved in this browser.<br>Export a JSON backup to move it.</span><span>USD · annual periods<br>Model ${ENGINE_VERSION}</span></div></aside>`;
}
function heading(title, description, tag = '') { return `<div class="main-heading"><div><h1 id="page-title" tabindex="-1">${esc(title)}</h1><p>${esc(description)}</p></div>${tag?`<span class="study-tag">${esc(tag)}</span>`:''}</div>`; }
function setupMarkup() {
  const name = state.study.name || 'Untitled study';
  const example = state.study.notes.startsWith('Editable example.');
  return `${heading(name,'Build the assumptions. Understand the cash flow.',example?'Synthetic example':'Your assumptions')}<div class="tabs" role="tablist" aria-label="Study assumptions">${steps.map(([step,label]) => `<button type="button" role="tab" id="tab-${step}" aria-controls="assumptions-panel" aria-selected="${state.step===step}" tabindex="${state.step===step?0:-1}" data-action="step" data-step="${step}">${label}<span class="step-error" data-step-error="${step}" aria-label="Contains an input error" ${state.model.issues.some(issue=>issue.severity==='error' && stepFor(issue.path)===step)?'':'hidden'}></span></button>`).join('')}</div><div id="validation-area">${validationMarkup()}</div><div class="setup-layout"><div class="setup-form"><form id="study-form" novalidate><section class="form-panel" id="assumptions-panel" role="tabpanel" aria-labelledby="tab-${state.step}">${sectionMarkup()}${formActions()}</section></form></div><aside class="study-summary" id="study-summary" aria-label="Current study results">${summaryMarkup()}</aside></div>`;
}
function sectionMarkup() {
  if (state.step==='acquisition') return `<div class="section-intro"><h2>Vessel &amp; acquisition</h2><p>Define the asset and the cash needed at purchase. All amounts are in USD.</p></div><div class="fields">${['name','acquisition.price','projection.holdYears','acquisition.transactionCosts','acquisition.workingCapital'].map(path=>field(path)).join('')}</div><details class="secondary-details"><summary>Vessel details &amp; study notes</summary><div class="fields">${['vessel.name','vessel.type','vessel.builtYear','vessel.deadweight','vessel.ldt','notes'].map(path=>field(path)).join('')}</div></details>`;
  if (state.step==='operations') return `<div class="section-intro"><h2>Charter income &amp; vessel costs</h2><p>Set a base year, then specify annual changes and timed capital payments.</p></div>${state.study.charter.length?'<p class="note summary-rule">Annual overrides are active below. A year with an override uses its own rate and earning days; changing the base assumptions does not change that year.</p>':''}<div class="fields">${['operations.baseDailyRate','operations.baseRevenueDays','operations.dailyOpex','operations.opexDays','operations.inflationPct','operations.brokeragePct','operations.managementFeePct'].map(path=>field(path)).join('')}</div>${scheduleEditor()}${capexEditor()}`;
  if (state.step==='financing') return `<div class="section-intro"><h2>Financing &amp; debt repayment</h2><p>Loan interest uses each year’s opening balance. Every remaining dollar is repaid at maturity or sale.</p></div><div class="fields">${['financing.ltvPct','financing.interestPct','financing.tenorYears','financing.balloonPct','financing.arrangementFeePct'].map(path=>field(path)).join('')}</div><div class="note summary-rule"><p>Debt finances the vessel price only. Acquisition costs, working capital, initial CAPEX and loan fees require equity.</p><p>A loan that matures before exit can require an extra equity contribution. This model does not assume refinancing.</p></div>`;
  const exitFields = ['exit.mode',state.study.exit.mode==='manual'?'exit.manualValue':state.study.exit.mode==='scrap'?'exit.scrapPerTon':'exit.depreciationPct','exit.disposalCostPct','carry.ratePct'];
  if (state.study.exit.mode==='scrap') exitFields.splice(2,0,'vessel.ldt');
  return `<div class="section-intro"><h2>Exit value &amp; investor returns</h2><p>Choose the sale assumption and the discount rates that match your cash-flow risk.</p></div><div class="fields">${exitFields.map(path=>field(path)).join('')}</div><hr class="form-divider"><div class="section-intro"><h3>Required return</h3><p>NPV uses separate discount rates for the asset and the equity investor.</p></div><div class="fields">${field('projection.assetDiscountPct')}${field('projection.equityDiscountPct')}</div><hr class="form-divider"><div class="section-intro"><h3>Simplified tax assumptions</h3><p>Tax losses do not carry forward. Confirm the actual tax regime outside this model.</p></div><div class="fields">${field('tax.ratePct')}${field('tax.annualDepreciationPct')}</div>${checkbox()}<div class="note summary-rule">Carry is a share of positive, whole-deal undiscounted equity profit. It is paid at exit. The model has no preferred return, hurdle or catch-up.</div>`;
}
function scheduleEditor() {
  return `<section class="inline-editor" aria-labelledby="charter-heading"><div class="section-toolbar"><div><h3 id="charter-heading" tabindex="-1">Annual charter overrides</h3><p>Each row replaces both base assumptions for that year.</p></div><button type="button" data-action="add-charter" ${state.study.charter.length>=30?'disabled':''}>${icon('plus')}Add year override</button></div>${horizonNotice()}${state.study.charter.length?state.study.charter.map((row,index)=>`<div class="editor-row">${field(`charter.${index}.year`,['Year','','1 to the holding period.',{min:1,max:30,step:1}])}${field(`charter.${index}.dailyRate`,['Charter rate','USD / day','Zero is a valid rate.',{max:1e8}])}${field(`charter.${index}.revenueDays`,['Earning days','days','0–365 days.',{max:365,step:1}])}<button type="button" class="quiet danger remove-row" data-action="remove-charter" data-index="${index}" aria-label="Remove charter override ${index+1}">${icon('trash')}</button></div>`).join(''):'<p class="empty-note">No annual overrides. Every year uses the base rate and earning days above.</p>'}</section>`;
}
function horizonNotice() {
  const hold=state.study.projection.holdYears;
  const count=state.study.charter.filter(row=>row.year>hold).length+state.study.capex.filter(row=>row.year>hold).length;
  return count>0?`<div class="note warning"><p>${count} schedule ${count===1?'row is':'rows are'} after Year ${esc(hold)}. Edit the year or remove these rows before calculating.</p><button type="button" data-action="trim-horizon">Remove rows after Year ${esc(hold)}</button></div>`:'';
}
function capexEditor() {
  return `<section class="inline-editor" aria-labelledby="capex-heading"><div class="section-toolbar"><div><h3 id="capex-heading" tabindex="-1">Timed capital costs</h3><p>Enter nominal payments. Year 0 means purchase; later years are paid at year end.</p></div><button type="button" data-action="add-capex" ${state.study.capex.length>=300?'disabled':''}>${icon('plus')}Add capital cost</button></div>${state.study.capex.length?state.study.capex.map((row,index)=>`<div class="editor-row capex-row">${field(`capex.${index}.year`,['Year','','0 to the holding period.',{max:30,step:1}])}${field(`capex.${index}.amount`,['Payment','USD','Actual cash cost in this year.'])}${field(`capex.${index}.label`,['Description','','Survey, dry dock or other cost.',{type:'text'}])}<button type="button" class="quiet danger remove-row" data-action="remove-capex" data-index="${index}" aria-label="Remove capital cost ${index+1}">${icon('trash')}</button></div>`).join(''):'<p class="empty-note">No capital costs entered. Add surveys, dry docks or other planned payments.</p>'}</section>`;
}
function formActions() {
  const position=steps.findIndex(([step])=>step===state.step), next=steps[position+1];
  return `<div class="form-actions">${position?`<button type="button" data-action="step" data-step="${steps[position-1][0]}">Back</button>`:'<p>Results update as you type.</p>'}<button type="button" class="primary" data-action="${next?'step':'navigate'}" ${next?`data-step="${next[0]}"`:'data-view="cash-flow"'}>${next?`Continue to ${next[1].toLowerCase()}`:'Review cash flow'}${icon('arrow')}</button></div>`;
}
function summaryPair(label,value,extra='') {return `<div class="${extra}"><dt>${label}</dt><dd>${value}</dd></div>`;}
function summaryMarkup() {
  const model=state.model;
  if(!model.valid) return `<h2>Study overview</h2><div class="summary-state"><strong>Complete the assumptions to see results.</strong><p>Correct the highlighted inputs. Incomplete or invalid data is never used to show a return.</p></div><a class="summary-link" href="./manual.html" target="_blank" rel="noopener">Read the model guide${icon('arrow')}</a>`;
  const m=model.metrics.investor;
  return `<h2>Study overview</h2><p class="summary-lead">Investor net · after debt, fees, tax and carry</p><dl class="summary-list">${summaryPair('Initial uses',metricMoney(model.funding.initialUses))}${summaryPair('Loan at purchase',metricMoney(model.funding.initialDebt))}${summaryPair('Initial equity',metricMoney(model.funding.initialEquity),'total')}${summaryPair('Investor IRR',m.irr.status==='ok'?percent(m.irr.value):esc(m.irr.status==='ambiguous'?'Ambiguous':'Unavailable'))}${summaryPair(`NPV at ${esc(m.discountPct)}%`,metricMoney(m.npv))}${summaryPair('Equity multiple',multiple(m.multiple))}</dl>${m.irr.status!=='ok'?`<p class="note warning summary-rule">${esc(m.irr.message)}</p>`:''}${model.totals.additionalEquity>0?`<div class="note warning summary-rule"><strong>${money(model.totals.additionalEquity)} extra equity needed.</strong><p>One or more annual cash flows require a contribution. Review the cash-flow schedule.</p></div>`:'<div class="note summary-rule">No additional annual equity contribution is needed under these assumptions. This does not measure liquidity within a year.</div>'}<button type="button" class="quiet summary-link" data-action="navigate" data-view="cash-flow">Inspect the cash flow${icon('arrow')}</button><a class="summary-link" href="./manual.html" target="_blank" rel="noopener">How the model works${icon('arrow')}</a>`;
}
function warningsMarkup() {return state.model.warnings.length?`<div class="warnings" aria-label="Model notices">${state.model.warnings.map(warning=>`<p class="note warning">${esc(warning)}</p>`).join('')}</div>`:'';}
function table(headers,rows,caption='',classes='') {
  return `<div class="table-scroll" tabindex="0" role="region" aria-label="${esc(caption || 'Financial table')}"><table>${caption?`<caption>${esc(caption)}</caption>`:''}<thead><tr>${headers.map(header=>`<th scope="col">${header}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr class="${row.className || ''}">${row.cells.map((cell,index)=>index===0?`<th scope="row">${cell}</th>`:`<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
const cashCell = number => `<span class="${number<0?'negative':''}">${money(number)}</span>`;
function unavailableView(title,description) {return `${heading(title,description)}${validationMarkup()}<div class="note"><p>Results are unavailable until the study inputs are valid.</p><button type="button" class="primary" data-action="navigate" data-view="setup">Return to study setup${icon('arrow')}</button></div>`;}
function cashFlowMarkup() {
  const model=state.model;
  if(!model.valid) return unavailableView('Cash flow','See where the cash comes from, where it goes and when it is needed.');
  const m=model.metrics[state.basis], basis=bases[state.basis];
  const row=(label,key,sign=1) => ({cells:[label,...model.rows.map(year=>cashCell(year[key]*sign))]});
  const cashRows = [
    row('Charter revenue','revenue'),row('Vessel operating costs','opex',-1),row('Brokerage','brokerage',-1),row('SPV management','management',-1),row('Capital costs','capex',-1),row('Equity tax','equityTax',-1),row('Interest','interest',-1),row('Scheduled principal','scheduledPrincipal',-1),row('Maturity repayment','maturityPrincipal',-1),row('Early-sale debt settlement','exitDebtSettlement',-1),row('Net sale proceeds','saleNet'),row('Working capital released','workingCapitalRelease'),row('Carry','carry',-1),{...row('Investor net cash flow','investorCashFlow'),className:'total'},row('Additional contribution','contribution'),row('Distribution','distribution'),row('Cumulative net cash flow','cumulativeInvestorCashFlow')
  ];
  return `${heading('Cash flow','Follow the money from acquisition to exit.',`${state.study.projection.holdYears} annual periods · USD`)}<div class="section-toolbar"><div><h2>Returns on an explicit basis</h2><p id="basis-description">${basis.description}</p></div><div class="field"><label for="return-basis">Cash-flow basis</label><select id="return-basis" aria-describedby="basis-description">${Object.entries(bases).map(([key,value])=>`<option value="${key}" ${state.basis===key?'selected':''}>${value.label}</option>`).join('')}</select></div></div><dl class="result-metrics"><div><dt>Annual IRR</dt><dd>${m.irr.status==='ok'?percent(m.irr.value):esc(m.irr.status==='ambiguous'?'Ambiguous':'Unavailable')}</dd><small>${m.irr.status==='ok'?'Annual, end-of-year cash flows':esc(m.irr.message)}</small></div><div><dt>Net present value</dt><dd>${metricMoney(m.npv)}</dd><small>Discounted at ${esc(m.discountPct)}% per year</small></div><div><dt>Money multiple</dt><dd>${multiple(m.multiple)}</dd><small>${m.multiple===null?'No invested capital on this basis':'Distributions ÷ all contributions'}</small></div><div><dt>Total invested</dt><dd>${compact(m.invested)}</dd><small>Includes later contributions</small></div></dl>${chartMarkup(model.flows[state.basis],basis.label)}<section class="result-section"><h2>Compare the four cash-flow bases</h2>${table(['Basis','IRR','NPV','Discount','Invested','Distributed','Multiple'],Object.entries(bases).map(([key,value])=>({className:state.basis===key?'current':'',cells:[value.label,model.metrics[key].irr.status==='ok'?percent(model.metrics[key].irr.value):esc(model.metrics[key].irr.status),cashCell(model.metrics[key].npv),`${model.metrics[key].discountPct}%`,money(model.metrics[key].invested),money(model.metrics[key].distributions),multiple(model.metrics[key].multiple)]})),'Return comparison')}<p class="table-hint">The asset has no debt or carry. Each equity basis includes loan arrangement costs. Swipe or scroll wide tables.</p></section><section class="result-section"><h2>Funding at purchase</h2>${table(['Use of funds','USD','Source of funds','USD'],[{cells:['Vessel purchase',money(state.study.acquisition.price),'Debt drawn',money(model.funding.initialDebt)]},{cells:['Acquisition costs',money(state.study.acquisition.transactionCosts),'Equity funded',money(model.funding.initialEquity)]},{cells:['Working capital',money(state.study.acquisition.workingCapital),'','']},{cells:['Upfront capital costs',money(model.funding.upfrontCapex),'','']},{cells:['Loan arrangement fee',money(model.funding.arrangementFee),'','']},{className:'total',cells:['Total uses',money(model.funding.initialUses),'Total sources',money(model.funding.initialDebt+model.funding.initialEquity)]}],'Year 0 funding')}${table(['Period',...Object.values(bases).map(value=>value.label)],[{cells:['Year 0',...Object.keys(bases).map(key=>cashCell(model.flows[key][0]))]}],'Initial cash flow by basis')}</section><section class="result-section"><h2>Annual investor reconciliation</h2><p class="muted">Costs and repayments are shown as outflows. Negative investor cash flow requires new equity.</p>${table(['USD',...model.rows.map(year=>`Year ${year.year}`)],cashRows,'Annual investor net cash flow')}<p class="table-hint">Net sale proceeds exclude disposal costs. Final-year contractual principal is separate from early-sale debt settlement.</p></section><section class="result-section"><h2>Debt service &amp; operating resilience</h2>${table(['Year','Opening debt','All principal','Closing debt','Debt coverage','Funding breakeven / day'],model.rows.map(year=>({cells:[`Year ${year.year}`,money(year.debtOpening),money(year.principal),money(year.debtClosing),year.dscr===null?'No debt service':multiple(year.dscr),year.breakevenDailyRate===null?'Unavailable':money(year.breakevenDailyRate)]})),'Annual debt and breakeven')}<p class="table-hint">DSCR excludes sale proceeds and early-sale settlement, and includes contractual maturity repayment. A ratio below 1 means annual operating cash does not cover contractual debt service. Breakeven includes actual CAPEX and contractual debt service; it excludes sale proceeds and carry.</p></section>${warningsMarkup()}<div class="form-actions"><a class="button" href="./manual.html" target="_blank" rel="noopener">Read the equations</a><button type="button" class="primary" data-action="navigate" data-view="scenarios">Test charter-rate scenarios${icon('arrow')}</button></div>`;
}
function chartMarkup(flows,label) {
  const width=760,height=240,pad={x:72,y:20},plotW=width-pad.x-18,plotH=height-55;
  const max=Math.max(...flows,0),min=Math.min(...flows,0),span=max-min || 1;
  const y=value=>pad.y+(max-value)/span*plotH;
  const step=plotW/flows.length, barW=Math.min(42,step*.6);
  const ticks=[max,0,min].filter((value,index,array)=>array.indexOf(value)===index);
  return `<figure class="flow-chart"><figcaption><strong>${esc(label)} by year</strong><span class="chart-legend"><span class="legend-key">Distribution</span><span class="legend-key contribution">Contribution</span></span></figcaption><div class="chart-scroll" tabindex="0" role="region" aria-label="Annual cash-flow chart; values also appear in the tables"><svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="flow-chart-title flow-chart-desc"><title id="flow-chart-title">${esc(label)} annual cash flows</title><desc id="flow-chart-desc">${flows.map((value,index)=>`Year ${index}: ${money(value)}`).join('; ')}</desc>${ticks.map(value=>`<line x1="${pad.x}" x2="${width-10}" y1="${y(value)}" y2="${y(value)}" class="${value===0?'chart-zero':'chart-grid'}"/><text x="${pad.x-10}" y="${y(value)+4}" text-anchor="end" class="chart-label">${compact(value)}</text>`).join('')}${flows.map((value,index)=>`<rect x="${pad.x+step*index+(step-barW)/2}" y="${Math.min(y(0),y(value))}" width="${barW}" height="${Math.max(Math.abs(y(value)-y(0)),1)}" rx="2" class="${value>=0?'chart-bar-positive':'chart-bar-negative'}"><title>Year ${index}: ${money(value)}</title></rect><text x="${pad.x+step*(index+.5)}" y="${height-10}" text-anchor="middle" class="chart-label">${index===0?'Funding':`Y${index}`}</text>`).join('')}</svg></div></figure>`;
}
function scenariosMarkup() {
  if(!state.model.valid) return unavailableView('Scenarios','Test the return against a weaker or stronger charter market.');
  const scenarios=calculateSensitivity(state.study);
  const custom=calculateSensitivity(state.study,[1+state.scenarioPct/100])[0];
  return `${heading('Scenarios','Test the assumptions that drive the decision.','Investor net · USD')}<div class="section-intro"><h2>What if charter rates change?</h2><p>Each case scales every base and annual override rate. Earning days, costs, financing and exit value stay fixed.</p></div>${table(['Charter-rate change','Investor IRR','NPV','Equity multiple','Extra equity'],scenarios.map(s=>({className:s.multiplier===1?'current':'',cells:[s.multiplier===1?'Base study':`${s.multiplier<1?'':'+'}${Math.round((s.multiplier-1)*100)}%`,s.irr.status==='ok'?percent(s.irr.value):esc(s.irr.status),cashCell(s.npv),multiple(s.multiple),money(s.additionalEquity)]})),'Charter-rate sensitivity')}<p class="table-hint">These are deterministic scenarios, not forecasts or probabilities. NPV uses the study’s ${state.study.projection.equityDiscountPct}% equity discount rate.</p><section class="form-panel"><div class="section-intro"><h2>Your stress case</h2><p>Inspect a custom rate change without changing the saved study.</p></div><div class="custom-scenario"><div class="field"><label for="scenario-change">Change in all charter rates <span class="unit">· %</span></label><input type="number" id="scenario-change" min="-100" max="500" step="1" value="${state.scenarioPct}" aria-describedby="scenario-help"><span class="field-help" id="scenario-help">Use −100% for no charter income. Range: −100% to +500%.</span></div><button type="button" class="primary" data-action="scenario-update">Calculate stress case${icon('arrow')}</button></div><div id="custom-scenario">${customMarkup(custom)}</div></section><div class="explainer"><h2>Read changes in context</h2><p>A single-variable sensitivity does not cover vessel-value changes, interest-rate changes, cost shocks or liquidity within a year. Save a copy and change those assumptions for a wider downside case.</p><p>There is no automatic “good investment” label. Evaluate the cash-flow basis, assumptions, funding needs and required return together.</p></div>${warningsMarkup()}`;
}
function customMarkup(result) {
  if(!result?.valid) return '<p class="note error">This scenario is outside the supported input bounds. Reduce the rate change.</p>';
  return `<dl class="result-metrics"><div><dt>Investor IRR</dt><dd>${result.irr.status==='ok'?percent(result.irr.value):esc(result.irr.status)}</dd></div><div><dt>Investor NPV</dt><dd>${metricMoney(result.npv)}</dd></div><div><dt>Extra equity needed</dt><dd>${metricMoney(result.additionalEquity)}</dd></div></dl>${result.irr.status!=='ok'?`<p class="note warning">${esc(result.irr.message)}</p>`:''}`;
}
function libraryMarkup() {
  const entries=getSavedStudies();
  return `${heading('Device library','Keep named studies in this browser. Export JSON files for a portable backup.',`${entries.length} saved ${entries.length===1?'study':'studies'}`)}<div class="library-actions"><button type="button" class="primary" data-action="new">${icon('plus')}New blank study</button><button type="button" data-action="example">Load example</button><button type="button" data-action="import">Import JSON</button><button type="button" data-action="save-copy">Save a copy</button></div><div class="library-list">${entries.length?entries.map(entry=>`<article class="library-entry"><div class="entry-info"><h2>${esc(entry.name)}</h2><p>${esc(entry.study.vessel.type || 'Vessel type not entered')} · ${entry.study.projection.holdYears} years · ${money(entry.study.acquisition.price)} purchase</p><p>${formatSavedDate(entry.updatedAt)}${state.activeId===entry.id?' · Current study':''}</p></div><div class="entry-actions"><button type="button" data-action="load" data-id="${esc(entry.id)}">Open study</button><button type="button" class="quiet danger" data-action="delete" data-id="${esc(entry.id)}" aria-label="Delete ${esc(entry.name)}">${icon('trash')}</button></div></article>`).join(''):'<div class="empty-library"><h2>Your first saved study starts here.</h2><p>The current draft is separate from this library. Select Save study to keep a named snapshot. You can also import a CapeAI JSON file.</p></div>'}</div><div class="explainer"><h2>Private to this browser</h2><p>Drafts and saved studies use local browser storage. They do not sync across devices. Clearing site data or using a different browser can remove access to them.</p><p>Export Study JSON before clearing browser data. Import supports the new versioned format and validated legacy CapeAI studies. Review any migration notices.</p><p><a href="./manual.html" target="_blank" rel="noopener">Open the user manual</a> · <a href="./manual.pdf" download>Download manual PDF</a></p></div>`;
}
function formatSavedDate(date) {const d=new Date(date);return Number.isNaN(d.valueOf())?'Saved date unavailable':`Saved ${esc(new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(d))}`;}
function render({focusHeading=false,focusId=null}={}) {
  const content=state.view==='setup'?setupMarkup():state.view==='cash-flow'?cashFlowMarkup():state.view==='scenarios'?scenariosMarkup():libraryMarkup();
  $('#app').innerHTML=`${header()}<div class="workspace">${sidebar()}<main id="main" class="main-grid"><div id="storage-notice" class="note warning import-notice" ${state.storageError?'':'hidden'}>${esc(state.storageError)}</div>${state.importWarnings.length?`<div class="note warning import-notice"><strong>Import review</strong><ul>${state.importWarnings.map(warning=>`<li>${esc(warning)}</li>`).join('')}</ul><button type="button" data-action="dismiss-import">I have reviewed these notices</button></div>`:''}${content}</main></div>`;
  document.title=`${state.view==='library'?'Device library':state.study.name || 'Untitled study'} — CapeAI`;
  updateSaveStatus();
  if(focusId) { const element=document.getElementById(focusId); if(element) {openParents(element);element.focus();} }
  else if(focusHeading) {$('#page-title')?.focus({preventScroll:true});$('#main')?.scrollIntoView({block:'start'});}
}
function openParents(element) {let parent=element.parentElement;while(parent){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}}
function updateSaveStatus() {
  const element=$('#save-status'); if(!element)return;
  element.textContent=state.storageError?'Draft not saved':state.persisted?'Draft saved on this device':'Saving draft…';
  element.classList.toggle('unsaved',Boolean(state.storageError || !state.persisted));
  const notice=$('#storage-notice'); if(notice){notice.hidden=!state.storageError;notice.textContent=state.storageError;}
}
function persist() {
  const result=saveDraft(state.study);state.persisted=result.ok;state.storageError=result.ok?'':result.error;updateSaveStatus();
}
function changed() {
  state.dirty=true;state.persisted=false;state.model=calculateStudy(state.study);clearTimeout(saveTimer);saveTimer=setTimeout(persist,350);updateSaveStatus();refreshLive();
}
function refreshLive() {
  if(state.view!=='setup')return;
  const summary=$('#study-summary');if(summary)summary.innerHTML=summaryMarkup();
  const validation=$('#validation-area');if(validation)validation.innerHTML=validationMarkup();
  $('#page-title').textContent=state.study.name || 'Untitled study';
  document.querySelectorAll('[data-path]').forEach(element=>{
    if(!element.matches('input,select,textarea'))return;
    const issue=state.model.issues.find(item=>item.path===element.dataset.path && item.severity==='error');
    element.setAttribute('aria-invalid',String(Boolean(issue)));
    const message=document.getElementById(`${element.id}-error`);if(message)message.textContent=issue?.message || '';
  });
  document.querySelectorAll('[data-step-error]').forEach(element=>{element.hidden=!state.model.issues.some(issue=>issue.severity==='error'&&stepFor(issue.path)===element.dataset.step);});
  document.querySelectorAll('[data-needs-valid]').forEach(button=>{button.disabled=!state.model.valid;});
}
function toast(message,error=false) {clearTimeout(toastTimer);const element=$('#toast');element.textContent=message;element.classList.toggle('error',error);element.hidden=false;toastTimer=setTimeout(()=>{element.hidden=true;},error?10000:5000);}
function saveSnapshot(asCopy=false) {
  const entry=saveStudy(state.study,asCopy?undefined:state.activeId);state.activeId=entry.id;state.dirty=false;state.persisted=true;state.storageError='';updateSaveStatus();return entry;
}
function guardReplacement(callback) {
  if(!state.dirty) {callback();return;}
  pendingReplacement=callback;$('#leave-error').textContent='';$('#leave-dialog').showModal();
}
function replaceStudy(study,{id,notices=[],needsCopy=false}={}) {
  clearTimeout(saveTimer);state.study=copy(study);state.model=calculateStudy(state.study);state.activeId=id;state.dirty=needsCopy;state.importWarnings=notices;state.step='acquisition';state.view='setup';state.basis='investor';history.replaceState(null,'','#setup');persist();render({focusHeading:true});
}
function navigate(view) {state.view=view;history.replaceState(null,'',`#${view}`);render({focusHeading:true});}
function changeStep(step) {state.step=step;render({focusId:`tab-${step}`});}
function applyInput(element) {
  if(!element.dataset.path)return;
  const value=element.type==='checkbox'?element.checked:element.type==='number'?(element.value===''?null:Number(element.value)):element.value;
  setAt(state.study,element.dataset.path,value);changed();
}
document.addEventListener('submit',event=>event.preventDefault());
document.addEventListener('input',event=>{if(event.target.matches('#study-form input, #study-form textarea'))applyInput(event.target);});
document.addEventListener('change',event=>{
  const target=event.target;
  if(target.id==='return-basis'){state.basis=target.value;render({focusId:'return-basis'});return;}
  if(target.matches('#study-form select')) {applyInput(target);render({focusId:target.id});}
  else if(target.dataset.path==='projection.holdYears') {render({focusId:target.id});}
});
document.addEventListener('keydown',event=>{
  const target=event.target;
  if(target.matches('[role="tab"]')&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
    event.preventDefault();const index=steps.findIndex(([step])=>step===state.step);const next=event.key==='Home'?0:event.key==='End'?steps.length-1:(index+(event.key==='ArrowRight'?1:-1)+steps.length)%steps.length;changeStep(steps[next][0]);
  }
  if(event.key==='Escape')document.querySelectorAll('.export-menu[open]').forEach(menu=>{menu.open=false;menu.querySelector('summary').focus();});
});
document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-action]');if(!button || button.disabled)return;
  const action=button.dataset.action;event.preventDefault();
  if(action.startsWith('export-'))document.querySelectorAll('.export-menu').forEach(menu=>menu.open=false);
  try {
    if(action==='navigate')navigate(button.dataset.view);
    else if(action==='step')changeStep(button.dataset.step);
    else if(action==='save' || action==='save-copy'){saveSnapshot(action==='save-copy');toast(action==='save-copy'?'A separate copy is saved in the device library.':'Study saved in the device library.');if(state.view==='library')render();}
    else if(action==='new')guardReplacement(()=>replaceStudy(createBlankStudy()));
    else if(action==='example')guardReplacement(()=>replaceStudy(createExampleStudy()));
    else if(action==='import')$('#import-file').click();
    else if(action==='load') {const entry=getSavedStudies().find(item=>item.id===button.dataset.id);if(entry)guardReplacement(()=>replaceStudy(entry.study,{id:entry.id}));}
    else if(action==='delete') {const entry=getSavedStudies().find(item=>item.id===button.dataset.id);if(entry && window.confirm(`Delete “${entry.name}” from this device library? The current draft is not removed.`)){deleteStudy(entry.id);if(state.activeId===entry.id){state.activeId=undefined;state.dirty=true;}render();toast('Saved study removed.');}}
    else if(action==='add-charter') {const years=new Set(state.study.charter.map(row=>row.year));const hold=state.study.projection.holdYears;if(!Number.isInteger(hold)||hold<1||hold>30)throw new Error('Set a holding period from 1 to 30 years before adding an override.');const year=Array.from({length:hold},(_,i)=>i+1).find(value=>!years.has(value));if(year===undefined){toast('Every holding year already has an override. Edit an existing row.',true);return;}state.study.charter.push({year,dailyRate:state.study.operations.baseDailyRate,revenueDays:state.study.operations.baseRevenueDays});changed();render({focusId:fid(`charter.${state.study.charter.length-1}.dailyRate`)});}
    else if(action==='remove-charter') {state.study.charter.splice(Number(button.dataset.index),1);changed();render({focusId:'charter-heading'});}
    else if(action==='add-capex') {state.study.capex.push({year:1,amount:0,label:''});changed();render({focusId:fid(`capex.${state.study.capex.length-1}.amount`)});}
    else if(action==='remove-capex') {state.study.capex.splice(Number(button.dataset.index),1);changed();render({focusId:'capex-heading'});}
    else if(action==='trim-horizon') {const hold=state.study.projection.holdYears;if(!Number.isInteger(hold)||hold<1)throw new Error('Enter a valid holding period first.');state.study.charter=state.study.charter.filter(row=>row.year<=hold);state.study.capex=state.study.capex.filter(row=>row.year<=hold);changed();render();toast(`Rows after Year ${hold} were removed.`);}
    else if(action==='fix-field') {state.view='setup';state.step=stepFor(button.dataset.path);render({focusId:fid(button.dataset.path)});}
    else if(action==='dismiss-import'){state.importWarnings=[];render();}
    else if(action==='scenario-update') {const input=$('#scenario-change'),value=Number(input.value);if(input.value===''||!Number.isFinite(value)||value< -100||value>500){input.setAttribute('aria-invalid','true');toast('Enter a charter-rate change from −100% to +500%.',true);input.focus();return;}input.setAttribute('aria-invalid','false');state.scenarioPct=value;$('#custom-scenario').innerHTML=customMarkup(calculateSensitivity(state.study,[1+value/100])[0]);toast('Stress case recalculated. Your study assumptions are unchanged.');}
    else if(action==='export-json'){exportJSON(state.study);toast('Study JSON exported. Keep this file to reopen the study.');}
    else if(action==='export-csv'){exportCSV(state.model);toast('Cash-flow CSV exported.');}
    else if(action==='export-report')exportReport(state.study,state.model);
    else if(action==='export-pptx'){if(exporting)return;exporting=true;button.disabled=true;button.textContent='Preparing PowerPoint…';toast('Preparing your PowerPoint report…');try{const snapshot=copy(state.study);await exportPowerPoint(snapshot,calculateStudy(snapshot));toast('PowerPoint report exported.');}finally{exporting=false;button.disabled=!state.model.valid;button.textContent='PowerPoint';}}
    else if(action==='leave-cancel'){$('#leave-dialog').close();pendingReplacement=null;}
    else if(action==='leave-save' || action==='leave-discard') {if(action==='leave-save'){try{saveSnapshot();}catch(error){$('#leave-error').textContent=error.message;return;}}const callback=pendingReplacement;pendingReplacement=null;$('#leave-dialog').close();callback?.();}
  } catch(error) {toast(error.message || 'This action could not be completed.',true);}
});
$('#leave-dialog').addEventListener('cancel',()=>{pendingReplacement=null;});
$('#import-file').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  try {if(file.size>MAX_IMPORT_BYTES)throw new Error('Choose a JSON study smaller than 2 MB.');const parsed=parseStudyJSON(await file.text());guardReplacement(()=>{replaceStudy(parsed.study,{notices:parsed.warnings,needsCopy:true});toast('Study imported. Review the assumptions before using the results.');});}
  catch(error){toast(error.message || 'The study could not be imported.',true);}
  finally{event.target.value='';}
});
window.addEventListener('beforeunload',event=>{if(!state.persisted){persist();if(!state.persisted){event.preventDefault();event.returnValue='';}}});
render();
if(!workspace.activeStudy && !workspace.warning)persist();
