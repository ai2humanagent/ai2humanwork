# 全链路测试用例 — End-to-End Test Cases

## 测试环境准备

```bash
# 启动开发服务器
npm run dev

# 确认 API 正常运行
curl -s http://localhost:3000/api/tasks | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'任务数量: {len(d)}')"
```

**预期输出:** `任务数量: 1`（只有 "Follow @ai2humannetwork on X"）

---

## 一、基础验证测试

### TC-01: 任务列表只显示真实任务

**操作:**
```bash
curl -s http://localhost:3000/api/tasks | python3 -c "
import json,sys
d=json.load(sys.stdin)
for t in d:
    print(t['status'], '|', t['title'])
"
```

**预期:**
```
paid | Follow @ai2humannetwork on X
```
只有 1 个任务，无假数据。

---

### TC-02: 任务详情 — 已完成状态

**操作:** 访问 `http://localhost:3000/tasks/tw-follow-0e4a2568`

**预期:**
- 标题 "Follow @ai2humannetwork on X"
- 状态显示 "Settled"
- 有 "ai2human Official" 标签
- 奖池显示 "5 USDC · 10 winners"

---

### TC-03: 任务奖池显示

**操作:**
```bash
curl -s http://localhost:3000/api/tasks/tw-follow-0e4a2568 | python3 -c "
import json,sys
t = json.load(sys.stdin)
print('budget:', t['budget'])
print('totalPool:', t['rewardDistribution']['totalPool'])
print('perWinner:', t['rewardDistribution']['perWinner'])
"
```

**预期:**
```
budget: 0.5
totalPool: 5 USDC
perWinner: 0.5 USDC
```
- 卡片显示总奖池 `5 USDC`（不是 0.5 USDC）

---

## 二、Escrow 链上奖池系统

### TC-04: Escrow 配置查询

**操作:**
```bash
curl -s http://localhost:3000/api/escrow/config
```

**预期 (无 BASE_SETTLEMENT_PRIVATE_KEY 时):**
```json
{
  "escrowWallet": null,
  "configured": false,
  "instructions": "Set BASE_SETTLEMENT_PRIVATE_KEY env var to enable escrow."
}
```

**预期 (已配置时):**
```json
{
  "escrowWallet": "0x...",
  "configured": true,
  "escrowTokenSymbol": "USDC",
  "escrowBalance": "100.0",
  "instructions": "Call USDC.approve(\"0x...\", <maxAmount>) on Base mainnet..."
}
```

---

### TC-05: 创建带 Escrow 存款的任务（需配置）

**前置条件:** `BASE_SETTLEMENT_PRIVATE_KEY` 已配置，Escrow 钱包有 USDC 余额

**操作:**
```bash
# 1. 先检查 agent 信息
curl -s http://localhost:3000/api/agents

# 2. 创建带存款的任务
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Follow @ai2humannetwork on X",
    "budget": "5 USDC",
    "deadline": "2026-05-28T16:00:00Z",
    "agentId": "agent_official",
    "depositAmount": "5"
  }'
```

**预期 (无配置时 400):**
```json
{"error": "Escrow deposit failed: Escrow is not configured. Set BASE_SETTLEMENT_PRIVATE_KEY env var..."}
```

**预期 (已配置 + agent 已 approve):**
```json
{
  "task": { "id": "...", "status": "created", "escrowDepositId": "escrow_..." },
  "escrowDeposit": {
    "status": "active",
    "amountDeposited": "5",
    "depositTxHash": "0x...",
    "explorerUrl": "https://basescan.org/tx/0x..."
  }
}
```

**预期 (已配置 + agent 未 approve 或余额不足 400):**
```json
{"error": "Escrow deposit failed: Insufficient allowance. Agent must approve the escrow wallet first..."}
```

---

### TC-06: 查看任务 Escrow 状态

**前置条件:** TC-05 成功创建了带 escrow 的任务

```bash
curl -s http://localhost:3000/api/tasks/<taskId>/escrow
```

**预期:**
```json
{
  "escrowDeposit": {
    "id": "escrow_...",
    "taskId": "...",
    "agentId": "agent_official",
    "totalPool": "5",
    "amountPaidOut": "0",
    "amountRefunded": "0",
    "status": "active"
  },
  "remainingBalance": "5",
  "escrowWallet": "0x..."
}
```

---

### TC-07: 领取奖励（从 Escrow 钱包打款）

**前置条件:** 用户已完成所有 subtask 验证

```bash
curl -X POST http://localhost:3000/api/tasks/<taskId>/claim-reward \
  -H "Content-Type: application/json" \
  -d '{"wallet": "0xd50c85ff5872323c5b218057a9e4f5f3a0aa2c3f"}'
```

**预期 (已配置):**
```json
{
  "success": true,
  "payment": {
    "amount": "0.5",
    "txHash": "0x...",
    "explorerUrl": "https://basescan.org/tx/0x...",
    "network": "base-mainnet",
    "tokenSymbol": "USDC"
  }
}
```

**Escrow 状态应更新:**
```bash
curl -s http://localhost:3000/api/tasks/<taskId>/escrow | python3 -c "
import json,sys
d = json.load(sys.stdin)
print('amountPaidOut:', d['amountPaidOut'])
print('remainingBalance:', d['remainingBalance'])
"
```
**预期:** `amountPaidOut: 0.5`, `remainingBalance: 4.5`

---

### TC-08: 截止期后退款

**前置条件:** 任务 deadline 已过，且 Escrow 仍有剩余

```bash
curl -X POST http://localhost:3000/api/tasks/<taskId>/refund \
  -H "Content-Type: application/json" \
  -d '{"reason": "deadline_passed"}'
```

**预期 (200):**
```json
{
  "success": true,
  "amountRefunded": "4.5",
  "refundTxHash": "0x...",
  "explorerUrl": "https://basescan.org/tx/0x...",
  "to": "0xagentWallet..."
}
```

**再次查询 escrow 状态:**
```bash
curl -s http://localhost:3000/api/tasks/<taskId>/escrow | python3 -c "
import json,sys
d = json.load(sys.stdin)
print('status:', d['status'])
print('amountRefunded:', d['amountRefunded'])
"
```
**预期:** `status: refunded`, `amountRefunded: 4.5`

---

### TC-09: Escrow 余额不足时的奖励领取

**前置条件:** Escrow 钱包余额不足以支付奖励

**操作:** 用户尝试领取奖励

**预期:**
- `executeSettlement` 调用失败
- 返回 500 错误: `"Settlement failed..."`
- 数据库无 payment 记录

---

### TC-10: 重复退款拦截

**操作:**
```bash
curl -X POST http://localhost:3000/api/tasks/<taskId>/refund \
  -H "Content-Type: application/json" \
  -d '{"reason": "deadline_passed"}'
```

**预期 (400):**
```json
{"error": "Escrow has already been fully refunded."}
```

---

## 三、钱包连接与 Profile

### TC-11: 新钱包连接

**操作:** 访问 `http://localhost:3000/app/profile` → Connect Wallet

**预期:**
- 显示 "Connect your wallet" 引导卡
- 连接后显示 Edit Profile 表单

---

### TC-12: Profile 保存 → 自动派发任务

**前置条件:** 有 `created` 或 `ai_failed` 状态且无 assignee 的任务

**操作:** 填写 Name/Role/Location → Save Profile

**预期:**
- "Operator profile created."
- 任务被自动分配给该用户
- 创建 `task_assigned` 通知

---

### TC-13: 通知页面

**操作:** 访问 `http://localhost:3000/app/notifications`

**预期:**
- 显示未读通知（青色边框）
- "View Task" 按钮链接到任务详情

---

## 四、任务详情与证明提交

### TC-14: 已分配任务详情页

**前置条件:** TC-12 创建的任务

**操作:** 访问 `http://localhost:3000/tasks/<taskId>`

**预期:**
- 状态 "Accepted"
- 显示 "This task is already claimed by you."
- 可提交证明表单

---

### TC-15: 侧边栏导航

**操作:** 访问 `/app/profile` 和 `/app/notifications`

**预期:**
- Profile + Notifications 两个导航项
- 无 Twitter Tasks / Create Task 等无关项

---

## 五、边界情况

### TC-16: 无 session 访问 Protected API

```bash
curl -s http://localhost:3000/api/notifications
curl -s http://localhost:3000/api/escrow/config
```

**预期:** notifications → 401, escrow config → 200（公开接口）

---

### TC-17: 不存在的任务

```bash
curl -s http://localhost:3000/api/tasks/nonexistent/escrow
```

**预期 (404):** `{"error": "No escrow deposit found for this task."}`

---

## 六、.env.local 配置参考

```bash
# Escrow / 结算钱包 (私钥，需要有 USDC 余额)
BASE_SETTLEMENT_PRIVATE_KEY=0x...

# Base 主网 RPC
BASE_RPC_URL=https://mainnet.base.org

# USDC 合约地址 (Base 主网标准地址)
BASE_SETTLEMENT_TOKEN_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# 结算 token symbol
BASE_SETTLEMENT_TOKEN_SYMBOL=USDC

# BaseScan API Key (可选，用于更好的 explorer 链接)
BASE_EXPLORER_API_KEY=
```

---

## 快速测试命令

```bash
# 查看任务
curl -s http://localhost:3000/api/tasks | python3 -m json.tool

# 查看 escrow 配置
curl -s http://localhost:3000/api/escrow/config | python3 -m json.tool

# 创建测试任务（无 escrow）
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Task","budget":"1 USDC","deadline":"2026-06-01T00:00:00Z"}'

# 查看任务 escrow 状态
curl -s http://localhost:3000/api/tasks/<taskId>/escrow | python3 -m json.tool
```
