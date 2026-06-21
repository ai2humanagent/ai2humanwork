# X Layer Onchain OS AI Hackathon — 提交表单填写内容

> 来源：基于项目代码、文档、submissionProof.js 整理
> 更新时间：2026-03-26
> ⚠️ 标注【待填】的字段需要手动补充

---

## 电子邮件地址
ritsuyan4763@gmail.com

---

## Project Name / 项目名称 *
```
ai2humanwork
```

---

## Project Description / 项目描述 *
> 最多 300 字符

```
ai2human is human fallback infrastructure for agents on X Layer. The planner first checks Wallet API, Market API, and Trade API via OnchainOS precheck. If blocked by real-world constraints, it dispatches a human operator, collects structured proof, verifies completion, and settles on X Layer only after verification clears.
```

---

## Select Your Primary Track / 选择主赛道 *
```
Agentic Payment / 链上支付场景
```

---

## Project X (Twitter) Handle / 项目 X 账号 *
> 须为项目官方账号，不接受个人账号

```
@ai2humannetwork
```

---

## Personal Telegram Handle / 个人 Telegram 账号 *
```
【待填】
```

---

## Team members list & X accounts / 核心项目成员与 X 账户 *
```
【待填：填写实际参赛成员姓名及其 X 账号，不含个人敏感信息】
```

---

## Your Project X Post URL / 项目官方 X 推文链接 *
> 需在提交前已发布，且须通过项目官方账号 @ai2humannetwork 发出

```
【待填：发布后补充链接，格式 https://x.com/ai2humannetwork/status/...】
```

---

## Additional Demo Screenshots or Video URL / 其他演示截图或视频 *
```
Live demo:        https://ai2human.work/livedemo
Submission page:  https://ai2human.work/submission
Reviewer console: https://ai2human.work/reviewer
Task board:       https://ai2human.work/tasks
Settled task:     https://ai2human.work/tasks/7bde6365-9e4a-4fa9-a2f4-e79657b354b3
```

---

## GitHub Repository URL / GitHub 仓库链接 *
> 提交时须为公开状态并包含完整源代码

```
https://github.com/richard7463/ai2humanwork
```

---

## X Layer Transaction Hash / X Layer 交易 Hash *
> 至少一个 X Layer 主网交易 Hash，证明真实链上活动

```
0x9c01ad8dac5f2fa1d77da8e9b3f2a3afbfe539ea68af7f3929d7bf9a5f3f5d67
```

Explorer 验证链接：
```
https://www.oklink.com/xlayer/tx/0x9c01ad8dac5f2fa1d77da8e9b3f2a3afbfe539ea68af7f3929d7bf9a5f3f5d67
```

交易说明：
- 链：X Layer mainnet（Chain ID 196）
- 结算资产：USDT0 / USD₮0
- 结算金额：0.01 USDT0
- 结算任务："Reply to the official thread with a localized summary and CTA"
- 结算时间：2026-03-24 18:57:41 UTC+8
- Payer 地址：0x3f665386b41Fa15c5ccCeE983050a236E6a10108
- Operator 地址：0x81009cc711e5e0285dd8f703aab1af69fa4a4390

---

## X Layer Contract or Wallet Address / 合约或钱包地址
> Agent 在 X Layer 上运行所使用的主要地址

```
0x3f665386b41Fa15c5ccCeE983050a236E6a10108
```

---

## Which OnchainOS capabilities does your project use? / 使用了哪些 OnchainOS 功能？ *
```
✅ Trade API / 交易 API
✅ Market API / 行情 API
✅ Wallet API / 钱包 API
✅ x402 Payments / x402 支付
```

---

## AI Model & Version Used / 使用的 AI 模型及版本
```
【待填：填写实际使用的 AI 模型及版本，例如 GPT-4o / Claude 3.5 等】
```

---

## Prompt Design Overview / 提示词设计概述
> 最多 600 字符

```
ai2human uses a 5-role agent chain: OnchainOS Precheck → Planner → Dispatcher → Verifier → Settlement. The planner prompt starts with an OnchainOS precheck querying Wallet API, Market API, and Trade API on X Layer. If still blocked by real-world or compliance constraints, the dispatcher routes to a human operator with explicit proof requirements. The verifier checks proof completeness before settlement is triggered. The settlement agent releases payment on X Layer only after verification clears. An optional x402 Gate Agent payment-gates the verification bundle. Each role has a single responsibility and cannot bypass the verification gate.
```

---

## Anything else we should know? / 还有什么想告诉我们的？
```
The settled task is "Reply to the official thread with a localized summary and CTA."
The core submission claim: OnchainOS first. Human fallback when needed. Verification before payment. Settlement on X Layer.
The loop is already proven onchain — judges can inspect the settlement tx directly without relying on our description alone.
Core loop: task → OnchainOS precheck → human execution → proof → verify → settle on X Layer.
```

---

## 提交前确认清单
- [ ] GitHub 仓库已公开且代码可访问
- [ ] TX Hash 在 X Layer 主网有效（已验证）
- [ ] 项目官方 X 推文已发布
- [ ] Demo 可正常访问

---

## 待补充字段汇总

| 字段 | 状态 | 说明 |
|---|---|---|
| Personal Telegram Handle | ❌ 待填 | 个人 Telegram 账号 |
| Team members & X accounts | ❌ 待填 | 核心成员列表及 X 账号 |
| Project X Post URL | ❌ 待发布后填写 | 须通过 @ai2humannetwork 官号发布 |
| AI Model & Version | ❌ 待填 | 实际使用的 AI 模型版本 |
