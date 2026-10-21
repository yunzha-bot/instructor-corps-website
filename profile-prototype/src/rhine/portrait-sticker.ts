import * as THREE from "three";
import { assetUrl } from "./asset-url";
import { CURRENT_MEMBER_ID } from './members';

export const PORTRAIT_REVEAL_START = 38.84; // The scan line has finished retracting.
export const PORTRAIT_REVEAL_DURATION = 0.86;
export const PORTRAIT_CENTER = [0.83, 1.87] as const;
export function portraitRevealFrame(elapsed: number) {
  const smooth = (value: number) => {
    const t = THREE.MathUtils.clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  };
  if (elapsed <= 0) return { width: 0, height: 0, phase: "hidden" };
  const width = THREE.MathUtils.lerp(0.012, 1, smooth((elapsed - 0.1) / 0.28));
  const height = THREE.MathUtils.lerp(0.008, 1, smooth((elapsed - 0.38) / 0.48));
  return { width, height, phase: elapsed < 0.1 ? "point" : elapsed < 0.38 ? "line" : elapsed < PORTRAIT_REVEAL_DURATION ? "opening" : "complete" };
}

// User-supplied display image; independent of real member identity.
export const portraitStickerContent = {
  image: "assets/archive-sticker-custom.jpg",
  caption: "自定义图片",
};
export const portraitStorageKey = `corps-portrait-${CURRENT_MEMBER_ID}-v1`;
function savedPortrait(){try{return localStorage.getItem(portraitStorageKey);}catch{return null;}}

export async function createPortraitSticker() {
  const image = new Image();
  image.src = savedPortrait() || assetUrl(portraitStickerContent.image);
  try{await image.decode();}catch{image.src=assetUrl(portraitStickerContent.image);await image.decode();}
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 864;
  const ctx = canvas.getContext("2d")!;
  // Slightly uneven hand-cut paper, with broad edges rather than noisy torn fibres.
  ctx.beginPath();
  ctx.moveTo(21, 18);
  ctx.lineTo(608, 10);
  ctx.quadraticCurveTo(625, 10, 624, 28);
  ctx.lineTo(630, 824);
  ctx.quadraticCurveTo(629, 845, 608, 844);
  ctx.lineTo(30, 854);
  ctx.quadraticCurveTo(11, 855, 13, 832);
  ctx.lineTo(10, 36);
  ctx.quadraticCurveTo(9, 19, 21, 18);
  ctx.closePath();
  ctx.fillStyle = "#f7f3e9";
  ctx.fill();
  ctx.strokeStyle = "#cec7b9";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.save();
  ctx.clip();
  // Cover crop; keep the original photo intact on disk.
  const x = 43, y = 43, width = 554, height = 710;
  const scale = Math.max(width / image.width, height / image.height);
  const sourceWidth = width / scale, sourceHeight = height / scale;
  ctx.drawImage(image, (image.width - sourceWidth) / 2, (image.height - sourceHeight) * 0.35,
    sourceWidth, sourceHeight, x, y, width, height);
  ctx.fillStyle = "rgba(0, 0, 0, 0.1)"; // 轻微压暗；把 0.04 调大，照片会更暗
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = "#777566";
  ctx.font = '16px "MiSans", sans-serif';
  ctx.fillText("PORTRAIT / DEMO", 45, 788);
  ctx.font = '18px "MiSans", sans-serif';
  ctx.fillText(portraitStickerContent.caption, 45, 820);
  ctx.restore();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new THREE.MeshPhysicalMaterial({
    name: "Portrait_Sticker", map: texture, color: "#ffffff", roughness: 0.9,
    metalness: 0, alphaTest: 0.1,
    // Printed image colour is preserved by the appearance shader, independently
    // of the case lighting. Do not add emission or distance haze to the photo.
    toneMapped: false, fog: false,
  });
  const sticker = new THREE.Mesh(new THREE.PlaneGeometry(1.82, 2.46), material);
  sticker.name = "Portrait_Sticker";
  sticker.userData.surface = "Portrait_Sticker";
  sticker.userData.assemblyPart = "cover";
  sticker.userData.nativeOverlayCanvas = canvas;
  sticker.position.set(...PORTRAIT_CENTER, 0.265);
  sticker.rotation.z = -0.075;
  return sticker;
}
export function replacePortraitImage(sticker:THREE.Mesh,image:HTMLImageElement){
 const canvas=(sticker.userData.portraitOriginal||sticker.userData.nativeOverlayCanvas) as HTMLCanvasElement;
 const ctx=canvas.getContext('2d')!,width=554,height=710;
 const scale=Math.max(width/image.width,height/image.height),sw=width/scale,sh=height/scale;
 ctx.drawImage(image,(image.width-sw)/2,(image.height-sh)*.35,sw,sh,43,43,width,height);
 ctx.fillStyle='rgba(0,0,0,.1)';ctx.fillRect(43,43,width,height);
}
/** Update once on selection; reuse the same canvas and native overlay. */
export function setStickerRecord(sticker: THREE.Mesh, record: {title:string;category:string;id:string;ownerId?:string}) {
  const canvas = sticker.userData.nativeOverlayCanvas as HTMLCanvasElement;
  if (!canvas) return;
  if (!sticker.userData.portraitOriginal) {
    const original = document.createElement('canvas'); original.width=canvas.width; original.height=canvas.height;
    original.getContext('2d')!.drawImage(canvas,0,0); sticker.userData.portraitOriginal=original;
  }
  const ctx=canvas.getContext('2d')!;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(sticker.userData.portraitOriginal,0,0);
  if (record.category !== '队伍档案' || record.ownerId !== CURRENT_MEMBER_ID) {
    ctx.fillStyle='#eeeee3';ctx.fillRect(43,43,554,710);
    ctx.fillStyle='#7a806e';ctx.font='18px MiSans';ctx.fillText(`${record.id} / DEMO`,72,96);
    ctx.fillStyle='#283326';ctx.font='bold 46px MiSans';ctx.fillText(record.category,72,192);
    ctx.font='30px MiSans';ctx.fillText(record.title,72,254);
    ctx.strokeStyle='#b7baab';ctx.lineWidth=2;
    if(record.category==='队伍档案') {
      ctx.strokeRect(174,304,292,274);ctx.font='24px MiSans';ctx.fillStyle='#747b6b';ctx.fillText('头像待添加',258,448);
    } else if(record.category==='青春记忆') {
      ctx.strokeRect(72,304,492,274);ctx.font='24px MiSans';ctx.fillStyle='#747b6b';ctx.fillText('照片待添加',238,448);
    } else {
      const labels=record.category==='训练记录'?['训练时间 / 待登记','出勤情况 / 待登记','项目结果 / 尚未核验']:record.category==='荣誉里程'?['记录时间 / 待补充','授予单位 / 待核验','证明材料 / 待添加']:['文档标题 / 由本人填写','保存范围 / 当前浏览器','可见范围 / 默认仅本人'];
      ctx.font='23px MiSans';ctx.fillStyle='#747b6b';labels.forEach((text,i)=>{const y=350+i*100;ctx.fillText(text,72,y);ctx.beginPath();ctx.moveTo(72,y+28);ctx.lineTo(564,y+28);ctx.stroke();});
    }
    ctx.font='20px MiSans';ctx.fillStyle='#747b6b';ctx.fillText('演示档案 · 正式内容待提供',72,688);
    ctx.fillStyle='#f7f3e9';ctx.fillRect(34,760,570,76);ctx.fillStyle='#777566';ctx.font='18px MiSans';ctx.fillText(record.category+' / DEMO',45,794);ctx.fillText(record.id,45,822);
  }
  const map=(sticker.material as THREE.MeshPhysicalMaterial).map; if(map)map.needsUpdate=true;
}
