# RhineLabUI 交互档案动效：第一方源码对照

研究日期：2026-10-19。只研究动效，不采用该项目配色。以下是 `main` 分支当前源码的交互逻辑；开场影片的固定时间轴与用户点击交互必须区别处理。

## 直接结论

原作的空间感来自 **真实三维档案阵列、卡片垂直抽取、相机逐步绕向正面和前移、雾化材料及文档共同解密**。不是把二维档案卡从斜角转正、放大后直接显示全部文字。源码明确将抽取与构图区分：卡片抽取只改变高度，构图变化交给相机。进入详情时卡片本身没有自动 Y 轴转正动作；Y 轴旋转来自进入可检查状态后用户的横向拖动。[scene.ts 模型变换与镜头](https://github.com/LBEILC/RhineLabUI/blob/main/src/scene.ts#L1495-L1654)

## 状态与实际参数

| 环节 | 真实实现与参数 | 源码 |
|---|---|---|
| 阵列 | 池为 9 列 × 32 行；列距 5.2、行距 0.62；位置 `((lane-2)*5.2, -4.6, (row-15.5)*.62)`，同时叠加连续的相邻肩部场。不是平铺图片网格。 | [archive-loop.ts](https://github.com/LBEILC/RhineLabUI/blob/main/src/archive-loop.ts#L6-L10)、[scene.ts cellPosition](https://github.com/LBEILC/RhineLabUI/blob/main/src/scene.ts#L666-L671) |
| 悬停 | 额外抬升 0.28；逐帧混合系数 `1-exp(-14*dt)`；离开后降回 0。 | [scene.ts 悬停](https://github.com/LBEILC/RhineLabUI/blob/main/src/scene.ts#L1247-L1254) |
| 预览选中 | 目标抬升 0.4；肩部焦点临界阻尼 rate 5，列焦点 rate 4；横纵轨道 rate 3.7。选中新的档案时，旧档案以独立副本继续归位。 | [scene.ts select](https://github.com/LBEILC/RhineLabUI/blob/main/src/scene.ts#L710-L775)、[scene.ts 阻尼](https://github.com/LBEILC/RhineLabUI/blob/main/src/scene.ts#L1258-L1264) |
| 点击详情 | `setMode('detail')` 设置 `targetDetail=1`，激活解密控制器；垂直抽取目标 `INSPECTION_LIFT=4.05`，临界阻尼 rate 4.2。 | [scene.ts setMode](https://github.com/LBEILC/RhineLabUI/blob/main/src/scene.ts#L575-L600)、[scene.ts lift](https://github.com/LBEILC/RhineLabUI/blob/main/src/scene.ts#L1386-L1413)、[motion.ts](https://github.com/LBEILC/RhineLabUI/blob/main/src/motion.ts#L90-L113) |
| 镜头启动 | 进入时 `cameraTarget=smooth((lift-.8)/2.4)`；detail 用 `1-exp(-2.8*dt)` 逼近 cameraTarget。先抬升，再自然带起镜头，不用固定毫秒延迟触发镜头。smooth 为五次 smootherstep。 | [scene.ts](https://github.com/LBEILC/RhineLabUI/blob/main/src/scene.ts#L1218-L1225)、[scene.ts](https://github.com/LBEILC/RhineLabUI/blob/main/src/scene.ts#L1416-L1428) |
| 详情可旋转 | 需 `detail>.9`、脉冲强度 `<.01`、卡片与邻卡净空 `>.3`，且 targetDetail 为真。横拖增加 `deltaX*.004`，限制在 `[-.8,.8]` 弧度。 | [scene.ts 拖动](https://github.com/LBEILC/RhineLabUI/blob/main/src/scene.ts#L1097-L1103)、[scene.ts 门槛](https://github.com/LBEILC/RhineLabUI/blob/main/src/scene.ts#L1724-L1747) |
| 返回 | 保存绝对 Y；旋转先按 `angle*=exp(-7*dt)` 归零，绝对值 ≤ .001 时置零；对齐期间冻结升降速度、保持高度。对齐后才下降，主卡降至预览 0.4，旧副本降到 0，副本下降 rate 4.5。解密画面停止，清晰度按 rate 9 消退。 | [motion.ts returnStep](https://github.com/LBEILC/RhineLabUI/blob/main/src/motion.ts#L90-L113)、[scene.ts](https://github.com/LBEILC/RhineLabUI/blob/main/src/scene.ts#L1386-L1422)、[scene.ts](https://github.com/LBEILC/RhineLabUI/blob/main/src/scene.ts#L1437-L1466)、[decryption.ts](https://github.com/LBEILC/RhineLabUI/blob/main/src/decryption.ts#L120-L179) |

`damp` 是带速度状态的解析临界阻尼，并非普通 lerp：令 `delta=value-target`、`impulse=velocity+rate*delta`、`decay=exp(-rate*dt)`，下一帧 value 为 `target+(delta+impulse*dt)*decay`，velocity 为 `(velocity-rate*impulse*dt)*decay`。[motion.ts damp](https://github.com/LBEILC/RhineLabUI/blob/main/src/motion.ts#L100-L113)

## 相机：互动模式的轨迹

互动时 `shot` 固定为 29.1，只用于求已完成开场后的基准；不是把开场镜头时间轴作为点击动画重播。此时 orbit、settle 均为 1，因此预览 yaw 为 59°，elevation 为 19°，镜头到目标距离为 140，可见垂直跨度 7.33，基础目标 `(-1.091,-.045,.481)`。进入详情后：

- viewDirection 从 `(-sin(59°)*cos(19°), sin(19°), cos(59°)*cos(19°))`，按 detail 混合到 `(-.277,.238,.931)` 后归一化。
- 距离按 detail 从 140 插值至 72；跨度从 7.33 插值至 5.9，窄屏再依 `archiveFraming` 重构图。
- 详情目标为当前 model.position 加 `(0,1.85,0)`，再依据右向量、上向量和视口偏移；桌面档案中心目标在 `x=550/1920`、`y=560/1080`。portrait 为 `x=.5`、`y=.27+34/height`。
- 相机最终位置是目标加 `viewDirection*distance`；实际相机位置、lookAt 目标与 FOV 再按 `1-exp(-5*dt)` 追赶，FOV 由 `2*atan(span/(2*distance))` 求得。
- 指针视差只对位置增加 `pointerX*.12`、减去 `pointerY*.12`。

这些是源码计算后的参数，不应换成 CSS 透视下任意角度的卡片旋转。[scene.ts 镜头](https://github.com/LBEILC/RhineLabUI/blob/main/src/scene.ts#L1507-L1661)、[viewport-layout.ts](https://github.com/LBEILC/RhineLabUI/blob/main/src/viewport-layout.ts#L22-L37)

## 解密：有条件启动、沿模型空间投影

只有 `detail>.78 && lift>3.3` 才开始解密控制器时间累计。互动播放速度为原始采样时间的 1.5 倍，总时长 `(39.56-34.12)/1.5=3.6267s`，从满足门槛之后开始计时。进入详情不意味着立即显示明文。[scene.ts 解密条件](https://github.com/LBEILC/RhineLabUI/blob/main/src/scene.ts#L1425-L1428)、[decryption.ts 控制器](https://github.com/LBEILC/RhineLabUI/blob/main/src/decryption.ts#L120-L179)

| 自解密开始累计 | 阶段 |
|---|---|
| 0–0.08s | waiting |
| 0.08–1.28s | 两端线段向中心会合 |
| 1.28–2.40s | 完整连接线保持 |
| 2.40–3.1467s | 线段向中心收缩 |
| 3.1467–3.6267s | 从上向下清晰，最终明文 |

以上时间由原始节点除以 1.5 换算。扫描只沿模型面上的同一条对角线：FROM `(-1.6,.5)`，TO `(1.98,3.24)`，各端点随镜头三维投影；不是固定在屏幕上的扫描装饰。原始 GROW 节点 `[34.24,0],[34.4,.19],[34.64,.57],[34.96,.79],[35.28,.92],[35.6,.973],[36.04,1]`；RETRACT `[37.72,1],[37.88,.72],[38,.38],[38.12,.22],[38.24,.14],[38.4,.075],[38.64,.024],[38.84,0]`；REVEAL `[38.84,0],[38.92,.28],[39,.51],[39.16,.74],[39.32,.94],[39.56,1]`。节点采用单调三次 Hermite 插值，端点速度为 0。[decryption.ts 采样和阶段](https://github.com/LBEILC/RhineLabUI/blob/main/src/decryption.ts#L1-L119)

## 相邻档案并非独立错峰上移

selection pulse 为沿距离传播、带正负波瓣的连续波；存续 3.2s、传播速度每秒 8 个行距，幅度因子 .8、时间衰减率 1.15、空间余弦频率 .58、Gaussian 宽度 3.4；跨列距离按 2.2 加权，最终 pulse 高度 clamp 到 `[-.6,.6]`。详情或归位中 pulseGain 以 rate 8 降低。在使用延迟脉冲的构造选项时，需要新卡升到 ≥.35、没有返回对齐、附近旧卡已低于新卡，再发出波。[motion.ts baselineSelectionWave](https://github.com/LBEILC/RhineLabUI/blob/main/src/motion.ts#L43-L62)、[scene.ts 场](https://github.com/LBEILC/RhineLabUI/blob/main/src/scene.ts#L1336-L1376)、[scene.ts 脉冲触发](https://github.com/LBEILC/RhineLabUI/blob/main/src/scene.ts#L1469-L1487)

## 对本项目的落实边界

保留已选第 1 张的色彩与内容。复用的是状态驱动的三维抽取、镜头运动、条件解密与顺序归位。该研究只确认上述源文件，不声称已复刻全部材质、完整文字遮罩、资产、音频或开场影片；这些仍应分别查看其第一方实现再判断。
