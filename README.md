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

路线来自原路书的 OSRM / OpenStreetMap 公路缓存，轻度简化后保留道路形状；不重新按站点画直线。地形来自公开海拔数据，经采样、平滑和适度纵向夸张后呈现山脉、高原与平原；车辆比例为卡通表现。当前版本不自动同步路书后续修改。

Three.js 固定为 0.180.0，并随站点本地提供；许可见 `dist/vendor/THREE-LICENSE.txt`。运行时无需外部 CDN。参考 [Three.js 安装文档](https://threejs.org/manual/pages/installation.html)。

## 多 Agent 协作

主 Agent 负责界面、游戏整合与发布；路线 Agent 负责路书整理；地图 Agent 负责 SVG 视觉；QA Agent 独立实现测试和浏览器验收。各 Agent 写入不同文件，通过共享模块接口整合。

### 白色 XC60 模型

车辆在 `dist/xc60.js` 中由原创 Three.js 几何体构成，采用 Q 版短胖比例；外观参考 [Volvo XC60 官方页面](https://www.volvocars.com/us/cars/xc60/)，并非精确工业模型。运行 `node tests/xc60-preview.mjs` 可生成游戏内及前后视角预览。


### 海拔概化地形

数据来自 [Mapzen / Tilezen Terrain Tiles（AWS Open Data）](https://registry.opendata.aws/terrain-tiles/)，于 2026-10-14 读取 zoom 5 的 Terrarium 瓦片。通过 0.25° 网格和一次 3×3 平滑保留大尺度地势，三角网约 2.2 万面；道路、车辆、地标和镜头复用同一地表高度。地表起伏采用每 55 米对应一个场景单位的表现比例，并非等比例测绘。

`dist/terrain-data.json` 随站点本地发布；运行时不请求外部地形服务。`scripts/build-terrain.mjs` 可重生成数据；需要 pngjs，当前工作站使用 bundled runtime，其他环境可设置 PNGJS_MODULE。来源说明与许可见 [Tilezen attribution](https://github.com/tilezen/joerd/blob/master/docs/attribution.md)。陆地轮廓为简化示意，地形边界范围沿用游戏地图。
