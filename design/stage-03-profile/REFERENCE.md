# RhineLabUI → 教官个人档案：设计参考研究

研究日期：2026-10-19。范围仅限参考分析与设计建议；保留 stage-02 及三套首页。读取第一方源码与文档，未启动项目、未验证当前线上交互。

## 已核实的来源事实

### 1. 视觉体系

源码主字体为 MiSans，回退 PingFang SC、Microsoft YaHei、system-ui。基础界面使用暖灰白、近黑字、细线、紧凑中英文字阶。[style.css](https://github.com/LBEILC/RhineLabUI/blob/main/src/style.css)；[DESIGN.md](https://github.com/LBEILC/RhineLabUI/blob/main/DESIGN.md)

当前亮暗主题的实际 token 如下；基础 CSS 仍含 `#e8e5e1` 等色值，因此不能只抽取一处背景就当作完整主题。[theme-ui.ts](https://github.com/LBEILC/RhineLabUI/blob/main/src/theme-ui.ts)；[theme.css](https://github.com/LBEILC/RhineLabUI/blob/main/src/theme.css)

| 用途 | 浅色 | 深色 |
|---|---|---|
| 页面 | `#EAE5E1` | `#11181B` |
| 面板 | `#EDEBE4` | `#202A2F` |
| 正文 | `#080A08` | `#E0E3DC` |
| 次级文字 | `#77756D` | `#A6B0B1` |
| 分隔线 | `#AAA59A` | `#536166` |
| 少量强调 | `#9B7247` | `#C5A16B` |

### 2. 档案详情的布局与信息层级

桌面以左侧大幅物件、右侧阅读区构图；右栏从页面宽度约 60.1% 开始、宽约 33.1%。内容依次为文件编号与访问标记、英文主标题、中文标题、粗分隔线、两列资料字段、三页签正文、操作区。资料字段是科室、编目范围、相关人物、状态；页签为概述、研究记录、访问日志。这是研究档案，原项目没有真实队员档案模型。[main.ts](https://github.com/LBEILC/RhineLabUI/blob/main/src/main.ts)；[style.css](https://github.com/LBEILC/RhineLabUI/blob/main/src/style.css)

正文有独立滚动区；手机使用实际 CSS 像素排字，主要操作至少 44px，竖屏阅读区从屏高约 54% 开始。不能把桌面整张等比缩小直接当手机布局。[responsive.css](https://github.com/LBEILC/RhineLabUI/blob/main/src/responsive.css)；[DESIGN.md](https://github.com/LBEILC/RhineLabUI/blob/main/DESIGN.md)

### 3. 动效与素材核验范围

参考项目包含三维档案抽取、解密、旋转拆解、滚动标题和编号。它的身份验证是演示状态机，不连接真实身份服务。[README](https://github.com/LBEILC/RhineLabUI#readme)

表层过渡已提供可用参考：弹窗入场 300ms、退出 200ms，正文页签淡入 150ms；代码支持减少动态效果和取消过渡。[ui-transitions.ts](https://github.com/LBEILC/RhineLabUI/blob/main/src/ui-transitions.ts)

官方仓库截图采于 2026-09-09、提交 `e0cb75f`、1600×900；属于历史运行证据，不能代表当前 main 全部效果。可核对[档案详情](https://raw.githubusercontent.com/LBEILC/RhineLabUI/main/docs/media/detail.jpg)、[正文页签](https://raw.githubusercontent.com/LBEILC/RhineLabUI/main/docs/media/research.jpg)、[档案阵列](https://raw.githubusercontent.com/LBEILC/RhineLabUI/main/docs/media/archive.jpg)。采集方法见[素材说明](https://github.com/LBEILC/RhineLabUI/blob/main/docs/media/README.md)。

## 面向本项目的设计建议（待用户确认）

- **继承构图和材质秩序。** 左侧以真实训练肖像或集体活动照片替代光学档案盒，保留留白、薄边框、磨砂衬层及少量暖色标记；右侧提供可读的人物档案。先做浅色方向评审，深色可作为备选，尚不视为已定色。
- **中文承担主要阅读。** 姓名或展示昵称作为主标题，英文只作小号辅助。使用「我的档案」「个人简介」「训练记录」「成长历程」等直白文案，减少口号和伪终端英文。示例身份统一标注「演示队员」，未知届别、职务、荣誉显示待填写。
- **资料改为真实字段。** 两列资料放届别、所属分队、加入时间、队内身份；下方页签对应个人简介、训练记录、成长里程碑。编辑资料、继续学习有明确入口；不同量纲成绩继续分开显示，不生成综合战力。
- **档案入口必须改造。** 不照搬全库检索、左右切换其他人、公开收藏与全量导出。登录队员先到本人档案；公开风采页仅使用本人同意公开的资料。教学负责人按授权查看训练数据，不因此获得完整个人档案；私人日记及求助记录保持独立入口与默认仅本人访问。
- **动效服务日常操作。** 可保留 150–300ms 的页签、资料揭示和焦点反馈；不用长开场、假解密等待、360° 人物旋转、循环档案阵列及持续波浪。减少动态效果时直接显示最终内容，手机改为肖像、姓名、资料和章节的自然纵向阅读。
- **替换世界观元素。** 移除莱茵生命名称与标志、研究科室、虚构保密等级、实验编号、光学内部结构和身份扫描用语。仓库采用 MIT，但第三方名称、标志、原作视觉设计、音频等有明确排除条款；参考排版，重新设计本项目图形与文案。[许可与资源说明](https://github.com/LBEILC/RhineLabUI#开源许可)

本次结论是「采用档案式构图与克制的界面语言」；未据此认定用户同意三维终端、深色主题或任何新实现。
