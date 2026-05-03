# 依赖与告警基线

> 本文档记录 P2 收尾时的依赖告警基线，作为后续按 `npm audit` 做安全升级
> PR 的起点。与 [`PENDING-DECISIONS.md`](PENDING-DECISIONS.md) 平级，二者覆盖
> 不同维度（决策矩阵 vs. 状态快照）。
>
> 与 [`MIGRATION-CHECKLIST.md`](MIGRATION-CHECKLIST.md) P2 章节交叉引用：本文件提供
> 数据快照，checklist 标记进度。

## 基线日期

2026-05-04 第一轮（P2 收尾批次） + 第二轮（依赖清理 Tier 1+2+3）

## 第二轮（2026-05-04 后续）— Tier 1 + 2 + 部分 3

> 上一轮完成后用户继续推进，分为三档执行：
> - **Tier 1**：消除两条已知 install warning（quick wins）
> - **Tier 2**：跑非 `--force` 的 `npm audit fix`，看 transitive 依赖能修多少
> - **Tier 3**（部分）：升 1-2 个直接依赖跨主版本（择 API 变化最小者）

### Tier 1：清理 install warnings

| 改动 | 文件 | 效果 |
|---|---|---|
| 新建空 `.npmignore`（仅注释） | 仓库根 | 消除 `npm warn gitignore-fallback`（npm 11 提示）。本仓不发布到 npm，故 `.npmignore` 内容可空。 |
| `npm install caniuse-lite --legacy-peer-deps` | `package-lock.json` | 消除 lint 运行时打印的 `Browserslist: caniuse-lite is outdated` 警告。`browserslist@latest --update-db` 因内部 `npm install` 缺 `--legacy-peer-deps` 失败，改为手动升级 caniuse-lite。 |

验证：再次跑 `cmd.exe /c "npm install --legacy-peer-deps"` + `npm run lint`，两条 warning 均不再出现。

### Tier 2：`npm audit fix`（非 --force）

```
cmd.exe /c "npm audit fix --legacy-peer-deps"
# added 124 packages, removed 196 packages, changed 273 packages, audited 1915 packages in 1m
```

**漏洞数变化**：

| severity | 第一轮（修前） | Tier 2 之后 |
|---|---|---|
| critical | 22 | 6 |
| high | 72 | 47 |
| moderate | 88 | 73 |
| low | 10 | 11 |
| **total** | **192** | **137** |

audit fix 在 semver 范围内自动把多个直接依赖的安装版本拉到最新 patch / minor：

| 包 | 第一轮安装 | Tier 2 后安装 | declared range |
|---|---|---|---|
| `webpack` | 5.4.0 | **5.106.2** | `^5.4.0`（未改）|
| `terser` | 5.3.8 | **5.46.2** | `^5.3.8`（未改）|
| `vue` | 2.6.12 | **2.7.16**（最后一个 2.x） | `^2.6.12`（未改）|
| `eslint` | 7.12.1 | **7.32.0**（最后一个 7.x） | `^7.12.1`（未改）|
| `copy-webpack-plugin` | 6.3.0 | **6.4.1** | `^6.3.0`（未改）|

**注意**：上述包的 `package.json` declared range **未刷新**。原因：caret 范围已经包含了新装版本，刷新 declared range 是装饰性变更，无功能效果。`package-lock.json` 是单一事实来源，记录了实际安装版本。如果后续维护需要"硬性下限"，可在单独 PR 里 bump declared range（建议至少 bump 到漏洞 advisory 的 fix 起点，例如 `webpack: ^5.94.0` 才彻底跳出 `<=5.93.0` 的漏洞范围）。

完整 verify gate（build / verify:p0 / verify:worker-safe / test / lint）全部通过；46 + 1 skipped tests。

### Tier 3（部分）：直接依赖跨主版本升级

#### `jsonwebtoken` 8.5.1 → 9.0.3

- 仓库实际使用面：`src/content/content-safari.js:310` 的 `jwt.decode(accessToken)`，**唯一调用点**。
- API 安全性：`jwt.decode` 在 8 → 9 完全无变化。9.x 的 breaking changes 集中在 `sign` / `verify`（默认 `algorithms`、回调签名等），与本仓无关。
- 历史背景：上游曾有 dependabot PR #351 提议升 9.0.0（参见 `doc/archive/alpheios问题.md:62`）。
- 修改：`package.json` 的 `^8.5.1` → `^9.0.2`，`npm install --legacy-peer-deps` 安装到 `9.0.3`。
- 验证：完整 verify gate 通过；漏洞数 137 → 136（-1 high）。

#### `webpack-bundle-analyzer` 3.9.0 → 4.10.2

- 仓库实际使用面：仅作为 CLI 工具（`webpack-bundle-analyzer lib/bin/analyzer.js`），**全仓零 import**。本地 dev 工具，不进 production bundle。
- API 安全性：版本 4 引入 ESM 与新选项，但 CLI 行为兼容；不影响 build 流程。
- 修改：`package.json` 的 `^3.9.0` → `^4.10.2`，安装到 `4.10.2`。
- 验证：完整 verify gate 通过；漏洞数 136 → **135**（-1 critical）。

### Tier 1+2+3 累计成果

| | 起点（Tier 1 之前） | 终点（Tier 3 之后） | 变化 |
|---|---|---|---|
| critical | 22 | **4** | **-18（-82%）** |
| high | 72 | **46** | **-26** |
| moderate | 88 | **74** | **-14** |
| low | 10 | **11** | +1 |
| **total** | **192** | **135** | **-57（-30%）** |
| install warnings | 2 | **0** | -2 |

直接依赖中已修：`jsonwebtoken`（critical/high 全清）、`webpack-bundle-analyzer`（critical 全清）、加上 audit fix 自动处理的 `webpack` / `terser` / `eslint` / `vue` / `copy-webpack-plugin` 等的 patch 升级。

### 仍未解决的 4 个 critical / 46 个 high

经过本轮处理后剩余的 critical 集中在 alpheios-node-build 上游链路、vue-jest（与 vue 2 + jest 26 紧耦合）、jest-vue-preprocessor。high 大头是 webpack-dev-server 3.x（仅本地，非阻塞）、imagemin-svgo（alpheios-node-build peer dep）、`copy-webpack-plugin` 6.x（升 11 是 webpack 5 API 大改）。

**这些都需要先升级 / 解耦 alpheios-node-build 才有解**，符合决策 2「下一大版本统一处理工具链」。

---

## 第一轮（2026-05-04 P2 收尾批次）— 原始记录



### 移除（验证通过后从 `package.json` 删除）

| 包 | 类型 | 移除理由 |
|---|---|---|
| `auth0-chrome` | `dependencies` | 已被 `src/lib/auth/auth0-sw-client.js` 完全替代（见 P1 / CHANGELOG）。原 `auth0-code-update` npm 脚本同步删除，`update-dist` 链中 `npm run auth0-code-update` 已剔除。`dist/support/auth0/` 不再被 build 产生。|
| `path` | `devDependencies` | userland 包遮蔽 Node 内置 `path`，明显误装。`build/config.mjs` 的 `import path from 'path'` 在 Node 解析时优先选内置，移除后行为不变。 |
| `coveralls` | `devDependencies` | `.github/workflows/main.yml` 全程不调用，本仓也无 coverage 上报集成。|
| `friendly-errors-webpack-plugin` | `devDependencies` | 全仓零引用（webpack config 不导入；alpheios-node-build 也未引）。|
| `babel-eslint` | `devDependencies` | 已 deprecated，官方迁移到 `@babel/eslint-parser`。`package-lock.json` 显式打印 `babel-eslint is now @babel/eslint-parser`。|
| `eslint-plugin-standard` | `devDependencies` | 已 deprecated（standard v17+ 内置），全仓零引用。|

### 替换

| 旧 | 新 | 影响范围 |
|---|---|---|
| `babel-eslint` | `@babel/eslint-parser ^7.12.0` | `eslintConfig.parserOptions.parser` 同步换名；新增 `requireConfigFile: false` 显式声明（本仓有 `.babelrc`，理论可省，但显式更稳）。 |

### 配置补全

- `eslintConfig.env.webextensions: true` — 之前由 `eslint-plugin-standard` 隐式带过 `browser` 全局；移除该插件后必须显式声明，否则 `src/background/background-process.js` 等 16 处 `browser.*` 调用会报 `'browser' is not defined`。

### 回退（grep 误判，必须保留）

下列包看起来在源码中零引用，但实际是 `alpheios-node-build`（私有 git 包，安装到
`node_modules/alpheios-node-build/`）的 peer 依赖。第一轮把它们一并移除后
`npm run build-dev` 因 `Cannot find package 'webpack-cleanup-plugin' imported
from .../alpheios-node-build/dist/presets/pwa-vue.mjs` 失败，立即恢复：

| 包 | 由 alpheios-node-build 间接调用 |
|---|---|
| `webpack-cleanup-plugin` ^0.5.1 | preset `pwa-vue.mjs` |
| `vue-svg-loader` ^0.16.0 | preset `pwa-vue.mjs` |
| `imagemin` ^7.0.1 | imagemin pipeline |
| `imagemin-jpegtran` ^7.0.0 | 同上 |
| `imagemin-optipng` ^8.0.0 | 同上 |
| `imagemin-svgo` ^8.0.0 | 同上 |

经验：alpheios-node-build 是私有包，scope 不在 npm 公网注册表中显式登记
peer-deps，需要在升级或裁剪时**先 build 一次**确认。

---

## 验证结果（2026-05-04 第一轮）

- `npm install --legacy-peer-deps` ：成功，`removed 1 package, changed 2 packages`。
- `npm run build-dev` ：成功，webpack 产出 `dist/background.js` / `dist/content.js`。
- `npm run verify:p0` ：通过（manifest v3、service_worker、action 无 default_popup、background 非空）。
- `npm run verify:worker-safe` ：通过（5 个 worker 入口无 `window.` / `alpheios-components`）。
- `npm test` ：通过，**46 passed + 1 skipped = 47 total**（`url-support` 14 / `background-models` 13 / `login-path` 9 / `auth0-sw-client` 10 / `webextension` 1-skip）。
- `npm run lint` ：通过，0 errors（添加 `webextensions: true` 后）。

---

## npm audit 基线（第一轮快照，仅作历史对比）

> Tier 2+3 之后的当前状态见上方「Tier 1+2+3 累计成果」表。本节保留作差异对照。

`npm audit --json` 于 2026-05-04 第一轮采集，metadata：

| severity | 数量（含传递） |
|---|---|
| critical | 22 |
| high | 72 |
| moderate | 88 |
| low | 10 |
| **total** | **192** |

### Direct（package.json 直接声明）有问题的包：28 个

#### Critical

| 包 | 范围 | 备注 |
|---|---|---|
| `alpheios-node-build` | git+ | 私有 build 脚手架；上游需要发新版才能修。**阻塞**。 |
| `vue-jest` | 1.0.0 - 5.0.0-alpha.1 | 现 ^3.0.7；与 vue 2 + jest 26 紧耦合，升级影响测试链。 |
| `webpack` | 5.0.0-alpha.0 - 5.93.0 | 现 ^5.4.0；可在 5.x 范围内升到 5.97+。决策 2 锁定不动 webpack 主版本，但小版本可以。 |
| `webpack-bundle-analyzer` | 1.3.0 - 3.9.0 | 现 ^3.9.0；CLI 工具，不影响运行时；可升到 4.x。 |

#### High

| 包 | 现版本 | 范围 | 备注 |
|---|---|---|---|
| `copy-webpack-plugin` | ^6.3.0 | 4.3.0 - 13.0.1 | webpack 配套；升到 11.x 可能要适配 webpack 5 API。 |
| `eslint` | ^7.12.1 | 5.14.0 - 7.14.0 | 升 v8/v9 是大动作，决策 2 范围。 |
| `imagemin-svgo` | ^8.0.0 | 5.2.3 \|\| 6.0.0 - 8.0.0 | alpheios-node-build peer dep；上游不动则不能升。 |
| `jest-vue-preprocessor` | ^1.7.1 | >=1.0.0 | 与 vue 2 + jest 26 紧耦合。 |
| `jsonwebtoken` | ^8.5.1 | <=8.5.1 | 仅在 jwt 解析用；可升 9.x，需要轻量验证。 |
| `terser` | ^5.3.8 | >=5.0.0 <5.14.2 \|\| <4.8.1 | webpack 配套。 |
| `terser-webpack-plugin` | 4.2.3 | <=5.3.16 | 同上。 |
| `webpack-cleanup-plugin` | ^0.5.1 | >=0.4.0 | alpheios-node-build peer dep；上游不动则不能升。 |
| `webpack-dev-server` | ^3.11.0 | * | 仅本地开发用；可升 4.x/5.x。 |

#### Moderate (14)

主要是 `@actions/core`、`@babel/runtime`、`git-branch`、`uuid`、`vue-*` 系列、`postcss-safe-important`、`parallel-webpack`、`optimize-css-assets-webpack-plugin`、`jest` 等。多数是 build 工具或 vue 2 相关，留作 audit 升级 PR 处理。

#### Low (1)

- `vue` 2.0.0-alpha.1 - 2.7.16：vue 2 已 EOL，长期看需要随 alpheios-core 一起升 vue 3，超出本仓范围。

---

## 不可避免的 deprecation 告警

| 来源 | 告警 | 处置原因 |
|---|---|---|
| `uuid@3.4.0`（多个传递依赖引入） | `uuid@10 and below is no longer supported` | 是多个老 webpack 4 时代包的传递依赖；只能等上游升级。`uuid` 直接依赖在我们这是 ^8.3.1，不直接受影响。 |

> **2026-05-04 Tier 1 已消除**：`npm warn gitignore-fallback`（加空 `.npmignore`）；`Browserslist: caniuse-lite is outdated`（手动升级 caniuse-lite）。两条不再出现在当前 install / lint 输出中。

`npm audit fix` Tier 2 之后新增的传递 deprecation 告警（首次 audit fix 安装会报，后续仅在 fresh install 时打印）：

| 包 | 告警 |
|---|---|
| `rimraf@3.0.2` | Rimraf versions prior to v4 are no longer supported |
| `glob@7.2.3` | Old versions of glob are not supported |
| `@humanwhocodes/config-array@0.5.0` | Use @eslint/config-array instead |
| `@humanwhocodes/object-schema@1.2.1` | Use @eslint/object-schema instead |
| `tar@6.2.1` | Old versions of tar are not supported |
| `uuid@8.3.2` | uuid@10 and below is no longer supported |
| `vue@2.7.16` | Vue 2 has reached EOL |
| `eslint@7.32.0` | This version is no longer supported |

这些都是**传递性 deprecated**，与决策 2「下一大版本统一升级工具链」直接相关——
要等 alpheios-node-build / vue 3 / jest 29 / eslint 9 一同推进。本仓不主动单升。

> 当前 `package-lock.json` 中其他显式 `"deprecated":` 字段的包（如 `uuid@3.4.0` 等）
> 多数是传递依赖，需要等上游 `alpheios-node-build`、`vue-jest`、webpack 4-era 工具升级才能根除。

---

## 后续 PR 处理顺序建议

> Tier 1+2+3 完成后剩余 4 个 critical / 46 个 high。下面顺序按"影响面 × 风险"重排。

1. **第一优先：升级 / 替换 alpheios-node-build**
   - 这是 critical 与多数 high 的共同上游。一旦推进，`webpack-cleanup-plugin` / `imagemin*` / `vue-svg-loader` 一整批 peer deps 才有升级路径。
   - 决策 2 后续路线 C 的核心。
2. **第二优先：webpack-dev-server 3 → 5**
   - 仅本地 dev 工具，不影响 production bundle。新增 4.x/5.x 的破坏性变更主要在配置 API（`https`、`hot`、`overlay` 等），需要重写本仓的 dev 启动脚本（如果有）。
3. **第三优先：copy-webpack-plugin 6 → 11**
   - webpack 5 API 已升，跨主版本主要影响 `patterns` 配置形式，在 `build/config.mjs` 单点修改即可。
4. **第四优先（与上游同步）：vue 2 → 3 + vue-jest / jest-vue-preprocessor**
   - 跨大版本，等 alpheios-core 准备好再做；暂不规划。
5. **第五优先（与上游同步）：jest 26 → 29、eslint 7 → 9**
   - jest 升级触发 `babel-jest` 与 `jest-vue-preprocessor` 适配；eslint 升级触发 `eslint-config-standard` 升 v17+。一并改造。
6. **moderate/low**：仅在版本号许可时随手升。

---

## 复现命令

```bash
# 安装并审计（Windows 推荐用 cmd.exe，WSL bash 在 Windows 文件锁下偶发 EBUSY）
cmd.exe /c "npm install --legacy-peer-deps"
npm audit --json > audit-baseline.json

# 验证基线
npm run build-dev
npm run verify:p0
npm run verify:worker-safe
npm test
npm run lint
```
