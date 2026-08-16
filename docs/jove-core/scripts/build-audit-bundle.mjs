import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repo = path.resolve(import.meta.dirname, '../../..');
const jove = path.join(repo, 'docs/jove-core');
const outTxt = path.join(jove, 'audit-bundle.txt');
const outZip = path.join(jove, 'jove-paper-audit.zip');

// Text sources included verbatim in audit-bundle.txt for line-by-line review.
const textFiles = [
  'paper/main-v5-zh.tex',
  'paper/main-v5.tex',
  'paper/supplement.tex',
  'paper/references.bib',
  'preregistration.md',
  'dataset-card.md',
  'reproducibility.md',
  'config/study.json',
  'config/contract-systems.json',
  'schema/verification-contract.schema.json',
  'schema/verification-receipt.schema.json',
  'schema/case.schema.json',
  'schema/rating.schema.json',
  'scripts/submission-gate.mjs',
  'scripts/build-reproduction-bundle.mjs',
  'scripts/check-split-leakage.mjs',
  'scripts/audit-mutation-leakage.mjs',
  'scripts/privacy-audit.mjs',
  'scripts/audit-anonymity.mjs',
  'scripts/validate-contract-receipt.mjs',
  'scripts/audit-synthetic-isolation.mjs',
  'scripts/score-experiments.mjs',
  'scripts/bootstrap-primary.mjs',
  'scripts/power-paired-cluster.mjs',
  'scripts/power-sensitivity.mjs',
];

const present = textFiles.filter((rel) => fs.existsSync(path.join(jove, rel)));

const header = [
  '========================================================================',
  ' JOVE-Core / Verification Contracts — AUDIT BUNDLE',
  ` generated: ${new Date().toISOString()}`,
  ' Contents: full LaTeX sources (zh + en), protocol docs, schemas, and the',
  '           full gate/analysis script suite, concatenated for review.',
  ' Compiled PDFs are included in the accompanying jove-paper-audit.zip.',
  '========================================================================',
  '',
].join('\n');

let body = header;
for (const rel of present) {
  const content = fs.readFileSync(path.join(jove, rel), 'utf8');
  body += `\n\n===== FILE: docs/jove-core/${rel} =====\n\n${content}`;
}
fs.writeFileSync(outTxt, body);

// Build the zip: text sources + both compiled PDFs + the concatenated txt.
const zipEntries = [
  ...present.map((rel) => `docs/jove-core/${rel}`),
  'docs/jove-core/paper/main-v5-zh.pdf',
  'docs/jove-core/paper/main-v5.pdf',
  'docs/jove-core/audit-bundle.txt',
].filter((rel) => fs.existsSync(path.join(repo, rel)));

fs.rmSync(outZip, { force: true });
const r = spawnSync('zip', ['-q', outZip, ...zipEntries], { cwd: repo, encoding: 'utf8' });
if (r.status !== 0) throw new Error(r.stderr || 'zip failed');

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
console.log(`audit-bundle.txt: ${present.length} files, ${kb(fs.statSync(outTxt).size)}`);
console.log(`jove-paper-audit.zip: ${zipEntries.length} entries, ${kb(fs.statSync(outZip).size)}`);
console.log(`  -> ${outZip}`);
