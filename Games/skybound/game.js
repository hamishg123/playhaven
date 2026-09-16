import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.162.0/build/three.module.js';

const $ = id => document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const smoothstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};

const ui={
  menu:$('menu'),hud:$('hud'),pause:$('pauseScreen'),gameOver:$('gameOverScreen'),victory:$('victoryScreen'),how:$('howPanel'),loading:$('loading'),loadingBar:$('loadingBar'),loadingText:$('loadingText'),
  play:$('playBtn'),howBtn:$('howBtn'),closeHow:$('closeHow'),resume:$('resumeBtn'),restartPause:$('restartPauseBtn'),homePause:$('homePauseBtn'),retry:$('retryBtn'),homeGameOver:$('homeGameOverBtn'),victoryRetry:$('victoryRetryBtn'),victoryHome:$('victoryHomeBtn'),
  shards:$('shardsHud'),score:$('scoreHud'),best:$('bestHud'),bestMenu:$('bestScoreMenu'),healthBar:$('healthBar'),healthText:$('healthText'),checkpoint:$('checkpointHud'),toast:$('messageToast'),
  goScore:$('gameOverScore'),goShards:$('gameOverShards'),goTitle:$('gameOverTitle'),goText:$('gameOverText'),vScore:$('victoryScore'),vShards:$('victoryShards'),flash:$('flash')
};

const state={mode:'menu',score:0,shards:0,health:100,best:Number(localStorage.getItem('skybound_best')||0),checkpoint:'START',time:0,runTime:0,started:false};
ui.best.textContent=state.best;ui.bestMenu.textContent=state.best;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x071320);
scene.fog=new THREE.FogExp2(0x071320,0.0085);
const camera=new THREE.PerspectiveCamera(64,innerWidth/innerHeight,.05,500);
camera.position.set(7,5.2,12);
const renderer=new THREE.WebGLRenderer({antialias:true,canvas:$('game'),powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=0.82;


// Lighting
const hemi=new THREE.HemisphereLight(0x9fdfff,0x0a1724,1.2);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff1d2,2.2);sun.position.set(-30,50,10);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-70;sun.shadow.camera.right=70;sun.shadow.camera.top=70;sun.shadow.camera.bottom=-70;scene.add(sun);
const fill=new THREE.DirectionalLight(0x58bfff,0.55);fill.position.set(30,10,-30);scene.add(fill);

const world=new THREE.Group();scene.add(world);
const dynamic=new THREE.Group();world.add(dynamic);
const particles=new THREE.Group();world.add(particles);
const effects=new THREE.Group();world.add(effects);

const MAT={
  grass:new THREE.MeshStandardMaterial({color:0x1d694b,roughness:.8,metalness:.02}),
  grass2:new THREE.MeshStandardMaterial({color:0x2b8a5b,roughness:.85}),
  rock:new THREE.MeshStandardMaterial({color:0x354856,roughness:.94}),
  rockDark:new THREE.MeshStandardMaterial({color:0x182a34,roughness:.96}),
  ice:new THREE.MeshStandardMaterial({color:0x80dff1,roughness:.22,metalness:.05,transparent:true,opacity:.88}),
  gold:new THREE.MeshStandardMaterial({color:0xffd768,emissive:0x7a4d00,emissiveIntensity:.65,roughness:.24,metalness:.35}),
  portal:new THREE.MeshStandardMaterial({color:0x72ecff,emissive:0x1a7d9b,emissiveIntensity:2.2,roughness:.1,metalness:.2,transparent:true,opacity:.94}),
  enemy:new THREE.MeshStandardMaterial({color:0xf05d66,emissive:0x50141a,emissiveIntensity:.7,roughness:.42}),
  enemyEye:new THREE.MeshBasicMaterial({color:0xfff3bd}),
  dark:new THREE.MeshStandardMaterial({color:0x0f2330,roughness:.9}),
  player:new THREE.MeshStandardMaterial({color:0x73dbff,emissive:0x0a5d75,emissiveIntensity:.45,roughness:.35,metalness:.08}),
  playerAccent:new THREE.MeshStandardMaterial({color:0xffd46b,emissive:0x714700,emissiveIntensity:.45,roughness:.2,metalness:.25})
};

const geo={box:(x,y,z)=>new THREE.BoxGeometry(x,y,z),sphere:(r)=>new THREE.SphereGeometry(r,24,16),cyl:(r,h)=>new THREE.CylinderGeometry(r,r,h,20),torus:(a,b)=>new THREE.TorusGeometry(a,b,12,32)};

const platforms=[];const hazards=[];const collectibles=[];const checkpoints=[];const enemies=[];let portal=null;
function addBox(parent,mat,pos,size,opts={}){const m=new THREE.Mesh(geo.box(...size),mat);m.position.set(...pos);m.castShadow=opts.castShadow??true;m.receiveShadow=opts.receiveShadow??true;parent.add(m);return m;}
function addPlatform(x,y,z,w,d,h=1,mat=MAT.grass){
  const mesh=addBox(world,mat,[x,y,z],[w,h,d]);
  const top=y+h/2;platforms.push({x,z,y:top,w,d,h: h, mesh,kind:'solid'});
  // moss lip
  if(mat===MAT.grass||mat===MAT.grass2){
    const lip=addBox(world,MAT.grass2,[x,top+.035,z],[w*.99,.07,d*.99],{castShadow:false});
    lip.material.color.copy(mat.color).offsetHSL(.04,.02,.06);
  }
  return mesh;
}
function addRockCluster(cx,cy,cz,scale=1,count=6){for(let i=0;i<count;i++){const s=(.7+Math.random()*1.5)*scale;const m=addBox(world,MAT.rock,[cx+(Math.random()-.5)*3*scale,cy+s*.3,cz+(Math.random()-.5)*3*scale],[s*1.8,s,s*1.3],{castShadow:false});m.rotation.set(Math.random()*.3,Math.random()*Math.PI,Math.random()*.25);}}
function addShard(x,y,z){
  const g=new THREE.Group();g.position.set(x,y,z);const b=addBox(g,MAT.gold,[0,0,0],[.34,.85,.34]);b.rotation.z=.25;b.rotation.x=.18;const ring=new THREE.Mesh(geo.torus(.48,.018),new THREE.MeshBasicMaterial({color:0xffe6a0,transparent:true,opacity:.55}));ring.rotation.x=Math.PI/2;g.add(ring);dynamic.add(g);collectibles.push({group:g,baseY:y,got:false,phase:Math.random()*Math.PI*2});
}
function addCheckpoint(x,y,z,label){
  const g=new THREE.Group();g.position.set(x,y,z);const base=addBox(g,MAT.dark,[0,0,0],[1.2,.25,1.2]);const pole=addBox(g,MAT.ice,[0,1.1,0],[.16,2.2,.16]);const orb=new THREE.Mesh(geo.sphere(.35),MAT.portal);orb.position.y=2.05;g.add(orb);const light=new THREE.PointLight(0x67e7ff,1.2,6);light.position.y=2;g.add(light);dynamic.add(g);checkpoints.push({group:g,x,z,y,active:false,label});}
function addEnemy(x,y,z,path=5){
  const g=new THREE.Group();g.position.set(x,y+.55,z);const body=new THREE.Mesh(geo.sphere(.58),MAT.enemy);body.scale.set(1.12,.84,.95);body.castShadow=true;g.add(body);
  for(const s of [-.21,.21]){const eye=new THREE.Mesh(geo.sphere(.075),MAT.enemyEye);eye.position.set(s,.10,.54);g.add(eye)}
  const aura=new THREE.Mesh(geo.torus(.75,.025),new THREE.MeshBasicMaterial({color:0xff6b79,transparent:true,opacity:.28}));aura.rotation.x=Math.PI/2;aura.position.y=-.42;g.add(aura);
  dynamic.add(g);enemies.push({group:g,originX:x,originZ:z,path,phase:Math.random()*Math.PI*2,dead:false});
}
function addHazard(x,y,z,w=1.6,d=1.6){
  const m=addBox(world,MAT.enemy,[x,y+.12,z],[w,.18,d],{castShadow:false});m.material= new THREE.MeshStandardMaterial({color:0xff4058,emissive:0x7a0b1d,emissiveIntensity:.7,roughness:.42});hazards.push({x,z,y:y+.2,w,d,mesh:m});
}
function addPortal(x,y,z){
  const g=new THREE.Group();g.position.set(x,y,z);const ring=new THREE.Mesh(geo.torus(2.25,.24,16,64),MAT.portal);ring.rotation.x=Math.PI/2;g.add(ring);const inner=new THREE.Mesh(new THREE.CircleGeometry(1.95,48),new THREE.MeshBasicMaterial({color:0x5bdfff,transparent:true,opacity:.15,side:THREE.DoubleSide}));inner.rotation.x=-Math.PI/2;g.add(inner);const l=new THREE.PointLight(0x64ddff,2.5,12);g.add(l);dynamic.add(g);portal={group:g,x,y,z};}

function buildWorld(){
  // Ground + opening area
  addPlatform(0,-.65,0,36,36,1,MAT.rockDark);
  addPlatform(0,.0,0,22,22,.8,MAT.grass);
  addPlatform(-16,2,-1,9,9,1.1,MAT.grass2);
  addPlatform(-28,4,-1,8,8,1.1,MAT.rock);
  addPlatform(-38,6,2,7,9,1.1,MAT.grass2);
  addPlatform(-47,8,-2,8,8,1.1,MAT.grass);
  addPlatform(-57,11,-5,8,8,1.1,MAT.rock);
  addPlatform(-67,14,-8,10,10,1.1,MAT.grass2);

  // Central route
  addPlatform(10,2,-12,10,8,1.0,MAT.grass);
  addPlatform(19,4,-19,8,8,1.0,MAT.rock);
  addPlatform(28,6,-14,8,8,1.0,MAT.grass2);
  addPlatform(38,8,-21,11,9,1.0,MAT.grass);
  addPlatform(50,11,-13,8,8,1.0,MAT.rock);
  addPlatform(61,14,-21,10,9,1.0,MAT.grass2);

  // Far summit branch
  addPlatform(56,17,-34,9,8,1.0,MAT.grass);
  addPlatform(46,20,-40,8,8,1.0,MAT.rock);
  addPlatform(34,23,-36,8,8,1.0,MAT.grass2);
  addPlatform(22,26,-44,11,9,1.0,MAT.grass);
  addPlatform(8,29,-39,8,8,1.0,MAT.rock);
  addPlatform(-5,32,-46,12,10,1.2,MAT.grass2);
  addPlatform(-20,35,-39,10,10,1.2,MAT.grass);
  addPlatform(-35,39,-46,13,11,1.2,MAT.rock);

  // Shortcut / floating stepping stones
  const stones=[[-3,4,-11,4,4],[-6,6,-16,4,4],[-10,8,-20,4,4],[-14,11,-24,5,4],[-10,15,-31,5,5],[0,18,-29,4,4],[11,21,-30,5,5]];
  stones.forEach(s=>addPlatform(s[0],s[1],s[2],s[3],s[4],.9,MAT.rock));

  // Decorative rocks
  for(let i=0;i<16;i++){
    const x=(Math.random()-.5)*100,z=(Math.random()-.5)*70;
    if(Math.abs(x)<10&&Math.abs(z)<10) continue;
    addRockCluster(x,-.3,z,.45+Math.random()*.55,3+Math.floor(Math.random()*4));
  }

  // Shards along the route
  [[-5,2,0],[-15,4,-1],[-28,6,-1],[-38,8,2],[-47,10,-2],[-57,13,-5],[-67,16,-8],
   [8,3,-12],[19,5,-19],[28,7,-14],[38,9,-21],[50,12,-13],[61,15,-21],
   [55,18,-34],[46,21,-40],[34,24,-36],[22,27,-44],[8,30,-39],[-5,33,-46],[-20,36,-39],[-35,40,-46]]
   .forEach(p=>addShard(p[0],p[1]+1.5,p[2]));

  // Hazards and enemies
  addHazard(4,.52,3,2.4,2.4);addHazard(-4,.52,-4,2.2,2.2);addHazard(24,4.52,-20,2.1,2.1);addHazard(60,14.52,-21,2.1,2.1);
  addEnemy(7,2,-5,5);addEnemy(31,6,-18,4);addEnemy(53,11,-13,4);addEnemy(-33,39,-46,5);addEnemy(-4,32,-46,4);
  addCheckpoint(-15,4,-1,'CANYON');addCheckpoint(28,6,-14,'MID SKY');addCheckpoint(-5,32,-46,'SUMMIT');
  addPortal(-35,40.5,-46);

  // Wind particles
  const pGeo=new THREE.BufferGeometry();const arr=[];for(let i=0;i<900;i++){arr.push((Math.random()-.5)*180,Math.random()*55-2,(Math.random()-.5)*110)}pGeo.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));const pm=new THREE.PointsMaterial({color:0xa4eaff,size:.06,transparent:true,opacity:.45});particles.add(new THREE.Points(pGeo,pm));
}
buildWorld();

// Player
const player=new THREE.Group();world.add(player);player.position.set(0,2.1,7);
const body=new THREE.Mesh(geo.box(.8,1.25,.62),MAT.player);body.position.y=.95;body.castShadow=true;player.add(body);
const head=new THREE.Mesh(geo.sphere(.5),MAT.playerAccent);head.scale.set(1,.95,1);head.position.y=1.85;head.castShadow=true;player.add(head);
const visor=new THREE.Mesh(geo.box(.54,.2,.08),new THREE.MeshStandardMaterial({color:0x06131e,emissive:0x3ad7ff,emissiveIntensity:.7,roughness:.2,metalness:.35}));visor.position.set(0,1.88,.47);player.add(visor);
for(const sx of [-.25,.25]){const boot=addBox(player,MAT.dark,[sx,.36,.02],[.27,.48,.4]);boot.castShadow=true}
const trail=new THREE.PointLight(0x58ddff,1.8,5);trail.position.set(0,1.1,-.7);player.add(trail);

const pstate={vel:new THREE.Vector3(),grounded:false,coyote:0,jumpBuffer:0,spawn:new THREE.Vector3(0,2.1,7),radius:.42,dash:0,dashCooldown:0,facing:0,invuln:0,airTime:0};
const keys={};
addEventListener('keydown',e=>{keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='Escape'){togglePause()}if(e.code==='KeyR'&&state.mode!=='menu')restartGame()});
addEventListener('keyup',e=>keys[e.code]=false);
let mouseDX=0,mouseDY=0;let pointerLocked=false;addEventListener('mousemove',e=>{if(pointerLocked){mouseDX+=e.movementX;mouseDY+=e.movementY}});$('game').addEventListener('click',()=>{if(state.mode==='playing'&&!pointerLocked)$('game').requestPointerLock?.()});document.addEventListener('pointerlockchange',()=>{pointerLocked=document.pointerLockElement===$('game')});

const cameraRig={yaw:0.2,pitch:.26,distance:9,height:4.7};
function resetPlayer(){player.position.copy(pstate.spawn);pstate.vel.set(0,0,0);pstate.airTime=0;pstate.invuln=1.1;cameraRig.yaw=.2;}

function getMoveInput(){let x=0,z=0;if(keys.KeyA||keys.ArrowLeft)x+=1;if(keys.KeyD||keys.ArrowRight)x-=1;if(keys.KeyW||keys.ArrowUp)z-=1;if(keys.KeyS||keys.ArrowDown)z+=1;const len=Math.hypot(x,z);if(len>0){x/=len;z/=len}return {x,z,active:len>0}}
function jumpPressed(){return keys.Space||keys.Numpad0}
function consumeJump(){if(keys.Space)keys.Space=false;if(keys.Numpad0)keys.Numpad0=false}
function toast(msg,duration=1500){ui.toast.textContent=msg;ui.toast.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>ui.toast.classList.remove('show'),duration)}
function hitFlash(){ui.flash.style.opacity='.35';setTimeout(()=>ui.flash.style.opacity='0',120)}
function setStateMode(m){state.mode=m;ui.menu.classList.toggle('hidden',m!=='menu');ui.hud.classList.toggle('hidden',m==='menu');ui.pause.classList.toggle('hidden',m!=='paused');ui.gameOver.classList.toggle('hidden',m!=='gameover');ui.victory.classList.toggle('hidden',m!=='victory')}
function startGame(){state.score=0;state.shards=0;state.health=100;state.checkpoint='START';state.runTime=0;state.started=true;checkpoints.forEach(c=>c.active=false);pstate.spawn.set(0,2.1,7);resetPlayer();collectibles.forEach(c=>c.got=false);enemies.forEach(e=>{e.dead=false;e.group.visible=true;e.group.position.set(e.originX,e.group.position.y,e.originZ)});setStateMode('playing');toast('RUN STARTED • REACH THE SUMMIT',1800);updateHud()}
function restartGame(){if(state.mode==='menu'){startGame();return}startGame()}
function goHome(){setStateMode('menu');resetPlayer();$('game').style.cursor='default'}
function togglePause(){if(state.mode==='playing')setStateMode('paused');else if(state.mode==='paused')setStateMode('playing')}

function groundBelow(x,z,y){let best=null,bestY=-Infinity;for(const p of platforms){if(x>=p.x-p.w/2&&x<=p.x+p.w/2&&z>=p.z-p.d/2&&z<=p.z+p.d/2&&p.y<=y+.3&&p.y>bestY){best=p;bestY=p.y}}return best}
function checkHazards(){for(const h of hazards){if(Math.abs(player.position.x-h.x)<h.w*.56&&Math.abs(player.position.z-h.z)<h.d*.56&&Math.abs(player.position.y-h.y)<1.0)damagePlayer(25,'HAZARD')} }
function damagePlayer(amount,reason){if(pstate.invuln>0||state.mode!=='playing')return;state.health-=amount;pstate.invuln=1.0;hitFlash();toast(reason||'DAMAGE TAKEN');updateHud();if(state.health<=0){state.health=0;gameOver('RUN TERMINATED','The sky wins this time.')}}
function respawnAtCheckpoint(){resetPlayer();toast('RESPAWNING AT CHECKPOINT',1200)}
function activateCheckpoint(c){if(c.active)return;c.active=true;state.checkpoint=c.label;pstate.spawn.set(c.x,c.y+.4,c.z+2.4);state.score+=150;toast(`CHECKPOINT • ${c.label}`,1600);updateHud()}
function collectShard(c){if(c.got)return;c.got=true;c.group.visible=false;state.shards++;state.score+=100;state.health=clamp(state.health+7,0,100);spawnBurst(c.group.position,0xffd768);toast(`SHARD +100 • ${state.shards}/18`,900);updateHud()}
function killEnemy(e){if(e.dead)return;e.dead=true;e.group.visible=false;state.score+=250;state.health=clamp(state.health+4,0,100);spawnBurst(e.group.position,0xff6b79);toast('SENTINEL DOWN +250',1000);updateHud()}
function spawnBurst(pos,color){const count=12;const g=new THREE.Group();for(let i=0;i<count;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.045,6,6),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.95}));m.position.copy(pos);m.userData.v=new THREE.Vector3((Math.random()-.5)*4,Math.random()*4,(Math.random()-.5)*4);m.userData.life=.7+Math.random()*.35;g.add(m)}effects.add(g);g.userData.age=0;g.userData.max=1.1}
function updateEffects(dt){for(let i=effects.children.length-1;i>=0;i--){const g=effects.children[i];g.userData.age+=dt;for(const m of g.children){m.position.addScaledVector(m.userData.v,dt);m.userData.v.y-=6*dt;m.scale.multiplyScalar(Math.max(0,1-dt*.9));m.material.opacity=clamp(m.userData.life-g.userData.age,0,1)}if(g.userData.age>g.userData.max)effects.remove(g)}}

function playerOverlapsPlatform(p,x,z,y){
  const radius=0.38, halfH=0.56;
  const horizontal=x+radius>p.x-p.w/2&&x-radius<p.x+p.w/2&&z+radius>p.z-p.d/2&&z-radius<p.z+p.d/2;
  const vertical=(y-halfH)<p.y && (y+halfH)>(p.y-p.h);
  return horizontal&&vertical;
}
function collidesWithPlatform(x,z,y){
  return platforms.some(p=>playerOverlapsPlatform(p,x,z,y));
}

function updatePlayer(dt){
  pstate.invuln=Math.max(0,pstate.invuln-dt);pstate.dashCooldown=Math.max(0,pstate.dashCooldown-dt);pstate.jumpBuffer=Math.max(0,pstate.jumpBuffer-dt);pstate.coyote=Math.max(0,pstate.coyote-dt);
  const input=getMoveInput();
  if(jumpPressed())pstate.jumpBuffer=.14;
  const forward=new THREE.Vector3(-Math.sin(cameraRig.yaw),0,-Math.cos(cameraRig.yaw));
  const right=new THREE.Vector3(Math.cos(cameraRig.yaw),0,-Math.sin(cameraRig.yaw));
  const dir=new THREE.Vector3();dir.addScaledVector(right,input.x).addScaledVector(forward,input.z);if(dir.lengthSq()>0)dir.normalize();
  const targetSpeed=keys.ShiftLeft||keys.ShiftRight?10:6.7;const accel=pstate.grounded?26:14;
  const target=new THREE.Vector3(dir.x*targetSpeed,pstate.vel.y,dir.z*targetSpeed);
  pstate.vel.x=lerp(pstate.vel.x,target.x,1-Math.exp(-accel*dt));pstate.vel.z=lerp(pstate.vel.z,target.z,1-Math.exp(-accel*dt));
  if(input.active){pstate.facing=Math.atan2(dir.x,dir.z);player.rotation.y=lerp(player.rotation.y,pstate.facing,1-Math.exp(-12*dt))}
  if((keys.ShiftLeft||keys.ShiftRight)&&input.active&&pstate.dashCooldown<=0&&pstate.grounded){pstate.vel.x=dir.x*14;pstate.vel.z=dir.z*14;pstate.dashCooldown=1.0;pstate.dash=.15;}
  pstate.dash=Math.max(0,pstate.dash-dt);
  if(pstate.jumpBuffer>0&&(pstate.grounded||pstate.coyote>0)){pstate.vel.y=11.8;pstate.grounded=false;pstate.coyote=0;pstate.jumpBuffer=0;consumeJump();spawnBurst(player.position.clone().add(new THREE.Vector3(0,.1,0)),0x78eaff)}
  pstate.vel.y-=28*dt;
  const prevX=player.position.x, prevZ=player.position.z;
  const nextX=player.position.x+pstate.vel.x*dt, nextZ=player.position.z+pstate.vel.z*dt;
  // Solid side collisions: resolve each horizontal axis separately.
  player.position.x=nextX;
  if(collidesWithPlatform(player.position.x,player.position.z,player.position.y)) player.position.x=prevX;
  player.position.z=nextZ;
  if(collidesWithPlatform(player.position.x,player.position.z,player.position.y)) player.position.z=prevZ;
  player.position.y+=pstate.vel.y*dt;
  const g=groundBelow(player.position.x,player.position.z,player.position.y);
  if(g&&pstate.vel.y<=0&&player.position.y<=g.y+.56){player.position.y=g.y+.56;pstate.vel.y=0;if(!pstate.grounded){spawnBurst(player.position.clone().add(new THREE.Vector3(0,.05,0)),0x7bdfff)}pstate.grounded=true;pstate.coyote=.12;pstate.airTime=0}else{if(pstate.grounded)pstate.coyote=.12;pstate.grounded=false;pstate.airTime+=dt}
  // Fall reset
  if(player.position.y<-12){state.health=Math.max(35,state.health);hitFlash();respawnAtCheckpoint();updateHud()}
  checkHazards();
  // enemy collision / stomp
  for(const e of enemies){if(e.dead)continue;const dx=player.position.x-e.group.position.x,dz=player.position.z-e.group.position.z,dy=player.position.y-e.group.position.y;const dist=Math.hypot(dx,dz);if(dist<1.05&&Math.abs(dy)<1.4){if(pstate.vel.y<0&&player.position.y>e.group.position.y+.5){killEnemy(e);pstate.vel.y=9.2}else damagePlayer(22,'SENTINEL HIT')}}
  // collectibles
  for(const c of collectibles){if(c.got)continue;const dx=player.position.x-c.group.position.x,dz=player.position.z-c.group.position.z,dy=player.position.y-c.group.position.y;if(dx*dx+dy*dy+dz*dz<1.8)collectShard(c)}
  // checkpoints
  for(const c of checkpoints){const dx=player.position.x-c.x,dz=player.position.z-c.z;if(Math.hypot(dx,dz)<2.2&&player.position.y>c.y-1)activateCheckpoint(c)}
  // Portal victory
  if(portal){const dx=player.position.x-portal.x,dz=player.position.z-portal.z,dy=player.position.y-portal.y;if(Math.hypot(dx,dz)<2.8&&Math.abs(dy)<2.8)victory()}
  body.rotation.x=lerp(body.rotation.x,clamp(-pstate.vel.y*.025,-.22,.22),1-Math.exp(-10*dt));
  const bob=pstate.grounded?Math.sin(state.time*12)*Math.min(.05,Math.hypot(pstate.vel.x,pstate.vel.z)*.004):0;body.position.y=lerp(body.position.y,.95+bob,1-Math.exp(-18*dt));head.position.y=1.85+bob*.35;
  trail.intensity=lerp(trail.intensity,pstate.dash>0?6:1.8,1-Math.exp(-20*dt));
}

function updateWorld(dt){
  for(const c of collectibles){if(c.got)continue;c.group.rotation.y+=dt*2.1;c.group.position.y=c.baseY+Math.sin(state.time*2.5+c.phase)*.24}
  for(const c of checkpoints){c.group.rotation.y=Math.sin(state.time*1.2+c.x*.02)*.06;const orb=c.group.children.find(x=>x.geometry&&x.geometry.type==='SphereGeometry');if(orb){orb.scale.setScalar(1+Math.sin(state.time*3+c.z)*.1)}}
  for(const e of enemies){if(e.dead)continue;const t=state.time*.9+e.phase;e.group.position.x=e.originX+Math.sin(t)*e.path;e.group.rotation.y+=dt*1.7;e.group.position.y+=Math.sin(state.time*4+e.phase)*.002;e.group.children[2].rotation.z+=dt*2}
  if(portal){portal.group.rotation.z=state.time*.3;portal.group.children[0].rotation.z=-state.time*.8}
  particles.rotation.y=state.time*.015;
}

function updateCamera(dt){
  if(state.mode==='menu'){cameraRig.yaw+=dt*.065;cameraRig.pitch=.28;cameraRig.distance=11;cameraRig.height=4.9;
    const focus=new THREE.Vector3(0,4,-8);const target=new THREE.Vector3(focus.x+Math.sin(cameraRig.yaw)*cameraRig.distance,focus.y+cameraRig.height,focus.z+Math.cos(cameraRig.yaw)*cameraRig.distance);camera.position.lerp(target,1-Math.exp(-2.1*dt));camera.lookAt(focus);return}
  cameraRig.yaw-=mouseDX*.0025;cameraRig.pitch=clamp(cameraRig.pitch-mouseDY*.0017,-.05,.65);mouseDX=0;mouseDY=0;
  const offset=new THREE.Vector3(Math.sin(cameraRig.yaw)*cameraRig.distance,Math.sin(cameraRig.pitch)*cameraRig.distance*.7+cameraRig.height,Math.cos(cameraRig.yaw)*cameraRig.distance);
  const desired=player.position.clone().add(new THREE.Vector3(offset.x,offset.y,offset.z));
  camera.position.lerp(desired,1-Math.exp(-7*dt));
  const look=player.position.clone().add(new THREE.Vector3(0,1.2,0));camera.lookAt(look);
}

function updateHud(){ui.shards.textContent=`${state.shards} / 18`;ui.score.textContent=state.score;ui.best.textContent=state.best;ui.healthBar.style.width=`${clamp(state.health,0,100)}%`;ui.healthText.textContent=`${Math.round(state.health)}%`;ui.checkpoint.textContent=state.checkpoint;if(state.score>state.best){state.best=state.score;localStorage.setItem('skybound_best',state.best);ui.best.textContent=state.best;ui.bestMenu.textContent=state.best}}
function gameOver(title='RUN TERMINATED',text='The sky wins this time.'){setStateMode('gameover');ui.goTitle.textContent=title;ui.goText.textContent=text;ui.goScore.textContent=state.score;ui.goShards.textContent=state.shards}
function victory(){if(state.mode!=='playing')return;state.score+=500+(state.shards*25);if(state.score>state.best){state.best=state.score;localStorage.setItem('skybound_best',state.best)}updateHud();setStateMode('victory');ui.vScore.textContent=state.score;ui.vShards.textContent=state.shards;spawnBurst(portal.group.position,0x72ecff)}

// UI wiring
ui.play.onclick=()=>startGame();ui.howBtn.onclick=()=>ui.how.classList.toggle('hidden');ui.closeHow.onclick=()=>ui.how.classList.add('hidden');ui.resume.onclick=()=>setStateMode('playing');ui.restartPause.onclick=()=>restartGame();ui.homePause.onclick=()=>goHome();ui.retry.onclick=()=>restartGame();ui.homeGameOver.onclick=()=>goHome();ui.victoryRetry.onclick=()=>restartGame();ui.victoryHome.onclick=()=>goHome();

function resize(){const w=innerWidth,h=innerHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));renderer.setSize(w,h)}addEventListener('resize',resize);

let last=performance.now();
function animate(now){const dt=Math.min(.033,(now-last)/1000);last=now;state.time+=dt;if(state.mode==='playing')state.runTime+=dt;
  updateWorld(dt);updateEffects(dt);if(state.mode==='playing')updatePlayer(dt);updateCamera(dt);renderer.render(scene,camera);requestAnimationFrame(animate)}

// Load-in sequence
(async()=>{for(let i=0;i<=100;i+=10){await new Promise(r=>setTimeout(r,30));ui.loadingBar.style.width=`${i}%`;ui.loadingText.textContent=['BUILDING THE SKY...','CARVING PLATFORMS...','CHARGING SHARDS...','WAKING SENTINELS...','OPENING THE PORTAL...','READY'][Math.min(5,Math.floor(i/20))]}await new Promise(r=>setTimeout(r,250));ui.loading.classList.add('done');setStateMode('menu');requestAnimationFrame(animate)})();
