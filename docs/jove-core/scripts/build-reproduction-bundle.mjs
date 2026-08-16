import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const repo = path.resolve(import.meta.dirname, '../../..');
const out = path.join(repo, 'docs/jove-core/reproduction/bundle');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

// Files that MUST be present: the code, schemas, protocol documents and the
// environment specification needed to re-run the pipeline from scratch.
const required = [
  'package.json', 'package-lock.json',
  'docs/jove-core/config/study.json', 'docs/jove-core/config/contract-systems.json',
  'docs/jove-core/preregistration.md', 'docs/jove-core/dataset-card.md', 'docs/jove-core/reproducibility.md',
  'docs/jove-core/schema/case.schema.json', 'docs/jove-core/schema/rating.schema.json',
  'docs/jove-core/schema/verification-contract.schema.json', 'docs/jove-core/schema/verification-receipt.schema.json',
  'docs/jove-core/reproduction/environment.json',
  // Scoring / statistics / power pipeline.
  'docs/jove-core/scripts/score-experiments.mjs', 'docs/jove-core/scripts/bootstrap-primary.mjs',
  'docs/jove-core/scripts/power-paired-cluster.mjs', 'docs/jove-core/scripts/power-sensitivity.mjs',
  // The six blocking gates and their single entry point.
  'docs/jove-core/scripts/submission-gate.mjs',
  'docs/jove-core/scripts/check-split-leakage.mjs', 'docs/jove-core/scripts/audit-mutation-leakage.mjs',
  'docs/jove-core/scripts/privacy-audit.mjs', 'docs/jove-core/scripts/audit-anonymity.mjs',
  'docs/jove-core/scripts/validate-contract-receipt.mjs', 'docs/jove-core/scripts/audit-synthetic-isolation.mjs',
  // Paper regeneration (assets, assembly, freeze).
  'docs/jove-core/scripts/generate-paper-assets.mjs', 'docs/jove-core/scripts/assemble-paper.mjs',
  'docs/jove-core/scripts/freeze-analysis.mjs',
  // Fixtures.
  'docs/jove-core/fixtures/contract.valid.json', 'docs/jove-core/fixtures/receipt.valid.json',
];

// Files included ONLY when confirmatory data has been collected. A protocol /
// registered-report snapshot ships without these; the manifest records which
// confirmatory inputs were present so downstream reviewers can tell a method
// bundle from a results bundle.
const optionalConfirmatory = [
  'docs/jove-core/confirmatory/manifest.jsonl', 'docs/jove-core/confirmatory/labels.jsonl',
  'docs/jove-core/experiments/outputs.jsonl', 'docs/jove-core/results/metrics.json',
  'docs/jove-core/paper/generated/provenance.json',
];

const manifest = [];
const missingOptional = [];
const copy = (rel) => {
  const src = path.join(repo, rel);
  const dest = path.join(out, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  manifest.push({ path: rel, sha256: crypto.createHash('sha256').update(fs.readFileSync(src)).digest('hex') });
};

for (const rel of required) {
  const src = path.join(repo, rel);
  if (!fs.existsSync(src)) throw new Error(`Missing required reproduction file ${rel}`);
  copy(rel);
}
for (const rel of optionalConfirmatory) {
  if (fs.existsSync(path.join(repo, rel))) copy(rel);
  else missingOptional.push(rel);
}

const isResultsBundle = missingOptional.length === 0;
fs.writeFileSync(path.join(out, 'MANIFEST.json'), JSON.stringify({
  generated_at: new Date().toISOString(),
  bundle_type: isResultsBundle ? 'results' : 'method-only',
  confirmatory_inputs_present: isResultsBundle,
  missing_confirmatory_inputs: missingOptional,
  files: manifest,
}, null, 2) + '\n');

const archive = path.join(repo, 'docs/jove-core/reproduction/verification-contracts-reproduction.tar.gz');
const py = `import tarfile\nfrom pathlib import Path\ns=Path(r'''${out}''');o=Path(r'''${archive}''')\nwith tarfile.open(o,'w:gz') as t:\n [t.add(p,arcname=p.relative_to(s),recursive=False) for p in sorted(x for x in s.rglob('*') if x.is_file())]\n`;
const r = spawnSync('python3', ['-c', py], { encoding: 'utf8' });
if (r.status !== 0) throw new Error(r.stderr);
console.log(`Built ${isResultsBundle ? 'results' : 'method-only'} reproduction bundle with ${manifest.length} files: ${archive}`);
if (!isResultsBundle) console.log(`Confirmatory inputs absent (${missingOptional.length}); bundle labelled method-only in MANIFEST.json.`);
