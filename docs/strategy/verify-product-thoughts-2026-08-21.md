# AI2Human Verify 产品思考与进展（2026-08-21）

> 给其他大模型看的自包含文档：产品是什么、为什么做、这两天做了什么、未解问题与下一步。

## 1. 产品是什么（一句话）

**让"AI 说做完了"这件事，从靠嘴变成靠证据。**

完整的说法：**verify(claim, evidence) → verdict + receipt** —— 一个验证引擎，把任何"声称"变成"可验证的事实 + 可复查的凭证"，并在验证通过后才允许结算/放行。

产品分三层：

| 层 | 作用 |
| --- | --- |
| 引擎 `verify_claim` | 把"验证"变成一条可复用的检查流水线（六维证据 → 六步链 → 裁决 + 凭证） |
| MCP / HTTP API | 让任何 agent 或开发者直接调用，不用对接我们平台 |
| 凭证 receipt | 让"验证过"这件事可传递、可复查，别人不用再验一遍 |

## 2. 为什么做（问题）

- agent 越来越强，但**自称完成**不可信：自验证（self-verification）有同样的盲区；对抗场景（奖励/空投/退款）里 LLM 裁判是攻击目标；LLM 的"是"没有任何凭证。
- 当 agent 开始碰钱、碰现实动作（退款、配送、合规签批、赏金、发票），"trust me, I did it" 会变成财务窟窿。
- 结论：**agent 的瓶颈不是智能，是信任。** 我们把"证明"做成原语。

## 3. 核心原语（我们相信这是正确的抽象）

- **证据六维**：identity（谁）、time（何时）、location（何地）、content（什么）、process（怎么做的）、corroboration（谁佐证）。所有场景都是六维的子集，不需要第七维。
- **六步链**：capture（现场采集）→ integrity（防篡改）→ authenticity（验真）→ consistency（交叉核对）→ judgment（判断/升级）→ anchor（锚定出凭证）。每一步对应一个攻击模型（假 GPS、复用旧图、AI 生成内容、sybil、时间戳造假）。
- **保证等级 L1–L5**：自证 → 工具验证 → 证据验证 → 人工验证 → 仲裁。场景 = 等级 + 维度子集，引擎不变。
- **策略即配置**：新场景 = 加一份 policy 配置（证据要求 + 检查序列 + 升级规则），不写新引擎。
- **凭证自包含**：claimHash + evidenceHash + checksHash + verdict + signer + 时间戳。任何人可重算哈希复查，不依赖我们。

## 4. 已经真实跑通的能力

- **X 帖子验证（x_post_claim）**：拉取真实帖子、作者匹配、话题/关键词检测、新鲜度。已在生产活动中运行。
- **资格验证（eligibility_check）**：会员状态（mock 注册表）+ 社交发帖 + 一人一号防重复。实测：有效→pass+凭证；停用会员→fail；重复提交→fail。
- **配送验证（delivery_confirmed）**：完整六步链，但证据源是 mock（接真实承运商 API 才算产品）。
- **链上钱包验证（wallet_claim）**：真实链上余额/持仓/交易查询（Base/Ethereum）。注：对外推广尽量不提 crypto，但这是真实能力。
- **HTTP API**：`POST /api/v1/verify_claim`（API key 鉴权、限流、demo key 已实现并部署）；`GET /api/v1/verify/policies`。
- **MCP 服务器**：`verify_claim` / `get_verification` / `list_policies` 三工具，stdio 冒烟通过。
- **OpenAI Agents SDK 示例**：MCP + 工具内强制验证 + output guardrail 双层，用 DeepSeek 全链路跑通（A 有效→finalized+凭证；B 无效→refused）。
- **研究文章**：已发布到网站 `/research/articles/agents-must-prove`（含架构图），并建好"以后文章都放这"的 markdown 文章系统。

## 5. 这两天做了什么（2026-08-20 → 08-21）

1. 定通用原语并落盘 4 份策略文档（primitives / 15 份 policy / verify_claim 接口 / OpenAI 示例 PR 方案）。
2. 实现引擎最小版：策略注册表 + 六步链 + 凭证 + 内存记录，4 个内置 policy，测试全绿。
3. 实现 MCP 三工具并冒烟测试。
4. 实现托管 API（鉴权 + 限流 + demo key）并部署上线。
5. 做 OpenAI Agents SDK 官方风格示例（delivery_confirmed），用 DeepSeek 跑通四条路径；提交 PR 到 openai/openai-agents-python（#4540），**被关闭**（已接受，转社群路线）。
6. 把引擎镜像到 app/lib/verify-engine（web 构建用）；解决 Next 跨包解析问题。
7. 发布研究文章系统 + 首篇文章，本地验证 200，已部署上线（ai2human.work / ai2human.io 均生效）。
8. 明确**完全移除对 Supabase 的依赖**（以后新设计不碰 Supabase）。
9. 推广素材：效果图（开发者接入 / 验证报告 / 推文）、回复 Delphi 任务市场报告的文案（介绍我们 = 任务市场 + 验证层，比纯任务市场多"验证通过才放款"）、Hacker News 文章草稿、OpenAI 社区发帖方案。

## 6. 我们对产品的定位思考

- **不是纯任务市场，但也不否认是任务市场**：撮合、托管 USDC、结算我们都有；差异是"验证层内置"——别人停在"做完就付"，我们做到"证明做完了才付"。
- **定位一句话**：任务市场是 agent 商业的最终形态，验证层是它的地基。别人卖"干活的能力"，我们卖"干完的证据"。
- **推广主线**：AI 说"做完了"不算数，先验证再放行。
- **内容武器 = 验证报告**：真实数字（提交/通过/拒绝 + 原因分布）既是产品演示又是反刷证明又是营销。
- **分发**：MCP 目录（mcp.so / Glama / Pulse）、OpenAI 开发者社区、Hacker News、研究文章。
- **叙事素材**：Daydreams 市值 5M vs 我们 40K（同赛道、同报告，我们被低估）；Delphi 报告说"支付层饱和、结果层空白"——我们就是结果层。
- **对外表述偏好**：产品推广尽量中性（不提 crypto），但融资/社区叙事可以用加密原生的比较。

## 7. 未解问题（请其他大模型一起思考）

1. **第一个付费客户是谁、为什么付**：验证层的真实付费场景（反刷空投？任务平台？agent 框架？），谁最痛、最愿意先掏钱？
2. **差异是否成立**：Daydreams/TermMax 会不会自己内置验证？如果平台都内置，独立验证层的生存空间在哪？
3. **现实世界验证的冷启动**：证据从哪来（谁采集）、谁为采集付费、真人 operator 网络怎么冷启动？
4. **LLM-as-judge 与外部验证的分工**：我们主张"LLM 只做判断层"，但客户会问"为什么不直接用 GPT 打分"？怎么回答最有说服力？
5. **凭证的真实需求**：目前没有人真的二次校验 receipt。没有强需求时，凭证是不是自嗨？怎么制造"凭证被消费"的场景？
6. **推广对象优先级**：to developer（SDK/MCP）vs to project（活动/空投方）vs to end user（operator），先打哪个？
7. **PR 被关之后**：继续押注 OpenAI Agents SDK 生态，还是转向自建社群 + 多框架覆盖（LangChain/Vercel AI SDK/Virtuals）？
8. **去 Supabase 后**：凭证持久化/记录存储用什么（Vercel KV/Postgres/纯客户端自存）？
9. **估值叙事**：40K vs 5M 的故事适合什么时候讲、怎么讲不显得碰瓷？
10. **最小第一单**：能不能在 2 周内拿到一个真实项目（活动/空投/任务），用我们的 API 验一批真实数据，出一份报告，变成第一个案例？

## 8. 下一步 roadmap（当前排序）

1. 把 demo key 真正可用（Vercel 环境变量：VERIFY_API_KEY / VERIFY_DEMO_KEY）
2. MCP 目录分发（mcp.so / Glama / Pulse）
3. 验证报告页（活动真实数据 → 报告 → 推文素材）
4. 第一个真实合作方（免费验一批 → 案例）
5. 凭证持久化（非 Supabase 方案，待定存储）
6. npm SDK（等有真实集成方再做）
