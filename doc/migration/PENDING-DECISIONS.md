# 待决策方案备忘

> **2026-05-03 更新**：以下三项决策均已做出，结果为 **A / A / A**——
> 单一 MV3 manifest、保持 Webpack 工具链、保留 MV2 兜底分支。
> 各章节顶部已标注【已决策】并记录落地变更，原始对比矩阵保留作历史依据。
>
> 本文档列出 MV3 迁移收尾阶段需要拍板的策略性问题。
> 每个问题给出可选方案、对比、推荐和"决策后的执行清单"，以便决定后能直接落地。

---

## 决策 1：跨浏览器打包策略（MIGRATION-CHECKLIST P1 第 2 项）

**【已决策 — 2026-05-03 — 选择方案 A】**

落地状态：
- ✅ `src/manifest/manifest.json` 已带 `browser_specific_settings.gecko.id` 与 `strict_min_version: "115.0"`
- ✅ `../guides/BUILD-FF-CHROME.md` 已声明 Firefox 115+ 为最低支持版本，单一 `dist.zip` 投递两侧 store
- ✅ `./MIGRATION-CHECKLIST.md` P1 章节已勾选并备注决策
- ⏳ Firefox 115+ 真机一致性测试待用户执行（参考 `../testing/P0-SMOKE-STEPS.md` 步骤）
- ⏳ `release.yml` 自动投递 Chrome WebStore / AMO 的脚本——非阻塞，留待后续

### 背景

当前 `src/manifest/manifest.json` 是 MV3，并已通过 `browser_specific_settings.gecko.id`
让 Firefox 临时安装能用 `storage.local/storage.sync`。但仍未决定**长期发布**怎么处理：

- Chrome：MV3 是唯一选择（自 2024 年起 MV2 在稳定版下架）。
- Firefox：从 FF 115 开始支持 MV3，但 service worker 实现差异较大；FF 仍支持 MV2 直至宣布弃用。
- Safari：通过 `safari-app-extension/` 走 Safari Web Extension（实质上仍是 MV2 风格的桥接）。

### 候选方案

| 维度 | 方案 A：单一 MV3 manifest | 方案 B：Chrome MV3 + Firefox 拆分 | 方案 C：放弃 Safari，简化范围 |
|---|---|---|---|
| `manifest.json` 数量 | 1 份 | 2 份（Chrome / Firefox） | 1～2 份，但不再发布 Safari |
| 构建产物目录 | `dist/` | `dist-chrome/` + `dist-firefox/` | `dist/` |
| Firefox 适配工作 | 需要在 FF 115+ 上验证 service worker | 可保留 MV2 兼容字段（`background.scripts`、`browser_action` 等） | 与方案 A/B 二选一 |
| Safari 适配 | 仍走 `safari-app-extension/` 现有流程 | 同左 | 完全移除 |
| 发布复杂度 | 低 | 中（需打两包） | 低 |
| 兼容范围 | 现代 Chrome + 现代 Firefox | 现代 Chrome + 全部受支持 Firefox | 仅 Chrome/Firefox |
| 风险 | 老 Firefox 用户被切断 | 维护两份 manifest 的同步成本 | 失去 macOS Safari 用户 |

### 推荐：方案 A（单一 MV3 manifest），暂不放弃 Safari

理由：
1. 当前 `manifest.json` 已经是 MV3 且已加 gecko ID，方案 A 改动最小。
2. Firefox 115 已是 ESR，主流用户都能升到这条线之上。
3. Safari 现状是独立 Xcode 工程，不直接读 `manifest.json`，不会被本决策影响。
4. 方案 B 的"维护两份 manifest"在 alpheios 这种小团队中长期会变成隐患（这正是 V2 时代被 Mozilla 打回的原因之一，参见 issue #325）。

### 决策后的执行清单（如果选 A）

- [ ] 在 `dist.zip` 发布脚本里增加 Firefox 115+ 的最低要求声明
- [ ] 在 GitHub Actions release 流程中，将同一份 `dist.zip` 同时投递到 Chrome WebStore 与 Mozilla AMO
- [ ] 在 `../guides/BUILD-FF-CHROME.md` 中明确"现仅支持 Firefox 115+"
- [ ] 把 `./MIGRATION-CHECKLIST.md` P1 跨浏览器方案的相应条目打勾

### 决策后的执行清单（如果选 B）

- [ ] 在 `src/manifest/` 下拆出 `manifest.chrome.json` / `manifest.firefox.json`
- [ ] 修改 `update-dist` npm 脚本，按 `BROWSER` 环境变量选择 manifest
- [ ] 新增 `build-dev:chrome` / `build-dev:firefox` 两个脚本
- [ ] `verify_p0.mjs` 增加 BROWSER 维度参数
- [ ] 在 GitHub Actions 中分别生成两份 zip

### 决策后的执行清单（如果选 C）

- [ ] 删除 `src/safari-app-extension/`、`src/content/content-safari.js`、`src/env/env-safari-app-ext-template.js`
- [ ] 移除 `package.json` 中 `build-safari` / `build-safari-dev` 脚本
- [ ] 移除 `../guides/BUILD-SAFARI.md`，在 `../../README.md` 中明确不再支持
- [ ] 然后再叠加方案 A 或 B

---

## 决策 2：构建工具链是否升级到 Vite

**【已决策 — 2026-05-03 — 选择方案 A：保持现状】**

落地状态：
- ✅ 不动 `package.json` 与 webpack 配置
- ✅ `./MIGRATION-CHECKLIST.md` P2「构建与依赖现代化」备注已记录"工具链升级延后到下一大版本"
- ✅ `../guides/BUILD-FF-CHROME.md` 已注明 webpack + alpheios-node-build 仍是发布管线
- 后续触发条件：当 Auth0 P1 通过、且团队准备发布 4.x 大版本时，再考虑分阶段升级（路线 C，见下文执行清单）

### 背景

对比文档（[`../archive/alpheios-webextension-目前v2和v3版本的对比.md`](../archive/alpheios-webextension-目前v2和v3版本的对比.md)）描述的"V3 用 Vite"
指的是另一个 [`webextension-manifest-v3`](https://github.com/alpheios-project/webextension-manifest-v3)
仓库——本仓库**没有**强制需要换 Vite。

但当前工具链确实老旧：
- Webpack 5.4（最新 5.97+）
- `@babel/*` 7.12（最新 7.26+）
- 使用 `--openssl-legacy-provider --experimental-modules` 才能在 Node 18+ 上跑
- `alpheios-node-build` 是私有 git 包，进一步锁住了升级路径

### 候选方案

| 维度 | 方案 A：保持 Webpack | 方案 B：换 Vite | 方案 C：分阶段升级 Webpack |
|---|---|---|---|
| 改动范围 | 0 | 重写 `config.mjs` + 所有 babel/webpack 配置 + 重设 alpheios-core 的解析 | `package.json` 升级 webpack 5/babel 7，改 npm scripts |
| 短期收益 | 无 | 构建快、配置简单、原生 ESM | 摆脱 `--openssl-legacy-provider` 依赖 |
| 长期成本 | 持续承受老依赖告警 | 初期 1～2 周适配，之后维护成本最低 | 中等，但不能根除老 webpack 生态问题 |
| 与 alpheios-core 兼容 | 已经能用 | 需验证 alpheios-core 的 dist 能否被 Vite 直接吃 | 已经能用 |
| 风险 | 低 | 高（service worker 打包细节、热更新、Vue SFC 处理都要重做） | 中（webpack 5.97 对 ESM 行为有变更） |
| 对 P0 烟测的影响 | 0 | 需要全部重测 | 需要 P0 复测 |

### 推荐：方案 A 现状不动，等 P1 认证打通后再考虑方案 C

理由：
1. **优先级低于功能项**：当前阻塞用户的是 Auth0 P1，而不是构建速度。
2. **风险/收益不对称**：换 Vite 意味着所有 P0/P1 都要重测，但用户感知不到差异。
3. **`alpheios-node-build` 锁链**：这个 alpheios 私有构建脚手架被 webpack 紧密耦合，先换它再考虑换 Vite 才是正路。
4. 方案 C 是"无痛改良"，可以等 P1 完成后插入；方案 B 是"要改一次性改完"，建议放到 4.0.0 版本号那一波。

### 决策后的执行清单（如果选 A）

无须任何工作，但建议在 `./MIGRATION-CHECKLIST.md` P3 章节加一行说明"工具链升级延后到下一大版本"。

### 决策后的执行清单（如果选 C）

- [ ] 把 webpack 升到 5.97+，babel 升到 7.26+
- [ ] 移除 `--openssl-legacy-provider --experimental-modules` 标志
- [ ] 把 Node 引擎要求改为 `>= 20.0.0`
- [ ] 重跑 `verify:p0` + `verify:worker-safe` + 所有单测
- [ ] 在 PR 描述里列出包升级清单

### 决策后的执行清单（如果选 B）

- [ ] 创建 `vite.config.js`（content）与 `vite.config.background.js`（service worker）
- [ ] 引入 `@crxjs/vite-plugin` 作为 MV3 manifest 处理入口
- [ ] 重写 `npm run build-dev` / `npm run prod` 为 vite 命令
- [ ] 验证 Vue SFC 仍能正常打包（alpheios-core 的 components 是 Vue 2）
- [ ] 重新做完整 P0 烟测
- [ ] 重新打 Safari 包，确认 dist 兼容

---

## 决策 3：MV2 死代码块是否进一步清理

**【已决策 — 2026-05-03 — 选择方案 A：保留全部】**

落地状态：
- ✅ `src/lib/browser.js` 浏览器特性检测保留
- ✅ `src/background/background.js` 的 `globalThis.browser = require('webextension-polyfill')` 兜底保留
- ✅ `src/compatibility-fixes/` 目录及其 `compatibility-fixes.js` 保留
- 已清理的 MV2 死分支（不在本决策范围）：`browser.action || browser.browserAction`、`browser.tabs.executeScript/insertCSS` 的回退——这些在 MV3 manifest 下永不可达，已在 2026-05-03 的 P2 清理批次中移除

### 背景

本次（2026-05-03）已清理 MV3 下永不可达的 `browser.tabs.executeScript`/`insertCSS` 回退、
`browser.action || browser.browserAction` 的回退。**仍存活**的"看起来可疑"代码：

- `src/lib/browser.js`：浏览器特性检测，包含对 `browser` 命名空间的存在判断
- `src/background/background.js`：仍在尝试 `globalThis.browser = require('webextension-polyfill')` 的回退
- `src/compatibility-fixes/`：内含历史浏览器兼容补丁

### 候选方案

| 方案 | 描述 | 风险 |
|---|---|---|
| A. 保留全部 | 当前状态，给老 Firefox/罕见环境留兜底 | 0；只是代码冗长 |
| B. 删除 polyfill 回退、保留特性检测 | 假设构建链已正确 polyfill `browser` | 中：FF 老版本可能崩 |
| C. 全部删除，强制依赖 webextension-polyfill 包打包 | 最小化代码 | 中：失去诊断 hook |

### 推荐：方案 A

理由：成本是 ~30 行代码，收益是 0；保留更安全。

---

## 提交决策的方式

~~直接回复"决策 1 选 A"、"决策 2 选 A"、"决策 3 选 A" 即可，我会按对应执行清单
继续推进。也可以告诉我"先把 Auth0 P1 之外的全部按推荐执行"，我会按 A/A/A 推进。~~

**2026-05-03**：用户已确认 A / A / A。各章节顶部的「已决策」段落记录了落地状态。
本节保留作历史背景。
