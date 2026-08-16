# OSF 预注册登记文本（草稿）

状态：**草稿**，作者登录 [OSF Registries](https://osf.io/registries) 后按本页内容填写并提交。提交前请再次确认与 `preregistration.md` / `paper/main-v5.tex` 逐字一致（G0）。

---

**注册标题：** Proof-Carrying Agent Actions (Verification Contracts): A Preregistered Study of Digital-Evidence Verification for Reality-Bound Agent Tasks

**注册类型：** Preregistration（计划报告，提交于数据采集前）

**关联冻结提交：** GitHub commit `9417ffc4546e95ee57f677533bae68e0a74aeb6c`（tag `jove-freeze-20260816`，2026-08-16 冻结）；冻结记录 `analysis-freeze.json`。

**假设/研究问题：** 沿完整 risk–coverage 曲线，完整验证合约（`K-Full`）相比信息匹配法官（`J1-IM`，相同证据与观测载荷、无结构强制）是否降低不安全正向状态转移率？主端点：预注册 matched coverage 0.70 处的逐缺陷类不安全正向转移率。

**设计：** 预注册 Registered-Report 风格；6 类数字证据任务；每个 base case 生成匹配 bundle（mutations）；分组建模（base case 为抽样单位）。

**样本：** 200 个独立来源 base case、≥600 个匹配 bundle、每 bundle 3 名盲评员；每类 ≥4 base case；≥2 类 + ≥1 个 mutation 构造源留出（held-out）。招募不足则报告实际功效并降级为 exploratory。

**主对比：** `K-Full` vs `J1-IM`（paired 95% CI 不含 0，方向：K-Full 更低）。次参考：`J1+abstain`、`J1-DT`（steelmanned 基线，计算预算 ≥ K-Full）。

**分析计划（冻结脚本）：** `check-split-leakage` → `audit-mutation-leakage` → `score-experiments`（matched coverage 0.7）→ `bootstrap-primary`（10k clustered paired bootstrap）→ 逐类率 / AURC / risk–coverage 曲线；7 个证伪条件（见 `preregistration.md`）全部如实报告，包括 null/负结果。

**数据可用性：** 公开工件仅含隐私裁剪证据；原始证据留在访问受控存储；注册时填 commit hash 与 OSF 自身时间戳。

---

提交前 checklist：
- [ ] 与 `preregistration.md` 逐字核对（G0 脚本/人工）
- [ ] commit hash `9417ffc` 与 tag `jove-freeze-20260816` 可访问
- [ ] 选择"数据采集前注册"类型并保存草稿
- [ ] 注册链接回填到论文与 `REMAINING_ACTIONS.md`
