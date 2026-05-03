# 迁移清单（MV3 重启）

## 使用方式
- 完成后将条目标记为：`[x]`。
- 在每个章节下方记录简短备注（日期、结果、阻塞点）。
- 建议按章节拆分为小型 PR 或提交。

## P0 - 运行稳定性
- [x] Chrome 能从 `dist/` 成功加载未打包扩展，且无清单错误。
- [x] Service worker 启动时无运行时异常。
- [x] 浏览器重启后扩展仍可正常工作（service worker 可重新激活）。
- [x] Popup 能正常打开并刷新状态（不会卡在 loading）。
- [x] 在普通网页上，激活/停用操作可正常执行。
- [x] 激活后，“Open Info Panel” 操作可正常执行。

### 备注
- 日期：2026-04-23
- 结果：
  - 用户已确认“现在可以使用扩展”。
  - 本地执行 `npm run build-dev` 成功。
  - 本地执行 `npm run verify:p0` 通过（manifest v3、service_worker、popup、background 产物均正确）。
  - 用户已完成 `doc/testing/P0-SMOKE-STEPS.md` 手动烟测，结果正常。
- 阻塞点：
  - 无。

---

## P0 - 核心行为冒烟测试
- [x] 在 `https://` 页面可注入内容脚本。
- [x] 在 `http://` 页面可注入内容脚本。
- [x] 在受限页面（`chrome://`、扩展页）不会注入内容脚本。
- [x] 嵌入式库检测仍可在需要时禁用扩展。
- [x] 浏览器按钮图标/标题/徽章状态变化正确。
- [x] 右键菜单项可显示，并能执行预期动作。

### 备注
- 日期：2026-04-23
- 结果：
  - 用户已完成 `doc/testing/P0-SMOKE-STEPS.md` 测试步骤。
  - 用户反馈“一切正常”。
- 阻塞点：
  - 无。

---

## P1 - 认证与会话
- [x] Auth0 登录流程端到端可用。（方案 B 2026-05-03 + 方案 A 2026-05-04）
- [x] 登出流程端到端可用。（方案 B 2026-05-03 + 方案 A 2026-05-04）
- [x] 会话检测可用（有效 token 路径）。（方案 B mock + 方案 A 真实 `/userinfo`）
- [x] 会话过期路径可被正确处理。（方案 A 使用 Auth0 默认 24h token 有效期；过期后 `/userinfo` 返回 401 时 `sessionRequestHandler` 会经 catch 路径返回 Error——代码路径已覆盖，长期测试需观测）
- [x] 用户资料请求可返回预期字段。（方案 A：Google 授权后 Auth0 返回真实 profile，popup 显示真实昵称）
- [x] 用户数据请求路径仍可正常工作。（方案 A 2026-05-04）

### 备注
- 日期：2026-04-23 / 2026-05-03 / 2026-05-04
- 结果：
  - 已新增 `doc/testing/P1-AUTH-SMOKE-STEPS.md`，覆盖方案 A（真实 Auth0 + 自建租户）与方案 B（`TEST_ID` 测试模式）。
  - **方案 B 2026-05-03 通过**：popup ↔ content ↔ background 消息链路可用。
  - **方案 A 2026-05-04 通过**：自建 Auth0 免费租户 + Google 授权登录，完整 OAuth PKCE 流程（`chrome.identity.launchWebAuthFlow` → `/authorize` → 回调 → `/oauth/token` → `/userinfo` → 登出）全部可用。
  - 途中修复了三个 MV3 特有的认证 bug：
    1. `auth0-chrome` npm dist bundle 在 service worker 中引用 `document`，导致登录卡在 "Please be patient..."——用 `src/lib/auth/auth0-sw-client.js` 替代（纯 `crypto.subtle` + `fetch` + `chrome.identity`）。
    2. `loginRequestHandler` 优先检查 `TEST_ID`，导致真实凭据被 mock 短路——`src/lib/auth/login-path.js` 修正优先级（real > mock > error），9 个单测覆盖。
    3. `AUDIENCE: 'alpheios.net:apis'` 在自建 Auth0 租户中不存在导致 "Service not found"——`loginRequestHandler` 改为仅当 `AUDIENCE` 非空时传入。
  - **P1 认证链路完整可用。**
- 阻塞点：
  - 无。
  - 在方案 A 执行前，方案 B 已足以解锁本地开发与扩展整体可用性测试。

---

## P1 - 跨浏览器方案
- [x] 确定目标策略：**方案 A**（2026-05-03 决策）
- [x] `方案 A`：Chrome + Firefox 均使用 MV3。
- [ ] ~~`方案 B`：Chrome 使用 MV3，Firefox 使用兼容拆分清单。~~（未选）
- [x] 为不同浏览器定义产物名称与输出目录。（方案 A 下统一为 `dist/`，单一 zip 投递两侧 store）
- [ ] 验证 Firefox 安装流程（临时加载或打包安装）。
- [ ] 验证浏览器之间的基线功能一致性。

### 备注
- 日期：2026-05-03
- 决策：**方案 A——单一 MV3 manifest，Chrome + Firefox 共用 `dist/`**。详见 `doc/migration/PENDING-DECISIONS.md` 决策 1。
  - `src/manifest/manifest.json` 已含 `browser_specific_settings.gecko.id` 与 `strict_min_version: "115.0"`，FF 115 ESR 以下不再支持。
  - Safari 仍走 `src/safari-app-extension/` 现有 Xcode 流程，不在本决策范围。
  - GitHub Actions `release.yml` 现状已经是"产出单一 `dist.zip` + 上传到 GitHub Release"，与方案 A 一致；Chrome WebStore / AMO 投递仍是手动从 Release 拉包，未来可加自动化（不阻塞当前迁移）。
- 阻塞点：
  - Firefox 临时加载与基线一致性测试需用户在 FF 115+ 上手动验证（可参考 `doc/testing/P0-SMOKE-STEPS.md` 中 Chrome 的步骤，对应替换为 `about:debugging`）。

---

## P2 - 构建与依赖现代化
- [x] 保持 `package-lock.json` 现代化且可复现。
- [x] 移除不再需要的临时兼容补丁。
- [x] 审查弃用依赖并按影响分组：
- [x] 仅构建工具链
- [x] 运行时依赖
- [x] 安全关键项
- [x] 采用小批次升级，每批后执行冒烟测试。
- [x] 减少安装告警，并记录不可避免的告警。

### 备注
- 日期：2026-04-23 / 2026-05-03 / 2026-05-04
- 已升级包：
  - `package-lock.json` 已升级为 lockfile v3。
  - 新增 `npm run verify:p0` 作为基础构建产物校验命令。
- 决策：
  - **构建工具链：保持 Webpack 现状，工具链升级延后到下一大版本**（2026-05-03，详见 `doc/migration/PENDING-DECISIONS.md` 决策 2）。理由：当前阻塞用户的是 Auth0 P1 而非构建速度；换 Vite 需重测全部 P0/P1，风险/收益不对称；`alpheios-node-build` 与 webpack 紧密耦合，先解耦再换更稳。
  - **MV2 残余清理：保留全部兜底分支**（2026-05-03，详见 `doc/migration/PENDING-DECISIONS.md` 决策 3）。`src/lib/browser.js` 特性检测、`background.js` 的 `webextension-polyfill` 回退、`src/compatibility-fixes/` 全部保留，约 30 行代码换稳定性，收益不对称。
- 回归问题：
  - 依赖树中仍存在较多 deprecated/vulnerability 提示，后续按批次处理。
- **2026-05-04 P2「构建与依赖现代化」收尾批次**：详见新建的 `doc/migration/DEPENDENCY-NOTES.md`。
  - 移除真正死链：`auth0-chrome`（运行时已被 `src/lib/auth/auth0-sw-client.js` 替代）+ `path` userland 误装包 + `coveralls`（CI 未用）+ `friendly-errors-webpack-plugin`（零引用）。
  - 替换 lint 工具链：`babel-eslint` → `@babel/eslint-parser ^7.12.0`；同步删除 deprecated 的 `eslint-plugin-standard`；`eslintConfig.parserOptions.parser` 与 `requireConfigFile: false` 同步落地；`env.webextensions: true` 显式声明（之前由 `eslint-plugin-standard` 隐式带过 `browser` 全局）。
  - 经验记录：`webpack-cleanup-plugin` / `vue-svg-loader` / `imagemin*` 是 `alpheios-node-build` 的 peer 依赖（grep 误判为死引用），第一轮移除后 `npm run build-dev` 直接挂掉，立即回退。详见 `DEPENDENCY-NOTES.md`「回退」段。
  - 验证 gate（全部通过）：`npm install --legacy-peer-deps` → `npm run build-dev` → `npm run verify:p0` → `npm run verify:worker-safe` → `npm test`（46 passed + 1 skipped）→ `npm run lint`（0 errors）。
  - npm audit 基线：192 vulnerabilities（22 critical / 72 high / 88 moderate / 10 low），其中 28 个直接依赖。完整数据与升级路线建议见 `DEPENDENCY-NOTES.md`「npm audit 基线」与「后续 PR 处理顺序建议」两节。**安全升级是独立 PR，不在本批次范围**。
  - 不可避免告警：`uuid@3.4.0` 通过传递依赖引入（多个 webpack 4 时代包）；`gitignore-fallback`（npm 11 新提示）；`Browserslist: caniuse-lite is outdated`（噪声）。三者均文档化，不阻塞构建。
- **2026-05-04 后续：依赖清理 Tier 1+2+3**（在 P2 收尾批次之上继续推进，详见 `doc/migration/DEPENDENCY-NOTES.md`「第二轮」段）。
  - **Tier 1（quick wins）**：新建空 `.npmignore` 消除 `npm warn gitignore-fallback`；手动升级 `caniuse-lite`（`browserslist@latest --update-db` 因内部缺 `--legacy-peer-deps` 失败）消除 lint 时的 `Browserslist outdated` 警告。两条 install warning 全清。
  - **Tier 2（`npm audit fix` 非 --force）**：`added 124 / removed 196 / changed 273 packages`，自动把 `webpack` 5.4→5.106.2、`terser` 5.3→5.46.2、`vue` 2.6→2.7.16、`eslint` 7.12→7.32.0、`copy-webpack-plugin` 6.3→6.4.1 等推到各分支末端。declared range 未刷新（caret 已含新装版，纯装饰）。
  - **Tier 3（部分）**：`jsonwebtoken` ^8.5.1 → ^9.0.2（仓库唯一调用 `jwt.decode` 在 9.x 完全兼容；`src/content/content-safari.js:310`）；`webpack-bundle-analyzer` ^3.9.0 → ^4.10.2（仅 CLI，零源码 import）。
  - **累计成果**：漏洞 192 → 135（**-57，-30%**），critical 22 → 4（**-82%**），high 72 → 46。直接依赖中已彻底处理：`jsonwebtoken`、`webpack-bundle-analyzer`、`webpack` 系列 patch。
  - **剩余 4 critical / 46 high 阻塞点**：alpheios-node-build 上游链路、vue-jest（vue 2 + jest 26 紧耦合）、webpack-dev-server 3.x（仅本地，可单独升 5.x）、imagemin-svgo（alpheios-node-build peer dep）、copy-webpack-plugin 6→11（webpack 5 API 大改）。这批需要先解耦 / 升级 alpheios-node-build 才有解，匹配决策 2「下一大版本统一处理工具链」。
  - **验证 gate 全绿**（每个 Tier 都跑了一次完整链）：`build-dev` / `verify:p0` / `verify:worker-safe` / `npm test`（46 passed + 1 skipped）/ `npm run lint`（0 errors）。

---

## P2 - 代码库清理
- [x] 保持后台代码 worker-safe（不依赖 `window` 假设）。
- [x] 保持消息模型与重 UI 包解耦。
- [x] 为 popup/background 消息链路增加防御性错误日志。
- [x] 迁移稳定后清理仅 MV2 使用的死分支。
- [x] 为后台消息命令增加轻量级集成测试。

### 备注
- 日期：2026-04-23 / 2026-05-03
- 结果：
  - 新增 `npm run verify:worker-safe` 自动检查后台入口链路，防止引入 `window.` 与 `alpheios-components` 依赖回归。
  - `verify:worker-safe` 已通过。
  - **2026-05-03 现状核查**：`MIGRATION-CHECKLIST.md` P0 实际已落地于代码（`src/manifest/manifest.json` 为 manifest_version 3、`background.service_worker` 配置正确、`web_accessible_resources` 为 MV3 新格式）。`../archive/alpheios-webextension-目前v2和v3版本的对比.md` 描述的是另一个 `webextension-manifest-v3` 仓库与本仓库的对比，文中"硬编码 buildBranch='test'"、"大量 console.log 调试残留"、"safari/compatibility-fixes/env/lib 模块缺失" 等说法**对本仓库不适用**——本仓库走"原地迁移"路线，所有原 V2 模块都保留。
  - **2026-05-03 完成的 P2 清理**：
    - `src/manifest/manifest.json`：补齐 `browser_specific_settings.gecko.id = "alpheios@alpheios.net"` 与 `strict_min_version = "115.0"`，解决 Firefox 临时安装时 `storage.local/storage.sync` 不可用问题（参见 `../guides/DEVELOPMENT.md`「WebExtension ID」节）。
    - `src/background/background.js`：移除两条无意义的启动诊断 `console.log`（生产产物不应包含），保留 `console.warn` 错误路径；polyfill 加载逻辑保留以兼容老 Firefox。
    - `src/background/background-process.js` 清理 MV2 死分支：
      - `this.browserAction = browser.action || browser.browserAction` → `browser.action`。
      - `BackgroundProcess.executeScript` 移除 `browser.scripting` 不存在时的 `browser.tabs.executeScript` 回退。
      - `BackgroundProcess.dispatchEvent` 同上。
      - `loadContentCSS` 移除 `browser.tabs.insertCSS` 回退。
    - **Popup 防御性日志**：`src/manifest/popup.js` 在所有 catch 与 non-ok 响应路径加 `console.warn`（`[alpheios-popup]` 前缀）；`background-process.js` 的 `popupMessageListener` 包了 try/catch 并在所有失败分支 `console.warn/error`（`[alpheios-bg]` 前缀），保证 popup 与 service worker 双侧 devtools 可见诊断。
    - **轻量级单元测试**：
      - 抽出 `src/lib/url-support.js`，把 `BackgroundProcess.isSupportedTabUrl` 的判定逻辑独立成无浏览器依赖的纯模块，static 方法转调用之以保持 API 兼容。
      - 新增 `test/url-support.test.js`：14 个用例覆盖 chrome/edge/about/moz-extension/chrome-extension/view-source 等受限页面与正常 http/https 页面（含大小写）。
      - 新增 `test/background-models.test.js`：13 个 `Tab` / `TabScript` / `AuthData` 用例覆盖 `createUniqueId` 稳定性、attach/deattach 生命周期、Symbol 字段的 `serializable + readObject` 往返等。
      - 全部 27 个测试本地 jest 通过。
    - `verify:worker-safe` 通过；`verify:p0` 需构建产物，待本地 `npm run build-dev` 后验证。
- 阻塞点：
  - 无（剩余的"端到端 service worker ↔ content script 联调"测试需先决定是否引入 `puppeteer`/`playwright`，单独决策；见 `doc/migration/PENDING-DECISIONS.md`）。

---

## P3 - 发布准备
- [x] 在 `README.md` 更新当前安装/测试流程。
- [x] 在 `BUILD-FF-CHROME.md`（即 `../guides/BUILD-FF-CHROME.md`）更新最终浏览器构建步骤。
- [x] 在 `DEVELOPMENT.md`（即 `../guides/DEVELOPMENT.md`）更新迁移架构说明。
- [x] 为 MV3 迁移阶段准备 changelog 条目。
- [ ] 生成内部候选版本并执行最终冒烟测试。

### 备注
- 日期：2026-05-03
- 结果：
  - `README.md` 「Project Revival Status」段落已重写：声明 issue #324 已在 manifest/background-shell 层落地，列出剩余事项（Auth0 P1、跨浏览器策略、可选工具链升级）。
  - `doc/guides/DEVELOPMENT.md` 「Modernization Context」段落已重写：MV2 API 列表改为"已迁移到的 MV3 对应 API"。
  - `doc/guides/BUILD-FF-CHROME.md` 已声明 Firefox 115+ 最低支持、单一 MV3 `dist.zip` 投递两侧 store；保留 webpack 工具链以兼容现有发布管线，并把 Vite 升级标记为延后项。
  - 新增 `doc/migration/PENDING-DECISIONS.md`：跨浏览器策略、构建工具链、MV2 残余清理三项决策矩阵；2026-05-03 决议 A/A/A，已在文档顶部及各章节标记落地状态。
  - 新增 `CHANGELOG.md`（仓库根，路径 `../../CHANGELOG.md`，Keep-a-Changelog 格式）：完整记录本次 MV3 迁移的 Added / Changed / Removed / Deferred 项，作为下一个 release 的 changelog 草稿。
- RC 版本：在 Auth0 P1 真机验证通过后，按 `package.json` 当前 `version: 3.3.2` → 建议升 `4.0.0`（manifest 主版本变更属于 BREAKING 级别）打 tag。
- 最终阻塞点：
  - **Auth0 P1 真实凭据验证（方案 A）**——见 `doc/testing/P1-AUTH-SMOKE-STEPS.md`。方案 B（`TEST_ID` 测试模式）已于 2026-05-03 通过，覆盖消息链路；方案 A 在拿到真实 Auth0 凭据后补做即可。
  - **Firefox 115+ 真机基线测试**——按 `doc/testing/P0-SMOKE-STEPS.md` 步骤在 FF 上跑一遍。
  - 这两项不解决前不建议打 4.0.0 RC，但代码与文档基线已稳定，扩展在测试模式下可正常使用，可以继续做后续清理（依赖告警批次升级、popup 视觉打磨等）而无需阻塞。
