---
name: Alpheios Scholarly Glass
version: 2.0
status: Proposal — covers the full v3 UI surface area
last-updated: 2026-05-04
applies-to: alpheios-core/packages/components (Popup, Compact Panel, Action Panel, Toolbar) and the alpheios_webextension MV3 host
---

# Alpheios v3 UI 设计规范

本文是在 v2 → v3 (Manifest V3) 升级之后对 UI 的整体重设计。原始 `code.html` / `screen.png` 仅是查词成功态的灵感稿；本文档把它扩展为一套**面向整个扩展功能集**的设计规范，并结合：

- v3 实际拥有的 Vue 组件集合（位于 `alpheios-core/packages/components/src/vue/components/`）
- v3 的状态机（Popup / Panel / Action Panel / Toolbar 四种 surface 的可见性由 Vuex store 控制）
- v3 用户配置（`uiOptions.maxPopupWidth`、`panelPosition` 等）

> **交付范围**：纯设计稿。本文档 + `doc/ui/mockups/` 下的 HTML 静态原型。落地由 `alpheios-core` 仓库或本仓库的 CSS 覆盖层完成。

---

## 1. 核心设计哲学

| 维度 | 决策 |
|---|---|
| **品牌人格** | 知识、前卫、精确 — 服务于古典语言学者，对密度容忍度高，对杂乱零容忍。|
| **风格基调** | 玻璃态（Glassmorphism）+ 极简（Minimalism）+ 终端美学（Terminal）的克制混合。|
| **隐喻** | 数字光台（Light Table）：内容从背景"透"上来，UI 是悬浮在网页之上的一层精密玻璃工具。|
| **核心交互模式** | **轻量浮层（Popup）→ 完整抽屉（Drawer）的可逆升级**，避免一上来就遮挡阅读区。|
| **信息密度** | 高（每屏可视字段多），但用空白、字重、字距形成层级，而不是用大字号。|

### 不做的事

- ❌ 不使用大色块、品牌渐变、立体阴影。这是工具不是消费产品。
- ❌ 不使用动态卡片悬浮、跳动徽章、装饰图标。
- ❌ 不在阅读区域之外保留任何 UI（toolbar 圆按钮例外，可关闭）。
- ❌ 不强制深色，但要预留 token，使主题切换是配置而非重写。

---

## 2. 表面分类（Surface Taxonomy）

整个扩展只有四个可见 surface，每个 surface 的职责严格分离：

| Surface | 触发 | 默认尺寸 | 角色 | 对应 Vue 组件 |
|---|---|---|---|---|
| **Toolbar (FAB)** | 扩展激活后常驻 | 44 × 44 px 圆形 | 唤起 Action Panel 的入口；可全局关闭 | `nav/toolbar-compact.vue` |
| **Popup** | 用户双击/选词 | 360 × auto，max-h 480 | 选词后第一时间出现的轻量浮层，紧贴选区 | `popup.vue` |
| **Action Panel** | 点击 Toolbar 或 Popup 右上"展开" | 380 × 100vh 抽屉 | 主要工作区；承载 Lookup、Morph、Inflections、WordList、Settings、Auth 等所有"页"| `panel-compact.vue` + `nav/action-panel.vue` |
| **Toast / Notification** | 系统主动反馈 | 自适应 | 错误、登录成功、保存到生词本等短反馈 | `notification-area.vue` |

> **重要约束**：Popup 和 Action Panel **不会同时出现**。任何时刻最多一个主 surface 占据焦点。Popup 升级为 Drawer 时，Popup 平移到屏幕右边缘并形变为 Drawer。

---

## 3. 布局系统

### 3.1 Popup（紧贴选区的浮层）

```
┌─────────────────────────────────────┐
│ [Al] arma                       ⤢ × │  ← 32px header（logo + word + 展开 + 关闭）
├─────────────────────────────────────┤
│ NOUN · NEUTER · PLURAL          LA  │  ← POS chips + 语言徽标
├─────────────────────────────────────┤
│ 1. arms, weapons, armor             │
│ 2. war, battle                      │  ← 简短定义最多 3 条
│ 3. tools, implements                │
├─────────────────────────────────────┤
│ ⊕ Add to list   ⤢ View full         │  ← 两个 affordance：收藏 / 升级抽屉
└─────────────────────────────────────┘
```

- **宽度**：默认 360px，受 `uiOptions.maxPopupWidth`（240–600）约束。
- **高度**：内容驱动，最大 480px，超出滚动。
- **位置算法**：优先在选区下方 8px；如果下方空间 < 200px，则浮在选区上方；如果横向溢出，水平贴齐视口右边缘 16px。
- **箭头**：1 个 6px 三角形，指向选区中心，颜色与 Popup 边框一致。
- **关闭**：① 点击外部 ② 选区消失 ③ 显式 ✕。

### 3.2 Drawer（Action Panel 完整态）

```
┌────┬────────────────────────────────────────┐
│ Al │ ALPHEIOS                       ⤡  ⋮  ✕ │  ← 44px topbar
│    ├────────────────────────────────────────┤
│ ⌕  │ ┌──────────────────────────────┐       │
│    │ │ 🔍 arma                      │       │  ← 永久搜索框
│ ⊕  │ └──────────────────────────────┘       │
│    │ ───────────────────────────────────── │
│ 🜲  │ arma                          LATIN   │  ← 当前结果区，按 sidebar tab 变化
│    │ NOUN · NEUTER · PLURAL                 │
│ 📖 │ ……（具体内容见各页设计）              │
│    │                                        │
│ 🌐 │                                        │
│    │                                        │
│ ⊞  │                                        │
│    ├────────────────────────────────────────┤
│ 👤 │ Add to list                       ⇗   │  ← 底部 footer actions（按页变化）
│ ⚙  │                                        │
└────┴────────────────────────────────────────┘
  64px              380px
```

- **总宽**：444px（64 sidebar + 380 内容）。
- **位置**：`uiOptions.panelPosition` 决定靠左 / 靠右。默认右侧。
- **高度**：100vh，相对视口固定。
- **可调整宽度**：右下角抓手，最小 380、最大 720。状态写入 store。
- **z-index**：高于 Popup，低于 Toast。
- **滚动**：内容区独立滚动，topbar / footer / sidebar 不滚。

### 3.3 Sidebar Nav（仅 Drawer 模式存在）

64px 宽，垂直栈布局。每个 tab 64×64 方形可点区域。

| 区位 | 图标 | 标签 (label-xs) | 对应视图 |
|---|---|---|---|
| 顶部品牌 | 字 "Al" | — | 点击回到 Lookup 默认 |
| Tab 1 | search | LOOKUP | 当前查词结果 |
| Tab 2 | menu_book | MORPH | 形态学（按 lemma 折叠） |
| Tab 3 | table_view | INFL | 变形表（适用时高亮） |
| Tab 4 | format_quote | USAGE | 用法示例（适用时高亮） |
| Tab 5 | account_tree | TREE | 依存树（适用时高亮） |
| Tab 6 | history_edu | GRAMMAR | 语法资源 |
| Tab 7 | bookmark | LIST | 生词本 |
| 底部 | account_circle | USER | 登录 / 用户 |
| 底部 | settings | OPTS | 设置 |

**激活态**：左侧 1.5px 实色短竖线（`top: 25%, bottom: 25%`）+ 背景 `bg-on-surface/10`。  
**禁用态**：opacity 0.35，cursor: not-allowed。所有非"始终可用"的 tab（如 INFL、TREE、USAGE）在没有数据时禁用，避免用户跳过去看到空白。

> 这与 v2 的"顶部水平 tab 栏"是分歧点。理由：垂直 sidebar 让"主区"独占完整高度，给变形表、生词本这种长内容更多呼吸空间；水平 tab 在 380px 宽度下塞不下 9 个图标。

---

## 4. 设计 Token

### 4.1 颜色

颜色采用 **Material 3 语义角色**命名，便于映射到 CSS variables 与 dark theme。

#### 浅色（默认）

```yaml
# 表面 / Background
surface:                       '#f9f9fb'   # 整体背景
surface-dim:                   '#d9dadc'
surface-bright:                '#f9f9fb'
surface-container-lowest:      '#ffffff'
surface-container-low:         '#f3f3f5'
surface-container:             '#edeef0'   # 卡片底
surface-container-high:        '#e8e8ea'
surface-container-highest:     '#e2e2e4'

# 文字
on-surface:                    '#1a1c1d'   # 正文
on-surface-variant:            '#4c4546'   # 副文/标签

# 玻璃 surface（透明）— 直接以 alpha 表达
glass-surface:                 'rgba(255, 255, 255, 0.55)'  # 主玻璃
glass-surface-low:             'rgba(255, 255, 255, 0.35)'
glass-border:                  'rgba(255, 255, 255, 0.6)'   # 高光边
glass-shadow:                  'rgba(0, 0, 0, 0.08)'

# 主色 / 强调
primary:                       '#000000'
on-primary:                    '#ffffff'
primary-container:             '#1b1b1b'
on-primary-container:          '#dcdcdc'

# 次级 / 静态信息
secondary:                     '#5e5e5e'
on-secondary:                  '#ffffff'
secondary-container:           '#e1dfdf'
on-secondary-container:        '#3a3a3a'

# 三级 / 数据强调（保留位）
tertiary:                      '#0e6b4f'   # 深祖母绿，用于"已收藏""正确解析"等正向信号
on-tertiary:                   '#ffffff'

# 错误 / 警告
error:                         '#ba1a1a'
on-error:                      '#ffffff'
error-container:               '#ffdad6'
on-error-container:            '#410002'
warning:                       '#7a5a00'
warning-container:             '#fff0b8'

# 边框 / 分隔
outline:                       '#7e7576'
outline-variant:               '#cfc4c5'
divider:                       'rgba(0, 0, 0, 0.06)'
```

#### 深色（预留变量，未做 mockup）

```yaml
surface:                       '#101113'
surface-dim:                   '#0a0b0c'
surface-bright:                '#1f2123'
surface-container-lowest:      '#0a0b0c'
surface-container-low:         '#1a1c1d'
surface-container:             '#1f2123'
surface-container-high:        '#252729'
surface-container-highest:     '#2c2e30'

on-surface:                    '#e3e3e5'
on-surface-variant:            '#c5c0c1'

glass-surface:                 'rgba(20, 22, 24, 0.55)'
glass-surface-low:             'rgba(20, 22, 24, 0.35)'
glass-border:                  'rgba(255, 255, 255, 0.08)'
glass-shadow:                  'rgba(0, 0, 0, 0.5)'

primary:                       '#ffffff'   # 反相
on-primary:                    '#000000'
secondary:                     '#a8a8a8'
on-secondary:                  '#1a1a1a'

tertiary:                      '#7fd4b1'
error:                         '#ffb4ab'
error-container:               '#5e1014'

outline:                       '#8d8587'
outline-variant:               '#4c4546'
divider:                       'rgba(255, 255, 255, 0.08)'
```

切换机制：在 `<html>` 或 Drawer 根上挂 `data-theme="dark"`，所有 token 通过 CSS 变量解引用。`uiOptions.theme` 可选 `auto | light | dark`，`auto` 跟随 `prefers-color-scheme`。

### 4.2 字体

**字体族**：单一使用 Inter（已通过 Google Fonts CDN 引入）；如未加载则回退到 `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`。

| token | font-size | line-height | weight | letter-spacing | 用途 |
|---|---|---|---|---|---|
| `display-word` | 22px | 28px | 600 | -0.02em | 抽屉里的目标词主标题 |
| `heading-sm` | 13px | 16px | 600 | -0.01em | 卡片/分组标题 |
| `body-sm` | 12px | 16px | 400 | 0 | 正文（定义、上下文等） |
| `body-md` | 13px | 20px | 400 | 0 | 阅读型长文（grammar、usage） |
| `data-mono` | 11px | 14px | 400 | -0.02em | 数据点（ending、词根、tag） |
| `label-xs` | 10px | 12px | 500 | 0.05em | uppercase 标签、tab 标题、metadata |
| `terminal-brand` | 10px | 12px | 800 | -0.02em | 顶栏品牌字 |
| `stats-display` | 18px | 24px | 600 | -0.01em | 设置面板里的 hero 数字（如生词数量）|

**目标语言文本**（拉丁语、希腊语、阿拉伯语等）使用 `font-family: 'Lato', 'Noto Serif', serif;`，并根据 `lang=` 自动应用方向（`Constants.LANG_DIR_RTL` → `dir="rtl"`，已在 word-list-panel.vue 见到）。

### 4.3 间距

```yaml
unit:                4px
tight-gap:           4px
element-gap:         8px
container-padding:   12px
stack-margin:        16px
section-padding:     24px

popup-width:         360px
popup-max-width:     600px
drawer-content:      380px
drawer-sidebar:      64px
toolbar-fab:         44px
topbar-height:       44px
footer-height:       48px
```

### 4.4 圆角

```yaml
sm:                  2px    # tag / chip
default:             4px    # data row、setting row
md:                  6px    # button
lg:                  8px    # input、icon button
xl:                  12px   # 卡片、popup
2xl:                 16px   # action panel 容器（仅 mobile）
full:                9999px # FAB、avatar
```

### 4.5 阴影 / 玻璃

不使用 `box-shadow` 模拟立体感，而是组合三层：

```css
.frosted-glass {
  background: var(--glass-surface);                /* token */
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid var(--glass-border);
  box-shadow:
    inset 0 1px 0 0 rgba(255, 255, 255, 0.4),       /* 内顶高光 */
    0 8px 32px 0 var(--glass-shadow);               /* 外漂浮影 */
}

.recessed-well {
  /* 用于 input / 内陷面板 */
  background: rgba(0, 0, 0, 0.05);
  box-shadow: inset 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.elevated-card {
  /* 用于 popup 内的引用框等"半浮起"卡 */
  background: var(--surface-container-lowest);
  border: 1px solid var(--outline-variant);
}
```

> 在 dark theme 下 `inset` 高光改成 `rgba(255,255,255,0.06)`，避免太亮。

### 4.6 动效

| token | duration | easing | 用途 |
|---|---|---|---|
| `motion-fast` | 120ms | `cubic-bezier(0.2, 0, 0, 1)` | hover、按压回弹 |
| `motion-base` | 200ms | `cubic-bezier(0.2, 0, 0, 1)` | tab 切换、popup 出现 |
| `motion-slow` | 320ms | `cubic-bezier(0.2, 0, 0, 1)` | popup → drawer 形变 |
| `motion-emphasized` | 480ms | `cubic-bezier(0.05, 0.7, 0.1, 1)` | drawer 进入 / 离开 |

所有动效在 `prefers-reduced-motion: reduce` 下退化为 60ms 的纯 `opacity`。

---

## 5. Popup → Drawer 状态机

```
              ┌────────────────────────┐
   selectText │                        │ click ⤢
   ┌─────────►│         POPUP          │──────────┐
   │          │  (anchored to caret)   │          │
   │          └────────────────────────┘          │
   │              │                                │
   │ click outside│ esc                            ▼
   │              │                       ┌────────────────────────┐
   │              ▼                       │                        │
   │          ┌──────┐                    │        DRAWER          │
   │          │ HIDDEN│◄───────────── ✕ ──│  (anchored to viewport)│
   └──────────└──────┘                    │                        │
                                          └────────────────────────┘
                                              ▲          │
                                              │ click ⌕  │ deactivate
                                              └──────────┘
```

**关键过渡**：

1. **POPUP → DRAWER**（`motion-slow`）  
   - Popup 容器同时执行：`translate` 到右边缘 + `scale` 高度到 100vh + `width` 380px。  
   - sidebar 从 `translateX(-100%)` 滑入，`motion-emphasized`。  
   - Popup 内的查询结果保持挂载，避免闪烁。

2. **DRAWER → POPUP**（不在产品里默认提供，避免误操作）  
   - 只能通过 ✕ 关闭整个 surface，下一次选词重新生成 Popup。

3. **Toolbar → DRAWER**（无 popup 中间态）  
   - 点击 FAB 直接打开 drawer，sidebar 默认聚焦在 LOOKUP（如有上次结果）或 USER/SETTINGS（无结果）。

---

## 6. 组件库

### 6.1 顶栏 / TopAppBar

44px 高，半透明玻璃，sticky。

```
┌────────────────────────────────────────────────────┐
│ ALPHEIOS · LATIN                       ⤡  ⋮  ✕    │
└────────────────────────────────────────────────────┘
```

- 左：`label-xs uppercase tracking-widest` 品牌名 + 语言代码（`LATIN` / `GREEK` / `ARABIC`）。
- 右：① 折叠到 toolbar（不销毁状态） ② 溢出菜单 ③ 关闭。
- Drawer 中此栏跨越整个 380px，sidebar 顶部独立有 32px 品牌格。

### 6.2 搜索框 / Search Input

```
┌────────────────────────────────────────┐
│ 🔍  arma                            ⌫  │
└────────────────────────────────────────┘
```

- `recessed-well` 风格，无边框，focus 时 `ring-1 ring-on-surface/15`。
- 32px 高，左 placeholder 图标 16px。
- 支持语言下拉切换（在右侧 chip）。
- Enter 提交；Esc 清空；带 history dropdown（最近 8 个查询）。

### 6.3 词卡 / Word Card

```
arma                                            LATIN
NOUN · NEUTER · PLURAL  ✓ recognized
```

- 主标题用 `display-word`。
- POS chips 用 `label-xs uppercase`，外框 `outline-variant`，1.5px 间隔由 middle dot 区分（避免堆 5 个独立 chip）。
- 语言徽标用 `secondary-container` 圆角 chip。
- "✓ recognized" 是状态标记，可选；用 `tertiary` 色。

### 6.4 定义列表 / Definition List

```
1.  arms, weapons, armor, especially of a warrior or soldier
2.  war, battle, strife; military power or force
3.  tools, implements, equipment (esp. for farming or nautical use)
```

- 序号用 `data-mono`，灰度 0.6。
- 条目之间用 1px `divider` 分隔。
- 长定义可折叠（点击 "show more"）。

### 6.5 形态分解 / Morph Block

每个 lemma 一个折叠组：

```
arma  · NOUN · 2nd declension                ▾
├ Root              arm-
├ Ending            -a
├ Case              nominative · accusative · vocative
└ Number            plural

armō (variant)                               ▸
```

- 列表行 `data-mono`，左 label 灰度 0.6，右 value 黑。
- 多个候选 lemma 时第一个默认展开，其余折叠。
- 行可悬浮显示 footnote（用 alph-tooltip）。

### 6.6 变形表 / Inflection Table

- 表格 max-width 由 drawer 内宽决定，超出横向滚动。
- 表头采用 `surface-container-high`，行交替 `surface-container-low / lowest`。
- 高亮当前 form：背景 `tertiary/10`，左侧 1.5px `tertiary` 竖线。
- 单元格点击展开 footnote。
- 顶部有 part-of-speech / view 切换 segmented control。

### 6.7 引用卡 / Citation Card

```
┌──────────────────────────────────────┐
│ IN CONTEXT                           │
│                                      │
│ Arma virumque cano, Troiae qui       │
│ primus ab oris...                    │
│                                      │
│ — Virgil, Aeneid 1.1     View Full → │
└──────────────────────────────────────┘
```

- `elevated-card` 风格。
- 命中词背景 `primary/5`，下划线 `primary/20`。
- 引用文本 `body-md italic`。
- "View Full" 是 text-only 链接按钮。

### 6.8 设置行 / Setting Row

```
Panel position                                 Right ▾
Show short definitions                              ●○
Auto-open popup on selection                         ●●
```

- 一行一项，左 label `body-sm`，右控件。
- 控件类型：toggle、segmented、select、slider、radio。
- 分组用 `heading-sm` + 16px 上间距。
- 分组之间用 `divider`。

### 6.9 按钮

| 类型 | 样式 |
|---|---|
| **Primary** | `bg-primary text-on-primary`，6px 圆角，`label-xs uppercase tracking-widest`，38px 高。例：「Add to list」 |
| **Secondary (outline)** | 透明底，`outline` 边框，6px 圆角，hover `bg-on-surface/5`。例：「View Full」 |
| **Ghost / Text** | 无背景无边框，`label-xs uppercase`，hover 加下划线。例：「Switch language」 |
| **Icon Button** | 32×32 方形，`bg-on-surface/0` → hover `/5` → active `/10`。例：sidebar tabs |
| **FAB** | 44×44 圆形，`primary` 底，drop-shadow。 |

所有按钮 active 态 `scale(0.98)`。

### 6.10 Tab 切换器

两种形态：

- **垂直 sidebar tab**（drawer 主导航，见 §3.3）。
- **水平 segmented**（用于 Settings 顶部 `UI / Features / Resources / Advanced`）：
  - 32px 高，`recessed-well` 底，激活项 `surface-container-lowest` + `outline-variant` 边框。

### 6.11 状态：Loading / Empty / Error

| 场景 | 视觉 |
|---|---|
| **lexical 加载** | 顶部 2px 进度条（`primary` 色，`indeterminate`），定义区显示 3 行 skeleton。|
| **无语言数据** | 中央插画位置留空（不画装饰图），单行 `body-sm` 灰度 0.6 + "Configure languages →" 链接。|
| **无查询结果** | 同上，文案变为 "No entry found for «arma». Try a different form or check the language." |
| **网络/认证错误** | 顶部 inline banner，`error-container` 底，`error` 文本，可关闭。|
| **嵌入库冲突**（Alpheios already on page） | 全 drawer 接管为提示态，仅一个文本块 + 「禁用扩展」链接。|

### 6.12 Toast / Notification

```
┌──────────────────────────────────────┐
│ ✓  Word saved to your list           │
│    arma · Latin · just now           │
└──────────────────────────────────────┘
```

- 右下角，距视口 16px。
- 自动消失 3.5s，hover 时暂停。
- 玻璃风格，左色条标识种类（success = tertiary，error = error，info = secondary）。

### 6.13 Tooltip

- 黑底（`primary` token），白字 `label-xs uppercase`。
- 6px 圆角，6px 内边距。
- 出现延迟 400ms，消失即刻。
- 三角箭头 4px。

---

## 7. 各页设计要点

### 7.1 Lookup（默认页）

**结构**：搜索框 → 词卡 → 形态分解（默认展开 1 个 lemma）→ 简短定义 → 引用 → 底部 actions。

**底部 actions**：「Add to list」（primary）+ 「Share」icon button。

**变体**：未登录时定义区下方插一个 inline 提示卡 "Log in to save and sync your word list →"，可关闭（写入 `uiOptions.hideLoginPrompt`，与 v3 已有的 setting 一致）。

### 7.2 Morph

仅在 lookup 命中后可用。把 lookup 的形态部分单独占满 drawer 高度，提供：

- 多 lemma 切换 segmented。
- 每个 lemma 完整 morph 数据 + Principal Parts + Lemma Translation（如有）。
- 顶部小型搜索框依然保留（同步 lookup 状态）。

### 7.3 Inflections / Inflections Browser

两种模式：

- **基于命中词的 Inflections**：上方 part-of-speech / view 切换 → 表格 → 脚注。命中 form 高亮。
- **Browser**（无命中词时）：上方 3 段 segmented：① Language ② Part of speech ③ Paradigm，三段确定后渲染表格。

> 这里和 v2 一致，但 layout 收紧到单列。表格本身 `overflow-x: auto`，避免抽屉宽度被表格撑大。

### 7.4 Word List（生词本）

**结构**：

```
[ 🔍 filter words... ]                          [ ⇣ Export ]

▾ LATIN  (24)              [ Sort: A-Z ▾ ]      [ ⊞ Bulk ]
  arma            noun · neuter             ✕
  bellum          noun · neuter             ✕
  …

▸ GREEK  (12)
▸ ARABIC (3)
```

- 顶部 filter 输入（recessed-well）+ Export 按钮。
- 按语言分组，每组可折叠（默认展开第一组）。
- 每行：词、词类标签、删除按钮。
- 行点击进入"上下文视图"（替换主区，顶部加返回箭头）。
- 上下文视图：列出该词在用户添加时所属的引文，每条引文 `elevated-card`。
- Bulk 模式：行左侧出 checkbox，底部 actions 变为 "Delete N selected" / "Export N selected"。

### 7.5 Word Usage Examples

按 author / work 分组，每组下列出 ≤ 5 个例句，可"View more"。每条例句：引文 + 来源 + 时间。顶部 filter chips（按 author / work / source）。

### 7.6 Grammar

资源列表 → 阅读视图。资源列表是 `surface-container-lowest` 卡片，hover 抬升。阅读视图沿用 alpheios-core 现有 HTML，仅注入新的字体、链接色、间距。

### 7.7 Treebank

依存树查看器。关键设计：

- 顶部 `句子定位条`（前/后句切换 + 句号定位）。
- 中央 SVG 树，节点用 `data-mono` 文字，连线 `outline-variant`，命中节点 `tertiary` 高亮。
- 缩放控件：右下角 +/-。

### 7.8 Settings

顶部水平 segmented 切换 4 类：

| Tab | 内容 |
|---|---|
| **UI** | font size、popup max width、panel position、theme（auto/light/dark）、hide login prompt。|
| **Features** | feature toggles：word usage examples、treebank、collapse short definitions、auto-lookup-on-select 等。|
| **Resources** | 各语言的字典与语法资源选择（multi-select 列表）。|
| **Advanced** | log level、cache 清理、developer mode、build info。|

每个 tab 内部用 §6.8 描述的 setting row 模式。底部固定 "Save / Reset"（仅在有变更时出现）。

### 7.9 Auth — Login / User

**未登录态**：drawer 主区是一张居中卡：

```
        ┌──────────────────────┐
        │   Sign in to sync    │
        │   your word lists    │
        │                      │
        │  [   LOG IN  →   ]   │
        │                      │
        │  Powered by Auth0    │
        └──────────────────────┘
```

**已登录态**：

```
[avatar 64×64 circle]
Jane Doe
jane@example.com

──────
24  words saved
3   languages

──────
[ Log out ]
```

---

## 8. 可访问性 & 国际化

- **键盘**：`Tab` 顺序：sidebar → topbar 右侧 → 主区 → footer。`Esc` 关闭 popup / drawer。`/` 快速聚焦搜索框。
- **焦点环**：所有可聚焦元素 `outline: 2px solid var(--primary); outline-offset: 2px;`，高对比模式下保留。
- **ARIA**：sidebar tabs `role="tab"`，主区 `role="tabpanel"`，popup `role="dialog" aria-modal="false"`，drawer `role="complementary"`。
- **i18n**：所有 label 走 `l10n.getMsg(KEY)`（v3 已有的机制）。RTL 语言（阿拉伯语）整体 mirror，sidebar 切换到右侧，content 区 `dir="rtl"`。
- **字号缩放**：根字号通过 `uiOptions.fontSize` 1x → 1.5x，所有 token 用 `rem` 而非 `px`（实现注意）。
- **配色对比**：所有正文 / 控件文本 ≥ 4.5:1（WCAG AA）。
- **减弱动效**：`prefers-reduced-motion: reduce` 时全部退化（见 §4.6）。

---

## 9. 与 v3 状态/数据的映射

| 设计元素 | 数据来源 |
|---|---|
| 当前查询词 | `$store.state.app.targetWord` |
| 选中文本（popup 顶部） | `$store.state.app.selectedText` |
| 加载态 | `$store.getters['app/lexicalRequestInProgress']` |
| 已认证 | `$store.state.auth.isAuthenticated` |
| 启用登录功能 | `$store.state.auth.enableLogin` |
| 形态数据就绪 | `$store.state.app.morphDataReady` |
| 完整定义就绪 | `$store.getters['app/fullDefDataReady']` |
| 变形表数据存在 | `$store.state.app.hasInflData` |
| 用法示例启用 | `$store.state.app.wordUsageExampleEnabled` |
| 依存树数据 | `$store.state.lexis.hasTreebankData` |
| 生词本启用 | `$store.state.app.hasWordListsData` |
| Popup 可见 | `$store.state.popup.visible` |
| Panel 可见 | `$store.state.panel.visible` |
| Action Panel 可见 | `$store.state.actionPanel.showLookup / showNav` |
| Toolbar 可见 | `$store.state.toolbar.visible` |
| 嵌入库冲突 | `state.isEmbedLibActive()`（content.js 已处理） |
| Panel 位置 | `uiOptions.panelPosition` |
| Popup 最大宽度 | `uiOptions.maxPopupWidth` |
| 隐藏登录提示 | `uiOptions.hideLoginPrompt` |

---

## 10. 实现注意事项

1. **不破坏 v3 状态机**：本设计不要求改变 Vuex store 形状，只重写 template / scss。
2. **Action Panel 与 Drawer 合并**：v3 当前的 `action-panel.vue` 是一个独立浮窗，本设计建议把它合并进 `panel-compact.vue` 的 sidebar 顶部入口；保留 store 字段以兼容 mobile 模式。
3. **Toolbar FAB 的可关闭性**：建议在 Settings → UI 增加 `showToolbarFab` 开关，默认 true。
4. **样式入口**：本仓库 `update-styles` 脚本拷贝 `alpheios-core/packages/components/dist/style/style-components.css`。要落地新设计，建议两步走：
   - **一期**（CSS 覆盖层）：在 `src/styles/alpheios-overrides.css` 写覆盖样式，通过 `web_accessible_resources` 注入。能改外观 70%，无法改 DOM 结构。
   - **二期**（上游 Vue 组件改造）：在 alpheios-core 仓库重写 panel/popup 模板，使其与本规范结构一致。
5. **Glassmorphism 兼容性**：`backdrop-filter` 在 Firefox ≥ 103 / Chrome ≥ 76 / Safari ≥ 9 已支持；老 Safari 退化时用纯白 0.92 alpha。
6. **嵌入库（embed lib）警告**：`AppController.getEmbedLibWarning()` 当前直接 append 到 body。建议把该警告也用本设计的 Toast 风格重写，以保持一致性。

---

## 11. 设计稿索引

`doc/ui/mockups/` 下的 HTML 静态原型按照本规范产出，每个文件可独立用浏览器打开预览：

| 文件 | 覆盖内容 |
|---|---|
| [`mockups/index.html`](mockups/index.html) | 总览 / 跳转 |
| [`mockups/popup-states.html`](mockups/popup-states.html) | Popup 4 状态：默认 / 加载 / 无结果 / 错误 |
| [`mockups/drawer-lookup.html`](mockups/drawer-lookup.html) | Drawer：Lookup 主页（含形态、定义、引用） |
| [`mockups/drawer-inflections.html`](mockups/drawer-inflections.html) | Drawer：Inflections 表 + Inflections Browser |
| [`mockups/drawer-wordlist.html`](mockups/drawer-wordlist.html) | Drawer：Word List + 上下文视图 |
| [`mockups/drawer-resources.html`](mockups/drawer-resources.html) | Drawer：Word Usage / Grammar / Treebank |
| [`mockups/drawer-settings.html`](mockups/drawer-settings.html) | Drawer：Settings 4 个 tab |
| [`mockups/drawer-auth.html`](mockups/drawer-auth.html) | Drawer：未登录 / 已登录 |

旧的单页参考 `code.html` / `screen.png` 保留作为最初的灵感来源。
