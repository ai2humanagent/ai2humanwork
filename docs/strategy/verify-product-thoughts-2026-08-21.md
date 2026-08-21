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
11. **判断函数的收费模式**：框架免费内置审批后，我们作为"审批关卡里的判断函数"怎么收费（按次 / 按 policy / 包年）？
12. **凭证强度**：论文证明 HMAC 运行时签名足够实用——我们的 receipt 要不要学它做运行时签名，还是保持哈希凭证即可？
13. **与事后治理平台的关系**：Isara / Zenity 是竞争还是合作？能不能做它们的"实时拦截数据源"，把 receipts 喂进它们的审计日志？
14. **认知分类（pramana）**：论文把声称按认知来源分类（工具输出/推断/外部证词/不存在/无根据）——这套分类能否并入我们的 judgment 层，提升可解释性？

## 8. 竞品格局与学术信号（补充调研，2026-08-21）

### 痛点数据（需求是真实、量化、正在发生的）

- CSA × Zenity（2026-04，445 家企业）：53% 的企业 agent 偶尔/经常越权行事；47% 过去一年遭遇 agent 相关安全事件；58% 检测和响应时间超过 5 小时。
- CSA × Token Security：65% 的企业过去 12 个月遭遇 agent 事件；82% 发现过之前未知的 agent；但 agent 越权时只有 11% 的企业会自动拦截，38% 走人工审批，24% 只是记录——**大部分企业靠事后发现，拦不住**。
- 真实事故：IBM 自主客服 agent 批准了超出政策范围的退款（归咎于部署配置）；客服 bot 被用户用"给你好评"诱导，持续违规批准退款。
- Gartner：到 2026 年中，新型 AI 违规决策会给企业和 AI 供应商带来超过 100 亿美元的整改成本，但不到 1% 的企业治理成熟度达标。

### 三类玩家与我们的关系（结论：事实层是唯一空位）

1. **框架自带"拦截"能力（正在免费化，不是对手，是宿主）**：LangChain 把 HumanInTheLoopMiddleware 做成了官方中间件——"加一道人工审批关卡"已经被框架免费内置。我们**不卖关卡，卖关卡里的判断依据**：verify_claim 作为审批时被调用的判断函数。
2. **事后监控/治理平台（资本雄厚，做"发现问题"不做"提前拦截"）**：Isara（事后审计客服 agent 对话）、Zenity / Token Security（agent 身份与权限持续监控）、LangSmith / Galileo / Braintrust（LLM-as-judge / token 级质量评分）。这些是事后审计和质量评估，**不是对单次声称做实时验证**——互补可集成（把我们的 receipts 喂进它们的审计日志）。
3. **agent 支付/商务的身份验证层（离得最近，但本质不同）**：AffixIO（agent 交易前验证：身份绑定、consent、政策合规、防重放）、Amex agentic commerce 工具包（为已验证 agent 覆盖错误交易损失）、Tools for Humanity / World ID（证明"是人类"）。他们验证的是**身份层**："这个 agent 是谁、有没有权限做这件事"；我们验证的是**事实层**："这次声称背后的证据站不站得住"（比如"这个用户真的没收到货吗"）。**身份层 vs 事实层——目前没人在做后者。**

### 论文引用：Tool Receipts, Not Zero-Knowledge Proofs（arXiv:2603.10060）

Basu, A. (2026). *Tool Receipts, Not Zero-Knowledge Proofs: Practical Hallucination Detection for AI Agents.* arXiv:2603.10060（cs.CR，2026-03）。DOI: 10.48550/arXiv.2603.10060

- **NabaOS 框架**：受印度认识论（Nyaya Shastra）启发，把 LLM 回答里的每条声称按认知来源（pramana）分类——直接工具输出（pratyaksha）、推断（anumana）、外部证词（shabda）、不存在（abhava）、无根据观点；运行时生成 **LLM 无法伪造的 HMAC 签名工具执行凭证**，把声称与凭证交叉核对，实时检测幻觉。
- **数据**：NyayaVerifyBench（1,800 个场景、4 种语言、6 类注入幻觉）；检出 94.2% 工具引用伪造、87.6% 数量谎报、91.3% 假"不存在"；每次响应验证开销 <15ms；深度委派场景通过独立重抓 URL 检出 78.4% 伪造。
- **对比 ZK**：zkLLM 接近完美覆盖但单次 180 秒，NabaOS 94.2% 覆盖 + <15ms——对交互式 agent，**轻量凭证的性价比远好于零知识证明**。

对我们的三点启示：

1. **方向被背书**：学术界独立得出"轻量凭证优于重密码学证明"的结论，与我们的 receipt 设计一致。
2. **receipt 不是独有洞察**：zeroclaw 等项目已实现工具凭证——护城河不在 receipt 概念，在 **policy 库 + 真实落地案例**。
3. **分层差异是机会**：论文做的是"执行层"（工具调用结果没编造）；我们做的是"事实层"（现实声称的证据站不站得住）。可以把 pramana 认知分类引入我们的 judgment 层提升可解释性，把 HMAC 运行时签名引入凭证强度。

### 定位细化（由此得出的打法）

- **不要**拼"agent 安全治理平台"（Zenity/Token Security 钱多盘子大），**不要**拼"agent 支付身份验证"（Amex/Visa 体量碾压）。
- **卡住**："当 agent 已经决定要做某个动作时，这个动作背后的理由/证据是否站得住"——作为 **LangChain HITL middleware / interrupt 钩子里被调用的判断函数**去卖，而不是再造一个平台。
- **目标客户画像**：已经有审批关卡、但审批的人/规则没有可靠证据可依据的团队。他们的真实抱怨："人工审批变成了瓶颈"或"审批规则太粗，漏了骗子"。
- **产品动作**：① 做 LangChain HITL middleware 集成 demo（verify_claim 作为审批判断函数，返回 verdict + receipt）；② receipt 设计成可被 observability/治理平台消费（对接审计日志）；③ 定位话术："身份层验证 agent 是谁，我们验证声称是否站得住。"

## 9. 下一步 roadmap（当前排序）

1. 把 demo key 真正可用（Vercel 环境变量：VERIFY_API_KEY / VERIFY_DEMO_KEY）
2. MCP 目录分发（mcp.so / Glama / Pulse）
3. 验证报告页（活动真实数据 → 报告 → 推文素材）
4. 第一个真实合作方（免费验一批 → 案例）
5. 凭证持久化（非 Supabase 方案，待定存储）
6. npm SDK（等有真实集成方再做）
