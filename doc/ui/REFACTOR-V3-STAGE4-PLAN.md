# Stage 4 详细执行计划（不可变）

> 配套动态文档：`REFACTOR-V3-PROGRESS.md`（每完成一项打勾）
> 上层方案：`REFACTOR-V3-PLAN.md`（不变）
>
> **会话续作协议**：任何会话中断后，下一次会话先读本文 + PROGRESS.md 找到当前 sub-stage，从 `[~]` 或第一个 `[ ]` 续作。**不要回头改已 `[x]` 的项**。

## 0. 上下文（API 速查 — Stage 4 决策依据）

| 类型 | 文件 / 入口 | 用法摘要 |
|---|---|---|
| AppController 类 | `alpheios_alpheios-core/packages/components/src/lib/controllers/app-controller.js` | `AppController.create(state, options)` 静态方法。`create()` 内部已注册 L10nModule + LexisModule，并订阅 LexicalQuery / ResourceQuery / SelectionController 事件。消费者只需补 AuthModule + UI 模块。 |
| Vuex store | `appController._store`（无公开 getter，underscore 直接访问） | Vuex 3。`namespaced: true`。读用 `store.state.app.targetWord`；订阅用 `store.watch((s) => s.app.targetWord, cb)`。 |
| 触发查词 | `api.app.newLexicalRequest(targetWord, languageID, data, source)` | `languageID` 是 Symbol（不是 code）；`source` 来自 `LexicalQuery.sources.PAGE / WORDLIST / ...`。 |
| 当前查询结果 | Vuex `app.homonymDataReady` / `morphDataReady` / `linkedFeatures` / `providers` / `wordUsageExamplesReady` / `hasInflData`；`api.app.homonym`（getter） | `api.app.homonym.lexemes` 是 Lexeme[]；每个 Lexeme 有 `.lemma`、`.inflections`、`.meaning.shortDefs`、`.meaning.fullDefs`。 |
| Lookup 状态 | Vuex `app.lexicalRequest.{startTime,endTime,source,outcome}` | getter `lexicalRequestInProgress = startTime > endTime`。 |
| Settings | `api.settings.getUiOptions()` / `getFeatureOptions()` / `getResourceOptions()` 返回 Options 对象，`.items.<key>.currentValue` 读，`.uiOptionChange(name, value)` 写。 | 写后 store mutation `settings/incrementUiResetCounter` 等触发 UI 重画。 |
| Wordlist | `api.app.getWordList(languageID)` / `getAllWordLists()` / `selectWordItem()` / `removeWordListItem()` / `removeWordList()` | 全部委托 `_wordlistC`。Vuex `app.hasWordListsData` + `wordListUpdateTime` 通知更新。 |
| Inflections | `api.app.getInflectionsViewSet()` / `getInflectionViews(partOfSpeech)` | 返回 InflectionsView[]，需调 `.render()` 拿 HTML 表（v2 风格），或读结构化数据自行渲染。 |
| Auth | `api.auth.authenticate()` / `logout()` / `session()` / `getProfile()` —— Promise<AuthData>。Vuex `auth.isAuthenticated` 反应式。 | AuthModule 由 v3 content-v3.js 注册（构造 `BgAuthenticator(messagingService)`）。 |

## 1. Stage 4a · 基础设施 ✅ DONE 2026-05-05

见 PROGRESS.md。验收点：扩展内 `?alpheios=v3` console 应见两条 `[alpheios-v3]` log，无报错。

## 2. Stage 4b · useLookup + LookupPage 接通

**目标**：用户在浏览器内选词后，v3 LookupPage 实时显示真实词条数据。

### 文件清单
- `packages/components-v3/src/composables/use-lookup.js` — 新建。读取 Vuex `app.targetWord/homonymDataReady/morphDataReady/linkedFeatures/providers`、`api.app.homonym` 派生 LookupPage 所需的形如 `arma.json` 的 ref；缺失时返回 `null` ref（让 page 自己 fallback fixture）。
- `packages/components-v3/src/pages/LookupPage.vue` — 改为：`useAppController()` → 若有则 `useLookup()` 给 data；否则用 props.data fixture。模板与样式不动。
- `packages/components-v3/src/App.vue` — 仍按当前 fixture 路径喂 LookupPage；只是 LookupPage 内部如能从 store 拿到就盖过 props。
- `packages/components-v3/src/index.js` — export `useLookup`。

### 数据映射（fixture key → store/api 来源）
| fixture key | 来源 |
|---|---|
| `lemma` | `homonym.targetWord` 或 `lexemes[0].lemma.word` |
| `lang` | `AppController.getLanguageName(homonym.languageID).name` |
| `langCode` | 同上 `.code` |
| `selectedText` | `store.state.app.selectedText` |
| `recognized` | `homonymDataReady && lexemes.length > 0` |
| `pos[]` | 从 `lexemes[0].lemma.features` 投影：primary = part of speech，feature = 性/数/格 |
| `morph[]` | 每个 Lexeme → 一张卡片：`lemma.principalParts.join(', ')`、features、inflections 摘要 |
| `definitions[]` | `lexemes[0].meaning.shortDefs.map(d => d.text)` 或 fullDefs |
| `citation` | `homonym.context.shortText / source / link`（如有） |
| `principalParts[]` | 从 `lemma.features` + `principalParts` 派生 |
| `providers[]` | `store.state.app.providers` |

### 验收
1. 任意页面 `?alpheios=v3`，双击或选词 "arma" / "Romae" / 等。
2. v3 Drawer Lookup 页应自动刷新成所选词的真实词条（不是 fixture）。
3. 切换到任意未实现页（Inflections 等）仍显示原 fixture 不报错。

## 3. Stage 4c · 其余数据 page

### useInflections.js
- 读 Vuex `app.hasInflData`、`api.app.getInflectionsViewSet()` / `getInflectionViews(pos)`。
- InflectionsPage matched 模式：从 InflectionsView 中提取 columns + rows + matched cell 标记。
- InflectionsPage browser 模式：保持本地 picker（v3 自管），picker 完成后 dispatch 到 `api.app.getInflectionViews()` 拉对应范式。

### useWordList.js
- 读 `api.app.getAllWordLists()` 拉所有语言 → 渲染 group。
- watch Vuex `app.wordListUpdateTime` 触发重新拉取。
- context view → `api.app.selectWordItem()` 切到该词后展示其 `homonym.context` 历史（具体 API 待 4c 实做时再核 `_wordlistC`）。

### MorphPage / ResourcesPage（usage / grammar / tree）
- MorphPage 与 LookupPage 共用 useLookup 派生数据，只是把所有 reading 默认展开。
- ResourcesPage usage 模式接 `api.app.wordUsageExamples` + `wordUsageAuthors`，watch Vuex `app.wordUsageExamplesReady`。
- grammar 模式接 `api.app.grammarData` + `restoreGrammarIndex()`、watch `app.updatedGrammar`。
- tree 模式接 `api.app.startResourceQuery({ type: 'treebank', ... })` —— 4c 实做时再确认 ResourceQuery 的精确 API。

### 验收
- 选 "arma" 后切到 Inflections / Morph / Usage / Grammar 页，每页显示对应真实数据；切回 Lookup 不丢状态。

## 4. Stage 4d · Settings + Auth

### SettingsPage
- 启动时拉 `api.settings.getUiOptions().items` 等三组，构造 row dictionary。
- Toggle/Slider/Segmented 改动 → 调 `api.settings.uiOptionChange(name, value)` / `featureOptionChange` / `resourceOptionChange`。
- Save / Reset 操作：本地 dirty 缓存逻辑去掉，因为 alpheios-core options 是即时持久化的。**改而**：footer 显示 "Saved · just now" toast；`Reset` 调 `api.settings.resetAllOptions()`。
- 4 个 sub-tab：UI / Features / Resources / Advanced。
  - UI = uiOptions
  - Features = featureOptions
  - Resources = resourceOptions
  - Advanced = 一些 derived（log level 用 uiOptions.verboseMode；cache 用 IndexedDB 自查；about 直接读 `api.app.{name,version,libBuildName,buildBranch}` 等）。

### AuthPage
- `useAppController()` → `c.api.auth`。
- watch Vuex `auth.isAuthenticated`：true → 切到 logged-in；false → logged-out。
- CTA `Continue with Auth0` → `auth.authenticate()`。
- Logout → `auth.logout()`。
- profile / stats / activity / sessions：`auth.getProfile()` + `auth.getUserData()`（这后者已通过 BgAuthenticator 暴露）。
- demo 切换链接保留但置灰带 "real auth wired" 标签。

### 验收
1. Settings 切某个 toggle，关闭再打开 v3 panel，状态保持；同时旧 v2 也能看到改动（共用 ExtensionSyncStorage）。
2. Auth 点 CTA → Auth0 弹窗 → 登录 → v3 切换到 logged-in 视图，stats 显示真实数据。
3. Logout 后回到 logged-out。

## 5. 不做（明确排除 Stage 4）

- 不写新的查词逻辑 / lexicon 适配器 / inflection 表格生成 — 全部走既有 LexisModule。
- 不重构 wordlist / settings 持久化 — 用既有 storage adapter。
- 不实现 Treebank SVG 算法 — 4c 用 alpheios-core 现成的 treebank 数据，v3 渲染层只画。
- 不做 dark theme 的实际功能切换 — token 已就位，默认 light 即可。
- 不做 Popup 与 Drawer 之间的几何动画。

## 6. 关键风险与回退

| 风险 | 应对 |
|---|---|
| AppController 在某些站点（CSP 严格）init 失败 | content-v3.js 已 `try/catch`，失败时 `appController = null`，UI 仍显示 fixture（降级为 Stage 3 行为）。 |
| 新旧 storage 写冲突 | 都用 ExtensionSyncStorage，同一 backing store；最后写入胜出。Stage 4d 验收时切两版本看是否同步即可发现。 |
| Vue 2 组件（v2 UMD）与 Vue 3 同页面共存 | 硬互斥消除此风险（同页面只有一版）。 |
| Vuex 3 的 watch 在 store unregister 后泄漏 | content-v3.js beforeunload 已调 `appController.deactivate()`，且 watch 应在 page unmount 时调返回的 unwatch。每个 composable 用 `onScopeDispose(() => unwatch())`。 |

## 7. 验证命令

```bash
# fork 包构建
cd alpheios_alpheios-core/packages/components-v3 && npm run build

# webextension dev 构建
cd alpheios_webextension && npm run build-dev

# Chrome 加载 dist/ unpacked，访问任意页面 + ?alpheios=v3 测各 stage 验收点。
```

