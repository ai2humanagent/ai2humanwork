# JOVE-Core 工具链验证记录（2026-08-16）

G1 冻结完成后、G2 真人采集开始前，对全部数据无关工具链做的一次完整验证。全部命令在冻结 commit `9417ffc` 之后运行（冻结记录 `analysis-freeze.json` 已钉住）。

## 结果

| 检查 | 结果 |
|---|---|
| 单元测试 `research:jove:test` | ✅ 19 pass / 0 fail |
| 完整 synthetic rehearsal（generate → blind audit → rating validation → rating summary） | ✅ 通过（2 cases / 4 ratings，合成 κ=1） |
| Synthetic 隔离审计 `synthetic-audit` | ✅ 通过 |
| 分组泄漏检查 `leakage` | ✅ 30 base cases 无泄漏 |
| Mutation 泄漏审计 `mutation-leakage` | ✅ 240 records 通过 |
| 冻结评分 `score`（合成数据） | ✅ 1440 outputs / 6 systems / matched coverage 0.7 |
| 冻结验证 `freeze-verify` | ✅ verified: true（commit `9417ffc`） |
| `preflight-submission` | ⚠️ 2 项未过，均为预期：`latex_main-v5`（本机 locale 问题，见下）、`submission_gate`（confirmatory 数据未到位） |
| `bootstrap-primary`（合成数据） | ⚠️ 不适用：合成 outputs 使用 B0–B1/V1–V4 系统编号，主对比需要预注册的 K-Full vs J1-IM 命名；该脚本冻结，须在 confirmatory 数据上运行 |

## LaTeX 说明

`main-v5.tex` 在本机默认 locale（C.UTF-8）下 latexmk 崩溃是环境问题，非文档问题。设置 locale 后编译通过并产出 PDF：

```bash
cd docs/jove-core/paper
LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8 latexmk -pdf -interaction=nonstopmode -halt-on-error main-v5.tex
```

## 结论

盲评 / 评分 / 泄漏 / 打包流水线在真实数据进入前全部就绪；下一步唯一阻塞是 G2 真人知情同意采集。
