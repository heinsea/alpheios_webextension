# P0 手动烟测步骤（3-5 分钟）

## 前置
1. 在项目根目录执行：
   - `npm run build-dev`
   - `npm run verify:p0`
   - `npm run verify:worker-safe`
2. 打开 `chrome://extensions`，开启开发者模式。
3. 删除旧的 Alpheios 扩展后，重新加载 `dist/`。

## 测试步骤
1. 打开 `https://example.com`，点击工具栏中的扩展图标。
   - 期望：图标点击直接触发 background `browserActionListener`，Alpheios 在当前页激活；图标徽标显示 `On`。
2. 再次点击图标。
   - 期望：状态切换回未激活，徽标消失，无报错。
3. 激活后，在页面上点击右键 → 选 `Open Info Panel`。
   - 期望：信息面板动作生效。
4. 打开 `http://example.com`，重复步骤 1-3。
   - 期望：行为与 `https` 页面一致。
5. 打开 `chrome://extensions` 或任意扩展页。
   - 期望：扩展不会在受限页面注入脚本（不应有内容脚本效果）。
6. 在浏览器中重启（全部窗口关闭后重新打开），再次打开任意网页并点扩展图标。
   - 期望：service worker 可恢复，激活/停用切换正常。

## 记录模板
- 日期：2026-4-23
- 浏览器版本：Google Chrome 147.0.7727.102
- 结果：正常
- 失败步骤编号：
- 控制台关键报错（如有）：
