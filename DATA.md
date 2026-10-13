# 路线数据

`dist/route-data.js` 从「横穿美国」行程（`trip-usa-roadbook`）提取。已通过正式 Sites 权限只读取得的线上快照 `roadtrip-game/roadbook-source.json` 核对完整的 34 条 `days` 和 42 个 `places`：与 `roadbook/.local-data/roadbook.json` 相比，只有每条行程的内部 `id` 不同，日期、标题、距离、备注、类型、起终点、途经点和全部坐标均一致。线上快照已被 Git 忽略，不随游戏发布。

生成脚本优先读取上述线上快照；快照不存在时使用本地路书。地点经纬度直接来自行程的 `places`，行驶顺序来自 `days` 的 `from → via → to`。另已对照 `roadbook/dist/app.js` 的默认路书，地点顺序、类型与途经地点一致。

- 只提取美国境内自驾，不包含上海往返的国际航班。
- 合并连续重复地点；最后返回洛杉矶作为独立终点保留。
- 包含路书显式标注的全部 `via` 地点；停留日景点并入对应城市的说明。
- 导出的游戏数据没有日期、时刻、距离或行车时长。
- 图标为表现性 emoji；地点中文与英文标签用于游戏展示。
- 当前游戏行驶路线使用路书已缓存的真实公路几何，不再以地点之间的直线代替。

路书备注中的斯波坎、科罗拉多斯普林斯、Point Loma，以及停留日的波音工厂、飞行博物馆、丰田中心、太空中心和中途岛号博物馆，没有作为独立 `via` 点插入，而是保留在相关地点说明中。Western Museum of Flight 只被原路书标为「原图另列」，没有确定的途经顺序或地点坐标，因此暂不新增游戏站点。

更新线上快照（或在没有快照时更新本地路书）后，在仓库根目录执行 `node roadtrip-game/scripts/extract-route.mjs` 可重新导出。新增未知地点时，脚本会要求补充展示标签；地图投影由游戏端处理。

## 公路轨迹

执行 `node roadtrip-game/scripts/build-road-route.mjs`，按路书 `from:via:to` 顺序读取 `roadbook/dist/routes.json` 的全部 24 段道路缓存。缓存合计 109,926 个连续且去除段间重复端点的坐标；相邻段端点必须完全一致，缺失或断开的路段会使生成失败，不会补画站点直线。投影为 `x = 100 + (lon + 125) × 27`、`y = 75 + (50 − lat) × 28`。

各途经点映射到所属路段上最近的连续道路投影点；城市起终点使用该路段的道路吸附端点，避免环线交叉或往返路线误匹配。36 个有序站点的道路位置作为强制保留顶点。分段 RDP 简化容差为 0.075 地图单位，输出 2,880 个点；测试检查所有原始道路顶点与相应简化路段的误差不超过 0.08 地图单位。

`dist/road-route.json` 包含投影后 `points`、与 `stops` 对齐的 `stopIds` / `stopDistances` / `stopIndices`、24 段 `legs` 及来源信息。弧长单位为投影后的地图单位，不是公里。`dist/road-geometry.js` 的 `buildRoadGeometry(data)` 提供沿公路采样 `sample(distance)`（角度制朝向），以及连续站点索引与弧长的双向转换 `positionAt(distance)` / `distanceAt(position)`。路线表达基于缓存道路，不包含实时封路、交通或导航服务。
