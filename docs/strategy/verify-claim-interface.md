# verify_claim 接口规范（MCP 工具 Schema + 接入设计）

> 基准：[verification-engine-primitives.md](./verification-engine-primitives.md) + [verification-policies.md](./verification-policies.md)
> 目标：对外只暴露一个引擎工具 `verify_claim`，所有场景通过 `claimType`（policyId）参数化。

## 1. MCP 工具清单

服务名：`ai2human-verify`

| 工具 | 用途 |
| --- | --- |
| `verify_claim` | 提交声称 + 证据，跑对应 policy 的检查链，返回裁决与凭证 |
| `get_verification` | 用 verificationId 查状态/结果（异步场景轮询或回调） |
| `list_policies` | 列出可用的 claimType / 等级 / 所需证据（供 agent 自查） |

## 2. verify_claim 入参

```jsonc
{
  "claimType": "delivery_confirmed",        // policyId，决定用哪份配置
  "evidence": {
    "identity":   { "accountId": "rider_1024" },                 // 谁
    "time":       { "capturedAt": "2026-08-20T12:31:00Z" },      // 何时
    "location":   { "gps": { "lat": 31.23, "lng": 121.47 } },    // 何地
    "content":    { "imageHashes": ["sha256:..."], "url": "..." }, // 什么
    "process":    { "deviceId": "dev_8821", "source": "in_app_capture" }, // 怎么做的
    "corroboration": { "refs": ["order:88712"], "confirmations": [] }     // 佐证
  },
  "config": {
    "level": "L3",              // 可覆盖 policy 默认
    "maxAgeHours": 6,
    "callbackUrl": "https://..." // 可选：manual_review 完成后回调
  }
}
```

六维证据全部可选；`missing` 会告诉调用方缺什么，支持 resubmit。

## 3. 出参

```jsonc
{
  "verificationId": "v_8f2a...",
  "status": "passed",          // pending | passed | failed | resubmission | manual_review
  "verdict": "pass",           // pass | fail | resubmit | manual_review
  "policy": { "policyId": "delivery_confirmed", "version": 1, "level": "L3" },
  "checks": [
    { "name": "capture",       "passed": true },
    { "name": "integrity",     "passed": true },
    { "name": "authenticity",  "passed": true },
    { "name": "consistency",   "passed": true },
    { "name": "judgment",      "passed": true },
    { "name": "anchor",        "passed": true }
  ],
  "matched": ["order:88712"],
  "missing": [],
  "receipt": {                 // 最终裁决时签发
    "schemaVersion": 1,
    "receiptId": "r_...",
    "claimHash": "sha256:...",
    "evidenceHash": "sha256:...",
    "verdict": "pass",
    "signer": "ai2human-verify",
    "issuedAt": "2026-08-20T12:31:05Z",
    "checksHash": "sha256:..."
  }
}
```

`receipt` 只在终态签发；`manual_review` 状态下无 receipt，可通过 `get_verification` 轮询或回调获取。

## 4. 状态流转

```
submitted → pending
         → passed（签发 receipt）
         → failed（终态，无 receipt）
         → resubmission（缺证据，返回 missing）
         → manual_review（升级人工；完成后走 passed/failed）
```

## 5. 与现有能力的关系（第一个真实实现）

- `verify_x_post_claim` / `verify_wallet_claim` 是引擎的两个**内置 claimType**（已有代码），对应 policy：
  - `x_post_claim`（L2，现有 articleContest + x-link-submission 检查链）
  - `wallet_claim`（L2，链上余额/交易，viem）
- 新场景（如 `delivery_confirmed`）= 新增一份 policy 配置 + 对应证据采集端，引擎代码不变。

## 6. 通用 demo 接入设计（delivery_confirmed × OpenAI Agents SDK）

```text
Agent 收到"包裹已送到门口"的声明 + 证据
        │
        ▼
调用 verify_claim("delivery_confirmed", evidence)
        │
        ▼
引擎跑六步链 → passed / failed / manual_review
        │
        ▼
护栏检查：finalize/settle 工具执行前必须看到 receipt.verdict == "pass"
        │
        ▼
通过 → 宣布完成（附 receiptId）；不通过 → 拒绝并说明缺什么
```

接入点两层（与框架无关的通用模式）：

1. **工具内检查（必须）**：任何"完成/结算"类工具第一步校验 receipt，不通过直接拒绝。
2. **框架护栏（显性）**：OpenAI Agents SDK 的 output guardrail / tool guardrail 作为展示层，防止 agent 绕过工具直接声称完成。

## 7. 错误与限制

- 未配置的 `claimType` → 400 + 可用列表（提示 `list_policies`）。
- 证据哈希缺失 → 无法锚定 → 拒绝（L3+ 必填）。
- 超过 `maxAgeHours` → fail（新鲜度）。
- `manual_review` 不设超时上限，但提供 SLA 预期（如 24h）。
