import type { ArchiveRecord } from './data';
import { inlineRecordForm, bindInlineRecords, preserveInlineDrafts, hasInlineContent } from './inline-records';
import { escapeHtml as esc } from './html';
import { canEditArchive, isOwnMember, legacyProfileIds } from './members';
import './dossier.css';
import {albumPanel,initHonorAlbums} from './honor-album';

export const dossierTitles = [
 ['个人总览','自我介绍','我的目标','队内经历','技能与专长','成长总结','阶段计划','联系方式'],
 ['队列训练','体能训练','口令练习','团队协作','训练出勤','阶段考核','训练反思','训练计划'],
 ['个人文档','训练笔记','学习资料','阶段总结','活动材料','照片说明','证明附件','待整理文档'],
 ['荣誉总览','集训里程碑','首次带训','团队贡献','阶段成长','荣誉证明','传承记录','年度回顾'],
 ['训练瞬间','集体合影','日常相处','活动纪实','告别与传承','一封寄语','难忘瞬间','青春相册'],
];
export function dossierTabs(record:ArchiveRecord){return record.category==='荣誉里程'?['照片']:record.memberRecord?['基本资料','成长记录']:['内容','补充记录'];}
export function dossierPanel(record:ArchiveRecord,tab:string){
 if(tab!=='overview'&&tab!=='notes')return '';
 if(record.category==='荣誉里程')return albumPanel(record);
 if(!canEditArchive(record))return memberReadonly(record,tab);
 if(isOwnMember(record)){
  const slots=tab==='notes'?[2,3,4,5,6]:[1,7];
  return inlineRecordForm(record,tab)+slots.map(slot=>{
   const part={...record,id:`X-${String(slot+1).padStart(3,'0')}`,memberRecord:false};
   return `<details class="member-section"><summary>${dossierTitles[0][slot]}</summary>${inlineRecordForm(part,'overview')}${hasInlineContent(part,'notes')?inlineRecordForm(part,'notes'):''}</details>`;
  }).join('');
 }
 return inlineRecordForm(record,tab);
}
function memberReadonly(record:ArchiveRecord,tab:string){
 const p=record.memberProfile;
 if(tab==='notes')return '<p class="member-readonly-note">该队员尚未提供成长记录。</p>';
 return `<dl class="member-profile">${[['展示昵称',p?.nickname||record.title],['所属分队',p?.team||'待补充'],['所属届别',p?.cohort||'待补充'],['加入时间',p?.joined||'待补充'],['队内身份',p?.role||'待补充']].map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl><p class="member-bio">${esc(p?.bio||'尚未填写个人介绍。')}</p>`;
}

export function preserveDossierDrafts(){preserveInlineDrafts();}
export function initDossier(getRecord:()=>ArchiveRecord,onRefresh:(kind?:string)=>void){
 initHonorAlbums(getRecord);
 bindInlineRecords(getRecord,()=>onRefresh('fields'));
 const nav=document.createElement('nav');nav.className='dossier-tools';nav.setAttribute('aria-label','个人空间');document.querySelector('#stage')?.append(nav);
 nav.innerHTML='<a class="dossier-nav" href="/?view=learning">课程学习 ↗</a>';
}
