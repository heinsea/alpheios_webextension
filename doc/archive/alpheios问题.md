alpheios-project/webextension 关键 issues 归类分析及修复切入建议（2026/4）

以下是对 alpheios-project/webextension 项目全部 open issues 的归类分析，共 30 条（项目总计 38 个 open issues），按优先级和修复可行性排列：

---

## 🔴 类别一：Manifest V3 迁移（最高优先级）

这是目前**最核心、最紧迫**的问题，直接关系到扩展能否在 Chrome 上继续使用。

| # | Issue | 状态 |
|---|-------|------|
| [#353](https://github.com/alpheios-project/webextension/issues/353) | **Extension deprecated in Chrome**（2025年6月）| ⚠️ 紧急 |
| [#324](https://github.com/alpheios-project/webextension/issues/324) | upgrade to Manifest V3 (Chrome and FF) | 已讨论 |
| [#271](https://github.com/alpheios-project/webextension/issues/271) | prepare for Chrome switch from background scripts to service workers | 早期预警 |
| [#270](https://github.com/alpheios-project/webextension/issues/270) | verify upcoming CSP/Manifest v3 changes | Firefox相关 |
| [#356](https://github.com/alpheios-project/webextension/pull/356) | **PR: Fix to work with manifest 3**（2025年11月）| 🟡 有PR但未合并 |

> **修复可行性：⭐⭐⭐⭐⭐**
> PR #356 已经有人提交了 Manifest V3 修复，这是**最值得关注的切入点**。可以先 review 该 PR，帮助推进合并，或者基于它继续完善。主要工作：将 `background scripts` 改为 `service worker`，更新 `manifest.json` 结构，处理 CSP 限制。

---

## 🟠 类别二：词法数据加载性能问题

| # | Issue | 说明 |
|---|-------|------|
| [#352](https://github.com/alpheios-project/webextension/issues/352) | Lexical data loading takes a long time（2023年）| 无人处理 |
| [#349](https://github.com/alpheios-project/webextension/issues/349) | quaedam: lexical data is loading takes for ever（2021年）| bug标签 |

> **修复可行性：⭐⭐⭐**
> 属于性能优化，需要深入了解词法数据加载流程（可能涉及 IndexedDB / 网络请求）。适合有一定项目背景的贡献者。

---

## 🟠 类别三：Safari 相关问题

| # | Issue | 说明 |
|---|-------|------|
| [#268](https://github.com/alpheios-project/webextension/issues/268) | crashes on Safari（2019年，12条评论）| 用户反馈多 |
| [#309](https://github.com/alpheios-project/webextension/issues/309) | conflicts between webextension styles and embedded lib styles in Safari | 样式冲突 |
| [#319](https://github.com/alpheios-project/webextension/issues/319) | Fix Safari App Extension Toolbar Icon | UI问题 |
| [#300](https://github.com/alpheios-project/webextension/issues/300) | update Safari for Safari Web Extension architecture | 架构重构 |
| [#185](https://github.com/alpheios-project/webextension/issues/185) | Safari: Local files don't work with the extension | bug |
| [#180](https://github.com/alpheios-project/webextension/issues/180) | Safari: tools lose activate state after sleep mode | bug |

> **修复可行性：⭐⭐**
> 需要 macOS + Safari 开发环境，且部分问题与 Safari Web Extension 架构深度相关，门槛较高。

---

## 🟡 类别四：认证（Auth）问题

| # | Issue | 说明 |
|---|-------|------|
| [#344](https://github.com/alpheios-project/webextension/issues/344) | Authentication failed in Chrome（bug, chrome）| 无人处理 |
| [#323](https://github.com/alpheios-project/webextension/issues/323) | Fix error message in Chrome/PC（9条评论）| 已有讨论 |
| [#269](https://github.com/alpheios-project/webextension/issues/269) | login failed with authentication pop-up still on | auth标签 |
| [#213](https://github.com/alpheios-project/webextension/issues/213) | request and use refresh tokens to keep user session alive | enhancement |

> **修复可行性：⭐⭐⭐**
> 认证相关逻辑集中，#323 已有 9 条评论讨论，可以从中了解根本原因，适合有 OAuth/JWT 经验的贡献者。注意：#351 有 dependabot PR 升级 `jsonwebtoken` 到 9.0.0，与此相关，建议优先合并。

---

## 🟡 类别五：词法查询结果不一致

| # | Issue | 说明 |
|---|-------|------|
| [#354](https://github.com/alpheios-project/webextension/issues/354) | Spans block sections of words（2025年）| 新 bug |
| [#341](https://github.com/alpheios-project/webextension/issues/341) | Lexical query not found: different result in double-click vs wordlist | inconsistency |
| [#334](https://github.com/alpheios-project/webextension/issues/334) | lexical query produced no results from wordlist（10条评论）| 有详细讨论 |
| [#342](https://github.com/alpheios-project/webextension/issues/342) | Cannot browse grammars（24条评论！）| 高活跃度 |

> **修复可行性：⭐⭐⭐⭐**
> #342 有 24 条评论，是社区讨论最活跃的 issue，很可能有明确的复现步骤和根因线索。适合先阅读评论链找突破口。

---

## 🟢 类别六：工程/基础设施改进

| # | Issue | 说明 |
|---|-------|------|
| [#311](https://github.com/alpheios-project/webextension/issues/311) | update build instructions（doc + bug）| 文档 |
| [#301](https://github.com/alpheios-project/webextension/issues/301) | move support files out of the dist directory | 构建优化 |
| [#217](https://github.com/alpheios-project/webextension/issues/217) | clear storage upon uninstall | cleanup |
| [#184](https://github.com/alpheios-project/webextension/issues/184) | detect and react to user-specified host permissions | MV3相关 |
| [#272](https://github.com/alpheios-project/webextension/issues/272) | test Alpheios extension on Windows Edge browser | 测试任务 |
| [#308](https://github.com/alpheios-project/webextension/issues/308) | test with FF Fission (iframe isolation) | Firefox |

> **修复可行性：⭐⭐⭐⭐⭐**
> #311（更新构建文档）和 #217（卸载时清除存储）这类任务最适合新贡献者入手，改动范围小、影响可控。

---

## 🔵 类别七：功能增强（Enhancement）

| # | Issue | 说明 |
|---|-------|------|
| [#161](https://github.com/alpheios-project/webextension/issues/161) | implement toolbar icon context menu（deferred）| 已延期 |
| [#157](https://github.com/alpheios-project/webextension/issues/157) | need android offline app | 超出扩展范围 |

> **修复可行性：⭐⭐**
> 这类 enhancement 大多被标记为 deferred 或超出当前架构范围，暂不推荐优先处理。

---

## ✅ 推荐行动路径

```
入门级  → #311 更新构建文档  |  #217 卸载清除存储
中级    → #342/#334 词法查询 bug（评论多、有线索）
高优先  → #356 PR Manifest V3 fix（已有代码，帮助 review/合并）
战略级  → #324/#353 完整 MV3 迁移（项目存活的关键）
```

如果你对某个类别感兴趣，可以告诉我，我可以进一步帮你深入分析具体的代码位置或修复思路！