import * as THREE from 'three';

const $ = id => document.getElementById(id);
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const snap = (v,s)=>Math.round(v/s)*s;
const uid = ()=>Math.random().toString(36).slice(2,9);

const TYPES = {
  platform:{color:0x3b7d5d, size:[6,1,4]}, wall:{color:0x566b82,size:[2,4,6]}, key:{color:0xffd54a,size:[.7,.7,.7]}, checkpoint:{color:0x5bdcff,size:[1,1,1]}, hazard:{color:0xff4c62,size:[5,.25,3]}, enemy:{color:0xff6d73,size:[1.2,1.2,1.2]}, door:{color:0x744dcd,size:[4,5,.8]}, goal:{color:0x62f7c1,size:[2,3,2]}
};

const defaultLevel={name:'Skybound Demo',spawn:[0,1,7],objects:[
 {id:'p1',type:'platform',pos:[0,-.5,0],size:[12,1,10],name:'Starting Platform'},
 {id:'p2',type:'platform',pos:[0,.5,-10],size:[10,1,6],name:'Jump 1'},
 {id:'k1',type:'key',pos:[0,1.35,-10],size:[.7,.7,.7],name:'Green Key'},
 {id:'p3',type:'platform',pos:[0,2,-19],size:[8,1,6],name:'Jump 2'},
 {id:'cp1',type:'checkpoint',pos:[0,2.65,-19],size:[1,1,1],name:'Checkpoint 1'},
 {id:'p4',type:'platform',pos:[0,3.5,-28],size:[12,1,6],name:'Door Platform'},
 {id:'d1',type:'door',pos:[0,6,-31],size:[4,5,.8],name:'Key Door'},
 {id:'p5',type:'platform',pos:[0,5,-39],size:[9,1,6],name:'Final Jump'},
 {id:'g1',type:'goal',pos:[0,6.1,-39],size:[2,3,2],name:'Summit Portal'},
 {id:'h1',type:'hazard',pos:[0,.05,-5],size:[5,.2,2],name:'Hazard'},
 {id:'e1',type:'enemy',pos:[-2,1.25,-10],size:[1.2,1.2,1.2],name:'Crawler'}
]};

let level=structuredClone(defaultLevel);
let gameState={running:false,paused:false,shards:0,key:false,checkpoint:[0,1,7],stage:'GREEN RUN',won:false,dead:false};

// ---------- shared scene helpers ----------
function makeRenderer(container, shadows=false){
 const r=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'}); r.setPixelRatio(Math.min(window.devicePixelRatio||1,1.25)); r.setSize(container.clientWidth,container.clientHeight); r.outputColorSpace=THREE.SRGBColorSpace; r.shadowMap.enabled=!!shadows; if(shadows) r.shadowMap.type=THREE.PCFShadowMap; container.innerHTML='';container.appendChild(r.domElement); return r;
}
function addLights(scene){
 scene.add(new THREE.HemisphereLight(0x9bd8ff,0x172033,1.6));
 const sun=new THREE.DirectionalLight(0xfff5d5,2.1); sun.position.set(25,35,20); sun.castShadow=false; scene.add(sun);
}
function clearGroup(group){while(group.children.length) group.remove(group.children[0]);}
function boxMesh(size,color,wire=false){const g=new THREE.BoxGeometry(...size);const m=new THREE.MeshStandardMaterial({color,roughness:.72,metalness:.05});const mesh=new THREE.Mesh(g,m); if(wire){mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(g),new THREE.LineBasicMaterial({color:0xb9efff,transparent:true,opacity:.65})));} return mesh;}
function objectMesh(o){
 const spec=TYPES[o.type]||TYPES.platform; const mesh=boxMesh(o.size||spec.size,spec.color); mesh.position.set(...o.pos); mesh.userData.id=o.id; mesh.userData.type=o.type; return mesh;
}
function aabb(o){const [x,y,z]=o.pos,[w,h,d]=o.size;return {minX:x-w/2,maxX:x+w/2,minY:y-h/2,maxY:y+h/2,minZ:z-d/2,maxZ:z+d/2};}
function playerBox(pos){return {minX:pos.x-.45,maxX:pos.x+.45,minY:pos.y,maxY:pos.y+1.8,minZ:pos.z-.45,maxZ:pos.z+.45};}
function overlap(a,b){return a.minX<b.maxX&&a.maxX>b.minX&&a.minY<b.maxY&&a.maxY>b.minY&&a.minZ<b.maxZ&&a.maxZ>b.minZ;}

// ---------- GAME ----------
let g={scene:null,renderer:null,camera:null,group:null,meshes:new Map(),player:null,vel:new THREE.Vector3(),yaw:0,pitch:-.18,last:0,keys:{},mouseDown:false,lastMX:0,lastMY:0,onGround:false,jumpBuffer:0,coyote:.0,dashCooldown:0};

function enterGame(custom=level){
 level=structuredClone(custom); gameState={running:true,paused:false,shards:0,key:false,checkpoint:[...level.spawn],stage:'GREEN RUN',won:false,dead:false};
 $('menu').classList.remove('active'); $('studio').classList.remove('active'); $('game').classList.add('active'); $('gamePause').classList.remove('show');$('gameEnd').classList.remove('show');
 initGameScene();
}
function initGameScene(){
 const c=$('gameCanvas'); g.renderer?.dispose(); g.renderer=makeRenderer(c,false); g.scene=new THREE.Scene(); g.scene.background=new THREE.Color(0x07121f); g.scene.fog=new THREE.Fog(0x07121f,45,110); addLights(g.scene); g.group=new THREE.Group(); g.scene.add(g.group);
 g.camera=new THREE.PerspectiveCamera(68,c.clientWidth/c.clientHeight,.05,220);
 g.player={pos:new THREE.Vector3(...level.spawn),height:1.8,radius:.45,mesh:null};
 const body=new THREE.Group(); const capsule=boxMesh([.8,1.7,.8],0x51c8ff); capsule.position.y=.9; capsule.add(new THREE.Mesh(new THREE.BoxGeometry(.48,.24,.05),new THREE.MeshStandardMaterial({color:0x062033}))); body.add(capsule); g.player.mesh=body; g.group.add(body);
 buildGameObjects(); resetPlayer(); updateHUD(); setupGameEvents(); animateGame(0);
}
function buildGameObjects(){g.meshes.clear(); clearGroup(g.group); if(g.player?.mesh) g.group.add(g.player.mesh); for(const o of level.objects){const m=objectMesh(o); if(o.type==='key'||o.type==='checkpoint'||o.type==='goal') m.material.emissive=new THREE.Color(TYPES[o.type].color).multiplyScalar(.35); g.group.add(m); g.meshes.set(o.id,m);} }
function resetPlayer(){g.player.pos.set(...gameState.checkpoint); g.vel.set(0,0,0); g.onGround=false; g.coyote=0; g.player.mesh.position.set(g.player.pos.x,g.player.pos.y,g.player.pos.z);}
function setupGameEvents(){
 const canvas=g.renderer.domElement; canvas.oncontextmenu=e=>e.preventDefault(); canvas.onmousedown=e=>{if(e.button===0||e.button===2){g.mouseDown=true;g.lastMX=e.clientX;g.lastMY=e.clientY}}; window.onmouseup=()=>g.mouseDown=false;
 window.onmousemove=e=>{if(!g.mouseDown||gameState.paused)return; const dx=e.clientX-g.lastMX,dy=e.clientY-g.lastMY;g.lastMX=e.clientX;g.lastMY=e.clientY;g.yaw-=dx*.004;g.pitch=clamp(g.pitch-dy*.0025,-.75,.35)};
 window.onkeydown=e=>{g.keys[e.code]=true;if(e.code==='Space'){e.preventDefault();g.jumpBuffer=.14} if(e.code==='Escape'&&gameState.running&&!gameState.won){gameState.paused=!gameState.paused;$('gamePause').classList.toggle('show',gameState.paused)}};
 window.onkeyup=e=>{g.keys[e.code]=false};
 $('resumeBtn').onclick=()=>{gameState.paused=false;$('gamePause').classList.remove('show')}; $('restartBtn').onclick=()=>enterGame(level); $('backMenuBtn').onclick=()=>showMenu();
 $('againBtn').onclick=()=>enterGame(level);$('endMenuBtn').onclick=()=>showMenu();
}
function showMenu(){gameState.running=false; $('game').classList.remove('active');$('studio').classList.remove('active');$('menu').classList.add('active');}
function isSolid(o){return o.type==='platform'||o.type==='wall'||o.type==='door';}
function movePlayer(dt){
 const k=g.keys; const f=(k.KeyW?1:0)-(k.KeyS?1:0); const s=(k.KeyD?1:0)-(k.KeyA?1:0); const speed=k.ShiftLeft?10:6; let dx=0,dz=0;
 if(f||s){dx=Math.sin(g.yaw)*f + Math.cos(g.yaw)*s; dz=Math.cos(g.yaw)*f - Math.sin(g.yaw)*s; const len=Math.hypot(dx,dz)||1;dx/=len;dz/=len;}
 const targetX=dx*speed,targetZ=dz*speed; const accel=g.onGround?16:10; g.vel.x += clamp(targetX-g.vel.x,-accel*dt,accel*dt); g.vel.z += clamp(targetZ-g.vel.z,-accel*dt,accel*dt);
 if(!f&&!s){g.vel.x*=Math.pow(.001,dt);g.vel.z*=Math.pow(.001,dt)}
 if(g.jumpBuffer>0)g.jumpBuffer-=dt; if(g.coyote>0)g.coyote-=dt; if(g.dashCooldown>0)g.dashCooldown-=dt;
 if(g.jumpBuffer>0&&g.coyote>0){g.vel.y=11;g.jumpBuffer=0;g.onGround=false;g.coyote=0}
 if(k.ShiftLeft&&!g._shift){g._shift=true;if(g.dashCooldown<=0){const l=Math.hypot(dx,dz)||1;g.vel.x=(dx/l)*15;g.vel.z=(dz/l)*15;g.dashCooldown=.7}} if(!k.ShiftLeft)g._shift=false;
 g.vel.y-=28*dt;
 const oldY=g.player.pos.y; // X collision
 let nx=g.player.pos.x+g.vel.x*dt; let nz=g.player.pos.z;
 if(wouldCollide(nx,nz,g.player.pos.y)) nx=g.player.pos.x; else g.player.pos.x=nx;
 nz=g.player.pos.z+g.vel.z*dt; if(wouldCollide(g.player.pos.x,nz,g.player.pos.y)) nz=g.player.pos.z; else g.player.pos.z=nz;
 let ny=g.player.pos.y+g.vel.y*dt; let landed=false;
 if(g.vel.y<=0){for(const o of level.objects){if(!isSolid(o))continue;const b=aabb(o);const px=g.player.pos.x,pz=g.player.pos.z;if(px+.42>b.minX&&px-.42<b.maxX&&pz+.42>b.minZ&&pz-.42<b.maxZ){const top=b.maxY;if(oldY>=top-.08&&ny<top+0.02){ny=top;g.vel.y=0;landed=true;break}}}}
 if(!landed)g.player.pos.y=ny; g.onGround=landed||false;if(landed)g.coyote=.1;else if(oldY!==g.player.pos.y&&g.vel.y<0)g.coyote=0;
 g.player.mesh.position.set(g.player.pos.x,g.player.pos.y,g.player.pos.z);
 // face movement direction
 if(Math.hypot(g.vel.x,g.vel.z)>.25)g.player.mesh.rotation.y=Math.atan2(g.vel.x,g.vel.z);
 if(g.player.pos.y<-20){resetPlayer()}
}
function wouldCollide(x,z,y){const pb={minX:x-.45,maxX:x+.45,minY:y+.15,maxY:y+1.7,minZ:z-.45,maxZ:z+.45};for(const o of level.objects){if(!isSolid(o))continue; if(overlap(pb,aabb(o))){return true}}return false;}
function interact(dt){
 for(const o of level.objects){const d=Math.hypot(g.player.pos.x-o.pos[0],g.player.pos.y-o.pos[1],g.player.pos.z-o.pos[2]); if(o.type==='key'&&d<1.5){gameState.key=true; o.collected=true; const m=g.meshes.get(o.id);if(m)m.visible=false}
 if(o.type==='checkpoint'&&d<1.7){gameState.checkpoint=[o.pos[0],o.pos[1]+o.size[1]/2,o.pos[2]];gameState.stage='CHECKPOINT';}
 if(o.type==='hazard'&&d<1.7&&Math.abs(g.player.pos.y-(o.pos[1]+o.size[1]/2))<1){resetPlayer()}
 if(o.type==='enemy'&&d<1.25){if(g.vel.y< -1 && g.player.pos.y>o.pos[1]){o.dead=true;const m=g.meshes.get(o.id);if(m)m.visible=false;g.vel.y=9}else resetPlayer()}
 if(o.type==='door'){const b=aabb(o); const front=Math.abs(g.player.pos.z-b.maxZ)<1&&Math.abs(g.player.pos.x-o.pos[0])<2; if(front&&gameState.key){o.open=true;const m=g.meshes.get(o.id);if(m){m.visible=false}} else if(front&&!gameState.key){g.player.pos.z += 0.2}}
 if(o.type==='goal'&&d<2){gameState.won=true;gameState.running=false;$('endTitle').textContent='SUMMIT REACHED';$('endText').textContent=`You finished the level with ${gameState.shards} shards.`;$('gameEnd').classList.add('show')}}
}
function updateCamera(){
 const target=g.player.pos.clone();target.y+=1.2; const dist=7; const cx=Math.sin(g.yaw)*Math.cos(g.pitch)*dist, cz=Math.cos(g.yaw)*Math.cos(g.pitch)*dist, cy=Math.sin(g.pitch)*dist; const desired=new THREE.Vector3(target.x+cx,target.y+cy,target.z+cz); g.camera.position.lerp(desired,.12); g.camera.lookAt(target);
}
function updateHUD(){ $('shards').textContent=gameState.shards; $('keyState').textContent=gameState.key?'OPENED':'LOCKED'; $('cpState').textContent=gameState.stage; $('objectiveText').textContent=gameState.key?'Reach the door and summit portal.':'Find the glowing key.'; }
function animateGame(t){if(!gameState.running&&g.renderer){ if(gameState.won){} else return; } requestAnimationFrame(animateGame); const dt=Math.min(.033,(t-g.last)/1000||.016);g.last=t;if(!gameState.paused&&!gameState.won){movePlayer(dt);interact(dt);updateCamera();updateHUD()}g.renderer.render(g.scene,g.camera);}

// ---------- STUDIO ----------
let s={renderer:null,scene:null,camera:null,group:null,outline:null,gizmo:null,selected:null,tool:'select',keys:{},drag:false,lastX:0,lastY:0,yaw:.7,pitch:-.35,camPos:new THREE.Vector3(16,13,20),snap:1,mode:'orbit',dragAxis:null,dragStart:null,selectionStart:null};
function enterStudio(){ $('menu').classList.remove('active');$('game').classList.remove('active');$('studio').classList.add('active'); initStudio(); }
function initStudio(){
 const c=$('studioCanvas'); s.renderer?.dispose(); s.renderer=makeRenderer(c,true);s.scene=new THREE.Scene();s.scene.background=new THREE.Color(0x07121f);s.scene.fog=new THREE.Fog(0x07121f,60,170);addLights(s.scene);s.group=new THREE.Group();s.scene.add(s.group);s.camera=new THREE.PerspectiveCamera(60,c.clientWidth/c.clientHeight,.1,300);
 const grid=new THREE.GridHelper(120,120,0x2b435b,0x17293b);grid.position.y=0;grid.material.transparent=true;grid.material.opacity=.55;s.scene.add(grid);
 buildStudio();setupStudioEvents();updateExplorer();updateProps();updateJson();animateStudio();
}
function buildStudio(){clearGroup(s.group);for(const o of level.objects){const m=objectMesh(o);m.castShadow=true;m.receiveShadow=true;m.userData.id=o.id;s.group.add(m)}s.outline=null;s.gizmo=null;if(s.selected){const o=level.objects.find(x=>x.id===s.selected);if(!o)s.selected=null} if(s.selected)selectObject(s.selected,false);}
function objectFromHit(hit){let id=hit?.object?.userData?.id;return id?level.objects.find(o=>o.id===id):null;}
function setupStudioEvents(){
 const canvas=s.renderer.domElement;canvas.oncontextmenu=e=>e.preventDefault();canvas.onmousedown=e=>{s.drag=true;s.lastX=e.clientX;s.lastY=e.clientY; s.mode=e.button===0?'left':'orbit'; const rect=canvas.getBoundingClientRect();const ndc=new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);const ray=new THREE.Raycaster();ray.setFromCamera(ndc,s.camera);const hits=ray.intersectObjects(s.group.children,true);if(e.button===0&&hits.length){const o=objectFromHit(hits[0]);if(o){selectObject(o.id);s.dragStart=[...o.pos];s.selectionStart={x:e.clientX,y:e.clientY};return}} if(e.button===0){s.selectionStart=null}};
 window.addEventListener('mouseup',()=>{s.drag=false;s.dragAxis=null});window.addEventListener('mousemove',e=>{
  if(!s.drag)return;const dx=e.clientX-s.lastX,dy=e.clientY-s.lastY;s.lastX=e.clientX;s.lastY=e.clientY;
  if(s.selected&&s.tool!=='select'&&s.mode==='left'){handleGizmoDrag(dx,dy)} else if(s.mode==='orbit'){s.yaw-=dx*.004;s.pitch=clamp(s.pitch-dy*.003,-1.35,1.35)}
 });
 window.addEventListener('wheel',e=>{if(!$('studio').classList.contains('active'))return;const dir=e.deltaY>0?1:-1;const forward=new THREE.Vector3(Math.sin(s.yaw)*Math.cos(s.pitch),Math.sin(s.pitch),Math.cos(s.yaw)*Math.cos(s.pitch));s.camPos.addScaledVector(forward,dir*1.2)} ,{passive:true});
 window.addEventListener('keydown',e=>{if(!$('studio').classList.contains('active'))return;s.keys[e.code]=true;if(e.code==='Digit1')setTool('select');if(e.code==='Digit2')setTool('move');if(e.code==='Digit3')setTool('scale');if(e.code==='Delete')deleteSelected();if(e.ctrlKey&&e.code==='KeyD'){e.preventDefault();duplicateSelected()}if(e.code==='KeyF')focusSelected()});window.addEventListener('keyup',e=>s.keys[e.code]=false);
 document.querySelectorAll('.tool').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>addPart(b.dataset.add));
 $('studioMenu').onclick=()=>showMenu();$('duplicateBtn').onclick=duplicateSelected;$('deleteBtn').onclick=deleteSelected;$('newLevelBtn').onclick=()=>{level={name:'New Level',spawn:[0,1,0],objects:[]};s.selected=null;buildStudio();updateExplorer();updateProps();updateJson()};$('playEditedBtn').onclick=()=>enterGame(level);
 $('copyJsonBtn').onclick=async()=>{try{await navigator.clipboard.writeText(JSON.stringify(level,null,2));studioToast('JSON copied')}catch{studioToast('Clipboard blocked — use Download instead')}};
 $('loadJsonBtn').onclick=()=>{try{level=JSON.parse($('jsonBox').value);if(!Array.isArray(level.objects))throw Error('Bad format');s.selected=null;buildStudio();updateExplorer();updateProps();updateJson();studioToast('Level loaded')}catch(e){studioToast('Invalid JSON')}};
 $('downloadJsonBtn').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(level,null,2)],{type:'application/json'}));a.download=(level.name||'level')+'.json';a.click();URL.revokeObjectURL(a.href)};
 $('snapMinus').onclick=()=>{s.snap=Math.max(.1,s.snap/2);$('snapValue').value=s.snap};$('snapPlus').onclick=()=>{s.snap*=2;$('snapValue').value=s.snap};$('snapValue').onchange=()=>{s.snap=Math.max(.1,parseFloat($('snapValue').value)||1);$('snapValue').value=s.snap};
}
function setTool(t){s.tool=t;document.querySelectorAll('.tool').forEach(b=>b.classList.toggle('active',b.dataset.tool===t));updateGizmo()}
function selectObject(id,refresh=true){s.selected=id;s.selectionStart=null;updateGizmo();if(refresh){updateExplorer();updateProps()}}
function updateExplorer(){const ex=$('explorer');ex.innerHTML='';for(const o of level.objects){const d=document.createElement('div');d.className='item'+(o.id===s.selected?' selected':'');d.innerHTML=`<span>▣</span><span>${o.name||o.type}</span><small>${o.type}</small>`;d.onclick=()=>selectObject(o.id);ex.appendChild(d)}}
function field(label,key,val,cb){const d=document.createElement('div');d.className='field';d.innerHTML=`<label>${label}</label><input type="number" step="0.1" value="${val}">`;d.querySelector('input').oninput=e=>cb(parseFloat(e.target.value)||0);return d}
function updateProps(){const p=$('propertyPanel');if(!s.selected){$('noSelection').style.display='block';p.style.display='none';return}const o=level.objects.find(x=>x.id===s.selected);if(!o)return; $('noSelection').style.display='none';p.style.display='block';p.innerHTML='';const grid=document.createElement('div');grid.className='grid2';['x','y','z'].forEach((axis,i)=>grid.appendChild(field(axis.toUpperCase(),axis,o.pos[i],v=>{o.pos[i]=snap(v,s.snap);syncSelectedMesh()})));['width','height','depth'].forEach((label,i)=>grid.appendChild(field(label[0].toUpperCase(),`s${i}`,o.size[i],v=>{o.size[i]=Math.max(.1,v);syncSelectedMesh()})));p.appendChild(grid);const name=document.createElement('div');name.className='field';name.style.marginTop='8px';name.innerHTML=`<label>Name</label><input value="${o.name||''}">`;name.querySelector('input').oninput=e=>{o.name=e.target.value;updateExplorer()};p.appendChild(name)}
function syncSelectedMesh(){const o=level.objects.find(x=>x.id===s.selected),m=s.group.children.find(m=>m.userData.id===s.selected);if(o&&m){m.position.set(...o.pos);m.scale.set(o.size[0]/TYPES[o.type].size[0],o.size[1]/TYPES[o.type].size[1],o.size[2]/TYPES[o.type].size[2]);updateGizmo();updateJson()}}
function updateGizmo(){if(s.gizmo){s.scene.remove(s.gizmo);s.gizmo=null}s.outline&&s.scene.remove(s.outline);s.outline=null;if(!s.selected)return;const o=level.objects.find(x=>x.id===s.selected);if(!o)return;const m=s.group.children.find(m=>m.userData.id===o.id);if(!m)return;
 const e=new THREE.EdgesGeometry(new THREE.BoxGeometry(...o.size));s.outline=new THREE.LineSegments(e,new THREE.LineBasicMaterial({color:0x54e7ff}));s.outline.position.set(...o.pos);s.outline.userData.id='outline';s.scene.add(s.outline);
 if(s.tool!=='move'&&s.tool!=='scale')return; const gg=new THREE.Group();gg.position.set(...o.pos); if(s.tool==='move'){[['x',0xff4f5c],[ 'y',0x6dff83],['z',0x5599ff]].forEach(([axis,col])=>{const dir=axis==='x'?new THREE.Vector3(1,0,0):axis==='y'?new THREE.Vector3(0,1,0):new THREE.Vector3(0,0,1);const line=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,2.4,8),new THREE.MeshBasicMaterial({color:col}));line.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);line.userData.axis=axis;line.userData.gizmo=true;line.position.copy(dir.clone().multiplyScalar(1.2));gg.add(line);const cone=new THREE.Mesh(new THREE.ConeGeometry(.13,.35,8),new THREE.MeshBasicMaterial({color:col}));cone.quaternion.copy(line.quaternion);cone.position.copy(dir.clone().multiplyScalar(2.35));cone.userData.axis=axis;cone.userData.gizmo=true;gg.add(cone)})} else {['x','y','z'].forEach((axis,i)=>{const p=new THREE.Mesh(new THREE.BoxGeometry(.28,.28,.28),new THREE.MeshBasicMaterial({color:[0xff4f5c,0x6dff83,0x5599ff][i]}));const dir=i===0?new THREE.Vector3(1,0,0):i===1?new THREE.Vector3(0,1,0):new THREE.Vector3(0,0,1);p.position.copy(dir.multiplyScalar(1.1));p.userData.axis=axis;p.userData.gizmo=true;gg.add(p)})}s.gizmo=gg;s.scene.add(gg)}
function handleGizmoDrag(dx,dy){const o=level.objects.find(x=>x.id===s.selected);if(!o)return;if(!s.dragAxis){ // choose dominant axis based on mouse direction
  s.dragAxis=Math.abs(dx)>Math.abs(dy)?'x':'y';
 }
 const amt=(Math.abs(dx)>Math.abs(dy)?dx:-dy)*.025;const i='xyz'.indexOf(s.dragAxis);if(i<0)return;if(s.tool==='move')o.pos[i]=snap(o.pos[i]+amt,s.snap);else{o.size[i]=Math.max(.1,snap(o.size[i]+amt,s.snap));}syncSelectedMesh();updateProps();}
function addPart(type){const spec=TYPES[type];const id=uid();const center=s.selected?level.objects.find(o=>o.id===s.selected)?.pos:[0,0,0];const o={id,type,pos:[center?.[0]||0,(center?.[1]||0)+2,(center?.[2]||0)-4],size:[...spec.size],name:type[0].toUpperCase()+type.slice(1)};level.objects.push(o);buildStudio();selectObject(id);updateExplorer();updateProps();updateJson()}
function deleteSelected(){if(!s.selected)return;level.objects=level.objects.filter(o=>o.id!==s.selected);s.selected=null;buildStudio();updateExplorer();updateProps();updateJson()}
function duplicateSelected(){const o=level.objects.find(x=>x.id===s.selected);if(!o)return;const n=structuredClone(o);n.id=uid();n.name=(o.name||o.type)+' Copy';n.pos=[o.pos[0]+s.snap,o.pos[1],o.pos[2]-s.snap];level.objects.push(n);buildStudio();selectObject(n.id);updateExplorer();updateProps();updateJson()}
function focusSelected(){const o=level.objects.find(x=>x.id===s.selected);if(!o)return;s.camPos.set(o.pos[0]+8,o.pos[1]+6,o.pos[2]+8)}
function updateJson(){$('jsonBox').value=JSON.stringify(level,null,2)}
function studioToast(msg){const t=$('studioToast');t.textContent=msg;t.classList.add('show');clearTimeout(studioToast.t);studioToast.t=setTimeout(()=>t.classList.remove('show'),1400)}
function animateStudio(t=0){if(!$('studio').classList.contains('active'))return;requestAnimationFrame(animateStudio);const dt=.016;const k=s.keys;const f=(k.KeyW?1:0)-(k.KeyS?1:0);const str=(k.KeyD?1:0)-(k.KeyA?1:0);const up=(k.KeyE?1:0)-(k.KeyQ?1:0);const sp=k.ShiftLeft?20:10;const dir=new THREE.Vector3(Math.sin(s.yaw),0,Math.cos(s.yaw));const right=new THREE.Vector3(Math.cos(s.yaw),0,-Math.sin(s.yaw));s.camPos.addScaledVector(dir,f*sp*dt);s.camPos.addScaledVector(right,str*sp*dt);s.camPos.y+=up*sp*dt;const target=new THREE.Vector3(s.camPos.x+Math.sin(s.yaw)*Math.cos(s.pitch)*20,s.camPos.y+Math.sin(s.pitch)*20,s.camPos.z+Math.cos(s.yaw)*Math.cos(s.pitch)*20);s.camera.position.copy(s.camPos);s.camera.lookAt(target);s.renderer.render(s.scene,s.camera)}

// ---------- routing + resize ----------
$('playBtn').onclick=()=>enterGame(defaultLevel);$('studioBtn').onclick=()=>enterStudio();
window.addEventListener('resize',()=>{if(g.renderer&&g.camera){g.renderer.setSize($('gameCanvas').clientWidth,$('gameCanvas').clientHeight);g.camera.aspect=$('gameCanvas').clientWidth/$('gameCanvas').clientHeight;g.camera.updateProjectionMatrix()}if(s.renderer&&s.camera){s.renderer.setSize($('studioCanvas').clientWidth,$('studioCanvas').clientHeight);s.camera.aspect=$('studioCanvas').clientWidth/$('studioCanvas').clientHeight;s.camera.updateProjectionMatrix()}});
