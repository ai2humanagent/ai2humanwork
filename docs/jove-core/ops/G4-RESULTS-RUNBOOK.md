# G4 结果生成手册（confirmatory 数据到位后）

所有脚本已冻结（commit `9417ffc`）。只喂数据，不改逻辑。建议按序执行：

```bash
# 1. 分组保持泄漏检查（confirmatory manifest）
npm run research:jove:leakage -- docs/jove-core/confirmatory/manifest.jsonl

# 2. mutation 泄漏审计
npm run research:jove:mutation-leakage -- docs/jove-core/confirmatory/manifest.jsonl

# 3. 冻结评分（matched coverage 0.70）
npm run research:jove:score -- \
  docs/jove-core/experiments/outputs.jsonl \
  docs/jove-core/confirmatory/labels.jsonl \
  docs/jove-core/results/metrics.json

# 4. 主对比 clustered paired bootstrap（10k）
npm run research:jove:bootstrap -- \
  docs/jove-core/experiments/outputs.jsonl \
  docs/jove-core/confirmatory/labels.jsonl

# 5. 工件审计 + 投稿门禁
npm run research:jove:audit
npm run research:jove:submission-gate
```

## 注意事项

- `bootstrap-primary` 只在 confirmatory 数据上运行（合成数据用 B0–B1/V1–V4 编号，不匹配预注册的 `K-Full`/`J1-IM` 主对比命名，属预期）；
- 7 个证伪条件全部如实报告，包括 null / 负结果；不得事后改阈值；
- 招募不足 → 报告实际功效并把 confirmatory 主张降级为 exploratory（预注册承诺）；
- 输出：§8 risk–coverage 曲线、AURC、逐缺陷类率、10k bootstrap CI、claims⇄evidence 表。
