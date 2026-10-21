import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { damp, smooth, returnStep, settlingWave, baselineSelectionWave, columnStrength } from './reference-motion';
import { DecryptionController } from './reference-decryption';
import { DocumentDecryption } from './document-reveal';

export type ArchiveSnapshot = {
  mode: 'archive' | 'opening' | 'reading' | 'returning'; lift: number; detail: number;
  rotation: number; clarity: number; scan: string; camera: number[]; model: number[];
  lines: number; drawCalls: number; reduced: boolean;
  category: number;
  loaded: boolean;
};
const W=3.15,H=3.7,ROWS=32,COLS=9;
const PHOTO='/assets/member-photo.png';
const lerp=THREE.MathUtils.lerp;

/** Real 3D archive world. Source motion/decryption curves are MIT-licensed by LBEILC. */
export class ArchiveScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene=new THREE.Scene();
  readonly camera=new THREE.PerspectiveCamera(6,1,5,300);
  readonly model=new THREE.Group();
  private pmrem: THREE.PMREMGenerator;
  private env: THREE.WebGLRenderTarget;
  private bodies: THREE.InstancedMesh;
  private fasteners: THREE.InstancedMesh;
  private glass: THREE.MeshPhysicalMaterial;
  private photo: THREE.ShaderMaterial;
  private lines: THREE.Line[]=[];
  private markers: THREE.Mesh[]=[];
  private doc=new DocumentDecryption();
  private decrypt=new DecryptionController();
  private lift={value:.4,velocity:0};
  private track={value:0,velocity:0};
  private rail={value:0,velocity:0};
  private detail=0;
  private angle=0;
  private targetAngle=0;
  private holdY:number|null=null;
  private target=false;
  private reduced=false;
  private disposed=false;
  private paused=false;
  private replayAfterReturn=false;
  private category=0;
  private row=12;
  private time=0;
  private selectedAt=-10;
  private last=0;
  private frameId=0;
  private cameraAim=new THREE.Vector3(-1.091,-.045,.481);
  private observer:ResizeObserver;
  private pointer=new THREE.Vector2();
  private hover=-1;
  private hoverLift=0;
  private raycaster=new THREE.Raycaster();
  private abort=new AbortController();
  private resources: THREE.Texture[]=[];
  private currentMode:ArchiveSnapshot['mode']='archive';
  private matrix=new THREE.Object3D();
  private loaded=false;

  constructor(private container:HTMLElement,private document:HTMLElement,private onFrame:(s:ArchiveSnapshot)=>void,private onLoad:()=>void,private onError:()=>void) {
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    this.renderer.setClearColor(0xe8e5e1,1);
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.08;
    this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.domElement.dataset.archiveWorld='true';
    this.renderer.domElement.setAttribute('aria-hidden','true');
    container.append(this.renderer.domElement);
    this.scene.background=new THREE.Color('#e8e5e1');
    this.scene.fog=new THREE.Fog('#e8e5e1',145,168);
    this.pmrem=new THREE.PMREMGenerator(this.renderer);
    const room=new RoomEnvironment();
    this.env=this.pmrem.fromScene(room,.04);room.dispose();
    this.scene.environment=this.env.texture;
    this.scene.environmentIntensity=.72;
    this.scene.add(new THREE.HemisphereLight(0xfffcf4,0xa6a398,2.2));
    const key=new THREE.DirectionalLight(0xfff9ec,3.2);key.position.set(-10,17,18);this.scene.add(key);
    const fill=new THREE.DirectionalLight(0xffffff,1.4);fill.position.set(8,7,-8);this.scene.add(fill);

    const bodyGeometry=new RoundedBoxGeometry(W,H,.14,2,.035);
    bodyGeometry.translate(0,H/2,0);
    const bodyMat=new THREE.MeshStandardMaterial({color:'#e4e2db',roughness:.32,metalness:.12});
    this.bodies=new THREE.InstancedMesh(bodyGeometry,bodyMat,ROWS*COLS);
    this.bodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bodies.frustumCulled=false;this.scene.add(this.bodies);
    this.fasteners=new THREE.InstancedMesh(new THREE.SphereGeometry(.039,8,6),new THREE.MeshStandardMaterial({color:'#b9b9ad',metalness:.7,roughness:.3}),ROWS*COLS*2);
    this.fasteners.frustumCulled=false;this.scene.add(this.fasteners);

    const back=new THREE.Mesh(bodyGeometry.clone(),new THREE.MeshPhysicalMaterial({color:'#f3f0e8',roughness:.24,metalness:.06,clearcoat:1,clearcoatRoughness:.22}));
    this.model.add(back);
    this.photo=new THREE.ShaderMaterial({toneMapped:false,uniforms:{uMap:{value:null},uClarity:{value:0}},vertexShader:`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
      uniform sampler2D uMap;uniform float uClarity;varying vec2 vUv;
      void main(){
        float clear=smoothstep(1.08-uClarity*1.16-.045,1.08-uClarity*1.16+.045,vUv.y);
        float radius=mix(.022,0.,clear);vec4 color=vec4(0.);float total=0.;
        for(int x=-3;x<=3;x++){for(int y=-3;y<=3;y++){float weight=exp(-float(x*x+y*y)/6.);color+=texture2D(uMap,clamp(vUv+vec2(float(x),float(y))*radius/3.,vec2(.001),vec2(.999)))*weight;total+=weight;}}
        color/=total;color.rgb=mix(color.rgb,vec3(.84,.83,.79),.50*(1.-clear));
        gl_FragColor=vec4(color.rgb,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
    const print=new THREE.Mesh(new THREE.PlaneGeometry(W-.25,H-.38),this.photo);print.position.set(0,H/2+.025,.081);this.model.add(print);
    this.glass=new THREE.MeshPhysicalMaterial({color:'#f8f6ef',transmission:.8,thickness:.045,roughness:.2,ior:1.45,transparent:true,opacity:.32,depthWrite:false,clearcoat:1,clearcoatRoughness:.16});
    const cover=new THREE.Mesh(new RoundedBoxGeometry(W+.025,H+.025,.045,2,.025),this.glass);cover.position.set(0,H/2,.115);cover.renderOrder=2;this.model.add(cover);
    const screwMat=new THREE.MeshStandardMaterial({color:'#9c9b90',metalness:.8,roughness:.26});
    for(const x of [-W/2+.09,W/2-.09])for(const y of [.09,H-.09]){const screw=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.015,16),screwMat);screw.rotation.x=Math.PI/2;screw.position.set(x,y,.151);this.model.add(screw);}
    const lineMat=new THREE.LineBasicMaterial({color:'#252720',transparent:true,opacity:1,depthTest:false});
    for(let i=0;i<2;i++){const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),lineMat.clone());line.renderOrder=9;this.model.add(line);this.lines.push(line);}
    for(const [x,y] of [[-W/2+.16,.35],[W/2-.16,H-.2],[-W/2+.16,H-.2],[W/2-.16,.35]]){const mark=new THREE.Mesh(new THREE.PlaneGeometry(.035,.035),new THREE.MeshBasicMaterial({color:'#262720',transparent:true,depthTest:false}));mark.position.set(x,y,.17);mark.renderOrder=10;this.model.add(mark);this.markers.push(mark);}
    this.scene.add(this.model);
    this.camera.position.copy(this.cameraAim).addScaledVector(this.arrayDirection(),140);this.camera.lookAt(this.cameraAim);
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(container);this.resize();
    const signal=this.abort.signal;
    container.addEventListener('pointermove',event=>{const box=container.getBoundingClientRect();this.pointer.set((event.clientX-box.left)/box.width*2-1,-(event.clientY-box.top)/box.height*2+1);if(this.target&&this.detail>.9&&(event.buttons&1))this.targetAngle=THREE.MathUtils.clamp(this.targetAngle+event.movementX*.004,-.45,.45);if(!this.target&&this.loaded){this.raycaster.setFromCamera(this.pointer,this.camera);this.hover=this.raycaster.intersectObject(this.bodies)[0]?.instanceId??-1;}},{signal});
    container.addEventListener('pointerleave',()=>{this.hover=-1;},{signal});
    container.addEventListener('pointerup',event=>{if(this.target||!this.loaded)return;const box=container.getBoundingClientRect();this.raycaster.setFromCamera(new THREE.Vector2((event.clientX-box.left)/box.width*2-1,-(event.clientY-box.top)/box.height*2+1),this.camera);if(this.raycaster.intersectObject(this.model,true).length){this.open();return;}const hit=this.raycaster.intersectObject(this.bodies)[0];if(hit?.instanceId!==undefined){const col=Math.floor(hit.instanceId/ROWS),selectedCol=((this.category%COLS)+4)%COLS;const lane=this.category+(((col-selectedCol+COLS+4)%COLS)-4);this.row=hit.instanceId%ROWS;this.select(lane);}}, {signal});
    new THREE.TextureLoader().load(PHOTO,texture=>{if(this.disposed){texture.dispose();return;}texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());this.resources.push(texture);this.photo.uniforms.uMap.value=texture;this.loaded=true;onLoad();},undefined,()=>onError());
    this.frameId=requestAnimationFrame(this.tick);
  }

  private arrayDirection(){return new THREE.Vector3(-Math.sin(59*Math.PI/180)*Math.cos(19*Math.PI/180),Math.sin(19*Math.PI/180),Math.cos(59*Math.PI/180)*Math.cos(19*Math.PI/180));}
  private resize(){const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  open(){if(!this.loaded)return;this.target=true;this.paused=false;this.holdY=null;this.decrypt.enter();this.doc.reset(this.document,false);this.currentMode='opening';if(this.reduced)this.skip();}
  close(){this.paused=false;this.target=false;this.decrypt.leave();this.targetAngle=0;this.holdY=this.angle!==0?this.model.position.y:null;this.currentMode='returning';}
  replay(){this.paused=false;this.replayAfterReturn=true;this.close();}
  select(index:number){if(this.target)return;this.category=((index%3)+3)%3;this.selectedAt=this.time;}
  setReduced(value:boolean){this.reduced=value;if(value)this.skip();}
  skip(){if(!this.loaded)return;this.paused=false;this.resize();this.replayAfterReturn=false;this.target=true;this.lift={value:4.05,velocity:0};this.detail=1;this.angle=0;this.targetAngle=0;this.holdY=null;this.decrypt.enter(true);this.decrypt.finish();this.doc.reset(this.document,true);this.currentMode='reading';this.step(.05,true,true);}
  private tick=(timestamp:number)=>{if(this.disposed)return;const dt=Math.min(.05,Math.max(.001,(timestamp-this.last)/1000||.016));this.last=timestamp;if(!this.paused&&this.loaded)this.step(dt,true);this.frameId=requestAnimationFrame(this.tick);};

  private step(dt:number,render:boolean,immediate=false){
    this.time+=dt;
    const rate=this.reduced?35:2.8;
    this.angle=this.target?lerp(this.angle,this.targetAngle,1-Math.exp(-dt*rate)):returnStep(this.angle,dt,this.reduced);
    damp(this.track,this.category*5.2,6,dt);
    damp(this.rail,-(this.row-12)*.62,6,dt);
    this.hoverLift=lerp(this.hoverLift,!this.target&&this.hover>=0?.28:0,1-Math.exp(-dt*14));
    const centerY=-4.6+settlingWave(0,26.56);
    if(this.holdY!==null&&this.angle!==0){this.lift.value=this.holdY-centerY;this.lift.velocity=0;}else{this.holdY=null;damp(this.lift,this.target?4.05:.4,this.reduced?35:4.2,dt);}
    const cameraTarget=this.target?smooth((this.lift.value-.8)/2.4):this.holdY!==null?this.detail:smooth((this.lift.value-.4)/3.65);
    this.detail=immediate?cameraTarget:lerp(this.detail,cameraTarget,1-Math.exp(-dt*rate));
    this.model.position.set(this.category*5.2-this.track.value,centerY+this.lift.value,(this.row-15.5)*.62+this.rail.value);
    this.model.rotation.set(0,this.angle,0);
    this.decrypt.update(dt,this.detail>.78&&this.lift.value>3.3,this.reduced);
    this.photo.uniforms.uClarity.value=this.decrypt.clarity;
    this.glass.roughness=lerp(.7,.12,this.decrypt.clarity);
    this.glass.opacity=lerp(.42,.16,this.decrypt.clarity);
    this.doc.update(this.time,this.decrypt.frame,this.reduced);

    const detail=this.detail;
    const distance=lerp(140,72,detail);
    const direction=this.arrayDirection().lerp(new THREE.Vector3(-.277,.238,.931),detail).normalize();
    const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize();
    const up=new THREE.Vector3().crossVectors(direction,right).normalize();
    const w=this.container.clientWidth,h=this.container.clientHeight;
    this.camera.aspect=w/h;
    const portrait=w<=950;
    const span=portrait?lerp(8.4/(w/h),9,detail):Math.max(lerp(7.33,4.95,detail),lerp(7.33,4.95,detail)*(1.6/(w/h)));
    const detailX=portrait?.5:.286,detailY=portrait?.35:.535;
    const detailAim=this.model.position.clone().add(new THREE.Vector3(0,H/2,0)).addScaledVector(right,(.5-detailX)*w/(h/span)).addScaledVector(up,(detailY-.5)*span);
    const aim=new THREE.Vector3(-1.091,-.045,.481).lerp(detailAim,detail);
    const position=aim.clone().addScaledVector(direction,distance);
    if(!this.reduced){position.x+=this.pointer.x*.12;position.y-=this.pointer.y*.12;}
    const cameraBlend=immediate?1:1-Math.exp(-dt*5);
    this.camera.position.lerp(position,cameraBlend);this.cameraAim.lerp(aim,cameraBlend);this.camera.lookAt(this.cameraAim);
    this.camera.fov=lerp(this.camera.fov,THREE.MathUtils.radToDeg(2*Math.atan(span/(2*distance))),cameraBlend);
    this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();
    const renderedDistance=this.camera.position.distanceTo(this.cameraAim);
    (this.scene.fog as THREE.Fog).near=renderedDistance+lerp(5,-1,detail);
    (this.scene.fog as THREE.Fog).far=renderedDistance+lerp(25,9,detail);

    const selectedCol=((this.category%COLS)+4)%COLS;
    let screw=0;
    for(let col=0;col<COLS;col++)for(let row=0;row<ROWS;row++){
      const lane=this.category+(((col-selectedCol+COLS+4)%COLS)-4);
      const x=lane*5.2-this.track.value;
      const selected=col===selectedCol&&row===this.row;
      const difference=row-this.row;
      const wave=settlingWave(difference,26.56)*columnStrength(lane,this.category);
      const pulse=this.target?0:baselineSelectionWave(Math.hypot(difference,(lane-this.category)*2.2),this.time-this.selectedAt);
      const y=-4.6+wave+pulse+(col*ROWS+row===this.hover?this.hoverLift:0);
      const z=(row-15.5)*.62+this.rail.value;
      this.matrix.position.set(x,y,z);this.matrix.scale.setScalar(selected?0:1);this.matrix.updateMatrix();this.bodies.setMatrixAt(col*ROWS+row,this.matrix.matrix);
      for(const sx of [-W/2+.09,W/2-.09]){this.matrix.position.set(x+sx,y+H-.09,z+.09);this.matrix.updateMatrix();this.fasteners.setMatrixAt(screw++,this.matrix.matrix);}
    }
    this.bodies.instanceMatrix.needsUpdate=true;this.fasteners.instanceMatrix.needsUpdate=true;
    this.updateScan();
    if(this.target&&this.decrypt.frame.phase==='clear')this.currentMode='reading';
    if(!this.target&&this.lift.value<.401&&this.detail<.003){this.currentMode='archive';if(this.replayAfterReturn){this.replayAfterReturn=false;this.open();}}
    if(render)this.renderer.render(this.scene,this.camera);
    this.onFrame(this.snapshot());
  }

  private updateScan(){
    const frame=this.decrypt.frame;
    for(let i=0;i<this.lines.length;i++){
      const line=this.lines[i],interval=frame.intervals[i];line.visible=!!interval;
      if(interval){const point=(t:number)=>new THREE.Vector3(lerp(-W/2+.18,W/2-.18,t),lerp(.5,H-.38,t),.175);line.geometry.setFromPoints([point(interval[0]),point(interval[1])]);}
    }
    this.markers.forEach(marker=>{marker.visible=frame.markers>.001;(marker.material as THREE.MeshBasicMaterial).opacity=frame.markers;});
  }

  snapshot():ArchiveSnapshot{return{mode:this.currentMode,lift:this.lift.value,detail:this.detail,rotation:this.angle,clarity:this.decrypt.clarity,scan:this.decrypt.frame.phase,camera:this.camera.position.toArray(),model:this.model.position.toArray(),lines:this.decrypt.frame.intervals.length,drawCalls:this.renderer.info.render.calls,reduced:this.reduced,category:this.category,loaded:this.loaded};}
  /** QA pins the real renderer to a simulation time rather than asserting a CSS delay. */
  inspectAt(seconds:number){this.paused=true;this.time=0;this.target=false;this.category=0;this.row=12;this.rail={value:0,velocity:0};this.track={value:0,velocity:0};this.targetAngle=0;this.lift={value:.4,velocity:0};this.detail=0;this.angle=0;this.holdY=null;this.cameraAim.set(-1.091,-.045,.481);this.camera.position.copy(this.cameraAim).addScaledVector(this.arrayDirection(),140);this.camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(7.33/(2*140)));this.decrypt.select();this.open();this.paused=true;this.step(0,false);for(let t=0;t<seconds;t+=1/120)this.step(1/120,false);this.renderer.render(this.scene,this.camera);return this.snapshot();}
  dispose(){this.disposed=true;cancelAnimationFrame(this.frameId);this.abort.abort();this.observer.disconnect();this.doc.reset(this.document,true);this.scene.traverse(object=>{if(object instanceof THREE.Mesh||object instanceof THREE.Line){object.geometry.dispose();for(const material of Array.isArray(object.material)?object.material:[object.material])material.dispose();}});this.resources.forEach(texture=>texture.dispose());this.env.dispose();this.pmrem.dispose();this.renderer.dispose();this.renderer.domElement.remove();}
}
