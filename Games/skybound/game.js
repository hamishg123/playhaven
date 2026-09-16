import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.162.0/build/three.module.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.162.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.162.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.162.0/examples/jsm/postprocessing/UnrealBloomPass.js';

const $ = id => document.getElementById(id);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const lerp = (a,b,t) => a+(b-a)*t;

const ui = {
  menu:$('menu'), hud:$('hud'), pause:$('pauseScreen'), gameOver:$('gameOverScreen'), victory:$('victoryScreen'),
  how:$('howPanel'), loading:$('loading'), loadingBar:$('loadingBar'), loadingText:$('loadingText'),
  play:$('playBtn'), howBtn:$('howBtn'), closeHow:$('closeHow'), resume:$('resumeBtn'), restartPause:$('restartPauseBtn'),
  homePause:$('homePauseBtn'), retry:$('retryBtn'), homeGameOver:$('homeGameOverBtn'), victoryRetry:$('victoryRetryBtn'), victoryHome:$('victoryHomeBtn'),
  shards:$('shardsHud'), score:$('scoreHud'), best:$('bestHud'), bestMenu:$('bestScoreMenu'), healthBar:$('healthBar'), healthText:$('healthText'),
  checkpoint:$('checkpointHud'), stage:$('stageHud'), key:$('keyHud'), toast:$('messageToast'), goScore:$('gameOverScore'), goShards:$('gameOverShards'),
  goTitle:$('gameOverTitle'), goText:$('gameOverText'), vScore:$('victoryScore'), vShards:$('victoryShards'), flash:$('flash')
};

const state = {
  mode:'menu', score:0, shards:0, health:100, best:Number(localStorage.getItem('skybound_best')||0),
  checkpoint:'START', stage:1, keyFound:false, time:0, runTime:0, combo:0, comboTimer:0
};
if(ui.best) ui.best.textContent=state.best;
if(ui.bestMenu) ui.bestMenu.textContent=state.best;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06111f);
scene.fog = new THREE.FogExp2(0x06111f,0.0065);
const camera = new THREE.PerspectiveCamera(63,innerWidth/innerHeight,.05,700);
const renderer = new THREE.WebGLRenderer({antialias:true,canvas:$('game'),powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.15;
const composer=new EffectComposer(renderer); composer.addPass(new RenderPass(scene,camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.82,.85,.72));

const hemi=new THREE.HemisphereLight(0xa8e5ff,0x07121f,2.2); scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff0cc,4.8); sun.position.set(-30,70,-25); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-85; sun.shadow.camera.right=85; sun.shadow.camera.top=140; sun.shadow.camera.bottom=-30; scene.add(sun);
const fill=new THREE.DirectionalLight(0x4abfff,1.4); fill.position.set(35,20,30); scene.add(fill);

const world=new THREE.Group(); scene.add(world);
const environment=new THREE.Group(); world.add(environment);
const dynamic=new THREE.Group(); world.add(dynamic);
const effects=new THREE.Group(); world.add(effects);

const MAT={
  grass:new THREE.MeshStandardMaterial({color:0x235f48,roughness:.84}),
  grass2:new THREE.MeshStandardMaterial({color:0x318967,roughness:.8}),
  stone:new THREE.MeshStandardMaterial({color:0x394b5a,roughness:.94}),
  stoneDark:new THREE.MeshStandardMaterial({color:0x162633,roughness:.96}),
  stage2:new THREE.MeshStandardMaterial({color:0x734029,roughness:.88}),
  stage2b:new THREE.MeshStandardMaterial({color:0xb85c31,roughness:.75}),
  stage3:new THREE.MeshStandardMaterial({color:0x41627a,roughness:.78,metalness:.08}),
  stage3b:new THREE.MeshStandardMaterial({color:0x69b6d8,roughness:.5,metalness:.12,transparent:true,opacity:.9}),
  stage4:new THREE.MeshStandardMaterial({color:0x483d73,roughness:.8}),
  stage4b:new THREE.MeshStandardMaterial({color:0xa57bf6,roughness:.42,metalness:.14}),
  gold:new THREE.MeshStandardMaterial({color:0xffd45f,emissive:0x8b5200,emissiveIntensity:1.7,roughness:.22,metalness:.35}),
  key:new THREE.MeshStandardMaterial({color:0x8cf3ff,emissive:0x1bb6d8,emissiveIntensity:4,roughness:.18,metalness:.3}),
  door:new THREE.MeshStandardMaterial({color:0x172b38,emissive:0x062e43,emissiveIntensity:.55,roughness:.28,metalness:.62}),
  portal:new THREE.MeshStandardMaterial({color:0x7cf2ff,emissive:0x1f8da8,emissiveIntensity:5.5,roughness:.1,metalness:.12,transparent:true,opacity:.95}),
  enemy:new THREE.MeshStandardMaterial({color:0xef5967,emissive:0x55151d,emissiveIntensity:1.7,roughness:.4}),
  enemyEye:new THREE.MeshBasicMaterial({color:0xfff2aa}),
  player:new THREE.MeshStandardMaterial({color:0x77ddff,emissive:0x0b667f,emissiveIntensity:.55,roughness:.32,metalness:.12}),
  accent:new THREE.MeshStandardMaterial({color:0xffd56e,emissive:0x8c5208,emissiveIntensity:1.1,roughness:.22,metalness:.3}),
  dark:new THREE.MeshStandardMaterial({color:0x0b1722,roughness:.9})
};
const geo={box:(x,y,z)=>new THREE.BoxGeometry(x,y,z),sphere:r=>new THREE.SphereGeometry(r,24,16),cyl:(r,h)=>new THREE.CylinderGeometry(r,r,h,20),torus:(a,b)=>new THREE.TorusGeometry(a,b,12,36)};

const platforms=[], hazards=[], collectibles=[], checkpoints=[], enemies=[], movers=[], boosts=[], springs=[], doors=[], keys=[];
let portal=null;

function addBox(parent,mat,pos,size,opts={}){const m=new THREE.Mesh(geo.box(...size),mat);m.position.set(...pos);m.castShadow=opts.castShadow??true;m.receiveShadow=opts.receiveShadow??true;parent.add(m);return m;}
function addPlatform(x,top,z,w,d,h=1,mat=MAT.grass,stage=1){
  const mesh=addBox(world,mat,[x,top-h/2,z],[w,h,d]);
  platforms.push({x,z,y:top,w,d,h,mesh,kind:'solid',stage,baseX:x,baseZ:z,baseY:top,dx:0,dz:0});
  const trimMat=[MAT.grass2,MAT.stage2b,MAT.stage3b,MAT.stage4b][stage-1]||MAT.grass2;
  const trim=addBox(world,trimMat,[x,top+.05,z],[Math.max(.5,w*.94),.08,Math.max(.5,d*.94)],{castShadow:false});
  trim.userData.decor=true;
  return platforms[platforms.length-1];
}
function addMovingPlatform(x,top,z,w,d,h,ampX,ampZ,speed,phase,stage){
  const p=addPlatform(x,top,z,w,d,h,MAT.stage3b,stage);p.kind='moving';p.baseX=x;p.baseZ=z;p.ampX=ampX;p.ampZ=ampZ;p.speed=speed;p.phase=phase||0;movers.push(p);return p;
}
function addShard(x,y,z){
  const g=new THREE.Group(); g.position.set(x,y,z);
  const gem=addBox(g,MAT.gold,[0,0,0],[.28,.58,.28]); gem.rotation.set(.2,.25,.35);
  const ring=new THREE.Mesh(geo.torus(.42,.018),new THREE.MeshBasicMaterial({color:0xffe6a7,transparent:true,opacity:.58}));ring.rotation.x=Math.PI/2;g.add(ring);
  dynamic.add(g); collectibles.push({group:g,baseY:y,got:false,phase:Math.random()*Math.PI*2});
}
function addKey(x,y,z,stage){
  const g=new THREE.Group();g.position.set(x,y,z);
  const shaft=addBox(g,MAT.key,[0,0,0],[.18,.95,.18],{castShadow:false});shaft.rotation.z=.35;
  const head=new THREE.Mesh(geo.torus(.28,.075),MAT.key);head.rotation.z=Math.PI/2;head.position.y=.34;g.add(head);
  const tooth=addBox(g,MAT.key,[.16,-.2,0],[.18,.28,.18],{castShadow:false});
  const light=new THREE.PointLight(0x57e8ff,2.8,6);g.add(light);dynamic.add(g);
  keys.push({group:g,x,z,y,stage,found:false});
}
function addCheckpoint(x,top,z,label,stage){
  const g=new THREE.Group();g.position.set(x,top,z);
  addBox(g,MAT.dark,[0,.14,0],[1.35,.28,1.35]);
  const pole=addBox(g,[MAT.key,MAT.stage2b,MAT.stage3b,MAT.stage4b][stage-1],[0,1.2,0],[.18,2.4,.18],{castShadow:false});
  pole.material.emissive=pole.material.color.clone();pole.material.emissiveIntensity=.55;
  const orb=new THREE.Mesh(geo.sphere(.33),MAT.key);orb.position.y=2.25;g.add(orb);const light=new THREE.PointLight(0x63e8ff,2.5,9);light.position.y=2.1;g.add(light);
  dynamic.add(g);checkpoints.push({group:g,x,z,top,active:false,label,stage});
}
function addSpring(x,top,z,scale=1){
  const g=new THREE.Group();g.position.set(x,top+.04,z);addBox(g,MAT.accent,[0,.12,0],[1.2*scale,.24,1.2*scale],{castShadow:false});const r=new THREE.Mesh(geo.torus(.46*scale,.05),new THREE.MeshBasicMaterial({color:0xffef9a,transparent:true,opacity:.9}));r.rotation.x=Math.PI/2;r.position.y=.3;g.add(r);dynamic.add(g);springs.push({group:g,x,z,top,scale,cool:0});
}
function addBoost(x,top,z,dirX,dirZ){
  const g=new THREE.Group();g.position.set(x,top+.08,z);addBox(g,MAT.portal,[0,0,0],[1.8,.12,2.4],{castShadow:false});
  const arrow=new THREE.Mesh(new THREE.ConeGeometry(.33,.9,5),MAT.accent);arrow.rotation.x=Math.PI/2;arrow.position.set(dirX*.45,.09,dirZ*.45);g.add(arrow);dynamic.add(g);boosts.push({group:g,x,z,top,dirX,dirZ,cool:0});
}
function addHazard(x,top,z,w=1.8,d=1.6){
  const mat=new THREE.MeshStandardMaterial({color:0xff425a,emissive:0x7c0a1f,emissiveIntensity:1.8,roughness:.38});
  const mesh=addBox(world,mat,[x,top+.08,z],[w,.16,d],{castShadow:false});hazards.push({x,z,top,w,d,mesh,cool:0});
}
function addEnemy(x,top,z,path=2.8){
  const g=new THREE.Group();g.position.set(x,top+.62,z);const body=new THREE.Mesh(geo.sphere(.62),MAT.enemy);body.scale.set(1.1,.86,.96);body.castShadow=true;g.add(body);
  for(const sx of [-.2,.2]){const e=new THREE.Mesh(geo.sphere(.08),MAT.enemyEye);e.position.set(sx,.12,.55);g.add(e)}
  const aura=new THREE.Mesh(geo.torus(.76,.03),new THREE.MeshBasicMaterial({color:0xff7280,transparent:true,opacity:.34}));aura.rotation.x=Math.PI/2;aura.position.y=-.46;g.add(aura);dynamic.add(g);
  enemies.push({group:g,originX:x,top,z,path,phase:Math.random()*Math.PI*2,dead:false,stage:0});
}
function addDoor(x,top,z,stage,label){
  const g=new THREE.Group();g.position.set(x,top,z);
  const h=5.8,w=5.8,t=.85;
  const frameMat=[MAT.grass2,MAT.stage2b,MAT.stage3b,MAT.stage4b][stage-1];
  addBox(g,frameMat,[-w/2-.55,h/2,0],[1.1,h,t],{castShadow:true});addBox(g,frameMat,[w/2+.55,h/2,0],[1.1,h,t],{castShadow:true});
  const panel=addBox(g,MAT.door,[0,h/2,0],[w,h,t],{castShadow:true});
  const rune=new THREE.Mesh(geo.torus(1.08,.09),MAT.key);rune.rotation.y=Math.PI/2;rune.position.z=-t/2-.03;rune.position.y=h/2;g.add(rune);
  const light=new THREE.PointLight(0x63e8ff,2.5,11);light.position.set(0,2.6,-1);g.add(light);
  dynamic.add(g);doors.push({group:g,panel,stage,top,z,label,open:false,progress:0,collidable:true,w:h? w:.0,h,t});
}
function addPortal(x,top,z){
  const g=new THREE.Group();g.position.set(x,top,z);const ring=new THREE.Mesh(geo.torus(2.35,.26,18,72),MAT.portal);ring.rotation.x=Math.PI/2;g.add(ring);
  const inner=new THREE.Mesh(new THREE.CircleGeometry(2.02,48),new THREE.MeshBasicMaterial({color:0x5cdfff,transparent:true,opacity:.17,side:THREE.DoubleSide}));inner.rotation.x=-Math.PI/2;g.add(inner);
  const l=new THREE.PointLight(0x5edcff,9,20);l.position.y=.3;g.add(l);dynamic.add(g);portal={group:g,x,top,z,open:true};
}
function addPillar(x,baseY,z,h,r,mat){const m=addBox(environment,mat,[x,baseY+h/2,z],[r,h,r]);m.rotation.y=Math.random()*Math.PI;return m}
function addCrystalCluster(x,y,z,color,count=4){const group=new THREE.Group();group.position.set(x,y,z);for(let i=0;i<count;i++){const h=.6+Math.random()*1.8;const c=new THREE.Mesh(new THREE.ConeGeometry(.22+Math.random()*.16,h,6),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.7,roughness:.34,metalness:.08}));c.position.set((Math.random()-.5)*1.3,h/2,(Math.random()-.5)*1.3);c.rotation.y=Math.random()*Math.PI;c.rotation.z=(Math.random()-.5)*.45;group.add(c)}const glow=new THREE.PointLight(color,2.6,7);glow.position.y=.8;group.add(glow);environment.add(group)}

function stageStyle(stage){
  return [
    {name:'VERDANT MEADOWS',a:MAT.grass,b:MAT.grass2,color:0x60e7a5},
    {name:'EMBER CANYON',a:MAT.stage2,b:MAT.stage2b,color:0xff8d55},
    {name:'FROST SPIRE',a:MAT.stage3,b:MAT.stage3b,color:0x8eeaff},
    {name:'STARFORGE SUMMIT',a:MAT.stage4,b:MAT.stage4b,color:0xc5a5ff}
  ][stage-1];
}

function buildStage(stage,z0,baseY){
  const s=stageStyle(stage);
  // A deliberately linear lane: every landing is wider than the gap and points straight to the next gate.
  const layouts={
    1:[[0,baseY,10,10,8],[0,baseY+1.0,19,8.5,7],[1.2,baseY+2.1,28,8,7],[-.5,baseY+2.8,37,9,8],[0,baseY+3.0,47,11,8]],
    2:[[0,baseY,58,10,8],[0,baseY+1.2,67,8.8,7],[-1.5,baseY+2.4,76,8,7],[1.0,baseY+3.8,85,7.5,7],[0,baseY+4.0,95,10,8]],
    3:[[0,baseY,106,10,8],[0,baseY+1.4,115,8.5,7],[1.4,baseY+2.6,124,7.8,7],[-1.0,baseY+4.0,133,8,7],[0,baseY+4.4,143,10,8]],
    4:[[0,baseY,154,11,8],[0,baseY+1.5,164,8.8,7],[1.2,baseY+3.0,174,8.2,7],[-1.0,baseY+4.4,184,8,7],[0,baseY+4.8,194,12,10]]
  };
  const mats=[s.a,s.a,s.b,s.a,s.b];
  layouts[stage].forEach((q,i)=>addPlatform(q[0],q[1],q[2],q[3],q[4],1,mats[i],stage));
  // One central moving section per later zone, still on the single forward route.
  if(stage===2){addMovingPlatform(0,baseY+5.8,104,5.5,4.2,.9,2.3,0,1.0,.4,stage)}
  if(stage===3){addMovingPlatform(0,baseY+6.3,152,5.5,4.0,.9,0,2.5,1.1,1.2,stage)}
  if(stage===4){addMovingPlatform(0,baseY+6.8,202,5.5,4.0,.9,2.4,0,1.0,2.3,stage)}
  // Key + checkpoint sit directly on the stage's final landing, not floating above it.
  const keyTop=layouts[stage][4][1]; const keyZ=layouts[stage][4][2]; addKey(0,keyTop+.49,keyZ,stage); addCheckpoint(-2.5,keyTop,keyZ,`STAGE ${stage}`,stage);
  if(stage<4){ addDoor(0,keyTop,keyZ+5.2,stage,`GATE ${stage+1}`); }
  // Combat/traversal beats stay on the single route.
  addEnemy(layouts[stage][1][0],layouts[stage][1][1],layouts[stage][1][2],2.4);
  addEnemy(layouts[stage][3][0],layouts[stage][3][1],layouts[stage][3][2],2.7);
  addHazard(layouts[stage][2][0],layouts[stage][2][1],layouts[stage][2][2],2.2,1.9);
  if(stage===1){addSpring(0,layouts[stage][1][1],layouts[stage][1][2],1.05);addBoost(0,layouts[stage][3][1],layouts[stage][3][2],0,1)}
  if(stage===2){addSpring(0,layouts[stage][2][1],layouts[stage][2][2],1.0);addHazard(0,layouts[stage][3][1],layouts[stage][3][2],2.0,1.6)}
  if(stage===3){addBoost(0,layouts[stage][2][1],layouts[stage][2][2],0,1);addSpring(0,layouts[stage][3][1],layouts[stage][3][2],1.0)}
  if(stage===4){addBoost(0,layouts[stage][2][1],layouts[stage][2][2],0,1);addSpring(0,layouts[stage][3][1],layouts[stage][3][2],1.05)}
  // Three shards per stage, centered near the actual path.
  [1,2,3].forEach((idx)=>{const q=layouts[stage][idx];addShard(q[0]+(idx===2?.8:-.65),q[1]+.29,q[2]);});
  // Stage dressing.
  const zStart=z0,zEnd=stage===4?210:layouts[stage][4][2]+12;
  for(let z=zStart;z<zEnd;z+=13){
    addPillar(-8+Math.sin(z*.18)*1.7,0,z,5+Math.random()*4,1.8,s.a);
    addPillar(8+Math.cos(z*.15)*1.5,0,z+5,4+Math.random()*3,1.5,s.b);
    addCrystalCluster((Math.sin(z*.21)*5),Math.max(.2,baseY*.18),z+4,s.color,3);
  }
}

// Start + four linear stages.
addPlatform(0,0,0,18,14,1,MAT.stoneDark,1);
addPlatform(0,0,8,12,7,1,MAT.grass,1);
addCheckpoint(-2.5,0,4,'START',1);
addShard(0,.29,8);
for(let i=0;i<10;i++) addCrystalCluster((Math.random()-.5)*16,.1,(Math.random()*2-1)*5,0x57e6d0,3);

buildStage(1,5,0.8);
buildStage(2,53,6.0);
buildStage(3,101,11.6);
buildStage(4,149,17.2);
addPortal(0,22.0,208);

// Background sky islands and clouds — decorative only; they are intentionally non-traversable so the game keeps one route.
for(let i=0;i<30;i++){
  const x=(Math.random()-.5)*70,z=20+Math.random()*195,y=8+Math.random()*38,s=.8+Math.random()*2.2;
  addPillar(x,y,z,Math.random()*3+1,s*1.4,MAT.stoneDark);
}
const pGeo=new THREE.BufferGeometry(),pts=[];for(let i=0;i<1700;i++)pts.push((Math.random()-.5)*150,Math.random()*65+2,Math.random()*235-10);pGeo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
const pMat=new THREE.PointsMaterial({color:0xb9efff,size:.055,transparent:true,opacity:.4});environment.add(new THREE.Points(pGeo,pMat));

// Player: origin is the FEET. This makes every platformed object align to the same top surface.
const player=new THREE.Group();world.add(player);
player.position.set(0,2,4);
const body=new THREE.Mesh(geo.box(.82,1.18,.64),MAT.player);body.position.y=.62;body.castShadow=true;player.add(body);
const head=new THREE.Mesh(geo.sphere(.5),MAT.accent);head.position.y=1.48;head.castShadow=true;player.add(head);
const visor=new THREE.Mesh(geo.box(.55,.19,.08),new THREE.MeshStandardMaterial({color:0x04111b,emissive:0x45ddff,emissiveIntensity:1.6,roughness:.18,metalness:.4}));visor.position.set(0,1.51,.47);player.add(visor);
for(const sx of [-.25,.25]) addBox(player,MAT.dark,[sx,.22,.03],[.28,.44,.4]);
const trail=new THREE.PointLight(0x59dcff,2.1,5);trail.position.set(0,.9,-.55);player.add(trail);

const pstate={vel:new THREE.Vector3(),grounded:false,coyote:0,jumpBuffer:0,spawn:new THREE.Vector3(0,0.02,4),radius:.42,height:2.05,dash:0,dashCooldown:0,facing:0,invuln:0,jumps:0,maxJumps:2,fallDamageCooldown:0};
const keysDown={}; addEventListener('keydown',e=>{keysDown[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='Escape')togglePause();if(e.code==='KeyR'&&state.mode!=='menu')restartGame()}); addEventListener('keyup',e=>keysDown[e.code]=false);
let mouseDX=0,mouseDY=0,pointerLocked=false; let FRAME_DT=0.016; addEventListener('mousemove',e=>{if(pointerLocked){mouseDX+=e.movementX;mouseDY+=e.movementY}});$('game').addEventListener('click',()=>{if(state.mode==='playing'&&!pointerLocked)$('game').requestPointerLock?.()});document.addEventListener('pointerlockchange',()=>pointerLocked=document.pointerLockElement===$('game'));

// Yaw 0 means the character looks toward +Z. W is explicitly +Z, S is -Z.
const cameraRig={yaw:0,pitch:.18,distance:7.8,height:3.8};
function resetPlayer(){player.position.copy(pstate.spawn);pstate.vel.set(0,0,0);pstate.grounded=false;pstate.coyote=0;pstate.jumps=0;pstate.invuln=1.0;pstate.dash=0;pstate.dashCooldown=0;cameraRig.yaw=0;cameraRig.pitch=.18;}
function inputVector(){let x=0,z=0;if(keysDown.KeyA||keysDown.ArrowLeft)x-=1;if(keysDown.KeyD||keysDown.ArrowRight)x+=1;if(keysDown.KeyW||keysDown.ArrowUp)z+=1;if(keysDown.KeyS||keysDown.ArrowDown)z-=1;const l=Math.hypot(x,z);return l?{x:x/l,z:z/l,active:true}:{x:0,z:0,active:false}}
function jumpPressed(){return !!keysDown.Space}
function consumeJump(){keysDown.Space=false}
function toast(msg,d=1300){ui.toast.textContent=msg;ui.toast.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>ui.toast.classList.remove('show'),d)}
function hitFlash(){ui.flash.style.opacity='.35';setTimeout(()=>ui.flash.style.opacity='0',110)}
function setMode(m){state.mode=m;ui.menu.classList.toggle('hidden',m!=='menu');ui.hud.classList.toggle('hidden',m==='menu');ui.pause.classList.toggle('hidden',m!=='paused');ui.gameOver.classList.toggle('hidden',m!=='gameover');ui.victory.classList.toggle('hidden',m!=='victory')}
function startGame(){state.score=0;state.shards=0;state.health=100;state.checkpoint='START';state.stage=1;state.keyFound=false;state.runTime=0;state.combo=0;state.comboTimer=0;checkpoints.forEach(c=>c.active=false);keys.forEach(k=>{k.found=false;k.group.visible=true});collectibles.forEach(c=>{c.got=false;c.group.visible=true});enemies.forEach(e=>{e.dead=false;e.group.visible=true;e.group.position.set(e.originX,e.top+.62,e.z)});doors.forEach(d=>{d.open=false;d.progress=0;d.collidable=true;d.group.visible=true});checkpoints[0].active=true;pstate.spawn.set(0,0.02,4);resetPlayer();setMode('playing');toast('FIND THE KEY • OPEN THE GATE • KEEP MOVING FORWARD',2200);updateHud()}
function restartGame(){startGame()}
function goHome(){setMode('menu');resetPlayer();document.exitPointerLock?.()}
function togglePause(){if(state.mode==='playing')setMode('paused');else if(state.mode==='paused')setMode('playing')}

function isInsideBox(x,z,boxX,boxZ,w,d,r=0){return x>boxX-w/2-r&&x<boxX+w/2+r&&z>boxZ-d/2-r&&z<boxZ+d/2+r}
function solidBoxes(){
  const solids=[];
  for(const p of platforms) solids.push({x:p.x,z:p.z,w:p.w,d:p.d,bottom:p.y-p.h,top:p.y,kind:'platform'});
  for(const d of doors){
    if(!d.open&&d.collidable) solids.push({x:d.group.position.x,z:d.group.position.z,w:d.w,d:d.t,bottom:d.top,top:d.top+d.h,kind:'door'});
  }
  return solids;
}
function verticalTopAt(x,z,feetY,vy){
  let best=null,bestY=-Infinity;
  const prevFeet=feetY-vy*FRAME_DT;
  const nextFeet=feetY+vy*FRAME_DT;
  if(vy>0)return null;
  for(const p of platforms){
    const inside=x>=p.x-p.w/2+pstate.radius*0.15&&x<=p.x+p.w/2-pstate.radius*0.15&&z>=p.z-p.d/2+pstate.radius*0.15&&z<=p.z+p.d/2-pstate.radius*0.15;
    if(!inside)continue;
    if(prevFeet>=p.y-0.08&&nextFeet<=p.y+0.08&&p.y>bestY){best=p;bestY=p.y;}
  }
  return best;
}
function blockedAt(x,z,feetY){
  const bodyBottom=feetY+0.04, bodyTop=feetY+pstate.height-0.04;
  for(const b of solidBoxes()){
    if(bodyTop<=b.bottom+0.02||bodyBottom>=b.top-0.02)continue;
    const left=b.x-b.w/2-pstate.radius,right=b.x+b.w/2+pstate.radius;
    const front=b.z-b.d/2-pstate.radius,back=b.z+b.d/2+pstate.radius;
    if(x>left&&x<right&&z>front&&z<back)return true;
  }
  return false;
}
function moveWithCollisions(dt){
  const start=player.position.clone();
  let nx=start.x+pstate.vel.x*dt;
  if(blockedAt(nx,start.z,start.y))pstate.vel.x=0;
  else player.position.x=nx;
  let nz=player.position.z+pstate.vel.z*dt;
  if(blockedAt(player.position.x,nz,player.position.y))pstate.vel.z=0;
  else player.position.z=nz;
}
function damage(amount,msg){if(pstate.invuln>0||state.mode!=='playing')return;state.health-=amount;pstate.invuln=1.0;hitFlash();toast(msg);updateHud();if(state.health<=0){state.health=0;gameOver('RUN TERMINATED','The route is blocked. Restart from the beginning.')}}
function respawn(){resetPlayer();toast(`RESPAWN • ${state.checkpoint}`,1100)}
function activateCheckpoint(c){if(c.active)return;c.active=true;state.checkpoint=c.label;pstate.spawn.set(c.x+2.15,c.top+0.02,c.z);state.health=100;state.score+=100;toast(`${c.label} • CHECKPOINT REACHED`,1500);updateHud()}
function collectShard(c){if(c.got)return;c.got=true;c.group.visible=false;state.shards++;state.combo=Math.min(8,state.combo+1);state.comboTimer=2.5;state.score+=100*state.combo;spawnBurst(c.group.position,0xffd76b);toast(`SHARD +${100*state.combo} • COMBO x${state.combo}`,800);updateHud()}
function collectKey(k){if(k.found)return;k.found=true;k.group.visible=false;state.keyFound=true;state.score+=250;spawnBurst(k.group.position,0x67eaff);toast(`KEY ACQUIRED • GATE ${k.stage<4?k.stage+1:'SUMMIT'} UNLOCKED`,1700);updateHud()}
function openDoor(d){if(d.open||state.stage!==d.stage||!state.keyFound)return;d.open=true;d.collidable=false;state.keyFound=false;state.stage++;state.score+=350;toast(`GATE ${d.stage+1} OPEN • STAGE ${state.stage}`,1800);updateHud()}
function killEnemy(e){if(e.dead)return;e.dead=true;e.group.visible=false;state.combo=Math.min(8,state.combo+2);state.comboTimer=3;state.score+=250*state.combo;spawnBurst(e.group.position,0xff6677);toast(`SENTINEL DOWN • +${250*state.combo}`,950);updateHud()}
function spawnBurst(pos,color){const g=new THREE.Group();for(let i=0;i<22;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.045,6,6),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.95}));m.position.copy(pos);m.userData.v=new THREE.Vector3((Math.random()-.5)*4,Math.random()*4,(Math.random()-.5)*4);g.add(m)}g.userData.age=0;g.userData.max=1.0;effects.add(g)}
function updateEffects(dt){for(let i=effects.children.length-1;i>=0;i--){const g=effects.children[i];g.userData.age+=dt;for(const m of g.children){m.position.addScaledVector(m.userData.v,dt);m.userData.v.y-=7*dt;m.scale.multiplyScalar(1-dt*.9);m.material.opacity=Math.max(0,1-g.userData.age)}if(g.userData.age>g.userData.max)effects.remove(g)}}

function updatePlayer(dt){
  pstate.invuln=Math.max(0,pstate.invuln-dt);pstate.dashCooldown=Math.max(0,pstate.dashCooldown-dt);pstate.coyote=Math.max(0,pstate.coyote-dt);state.comboTimer=Math.max(0,state.comboTimer-dt);if(state.comboTimer<=0)state.combo=0;
  const input=inputVector();
  if(jumpPressed())pstate.jumpBuffer=.15;
  const yaw=cameraRig.yaw;
  const forward=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));
  const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
  const dir=new THREE.Vector3().addScaledVector(right,input.x).addScaledVector(forward,input.z);
  if(dir.lengthSq()>0)dir.normalize();
  const sprint=keysDown.ShiftLeft||keysDown.ShiftRight;
  const targetSpeed=sprint?11.5:8.6;
  const accel=pstate.grounded?36:22;
  const response=1-Math.exp(-accel*dt);
  pstate.vel.x=lerp(pstate.vel.x,dir.x*targetSpeed,response);
  pstate.vel.z=lerp(pstate.vel.z,dir.z*targetSpeed,response);
  if(input.active){pstate.facing=Math.atan2(dir.x,dir.z);player.rotation.y=lerp(player.rotation.y,pstate.facing,1-Math.exp(-16*dt));}
  if((keysDown.ShiftLeft||keysDown.ShiftRight)&&input.active&&pstate.dashCooldown<=0){const power=pstate.grounded?18.5:16.5;pstate.vel.x=dir.x*power;pstate.vel.z=dir.z*power;pstate.dash=.2;pstate.dashCooldown=pstate.grounded?.8:1.05;keysDown.ShiftLeft=false;keysDown.ShiftRight=false;spawnBurst(player.position.clone().add(new THREE.Vector3(0,.7,0)),0x69eaff);toast(pstate.grounded?'DASH':'AIR DASH',500)}
  if(pstate.jumpBuffer>0&&(pstate.grounded||pstate.coyote>0||pstate.jumps<pstate.maxJumps)){const first=pstate.grounded||pstate.coyote>0;pstate.vel.y=first?12.6:11.5;pstate.grounded=false;pstate.coyote=0;pstate.jumps=first?1:pstate.jumps+1;pstate.jumpBuffer=0;consumeJump();spawnBurst(player.position.clone(),first?0x75e9ff:0xffd36c)}
  pstate.vel.y-=29*dt;
  FRAME_DT=dt;
  moveWithCollisions(dt);
  const prevFeet=player.position.y;
  player.position.y+=pstate.vel.y*dt;
  const g=verticalTopAt(player.position.x,player.position.z,player.position.y,pstate.vel.y);
  if(g&&pstate.vel.y<=0){player.position.y=g.y;pstate.vel.y=0;if(!pstate.grounded)spawnBurst(player.position.clone(),0x8ae9ff);pstate.grounded=true;pstate.jumps=0;pstate.coyote=.12;}
  else{if(pstate.grounded)pstate.coyote=.12;pstate.grounded=false;}
  for(const m of movers){if(g===m&&pstate.grounded){player.position.x+=m.dx*dt;player.position.z+=m.dz*dt;}}
  for(const s of springs){if(s.cool>0){s.cool-=dt;continue}if(isInsideBox(player.position.x,player.position.z,s.x,s.z,1.25*s.scale,1.25*s.scale,.1)&&Math.abs(player.position.y-s.top)<1.0){pstate.vel.y=17.2;pstate.grounded=false;pstate.jumps=1;s.cool=.35;spawnBurst(player.position,0xffd56e);toast('SUPER JUMP!',650)}}
  for(const b of boosts){if(b.cool>0){b.cool-=dt;continue}if(isInsideBox(player.position.x,player.position.z,b.x,b.z,1.8,2.3,.12)&&Math.abs(player.position.y-b.top)<1.0){pstate.vel.x=b.dirX*17.5;pstate.vel.z=b.dirZ*17.5;b.cool=.4;spawnBurst(player.position,0x72ecff);toast('BOOST!',500)}}
  if(player.position.y<-18&&state.mode==='playing'){if(pstate.fallDamageCooldown<=0){pstate.fallDamageCooldown=1.5;damage(30,'FALL • CHECKPOINT DAMAGE');if(state.mode==='playing')respawn();}}
  pstate.fallDamageCooldown=Math.max(0,pstate.fallDamageCooldown-dt);
  for(const h of hazards){if(h.cool>0){h.cool-=dt;continue}if(isInsideBox(player.position.x,player.position.z,h.x,h.z,h.w,h.d,.02)&&Math.abs(player.position.y-h.top)<1.0){h.cool=.55;damage(25,'SPIKES!');if(state.mode==='playing')respawn()}}
  for(const e of enemies){if(e.dead)continue;const dx=player.position.x-e.group.position.x,dz=player.position.z-e.group.position.z,dist=Math.hypot(dx,dz),dy=player.position.y-e.group.position.y;if(dist<1.15&&Math.abs(dy)<1.65){if(pstate.vel.y<0&&player.position.y>e.group.position.y-.05){killEnemy(e);pstate.vel.y=11.2}else damage(22,'SENTINEL HIT')}}
  for(const c of collectibles){if(!c.got&&player.position.distanceTo(c.group.position)<1.25)collectShard(c)}
  for(const k of keys){if(!k.found&&player.position.distanceTo(k.group.position)<1.35)collectKey(k)}
  for(const c of checkpoints){if(Math.hypot(player.position.x-c.x,player.position.z-c.z)<2.2&&player.position.y>c.top-.7)activateCheckpoint(c)}
  for(const d of doors){if(!d.open&&state.keyFound&&state.stage===d.stage&&Math.hypot(player.position.x-d.group.position.x,player.position.z-d.group.position.z)<4)openDoor(d)}
  if(portal&&player.position.distanceTo(portal.group.position)<3.2)victory();
  const speed=Math.hypot(pstate.vel.x,pstate.vel.z);const bob=pstate.grounded?Math.sin(state.time*15)*Math.min(.07,speed*.006):0;body.position.y=lerp(body.position.y,.62+bob,1-Math.exp(-20*dt));head.position.y=1.48+bob*.35;body.rotation.x=lerp(body.rotation.x,clamp(-pstate.vel.y*.022,-.3,.3),1-Math.exp(-12*dt));body.rotation.z=lerp(body.rotation.z,clamp(-pstate.vel.x*.018,-.18,.18),1-Math.exp(-10*dt));trail.intensity=lerp(trail.intensity,pstate.dash>0?8:2.1,1-Math.exp(-22*dt));
}

function updateWorld(dt){
  for(const m of movers){const oldX=m.x,oldZ=m.z,t=state.time*m.speed+m.phase;m.x=m.baseX+Math.sin(t)*m.ampX;m.z=m.baseZ+Math.sin(t*.9)*m.ampZ;m.dx=(m.x-oldX)/Math.max(dt,.001);m.dz=(m.z-oldZ)/Math.max(dt,.001);m.mesh.position.set(m.x,m.y-m.h/2,m.z)}
  for(const s of springs){s.group.rotation.y+=dt*2;s.group.children[1].scale.setScalar(1+Math.sin(state.time*5+s.x)*.14)}
  for(const b of boosts){b.group.rotation.y=Math.atan2(b.dirX,b.dirZ);b.group.position.y=b.top+.08+Math.sin(state.time*5+b.x)*.025}
  for(const c of collectibles){if(c.got)continue;c.group.rotation.y+=dt*2.3;c.group.position.y=c.baseY+Math.sin(state.time*2.5+c.phase)*.1}
  for(const k of keys){if(k.found)continue;k.group.rotation.y+=dt*2.8;k.group.position.y=k.y+Math.sin(state.time*3+k.stage)*.09;k.group.children[1].rotation.z=state.time*2.5}
  for(const c of checkpoints){c.group.rotation.y=Math.sin(state.time*1.2+c.z*.02)*.05;const orb=c.group.children.find(m=>m.geometry?.type==='SphereGeometry');if(orb)orb.scale.setScalar(1+Math.sin(state.time*3+c.z)*.1)}
  for(const e of enemies){if(e.dead)continue;const t=state.time*.95+e.phase;e.group.position.x=e.originX+Math.sin(t)*e.path;e.group.position.y=e.top+.62+Math.sin(state.time*4+e.phase)*.02;e.group.rotation.y+=dt*1.8}
  for(const d of doors){if(d.open&&d.progress<1){d.progress=Math.min(1,d.progress+dt*1.8);d.panel.position.y=5.8/2 + d.progress*6.0;d.panel.scale.y=1-d.progress*.97}}
  if(portal){portal.group.rotation.z=state.time*.35;portal.group.children[0].rotation.z=-state.time*.8;portal.group.children[1].scale.setScalar(1+Math.sin(state.time*2.2)*.06)}
  environment.rotation.y=Math.sin(state.time*.05)*.006;
}
function updateCamera(dt){
  if(state.mode==='menu'){cameraRig.yaw+=dt*.08;cameraRig.pitch=.2;cameraRig.distance=11;cameraRig.height=4.8;const focus=new THREE.Vector3(0,7,112);const target=focus.clone().add(new THREE.Vector3(-Math.sin(cameraRig.yaw)*cameraRig.distance,4,-Math.cos(cameraRig.yaw)*cameraRig.distance));camera.position.lerp(target,1-Math.exp(-2*dt));camera.lookAt(focus);return}
  cameraRig.yaw-=mouseDX*.0026;cameraRig.pitch=clamp(cameraRig.pitch-mouseDY*.0017,-.15,.6);mouseDX=0;mouseDY=0;
  const back=new THREE.Vector3(0,0,-cameraRig.distance).applyAxisAngle(new THREE.Vector3(0,1,0),cameraRig.yaw);const desired=player.position.clone().add(back).add(new THREE.Vector3(0,cameraRig.height+Math.sin(cameraRig.pitch)*cameraRig.distance*.45,0));camera.position.lerp(desired,1-Math.exp(-8*dt));const lookAhead=new THREE.Vector3(Math.sin(cameraRig.yaw)*1.6,1.05,Math.cos(cameraRig.yaw)*1.6);camera.lookAt(player.position.clone().add(lookAhead));
}
function updateHud(){
  const stageName=stageStyle(clamp(state.stage,1,4)).name;
  ui.shards.textContent=`${state.shards} / ${collectibles.length}`;ui.score.textContent=state.score;ui.best.textContent=state.best;ui.healthBar.style.width=`${clamp(state.health,0,100)}%`;ui.healthText.textContent=`${Math.round(state.health)}%`;ui.checkpoint.textContent=state.checkpoint;ui.stage.textContent=`${state.stage} • ${stageName}`;ui.key.textContent=state.keyFound?'FOUND':'SEARCH';
  if(state.score>state.best){state.best=state.score;localStorage.setItem('skybound_best',state.best);ui.best.textContent=state.best;ui.bestMenu.textContent=state.best}
}
function gameOver(title='RUN TERMINATED',text='The route is waiting.'){setMode('gameover');ui.goTitle.textContent=title;ui.goText.textContent=text;ui.goScore.textContent=state.score;ui.goShards.textContent=state.shards}
function victory(){if(state.mode!=='playing')return;state.score+=800+state.shards*35;updateHud();setMode('victory');ui.vScore.textContent=state.score;ui.vShards.textContent=state.shards;spawnBurst(portal.group.position,0x72ecff);}

ui.play.onclick=()=>startGame();ui.howBtn.onclick=()=>ui.how.classList.toggle('hidden');ui.closeHow.onclick=()=>ui.how.classList.add('hidden');ui.resume.onclick=()=>setMode('playing');ui.restartPause.onclick=()=>restartGame();ui.homePause.onclick=()=>goHome();ui.retry.onclick=()=>restartGame();ui.homeGameOver.onclick=()=>goHome();ui.victoryRetry.onclick=()=>restartGame();ui.victoryHome.onclick=()=>goHome();
function resize(){const w=innerWidth,h=innerHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(w,h);composer.setSize(w,h)}addEventListener('resize',resize);

let last=performance.now();function animate(now){const dt=Math.min(.033,(now-last)/1000);last=now;state.time+=dt;if(state.mode==='playing')state.runTime+=dt;updateWorld(dt);updateEffects(dt);if(state.mode==='playing')updatePlayer(dt);updateCamera(dt);composer.render();requestAnimationFrame(animate)}

(async()=>{for(let i=0;i<=100;i+=10){await new Promise(r=>setTimeout(r,25));ui.loadingBar.style.width=`${i}%`;ui.loadingText.textContent=['CARVING THE ROUTE...','PLACING GATES...','CHARGING KEYS...','BUILDING THE SPIRE...','POLISHING FX...','READY'][Math.min(5,Math.floor(i/20))]}await new Promise(r=>setTimeout(r,180));ui.loading.classList.add('done');setMode('menu');requestAnimationFrame(animate)})();
