import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files=['MANUAL.md','CURRENT-SYSTEM.md','TARGET-SYSTEM.md','GLOSSARY.md'];
const results=[];
for(const file of files){
  const source=await readFile(path.join(root,'docs',file),'utf8');
  const prose=source.replace(/```[\s\S]*?```/g,'').split('\n').filter(line=>line.trim()&&!/^\s*(?:#|\||---)/.test(line)).join('\n')
    .replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/`([^`]+)`/g,(_,code)=>code.replaceAll('.','_')).replace(/\*+/g,'');
  const sentences=prose.split(/(?<=[.!?])\s+|\n/).map(s=>s.trim()).filter(s=>s&&/[.!?]$/.test(s)&&!/^[\d\s.,:%$-]+$/.test(s));
  const counts=sentences.map(s=>s.split(/\s+/).length);
  const brief=counts.filter(n=>n<=25).length;
  const percent=counts.length?100*brief/counts.length:100;
  results.push({file,sentences:counts.length,atMost25Words:brief,percentage:Number(percent.toFixed(1)),longest:Math.max(0,...counts)});
  if(percent<80)throw new Error(`${file}: only ${percent.toFixed(1)}% of prose sentence candidates meet the 25-word target.`);
}
console.log(JSON.stringify({metric:'Mechanical prose sentence-length proxy, not ASD-STE100 conformity. Headings, tables and equation blocks excluded.',results},null,2));
