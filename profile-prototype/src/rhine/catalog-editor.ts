import {creatableCategories,createArchive,deleteArchive,lastDeletedArchive,restoreArchive,moveArchive} from './catalog-store';
import {records,baseRecords,archiveDisplayId} from './data';
import {canEditArchive} from './members';
import {escapeHtml as esc} from './html';
import './catalog-editor.css';
export function catalogToolbar(category='荣誉里程'){
 return `<div class="catalog-tools"><details class="catalog-create"><summary>＋ 新增档案</summary><form id="catalog-create-form"><label>档案名称<input name="title" required maxlength="60" placeholder="例如：年度荣誉记录"></label><label>所属分类<select name="category">${creatableCategories.map(c=>`<option ${c===category?'selected':''}>${c}</option>`).join('')}</select></label><div class="catalog-create-foot"><small>新增记录归本人；队员档案由成员名单建立。</small><button type="submit">创建档案 ↗</button></div></form></details><small class="catalog-sort-hint">拖动行首调整浏览顺序</small><button type="button" data-catalog="undo" ${lastDeletedArchive(baseRecords)?'':'disabled'}>撤销上次删除</button><span data-catalog-status role="status">仅保存到本浏览器</span></div>`;
}
export function catalogDragHandle(id:string,title:string){return id==='X-001'?'<span class="catalog-drag" title="本人档案优先展示"></span>':`<button type="button" class="catalog-drag" draggable="true" data-catalog-drag="${esc(id)}" aria-label="调整 ${esc(title)} 的位置" title="拖动排序，或点击指定位置">⠿</button>`;}
export function catalogDeleteButton(id:string,title:string){const record=records.find(r=>r.id===id);return !record||record.memberRecord||!canEditArchive(record)?'<span class="catalog-delete"></span>':`<button type="button" class="catalog-delete" data-catalog-delete="${esc(id)}" aria-label="删除 ${archiveDisplayId(id)} ${esc(title)}">删除</button>`;}
export function initCatalogEditor(commit:(id?:string)=>void|Promise<void>){
 const events=new AbortController(),options={signal:events.signal};
 const status=(message:string)=>{const e=document.querySelector('[data-catalog-status]');if(e)e.textContent=message;};
 let busy=false,dragId='',dragY=0,scrollFrame=0,scrollOwner:HTMLElement|null=null;
 const clearDrop=()=>document.querySelectorAll('.catalog-drop-before,.catalog-drop-after').forEach(e=>e.classList.remove('catalog-drop-before','catalog-drop-after'));
 const endDrag=()=>{dragId='';cancelAnimationFrame(scrollFrame);scrollOwner=null;clearDrop();document.querySelectorAll('.catalog-dragging').forEach(e=>e.classList.remove('catalog-dragging'));};
 const change=async(action:()=>string|undefined,message:string)=>{
  if(busy)return;busy=true;
  try{const id=action();await commit(id);const undo=document.querySelector<HTMLButtonElement>('[data-catalog=undo]');if(undo)undo.disabled=!lastDeletedArchive(baseRecords);status(message);}
  catch(e){status(e instanceof Error?e.message:'未能保存，请检查浏览器存储。');}
  finally{busy=false;}
 };
 document.addEventListener('submit',event=>{
  const form=event.target;if(!(form instanceof HTMLFormElement))return;
  if(form.id==='catalog-create-form'){
   event.preventDefault();const data=new FormData(form);
   void change(()=>createArchive(String(data.get('title')||''),String(data.get('category')||''),baseRecords),'已新增档案').then(()=>{
    if(!form.isConnected||form.querySelector<HTMLInputElement>('[name=title]')?.value==='')return;
    // Keep user input available when storage fails.
    if(document.querySelector('[data-catalog-status]')?.textContent==='已新增档案'){form.reset();form.closest('details')!.open=false;}
   });
  }
  if(form.dataset.catalogPosition){
   event.preventDefault();const id=form.dataset.catalogPosition,position=Number(new FormData(form).get('position'));
   if(!Number.isInteger(position)||position<1||position>records.length)return;
   const from=records.findIndex(r=>r.id===id),target=records[position-1].id;
   void change(()=>moveArchive(id,target,position-1>from,baseRecords),'顺序已保存');
  }
 },options);
 document.addEventListener('click',event=>{
  const button=(event.target as Element).closest<HTMLButtonElement>('button');if(!button)return;
  if(button.dataset.catalog==='undo')void change(()=>restoreArchive(baseRecords),'已恢复档案');
  if(button.hasAttribute('data-catalog-cancel')){button.closest('.catalog-delete-prompt,.catalog-position')?.remove();return;}
  if(button.dataset.positionStep){
   const input=button.closest('.catalog-position')?.querySelector<HTMLInputElement>('[name=position]');
   if(input){const value=Number(input.value)||1;input.value=String(Math.max(1,Math.min(records.length,value+Number(button.dataset.positionStep))));input.dispatchEvent(new Event('input',{bubbles:true}));}
   return;
  }
  if(button.dataset.catalogConfirm){const id=button.dataset.catalogConfirm;void change(()=>{deleteArchive(id,baseRecords);return undefined;},'已删除，可撤销');return;}
  const id=button.dataset.catalogDelete||button.dataset.catalogDrag;
  if(!id)return;const record=records.find(r=>r.id===id);if(!record)return;
  document.querySelectorAll('.catalog-delete-prompt,.catalog-position').forEach(e=>e.remove());
  const row=button.closest('.catalog-result');
  if(button.dataset.catalogDelete){
   if(record.memberRecord||!canEditArchive(record))return;
   row?.insertAdjacentHTML('beforeend',`<div class="catalog-delete-prompt" role="group" aria-label="确认删除 ${archiveDisplayId(id)}"><span>移除 ${archiveDisplayId(id)} · ${esc(record.title)}？之后可撤销。</span><button type="button" data-catalog-confirm="${esc(id)}">确认删除</button><button type="button" data-catalog-cancel>取消</button></div>`);
   row?.querySelector<HTMLButtonElement>('[data-catalog-confirm]')?.focus();
  }else{
   row?.insertAdjacentHTML('beforeend',`<form class="catalog-position" data-catalog-position="${esc(id)}"><label>移至第 <span class="catalog-position-value"><input name="position" type="number" min="1" max="${records.length}" required value="${records.findIndex(r=>r.id===id)+1}" aria-label="目标位置"><span class="catalog-position-steps"><button type="button" data-position-step="1" aria-label="增加目标位置"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 10 4-4 4 4"/></svg></button><button type="button" data-position-step="-1" aria-label="减少目标位置"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></button></span></span> 位</label><button type="submit">移动</button><button type="button" data-catalog-cancel>取消</button></form>`);
   row?.querySelector<HTMLInputElement>('.catalog-position input')?.select();
  }
 },options);
 const autoScroll=()=>{
  if(!dragId)return;
  if(scrollOwner){const rect=scrollOwner.getBoundingClientRect();const edge=44;
   const speed=dragY<rect.top+edge?-Math.min(16,(rect.top+edge-dragY)/3):dragY>rect.bottom-edge?Math.min(16,(dragY-rect.bottom+edge)/3):0;
   scrollOwner.scrollTop+=speed;
  }
  scrollFrame=requestAnimationFrame(autoScroll);
 };
 document.addEventListener('dragstart',event=>{
  const handle=(event.target as Element).closest<HTMLElement>('[data-catalog-drag]');if(!handle)return;
  dragId=handle.dataset.catalogDrag!;dragY=event.clientY;
  event.dataTransfer?.setData('text/plain',dragId);if(event.dataTransfer)event.dataTransfer.effectAllowed='move';
  handle.closest('.catalog-result')?.classList.add('catalog-dragging');
  const list=handle.closest<HTMLElement>('.search-results');scrollOwner=list&&list.scrollHeight>list.clientHeight?list:handle.closest<HTMLElement>('.terminal-modal');
  scrollFrame=requestAnimationFrame(autoScroll);
 },options);
 document.addEventListener('dragover',event=>{
  if(!dragId)return;dragY=event.clientY;
  const row=(event.target as Element).closest<HTMLElement>('[data-catalog-id]');if(!row)return;
  event.preventDefault();if(event.dataTransfer)event.dataTransfer.dropEffect='move';clearDrop();
  if(row.dataset.catalogId!==dragId)row.classList.add(event.clientY<row.getBoundingClientRect().top+row.getBoundingClientRect().height/2?'catalog-drop-before':'catalog-drop-after');
 },options);
 document.addEventListener('drop',event=>{
  if(!dragId)return;event.preventDefault();const id=dragId;
  const row=(event.target as Element).closest<HTMLElement>('[data-catalog-id]');
  const target=row?.dataset.catalogId,rect=row?.getBoundingClientRect();
  const after=Boolean(rect&&event.clientY>=rect.top+rect.height/2);endDrag();
  if(target&&target!==id)void change(()=>moveArchive(id,target,after,baseRecords),'顺序已保存');
 },options);
 document.addEventListener('dragend',endDrag,options);
 return ()=>{events.abort();endDrag();};
}
/** Compatibility for a one-time handoff left by the previous reload-based UI. */
export function consumeCatalogReturn():{id?:string;filter?:string;query?:string}|undefined{
 try{const raw=sessionStorage.getItem('corps-catalog-return');sessionStorage.removeItem('corps-catalog-return');return raw?JSON.parse(raw):undefined;}catch{return undefined;}
}
