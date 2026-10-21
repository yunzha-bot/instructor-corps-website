# 第五轮：直接迁移原站与连续滚轮

最新用户反馈明确要求原站同样的动效与样式，并要求滚轮连续浏览。本轮不再从部分曲线近似重建，而是基于 `upstream/` 的完整源码、模型与样式。

来源：LBEILC/RhineLabUI，提交 `12cc5e4013acb9408f753ff71de6b8492299b7c8`。

- `upstream/` 是只读研究来源，保留 LICENSE、README 和资产许可说明。
- `profile-v2-complete.zip` 是替换前的应用源代码、脚本与规格备份；早先创建的 `profile-v2-backup.zip` 未完整写入，不作为恢复来源。
- 当前实现位于 `../../profile-prototype/src/rhine/`，详细规则见该项目 MOTION_SPEC.md。
- 原站／本地固定时刻并排图、真实浏览器检查与逐帧滚轮轨道位于 `../../profile-prototype/qa/faithful/`。
- 以前三套首页、第二阶段六页稿和第三阶段个人档案稿均保留。本轮没有开发真实后端。
