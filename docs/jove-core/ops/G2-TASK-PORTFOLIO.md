# G2 Pilot 任务组合设计（30 槽全矩阵）

设计原则：与预注册 `config/study.json` + `preregistration.md` 对齐；pilot 规模 20–30 例（本设计取 30，每类 5 例）；全部低风险、可逆、无 PII、payout-disabled；证据为结构化 proof bundle；consent 由产品勾选框（`jove-core-consent-v1`）或 retrospective 补签记录。

## 1. 六类任务定义与通用验证规则

| 类 | 参与者做什么 | 证据要求 | 关键验证规则 |
|---|---|---|---|
| social_content | 用研究/测试账号完成一个低风险社交内容动作（回复/评论/引用） | postUrl + screenshot + timestamp | URL 可访问；内容与 brief 一致；无敏感话题 |
| account_configuration | 完成一个可逆的公开账号配置动作（资料字段/标签/测试仓库） | url + screenshot + timestamp | 配置公开可验证；可逆；无凭据泄露 |
| content_publication | 发布一段指定内容（短文/gist/公告/issue 评论） | url + screenshot + timestamp | 内容可见；与 brief 匹配；无违规内容 |
| form_document_submission | 提交一个公开、无敏感信息的表单/问卷/工单 | url + screenshot + notes | 提交确认存在；无 PII；无隐私字段 |
| time_sensitive_digital_state | 在指定时间点记录/核验一个公开数字状态 | screenshot + timestamp + url | 时间戳新鲜（freshnessMinutes）；目标一致 |
| cross_evidence_consistency | 从 ≥2 个独立公开来源收集证据并交叉核对 | url(s) + screenshot + notes | 两源可访问；结论有依据；冲突如实报告 |

## 2. 30 槽完整矩阵

| case_id | 类 | 具体任务 brief | 证据 | 关键验证 |
|---|---|---|---|---|
| 0001–0004 | social_content | retrospective：对已有 X 任务（a2h-x-2081475399658410370 等）补签 consent 后取数 | postUrl + screenshot | 原任务回执 + 补签记录 |
| 0005 | account_configuration | 创建公开 GitHub 测试仓库，README 含 "JOVE pilot test" | repoUrl + screenshot | URL 可访问；README 存在 |
| 0006 | account_configuration | 把公开资料 bio 设置为研究给定测试串 | profileUrl + screenshot | 字段值与给定串一致 |
| 0007 | account_configuration | 给测试仓库添加一个公开 topic/label | repoUrl + screenshot | label 出现在仓库页 |
| 0008 | content_publication | 用测试账号发布短文，引用一个公开仓库 | postUrl + screenshot | 内容含目标引用 |
| 0009 | content_publication | 在公开 GitHub issue 发布中性回复 | issueUrl + screenshot | 评论存在且内容中性 |
| 0010 | content_publication | 发布公开 gist，内容为研究给定文本 | gistUrl + screenshot | gist 可见且匹配 |
| 0011 | content_publication | 在公开社区板发布格式化公告 | postUrl + screenshot | 格式与 brief 一致 |
| 0012 | form_document_submission | 提交公开研究反馈表单（无 PII） | confirmUrl + screenshot | 提交确认存在 |
| 0013 | form_document_submission | 完成公开问卷（安全虚拟答案） | confirmUrl + screenshot | 完成页存在；无 PII |
| 0014 | form_document_submission | 在测试仓库提交公开 issue 工单 | issueUrl + screenshot | 工单存在且含模板字段 |
| 0015 | time_sensitive_digital_state | 指定时刻记录公开 repo 的 commit 数/最新 release | screenshot + timestamp | 时间戳在 freshness 窗口内 |
| 0016 | time_sensitive_digital_state | 指定时刻核验公开页面可用性/版本 | screenshot + timestamp | 结果与目标一致 |
| 0017 | time_sensitive_digital_state | 记录公开活动页在指定时刻的实时状态 | screenshot + timestamp | 状态与时间戳匹配 |
| 0018 | cross_evidence_consistency | 对照两个独立来源的同一公开声明 | urls + notes | 两源可访问；结论有据 |
| 0019 | cross_evidence_consistency | 核对 repo README 与真实文件结构 | repoUrl + notes | 结构核对有据 |
| 0020 | cross_evidence_consistency | 核对主页声明与链接内容的一致性 | urls + notes | 关联关系成立 |
| 0021 | social_content | 用测试账号发布一条公开状态更新 | postUrl + screenshot | 内容可见且匹配 brief |
| 0022 | account_configuration | 创建公开测试项目并添加描述 | projectUrl + screenshot | 描述字段可见 |
| 0023 | account_configuration | 打开测试账号的公开可见性开关 | profileUrl + screenshot | 开关状态公开可验证 |
| 0024 | content_publication | 在公开项目发布一条 changelog 条目 | repoUrl + screenshot | 条目存在且内容匹配 |
| 0025 | form_document_submission | 在测试仓库提交公开 feature request | issueUrl + screenshot | 工单存在且含模板字段 |
| 0026 | form_document_submission | 完成公开投票（安全答案） | confirmUrl + screenshot | 完成记录存在 |
| 0027 | time_sensitive_digital_state | 指定时刻记录公开粉丝数 | screenshot + timestamp | 时间戳新鲜 |
| 0028 | time_sensitive_digital_state | 指定时刻核验公开 badge 状态 | screenshot + timestamp | 状态与时刻一致 |
| 0029 | cross_evidence_consistency | 对比两个公开追踪站的 repo stars | urls + notes | 差异如实报告 |
| 0030 | cross_evidence_consistency | 核验活动页日期与公告帖一致 | urls + notes | 日期核对有据 |

## 2b. 每类任务菜单（用户自由创建时可参考，不限于矩阵）

| 类 | 更多具体任务变体 |
|---|---|
| social_content | 回复公开提问、引用文章发评论、发产品反馈帖、发每日状态、参与公开话题接龙、发投票 |
| account_configuration | 建测试仓库、改 bio、加 topic/label、开公开开关、设资料链接、创建测试组织/项目、改昵称 |
| content_publication | 发短文、发 gist、发 changelog、发 wiki 页、发论坛公告、发 README 更新、发数据集条目、发更新日志 |
| form_document_submission | 反馈表单、问卷、feature request、issue 工单、公开投票、登记表、测试申请单 |
| time_sensitive_digital_state | 记录粉丝数、commit 数、star 数、release 版本、页面可用性、活动状态、badge 状态、价格/计数 |
| cross_evidence_consistency | 双源声明核对、README 与文件结构、主页与内容关联、日期一致性、两站指标差异、账号一致性 |

## 3. 每类 G3 mutation 钩子（confirmatory 用，pilot 不做）

预注册定义的 5 类 mutation 应用到上述 base case：

- **post-hoc criterion drift**：brief 不变，事后放宽验收标准；
- **cross-task/version replay**：同一证据换一个任务/版本复用；
- **provider failure**：来源平台返回降级/错误；
- **integrity conflict**：证据内部矛盾（时间戳/内容不一致）；
- **incomplete receipt**：证据链缺一环（无回执/无验证记录）。

每类至少 1 个 mutation 构造源留出 held-out（confirmatory：≥2 类 + ≥1 个来源）。

## 4. 执行注意

1. 每个 prospective 槽位通过产品创建研究任务（勾选 consent 框），`export-live-case` 导出时自动携带 consent；
2. retrospective 4 槽：先补签 consent（`register-consent.mjs` + 原任务回执），无补签不得进入 `captured`；
3. 证据只收 brief 要求的最小字段；`validate-pilot` 会校验 consent、policy 版本、hash 与回执结构；
4. 全部任务保持 payout-disabled（研究模式默认）。

## 5. 与现有工具链对接

- manifest：`pilot/manifest.csv`（30 槽，5/5/5/5/5/5）
- launch plan：`pilot/launch-plan.csv`（4 retrospective blocked，26 prospective ready，已填具体任务）
- 校验：`npm run research:jove:launch-plan` + `npm run research:jove:validate` + `npm run research:jove:audit`
