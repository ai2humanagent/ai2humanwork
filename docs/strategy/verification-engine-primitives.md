# AI2Human 验证引擎原语

> 状态：战略基准 v0.1（2026-08-20）
> 一句话：**`verify(声称, 证据) → 裁决 + 凭证`** —— 把任何"声称"变成"可验证事实"，并出一张可复查的凭证。

## 1. 为什么需要这个引擎（LLM 做不到什么）

LLM 可以"参与"验证，但不能"负责"验证：

- **自验证无效**：让 LLM 验证自己的输出 = 学生给自己批卷子，看不见自己的盲区。
- **没有身体**：物理现实（到场、送达、拍照）它天生够不到。
- **会被骗**：对抗场景（刷单、空投、作弊）里，LLM 裁判是攻击目标。
- **没有凭证**：LLM 的"是"只是一句话，无法被其他系统独立信任。
- **会想象结果**：它可能编造工具返回值、余额、链接而不去真的查。

因此验证必须**锚定在 LLM 之外**：确定性检查 + 真实证据 + 人工兜底 + 可验证凭证。

## 2. 最通用的原语

```
verify(claim, evidence) → verdict + receipt
```

- `claim`：一个关于现实世界的断言（"包裹送达了""这是真人""这个事实为真"）。
- `evidence`：证据包，可拆成六个维度（见下）。
- `verdict`：pass / fail / resubmit / manual_review。
- `receipt`：裁决 + 证据哈希 + 时间戳 + 签名，可被下游独立复查。

所有场景（外卖送达、防 sybil、事实核查、认证凭证……）都是这个函数的参数化，不是新引擎。

## 3. 证据六维（所有场景的公共语言）

| 维度 | 英文 | 问的是 |
| --- | --- | --- |
| 身份 | identity | 谁做的（账号 / 钱包 / 人） |
| 时间 | time | 什么时候（新鲜度、时间戳） |
| 地点 | location | 在哪（GPS / 场所） |
| 内容 | content | 做了什么（照片 / 文字 / 单据） |
| 过程 | process | 怎么做的（草稿 / 录屏 / 设备指纹） |
| 佐证 | corroboration | 谁还能证明（其他系统 / 传感器 / 人） |

场景 = 六维的子集 + 侧重。新场景来了先套六维，缺哪维补哪维，不需要发明新维度。

## 4. 验证六步链（所有场景走同一条流水线）

```
采集 → 防篡改 → 验真 → 交叉核对 → 判断 → 锚定出凭证
```

1. **采集 capture**：证据必须"现场当时"拿到（新鲜、有来源）。
2. **防篡改 integrity**：哈希、签名、元数据一致（没被 P 过）。
3. **验真 authenticity**：证据是真的（作者匹配、设备、AI 生成检测）。
4. **交叉核对 consistency**：与其他证据和已知事实对得上（去重、GPS 合理性）。
5. **判断 judgment**：规则判不了的，升级给带细则的模型/人工。
6. **锚定 anchor**：裁决 + 证据哈希 → 时间戳 + 签名凭证，谁都能复查。

## 5. 保证等级（Assurance Levels）

策略不用每个场景写一套，用等级参数化：

| 等级 | 含义 | 适用 |
| --- | --- | --- |
| L1 | 自证：有声称 + 基本格式 | 低风险、快速 |
| L2 | 工具验证：确定性检查（API / 链上 / 解析） | 数字事实 |
| L3 | 证据验证：照片 + 时间 + 地点 + 交叉核对 | 现实动作 |
| L4 | 人工验证：真人复核、判断类 | 高价值、模糊 |
| L5 | 仲裁：纠纷裁决，出可追溯凭证 | 争议、资金 |

场景 = 选等级 + 选维度，逻辑只有一套。

## 6. 架构：一个引擎，不是无数个 MCP

```
verify_claim(claimType, evidence)
        │
        ▼
  策略配置（等级 + 维度权重 + 检查序列 + 升级规则）
        │
        ▼
  底层共享能力：身份/设备指纹 · 时间戳+GPS · 图片真实性 · 凭证签发
```

- 对外只暴露一个工具：`verify_claim`。
- 场景是配置（50 个场景 = 50 份配置，不是 50 个程序）。

## 7. 起步场景（15 个参数演示）

### A. 物理现实

| id | 声称 | 维度侧重 | 等级 |
| --- | --- | --- | --- |
| delivery_confirmed | 外卖/快递已送达 | time+location+content+corroboration | L3 |
| event_attended | 线下活动真的到场 | identity+time+location | L3 |
| storefront_open | 店铺确实开着 | time+location+content | L3 |
| package_picked_up | 取件/签收真的拿到 | identity+time+content | L3 |
| on_site_photo | 现场拍照证据（通用底层） | time+location+content+process | L3 |

### B. 真人真实性

| id | 声称 | 维度侧重 | 等级 |
| --- | --- | --- | --- |
| is_real_human | 这是真人不是 bot | identity+process+corroboration | L4 |
| anti_sybil | 一人一号，没刷 | identity+process+corroboration | L4 |
| human_made_content | 手工创作，不是 AI | process+content | L3 |
| genuine_review | 评价是真实用户 | identity+process+corroboration | L4 |

### C. 独立裁决

| id | 声称 | 维度侧重 | 等级 |
| --- | --- | --- | --- |
| dispute_resolved | 纠纷谁有理 | content+corroboration+judgment | L5 |
| refund_eligible | 该不该退款/赔偿 | content+corroboration+judgment | L5 |
| fact_checked | 事实是真是假 | content+corroboration | L3 |

### D. 凭证

| id | 声称 | 维度侧重 | 等级 |
| --- | --- | --- | --- |
| completion_credential | 完成培训/认证 | identity+anchor | L3 |
| document_submitted | 提交过这份材料 | time+integrity | L3 |
| verified_receipt | 交付被验证过（凭证流转） | anchor | L2 |

## 8. 对外叙事与 OpenAI 示例定位

- 不卖"验证平台"，卖**引擎**：把任何"声称"变成"可验证凭证"。
- 面向 agent 框架：一个 `verify_claim` MCP，装进 OpenAI Agents SDK 即用。
- OpenAI 官方示例演示**引擎**（guardrail + MCP + 一个通用场景），不演示场景清单。
- 通用场景建议：`delivery_confirmed`（人人能懂、幻觉翻车点明显、不涉及 crypto）。

## 9. 下一步

1. 把 15 个起步场景写成正式 policy 规格（证据要求 + 检查序列 + 升级规则 + 凭证格式）。
2. 实现 `verify_claim` 引擎的最小版（MCP + 一个通用示例）。
3. 用引擎接第一个真实场景（`delivery_confirmed` 或现有 X 验证），出验证报告当产品演示。
