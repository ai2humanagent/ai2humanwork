import fs from "node:fs";
import path from "node:path";
const repo=path.resolve(import.meta.dirname,"../../..");
const bib=fs.readFileSync(path.join(repo,"docs/jove-core/paper/references.bib"),"utf8");
const tex=fs.readFileSync(path.join(repo,"docs/jove-core/paper/main.tex"),"utf8");
const entries=[...bib.matchAll(/@(\w+)\s*\{([^,]+),([\s\S]*?)(?=\n@|$)/g)].map(m=>({type:m[1],key:m[2].trim(),body:m[3]}));
const keys=new Set(); const errors=[];
for(const e of entries){
 if(keys.has(e.key)) errors.push(`duplicate key ${e.key}`); keys.add(e.key);
 if(/\band others\b/i.test(e.body)) errors.push(`abbreviated authors in ${e.key}`);
 if(!/\bauthor\s*=/.test(e.body)) errors.push(`missing author in ${e.key}`);
 if(!/\byear\s*=/.test(e.body)) errors.push(`missing year in ${e.key}`);
 if(e.type.toLowerCase()==='inproceedings' && !/\bbooktitle\s*=/.test(e.body)) errors.push(`missing booktitle in ${e.key}`);
 if(e.type.toLowerCase()==='article' && !/\bjournal\s*=/.test(e.body)) errors.push(`missing journal in ${e.key}`);
}
const cited=new Set();
for(const match of tex.matchAll(/\\cite\{([^}]+)\}/g)) for(const key of match[1].split(',').map(s=>s.trim())) cited.add(key);
for(const key of cited) if(!keys.has(key)) errors.push(`unresolved citation ${key}`);
if(errors.length){console.error(`Bibliography audit failed (${errors.length}):`);errors.forEach(e=>console.error(`- ${e}`));process.exit(1)}
console.log(`Bibliography audit passed: ${entries.length} entries, ${cited.size} cited.`);
