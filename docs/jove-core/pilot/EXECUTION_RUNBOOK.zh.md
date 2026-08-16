# JOVE-Core 20-Case Pilot 执行手册

## 目标

验证采集、隐私、合同编译、证据绑定、盲化标注和评分管线能否在真实低风险数字任务上运行。Pilot 不用于宣称方法优于基线。

## 启动条件

- 参与者信息说明和 consent 文本已冻结；
- 20 个 slot 均有任务类别、证据要求、保留策略和负责人；
- 任务为低风险、payout-disabled；
- privacy audit、task prompt validator、launch-plan validator 通过；
- 研究者不得把历史生产数据当作默认 consent。
- 先运行 `npm run research:jove:pilot-rehearsal`，确认 synthetic rehearsal 的 blind audit、rating validation 和 kappa summary 全部通过。

## 每个案例执行流程

1. **创建研究 ID**：使用 `pilot-XX`，不把钱包、邮箱或社交账号写入文件名。
2. **知情同意**：记录 consent 时间、版本、允许访问者、保留期限和公开边界。
3. **冻结合同**：生成 contract ID/version、proof obligations、binding、evidence governance 和 appeal policy。
4. **执行任务**：参与者完成任务；研究界面不得诱导违规或收集第三方隐私。
5. **采集证据**：只收合同要求的最小字段；服务器记录 receipt time 和 digest。
6. **验证回执**：运行 schema + semantic conformance validator；unknown/degraded 不得 accept。
7. **导出研究案例**：只导出 privacy-scoped reference、commitment、观察和版本。
8. **运行隐私审计**：失败则案例不能进入 packet。
9. **更新 manifest**：状态改为 captured/validated，不手工跳过中间 gate。
10. **生成 blinded packet**：移除系统 verdict、结算结果、mutation label 和参与者身份。

## 每日质量检查

```bash
npm run research:jove:prompts
npm run research:jove:launch-plan
npm run research:jove:privacy
npm run research:jove:audit
npm run research:jove:test
npm run research:jove:synthetic-audit
```

## 标注流程

- 两名 pilot rater 独立标注；
- 逐 obligation 判断 supported / unsupported / insufficient；
- 不显示自动 verdict、产品状态、结算或另一名 rater 结果；
- 分歧先保留，再由第三方 adjudicator 处理；
- 记录耗时和歧义原因。

## Pilot 完成标准

- 20 个 consented captured cases；
- 每个案例均通过 schema、receipt、privacy 和 leakage 检查；
- 每个案例至少两份独立 rating；
- 完成 adjudication；
- 统计 agreement、缺失率、unsupported modality、平均采集时间、平均审核时间；
- 按下节"先验替换协议"估计*方差结构参数*并冻结最终 sample size；
- 运行 paired-cluster power simulation。

## 从试点到冻结：先验替换协议

这一节界定 pilot 能与不能为 confirmatory power 提供什么，避免"用同一批数据既估计效应又检验效应"的循环论证。

**pilot 只估计方差结构，不估计确证效应。** confirmatory 样本量的三个功效输入分两类处理：

1. **基线不安全率 与 组内相关（ICC / base-case correlation）** —— 由 pilot 估计。基线率从 J1-IM 在 pilot 案例上的逐 obligation 判定频率估出；ICC 用 pilot 内"同一 base case 的多个变体"之间的一致性估出。由于 n=20 很小，我们*不*使用点估计，而是取其 bootstrap 95% 置信区间中*对功效更不利*的一端（基线率取更接近 0.5 的一端、ICC 取上界）作为冻结输入，使样本量只会因估计不确定性而*上调*。
2. **最小可检出效应（MDE = 绝对 0.10 的下降）** —— *不*由 pilot 估计，保持预注册值不变。这是一个由"多大的安全性改善才值得宣称"这一决策界定的量，而非一个待测的经验量；让 pilot 数据回过头来改动 MDE 会构成对确证检验的偷看。pilot 的系统间对比（若有）仅用于*健全性排查管线*（例如确认 J1-IM 确会产生非零不安全率、评分能区分 supported/unsupported），*绝不*用于设定或调整 MDE。

**mutation variance** 用于校准每个 base case 需要多少变体（当前设为 3）：若 pilot 显示变体内危害标签方差过大以致 3 个变体不足以稳定估计 base-case 级别的率，则*增加*每 base case 的变体数，而非减少 base case 数。

**冻结流程（顺序不可逆）：**

1. 用上述保守边界替换 `power-paired-cluster.mjs` 与 `power-sensitivity.mjs` 的默认参数，记录每个替换值及其 pilot 来源；
2. 重跑两脚本，得到新的推荐 base-case 数与整个参数域的稳健性表；
3. 取"最关键缺陷类所需 base 数"与"敏感性域最坏情形"的*较大者*，再按 15% 损耗上浮，作为冻结的招募目标；
4. 运行 `freeze-analysis.mjs`，对脚本与预注册条目加时间戳与 commit hash；
5. 冻结之后方可采集任何 confirmatory 数据。

**红线：** pilot 估计只能使冻结样本量*持平或上调*。若 pilot 估计指向*更小*的样本量，仍以预注册的 200 base / 600 bundle 为下限执行，不下调。招募不足时按预注册把 confirmatory 主张降级为 exploratory，不放宽 α、coverage 或样本量。

## 停止条件

发生以下任一情况立即暂停：

- consent 记录缺失或版本不明；
- 收集到第三方私人内容；
- proof burden 超过合同预算；
- artifact 无法与 task/version 绑定；
- blind packet 泄漏 gold/mutation/system verdict；
- rater 无法理解超过 20% 的合同；
- privacy audit 失败；
- 研究者试图删除系统表现差的案例。

## 角色分工

- **Capture operator**：负责 consent、任务执行和原始证据访问；
- **Data steward**：负责去标识化、保留和删除；
- **Experiment operator**：冻结系统、运行输出，不接触 sealed labels；
- **Raters**：独立标注，不接触产品 verdict；
- **Adjudicator**：处理分歧；
- **Artifact auditor**：核对 hashes、日志和提交 gate。

关键职责不得全部由同一人承担；至少标签与系统运行必须分离。
