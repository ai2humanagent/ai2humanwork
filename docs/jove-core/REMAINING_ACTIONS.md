# JOVE-Core 剩余动作总路线图（Master Runbook）

**目的：** 把这篇论文从"预注册手稿 + 可执行工件"推进到"顶会/顶刊可投稿"，需要哪些动作、谁来做、按什么顺序。
**核心事实：** 方法、脚本、抽象、证伪条件已全部冻结就绪。唯一缺口是 **confirmatory 数据**（需真人知情同意 + 独立盲评），这部分**不可由自动化代劳**——代劳即伪造确证数据，直接摧毁本研究的科学诚信。

---

## 0. 动作归属总表

| 类别 | 动作 | 归属 | 是否阻塞投稿 |
|---|---|---|---|
| A. 文档交付物（数据无关） | E&D datasheet / author statement / checklist / broader impact | **已由工件补齐**（见 §5） | E&D 需要 |
| B. 人为决策门禁 | G1 分析冻结（clean tree → freeze → tag） | **人（作者）** | ✅ 已完成（2026-08-16，见 §1） |
| C. 真人参与 | G2 pilot 采集 + 2 盲评员 | **人（作者 + 参与者 + 评审员）** | 是 |
| C. 真人参与 | G3 全量采集（200 base / 600 bundle / 3 盲评员） | **人** | 是 |
| D. 一键产出 | G4 跑冻结脚本出 §8 结果 | 人触发，脚本自动 | 是 |
| E. 打包 | G5a TMLR 包 / G5b E&D 包 | 人触发，脚本自动 | 是 |

> **红线规则：** 绝不通过"放宽阈值"把某个门禁往前推。招募不足 → 按预注册把 confirmatory 主张降级为 exploratory，**不**放宽 α、coverage 或样本量。

---

## 1. G1 — 分析冻结（✅ 已完成 2026-08-16）

**冻结是预注册承诺，必须发生在第一个 confirmatory 数据点之前。已完成：**

- **冻结记录：** `docs/jove-core/analysis-freeze.json`（frozen_at `2026-08-16T09:55:29Z`，commit `9417ffc`，11 个工件 sha256 锁定）
- **提交链：** `9417ffc`（freeze: JOVE-Core confirmatory analysis）→ `58816db`（freeze: pin analysis-freeze.json）
- **外部时间戳：** tag `jove-freeze-20260816` → `58816db`，已推送 `origin`（branch `feature/twitter-tasks-verification`，fast-forward）
- **验证：** `freeze-analysis.mjs --verify` → `verified: true`
- **尚余（作者，外部）：** OSF 预注册登记（把 commit hash `9417ffc` 写进去，论文引用此时间戳）——推荐在 G2 采集前完成

### 验证（冻结后持续跑）
```bash
node docs/jove-core/scripts/freeze-analysis.mjs --verify   # 内容篡改 or 数据文件早于冻结时间 → 失败
```

---

## 2. G2 — Pilot（20–30 例，可行性 + 评审校准）

**归属：作者 + 知情同意参与者 + 2 名独立评审员。** 严禁自动生成"真实案例"。

流程（README + pilot/EXECUTION_RUNBOOK.zh.md 已细化）：
1. 取 `pilot/manifest.csv` 下一行；获取研究同意；用真实产品跑一个任务。
2. 快照 `custom-task-spec/v1`、`proof-bundle/v1`、验证器观测、回执。
3. 按 `pilot/case.template.json` 存一条记录到 `pilot/cases/<case_id>.json`；manifest 状态置 `captured`。
4. `node scripts/validate-pilot.mjs`
5. `node scripts/build-blinded-packet.mjs` → 交给 2 名评审员独立评分。
6. 评分写入 `ratings/pilot-rating-sheet.csv` → `node scripts/summarize-ratings.mjs`。
7. 裁决分歧���保留原始评分，不删）。

**G2 通过判据：** 20–30 base case；评审员训练达标；pilot Krippendorff α ≥ 0.67；合成 rehearsal 仪表全通过。

---

## 3. G3 — 全量 confirmatory 采集

**归属：作者 + 参与者 + 3 名盲评员。** 规模由 pilot 派生的成对功效分析冻结后确定：
- 目标 **200 独立来源 base case** / **≥600 匹配 bundle** / **每 bundle 3 名评审员**。
- 六类任务，每类 ≥4 base case；一个 base 的所有 mutation 留在同一 split。
- ≥2 个任务类 + ≥1 个 mutation 构造源从阈值选择中留出（held-out）。
- 招募不足 → 报告实际功效并把主张降级为 exploratory。

隐私/盲评门禁：`node scripts/privacy-audit.mjs`、`build-blinded-packet.mjs` 的盲评校验必须通过。

---

## 4. G4 — 结果（数据到位后，一键产出 §8）

脚本已 final，仅需喂入 confirmatory 数据：
```bash
npm run research:jove:leakage   -- <manifest.jsonl>              # group-preserving split 检查
npm run research:jove:score     -- <outputs.jsonl> <labels.jsonl> <result.json>
npm run research:jove:bootstrap -- <outputs.jsonl> <labels.jsonl>  # 成对 clustered 主对比
npm run research:jove:audit                                      # 工件与主张边界审计
```
产出：risk–coverage 曲线、AURC、逐 defect-class 率、10k bootstrap CI，**7 个证伪条件全部如实报告**（含 null/负结果）。

---

## 5. G5 — 投稿包（本轮已补齐"数据无关"的全部 E&D 文档）

### G5a TMLR 包（数据后）
- [ ] 匿名 `submission.tex` 从冻结源编译通过
- [ ] `build-reproduction-bundle.mjs` 复现包，MANIFEST sha256 稳定
- [ ] `provenance.json` 存在，confirmatory 行无 template/synthetic 来源
- [ ] seeds / model IDs / prompts / temperatures / provider dates 冻结列出
- [ ] `submission-gate` 全绿
- [ ] 摘要/§1 每条主张都在 claims⇄evidence 表中解析到具体图/表/数字
- [ ] null/负结果原样保留，无事后阈值改动

### G5b NeurIPS E&D 包（**本轮工件已交付以下，数据无关部分完成**）
- [x] **Datasheet for Datasets**（Gebru 全 schema）→ `datasheet-for-datasets.md`
- [x] **Author statement / license / hosting-DOI / maintenance** → `author-statement.md`
- [x] **NeurIPS paper checklist**（诚实填至当前预注册状态）→ `neurips-checklist.md`
- [x] **Broader impact + ethics**（交叉链接 ethics-and-governance）→ `broader-impact.md`
- [ ] **Public artifact**：带版本化 DOI 的托管 benchmark（数据后 + 作者操作）
- [ ] Limitations 与论文 §Limitations 一致（matched-defect ≠ adaptive-adversary）

> 单一真相源：两个投稿版本的数字/图仅来自冻结的 G4 输出；`preregistration.md` 与 `main-v5.tex` 为命名/端点权威。

---

## 6. 关键时间线（无 deadline 反解，按就绪门禁驱动）

当前（2026-08）→ 可投稿工件预计 8–9 个月不赶工窗口：

```
G1 冻结（人，天级） → G2 pilot（周级，需招募+评审员）
  → 成对功效分析（脚本，冻结样本量）
  → G3 全量采集（月级，主要瓶颈：招募 200 base + 3 盲评员）
  → G4 结果（脚本，一键） → G5a TMLR 先投（rolling，无 deadline）
  → 接受后 → G5b NeurIPS E&D 会议版（引用 TMLR，按当年 CFP）
```

**先投 TMLR 的理由：** rolling 无 deadline、验收标准是"主张是否被证据支持"（对预注册 null 最宽容）、JMLR 姊妹刊品牌。E&D 作为曝光目标并行准备，接受后再走会议版。

---

## 7. 一句话状态

> ✅ G1 分析冻结已完成（2026-08-16，tag `jove-freeze-20260816`）。方法与工程 100% 就绪；E&D 数据无关文档已补齐；**唯一剩余是真人参与的 confirmatory 数据采集（G2→G4），这必须由作者线下执行，不能自动化，否则违反预注册与科学诚信。**
