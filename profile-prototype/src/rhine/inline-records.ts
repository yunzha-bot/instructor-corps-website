import type { ArchiveRecord } from './data';
import { readProfile, saveProfile } from '../data';
import { escapeHtml as esc } from './html';
import { dateField, bindDateFields, validateDates } from './date-field';
import { canEditArchive, canEditRecordPart, isOwnMember, legacyProfileIds } from './members';

type Field = { key:string; label:string; type?:'date'|'textarea'|'select'; options?:string[]; wide?:boolean };
const text=(key:string,label:string,wide=false):Field=>({key,label,wide});
const area=(key:string,label:string):Field=>({key,label,type:'textarea',wide:true});
const date=(label='记录日期'):Field=>({key:'date',label,type:'date'});
const status=(options=['未开始','进行中','已完成']):Field=>({key:'status',label:'状态',type:'select',options});
const schemas:Field[][][]=[
 [
  [text('nickname','展示昵称',true),text('team','所属分队'),text('cohort','所属届别'),{key:'joined',label:'加入时间',type:'date'},text('role','队内身份')],
  [area('intro','个人介绍'),text('interests','兴趣',true)],
  [text('goal','目标',true),date('计划完成日期'),status(),area('steps','行动安排')],
  [text('activity','参与活动',true),date(),text('duty','承担工作'),area('experience','经历记录')],
  [text('skill','技能'),status(['初学','练习中','熟练']),area('practice','练习体会')],
  [area('gains','阶段收获'),area('improve','待改进之处')],
  [text('goal','下一阶段目标',true),date('计划日期'),area('actions','具体安排')],
  [text('method','联系渠道'),text('contact','联系方式')],
 ],
 [
  [date('训练日期'),text('practice','练习内容'),area('feedback','动作反馈')],
  [date('训练日期'),text('items','训练项目'),text('duration','训练时长'),area('reflection','身体感受与回顾')],
  [date('练习日期'),text('commands','练习口令'),area('feedback','练习反馈')],
  [text('task','协作任务',true),date(),area('experience','协作体会')],
  [date('训练日期'),text('session','训练场次'),status(['待登记','已参加','请假','缺席']),text('note','备注')],
  [text('project','考核项目'),date('考核日期'),text('standard','考核标准'),area('feedback','考核反馈（个人记录）')],
  [date('训练日期'),area('problem','遇到的问题'),area('actions','改进安排')],
  [text('goal','训练目标',true),date('计划日期'),area('plan','执行安排')],
 ],
 [
  [text('title','文档名称',true),area('body','正文')],
  [date('记录日期'),text('topic','主题'),area('body','训练笔记')],
  [text('source','资料来源'),text('topic','主题'),area('body','学习摘录')],
  [text('period','总结阶段'),date(),area('body','总结内容')],
  [text('event','活动名称'),date('活动日期'),area('body','活动材料')],
  [text('photo','照片名称'),date('拍摄日期'),area('body','照片故事')],
  [text('name','证明名称'),text('issuer','出具单位'),date('出具日期'),area('body','材料说明')],
  [text('title','文档名称',true),area('body','待整理内容')],
 ],
 [
  [text('honor','荣誉名称',true),text('issuer','授予单位'),date('授予日期'),area('body','记录说明')],
  [text('camp','集训名称'),date('完成日期'),area('body','阶段体会')],
  [text('event','带训活动'),date('参与日期'),text('duty','承担任务'),area('body','带训体会')],
  [text('task','参与事项'),date(),area('body','贡献记录')],
  [text('period','成长阶段'),date(),area('body','阶段变化')],
  [text('name','证明名称'),text('issuer','授予单位'),date('授予日期'),area('body','证明说明')],
  [text('topic','传承主题'),date(),area('body','经验与寄语')],
  [text('year','回顾年度'),area('body','年度回顾')],
 ],
 [
  [date('拍摄日期'),text('place','地点'),area('story','瞬间故事')],
  [text('event','合影活动'),date('拍摄日期'),area('story','合影故事')],
  [date(),area('story','相处的小事')],
  [text('event','活动名称'),date('活动日期'),text('place','地点'),area('story','活动记忆')],
  [date(),area('story','告别与接续')],
  [text('to','写给谁',true),area('story','寄语')],
  [date(),text('place','地点'),area('story','难忘的片刻')],
  [text('theme','相册主题'),text('period','时间范围'),area('story','相册说明')],
 ],
];
const fieldLimit=(field:Field)=>field.type==='textarea'?4000:({nickname:24,team:40,cohort:24,role:40}[field.key]||120);
const storeKey='corps-inline-records-demo-v1';
const drafts=new Map<string,Record<string,string>>();
try{const raw=sessionStorage.getItem('corps-inline-reload-drafts');sessionStorage.removeItem('corps-inline-reload-drafts');if(raw)for(const [key,value] of JSON.parse(raw))drafts.set(key,value);}catch{}
export function preserveInlineDrafts(){sessionStorage.setItem('corps-inline-reload-drafts',JSON.stringify([...drafts]));}
function schema(record:ArchiveRecord,section:string):Field[]{
 if(record.custom&&section==='overview')return [date(),area('body','内容')];
 if(section==='notes')return [area('reflection','回顾'),area('next','下一步')];
 const index=Number(record.id.slice(2))-1;
 return schemas[Math.floor(index/8)]?.[index%8] || [area('body','正文')];
}
function readStore():Record<string,Record<string,Record<string,string>>>{try{const v=JSON.parse(localStorage.getItem(storeKey)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}catch{return {};}}
function values(record:ArchiveRecord,section:string,useDraft=true){
 const draft=drafts.get(`${record.id}:${section}`);if(useDraft&&draft)return draft;
 const stored=record.id==='X-001'&&section==='overview'?undefined:readStore()[record.id]?.[section];
 const profile=readProfile();
 const defaults:Record<string,string>=section==='overview'&&record.id==='X-001'?{nickname:profile.nickname,team:profile.team||'',cohort:profile.cohort||'',joined:profile.joined||'',role:profile.role||''}:section==='overview'&&record.id==='X-002'?{intro:profile.bio}:{};
 return Object.fromEntries(schema(record,section).map(f=>[f.key,typeof stored?.[f.key]==='string'?stored[f.key]:defaults[f.key]||'']));
}
export function hasInlineContent(record:ArchiveRecord,section:string){return Object.values(values(record,section)).some(value=>value.trim());}
export function inlineRecordForm(record:ArchiveRecord,section:string){
 if(!canEditArchive(record))return '';
 const v=values(record,section),dirty=drafts.has(`${record.id}:${section}`);
 return `<form class="inline-record-form" data-state="${dirty?'dirty':'idle'}" data-record="${record.id}" data-section="${section}"><div class="inline-record-grid">${schema(record,section).map(f=>{
 const value=esc(v[f.key]||''),id=`field-${record.id}-${section}-${f.key}`;
 const control=f.type==='date'?dateField(id,f.key,v[f.key]||'',f.label):f.type==='textarea'?`<textarea id="${id}" name="${f.key}" rows="3" maxlength="4000" placeholder="在此填写">${value}</textarea>`:f.type==='select'?`<select id="${id}" name="${f.key}"><option value="">请选择</option>${f.options!.map(o=>`<option ${v[f.key]===o?'selected':''}>${o}</option>`).join('')}</select>`:`<input id="${id}" name="${f.key}" type="text" maxlength="${fieldLimit(f)}" ${f.key==='nickname'?'required':''} value="${value}" placeholder="待填写">`;
 return `<label for="${id}" class="record-field ${f.wide?'inline-record-wide':''}" data-field-kind="${f.type||'text'}"><span>${f.label}</span><span class="editor-control">${control}<i class="editor-rule" aria-hidden="true"></i></span></label>`;
 }).join('')}</div><div class="inline-record-footer"><span role="status" aria-live="polite">${dirty?'未保存':'仅本浏览器 · 演示资料'}</span><button type="submit">保存内容 <span>↗</span></button></div></form>`;
}
export function inlineRecordText(record:ArchiveRecord){
 if(!canEditArchive(record)){const p=record.memberProfile;return p?[p.nickname,p.team,p.cohort,p.joined,p.role,p.bio].filter(Boolean).join('\n'):'';}
 const parts=isOwnMember(record)?[record,...legacyProfileIds.map(id=>({...record,id,memberRecord:false}))]:[record];
 return parts.map(part=>['overview','notes'].map(section=>{const v=values(part,section,false);return schema(part,section).filter(f=>v[f.key]).map(f=>`${f.label}：${v[f.key]}`).join('\n');}).filter(Boolean).join('\n\n')).filter(Boolean).join('\n\n');
}
export function bindInlineRecords(getRecord:()=>ArchiveRecord,onSave:()=>void){
 bindDateFields();
 document.addEventListener('input',event=>{
  const field=event.target as HTMLInputElement;const form=field.closest<HTMLFormElement>('.inline-record-form');if(!form)return;
  if(!canEditRecordPart(getRecord(),form.dataset.record||''))return;
  drafts.set(`${form.dataset.record}:${form.dataset.section}`,Object.fromEntries(new FormData(form).entries()) as Record<string,string>);
  form.dataset.state='dirty';
  form.querySelector('[role=status]')!.textContent='未保存';
 });
 document.addEventListener('change',event=>{if(event.target instanceof HTMLSelectElement&&event.target.closest('.inline-record-form'))event.target.dispatchEvent(new Event('input',{bubbles:true}));});
 document.addEventListener('submit',event=>{
  const form=event.target as HTMLFormElement;if(!form.matches('.inline-record-form'))return;event.preventDefault();
  const current=getRecord(),section=form.dataset.section!;if(!canEditRecordPart(current,form.dataset.record||''))return;
  const record={...current,id:form.dataset.record!};
  if(!validateDates(form)){form.dataset.state='error';form.querySelector('[role=status]')!.textContent='日期有误，请检查年月日。';form.reportValidity();return;}
  const fields=Object.fromEntries(schema(record,section).map(f=>[f.key,String(new FormData(form).get(f.key)||'').trim().slice(0,fieldLimit(f))]));
  const status=form.querySelector('[role=status]')!;
  try {
   if(section==='overview'&&record.id==='X-001')saveProfile({...readProfile(),...fields});
   else {
     const store=readStore();store[record.id]={...store[record.id],[section]:fields};
     localStorage.setItem(storeKey,JSON.stringify(store));
   }
   drafts.delete(`${record.id}:${section}`);form.dataset.state='saved';status.textContent='已保存';onSave();
  }catch{form.dataset.state='error';status.textContent='尚未保存，请检查浏览器存储。';}
 });
}
