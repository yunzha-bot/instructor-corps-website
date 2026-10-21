import type {ArchiveRecord} from './data';
import {canEditArchive} from './members';
import './honor-album.css';
type Photo={id:string;record:string;name:string;blob:Blob;created:number};
let database:Promise<IDBDatabase>|undefined;
function db(){return database??=new Promise<IDBDatabase>((resolve,reject)=>{
 const request=indexedDB.open('corps-honor-photos',1);
 request.onupgradeneeded=()=>request.result.createObjectStore('photos',{keyPath:'id'});
 request.onsuccess=()=>resolve(request.result);request.onerror=()=>{database=undefined;reject(request.error);};
});}
async function photos(record:string){const database=await db();return new Promise<Photo[]>((resolve,reject)=>{const request=database.transaction('photos').objectStore('photos').getAll();request.onsuccess=()=>resolve((request.result as Photo[]).filter(p=>p.record===record).sort((a,b)=>a.created-b.created));request.onerror=()=>reject(request.error);});}
async function write(photo:Photo,remove=false){const database=await db();return new Promise<void>((resolve,reject)=>{const tx=database.transaction('photos','readwrite');if(remove)tx.objectStore('photos').delete(photo.id);else tx.objectStore('photos').put(photo);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
export function albumPanel(record:ArchiveRecord){return `<section class="honor-album" data-album="${record.id}"><div class="album-toolbar"><span class="album-count">照片</span>${canEditArchive(record)?'<button type="button" data-album-add>＋ 添加照片</button><input type="file" accept="image/*" multiple hidden>':''}</div><p class="album-feedback" role="status"></p><div class="album-grid"></div></section>`;}
export function initHonorAlbums(getRecord:()=>ArchiveRecord){
 document.addEventListener('keydown',event=>{if(document.querySelector('.album-preview[open]'))event.stopImmediatePropagation();},{capture:true});
 let current:HTMLElement|null=null,urls:string[]=[],busy=false;
 const allowed=(element:HTMLElement)=>element.isConnected&&element.dataset.album===getRecord().id&&getRecord().category==='荣誉里程'&&canEditArchive(getRecord());
 const status=(element:HTMLElement,text:string)=>{element.querySelector('.album-feedback')!.textContent=text;};
 const render=async(element:HTMLElement)=>{
  try{
   const list=await photos(element.dataset.album!);if(!element.isConnected||current!==element)return;
   urls.forEach(URL.revokeObjectURL);urls=[];
   element.querySelector('.album-count')!.textContent=`${String(list.length).padStart(2,'0')} 张照片`;
   const grid=element.querySelector('.album-grid')!;grid.replaceChildren();
   if(!list.length){grid.innerHTML='<p class="album-empty">把值得留住的瞬间，放在这里。</p>';return;}
   for(const photo of list){
    const url=URL.createObjectURL(photo.blob);urls.push(url);
    const item=document.createElement('div');item.className='album-photo';
    const open=document.createElement('button');open.type='button';open.className='album-photo-open';open.setAttribute('aria-label',`查看照片 ${photo.name}`);
    const image=new Image();image.src=url;image.alt=photo.name;open.append(image);open.onclick=()=>preview(url,photo.name);item.append(open);
    if(allowed(element)){const remove=document.createElement('button');remove.type='button';remove.className='album-remove';remove.textContent='移除';remove.setAttribute('aria-label',`移除照片 ${photo.name}`);remove.onclick=async()=>{if(!allowed(element)||busy)return;if(remove.dataset.confirm!=='yes'){remove.dataset.confirm='yes';remove.textContent='确认移除';return;}try{await write(photo,true);await render(element);status(element,'已移除');}catch{status(element,'未能移除，请重试。');}};item.append(remove);}
    grid.append(item);
   }
  }catch{if(element.isConnected)status(element,'照片暂时无法读取，请检查浏览器存储。');}
 };
 const observer=new MutationObserver(()=>{const next=document.querySelector<HTMLElement>('.honor-album');if(next===current)return;urls.forEach(URL.revokeObjectURL);urls=[];current=next;if(next)void render(next);});
 observer.observe(document.querySelector('#detail-content')!,{childList:true,subtree:true});
 document.addEventListener('click',event=>{const button=(event.target as Element).closest('[data-album-add]');const element=button?.closest<HTMLElement>('.honor-album');if(element&&allowed(element)&&!busy)element.querySelector<HTMLInputElement>('input[type=file]')!.click();});
 document.addEventListener('change',async event=>{
  const input=event.target;if(!(input instanceof HTMLInputElement)||input.type!=='file')return;const element=input.closest<HTMLElement>('.honor-album');if(!element||!allowed(element)||busy)return;
  const files=[...input.files||[]];input.value='';if(!files.length)return;busy=true;let saved=0,failed=0;
  const record=element.dataset.album!;const button=element.querySelector<HTMLButtonElement>('[data-album-add]')!;button.disabled=true;
  for(const file of files){
   status(element,`正在收纳照片 ${saved+failed+1} / ${files.length}…`);
   const url=URL.createObjectURL(file);
   try{
    if(!file.type.startsWith('image/')||file.size>20*1024*1024)throw Error('image');
    const image=new Image();image.src=url;await image.decode();
    const canvas=document.createElement('canvas'),ratio=Math.min(1,1800/Math.max(image.width,image.height));canvas.width=Math.max(1,Math.round(image.width*ratio));canvas.height=Math.max(1,Math.round(image.height*ratio));
    const ctx=canvas.getContext('2d')!;ctx.fillStyle='#f7f3e9';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('encode')),'image/jpeg',.9));
    if(!allowed(element))break;
    await write({id:crypto.randomUUID(),record,name:file.name,blob,created:Date.now()});saved++;
   }catch{failed++;}finally{URL.revokeObjectURL(url);}
  }
  busy=false;button.disabled=false;if(element.isConnected){await render(element);status(element,failed?`已添加 ${saved} 张，${failed} 张未保存，请使用20MB以内的有效图片并检查存储空间。`:`已添加 ${saved} 张 · 保存在本浏览器`);}
 });
}
function preview(url:string,name:string){
 const dialog=document.createElement('dialog');dialog.className='album-preview';dialog.setAttribute('aria-label','查看照片');
 const image=new Image();image.src=url;image.alt=name;const close=document.createElement('button');close.textContent='关闭 ×';close.type='button';dialog.append(image,close);document.body.append(dialog);
 const dismiss=()=>{dialog.close();dialog.remove();};close.onclick=dismiss;dialog.onclick=e=>{if(e.target===dialog)dismiss();};dialog.oncancel=e=>{e.preventDefault();dismiss();};
 dialog.addEventListener('keydown',e=>e.stopPropagation());dialog.showModal();
}
