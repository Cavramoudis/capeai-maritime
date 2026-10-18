import { calculateStudy, calculateSensitivity } from './model.mjs';
import { serializeStudy } from './studies.mjs';

const bases = {asset:'Asset cash flow',preFees:'Equity before annual fees',preCarry:'Equity before carry',investor:'Investor net cash flow'};
const money = value => value == null ? 'Not available' : new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
const percent = value => value == null ? 'Not available' : `${(value*100).toFixed(2)}%`;
const escape = value => String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const requireModel = model => { if(!model?.valid) throw new Error('Correct the study inputs before exporting calculated results.'); return model; };
const filename = study => (study.name||'capeai-study').normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-|-$/g,'').slice(0,90)||'capeai-study';

function download(content,type,name) {
  const url=URL.createObjectURL(new Blob([content],{type}));
  const link=document.createElement('a'); link.href=url;link.download=name;
  document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}

/** Text is escaped for spreadsheet formula injection; numeric cells remain numeric. */
export function csvCell(value) {
  if (value===null || value===undefined) return '';
  if (typeof value==='number') return Number.isFinite(value)?String(value):'';
  let text=String(value);
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text=`'${text}`;
  return `"${text.replaceAll('"','""')}"`;
}

export function buildCSV(model) {
  requireModel(model);
  const fields=Object.keys(model.rows[0]);
  const year0=Object.fromEntries(fields.map(field=>[field,0]));
  Object.assign(year0,{assetCashFlow:model.flows.asset[0],equityPreFees:model.flows.preFees[0],equityPreCarry:model.flows.preCarry[0],investorCashFlow:model.flows.investor[0],contribution:model.funding.initialEquity,cumulativeInvestorCashFlow:model.flows.investor[0],dscr:null,breakevenDailyRate:null});
  const rows=[['CapeAI annual cash flows; USD; engine '+model.engineVersion],['Study',model.study.name],['Period','Year 0 funding; annual cash flows at year end. Costs are positive; cash flows are signed.'],['Year 0','Cash-flow columns include all funding uses. Cost columns below show operating years only.'],[],fields,...[year0,...model.rows].map(row=>fields.map(field=>row[field])),[],['Return basis','IRR','IRR status','NPV USD','Discount rate %','Total invested USD','Distributions USD','Profit USD','Money multiple','ROI']];
  for(const [key,label] of Object.entries(bases)) {const m=model.metrics[key];rows.push([label,m.irr.value,m.irr.status,m.npv,m.discountPct,m.invested,m.distributions,m.profit,m.multiple,m.roi]);}
  rows.push([],['Input assumptions (percent inputs use whole percentages)'],['Path','Value'],...flatten(model.study),[],['Warnings'],...model.warnings.map(warning=>[warning]));
  return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
}

function flatten(value,prefix='') {
  if(value!==null && typeof value==='object') return Object.entries(value).flatMap(([key,item])=>flatten(item,prefix?`${prefix}.${key}`:key));
  return [[prefix,value]];
}

export function buildReportHTML(study, supplied) {
  // Recalculate from the selected assumptions; exports cannot mix stale results.
  const model=requireModel(calculateStudy(study));
  const table=(headers,rows)=>`<div class="table-wrap"><table><thead><tr>${headers.map(v=>`<th scope="col">${escape(v)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((v,i)=>i===0?`<th scope="row">${escape(v)}</th>`:`<td>${escape(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const returns=Object.entries(bases).map(([key,label])=>{const m=model.metrics[key];return [label,m.irr.status==='ok'?percent(m.irr.value):m.irr.status,money(m.npv),`${m.discountPct}%`,m.multiple==null?'Not available':`${m.multiple.toFixed(3)}x`,money(m.invested),money(m.distributions)];});
  const cashRows=[['Funding',money(model.flows.asset[0]),money(model.flows.preFees[0]),money(model.flows.preCarry[0]),money(model.flows.investor[0])],...model.rows.map(r=>[`Year ${r.year}`,money(r.assetCashFlow),money(r.equityPreFees),money(r.equityPreCarry),money(r.investorCashFlow)])];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${escape(study.name)} — CapeAI report</title><style>body{font:15px/1.6 system-ui,sans-serif;color:#173343;max-width:1100px;margin:40px auto;padding:0 24px}h1{font-size:36px;line-height:1.15}h2{margin-top:40px;border-top:2px solid #173343;padding-top:16px}p{max-width:80ch}.eyebrow{letter-spacing:.12em;font-size:12px}table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums;font-size:12px}th,td{border-bottom:1px solid #ccd7dd;padding:9px;text-align:right}th:first-child,td:first-child{text-align:left}thead{background:#eff3f4}.table-wrap{overflow-x:auto}.note{background:#eff3f4;padding:16px}.wrap{white-space:pre-wrap;overflow-wrap:anywhere}footer{margin-top:40px;font-size:12px}@media print{body{margin:0;max-width:none;font-size:10pt}h1{font-size:25pt}h2{break-after:avoid}tr{break-inside:avoid}.table-wrap{overflow:visible}table{font-size:8pt}thead{display:table-header-group}@page{size:A4 landscape;margin:15mm}}</style></head><body><p class="eyebrow">CAPEAI / VESSEL INVESTMENT STUDY / USD</p><h1>${escape(study.name)}</h1><p>${escape(study.vessel.name)} · ${escape(study.vessel.type)} · ${study.projection.holdYears}-year holding period</p><p>Engine ${escape(model.engineVersion)} · Prepared ${escape(new Date().toISOString().slice(0,10))}. Use your browser's Print command to save this report as PDF.</p><p class="note">Scenario analysis based on your assumptions. Annual cash flows occur at year end. No live market data, refinancing, monthly liquidity or jurisdiction-specific tax advice is included. Each result uses its stated cash-flow basis.</p>${study.notes?`<p class="wrap">${escape(study.notes)}</p>`:''}<h2>Returns by cash-flow basis</h2>${table(['Basis','IRR','NPV','Discount','Multiple','Invested','Distributed'],returns)}<h2>Funding and exit</h2>${table(['Item','USD'],[['Purchase price',money(study.acquisition.price)],['Total initial uses',money(model.funding.initialUses)],['Initial debt',money(model.funding.initialDebt)],['Initial equity',money(model.funding.initialEquity)],['Additional equity',money(model.totals.additionalEquity)],['Gross sale value',money(model.exit.grossValue)],['Disposal costs',money(model.exit.disposalCosts)],['Early-sale debt settlement',money(model.exit.debtSettlement)],['Working capital released',money(model.exit.workingCapitalRelease)],['Whole-deal carry',money(model.totals.carry)]])}<h2>Annual cash-flow reconciliation</h2>${table(['Period','Asset','Before annual fees','Before carry','Investor net'],cashRows)}<h2>Operating and financing schedule</h2>${table(['Year','Hire/day','Days','Revenue','OPEX','CAPEX','Interest','All principal','DSCR','Funding breakeven/day'],model.rows.map(r=>[r.year,money(r.dailyRate),r.revenueDays,money(r.revenue),money(r.opex),money(r.capex),money(r.interest),money(r.principal),r.dscr==null?'N/A':r.dscr.toFixed(2),money(r.breakevenDailyRate)]))}<h2>Charter-rate scenarios</h2><p>All base and override charter rates change together. Costs and exit assumptions stay fixed.</p>${table(['Rate multiplier','Investor IRR','Investor NPV','Multiple','Additional equity'],calculateSensitivity(study).map(s=>[`${Math.round(s.multiplier*100)}%`,s.irr.status==='ok'?percent(s.irr.value):s.irr.status,money(s.npv),s.multiple==null?'N/A':`${s.multiple.toFixed(3)}x`,money(s.additionalEquity)]))}${model.warnings.length?`<h2>Model notices</h2><ul>${model.warnings.map(w=>`<li>${escape(w)}</li>`).join('')}</ul>`:''}<h2>Complete input record</h2><p>Paths are field names in the portable JSON study. Percentage inputs use 55 for 55%. Monetary inputs use USD.</p>${table(['Input path','Value'],flatten(study))}<footer>Generated locally by CapeAI. Keep the JSON study with this report to reproduce the calculation. See the user manual for equations, conventions and limitations.</footer></body></html>`;
}

export function exportJSON(study) {download(serializeStudy(study),'application/json',`${filename(study)}.json`);}
export function exportCSV(model) {download(buildCSV(model),'text/csv;charset=utf-8',`${filename(model.study)}-cash-flows.csv`);}
export function exportReport(study,model) {
  const html=buildReportHTML(study,model);
  const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));
  try {
    const report=window.open(url,'_blank');
    if(!report) throw new Error('Allow a new tab for this site, then select Print report again.');
    report.opener=null;
  } catch(error) {URL.revokeObjectURL(url);throw error;}
  // Leave time for navigation and printing before releasing the temporary URL.
  setTimeout(()=>URL.revokeObjectURL(url),5*60*1000);
}

let libraryPromise;
function loadPowerPoint() {
  if (globalThis.PptxGenJS) return Promise.resolve(globalThis.PptxGenJS);
  if(!libraryPromise) libraryPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=new URL('../vendor/pptxgenjs-4.0.1.bundle.js',import.meta.url).href;
    script.onload=()=>globalThis.PptxGenJS?resolve(globalThis.PptxGenJS):reject(new Error('The PowerPoint export library did not load.'));
    script.onerror=()=>{libraryPromise=null;script.remove();reject(new Error('PowerPoint export is unavailable. Retry after the page loads, or export a CSV.'));};
    document.head.append(script);
  });
  return libraryPromise;
}

/** Kept separate from download to allow real OOXML verification in Node. */
export function buildPowerPoint(PptxGenJS,study) {
  const model=requireModel(calculateStudy(study));
  const deck=new PptxGenJS(); deck.layout='LAYOUT_WIDE';deck.author='CapeAI';deck.subject='Vessel investment assumptions and cash flows';deck.title=study.name;deck.company='CapeAI';deck.lang='en-US';
  deck.theme={headFontFace:'Arial',bodyFontFace:'Arial',lang:'en-US'};
  let page=0;
  const slide=title=>{const s=deck.addSlide();s.background={color:'F8F9F7'};s.addText('CAPEAI / INVESTMENT STUDY',{x:.55,y:.25,w:11,h:.3,fontSize:11,color:'456070',charSpacing:1});s.addText(title,{x:.55,y:.83,w:12.1,h:.7,fontSize:26,bold:true,color:'173343',breakLine:false,fit:'shrink'});s.addText(`USD · Annual year-end cash flows · Engine ${model.engineVersion} · ${++page}`,{x:.55,y:7.03,w:12,h:.2,fontSize:9,color:'456070'});return s;};
  const table=(s,headers,rows,opts={})=>s.addTable([headers.map(text=>({text,options:{bold:true,color:'FFFFFF',fill:'173343'}})),...rows],{x:.55,y:1.75,w:12.2,h:4.7,border:{type:'solid',color:'D2DADF',pt:.5},fontFace:'Arial',fontSize:12,color:'173343',fill:'FFFFFF',margin:7,rowH:.4,colW:Array(headers.length).fill(12.2/headers.length),autoPage:false,...opts});
  const cover=slide(study.name);cover.addText(`${study.vessel.name||'Vessel study'}\n${study.vessel.type||'Vessel type not provided'}\n${study.projection.holdYears}-year hold · ${new Date().toISOString().slice(0,10)}`,{x:.55,y:1.9,w:11.5,h:1.5,fontSize:22,color:'173343'});cover.addText('Scenario analysis from user assumptions. No live market feed. This deck reports the same engine as the calculator; it is not an investment recommendation.',{x:.55,y:4.3,w:11.5,h:1,fontSize:16,color:'456070'});
  table(slide('Returns on four explicit bases'),['Cash-flow basis','IRR','NPV','Discount','Multiple'],Object.entries(bases).map(([key,label])=>{const m=model.metrics[key];return [label,m.irr.status==='ok'?percent(m.irr.value):m.irr.status,money(m.npv),`${m.discountPct}%`,m.multiple==null?'N/A':`${m.multiple.toFixed(3)}x`];}));
  table(slide('Capital at entry and exit'),['Funding','USD','Exit / contribution','USD'],[['Purchase price',money(study.acquisition.price),'Gross sale value',money(model.exit.grossValue)],['Initial uses',money(model.funding.initialUses),'Disposal costs',money(model.exit.disposalCosts)],['Initial debt',money(model.funding.initialDebt),'Early-sale settlement',money(model.exit.debtSettlement)],['Initial equity',money(model.funding.initialEquity),'Working capital released',money(model.exit.workingCapitalRelease)],['Debt arrangement fee',money(model.funding.arrangementFee),'Whole-deal carry',money(model.totals.carry)],['Upfront CAPEX',money(model.funding.upfrontCapex),'Additional equity',money(model.totals.additionalEquity)]]);
  for(let start=0;start<model.rows.length;start+=10) {const years=model.rows.slice(start,start+10);table(slide(`Cash flows · years ${years[0].year}–${years.at(-1).year}`),['Year','Asset','Before fees','Before carry','Investor net'],years.map(r=>[String(r.year),money(r.assetCashFlow),money(r.equityPreFees),money(r.equityPreCarry),money(r.investorCashFlow)]),{fontSize:11});}
  table(slide('Charter-rate sensitivity'),['Rate multiplier','Investor IRR','NPV','Multiple','Additional equity'],calculateSensitivity(study).map(s=>[`${Math.round(s.multiplier*100)}%`,s.irr.status==='ok'?percent(s.irr.value):s.irr.status,money(s.npv),s.multiple==null?'N/A':`${s.multiple.toFixed(3)}x`,money(s.additionalEquity)]));
  table(slide('Core assumptions'),['Assumption','Value','Assumption','Value'],[['Base hire / earning days',`${money(study.operations.baseDailyRate)} / ${study.operations.baseRevenueDays}`,'Base daily OPEX',money(study.operations.dailyOpex)],['OPEX days / inflation',`${study.operations.opexDays} / ${study.operations.inflationPct}%`,'LTV / interest',`${study.financing.ltvPct}% / ${study.financing.interestPct}%`],['Loan tenor / balloon',`${study.financing.tenorYears} years / ${study.financing.balloonPct}%`,'Exit mode',study.exit.mode],['Brokerage / management',`${study.operations.brokeragePct}% revenue / ${study.operations.managementFeePct}% price`,'Carry / simplified tax',`${study.carry.ratePct}% / ${study.tax.ratePct}%`],['Charter overrides',`${study.charter.length} years; see study JSON`,'CAPEX schedule',`${study.capex.length} items; see study JSON`]]);
  const notes=slide('Interpretation and limits');notes.addText(['Keep the exported JSON and CSV with this deck for the complete assumptions and reconciliation.','All flows occur at year end. Debt amortizes annually; no refinancing is assumed.','Carry is charged at exit on positive whole-deal undiscounted profit. There is no hurdle or catch-up.','Tax is a simplified scenario input. Validate jurisdiction, tonnage tax and contractual fee terms separately.',...model.warnings].join('\n\n'),{x:.55,y:1.8,w:12,h:4.9,fontSize:15,color:'173343',fit:'shrink',breakLine:false});
  return deck;
}

export async function exportPowerPoint(study,model) {
  // The engine returns a validated copy; retain the clicked assumptions while the library loads.
  const snapshot=requireModel(calculateStudy(study)).study;
  const PptxGenJS=await loadPowerPoint();
  await buildPowerPoint(PptxGenJS,snapshot).writeFile({fileName:`${filename(snapshot)}.pptx`});
}
