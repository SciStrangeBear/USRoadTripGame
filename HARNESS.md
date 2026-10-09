# 美国自驾游戏 MVP · Agent 与验证 Harness

## 工作边界

本游戏是独立静态产物，源路书只读。总负责 Agent 实现界面与游戏引擎；数据 Agent 从现有路书整理不含时间信息的地点顺序；QA Agent 独立编写行为测试。文件职责分开，整合后统一验收，避免并行 Agent 覆盖彼此的实现。

## 最小可重复反馈环

采用纯函数/状态模块加 Node 内建测试运行器验证驾驶逻辑，并以真实 Chromium 浏览器验证键盘、触屏按钮和页面呈现。无需引入游戏引擎、构建工具或测试框架依赖。

在 `roadtrip-game` 目录运行：

```powershell
node --test tests/engine.test.mjs
```

测试覆盖：独立旅程状态、非法地点数据、多站穿越、倒车、到站事件重置、精确站点处起步、两端限制、可逆完成状态、不同帧数下的一致结果，以及坐标与车辆方向插值。

约定：`position` 为连续地点索引；`advance` 原地更新状态，事件仅包括本次移动经过的整数站点；已发现地点单调累积。帧率一致测试使用能够精确表示的四分之一增量，避免把浮点误差误判为行为错误。

## 浏览器验收

在另一终端启动本地服务后运行：

```powershell
node tests/browser-smoke.mjs
```

默认访问 `http://127.0.0.1:4178`，可用 `GAME_URL` 环境变量覆盖。`PLAYWRIGHT_MODULE`、`CHROME_PATH` 可覆盖本机依赖路径。脚本加速浏览器时钟，通过真实键盘和指针事件驾驶；只读 `window.__roadtrip.snapshot()` 获取结果，不直接修改游戏状态。桌面和移动截图输出到 `artifacts` 目录。

通过本地 HTTP 服务载入游戏后检查：

1. 首屏显示卡通美国地图、路线、车辆和出发地点；无控制台错误、失败的静态资源或水平溢出。
2. 按住 `W` / `↑` 持续前进，释放即停；`S` / `↓` 倒退；箭头键不会滚动页面。
3. 到达地点更新卡通标志和地点文字；按路线顺序验证至少三个地点。
4. 长距离前进不漏站；返回已到地点保持已发现状态；首尾不会驶出路线。
5. 浏览器失焦或切到其他标签页后不留下卡住的按键状态。
6. 手机尺寸可见地图和前后移动按钮；按住、松开、取消触摸均能正确控制。
7. 页面不显示日期、日程天数或出发到达时间；顺序与现有路书核对。

以上为完整验收清单；实际自动化执行范围见下方记录。

### 已执行记录

- 2026-10-10：`node --test tests/engine.test.mjs`，8 个测试全部通过。
- 2026-10-10：bundled Playwright 模块成功导入，`chromium.launch` API 可用。
- 2026-10-10：真实 Chrome 浏览器 smoke 全部通过：`W/S` 与上下箭头驾驶、键盘松开停止、窗口失焦释放、指针按住与释放、重置、路线首尾边界、36 站全部发现、完成后倒车解除完成、390px 手机宽度无横向溢出，以及零控制台/资源错误。
- 2026-10-10：发现并由整合 Agent 修复本地服务静态路径判断的问题；修复后重跑上述浏览器测试全部通过。
- 2026-10-10：已人工查看 `artifacts/desktop.png` 与 `artifacts/mobile.png`，地图、车辆、信息卡与操作按钮呈现正常。完整路线测试用 Playwright 时钟逐帧执行，可能需要数分钟。
- 2026-10-10：定向检查通过：实际驾驶抵达雷丁后地点标题更新为“雷丁”；路线弹窗正确打开、列出 36 项并能关闭。重置后的手机截图增加 350ms 时钟推进并移除按钮焦点，等待进度条 CSS 过渡结束后重新生成。

## 本机能力

环境发现于 2026-10-10：Node `v24.19.0` 可直接使用。项目无 npm 依赖；桌面 bundled runtime 提供 Playwright，可用绝对路径导入，无需下载浏览器：

```js
import { chromium } from 'file:///C:/Users/Panda/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
```

本机也有 Microsoft Edge。上述路径仅用于当前工作站；其他环境可提供自己的 Playwright 与 Chromium 路径。
