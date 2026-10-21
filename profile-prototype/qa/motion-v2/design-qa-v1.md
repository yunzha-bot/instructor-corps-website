# Design QA

Source: `../design/stage-03-profile/screens/01-profile-light.png` (1586×992).
Implementation: `qa/desktop.png`. URL: http://127.0.0.1:4173/ . Edge via an isolated Playwright session, explicitly authorized by the user.

Iteration 1: blocked. The initial screenshot captured entry motion; the readiness probe was corrected to wait for the image, final application state, and all running animations. This was capture timing, not a design verdict.

Iteration 2: blocked. Actual final screenshots at desktop/mobile were inspected. P2: photographic plate too small versus the selected mock. P2: desktop navigation too compact and shifted right. P2: desktop canvas slightly taller than target due the portrait track sizing. Fixes in progress; final same-state side-by-side comparison required.

## 修复与最终复核

- 调整档案展示轨道、影像尺寸和静态位置，扩大摄影主体并避免新增垂直空区；调整桌面导航间距、资料栏起点、页签间隔及按钮宽度。
- 扩大后影像曾拦截重播点击。装饰影像已取消指针命中，页脚保持独立操作层，真实点击复验通过。
- 修正动画取消期间旧异步步骤继续运行的问题。跳过期间取消重播链，页面保持最终状态。
- 运行时唯一404为未提供的favicon；已配置明确的空favicon，最终控制台无错误。
- 运动采样最终时刻由1900ms改为2300ms，以涵盖450ms归位与最长1500ms揭示总长度；这次失败属于测试等待时间错误，并非动画不能结束。

## 最终证据

源图 `../design/stage-03-profile/screens/01-profile-light.png` 与 `qa/desktop.png` 均1586×992；浏览器CSS viewport 1586×992、deviceScaleFactor 1，状态为默认身份、基本资料页签、入场完全结束。无尺寸变换或密度差异。

- 完整并排：`qa/comparison.png`，左设计稿、右实现，3172×992。
- 资料栏同坐标裁切并排：`qa/comparison-detail.png`。
- 导航同坐标裁切并排：`qa/comparison-nav.png`。
- 响应式：`qa/laptop.png`（1280×720窗口）、`qa/tablet.png`（768×1024）、`qa/mobile.png`（390×844），保存完整页面以检查操作可达；非对桌面等比缩小。
- 操作与错误态：`qa/edit-dialog.png`、`qa/image-failure.png`。
- 自动结果：`qa/browser-checks.json`。14项检查通过，控制台/页面错误为空。
- 运动：`qa/motion-samples.json`，观察到不同时间的透视矩阵与模糊变化，2300ms为稳定最终状态。

已实际打开完整对照与资料/导航细节对照，另外检查了手机、平板、较矮笔记本和编辑弹窗。

## 五项保真检查

1. 字体与排版：使用中文无衬线、保留标题与正文级差，无抒情标语。生成图字形与本机字体有轻微差别，列P3，不影响层级与换行。
2. 间距与构图：左影像、右资料、两列字段、页签和底部操作均保留。前述P2已修复，主要操作在当前视窗/可滚动内容内可达；四种尺寸无横向溢出。
3. 色彩：取选定图的灰白、近黑、少量暖色标记；用户确认保留此稿颜色，未将参考仓库色值直接当作设计要求。P3：背景光照比静态生成图更平，未重建其地面反射。
4. 影像：使用按选定稿生成并保存的透明人物档案板，而不是把整张界面作为背景。P3：素材重新生成导致脸部微小差别、边缘与裁切不逐像素一致；均为匿名AI示意。运行时透明边缘与正文可读。
5. 内容：人物、字段、简介空态、仅本人可见提示、基本资料/训练/荣誉结构与操作语义一致。动效工具为本轮新增；真实账号与后端均明确未提供。

没有剩余P0/P1/P2问题。P3为后续选材与光照精修，不阻断动效原型评审。

final result: passed
