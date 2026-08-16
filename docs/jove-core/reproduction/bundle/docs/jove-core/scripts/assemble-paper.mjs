import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const source = process.env.PAPER_SOURCE || path.join(root, "paper", "main-v5.tex");
const generated = path.join(root, "paper", "generated", "main-results.tex");
const provenancePath = path.join(root, "paper", "generated", "provenance.json");
const output = path.join(root, "paper", "submission.tex");
if (!fs.existsSync(generated)) throw new Error("Generate real paper assets before assembly.");
if (!fs.existsSync(provenancePath)) throw new Error("Missing generated asset provenance.");
const provenance = JSON.parse(fs.readFileSync(provenancePath, "utf8"));
if (provenance.template_input) throw new Error("Refusing to assemble submission from template metrics.");
if (provenance.synthetic_input) throw new Error("Refusing to assemble submission from synthetic metrics.");
const paper = fs.readFileSync(source, "utf8");
const block = /% JOVE_RESULTS_BLOCK_BEGIN[\s\S]*?% JOVE_RESULTS_BLOCK_END/;
if (!block.test(paper)) throw new Error(`Canonical results block not found in ${path.basename(source)}.`);
const assembled = paper.replace(block, "\\input{generated/main-results}");
fs.writeFileSync(output, assembled);
console.log(`Assembled ${output} from ${source}`);
