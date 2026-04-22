# Alpheios WebExtension：V2 与 V3 完整对比说明

## 概述

| 对比项 | [webextension (V2)](https://github.com/alpheios-project/webextension) | [webextension-manifest-v3 (V3)](https://github.com/alpheios-project/webextension-manifest-v3) |
|---|---|---|
| **Manifest 版本** | Manifest V2 | **Manifest V3** |
| **创建时间** | 2017 年 11 月 | 2022 年 5 月 |
| **最后更新** | 2023 年 1 月（已基本停止维护） | 2026 年 4 月 19 日（活跃开发中） |
| **默认分支** | `master` | `main` |
| **版本号** | 3.3.2 | 4.0.1 |
| **开放 Issue** | **38 个**未解决 | **0 个** |
| **License** | ISC License | 无 |
| **文档完整性** | 完整（含构建、开发、Safari 指南） | 几乎为空（README 仅标题一行） |
| **构建工具** | Webpack + Babel | **Vite**（现代化工具链） |
| **整体状态** | 功能完整，停止维护 | 进行中的迁移，尚未完整 |

---

## 一、Manifest 规范变更

这是两个仓库最根本的差异，所有其他变化都由此衍生。

### V2（旧规范）
```json
{
  "manifest_version": 2,
  "browser_action": { "default_icon": "...", "default_title": "Activate Alpheios" },
  "background": {
    "scripts": ["env-webext.js", "support/auth0/auth0chrome.js", "background.js"]
  },
  "permissions": ["http://*/*", "https://*/*", "tabs", "activeTab", "contextMenus", "storage", "webNavigation", "identity"],
  "web_accessible_resources": ["styles/style.css"],
  "applications": { "gecko": { "id": "alpheios@alpheios.net" } }
}
```

### V3（新规范）
```json
{
  "manifest_version": 3,
  "action": { "default_icon": "...", "default_title": "Activate Alpheios" },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "permissions": ["storage", "contextMenus", "activeTab", "identity", "webNavigation", "scripting", "tabs"],
  "host_permissions": ["http://*/*", "https://*/*"],
  "web_accessible_resources": [{ "resources": ["styles/alpheios-components.css"], "matches": ["<all_urls>"] }]
}
```

### 关键变化说明

| 变更点 | V2 | V3 | 说明 |
|---|---|---|---|
| `browser_action` → `action` | ✅ | ✅ | MV3 强制重命名 API |
| 后台脚本 → Service Worker | 持久 background scripts | `service_worker` | MV3 核心架构变化，Service Worker 不持久 |
| `host_permissions` 分离 | 混在 `permissions` 中 | 独立字段 | MV3 要求将主机权限单独声明 |
| `scripting` 权限 | ❌ | ✅ 新增 | MV3 中动态注入脚本需要此权限 |
| `web_accessible_resources` 格式 | 字符串数组 | 对象数组（含 `matches`） | MV3 安全增强，限制资源访问来源 |
| Firefox gecko ID | ✅ 有 | ❌ 缺失 | V3 尚未配置 Firefox 特定参数 |

---

## 二、目录结构对比

### V2 (`src/`)
```
src/
├── background/
│   ├── background.js
│   ├── background-process.js      # 34,140 字节，逻辑完整
│   ├── context-menu-item.js
│   └── context-menu-separator.js
├── compatibility-fixes/           # ✅ 跨浏览器兼容性修复
├── content/
│   ├── content.js                 # 完整内容脚本
│   └── content-safari.js          # ✅ Safari 专用内容脚本
├── env/                           # ✅ 环境变量注入（Auth0 等）
├── icons/
├── lib/
│   ├── auth/
│   ├── messaging/
│   ├── browser.js                 # ✅ 浏览器检测工具
│   ├── logger.js                  # ✅ 日志系统
│   └── state.js                   # ✅ 状态工具类
├── manifest/
│   └── manifest.json
└── safari-app-extension/          # ✅ Safari 原生扩展（Swift/Xcode）
```

### V3 (`src/`)
```
src/
├── background.js                  # Service Worker 入口
├── background/
│   ├── background-process.js      # 10,226 字节，逻辑不完整
│   ├── browser-action-support.js
│   ├── content-load-support.js
│   ├── context-menu/
│   └── execute-doc-event-support.js
├── content.js                     # 内容脚本入口
├── content/
│   ├── controller-support.js
│   └── file-attach-support.js
├── l10n/                          # ✅ 新增独立 l10n 模块
├── lib/
│   ├── auth/
│   └── messaging/
└── manifest/
    ├── manifest.json
    ├── icons/
    └── _locales/
```

### 缺失模块汇总

| 模块 | V2 | V3 | 影响 |
|---|---|---|---|
| `safari-app-extension/` | ✅ | ❌ 完全缺失 | **不支持 Safari 浏览器** |
| `content/content-safari.js` | ✅ | ❌ 完全缺失 | Safari 内容脚本缺失 |
| `compatibility-fixes/` | ✅ | ❌ 完全缺失 | 跨浏览器兼容性补丁缺失 |
| `env/` | ✅ | ❌ 完全缺失 | Auth0 等环境变量注入缺失 |
| `lib/browser.js` | ✅ | ❌ 缺失 | 浏览器类型检测工具缺失 |
| `lib/logger.js` | ✅ | ❌ 缺失 | 统一日志系统缺失 |
| `lib/state.js` | ✅ | ❌ 缺失 | 状态工具类缺失 |

---

## 三、核心代码对比

### 3.1 后台进程（background-process.js）

| 指标 | V2 | V3 |
|---|---|---|
| 文件大小 | **34,140 字节** | **10,226 字节**（约 30%）|
| 后台模型 | 持久 background script | Service Worker（非持久） |
| 调试日志 | 已清理 | **大量 `console.log` 残留**（未生产化）|

V3 后台进程中留有大量调试代码，例如：
```javascript
console.log('initialize - this.contextMenu', this.contextMenu)
console.log('menuListener - ', { info, tab })
console.log('setMenuForTab - tab', { tab, 'tab.status': tab.status, ... })
console.log('tabActivationListener - started') // 重复出现两次
```

### 3.2 内容脚本（content.js）

V2 的 `content.js` 是一个完整的单文件实现（7,224 字节），包含：
- 完整的 `AppController` 初始化流程
- `AuthModule`、`PanelModule`、`PopupModule`、`ToolbarModule`、`ActionPanelModule` 的完整注册
- `Alpheios_Embedded_Response` 与 `Alpheios_Reload` 事件监听
- 动态构建信息注入（`BUILD_BRANCH`、`BUILD_NUMBER`、`BUILD_NAME`）

V3 将内容脚本拆分重构，由 `content.js`（5,557 字节）入口 + `controller-support.js` 辅助类组成，但存在明显退化：
```javascript
// V3 中 buildBranch/buildNumber/buildName 被硬编码为测试值，尚未接入真实构建信息
app: { name: browserManifest.name, version: browserManifest.version,
       buildBranch: 'test', buildNumber: 'test', buildName: 'test' }
```

V2 的完整实现：
```javascript
// V2 正确从构建系统注入
app: { name: browserManifest.name, version: browserManifest.version,
       buildBranch: BUILD_BRANCH, buildNumber: BUILD_NUMBER, buildName: BUILD_NAME }
```

---

## 四、依赖与构建环境

### 4.1 核心依赖对比

| 依赖项 | V2 | V3 | 说明 |
|---|---|---|---|
| `@alpheios-core/components` | npm 发布版本 | `file:../alpheios-core/...`（本地路径） | **V3 无法独立构建** |
| `webextension-polyfill` | 隐式使用 | `^0.12.0` 显式声明 | V3 统一使用 browser polyfill |
| 构建工具 | Webpack + Babel | **Vite 7.x** | V3 使用更现代的构建工具 |
| `intl-messageformat` | — | `^10.7.16` | V3 新增国际化消息格式化 |
| `uuid` | — | `^11.1.0` | V3 新增 UUID 生成库 |

### 4.2 构建方式对比

V2 使用 Webpack，有完整的 GitHub Actions CI/CD 工作流（包含自动注入版本号、多分支发布流程）。

V3 使用 Vite，分两阶段构建：
```json
"build": "npm run build-back && npm run build-cont",
"build-cont": "vite build --config vite-cont.config.js",
"build-back": "vite build --config vite-back.config.js"
```
但**目前依赖本地路径包，无法在独立环境中构建**。

---

## 五、已修复的问题（V2 → V3 改进）

以下为 V2 仓库中曾存在、在 V3 迁移中得到改善的问题：

| 问题 | V2 Issue | V3 处理方式 |
|---|---|---|
| `browser_action` API 已废弃 | — | ✅ 迁移为 `action` API |
| 后台脚本导致浏览器性能开销 | — | ✅ 改为 Service Worker（按需唤醒） |
| Firefox 要求移除多余权限（`tabs`） | [#325](https://github.com/alpheios-project/webextension/issues/325) | ✅ 权限结构重新整理，`host_permissions` 分离 |
| `onTabUpdated` 监听器导致内容多次加载 | [#342](https://github.com/alpheios-project/webextension/issues) | ✅ Service Worker 架构从根本上避免持久监听问题 |
| `handleOnInstalled` 使用错误的 tab 属性 | — | ✅ [2026-04-19] 修复为正确使用 `t.id` |
| `file-attach-support.js` 未统一使用 browser polyfill | — | ✅ [2026-04-19] 统一改为 browser polyfill |
| Google 要求移除 `tabs` 权限 | [#321](https://github.com/alpheios-project/webextension/pull/321) | ✅ MV3 权限模型重构后合规 |

---

## 六、V3 当前缺口与风险

### 6.1 功能缺口

| 缺口 | 严重程度 | 说明 |
|---|---|---|
| **Safari 完全不支持** | 🔴 高 | Safari App Extension（Swift/Xcode）及对应内容脚本均未迁移 |
| **无法独立构建** | 🔴 高 | `@alpheios-core/components` 依赖本地路径，CI 环境无法使用 |
| **构建信息硬编码** | 🟡 中 | `buildBranch/buildNumber/buildName` 为 `'test'`，影响版本追踪 |
| **Firefox gecko ID 缺失** | 🟡 中 | Firefox 扩展发布需要 `applications.gecko.id` |
| **大量调试日志未清除** | 🟡 中 | 生产包中不应包含 `console.log` |
| **兼容性修复模块缺失** | 🟡 中 | 跨浏览器边界情况处理能力下降 |
| **日志/状态工具类缺失** | 🟡 中 | 错误追踪和状态管理能力下降 |
| **无测试目录** | 🟡 中 | V2 有 `test/` 目录，V3 尚无测试 |
| **文档完全缺失** | 🟡 中 | README 仅一行标题 |

### 6.2 V3 架构的固有限制（MV3 本身的约束）

- **Service Worker 不持久**：Service Worker 会在浏览器空闲时被终止，需要处理状态持久化问题
- **`XMLHttpRequest` 不可用**：Service Worker 中只能使用 `fetch`，部分老逻辑需适配
- **动态代码执行受限**：MV3 禁止 `eval()` 等动态执行方式

---

## 七、总体评估

```
┌─────────────────────────────────────────────────────────┐
│                    功能完整性对比                         │
├──────────────────────┬──────────────┬───────────────────┤
│ 功能模块              │   V2 (MV2)   │   V3 (MV3)        │
├──────────────────────┼──────────────┼───────────────────┤
│ Chrome 扩展基础功能   │     ✅       │     🟡 基本可用    │
│ Firefox 扩展基础功能  │     ✅       │     🟡 基本可用    │
│ Safari 扩展支持       │     ✅       │     ❌ 完全缺失    │
│ Auth 认证模块         │     ✅       │     🟡 已迁移      │
│ 构建信息注入          │     ✅       │     ❌ 硬编码占位   │
│ 跨浏览器兼容处理      │     ✅       │     ❌ 缺失        │
│ 日志系统              │     ✅       │     ❌ 缺失        │
│ 独立构建能力          │     ✅       │     ❌ 依赖本地包   │
│ CI/CD 工作流          │     ✅       │     ❌ 缺失        │
│ 文档                 │     ✅       │     ❌ 几乎为空     │
│ 测试                 │     ✅       │     ❌ 无测试       │
│ 生产就绪度            │     ✅       │     ❌ 仍为开发态   │
└──────────────────────┴──────────────┴───────────────────┘
```

### 结论

- **`webextension` (V2)**：功能完整、经过验证的生产可用版本。虽已停止维护，但在 Chrome/Firefox/Safari 上均可正常工作，38 个未关闭 Issue 中多数为功能请求或已知边缘情况。

- **`webextension-manifest-v3` (V3)**：处于**积极开发中的迁移项目**，架构方向正确（Vite、Service Worker、browser polyfill 统一），但当前距离功能对等仍有较大差距，**不建议在生产环境使用**。

> 如需参与贡献或跟进进展，建议关注 [webextension-manifest-v3](https://github.com/alpheios-project/webextension-manifest-v3) 仓库，这是项目的官方迁移方向。