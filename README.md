# 一路向野 · 美国自驾小游戏

独立的浏览器游戏 MVP。Three.js 立体卡通场景呈现美国西部与中部；沿路书缓存的 24 段真实公路轨迹驶过 36 个停靠点，最后回到洛杉矶。没有日期或行车时间。

## 体验

- 按住 ↑ / W 前进，↓ / S 后退；松开停下。
- 触屏可按住地图下方的方向按钮。
- 抵达地点会短暂停留，更新地点明信片、卡通标志与足迹收集。
- 可以查看完整路线或重新出发。当前进度仅在本次页面会话中保留。
- 全程斜视与跟车视角可切换，拖动旋转、滚轮缩放。
- 小车由车身、车窗、四个车轮构成；倒车时沿公路后退，不掉头。

## 本地运行

需要 Node.js，运行 `npm start`，打开 `http://127.0.0.1:4178`。无安装或构建步骤。

`npm test` 运行游戏引擎测试。浏览器验证方式见 [HARNESS.md](HARNESS.md)。

## 实现

- `dist/route-data.js`：路书数据的独立快照，来源与选点规则见 [DATA.md](DATA.md)。
- `dist/scene3d.js`：Three.js 透视相机、立体地形、小车与公路。
- `dist/road-route.json`：从原路书的 OSRM 缓存生成的完整公路轨迹。
- `dist/road-geometry.js`：沿折线弧长采样、站点距离映射、车头朝向。
- `dist/engine.js`：可测试的路线状态、到站事件与插值。
- `dist/app.js`：键盘、指针、动画和地点卡片。
- `dist/index.html` / `dist/style.css`：响应式界面。

路线来自原路书的 OSRM / OpenStreetMap 公路缓存，轻度简化后保留道路形状；不重新按站点画直线。场景地形、海拔和车辆比例是卡通表现，不代表真实高程或导航信息。当前版本不自动同步路书后续修改。

Three.js 固定为 0.180.0，并随站点本地提供；许可见 `dist/vendor/THREE-LICENSE.txt`。运行时无需外部 CDN。参考 [Three.js 安装文档](https://threejs.org/manual/pages/installation.html)。

## 多 Agent 协作

主 Agent 负责界面、游戏整合与发布；路线 Agent 负责路书整理；地图 Agent 负责 SVG 视觉；QA Agent 独立实现测试和浏览器验收。各 Agent 写入不同文件，通过共享模块接口整合。
