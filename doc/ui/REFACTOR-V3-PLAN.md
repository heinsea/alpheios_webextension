# Scholarly Glass v3 重建方案（不可变）

> **状态文档（动态）**：`REFACTOR-V3-PROGRESS.md`
> **过期文档（旧路线）**：`REFACTOR-PLAN.md` / `REFACTOR-PROGRESS.md`（用 in-place 改 popup.vue / panel-compact.vue / _alpheios.scss 的方式，已被本方案取代）

## 1. 背景

旧路线（PR1/PR2/PR3）在 fork 内直接改写 `popup.vue` / `panel-compact.vue` / `_alpheios.scss`，导致：

- v1 token 名（`--alpheios-color-vivid`）被 remap 到 v2 值（`#0e6b4f`），调用方仍按 v1 名调用，命名与含义脱节。
- 新旧 template 共存（`v-show="false"` 留下死代码 + 新 header 行）。
- `src/styles/alpheios-overrides.css` 是无法在组件内消化的兜底层。
- Vue 2 + 历史 mixin / Vuex store 耦合 → "按 mockup 重写" 实际变成"在旧组件里反复打补丁"。

**目标**：新建一组干净的目录，按 `doc/ui/mockups/*.html` 重写整套 UI；开发期与旧 UI 并行，稳定后切换；alpheios-core 内的 UI 改动也走新 package，不污染旧 `packages/components`。

最终产物：mockup 8 个静态原型在浏览器扩展内 1:1 落地（Popup 4 状态 + Drawer 7 个 tab + Toast）。

## 2. 设计决策

| 维度 | 决策 | 理由 |
|---|---|---|
| 代码放置 | webextension `src/ui-v3/` + fork `packages/components-v3/` | 新 package 便于多端复用；webextension 端只放胶水。两边都不动旧 `packages/components`。 |
| 技术栈 | Vue 3 + Vite + 纯 CSS 变量 | mockup 已用 token 体系，SFC `<style>` 直接平移；Vite 配置成本远低于 vue-loader+webpack。 |
| 数据层 | 第一阶段静态原型，第二阶段接现有 `appController.api` + Vuex store | 先打通基础设施，再接已有数据层，不重写。 |
| 入口切换 | 并行 + URL query 开关（`?alpheios=v3`） | 新版稳定前不影响旧版；可随时 A/B 对照。 |

## 3. 目录布局

### A. webextension（本仓库）

```
src/
├── content/
│   ├── content.js               ← 旧入口，保持不动
│   ├── content-safari.js        ← 旧 Safari 入口，保持不动
│   └── content-v3.js            ← 【新】v3 入口：detect ?alpheios=v3 → mount
├── ui-v3/                       ← 【新】v3 胶水层
│   ├── mount.js                 ← createApp + ShadowRoot mount
│   ├── shadow-host.js           ← ShadowRoot 与样式注入
│   ├── store/
│   │   ├── ui-store.js          ← surface/page/theme（Pinia 或 reactive）
│   │   └── lookup-adapter.js    ← Stage 4：桥接 appController.api
│   ├── fixtures/                ← 静态原型期假数据
│   │   ├── arma.json
│   │   └── empty-states.json
│   └── App.vue                  ← 顶层路由
├── manifest/
│   └── manifest.json            ← Stage 0 增加 content-v3.js 列入；Stage 5 切默认
└── ...
webpack.config.mjs               ← 新增 entry content-v3 + alias alpheios-components-v3
```

### B. fork（`../alpheios_alpheios-core`）

```
packages/
├── components/                  ← 旧 UI 包，归档不动
└── components-v3/               ← 【新】Scholarly Glass UI 库
    ├── package.json
    ├── vite.config.js
    ├── sandbox.html             ← Vite dev server 入口（开发期独立预览）
    ├── src/
    │   ├── index.js
    │   ├── tokens/{tokens.css, fonts.css}
    │   ├── primitives/          ← 9 个：Button/Toggle/Segmented/Chip/Slider/
    │   │                          StatCard/ElevatedCard/RecessedInput/FrostedGlass
    │   ├── surfaces/            ← 4 个：Popup/Drawer/Toolbar/Toast
    │   ├── pages/               ← 7 个：Lookup/Inflections/WordList/Resources/
    │   │                          Settings/Auth/Morph
    │   └── compositions/        ← Stage 4：useLookup / useInflections / useWordList
    └── dist/                    ← Vite 产出
lerna.json                       ← 注册新 package
```

## 4. 阶段拆分（每阶段独立可验证；进度见 PROGRESS.md）

| Stage | 范围 | 预估 | 验收 |
|---|---|---|---|
| 0 · 基础设施 | components-v3 骨架 + content-v3.js + webpack/manifest 接入 | 半天 | `?alpheios=v3` 看到占位 mount log；旧版无 query 时不变 |
| 1 · Token + Primitives | tokens.css/fonts.css + 9 个 primitive + sandbox.html | 1 天 | sandbox 视觉与 mockup 1:1 |
| 2 · 4 Surfaces + Lookup | Popup/Drawer/Toolbar/Toast + LookupPage | 2 天 | 扩展内看到 Drawer + Lookup 页 |
| 3 · 剩余 6 页 | Inflections/WordList/Resources/Settings/Auth/Morph | 2 天 | sidebar 7 tab 全部可切 |
| 4 · 接数据层 | content-v3 注册数据 module + compositions 桥接 Vuex | 2 天 | 新旧 UI 数据一致 |
| 5 · 切换默认 | manifest 切默认 + 清理 overrides.css + 归档旧 components | 半天 | 仅在 Stage 4 通过且用户确认后执行 |

## 5. 关键引用文件

| 任务 | 文件 |
|---|---|
| webpack 入口与 alias | `webpack.config.mjs` line 64-93 |
| 旧 content 入口（参考 module 注册） | `src/content/content.js` line 120-135 |
| manifest content_scripts | `src/manifest/manifest.json` |
| mockup 视觉源 | `doc/ui/mockups/{popup-states,drawer-*}.html` |
| token 与组件规范 | `doc/ui/DESIGN.md` §3 / §4 / §6 / §7 |
| fork lerna 配置 | `../alpheios_alpheios-core/lerna.json` |

## 6. 验证流程

```bash
# fork
cd ../alpheios_alpheios-core/packages/components-v3
npm run build      # vite build → dist/

# webextension
cd ../../alpheios_webextension
npm run build-dev

# Chrome
# 1) chrome://extensions → 加载已解包扩展 dist/
# 2) 任意页面正常激活 → 旧 UI（控制组）
# 3) 任意页面 ?alpheios=v3 → 新 UI
# 4) 移除 query → 旧 UI 不受影响
```

## 7. 风险与对冲

| 风险 | 对冲 |
|---|---|
| Vue 3 与 alpheios-core 内部 Vue 2 store 互访 | 用 `watch` 单向桥接 + 命令式调 `api.*`；不共享反应式对象 |
| Shadow DOM 内 backdrop-filter 失效 | `@supports not (...)` 兜底纯白 0.92 alpha |
| Material Symbols CDN 受限 | self-host 字体到 `dist/support/fonts/` + `local()` 回退 |
| 双版本同时 mount | content-v3 命中 query 时 `appController.deactivate()` 旧实例；不命中时 v3 直接 return |
| webextension webpack 缺 vue-loader | components-v3 在 fork 内独立 Vite 构建为已编译 ESM/UMD；webpack 只 import 编译产物 |
| 旧 update-styles 拷的 CSS 与新 token 冲突 | content-v3 注入 ShadowRoot 内，与 light DOM 天然隔离 |

## 8. 不做（明确排除）

- 不改旧 `packages/components` 任何文件 — 该包按现状归档。
- 不改 `src/styles/alpheios-overrides.css` — 留作旧版兜底。
- 不重写 alpheios-core 数据包（client-adapters / inflection-tables / wordlist / l10n / data-models / res-client）。
- 不实现 Popup → Drawer 几何变形动画（DESIGN §5）。
- 不做 dark theme 切换 UI（token 预留，UI 在 Stage 5 之后）。
- 不重做 i18n（继续走 alpheios-core `l10n` API）。

## 9. 会话续作协议

任何会话中断后续作步骤：

1. 读本文件了解整体方案（不可变）。
2. 读 `REFACTOR-V3-PROGRESS.md` 找到最近一个 `[~]` 或第一个 `[ ]`，从那里继续。
3. 读 `doc/ui/DESIGN.md` 与对应 `mockups/*.html` 获取视觉规范。
4. **不要回头去改旧路线的文件**（`REFACTOR-PROGRESS.md` 标记的 PR1-3 文件）。
