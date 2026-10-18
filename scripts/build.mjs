import {readFile,writeFile,mkdir,cp,rm,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {ENGINE_VERSION,SCHEMA_VERSION} from '../src/model.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'dist');
const docs=[['MANUAL.md','manual.html','User & model manual'],['GLOSSARY.md','glossary.html','Glossary'],['CURRENT-SYSTEM.md','current-system.html','Original system'],['TARGET-SYSTEM.md','target-system.html','Target system'],['MODEL-CONTRACT.md','model-contract.html','Model contract'],['references.md','references.html','Sources']];
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug=s=>s.toLowerCase().replace(/[`*_]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function inline(text) {
  const codes=[];
  let s=escape(text).replace(/`([^`]+)`/g,(_,code)=>{codes.push(`<code>${code}</code>`);return `\u0000${codes.length-1}\u0000`;});
  s=s.replace(/\[([^\]]+)\]\(([^)]+)\)/g,(_,label,url)=>{
    const mapped=docs.find(([file])=>url===file||url.startsWith(`${file}#`));
    if(mapped)url=url.replace(mapped[0],mapped[1]);
    if(!/^(https?:\/\/|#|[a-z0-9-]+\.(html|pdf)(#.*)?$)/i.test(url))return label;
    return `<a href="${url}"${url.startsWith('http')?' rel="noopener noreferrer"':''}>${label}</a>`;
  }).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>');
  return s.replace(/\u0000(\d+)\u0000/g,(_,i)=>codes[Number(i)]);
}
export function markdown(text) {
  const lines=text.split(/\r?\n/),html=[],toc=[];
  for(let i=0;i<lines.length;) {
    const line=lines[i];
    if(!line.trim()){i++;continue;}
    if(line.startsWith('```')){let code=[];i++;while(i<lines.length&&!lines[i].startsWith('```'))code.push(lines[i++]);i++;html.push(`<pre><code>${escape(code.join('\n'))}</code></pre>`);continue;}
    const heading=line.match(/^(#{1,6})\s+(.+)$/);
    if(heading){const level=heading[1].length,id=slug(heading[2]);if(level===2)toc.push([id,heading[2]]);html.push(`<h${level} id="${id}">${inline(heading[2])}</h${level}>`);i++;continue;}
    if(line.startsWith('|')&&lines[i+1]?.match(/^\|[\s:|-]+\|$/)) {
      const cells=s=>s.trim().replace(/^\||\|$/g,'').split('|').map(x=>x.trim());
      const headers=cells(line);i+=2;const rows=[];while(i<lines.length&&lines[i].startsWith('|'))rows.push(cells(lines[i++]));
      html.push(`<div class="table-scroll" tabindex="0" role="region" aria-label="Reference table"><table><thead><tr>${headers.map(c=>`<th scope="col">${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((c,j)=>j===0?`<th scope="row">${inline(c)}</th>`:`<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);continue;
    }
    if(/^(?:[-*] |\d+\. )/.test(line)) {
      const ordered=/^\d/.test(line),tag=ordered?'ol':'ul',items=[];
      while(i<lines.length&&/^(?:[-*] |\d+\. )/.test(lines[i]))items.push(lines[i++].replace(/^(?:[-*] |\d+\. )/,''));
      html.push(`<${tag}>${items.map(item=>`<li>${inline(item)}</li>`).join('')}</${tag}>`);continue;
    }
    if(/^---+$/.test(line)){html.push('<hr>');i++;continue;}
    const p=[];while(i<lines.length&&lines[i].trim()&&!/^(?:#|```|\||[-*] |\d+\. )/.test(lines[i]))p.push(lines[i++]);
    if(!p.length)p.push(lines[i++]);html.push(`<p>${inline(p.join(' '))}</p>`);
  }
  return {html:html.join('\n'),toc};
}
const css=`:root{color-scheme:light;font:17px/1.65 system-ui,sans-serif;color:#173343;background:#f8f9f7}*{box-sizing:border-box}body{margin:0}a{color:#075e88;text-underline-offset:.18em}a:focus-visible,[tabindex]:focus-visible{outline:3px solid #a35e1b;outline-offset:4px}header{background:#173343;color:white;padding:22px max(24px,calc((100vw - 1240px)/2))}header a{color:white}header strong{font-size:20px;letter-spacing:.06em}nav{display:flex;flex-wrap:wrap;gap:10px 22px;margin-top:14px;font-size:14px}.document{display:grid;grid-template-columns:240px minmax(0,1fr);gap:48px;max-width:1240px;margin:auto;padding:40px 24px}aside{font-size:13px}aside a{display:block;margin-bottom:10px}article{min-width:0;max-width:90ch}h1{font-size:clamp(2rem,4vw,3rem);line-height:1.12;margin-top:0}h2{font-size:1.65rem;border-top:1px solid #b5c4cd;padding-top:30px;margin-top:50px;scroll-margin-top:20px;line-height:1.25}h3{font-size:1.2rem;line-height:1.4;margin-top:28px}p,li{max-width:80ch}li{margin-block:8px}.table-scroll{overflow:auto;margin-block:24px}table{width:100%;border-collapse:collapse;font-size:14px;background:white}th,td{padding:12px;border-bottom:1px solid #ccd7dd;text-align:left;vertical-align:top}thead{background:#e7edef}tbody th{font-weight:500}pre{padding:20px;background:#e7edef;overflow:auto;border-left:3px solid #456070;font-size:13px;line-height:1.7}code{font-family:ui-monospace,monospace;font-size:.9em}p code,td code,li code{overflow-wrap:anywhere}footer{border-top:1px solid #ccd7dd;padding:30px;text-align:center;font-size:13px}.skip{position:absolute;left:15px;top:-100px;background:white;color:#173343;padding:10px}.skip:focus{top:10px}@media(max-width:760px){.document{grid-template-columns:minmax(0,1fr);gap:20px;padding:26px 20px}aside{border-bottom:1px solid #ccd7dd;padding-bottom:20px}aside details:not([open])>div{display:none}th,td{min-width:140px}h2{margin-top:36px}}@media print{header,aside,footer,.skip{display:none}.document{display:block;max-width:none;padding:0}article{max-width:none}body{font-size:10pt}h1{font-size:26pt}h2{font-size:17pt;break-after:avoid}h3{break-after:avoid}pre{white-space:pre-wrap}table{font-size:9pt}.table-scroll{overflow:visible}tr{break-inside:avoid}a{color:inherit}@page{size:A4;margin:17mm}}`;

await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
for(const name of ['index.html','src','vendor'])await cp(path.join(root,name),path.join(out,name),{recursive:true});
await writeFile(path.join(out,'manual.css'),css);
for(const [file,url,title] of docs){const {html,toc}=markdown(await readFile(path.join(root,'docs',file),'utf8'));await writeFile(path.join(out,url),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="CapeAI vessel investment calculator — ${escape(title)}"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><title>${escape(title)} · CapeAI</title><link rel="stylesheet" href="manual.css"></head><body><a class="skip" href="#content">Skip to manual</a><header><strong>CAPEAI / REFERENCE</strong><nav aria-label="Documentation"><a href="index.html">Back to calculator</a>${docs.map(d=>`<a href="${d[1]}"${d[1]===url?' aria-current="page"':''}>${d[2]}</a>`).join('')}<a href="manual.pdf" download>Download PDF</a></nav></header><main class="document"><aside><details><summary>On this page</summary><div>${toc.map(([id,label])=>`<a href="#${id}">${escape(label)}</a>`).join('')}</div></details></aside><article id="content">${html}</article></main><footer>CapeAI · Model version 1.0.0 · Plain English informed by ASD-STE100 principles; no formal compliance claim.</footer></body></html>`);}
await cp(path.join(root,'docs'),path.join(out,'docs'),{recursive:true,filter:source=>!source.endsWith('RELEASE-REVIEW.md')});
try{await cp(path.join(root,'output/pdf/CapeAI-manual.pdf'),path.join(out,'manual.pdf'));}catch(error){if(error.code!=='ENOENT')throw error;console.warn('Manual PDF is not generated yet. Run the PDF authoring script before publishing.');}
await writeFile(path.join(out,'.nojekyll'),'');
const checksums={};
async function hashTree(dir){for(const item of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())await hashTree(file);else checksums[path.relative(out,file).split(path.sep).join('/')]=createHash('sha256').update(await readFile(file)).digest('hex');}}
await hashTree(out);
await writeFile(path.join(out,'release.json'),JSON.stringify({engineVersion:ENGINE_VERSION,schemaVersion:SCHEMA_VERSION,commit:process.env.GITHUB_SHA||null,files:checksums},null,2));
const files=await readdir(out);console.log(`Built ${files.length} top-level artifacts in dist/. Only this directory is deployed.`);
