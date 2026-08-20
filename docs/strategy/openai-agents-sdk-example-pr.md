# OpenAI Agents SDK 官方示例 PR 方案

> 目标：向 `openai/openai-agents-python` 的 `examples/` 提交一个官方风格的通用示例。
> 被合并 = 官方背书；即使不合并，官方团队也会看到 PR/Issue，这是零成本接触。

## 1. 示例选题

- **名字**：`examples/verification_guardrail/`（或 `verify_before_act/`）
- **场景（通用、非 crypto）**：agent 声称"外卖/包裹已送达" → 必须先验证证据，验证通过才允许宣布完成或触发结算。
- **为什么**：人人能懂；"agent 幻觉确认"是知名翻车点；演示通用模式 `verify before claim`；无需任何 API key（用 mock 证据服务）。

## 2. 目录结构

```text
examples/verification_guardrail/
├── README.md                        # 官方风格说明
├── requirements.txt                 # openai-agents, mcp, pydantic
├── mock_evidence_service.py         # 假"配送确认服务"：按 referenceId 返回状态
├── verify_claim_mcp_server.py       # 极简 MCP server：verify_claim 工具
├── agent.py                         # OpenAI Agents SDK 主流程
└── demo.py                          # 跑两个画面：验证通过 / 护栏拦截
```

## 3. 用到的 SDK 特性（选 Python 版，旗舰仓库）

- `Agent` + `Runner`（主流程）
- `MCPServerStdio`（挂载 verify_claim MCP server）——原生 MCP 支持
- **Output guardrail**：agent 最终输出声称"已完成/已结算"但没有 `receipt.verdict == pass` → tripwire 中止
- **工具内校验（强约束）**：`finalize_delivery` 工具第一步检查 receipt，不通过直接拒绝
  - 说明：guardrail 是展示层，工具内校验才是资金动作的真正闸门（guardrail trip 时 agent 可能已消耗 token）。

## 4. demo 流程（两个画面）

1. **正常路径**：agent 拿到有效 referenceId → `verify_claim` 通过 → receipt 到手 → `finalize_delivery` 放行 → 输出附 receiptId。
2. **拦截路径**：证据缺失/过期 → `verify_claim` 返回 failed/resubmission → `finalize_delivery` 拒绝 → guardrail 中止声称"已送达"的输出。

## 5. README 大纲（官方口吻）

```text
# Verification guardrail
## What this example demonstrates
  - 通用模式：verify before claim / verify before act
  - MCP 工具 + output guardrail + 工具内校验三层
## Files
## Setup
## Run
## How it works（流程图）
## Extending（换成真实验证服务：任何 MCP verify server 即可）
```

## 6. PR 描述草稿（英文）

> **Title:** examples: add verification guardrail example (verify before act)
>
> **Body:**
> Agents often claim completion without proof ("your package is delivered") — a well-known hallucination failure. This example shows a generic, framework-native pattern to close that gap:
>
> - A minimal MCP server exposes `verify_claim(claimType, evidence)`
> - An output guardrail trips when the agent claims "done" without a passed verification receipt
> - The `finalize_delivery` tool refuses to run unless `receipt.verdict == "pass"` (guardrail + tool-level enforcement)
>
> The scenario (delivery confirmation) is intentionally generic and runs with a mock evidence service — no API keys, no web3. It demonstrates the `verify before act` pattern that any agent team can adapt by swapping in their own verifier.
>
> Ran `make format`, type checks, and the demo (both pass and blocked paths) locally.

## 7. 提交检查清单

- [ ] fork `openai/openai-agents-python`，新建分支 `examples/verification-guardrail`
- [ ] 读仓库 `CONTRIBUTING.md`（license header、代码风格、测试要求）
- [ ] 代码风格与现有 examples 一致（命名、注释、docstring）
- [ ] 本地跑通 `demo.py` 两条路径
- [ ] 提交 PR，附上面的描述
- [ ] 并行：在 guardrails 文档页提一个 Issue："建议补充 verify-before-act / settlement-gate 场景"

## 8. 备选与后续

- **TS 变体**：`openai-agents-js` 有 tool-level guardrail（工具护栏），适合做"调用前拦截"的另一个示例，可作第二个 PR。
- 真实数据版：AI2Human 自己的 `verify_claim`（X/链上）作为"换成真实验证服务"的说明放我们自己仓库，不进官方示例。
