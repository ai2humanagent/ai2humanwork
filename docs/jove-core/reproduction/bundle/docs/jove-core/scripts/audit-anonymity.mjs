import fs from 'node:fs';
import path from 'node:path';
const repo=path.resolve(import.meta.dirname,'../../..');
const files=[
 'docs/jove-core/paper/main.tex','docs/jove-core/paper/supplement.tex','docs/jove-core/preregistration.md',
 'docs/jove-core/dataset-card.md','docs/jove-core/ethics-and-governance.md'
];
const forbidden=[
 [/Users\/yanqing|\/Users\//i,'absolute user path'],
 [/OmniClaw/i,'workspace/product name'],
 [/\bAI2Human\b/i,'product identity'],
 [/supabase/i,'deployment vendor'],
 [/0x[a-f0-9]{40}/i,'wallet address'],
 [/@[A-Za-z0-9_]{2,}/,'social handle'],
 [/https?:\/\/(?!doi\.org|arxiv\.org)/i,'non-scholarly URL']
];
const errors=[];
for(const file of files){const text=fs.readFileSync(path.join(repo,file),'utf8');for(const [pattern,label] of forbidden)if(pattern.test(text))errors.push(`${file}: ${label}`)}
const tex=fs.readFileSync(path.join(repo,'docs/jove-core/paper/main.tex'),'utf8');
if(!/\\documentclass\[[^\]]*anonymous/.test(tex)) errors.push('main.tex: anonymous class option missing');
if(!/\\author\{Anonymous Authors\}/.test(tex)) errors.push('main.tex: anonymous author missing');
if(errors.length){console.error(`Anonymity audit failed (${errors.length}):`);errors.forEach(e=>console.error(`- ${e}`));process.exit(1)}
console.log(`Anonymity audit passed: ${files.length} public submission files.`);
