# Scholarly Glass v3 重建进度（动态）

> **方案文档（不可变）**：`REFACTOR-V3-PLAN.md`
> 每完成一个文件 / 子任务，把对应行从 `[ ]` 改为 `[x]`，并在最右补一句"做了什么"。
> 一次只允许一个 `[~]`（in-progress）。
>
> 图例：`[ ]` 未开始 / `[~]` 进行中 / `[x]` 完成 / `[!]` 阻塞 / `[s]` 跳过

---

## Stage 0 · 基础设施（目标：`?alpheios=v3` 看到 mount log）

### Fork（`../alpheios_alpheios-core`）

- [x] `packages/components-v3/package.json` — name=alpheios-components-v3, vue3 + vite peers · 2026-05-04
- [x] `packages/components-v3/vite.config.js` — library mode（ESM + UMD），external: vue · 2026-05-04
- [x] `packages/components-v3/src/index.js` — 暂只 export MountPlaceholder · 2026-05-04
- [x] `packages/components-v3/src/MountPlaceholder.vue` — 玻璃浮层占位卡片 · 2026-05-04
- [x] `packages/components-v3/.gitignore` + `README.md` · 2026-05-04
- [s] `lerna.json` — 不需改：`packages: ["packages/*"]` 自动收 · 2026-05-04
- [x] `npm install && npm run build` 跑通，dist/components-v3.js (1.14 kB) + style.css (1.55 kB) · 2026-05-04

### Webextension（本仓库）

- [x] `package.json` — devDependencies 加 `vue@^3.4.0`（仅运行时；components-v3 用 alias 直链 fork dist）· 2026-05-04
- [x] `src/ui-v3/shadow-host.js` — host div + closed ShadowRoot + 注入 dist style（`?raw` 内联，无需 web_accessible_resources）· 2026-05-04
- [x] `src/ui-v3/mount.js` — createApp(App).mount(shadowRoot)，返回 dispose · 2026-05-04
- [s] `src/ui-v3/App.vue` — 移到 fork 包内（避免 webextension 引入 vue-loader）· 2026-05-04
- [x] `src/content/content-v3.js` — URL 二次校验 + 静态 import mount（单文件输出，无 chunk 拆分）· 2026-05-04
- [x] `webpack.config.mjs` — 增加 content-v3 entry + alias alpheios-components-v3 + vue runtime alias + `?raw` resource query + Vue 3 feature flags · 2026-05-04
- [x] `src/background/background-process.js` — `loadContentScript` 改 async，按 tab URL 选择注入 content.js 或 content-v3.js（`?alpheios=v3` gate）· 2026-05-04
- [s] `src/manifest/manifest.json` — 不需改：注入由 background scripting.executeScript 完成，不走 manifest content_scripts · 2026-05-04
- [x] `npm install vue --legacy-peer-deps` + `npm run build-dev` 通过 · 2026-05-04

### 验收

- [x] Build 产物：dist/content.js (13 MiB v2) + dist/content-v3.js (491 KiB v3) + background.js (143 KiB)，单文件无 chunk 拆分 · 2026-05-04
- [x] Chrome 加载 `dist/` unpacked → thelatinlibrary 页 `?alpheios=v3` 看到玻璃浮卡 + console `[alpheios-v3] mounting · build=ui.20260504647` log · 2026-05-04（用户验收）
- [x] 任意页无 query → 旧 UI 行为不变 · 2026-05-04（用户验收）

> 注：用户验收时看到的 Mixed Content 警告全部来自 thelatinlibrary.com 自身（http 资源引用），与扩展无关。

---

## Stage 1 · Token + Primitives（目标：sandbox 与 mockup 1:1）

- [x] `packages/components-v3/src/tokens/tokens.css` — :root 完整 light + [data-theme=dark] + 间距/圆角/动效 tokens · 2026-05-04
- [x] `packages/components-v3/src/tokens/fonts.css` — Inter / Lato / Material Symbols 通过 Google CDN，scope 通过 `.alpheios-v3-scope` 限制 · 2026-05-04
- [x] `packages/components-v3/src/primitives/Button.vue` — primary/secondary/ghost/icon/fab 5 variant + block + disabled · 2026-05-04
- [x] `packages/components-v3/src/primitives/Toggle.vue` — 32×18 pill + 14×14 thumb，原生 checkbox keyboardable · 2026-05-04
- [x] `packages/components-v3/src/primitives/Segmented.vue` — default/inline 两 size，role=tablist + aria-selected · 2026-05-04
- [x] `packages/components-v3/src/primitives/Chip.vue` — default/filled/tertiary/error 4 variant + clickable + active · 2026-05-04
- [x] `packages/components-v3/src/primitives/Slider.vue` — 4px 轨 + 14px 拇指 + 数字读出，跨浏览器 ::webkit/-moz · 2026-05-04
- [x] `packages/components-v3/src/primitives/StatCard.vue` — value + label，tabular-nums · 2026-05-04
- [x] `packages/components-v3/src/primitives/ElevatedCard.vue` — eyebrow / body / footer 三槽，accent stripe 选项 · 2026-05-04
- [x] `packages/components-v3/src/primitives/RecessedInput.vue` — icon prefix + clearable + suffix slot + Enter 事件 · 2026-05-04
- [x] `packages/components-v3/src/primitives/FrostedGlass.vue` — DESIGN §4.5 三层 box-shadow + tone (standard/low) + radius prop + 浏览器 fallback · 2026-05-04
- [x] `packages/components-v3/src/Sandbox.vue` + `sandbox-main.js` + `sandbox.html` — Vite dev server 入口，9 primitives 展示 + light/dark 切换 · 2026-05-04
- [x] `packages/components-v3/src/index.js` — 导出 9 primitives，CSS side-effect 顺序：tokens → fonts → 各组件 scoped styles · 2026-05-04
- [x] Build 验证：fork dist/style.css 19.66 kB + components-v3.js 10.84 kB；webextension 重建后无破坏 · 2026-05-04

---

## Stage 2 · 4 Surfaces + LookupPage（目标：扩展内看到 Drawer + Lookup）

- [x] `surfaces/Popup.vue` — 4 状态（default/loading/no-result/error）+ 玻璃箭头 + 缓存数据兜底（error 状态显示 cached 标签）· 2026-05-04
- [x] `surfaces/Drawer.vue` — 64 sidebar (brand + 7 main + 2 bottom tabs) + 380 panel (topbar + search slot + scroll + footer slot) · 2026-05-04
- [x] `surfaces/Toolbar.vue` — 44×44 FAB，点击 → uiStore.setSurface('drawer') · 2026-05-04
- [x] `surfaces/Toast.vue` — 玻璃通知卡 + 3px 左侧 stripe（success=tertiary / error=error / info=secondary）+ Vue `<Transition>` 渐入渐出 · 2026-05-04
- [x] `pages/LookupPage.vue` — 完整 lookup body：词卡 + POS tags + 形态卡（可折叠）+ 短定义 + 引用 + 主要部分 + providers · 2026-05-04
- [x] `store/ui-store.js` — reactive surface/page/popupState/theme + toast helper + URL override 解析（?surface=&state=&page=&theme=）· 2026-05-04
- [x] `fixtures/arma.json` + `empty-states.json` — Stage 4 之前的演示数据 · 2026-05-04
- [x] `App.vue` — 顶层 surface 路由 + 根据当前 page 决定 Drawer 的 search/footer 内容 · 2026-05-04
- [x] tokens.css 关键修复：`:host` 多选择器让 ShadowRoot 内 token 也生效（避免变量在 shadow scope 失效）· 2026-05-04
- [x] App.vue 关键修复：去掉 `documentElement.setAttribute('data-theme')`（避免污染宿主页主题系统）· 2026-05-04
- [x] Build：fork dist 42 KB style + 43 KB JS；webextension content-v3.js ~530 KiB · 2026-05-04
- [ ] **待用户操作**：扩展内 `?alpheios=v3` 看到完整 Drawer + Lookup arma 页
- [ ] **待用户操作**：URL 切换 `surface=popup` `state=loading|no-result|error` `theme=dark` 测各状态

---

## Stage 3 · 剩余 6 页（目标：sidebar 7 tab 全部可切）

- [x] `pages/InflectionsPage.vue` — 表 + Browser 两模式（drawer-inflections.html）· local mode toggle + Segmented(verb/noun, wide/narrow) + filter chips + 三步 picker · 2026-05-05
- [x] `pages/WordListPage.vue` — 分组 + 过滤 + 上下文（drawer-wordlist.html）· list/context 双 view + bulk select + 折叠展开分组 · 2026-05-05
- [x] `pages/ResourcesPage.vue` — Usage / Grammar / Treebank 三合一（drawer-resources.html）· `mode` prop（usage/grammar/tree）+ SVG dependency tree（节点/边由 fixture 派生）+ zoom 控件 · 2026-05-05
- [x] `pages/SettingsPage.vue` — UI/Features/Resources/Advanced 4 子 tab（drawer-settings.html）· top Segmented + reactive values + dirty 计数 + about/danger 块 · 2026-05-05
- [x] `pages/AuthPage.vue` — 未登录 / 已登录 两态（drawer-auth.html）· 三 feature CTA + StatCard×3 + activity/sessions 列表 · 2026-05-05
- [x] `pages/MorphPage.vue` — 形态完整页（无独立 mockup，扩展自 LookupPage 的 morph 卡片，所有 readings 默认展开 + principal parts + providers）· 2026-05-05
- [x] `fixtures/inflections.json` + `wordlist.json` + `resources.json` + `settings.json` + `auth.json` — Stage 3 静态数据 · 2026-05-05
- [x] `primitives/Icon.vue` — 新增 ~28 个 SVG 路径（chevron_left/right、arrow_back、first/last_page、filter_list/alt、sort、tune、checklist、drag_indicator、delete、cloud_sync、sync、history、logout、verified、smartphone、laptop_mac、download、print、open_in_new、link、help、fit_screen、file_upload/download）· 2026-05-05
- [x] `App.vue` — 9 个 page 全部路由（v-if 链）+ 每页独立 footer slot 内容 + langLabel 由 page 派生 + 独立 toast 触发 · 2026-05-05
- [x] `index.js` — 导出新 6 个 page 组件 · 2026-05-05
- [x] Build：fork dist/style.css 81 kB + components-v3.js 125 kB；webextension content-v3.js 760 KiB（vs Stage 2 530 KiB） · 2026-05-05
- [ ] **待用户操作**：扩展内 `?alpheios=v3&page=inflections|wordlist|usage|grammar|tree|opts|user|morph` 切每个 tab 视觉验收
- [ ] **待用户操作**：Settings 改 toggle/slider 看 footer dirty 计数；Auth 点 CTA 切到登录态；WordList 点词条进 context view

---

## Stage 4 · 接数据层（目标：新旧 UI 数据一致）

> **拆分**（2026-05-05 与用户对齐）：4a 基础设施 → 4b useLookup + LookupPage →
> 4c 其余数据 page → 4d Settings + Auth。**互斥策略**：硬互斥（已是当前
> 行为，background `loadContentScript` URL gate 选择注入 v2 或 v3，从不
> 共存于同一页）。

### Stage 4a · 基础设施（content-v3 起 AppController + 仅 AuthModule）

- [x] `composables/use-app-controller.js` — provide / inject helper，Symbol 键 `APP_CONTROLLER_KEY` + `useAppController()` + `useStore()`（Sandbox 上下文返回 null，pages 自动 fallback fixture） · 2026-05-05
- [x] `index.js` — 导出 composable 三件套 · 2026-05-05
- [x] `src/ui-v3/mount.js` — 接受 `appController` 参数，`app.provide(APP_CONTROLLER_KEY, appController)` 后再 mount · 2026-05-05
- [x] `src/content/content-v3.js` — 实例化 MessagingService + AppController；仅注册 AuthModule（PanelModule/PopupModule/ToolbarModule/ActionPanelModule 完全不注册，由 v3 UI 取代）；`init()` → 监听 `browser.runtime.onMessage`（让 BgAuthenticator 拿到回调）→ `activate()` → 把 controller 传给 mount() · 2026-05-05
- [x] 不注册 STATE_REQUEST 处理器 — icon-click 激活流是 v2-only，v3 通过 URL gate 自激活 · 2026-05-05
- [x] beforeunload 调 `appController.deactivate()` 与 `dispose()` 双清理 · 2026-05-05
- [x] Build 验证：fork dist 同上；webextension content-v3.js 760 KiB → 14 MiB（含 v2 UMD），与 content.js 体量相当 — 是接入 alpheios-core 数据层的必然代价 · 2026-05-05
- [x] 双版本互斥已是当前行为（background-process.js `loadContentScript` 按 URL 选 content.js / content-v3.js，从不共存）· 2026-05-05
- [ ] **待用户操作**：扩展内 `?alpheios=v3` 打开 console，应见 `[alpheios-v3] mounting` 与 `[alpheios-v3] AppController active · auth module ready` 两行 log，无报错；旧 v2 路径（无 query）继续正常

### Stage 4b · useLookup + LookupPage 接通数据

- [x] `composables/use-lookup.js` — watch Vuex `app.{homonymDataReady,shortDefUpdateTime,morphDataReady,targetWord,lexicalRequest}` → Vue 3 ref；返回 `{data,loading,error}`；`onScopeDispose` 清理 5 个 Vuex unwatch；Sandbox 上下文返回 inert null refs · 2026-05-05
- [x] `App.vue` — `useLookup()` + `lookupData` computed merge live 与 fixture（live 字段覆盖、空 fallback fixture）；LookupPage / MorphPage 都吃 `lookupData`；search slot 的语言 chip 也跟随 · 2026-05-05
- [x] Build：fork dist 81 kB style + 128 kB JS（vs 4a 125 kB，+3 kB composable）；webextension 同 14 MiB · 2026-05-05
- [ ] **待用户操作**：扩展内 `?alpheios=v3` 选 "arma" / "Romae" / "profugus" 等词，v3 Drawer Lookup 页应自动刷新成所选词的真实 lemma + 语言 + POS + 短定义；citation/principal parts/morph 行仍是 fixture（4c 接）

### Stage 4c · 其余数据 page

- [x] `composables/useInflections.js` — 读 Vuex `app.hasInflData` + `api.app.getInflectionsViewSet()` → render() → 提取 wideView.rows/columns/footnotes · 2026-05-05
- [x] `composables/useWordList.js` — 读 `api.app.getAllWordLists()` → groups + `selectWordItem()` → context view · 2026-05-05
- [x] InflectionsPage / WordListPage / MorphPage 接通 — App.vue 计算属性 merge live + fixture fallback；MorphPage 通过增强的 useLookup morph rows（从 Lexeme.inflections 提取 stem/suffix/features）· 2026-05-05
- [s] ResourcesPage usage/grammar/tree 实装 — tree 需 ResourceQuery API 确认；usage 已有 wordUsageExamples 数据路径但待后续 session 接线 · 2026-05-05

### Stage 4d · Settings + Auth

- [x] SettingsPage 接 `appController.api.settings.uiOptions / featureOptions` — OPTION_MAP 映射 fixture ID → 真实 option key；onMounted 从 API 读取当前值覆盖 reactive values；watch deep 即时调用 `uiOptionChange`/`featureOptionChange` 持久化；Reset 调 `resetAllOptions()` + 重新 populate · 2026-05-05
- [x] AuthPage 接 `auth.authenticate() / auth.logout()` — watch Vuex `auth.isAuthenticated` 控制登录态；CTA 调 `authenticate()`；profile 调 `getProfile()` 覆盖头像/邮箱/统计 · 2026-05-05

---

## Stage 5 · 切换默认 + 清理（待 Stage 4 通过且用户确认）

- [ ] `manifest.json` content_scripts 默认指向 content-v3.js（旧 content.js 留代码不删）
- [ ] 删除 `src/styles/alpheios-overrides.css`
- [ ] `packages/components/` 加归档说明
- [ ] 2 周稳定期后：删旧 content.js / 旧 components / overrides.css

---

## 会话日志（最新在顶）

### 2026-05-05 · session 3 — Stage 4c + 4d 完成 + Bug 修复（续 4a/4b）

**Bug 修复**（2 个）：
1. **搜索框 Enter 键无响应**：App.vue RecessedInput 缺少 `@enter` 处理器。添加 `onSearchEnter` 函数，调用 `controller.api.app.newLexicalRequest(value, languageID, null, 'lookup')`。
2. **Popup 显示硬编码 fixture 词**：`empty-states.json` 中 loading.lemma="Troiae"、noResult.lemma="xyzzy" 被 Popup.vue 的 targetWord 计算属性优先使用，盖过实际查词。修复：Popup.vue targetWord/targetLang 改为优先 data（live）再 fallback emptyStates（fixture）；noResult.desc 正则替换 fixture lemma 为真实词。

**Stage 4c**：
- `composables/use-wordlist.js` — 读 `api.app.getAllWordLists()` → 按 languageCode 分组 → groups；`selectWordItem()` 触发查词 → watch `homonymDataReady` 构建 contextData
- `composables/use-inflections.js` — 读 `api.app.getInflectionsViewSet()` → `view.render()` → 提取 wideView.rows/columns/footnotes → matchedData
- use-lookup.js 增强：从 Lexeme.inflections 提取 stem/suffix/prefix + 语法特征（case/number/gender/...）填充 morph rows
- App.vue：新增 `inflectionsData`/`wordlistData` 计算属性 merge live + fixture fallback
- WordListPage 新增 `@select-word` emit；InflectionsPage/MorphPage 通过新数据 props 接入

**Stage 4d**：
- SettingsPage：`OPTION_MAP` 映射 fixture ID → 真实 option key（fontSize→uiOptions.fontSize, modUsage→featureOptions.enableWordUsageExamples 等）；onMounted 从 API populate；watch deep 即时调 `uiOptionChange`/`featureOptionChange`；Reset → `resetAllOptions()` + 重新 populate
- AuthPage：watch Vuex `auth.isAuthenticated` 控制登录态；CTA → `authenticate()`；Logout → `logout()`；`getProfile()` 覆盖头像/邮箱/统计；demo switch 仅 Sandbox 显示
- App.vue Settings footer：controller 存在时显示 "Changes saved instantly"

**Build 验证**：fork dist 142 kB JS + 81 kB CSS（+17 kB from Stage 3）；webextension 13.8 MiB，编译通过。

### 2026-05-05 · session 2 — Stage 3 完成

**Stage 3**（待用户视觉验收）：
- 6 个新 page：Inflections / WordList / Resources（usage+grammar+tree 共用）/
  Settings / Auth / Morph。全部按 mockup 1:1 落地，每页 scoped CSS，
  内部 sub-state 由 ref 管理（mode/view/tab 等）。
- 5 个新 fixture（inflections/wordlist/resources/settings/auth.json），
  Stage 4 接真实 appController.api 时这些 JSON 会被换掉。
- Icon 字典从 ~25 个扩到 ~50 个（补 chevron_*/arrow_back/first_last_page/
  filter_*/sort/checklist/drag_indicator/cloud_sync/sync/history/logout/
  verified/smartphone/laptop_mac/download/print/open_in_new/link/help/
  fit_screen/file_upload/download）。所有路径 Heroicons 风格 stroke
  outline，与原有保持一致。
- App.vue 重写为 9 个 page 的 v-if 路由 + 每页独立 footer slot 内容；
  langLabel 由 page 名派生（Inflections / Word Usage / Treebank / …）。
- ResourcesPage 是单组件多模式：`mode` prop 控制 usage / grammar / tree
  三种渲染。Tree 子模式直接用 fixture 里的 nodes 数组生成 SVG（含 zoom
  控件 + 边自动从 parent 计算）。
- SettingsPage 关键设计：fixture 里的所有 row.value 启动时拷到 reactive
  `values` 字典，dirty 计数 = JSON.stringify 对比。footer 显示 N changes
  · unsaved / No changes。Reset 写回 initial 快照。
- AuthPage 用 demo 链接在两态间切换；Stage 4 会用 `auth.isAuthenticated()`
  替换。
- Build 验证通过：fork dist 81 kB style + 125 kB JS（vs Stage 2 42 kB
  style + 43 kB JS，主因为 6 page CSS + 28 个新 icon path）；webextension
  content-v3.js 760 KiB（vs Stage 2 530 KiB）。
- 待用户在扩展内逐 tab 验收（见 Stage 3 待操作清单）。

### 2026-05-04 · session 1 — Stage 0 + Stage 1 完成

**Stage 0**（已浏览器验收通过 · 用户在 thelatinlibrary.com 看到玻璃浮卡）：
- 见上一条记录。

**Stage 1**（待用户视觉验收）：
- 写完 9 个 primitive：Button / Toggle / Segmented / Chip / Slider /
  StatCard / ElevatedCard / RecessedInput / FrostedGlass。
- 完整 token 体系 light + dark + 间距/圆角/动效，统一通过 `.alpheios-v3-scope`
  类隔离，避免与宿主页 CSS 互染。
- Sandbox 演示页（`sandbox.html` + `Sandbox.vue`）跑 vite dev 即可全屏预览
  + 切换主题 + 调每个组件状态。
- fork dist/style.css 从 1.55 kB 长到 19.66 kB（合理：9 个组件 + token + 字体）。
- 待用户跑 `cd packages/components-v3 && npm run dev` 视觉验收。

### 2026-05-04 · session 1 — Stage 0 全部文件完成

- **Fork**：新建 `packages/components-v3/` 包（Vue 3 + Vite library mode）。
  导出 `App` + `MountPlaceholder`。Vite build 产出 dist/components-v3.js (1.24 kB)
  + style.css (1.55 kB)。lerna 自动收（不需改 lerna.json）。
- **Webextension**：
  - `webpack.config.mjs` 加 `content-v3` entry、alias `alpheios-components-v3$`
    直链 fork dist（绕开 npm install 的 file: 复制）、`vue$` 锁定 esm-bundler
    构建、`?raw` query 让 css 文件作为字符串导入、Vue 3 feature flags。
  - `src/ui-v3/{shadow-host,mount}.js` + `src/content/content-v3.js`：closed
    ShadowRoot 隔离 + 静态 import 单文件输出（content-v3.js 491 KiB）。
  - `src/background/background-process.js`：`loadContentScript` 改 async，按
    tab URL `?alpheios=v3` 选择注入 v2 或 v3，二者从不共存于同一页面。
  - `npm install vue@^3.4.0 --legacy-peer-deps`（项目原有 alpheios-node-build
    peer-dep 锁，需要 legacy 标志，与现有 README 一致）。
- 两边 build 都通过；旧 v2 路径完全不动。
- 待用户在浏览器内验收：访问任意 https 页 + `?alpheios=v3`，应看到右下角玻璃浮卡。

### 2026-05-04 · session 0 — 计划制定与持久化
- 与用户达成方案：webextension `src/ui-v3/` + fork `packages/components-v3/`，Vue 3 + Vite，先静态原型后接数据层，URL query `?alpheios=v3` 开关。
- 写入 `REFACTOR-V3-PLAN.md`（不可变）和本进度文件。
- 准备开始 Stage 0。
