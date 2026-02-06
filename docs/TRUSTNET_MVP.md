# TrustNet MVP 功能开发文档（详细版）

> 目标：用最短时间跑通 “任务进来 → AI 执行 → 人类兜底 → 验证 → 结算” 的闭环。
>
> 这份文档面向：产品/设计/全栈/运营，用来对齐 MVP 交付范围与验收标准。

## 1. 一句话定义 MVP
一个**双向劳务市场**：
- 人可以雇 AI 去接单/执行线上任务
- AI 卡住时可以雇人完成线下/高反爬/最后一公里
- 结果可验证、结算可追溯（MVP 先 mock）

## 2. MVP 成功标准（验收）
必须同时满足：
1. 能跑通 ≥ 20 个任务闭环（非纯演示；允许人工审核/人工派单）
2. 每个任务都有可回看的证据链（至少：日志/文本证据/图片证据之一）
3. 任务状态可解释：用户能看懂“现在在哪一步、下一步是什么”
4. 结算流程存在：哪怕是 mock，也要能生成“结算记录 + 状态变更”

## 3. 范围：Must / Should / Could

### 3.1 Must（MVP 必做）
1. **任务发布（需求侧入口）**
2. **任务市场列表**（浏览、筛选、排序）
3. **任务详情页**（stepper + “下一步”主按钮）
4. **AI 执行入口**（先以固定模板/受控方式接入；MVP 允许模拟）
5. **人类兜底派单**（MVP 允许管理员手动派单）
6. **证据提交**（AI/人类/系统均可写入证据）
7. **人工验证**（通过/驳回最小闭环）
8. **结算（mock + 账本记录）**
9. **状态机约束**（避免乱跳，保证可解释）
10. **审计日志**（至少记录关键动作：谁触发、何时、结果）

### 3.2 Should（MVP+，显著提升体验）
1. 人类待命池（可用状态、技能、地点、价格）
2. AI 上架页（AI Profile：能力、范围、价格、权限边界）
3. 自动派单规则（简单匹配：地点/技能/价格）
4. 通知（站内/邮件：派单、验收、结算）

### 3.3 Could（后续）
1. ERC-8004 身份/信誉真正上链
2. x402 真正结算
3. 争议仲裁/反作弊/ZKP 增强验证
4. 多 Agent 协作（DAG 编排、并行子任务）

## 4. 角色与权限（MVP 版）
角色：
1. **任务方（Buyer）**：发布任务、查看进度、查看证据
2. **AI（Agent）**：执行任务、提交日志/结果
3. **人类执行者（Human Operator）**：接管任务、提交证据（尤其图片/线下）
4. **审核员/管理员（Reviewer/Admin）**：派单、验收、结算、纠错

MVP 权限建议（最安全）：
- 验证/结算操作只允许 Admin
- 普通用户只允许发任务/看进度/看证据

## 5. 核心流程（最短闭环）

### 流程 A：任务发布 → AI 执行
1. Buyer 创建任务（标题/预算/时限/验收）
2. 系统将任务置为 `created`
3. AI 接单执行：进入 `ai_running`
4. AI 成功：进入 `ai_done`（写入 evidence）
5. AI 失败/不确定：进入 `ai_failed`（写入失败原因/日志）

### 流程 B：AI 失败 → 人类兜底
1. Admin 选择人类执行者并派单：进入 `human_assigned`
2. 人类完成并提交证据：进入 `human_done`

### 流程 C：验证 → 结算
1. Reviewer 验证通过：进入 `verified`
2. 结算完成（mock/链下）：进入 `paid`，写入 payment 记录与证据

## 6. 任务状态机（必须严格）
状态：
- `created`：已创建，待 AI 执行
- `ai_running`：AI 执行中
- `ai_done`：AI 已交付（证据已写入）
- `ai_failed`：AI 失败/不确定（原因/日志已写入）
- `human_assigned`：已派人
- `human_done`：人类已交付（证据已写入）
- `verified`：审核通过
- `paid`：结算完成

推荐约束：
- `verified` → `paid` 仅 Admin 可触发
- `ai_failed` 才允许进入 `human_assigned`（或允许 `created` 直接派人，但需明确策略）

## 7. 证据与验证（MVP）
证据（Evidence）最小支持：
- 文本（说明/总结/字段结果）
- 链接（如截图链接）
- 图片（推荐；用于线下与“硬证据”）
- AI 执行日志（成功/失败原因）

验证（MVP 先人工）：
- Reviewer 点击“通过/驳回”
- 驳回策略：回到 `ai_failed` 或保持 `human_assigned`（由运营决定）

## 8. 结算（MVP）
MVP 结算目标：**流程像真的**、可审计、可回放。
- 先 mock：不真正转账
- 记录账本：task_id、金额、收款方、方式、时间
- 写入证据：`Payment settled (mock)`

## 9. 页面与信息架构（MVP）
1. **任务市场（Marketplace）**
   - Tab：`雇 AI 接单` / `AI 雇人兜底`
   - 筛选：地点/类型/紧急度/状态（待接单、已派人、已结算）/预算区间
   - 排序：最近/高价/紧急
   - 卡片：标题、预算、地点、类型、紧急度、状态、执行者
2. **发布任务（Post Task）**
   - 标题、预算、时限、验收标准
3. **任务详情（Task Detail）**
   - Stepper：创建→AI→人类→验证→结算
   - “下一步”主按钮（强制只一个主动作）
   - 证据时间线
4. **人类池（Human Pool）**（MVP 可先内置在 Admin 面板）
   - 列表：地点/技能/价格/可用状态，支持派单

## 10. 数据模型（最小集合）
1. `Task`
2. `Evidence`
3. `Payment`
4. `Actor`（MVP 可用字符串 + by 字段）

Task 最小字段：
- id, title, budget, deadline, acceptance
- status, createdAt, updatedAt
- assignee(type,name) 可选
- evidence[]（或 evidence 表分离）

## 11. API（MVP 最小集合）
建议（REST）：
- `POST /api/tasks` 创建任务
- `GET /api/tasks` 任务列表（支持筛选/排序 query，MVP 可先前端筛）
- `POST /api/tasks/seed` 生成 mock 数据（用于演示/压测 feed 密度）
- `POST /api/tasks/:id/ai` AI 成功/失败（写日志并更新状态）
- `POST /api/tasks/:id/human` 派单给人类（写日志并更新状态）
- `POST /api/tasks/:id/evidence` 提交证据（写证据并更新状态）
- `POST /api/tasks/:id/verify` 验证通过
- `POST /api/tasks/:id/settle` 结算完成（mock）

> 注：我们当前代码实现已覆盖上述 API（见 `app/api/tasks/...`）。

## 12. 里程碑建议（10 个工作日）
1. Day 1-2：任务发布/列表/状态机
2. Day 3：任务详情（stepper + evidence 时间线）
3. Day 4：人类派单（先手动）
4. Day 5：人工验证 + mock 结算 + 账本记录
5. Day 6-7：AI 执行接入（固定模板；或先半自动）
6. Day 8：市场体验（Tab + 筛选 + 排序）
7. Day 9：审计日志 + 最小风控
8. Day 10：跑真实任务，修复与打磨

## 13. 当前实现映射（Repo）
已落地的 MVP 关键路径（供开发快速定位）：
- Marketplace MVP 页面：`app/mvp/page.tsx`
- 存储层（本地 JSON；Vercel 写 /tmp）：`app/lib/store.ts`
- 任务 API：`app/api/tasks/route.ts`
- 步骤 API：
  - AI：`app/api/tasks/[id]/ai/route.ts`
  - 派人：`app/api/tasks/[id]/human/route.ts`
  - 证据：`app/api/tasks/[id]/evidence/route.ts`
  - 验证：`app/api/tasks/[id]/verify/route.ts`
  - 结算：`app/api/tasks/[id]/settle/route.ts`

---

## 14. 待决策（会影响下一步实现）
1. MVP 第一个场景（建议只选 1 个）
2. AI 执行：固定模板 vs 自由执行
3. 人类池：开放注册 vs 运营录入
4. 证据：只文本/链接 vs 支持图片上传
5. 结算：链下 vs mock（推荐 mock + 账本）
