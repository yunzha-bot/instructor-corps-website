import { catalogCategories, catalogRecords } from "./catalog-store";
import { dossierTitles } from "./dossier";
import content from "../content/archives.json" with { type: "json" };

export interface ArchiveRecord {
  id: string;
  title: string;
  en: string;
  department: string;
  category: string;
  date: string;
  lead: string;
  clearance: string;
  abstract: string;
  findings: string[];
  source: string;
  custom?: boolean;
  ownerId?: string;
  memberRecord?: boolean;
  memberProfile?: import('../data').Profile;
}

import { REFERENCE_MODE } from "./corps";
import { readProfile } from "../data";
import { CURRENT_MEMBER_ID, demoMembers } from './members';
const profile = readProfile();
const corpsCategories = catalogCategories;
const corpsContent = {
 categories: corpsCategories,
 columns: corpsCategories,
 records: content.records.flatMap<ArchiveRecord>((r, i) => {
  const group = Math.floor(i / 8), slot = i % 8;
  if(group===1||group===2||group===4)return [];
  if(group===0&&slot>0){const member=demoMembers[slot-1];return [{...r,id:member.id,title:member.profile.nickname,en:'MEMBER PROFILE',category:'队伍档案',department:'待补充分队',date:'待补充届别',lead:'加入时间待补充',clearance:'演示成员 · 只读',abstract:'',findings:[],source:'',ownerId:member.ownerId,memberRecord:true,memberProfile:member.profile}];}
  const titles = [profile.nickname, "队列训练", "", "荣誉记录", "青春记忆"];
  const english = ["MEMBER PROFILE", "TRAINING RECORD", "", "HONOR & GROWTH", "YOUTH MEMORIES"];
  const category=['队伍档案','训练记录','','荣誉里程','青春记忆'][group];
  return { ...r, title: group === 0 && slot === 0 ? titles[group] : dossierTitles[group][slot],
   en: english[group], category, department: profile.team || "待补充分队", date: profile.cohort || "待补充届别", lead: profile.joined || "加入时间待补充", clearance: "本人可编辑",ownerId:CURRENT_MEMBER_ID,memberRecord:group===0,memberProfile:group===0?profile:undefined,
   abstract: group === 0 && slot === 0 ? profile.bio || "尚未填写个人简介。个人档案、训练、学习与成长记录在此归档，当前身份和内容均为演示。" : "这是界面演示条目，尚未接入真实记录。正式内容将在组织提供并审核后发布。",
   findings: ["尚无已发布的训练或学习记录。", "未知届别、分队、身份与日期保留待补充。", "本地演示不提供真实账号、成绩或访问权限保障。"], source: "/?view=profile" };
 })
};
const activeContent = REFERENCE_MODE ? content : corpsContent;
export const baseRecords:ArchiveRecord[]=activeContent.records;
export const records: ArchiveRecord[] = REFERENCE_MODE ? baseRecords : catalogRecords(baseRecords);
export const categories = ["全部档案", ...activeContent.categories];
export const archiveColumns = REFERENCE_MODE ? activeContent.columns : corpsCategories.filter(c=>records.some(r=>r.category===c));

export function columnFiles(lane: number) {
  return records
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => record.category === archiveColumns[lane])
    .map(({ index }) => index);
}
export function fileLocation(index: number) {
  const lane = archiveColumns.indexOf(records[index].category);
  const row = 12 + columnFiles(lane).indexOf(index);
  return { lane, row, slot: lane * 32 + row };
}
export function fileAtSlot(slot: number) {
  const files = columnFiles(Math.floor(slot / 32));
  return files[Math.max(0, Math.min(files.length - 1, (slot % 32) - 12))];
}

/** Visible numbering follows the live order; persistence still uses record.id. */
export function archiveDisplayId(id:string){
 const index=records.findIndex(record=>record.id===id);
 return REFERENCE_MODE?id:`X-${String(index+1).padStart(3,'0')}`;
}
export function refreshCatalog(){
 if(REFERENCE_MODE)return;
 records.splice(0,records.length,...catalogRecords(baseRecords));
 archiveColumns.splice(0,archiveColumns.length,...corpsCategories.filter(c=>records.some(r=>r.category===c)));
}
