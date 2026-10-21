import type { ArchiveRecord } from './data';
import { CURRENT_MEMBER_ID, canEditArchive, demoMembers } from './members';
export const catalogCategories = ['队伍档案','荣誉里程'];
export const creatableCategories=catalogCategories.filter(c=>c!=='队伍档案');
type Entry = {id:string;title:string;category:string};
type Catalog = {added:Entry[];deleted:string[];next:number;order:string[];orderVersion:2};
const key = 'corps-archive-catalog-v1';
function read():Catalog {
 const raw=JSON.parse(localStorage.getItem(key)||'{"added":[],"deleted":[],"next":41}');
 if(!Array.isArray(raw.added)||!Array.isArray(raw.deleted))throw new Error('档案目录数据格式异常，原数据未改动。');
 const seen=new Set<string>();
 const added=raw.added.filter((r:Entry)=>r&&/^X-\d{3,}$/.test(r.id)&&Number(r.id.slice(2))>40&&typeof r.title==='string'&&r.title.trim()&&r.title.length<=60&&[...catalogCategories,'本人档案','个人文档','训练记录','青春记忆'].includes(r.category)&&!seen.has(r.id)&&seen.add(r.id));
 const ids=(value:unknown)=>Array.isArray(value)?[...new Set<string>(value.filter((id:unknown)=>typeof id==='string'&&/^[XT]-\d{3,}$/.test(id)))]:[];
 const next=Math.max(41,Math.floor(Number(raw.next)||41),...added.map((r:Entry)=>Number(r.id.slice(2))+1));
 let order=ids(raw.order);
 // The old complete order knows X-002…X-008, not the new member identities.
 // Migrate once; later explicit cross-category moves retain their saved positions.
 if(raw.orderVersion!==2){
  const members=['X-001',...demoMembers.map(member=>member.id)];
  order=[...members,...order.filter(id=>!members.includes(id))];
 }
 return {added,deleted:ids(raw.deleted),next,order,orderVersion:2};
}
function write(state:Catalog){localStorage.setItem(key,JSON.stringify(state));}
function orderedRecords(base:ArchiveRecord[],state:Catalog):ArchiveRecord[]{
 const custom=state.added.filter(entry=>creatableCategories.includes(entry.category)).map(entry=>({...base.find(r=>r.category===entry.category)!,...entry,ownerId:CURRENT_MEMBER_ID,memberRecord:false,memberProfile:undefined,custom:true,abstract:'',findings:[]}));
 const defaults=catalogCategories.flatMap(category=>[...base,...custom].filter(r=>r.category===category));
 const remaining=new Map(defaults.map(r=>[r.id,r]));
 const ordered:ArchiveRecord[]=[];
 for(const id of state.order){const record=remaining.get(id);if(record){ordered.push(record);remaining.delete(id);}}
 const result=[...ordered,...remaining.values()];
 const own=result.findIndex(record=>record.memberRecord&&canEditArchive(record));
 if(own>0)result.unshift(...result.splice(own,1));
 return result;
}
export function catalogRecords(base:ArchiveRecord[]):ArchiveRecord[]{
 try{const state=read();return orderedRecords(base,state).filter(r=>r.memberRecord||!state.deleted.includes(r.id));}catch{return base;}
}
export function createArchive(title:string,category:string,base:ArchiveRecord[]){
 title=title.trim();if(!title||title.length>60||!creatableCategories.includes(category))throw new Error('请选择可新增的记录分类；队员档案随成员建立。');
 const state=read(),id=`X-${String(state.next).padStart(3,'0')}`;
 const order=orderedRecords(base,state);
 let last=-1;order.forEach((record,index)=>{if(record.category===category)last=index;});
 const ids=order.map(r=>r.id);ids.splice(last<0?ids.length:last+1,0,id);
 state.order=ids;state.added.push({id,title,category});state.next++;write(state);return id;
}
export function deleteArchive(id:string,base:ArchiveRecord[]){
 const state=read(),record=orderedRecords(base,state).find(r=>r.id===id);
 if(!record||record.memberRecord||!canEditArchive(record))throw new Error('队员档案不能在此删除，仅能编辑自己的资料。');
 if(!state.deleted.includes(id))state.deleted.push(id);write(state);
}
export function moveArchive(id:string,target:string,after:boolean,base:ArchiveRecord[]){
 const state=read(),order=orderedRecords(base,state).map(r=>r.id);
 if(id===target)return id;
 if(id==='X-001'||target==='X-001'&&!after)throw new Error('本人档案固定优先展示，请选择其后的排序位置。');
 const deleted=(value:string)=>state.deleted.includes(value)&&!base.some(r=>r.id===value&&r.memberRecord);
 if(!order.includes(id)||!order.includes(target)||deleted(id)||deleted(target))throw new Error('档案已变化，请重新选择位置。');
 order.splice(order.indexOf(id),1);order.splice(order.indexOf(target)+Number(after),0,id);
 state.order=order;write(state);return id;
}
function restorable(state:Catalog,base:ArchiveRecord[]){
 const allowed=new Set(orderedRecords(base,state).filter(r=>!r.memberRecord&&canEditArchive(r)).map(r=>r.id));
 return [...state.deleted].reverse().find(id=>allowed.has(id));
}
export function lastDeletedArchive(base:ArchiveRecord[]){try{return restorable(read(),base);}catch{return undefined;}}
export function restoreArchive(base:ArchiveRecord[]){const state=read(),id=restorable(state,base);if(id){state.deleted.splice(state.deleted.lastIndexOf(id),1);write(state);}return id;}
