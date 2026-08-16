# 独立盲评员操作包

配套：`ratings/rater-invitation.md`（邀请语）、`rating-rubric.md`（评分规则）、`mock-review-form.md`（练习表）。

## 角色

盲评员只看到：盲化任务请求、proof policy、隐私裁剪的证据包。看不到：系统最终判定、结算结果、mutation 标签、其他评分、作者预期。

## 校准流程（第一次评分前必须完成）

1. 通读 `rating-rubric.md`；
2. 用 `mock-review-form.md` 完成 2–3 题练习，和作者对答案；
3. 分歧大于 1 档的，重新校准后再评分。

## 每个案例做什么

1. 从盲化包取一个 case（`npm run research:jove:blind` 生成）；
2. 按 rubric 判三件事：证据是否支持请求结果（supported / unsupported / insufficient to decide）、证据缺陷类别、是否存在不必要隐私披露；
3. 填理由 + 置信度；
4. 写入 `ratings/pilot-rating-sheet.csv`（pilot）或评审脚本要求的 jsonl；
5. 不讨论、不改已提交的评分；分歧由作者裁决，**原始评分保留**。

## 质量门

- pilot：每 case 2 名独立评分，Krippendorff α ≥ 0.67 才进入 G3；
- G3：每 bundle 3 名盲评；
- 分歧裁决：`ratings/adjudication-sheet.csv` 记录，不删除原始评分。

## 运行验证

```bash
npm run research:jove:ratings-validate   # 结构校验
npm run research:jove:ratings-summary    # 一致性汇总（合成 rehearsal 已验证通过）
```
