# ai2human — X Layer Hackathon 差距分析

更新时间: 2026-03-26

## 评分基准

评分公式: `综合分 = 结合度 × 0.25 + 实用性 × 0.25 + 创新性 × 0.30 + 可复制性 × 0.20`

参考来源: OKX 首届 AI 松 Gemini 评审 Prompt + X Layer Onchain OS AI Hackathon 官方 thread

## 当前评分估计

| 维度 | 当前分数 | 一等奖基准 | 差距 |
|------|---------|-----------|------|
| 结合度 (25%) | 7.5 | 9.5-10.0 | -2.0 ~ -2.5 |
| 实用性 (25%) | 8.5 | 9.5 | -1.0 |
| 创新性 (30%) | 8.0 | 9.0-9.5 | -1.0 ~ -1.5 |
| 可复制性 (20%) | 8.5 | 9.0-9.5 | -0.5 ~ -1.0 |
| **综合** | **8.1** | **9.4+** | **-1.3** |

当前综合分 8.1 大约对应第一期排名 10-15 名（三等奖区间）。

## 核心短板

### 1. 结合度不足（最致命）

问题:

- X Layer 仅被用作结算链（ERC20 transfer），不是核心业务逻辑的不可替代部分
- 没有调用 OnchainOS 核心能力（Market / Wallet / Trade / Broadcast）
- 把 X Layer 换成任何 EVM 链（Arbitrum、Base），项目照样能跑
- 评委分档标准里，这属于"基本结合，仅做简单调用或演示"（5-6 分档）

评委实际在看:

- OnchainOS / X Layer / x402 是不是核心能力，不可替代
- 是不是只在收款环节用了一下 X Layer
- 主路径里有没有 OKX 的 quote / route / approve / broadcast

一等奖基准（9-10 分）要求:

- "深度集成，Onchain OS / X Layer / x402 是核心能力不可缺少的组成部分"

### 2. 自主性方向与评委期望相反

问题:

- 官方评审四个关注点之一是 "Autonomous agent payment flow within the X Layer ecosystem"
- ai2human 的核心叙事是"人帮 agent 做事"，与"agent 自主链上行动"方向相反
- 评委会认为 AI agent 不够自主，更像一个人工任务平台

评委实际在看:

- AI agent 在哪里真的做了决定
- agent 是自主执行还是依赖人工

### 3. 多 Agent 协作深度不够

问题:

- 架构定义了 5 个 agent（Planner / Dispatcher / Verifier / Settlement / x402 Gate）
- 但这些 agent 更像是状态机的不同阶段标签，不是真正独立决策的 agent
- 没有 agent 之间的对话、协商、互相否决等真正的"collaboration"
- 评委要看的是 "Architecture for collaboration between multiple agents"

### 4. x402 的使用偏边缘

问题:

- x402 仅用于"解锁验证包"（verification bundle access），是一个 bonus 功能
- 不在主业务闭环里
- 评委加分项 "integrating x402 payments" 要求 x402 在核心流程中

## 次要弱点

### 5. 实用性叙事偏窄

- "门店验证、取件确认" 等场景对 crypto 评委来说离 DeFi / Trading / Payments 较远
- 评委更容易被"链上交易、支付、DeFi"类场景打动
- 建议补充至少一个链上原生场景（如：agent 需要人工确认大额交易、agent 需要人工完成 KYC 等）

### 6. 缺少 demo 视频

- 提交要求明确需要 demo video
- 当前只有 live demo 页面，没有录制好的视频
- 视频控制在 30-60 秒最佳

### 7. X 账号未创建

- 提交要求用新的项目 X 账号回复官方 thread
- 需要专门为 ai2human 创建一个项目 X 账号

## 改进方向（如果要用 ai2human 参赛冲奖）

### 方向 A: 补 OnchainOS 到主路径（最小改动冲 9 分结合度）

在 agent 派发任务到人之前，加一个 OnchainOS 预检层:

```
用户请求 → Planner Agent 调用 OnchainOS:
  - Market: 查询目标资产价格和行情
  - Wallet: 查询钱包余额和持仓
  - Trade: 获取 swap 报价
  → 如果链上能解决 → 直接执行
  → 如果链上解决不了（需要物理世界操作）→ fallback 到人
  → 人完成后 → Verifier 验证 → Settlement 在 X Layer 结算
```

这样 OnchainOS 就从"可有可无"变成"核心决策路径的第一步"。

### 方向 B: 把 x402 放进主闭环

改为:

- agent 派发任务时通过 x402 向人类操作员付费（任务执行费）
- 人类完成后通过 x402 解锁验证结果
- 两笔 x402 交易在主路径里，不是 bonus

### 方向 C: 用 ai2human 代码底座做全新项目

保留:

- X Layer settlement 基础设施（xlayerSettlement.ts）
- x402 完整实现（x402.ts + x402Shared.ts）
- 多 agent 架构模式（agentArchitecture.js）
- Next.js 项目框架
- viem 链上交互

替换:

- 业务逻辑换成更贴近 "AI Agent + Onchain Execution" 的场景
- 补上 OnchainOS Market / Wallet / Trade 调用

## 评审硬门槛 Checklist

- [x] 代码公开到 GitHub
- [x] 至少 1 笔真实 X Layer 主网交易（tx hash 已有）
- [ ] 准备 30-60 秒 demo 视频
- [ ] 创建项目 X 账号
- [ ] 回复官方 thread
- [ ] 填写提交表单

## 参考

- X Layer Hackathon Phase 1 官方 thread: @XLayerOfficial 2026-03-12
- OKX 首届 AI 松评审结果: Gemini 评分，132 个有效作品，Top 24 获奖
- 第一期一等奖结合度满分 10.0，综合分约 9.4+
- 提交表单: https://forms.gle/BgBD4SuvJ7936FU97
