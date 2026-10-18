import { createBlankStudy, validateStudy } from './model.mjs';

export const STUDY_FORMAT = 'capeai.study';
export const WORKSPACE_KEY = 'capeai.workspace.v1';
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const MAX_SAVED = 40;
const copy = value => JSON.parse(JSON.stringify(value));
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function browserStorage() {
  try { return globalThis.localStorage; } catch { return null; }
}

function cleanNative(input) {
  if (!record(input) || input.schemaVersion !== 1) throw new Error('This study version is not supported. Use a CapeAI version 1 study.');
  const template = createBlankStudy();
  let omitted = false;
  function read(value, shape, path) {
    if (typeof shape === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${path} must be a finite number.`);
      return value;
    }
    if (typeof shape === 'boolean') {
      if (typeof value !== 'boolean') throw new Error(`${path} must be true or false.`);
      return value;
    }
    if (typeof shape === 'string') {
      if (typeof value !== 'string') throw new Error(`${path} must contain text.`);
      if (value.length > (path === 'notes' ? 10000 : 200)) throw new Error(`${path} is too long.`);
      if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF\uFFFE\uFFFF]/u.test(value)) throw new Error(`${path} contains unsupported control or incomplete Unicode characters.`);
      return value;
    }
    if (!record(value)) throw new Error(`${path || 'Study'} must be an object.`);
    const result = {};
    for (const key of Object.keys(shape)) {
      if (key === 'charter' || key === 'capex') continue;
      if (!Object.hasOwn(value, key)) throw new Error(`${path ? `${path}.` : ''}${key} is missing.`);
      result[key] = read(value[key], shape[key], path ? `${path}.${key}` : key);
    }
    if (Object.keys(value).some(key => !Object.hasOwn(shape, key))) omitted = true;
    return result;
  }
  const study = read(input, template, '');
  if (!Array.isArray(input.charter) || input.charter.length > 30) throw new Error('The charter schedule must contain no more than 30 rows.');
  if (!Array.isArray(input.capex) || input.capex.length > 300) throw new Error('The capital cost schedule must contain no more than 300 rows.');
  study.charter = input.charter.map((row, i) => read(row, {year:0,dailyRate:0,revenueDays:0}, `charter.${i}`));
  study.capex = input.capex.map((row, i) => read(row, {year:0,amount:0,label:''}, `capex.${i}`));
  return {study, warnings: omitted ? ['Unsupported fields were excluded. Only study fields are imported.'] : []};
}

function migrateLegacy(raw) {
  const s = createBlankStudy();
  const warnings = [
    'Legacy study imported. Review every assumption before using the results. The corrected model will produce different results.',
    'Legacy authentication fields and unsupported data were excluded. This app does not use accounts.'
  ];
  function num(key, fallback) {
    const value = raw[key];
    if (value === undefined || value === null || value === '') return fallback;
    if ((typeof value !== 'string' && typeof value !== 'number') || !Number.isFinite(Number(value))) throw new Error(`Legacy field ${key} is not a valid number.`);
    return Number(value);
  }
  function str(key, fallback = '') {
    if (raw[key] === undefined || raw[key] === null) return fallback;
    if (typeof raw[key] !== 'string' || raw[key].length > 12000) throw new Error(`Legacy field ${key} is not valid text.`);
    return raw[key];
  }
  s.name = str('v_name', 'Imported legacy study') || 'Imported legacy study';
  s.vessel.name = str('v_name'); s.vessel.type = str('v_type', s.vessel.type);
  s.vessel.deadweight = num('v_dwt', s.vessel.deadweight);
  s.vessel.ldt = num('s_ldt', num('v_ldt', s.vessel.ldt));
  const year = str('v_built').match(/\b(?:19|20)\d{2}\b/);
  if (year) s.vessel.builtYear = Number(year[0]);
  s.notes = str('v_notes');
  s.acquisition.price = num('a_price', s.acquisition.price);
  s.financing.ltvPct = num('a_debt', Object.hasOwn(raw,'a_eq') ? 100-num('a_eq',100) : s.financing.ltvPct);
  s.financing.interestPct = num('a_ir', s.financing.interestPct);
  s.financing.tenorYears = num('a_tenor', s.financing.tenorYears);
  s.financing.balloonPct = num('a_balloon', s.financing.balloonPct);
  s.projection.holdYears = num('s_hold', s.projection.holdYears);
  s.operations.opexDays = num('s_odays', s.operations.opexDays);
  const annualCosts = ['o_crew','o_stores','o_repairs','o_insurance','o_mgmt','o_misc'].reduce((total,key)=>total+num(key,0),0);
  s.operations.dailyOpex = num('s_flat_opex', 0) > 0 ? num('s_flat_opex',0) : annualCosts / Math.max(1,s.operations.opexDays);
  s.operations.inflationPct = num('s_opex_inflation', 2.5);
  s.operations.baseDailyRate = num('s_tc', s.operations.baseDailyRate);
  s.operations.baseRevenueDays = num('s_rdays', s.operations.baseRevenueDays);
  s.operations.brokeragePct = num('spv_comm', 1.25);
  s.operations.managementFeePct = num('spv_mgmt', s.operations.managementFeePct);
  s.carry.ratePct = num('spv_carry', s.carry.ratePct);
  s.exit.mode = raw._exitMode === 'scrap' ? 'scrap' : raw._exitMode === 'manual' ? 'manual' : 'depreciation';
  s.exit.depreciationPct = num('s_dep', 0);
  s.exit.manualValue = num('s_manual_exit', s.exit.manualValue);
  s.exit.scrapPerTon = num('s_scrap_p', s.exit.scrapPerTon);
  s.charter = [];
  for(let year=1;year<=Math.min(50,s.projection.holdYears);year++) {
    const rateKey=`hire_rate_y${year}`, daysKey=`hire_days_y${year}`;
    if ((raw[rateKey] !== undefined && raw[rateKey] !== '') || (raw[daysKey] !== undefined && raw[daysKey] !== '')) {
      s.charter.push({year,dailyRate:num(rateKey,s.operations.baseDailyRate),revenueDays:num(daysKey,s.operations.baseRevenueDays)});
    }
  }
  s.capex = [['sv_ss_cost','Imported special survey'],['sv_dd_cost','Imported dry dock'],['sv_other_cost','Imported other capital costs']]
    .map(([key,label])=>({year:1,amount:num(key,0),label})).filter(item=>item.amount!==0);
  if (s.capex.length) warnings.push('Legacy survey budgets were assigned to Year 1. Set their actual payment years before relying on this study.');
  warnings.push('Empty legacy depreciation, OPEX inflation and brokerage fields use the original screen defaults: 0%, 2.5% and 1.25%. Explicit zero values stay zero.');
  warnings.push('Transaction costs, working capital, loan arrangement fees, discount rates, tax and disposal costs use the new blank-study defaults. Review them.');
  const checked = cleanNative(s);
  return {study:checked.study,warnings};
}

export function parseStudyJSON(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_IMPORT_BYTES) throw new Error('Choose a JSON study smaller than 2 MB.');
  let raw;
  try {raw=JSON.parse(text);} catch {throw new Error('This file is not valid JSON. Choose an exported CapeAI study.');}
  if (!record(raw)) throw new Error('The study file must contain a JSON object.');
  let result;
  if (raw.format === STUDY_FORMAT) {
    if (raw.version !== 1) throw new Error('This export version is not supported.');
    result=cleanNative(raw.study);
  } else if (Object.hasOwn(raw,'schemaVersion')) result=cleanNative(raw);
  else if (Object.hasOwn(raw,'a_price') || Object.hasOwn(raw,'v_name')) result=migrateLegacy(raw);
  else throw new Error('This is not a recognized CapeAI study.');
  const issues=validateStudy(result.study);
  const errors=issues.filter(issue=>issue.severity==='error');
  if (errors.length) result.warnings.push(`This study needs ${errors.length} input correction${errors.length===1?'':'s'}. Results remain unavailable until the inputs are valid.`);
  return result;
}

export function serializeStudy(study) {
  const {study:clean}=cleanNative(study);
  return JSON.stringify({format:STUDY_FORMAT,version:1,exportedAt:new Date().toISOString(),study:clean},null,2);
}

function readWorkspace(storage) {
  if (!storage) return {draft:null,saved:[],warning:'Device storage is unavailable. Export a JSON file to keep your work.'};
  try {
    const text=storage.getItem(WORKSPACE_KEY);
    if (!text) return {draft:null,saved:[]};
    if (text.length>8*MAX_IMPORT_BYTES) throw new Error('Oversized workspace');
    const raw=JSON.parse(text);
    if (!record(raw) || raw.version!==1 || !Array.isArray(raw.saved)) throw new Error('Invalid workspace');
    const saved=[];
    const ids=new Set();
    let damaged=raw.saved.length>MAX_SAVED;
    for (const item of raw.saved.slice(0,MAX_SAVED)) {
      try {
        if (!record(item) || typeof item.id!=='string' || item.id.length>100) throw new Error('Invalid entry');
        if(ids.has(item.id)) throw new Error('Duplicate study ID');
        ids.add(item.id);
        saved.push({id:item.id,name:cleanNative(item.study).study.name,updatedAt:typeof item.updatedAt==='string'?item.updatedAt:'',study:cleanNative(item.study).study});
      } catch {damaged=true;}
    }
    let draft=null;
    try {if(raw.draft) draft=cleanNative(raw.draft).study;} catch {damaged=true;}
    return {draft,saved,warning:damaged?'Some damaged saved data could not be loaded. The original browser data has not been changed.':undefined};
  } catch {
    return {draft:null,saved:[],warning:'Saved browser data could not be read. Import a backup or start a new study. The stored data has not been changed.'};
  }
}

function persist(data,storage) {
  if (!storage) throw new Error('Device storage is unavailable. Export a JSON backup instead.');
  try {storage.setItem(WORKSPACE_KEY,JSON.stringify({version:1,draft:data.draft,saved:data.saved}));}
  catch {throw new Error('The browser could not save this study. Storage may be full or blocked. Export a JSON backup.');}
}

export function loadWorkspace(storage=browserStorage()) {
  const data=readWorkspace(storage);
  return {activeStudy:data.draft,savedStudies:data.saved,warning:data.warning};
}

export function saveDraft(study,storage=browserStorage()) {
  try {
    const current=readWorkspace(storage);
    if(current.warning) return {ok:false,error:current.warning};
    persist({...current,draft:cleanNative(study).study},storage);
    return {ok:true};
  } catch(error) {return {ok:false,error:error.message};}
}

export function getSavedStudies(storage=browserStorage()) {return readWorkspace(storage).saved;}

export function saveStudy(study,id,storage=browserStorage()) {
  const current=readWorkspace(storage);
  if(current.warning) throw new Error(current.warning);
  const clean=cleanNative(study).study;
  const exists=id && current.saved.some(item=>item.id===id);
  if(!exists && current.saved.length>=MAX_SAVED) throw new Error('The device library holds 40 studies. Export and remove an older study before adding another.');
  const entry={id:exists?id:(globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`),name:clean.name||clean.vessel.name||'Untitled study',updatedAt:new Date().toISOString(),study:clean};
  persist({draft:clean,saved:[entry,...current.saved.filter(item=>item.id!==entry.id)]},storage);
  return copy(entry);
}

export function deleteStudy(id,storage=browserStorage()) {
  const current=readWorkspace(storage);
  if(current.warning) throw new Error(current.warning);
  persist({...current,saved:current.saved.filter(item=>item.id!==id)},storage);
  return true;
}
