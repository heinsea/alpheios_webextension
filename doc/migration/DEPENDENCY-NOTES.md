# 依赖与告警基线

> 本文档记录 P2 收尾时的依赖告警基线，作为后续按 `npm audit` 做安全升级
> PR 的起点。与 [`PENDING-DECISIONS.md`](PENDING-DECISIONS.md) 平级，二者覆盖
> 不同维度（决策矩阵 vs. 状态快照）。
>
> 与 [`MIGRATION-CHECKLIST.md`](MIGRATION-CHECKLIST.md) P2 章节交叉引用：本文件提供
> 数据快照，checklist 标记进度。

## 基线日期

2026-05-04

## 本轮已处理

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

## 验证结果（2026-05-04）

- `npm install --legacy-peer-deps` ：成功，`removed 1 package, changed 2 packages`。
- `npm run build-dev` ：成功，webpack 产出 `dist/background.js` / `dist/content.js`。
- `npm run verify:p0` ：通过（manifest v3、service_worker、action 无 default_popup、background 非空）。
- `npm run verify:worker-safe` ：通过（5 个 worker 入口无 `window.` / `alpheios-components`）。
- `npm test` ：通过，**46 passed + 1 skipped = 47 total**（`url-support` 14 / `background-models` 13 / `login-path` 9 / `auth0-sw-client` 10 / `webextension` 1-skip）。
- `npm run lint` ：通过，0 errors（添加 `webextensions: true` 后）。

---

## npm audit 基线

`npm audit --json` 于 2026-05-04 采集，metadata：

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
| `npm warn gitignore-fallback`（仅 cmd.exe / npm 11 出现） | `No .npmignore file found, using .gitignore` | npm 11 新提示，仅出现在我们用 `cmd.exe` 跑 install 时；不影响构建。可在后续 PR 增加空 `.npmignore` 消除。 |
| `Browserslist: caniuse-lite is outdated` | npm run lint 时打印 | 跑 `npx browserslist@latest --update-db` 即可；噪声而非错误，不阻塞构建。 |

> 当前 `package-lock.json` 中其他显式 `"deprecated":` 字段的包（如 `uuid@3.4.0` 等）
> 多数是传递依赖，需要等上游 `alpheios-node-build`、`vue-jest`、webpack 4-era 工具升级才能根除。

---

## 后续 PR 处理顺序建议

1. **第一优先：critical/high 中的非 alpheios-node-build 项**
   - `webpack` 升到 5.97+
   - `webpack-bundle-analyzer` 升到 4.x
   - `webpack-dev-server` 升到 5.x（仅本地，影响小）
   - `jsonwebtoken` 升到 9.x
   - `copy-webpack-plugin` 升到 11.x（注意 API 变化）
   - 每升 1-2 个跑全套 verify。
2. **第二优先：与 alpheios-node-build 解耦**
   - 决策 2 后续路线 C：把 alpheios-node-build 升级或替换。这能解锁 webpack-cleanup-plugin / imagemin* / vue-svg-loader 一整批 peer deps 的升级路径。
3. **moderate/low：仅在版本号许可时随手升**
4. **vue 2 → vue 3**：跨大版本，等 alpheios-core 准备好再做；暂不规划。

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
