# G5 投稿打包手册（TMLR 优先，NeurIPS E&D 并行）

## 数据到位前已就绪

- E&D 数据无关文档：`datasheet-for-datasets.md`、`author-statement.md`、`neurips-checklist.md`、`broader-impact.md` ✅
- 冻结：`analysis-freeze.json` + tag `jove-freeze-20260816` ✅
- 工具链：preflight 10/14 项通过（`latex_main-v5` 本机 locale 问题见 VERIFICATION-2026-08-16；`submission_gate` 等 confirmatory 数据）

## G5a TMLR 提交包（数据后）

1. 从冻结源编译匿名版：`main-v5.tex`（locale 修复：`LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8 latexmk -pdf ...`）
2. 复现包：`npm run research:jove:reproduction-bundle`（MANIFEST sha256 稳定）
3. `provenance.json`：confirmatory 行无 template/synthetic 来源
4. `npm run research:jove:submission-gate` 全绿
5. 摘要/§1 每条主张在 claims⇄evidence 表解析到具体图/表/数字

## Claims ⇄ Evidence 表（骨架，来自 venue-strategy.md）

| # | 主张 | 证据工件 | 证伪者 |
|---|---|---|---|
| C1 | 无纯工件判定者在正覆盖率下授权可靠 | Theorem 3.1 + 证明 | 形式化反例 |
| C2 | K-Full 降低逐类不安全率 vs J1-IM（matched coverage） | §8 risk–coverage + paired CI | F1: 区间含 0 |
| C3 | 优势是结构性而非信息性 | 信息+计算匹配下差距 | F2: 差距消失 |
| C4 | K-Full 主导 J1+abstain（AURC） | AURC 表 + CI | F3: 无主导 |
| C5 | 迁移到 held-out 类/来源 | held-out 结果 | F4: 无迁移 |
| C6 | 不安全率降低不以覆盖率塌缩为代价 | unsafe-per-negative vs coverage | F5: 无改善 |
| C7 | Canonical receipts 提升独立重构 | 审计子研究重构分 | F6: 无提升 |
| C8 | 每个属性经验上必要（ablation） | 逐属性 ablation | F7: 移除不恢复伤害 |
| C9 | 人工结构化复核互补安全 | 人类研究 arm (iii) vs (ii) | arm (iii) ≤ arm (ii) |

## Cover letter 模板（TMLR）

> Dear TMLR Editors,
>
> We submit "Proof-Carrying Agent Actions (Verification Contracts)" for review. The paper presents a preregistered, falsifiable evaluation of structural verification contracts for digital evidence in reality-bound agent tasks. All analysis scripts, thresholds, and falsification conditions were frozen before data collection (commit 9417ffc, tag jove-freeze-20260816); the artifact includes a reproduction bundle, datasheet, and full claims⇄evidence mapping. We welcome scrutiny of the negative results as much as the positive ones.
>
> Best regards, [Authors]

## G5b NeurIPS E&D

- TMLR 接受后按当年 CFP 准备会议版，引用 TMLR 论文；
- E&D checklist 已按预注册状态填写，数据后补 Limitations 与 public artifact DOI。
