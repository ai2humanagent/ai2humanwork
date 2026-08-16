# Clean Reproduction Checklist

## Environment

- Node.js version recorded in `reproduction/environment.json`.
- Operating system and architecture recorded.
- Dependency lockfile hash recorded.
- No production secrets required for synthetic or scoring reproduction.
- Confirmatory raw evidence remains access-controlled.

## Deterministic research checks

```bash
npm run research:jove:bibliography
npm run research:jove:anonymity
npm run research:jove:audit
npm run research:jove:test
npm run research:jove:privacy
npm run research:jove:synthetic-audit
npm run research:jove:submission-gate
```

The final command must fail before real confirmatory assets exist and pass only when provenance-checked real assets are present.

## Paper build

```bash
cd docs/jove-core/paper
LANG=C LC_ALL=C pdflatex main.tex
LANG=C LC_ALL=C bibtex main
LANG=C LC_ALL=C pdflatex main.tex
LANG=C LC_ALL=C pdflatex main.tex
LANG=C LC_ALL=C pdflatex supplement.tex
LANG=C LC_ALL=C pdflatex supplement.tex
```

Reject builds containing LaTeX errors, unresolved citations, undefined control sequences, or overfull horizontal boxes.

## Confirmatory reproduction

1. Verify manifest and consent scope.
2. Verify split and mutation leakage audits.
3. Verify frozen model/prompt/threshold hashes.
4. Re-run scoring from immutable outputs and sealed labels.
5. Re-run clustered bootstrap with frozen seed.
6. Compare metrics and generated-table hashes.
7. Build paper from generated real-result assets.
8. Verify anonymity and privacy release boundaries.
