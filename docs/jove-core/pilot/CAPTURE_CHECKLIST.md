# Live Pilot Capture Checklist

For each manifest slot:

1. Select a real digital task matching the reserved class.
2. Obtain explicit research consent and retention agreement.
   Register metadata with `npm run research:jove:consent -- --case-id=<id> --consent-at=<ISO> --retention='<policy>'`.
3. Run the task through the production-equivalent Proof Compiler and verifier.
4. Confirm the task contains `customTaskSpec`, `proofBundle`, and `customVerification` metadata.
5. Export with:

```bash
npm run research:jove:export -- \
  --db=<privacy-controlled-db-snapshot> \
  --task-id=<product-task-id> \
  --case-id=jove_core_0001 \
  --task-class=social_content \
  --consent-at=2026-08-08T00:00:00.000Z
```

6. Update the corresponding row in `pilot/manifest.csv` to `captured`.
   Use `npm run research:jove:manifest -- <case-id> captured <task-id> <receipt-id>`.
7. Run `npm run research:jove:validate` and `npm run research:jove:privacy`.
8. Do not copy raw URLs, handles, wallet addresses, filenames, or private messages into research files.
9. After the planned batch is captured, run `npm run research:jove:blind`.
10. Distribute the blinded packet independently to two raters.

No case enters the pilot without consent. No missing case is replaced by fabricated evidence.
