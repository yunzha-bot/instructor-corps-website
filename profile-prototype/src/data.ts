export type Profile = { nickname: string; bio: string; team?: string; cohort?: string; joined?: string; role?: string };
export const initialProfile: Profile = { nickname: '演示队员 01', bio: '' };
const key = 'instructor-profile-demo-v1';
// Browser-only fictional demonstration records, not a real member database.
export function readProfile(): Profile {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    if (value && typeof value.nickname === 'string' && value.nickname.trim() && value.nickname.length <= 24 && typeof value.bio === 'string' && value.bio.length <= 300)
      return { nickname: value.nickname, bio: value.bio,
        team: typeof value.team === 'string' ? value.team.slice(0,40) : '',
        cohort: typeof value.cohort === 'string' ? value.cohort.slice(0,24) : '',
        joined: typeof value.joined === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.joined) ? value.joined : '',
        role: typeof value.role === 'string' ? value.role.slice(0,40) : '' };
  } catch { /* Use the demo identity if storage is unavailable or invalid. */ }
  return { ...initialProfile };
}
export function saveProfile(profile: Profile) { localStorage.setItem(key, JSON.stringify(profile)); }
export const metadata = [['所属届别', '待补充'], ['所属分队', '待补充'], ['加入时间', '待补充'], ['队内身份', '待确认']];
export const destinations: Record<string, { intro: string; note: string }> = {
  '成长历程': { intro: '本人训练与阶段记录', note: '尚无已发布训练记录。成长曲线仅由实际记录生成，不合并不同项目的成绩。' },
  '我的学习': { intro: '已加入的课程', note: '尚未分配课程。章节进度与技能考核将分别记录。' },
  '课程中心': { intro: '教学课程目录', note: '课程教材尚未提供。队列、体能、战术素养、拳术及棍法课程将在审核后开放。' },
  '心理支持': { intro: '成长指导与支持资源', note: '资源与真实支持渠道待配置。本原型不采集心理记录，也不在个人档案中展示心理数据。' },
  '官网': { intro: '官网首页尚未选定', note: '此前三套首页设计均已保留。本轮只制作个人档案动效原型，暂未连接公开官网。' },
};
