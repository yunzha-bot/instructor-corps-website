import type {ArchiveRecord} from './data';
import {canEditArchive} from './members';
import {portraitStorageKey} from './portrait-sticker';
import './portrait-editor.css';

/** Lift the existing printed canvas into a native dialog; the scene keeps its projection. */
export function initPortraitEditor(source:HTMLElement,getRecord:()=>ArchiveRecord,enabled:()=>boolean,reduced:()=>boolean,apply:(image:HTMLImageElement)=>void){
 const events=new AbortController(),options={signal:events.signal};
 source.classList.add('portrait-open');source.setAttribute('role','button');source.setAttribute('aria-label','放大查看头像贴纸');
 const dialog=document.createElement('dialog');dialog.className='portrait-dialog';dialog.setAttribute('aria-label','头像贴纸');
 dialog.innerHTML='<div class="portrait-sheet"><canvas width="640" height="864"></canvas><button class="portrait-upload" type="button" aria-label="选择头像图片"></button><button type="button" class="portrait-close" aria-label="关闭头像贴纸">关闭 ×</button><p class="portrait-status" role="status"></p><input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" hidden></div>';
 document.body.append(dialog);
 const sheet=dialog.querySelector<HTMLElement>('.portrait-sheet')!,canvas=dialog.querySelector('canvas')!,upload=dialog.querySelector<HTMLButtonElement>('.portrait-upload')!,input=dialog.querySelector('input')!,status=dialog.querySelector<HTMLElement>('.portrait-status')!;
 let record:ArchiveRecord|undefined,origin='',moving=false,animation:Animation|undefined;
 const duration=()=>reduced()?0:620;
 const paint=()=>{
  const image=source.querySelector('canvas');if(!image)return;
  const ctx=canvas.getContext('2d')!;
  ctx.clearRect(0,0,640,864);
  // The printed source has intentionally sloping hand-cut edges. In the
  // centered view redraw the paper upright, keeping its photo and captions.
  ctx.beginPath();ctx.roundRect(13,10,614,844,18);
  ctx.fillStyle='#f7f3e9';ctx.fill();ctx.strokeStyle='#cec7b9';ctx.lineWidth=2;ctx.stroke();
  ctx.drawImage(image,34,40,570,796,34,40,570,796);
 };
 const close=async()=>{
  if(moving||!dialog.open)return;moving=true;
  animation=sheet.animate([{transform:'none',opacity:1},{transform:origin,opacity:.8}],{duration:duration(),easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});
  await animation.finished.catch(()=>{});dialog.close();animation.cancel();source.classList.remove('portrait-lifted');moving=false;source.focus({preventScroll:true});
 };
 const open=async()=>{
  if(!enabled()||dialog.open)return;
  record=getRecord();if(!record.memberRecord)return;
  paint();
  upload.disabled=!canEditArchive(record);upload.hidden=!canEditArchive(record);
  status.textContent=canEditArchive(record)?'点击头像选择图片':'该队员的头像仅可查看';
  dialog.showModal();source.classList.add('portrait-lifted');
  const end=sheet.getBoundingClientRect();
  // Compose the actual projected plane with the scaled stage, avoiding a jump
  // from its perspective/tilt to a guessed flat rectangle on the first frame.
  const host=source.parentElement!,hostRect=host.getBoundingClientRect();
  origin=new DOMMatrix().translate(-end.left,-end.top).translate(hostRect.left,hostRect.top)
   .scale(hostRect.width/host.clientWidth,hostRect.height/host.clientHeight)
   .multiply(new DOMMatrix(getComputedStyle(source).transform))
   .scale(640/end.width,864/end.height).toString();
  moving=true;animation=sheet.animate([{transform:origin},{transform:'none'}],{duration:duration(),easing:'cubic-bezier(.22,.68,.24,1)'});
  await animation.finished.catch(()=>{});moving=false;
  (upload.disabled?dialog.querySelector<HTMLButtonElement>('.portrait-close'):upload)?.focus({preventScroll:true});
 };
 source.addEventListener('click',event=>{event.stopPropagation();void open();},options);
 source.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();event.stopPropagation();void open();}},options);
 dialog.querySelector('.portrait-close')!.addEventListener('click',()=>void close(),options);
 dialog.addEventListener('click',event=>{if(event.target===dialog)void close();},options);
 dialog.addEventListener('cancel',event=>{event.preventDefault();void close();},options);
 document.addEventListener('keydown',event=>{
  if(!dialog.open)return;event.stopImmediatePropagation();
  if(event.key==='Escape'){event.preventDefault();void close();}
 },{...options,capture:true});
 upload.addEventListener('click',()=>{if(moving||!record||!canEditArchive(record))return;input.value='';input.click();},options);
 input.addEventListener('change',async()=>{
  const file=input.files?.[0],owner=record;
  if(!file||!owner||!canEditArchive(owner))return;
  if(!file.type.startsWith('image/')||file.size>20*1024*1024){status.textContent='请选择20MB以内的图片。';return;}
  const url=URL.createObjectURL(file);upload.disabled=true;status.textContent='正在保存头像…';
  try{
   const image=new Image();image.src=url;await image.decode();
   const thumbnail=document.createElement('canvas'),ratio=Math.min(1,1200/Math.max(image.width,image.height));
   thumbnail.width=Math.max(1,Math.round(image.width*ratio));thumbnail.height=Math.max(1,Math.round(image.height*ratio));
   const ctx=thumbnail.getContext('2d')!;ctx.fillStyle='#f7f3e9';ctx.fillRect(0,0,thumbnail.width,thumbnail.height);ctx.drawImage(image,0,0,thumbnail.width,thumbnail.height);
   const data=thumbnail.toDataURL('image/jpeg',.88);
   if(!dialog.open||getRecord().id!==owner.id||!canEditArchive(getRecord()))return;
   localStorage.setItem(portraitStorageKey,data);apply(image);paint();status.textContent='头像已保存到本浏览器';
  }catch{status.textContent='图片未能保存，请重选图片或检查浏览器存储。';}
  finally{URL.revokeObjectURL(url);upload.disabled=false;}
 },options);
 return ()=>{events.abort();animation?.cancel();dialog.close();dialog.remove();source.classList.remove('portrait-lifted');};
}
