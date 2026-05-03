# Documentation Index

The `doc/` tree is organized by purpose so that contributors and reviewers
can find the right page without scanning the full list.

## guides/ — 日常操作指南

执行性文档，描述当前生效的开发与构建流程。

| 文件 | 用途 |
|---|---|
| [`guides/DEVELOPMENT.md`](guides/DEVELOPMENT.md) | 开发者笔记：初始化序列、状态机、WebExtension ID、消息约定等 |
| [`guides/BUILD-FF-CHROME.md`](guides/BUILD-FF-CHROME.md) | Chrome / Firefox 构建步骤（MV3、Firefox 115+） |
| [`guides/BUILD-SAFARI.md`](guides/BUILD-SAFARI.md) | Safari App Extension 构建步骤（XCode） |

## testing/ — 测试与烟测

提交合并前需要执行的测试步骤。

| 文件 | 用途 |
|---|---|
| [`testing/P0-SMOKE-STEPS.md`](testing/P0-SMOKE-STEPS.md) | P0 基础烟测（3-5 分钟，Chrome） |
| [`testing/P1-AUTH-SMOKE-STEPS.md`](testing/P1-AUTH-SMOKE-STEPS.md) | P1 认证烟测（Auth0 真实凭据 / TEST_ID 模式） |

## migration/ — 迁移过程文档（活动中）

记录 V2 → MV3 迁移的进度、决策与未决项。迁移收尾后这部分可整体归档。

| 文件 | 用途 |
|---|---|
| [`migration/MIGRATION-CHECKLIST.md`](migration/MIGRATION-CHECKLIST.md) | P0/P1/P2/P3 迁移清单与逐项备注 |
| [`migration/PENDING-DECISIONS.md`](migration/PENDING-DECISIONS.md) | 跨浏览器策略 / 工具链 / MV2 兜底三项决策矩阵（2026-05-03 已决议 A/A/A）|

## archive/ — 历史与参考（不再维护）

仅作背景参考，不应按其执行——很多内容已过时或针对其他仓库。

| 文件 | 用途 |
|---|---|
| [`archive/alpheios-webextension-目前v2和v3版本的对比.md`](archive/alpheios-webextension-目前v2和v3版本的对比.md) | 本仓库与上游 `webextension-manifest-v3` 仓库的对比，用于早期迁移路线选择 |
| [`archive/alpheios问题.md`](archive/alpheios问题.md) | 上游 V2 仓库 38 个 open issue 的归类分析 |

---

## 维护约定

- 新增"日常操作指南"放 `guides/`
- 新增"测试步骤"放 `testing/`
- 迁移收尾完成（Auth0 P1 通过、4.0.0 RC 发布）后，可把 `migration/` 内容整体移入 `archive/`
- 不再维护或仅作历史参考的文档统一放 `archive/`
