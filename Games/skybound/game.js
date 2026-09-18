import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.162.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.162.0/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'https://cdn.jsdelivr.net/npm/three@0.162.0/examples/jsm/controls/TransformControls.js';

const $ = (id) => document.getElementById(id);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const ui = {
  menu: $('menu'), hud: $('hud'), pause: $('pauseScreen'), gameOver: $('gameOverScreen'), victory: $('victoryScreen'), how: $('howPanel'), loading: $('loading'), loadingBar: $('loadingBar'), loadingText: $('loadingText'), studio: $('studio'), game: $('game'), flash: $('flash'),
  play: $('playBtn'), dev: $('devBtn'), howBtn: $('howBtn'), closeHow: $('closeHow'), resume: $('resumeBtn'), restartPause: $('restartPauseBtn'), homePause: $('homePauseBtn'), retry: $('retryBtn'), homeGameOver: $('homeGameOverBtn'), victoryRetry: $('victoryRetryBtn'), victoryHome: $('victoryHomeBtn'),
  shards: $('shardsHud'), keys: $('keysHud'), score: $('scoreHud'), best: $('bestHud'), bestMenu: $('bestScoreMenu'), healthBar: $('healthBar'), healthText: $('healthText'), dashBar: $('dashBar'), dashText: $('dashText'), checkpoint: $('checkpointHud'), objective: $('objectiveHud'), toast: $('messageToast'),
  goScore: $('gameOverScore'), goShards: $('gameOverShards'), goTitle: $('gameOverTitle'), goText: $('gameOverText'), vScore: $('victoryScore'), vShards: $('victoryShards'), vText: $('victoryText'),
  explorer: $('explorer'), toolSelect: $('toolSelect'), toolMove: $('toolMove'), toolScale: $('toolScale'), snapToggle: $('snapToggle'), snapSize: $('snapSize'), duplicateSelected: $('duplicateSelected'), focusSelected: $('focusSelected'),
  levelName: $('levelName'), selNone: $('selectedNone'), selPanel: $('selectedPanel'), selType: $('selType'), selX: $('selX'), selY: $('selY'), selZ: $('selZ'), selW: $('selW'), selH: $('selH'), selD: $('selD'), selLabel: $('selLabel'), deleteSelected: $('deleteSelected'),
  newLevel: $('newLevel'), exportJson: $('exportJson'), downloadJson: $('downloadJson'), jsonBox: $('jsonBox'), loadJson: $('loadJson'), studioStatus: $('studioStatus'), studioPlay: $('studioPlay'), studioBack: $('studioBack'), studioResetCam: $('studioResetCam'), studioTestSpawn: $('studioTestSpawn')
};

const demoMode = new URLSearchParams(location.search).has('demo');
const state = {
  mode: 'menu', score: 0, shards: 0, keys: 0, health: 100,
  best: Number(localStorage.getItem('skybound_best') || 0), checkpoint: 'START', time: 0, runTime: 0
};
ui.best.textContent = state.best;
ui.bestMenu.textContent = state.best;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x75cbed);
scene.fog = new THREE.FogExp2(0x73c1db, 0.008);
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.05, 500);
const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: ui.game, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;

const hemi = new THREE.HemisphereLight(0xb9efff, 0x2c4f3f, 1.7);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1c9, 2.4);
sun.position.set(-28, 42, 18);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -65;
sun.shadow.camera.right = 65;
sun.shadow.camera.top = 65;
sun.shadow.camera.bottom = -65;
scene.add(sun);
const skyFill = new THREE.DirectionalLight(0x5ae8ff, 0.55);
skyFill.position.set(28, 14, -28);
scene.add(skyFill);

const world = new THREE.Group();
const dynamic = new THREE.Group();
const effects = new THREE.Group();
const atmosphere = new THREE.Group();
world.add(dynamic, effects, atmosphere);
scene.add(world);

const loader = new THREE.TextureLoader();
const runeTexture = loader.load('assets/skybound-rune-tile.jpg', (texture) => {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
}, undefined, () => console.warn('Skybound rune texture was unavailable; using material color.'));
runeTexture.wrapS = runeTexture.wrapT = THREE.RepeatWrapping;

const MAT = {
  rune: new THREE.MeshStandardMaterial({ color: 0x699c65, map: runeTexture, roughness: 0.86, metalness: 0.02 }),
  moss: new THREE.MeshStandardMaterial({ color: 0x307651, roughness: 0.96 }),
  rock: new THREE.MeshStandardMaterial({ color: 0x355464, roughness: 0.94 }),
  underside: new THREE.MeshStandardMaterial({ color: 0x274451, roughness: 0.98, flatShading: true }),
  ruin: new THREE.MeshStandardMaterial({ color: 0x718e86, roughness: 0.85 }),
  cyan: new THREE.MeshStandardMaterial({ color: 0x65e8ff, emissive: 0x147d99, emissiveIntensity: 1.3, roughness: 0.22, metalness: 0.2 }),
  shard: new THREE.MeshStandardMaterial({ color: 0x78efff, emissive: 0x1d9abb, emissiveIntensity: 1.4, roughness: 0.12, metalness: 0.35 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xffd36b, emissive: 0x694300, emissiveIntensity: 0.45, roughness: 0.25, metalness: 0.48 }),
  player: new THREE.MeshStandardMaterial({ color: 0x2763b9, emissive: 0x102d61, emissiveIntensity: 0.25, roughness: 0.35, metalness: 0.35 }),
  playerAccent: new THREE.MeshStandardMaterial({ color: 0xffd77c, emissive: 0x6d4100, emissiveIntensity: 0.35, roughness: 0.2, metalness: 0.45 }),
  visor: new THREE.MeshStandardMaterial({ color: 0x0b263d, emissive: 0x36dbf5, emissiveIntensity: 0.62, roughness: 0.1, metalness: 0.65 }),
  enemy: new THREE.MeshStandardMaterial({ color: 0xd64b61, emissive: 0x521023, emissiveIntensity: 0.54, roughness: 0.3, metalness: 0.45 }),
  enemyEye: new THREE.MeshBasicMaterial({ color: 0xfff4c2 }),
  hazard: new THREE.MeshStandardMaterial({ color: 0x762844, emissive: 0x7a1634, emissiveIntensity: 0.8, roughness: 0.4 }),
  gate: new THREE.MeshStandardMaterial({ color: 0x4d356c, emissive: 0x25143d, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.35 }),
  gateGold: new THREE.MeshStandardMaterial({ color: 0xd3a84f, emissive: 0x5d3f0a, emissiveIntensity: 0.44, roughness: 0.32, metalness: 0.5 }),
  cloud: new THREE.MeshBasicMaterial({ color: 0xe6fbff, transparent: true, opacity: 0.52, depthWrite: false })
};
const GEO = {
  box: (x, y, z) => new THREE.BoxGeometry(x, y, z), sphere: (r, w = 18, h = 12) => new THREE.SphereGeometry(r, w, h),
  cylinder: (top, bottom, height, sides = 16) => new THREE.CylinderGeometry(top, bottom, height, sides),
  torus: (major, tube, radial = 12, tubular = 32) => new THREE.TorusGeometry(major, tube, radial, tubular),
  octahedron: (radius) => new THREE.OctahedronGeometry(radius, 0)
};

const platforms = [], hazards = [], collectibles = [], checkpoints = [], enemies = [], doors = [];
let goals = [];
let level = { name: 'Skybound: First Light', spawn: { x: 0, y: 1.1, z: 8 }, objects: [] };

function defaultLevel() {
  return {
    name: 'Skybound: First Light', spawn: { x: 0, y: 1.1, z: 8 }, objects: [
      { type: 'platform', x: 0, y: 0, z: 8, w: 18, h: 1, d: 18, label: 'LOWER REACH' },
      { type: 'platform', x: -1.5, y: 2.1, z: -6, w: 12, h: 1, d: 11, label: 'CLOUD RELAY' },
      { type: 'platform', x: 2, y: 3.9, z: -19, w: 10, h: 1, d: 10, label: 'RUNE STEP' },
      { type: 'platform', x: -2, y: 5.7, z: -33, w: 12, h: 1, d: 12, label: 'AETHER GATE' },
      { type: 'platform', x: 0, y: 7.5, z: -50, w: 17, h: 1, d: 16, label: 'SUMMIT' },
      { type: 'wall', x: -7.6, y: 2.0, z: -7, w: 1, h: 3.2, d: 3.5, label: 'RELAY RUIN' },
      { type: 'wall', x: 7.4, y: 7.3, z: -50, w: 1, h: 4.5, d: 2.5, label: 'SUMMIT RUIN' },
      { type: 'shard', x: -4.5, y: 2.1, z: 6, label: 'SKY SHARD 1' },
      { type: 'shard', x: 3.8, y: 3.8, z: -5.8, label: 'SKY SHARD 2' },
      { type: 'shard', x: -1.5, y: 5.7, z: -19, label: 'SKY SHARD 3' },
      { type: 'shard', x: 3.8, y: 7.5, z: -33, label: 'SKY SHARD 4' },
      { type: 'shard', x: -4.2, y: 9.3, z: -50, label: 'SKY SHARD 5' },
      { type: 'key', x: -1.5, y: 3.65, z: -7.6, label: 'KEY-1' },
      { type: 'key', x: -2, y: 7.25, z: -34.2, label: 'KEY-2' },
      { type: 'checkpoint', x: -1.5, y: 2.6, z: -3.4, label: 'CLOUD RELAY' },
      { type: 'checkpoint', x: -2, y: 6.2, z: -30.3, label: 'AETHER GATE' },
      { type: 'hazard', x: 1.8, y: 4.4, z: -15.7, w: 2.1, h: 0.18, d: 2.3, label: 'RUNE SURGE' },
      { type: 'hazard', x: 1.8, y: 8.0, z: -45, w: 2.4, h: 0.18, d: 2.1, label: 'SUMMIT SURGE' },
      { type: 'enemy', x: 3.4, y: 4.4, z: -21.2, label: 'SENTINEL A' },
      { type: 'enemy', x: 2.4, y: 6.2, z: -34.8, label: 'SENTINEL B' },
      { type: 'door', x: 0, y: 4.7, z: -12.4, w: 8.8, h: 6.2, d: 0.8, label: 'GATE-1' },
      { type: 'door', x: 0, y: 8.1, z: -41.0, w: 9.0, h: 6.2, d: 0.8, label: 'GATE-2' },
      { type: 'goal', x: 0, y: 9.8, z: -52.5, label: 'FIRST LIGHT PORTAL' }
    ]
  };
}

function emptyGroup(group) {
  while (group.children.length) group.remove(group.children[0]);
}
function addMesh(parent, geometry, material, position = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function addBox(parent, material, position, size, options = {}) {
  const mesh = addMesh(parent, GEO.box(...size), material, position);
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  return mesh;
}
function makeGlow(color, size, opacity = 0.6) {
  return new THREE.Sprite(new THREE.SpriteMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, map: null, sizeAttenuation: true }));
}

function clearWorld() {
  emptyGroup(dynamic);
  emptyGroup(effects);
  emptyGroup(atmosphere);
  for (const child of [...world.children]) if (child !== player && child !== dynamic && child !== effects && child !== atmosphere) world.remove(child);
  platforms.length = hazards.length = collectibles.length = checkpoints.length = enemies.length = doors.length = 0;
  goals = [];
}
function addIslandUnderside(o) {
  if (o.type !== 'platform') return;
  const radius = Math.max(2.6, Math.min(o.w, o.d) * 0.38);
  const height = clamp(Math.min(o.w, o.d) * 0.65, 4.5, 10);
  const rock = addMesh(world, GEO.cylinder(radius * 0.55, radius, height, 9), MAT.underside, [o.x, o.y - height / 2 - 0.35, o.z]);
  rock.rotation.y = (o.x + o.z) * 0.17;
  rock.scale.x = Math.max(0.85, o.w / Math.max(o.d, 1));
  rock.scale.z = Math.max(0.85, o.d / Math.max(o.w, 1));
  const glow = addMesh(world, GEO.cylinder(radius * 0.6, radius * 0.75, 0.15, 12), MAT.moss, [o.x, o.y - 0.55, o.z]);
  glow.scale.x = Math.max(0.85, o.w / Math.max(o.d, 1));
  glow.scale.z = Math.max(0.85, o.d / Math.max(o.w, 1));
}
function addPlatformDressing(o) {
  const seed = Math.abs(Math.round(o.x * 17 + o.z * 13));
  for (let i = 0; i < 5; i++) {
    const a = ((seed + i * 71) % 360) * Math.PI / 180;
    const x = o.x + Math.cos(a) * Math.max(1.2, o.w * 0.35);
    const z = o.z + Math.sin(a) * Math.max(1.2, o.d * 0.35);
    const rock = addMesh(world, GEO.octahedron(0.32 + ((seed + i) % 4) * 0.06), MAT.ruin, [x, o.y + o.h / 2 + 0.25, z]);
    rock.scale.y = 0.65;
    rock.rotation.set(i * 0.2, a, i * 0.1);
  }
  if (o.label.includes('SUMMIT') || o.label.includes('GATE')) {
    for (const side of [-1, 1]) {
      const beacon = new THREE.Group();
      beacon.position.set(o.x + side * Math.min(o.w * 0.32, 4.5), o.y + o.h / 2, o.z - o.d * 0.22);
      addMesh(beacon, GEO.cylinder(0.25, 0.36, 1.8, 6), MAT.ruin, [0, 0.9, 0]);
      const crystal = addMesh(beacon, GEO.octahedron(0.26), MAT.cyan, [0, 1.95, 0]);
      crystal.rotation.z = Math.PI / 4;
      dynamic.add(beacon);
    }
  }
}
function platform(o) {
  const h = o.h ?? 1;
  const material = o.type === 'wall' ? MAT.ruin : MAT.rune;
  const mesh = addBox(world, material, [o.x, o.y, o.z], [o.w || 4, h, o.d || 4]);
  const top = o.y + h / 2;
  if (o.type === 'platform') {
    const rimMaterial = (o.label || '').includes('SUMMIT') ? MAT.gold : MAT.moss;
    const rims = [
      addBox(world, rimMaterial, [o.x, top + 0.035, o.z - (o.d || 4) / 2 + 0.12], [o.w || 4, 0.07, 0.22], { castShadow: false }),
      addBox(world, rimMaterial, [o.x, top + 0.035, o.z + (o.d || 4) / 2 - 0.12], [o.w || 4, 0.07, 0.22], { castShadow: false }),
      addBox(world, rimMaterial, [o.x - (o.w || 4) / 2 + 0.12, top + 0.035, o.z], [0.22, 0.07, (o.d || 4) - 0.44], { castShadow: false }),
      addBox(world, rimMaterial, [o.x + (o.w || 4) / 2 - 0.12, top + 0.035, o.z], [0.22, 0.07, (o.d || 4) - 0.44], { castShadow: false })
    ];
    rims.forEach((rim) => markEditorObject(rim, o));
    addIslandUnderside(o);
    addPlatformDressing(o);
  }
  platforms.push({ x: o.x, z: o.z, y: top, w: o.w || 4, d: o.d || 4, h, mesh, label: o.label || '' });
  markEditorObject(mesh, o);
}
function shard(o) {
  const group = new THREE.Group();
  group.position.set(o.x, o.y, o.z);
  const crystal = addMesh(group, GEO.octahedron(0.48), MAT.shard, [0, 0.45, 0]);
  crystal.scale.y = 1.45;
  const ring = addMesh(group, GEO.torus(0.56, 0.026, 8, 28), MAT.cyan, [0, 0.45, 0]);
  ring.rotation.x = Math.PI / 2;
  const glow = makeGlow(0x70eaff, 1.9, 0.6);
  glow.position.y = 0.45;
  group.add(glow);
  dynamic.add(group);
  markEditorObject(group, o);
  collectibles.push({ kind: 'shard', group, baseY: o.y, phase: Math.random() * Math.PI * 2, got: false, label: o.label || 'SKY SHARD', value: 100 });
}
function key(o) {
  const group = new THREE.Group();
  group.position.set(o.x, o.y, o.z);
  const stem = addBox(group, MAT.gold, [0, 0.15, 0], [0.22, 0.82, 0.22]);
  stem.rotation.z = 0.34;
  const ring = addMesh(group, GEO.torus(0.32, 0.105, 8, 20), MAT.gold, [0, 0.52, 0]);
  ring.rotation.x = Math.PI / 2;
  const halo = addMesh(group, GEO.torus(0.58, 0.018, 8, 28), MAT.gateGold, [0, 0.28, 0]);
  halo.rotation.x = Math.PI / 2;
  const glow = makeGlow(0xffd66f, 1.8, 0.5);
  glow.position.y = 0.25;
  group.add(glow);
  dynamic.add(group);
  markEditorObject(group, o);
  collectibles.push({ kind: 'key', group, baseY: o.y, phase: Math.random() * Math.PI * 2, got: false, label: o.label || 'KEY', value: 250 });
}
function checkpoint(o) {
  const group = new THREE.Group();
  group.position.set(o.x, o.y, o.z);
  addMesh(group, GEO.cylinder(0.9, 1.08, 0.22, 12), MAT.ruin, [0, 0.08, 0]);
  const ring = addMesh(group, GEO.torus(0.72, 0.07, 8, 28), MAT.cyan, [0, 0.28, 0]);
  ring.rotation.x = Math.PI / 2;
  const spire = addMesh(group, GEO.octahedron(0.22), MAT.cyan, [0, 1.15, 0]);
  spire.scale.y = 2.1;
  dynamic.add(group);
  markEditorObject(group, o);
  checkpoints.push({ group, x: o.x, y: o.y, z: o.z, label: o.label || 'CHECKPOINT', active: false, ring, spire });
}
function enemy(o) {
  const group = new THREE.Group();
  group.position.set(o.x, o.y + 0.62, o.z);
  const body = addMesh(group, GEO.sphere(0.56, 18, 12), MAT.enemy, [0, 0, 0]);
  body.scale.set(1.22, 0.76, 1);
  addMesh(group, GEO.sphere(0.15, 10, 8), MAT.enemyEye, [0, 0.02, 0.5]);
  for (const side of [-1, 1]) {
    const fin = addMesh(group, GEO.box(0.42, 0.08, 0.32), MAT.enemy, [side * 0.65, 0, 0]);
    fin.rotation.z = side * 0.45;
  }
  const glow = makeGlow(0xff5268, 1.3, 0.42);
  glow.position.z = 0.28;
  group.add(glow);
  dynamic.add(group);
  markEditorObject(group, o);
  enemies.push({ group, originX: o.x, originZ: o.z, baseY: o.y + 0.62, path: 1.8, phase: Math.random() * Math.PI * 2, dead: false, label: o.label || 'SENTINEL' });
}
function hazard(o) {
  const group = new THREE.Group();
  group.position.set(o.x, o.y, o.z);
  const plate = addBox(group, MAT.hazard, [0, 0.1, 0], [o.w || 2, o.h || 0.18, o.d || 2], { castShadow: false });
  const ring = addMesh(group, GEO.torus(Math.min(o.w || 2, o.d || 2) * 0.27, 0.04, 8, 24), MAT.cyan, [0, 0.22, 0]);
  ring.rotation.x = Math.PI / 2;
  world.add(group);
  markEditorObject(group, o);
  hazards.push({ x: o.x, y: o.y + 0.22, z: o.z, w: o.w || 2, d: o.d || 2, mesh: group, ring, phase: Math.random() * 4 });
}
function door(o) {
  const group = new THREE.Group();
  group.position.set(o.x, o.y, o.z);
  const width = o.w || 8, height = o.h || 5, depth = o.d || 0.8;
  const slab = addBox(group, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }), [0, 0, 0], [width, height, depth], { castShadow: false, receiveShadow: false });
  const fieldMaterial = MAT.gate.clone();
  fieldMaterial.transparent = true;
  fieldMaterial.opacity = 0.62;
  fieldMaterial.depthWrite = false;
  const field = addMesh(group, new THREE.PlaneGeometry(width - 0.72, height - 0.55), fieldMaterial, [0, 0, depth / 2 + 0.012]);
  addBox(group, MAT.gateGold, [-width / 2 + 0.22, 0, depth / 2], [0.44, height, 0.22]);
  addBox(group, MAT.gateGold, [width / 2 - 0.22, 0, depth / 2], [0.44, height, 0.22]);
  addBox(group, MAT.gateGold, [0, height / 2 - 0.18, depth / 2], [width, 0.28, 0.22]);
  const sigil = addMesh(group, GEO.octahedron(0.38), MAT.gold, [0, 0.2, 0.46]);
  const ring = addMesh(group, GEO.torus(0.72, 0.045, 8, 24), MAT.gateGold, [0, 0.2, 0.46]);
  ring.rotation.x = Math.PI / 2;
  dynamic.add(group);
  markEditorObject(group, o);
  const requiredKey = Number(o.label?.match(/(\d+)/)?.[1] || 1);
  doors.push({ group, slab, requiredKey, label: o.label || 'GATE', baseY: o.y, open: false, w: o.w || 8, h: o.h || 5, d: o.d || 0.8 });
}
function goal(o) {
  const group = new THREE.Group();
  group.position.set(o.x, o.y, o.z);
  const ring = addMesh(group, GEO.torus(2.05, 0.20, 12, 40), MAT.cyan, [0, 0, 0]);
  ring.rotation.x = Math.PI / 2;
  const inner = addMesh(group, new THREE.CircleGeometry(1.82, 40), new THREE.MeshBasicMaterial({ color: 0x8af4ff, transparent: true, opacity: 0.22, side: THREE.DoubleSide }), [0, 0, 0]);
  inner.rotation.x = -Math.PI / 2;
  const crown = addMesh(group, GEO.octahedron(0.38), MAT.gold, [0, 2.2, 0]);
  const glow = makeGlow(0x9ff6ff, 5.4, 0.44);
  glow.position.y = 0.2;
  group.add(glow);
  dynamic.add(group);
  markEditorObject(group, o);
  goals.push({ x: o.x, y: o.y, z: o.z, group, ring });
}

function normalizeLevel(data) {
  const safe = data && Array.isArray(data.objects) ? data : defaultLevel();
  const validTypes = new Set(['platform', 'wall', 'shard', 'key', 'checkpoint', 'enemy', 'hazard', 'door', 'goal']);
  return {
    name: String(safe.name || 'Untitled Level'),
    spawn: { x: Number(safe.spawn?.x) || 0, y: Number(safe.spawn?.y) || 1.1, z: Number(safe.spawn?.z) || 8 },
    objects: safe.objects.filter((object) => validTypes.has(String(object.type || 'platform'))).map((object) => ({
      type: String(object.type || 'platform'), x: Number(object.x) || 0, y: Number(object.y) || 0, z: Number(object.z) || 0,
      w: object.w == null ? 4 : Number(object.w), h: object.h == null ? 1 : Number(object.h), d: object.d == null ? 4 : Number(object.d), label: String(object.label || '')
    }))
  };
}
function buildAtmosphere() {
  const sky = addMesh(atmosphere, GEO.sphere(180, 24, 14), new THREE.MeshBasicMaterial({ color: 0x83d9ef, side: THREE.BackSide }), [0, 25, -28]);
  sky.scale.y = 0.6;
  const cloudMaterial = MAT.cloud.clone();
  for (let i = 0; i < 26; i++) {
    const cloud = new THREE.Group();
    const angle = i * 2.4;
    const radius = 58 + (i % 6) * 13;
    cloud.position.set(Math.sin(angle) * radius, 17 + (i % 5) * 5, -28 + Math.cos(angle) * radius);
    for (let puff = 0; puff < 3; puff++) {
      const part = addMesh(cloud, GEO.sphere(1, 12, 8), cloudMaterial, [(puff - 1) * 1.35, (puff % 2) * 0.22, 0]);
      part.scale.set(2.4 + (i % 3), 0.65 + ((i + puff) % 3) * 0.15, 0.8);
      part.castShadow = false;
      part.receiveShadow = false;
    }
    cloud.userData.speed = 0.08 + (i % 4) * 0.012;
    atmosphere.add(cloud);
  }
  const starGeometry = new THREE.BufferGeometry();
  const count = 280;
  const points = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    points[i * 3] = (Math.sin(i * 87.1) * 0.5 + 0.5) * 170 - 85;
    points[i * 3 + 1] = 9 + ((i * 29) % 45);
    points[i * 3 + 2] = -100 + ((i * 53) % 110);
  }
  starGeometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
  const dust = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xd6fbff, size: 0.07, transparent: true, opacity: 0.46 }));
  atmosphere.add(dust);
}
function buildLevel(data) {
  clearWorld();
  level = normalizeLevel(data);
  buildAtmosphere();
  for (const object of level.objects) {
    if (object.type === 'platform' || object.type === 'wall') platform(object);
    else if (object.type === 'shard') shard(object);
    else if (object.type === 'key') key(object);
    else if (object.type === 'checkpoint') checkpoint(object);
    else if (object.type === 'enemy') enemy(object);
    else if (object.type === 'hazard') hazard(object);
    else if (object.type === 'door') door(object);
    else if (object.type === 'goal') goal(object);
  }
  setInitialRespawn();
  if (typeof buildEditorIndex === 'function') buildEditorIndex();
}

const player = new THREE.Group();
world.add(player);
const body = addBox(player, MAT.player, [0, 0.74, 0], [0.74, 1.12, 0.58]);
const chest = addBox(player, MAT.playerAccent, [0, 0.85, 0.31], [0.34, 0.36, 0.1]);
const head = addMesh(player, GEO.sphere(0.43, 16, 12), MAT.playerAccent, [0, 1.58, 0]);
const visor = addBox(player, MAT.visor, [0, 1.61, 0.36], [0.52, 0.16, 0.1]);
const pack = addBox(player, MAT.visor, [0, 0.78, -0.35], [0.42, 0.62, 0.16]);
const trail = new THREE.PointLight(0x5ceaff, 2.1, 5);
trail.position.set(0, 0.85, -0.75);
player.add(trail);

const pstate = {
  vel: new THREE.Vector3(), respawn: new THREE.Vector3(0, 1.06, 8), grounded: false, coyote: 0, jumpBuffer: 0, jumpsAvailable: 2, invuln: 0.8,
  radius: 0.4, dashCooldown: 0, dashHeld: false, wasGrounded: false, landingPulse: 0
};
const cameraRig = { yaw: 0, pitch: 0.22, distance: 8.6, height: 3.65 };
const keysDown = {};
let jumpQueued = false;
let mouseDX = 0, mouseDY = 0, pointerLocked = false;

function halfHeight() { return 0.56; }
function groundBelow(x, z, ceiling = Infinity) {
  let best = null;
  for (const platformData of platforms) {
    const inside = x >= platformData.x - platformData.w / 2 && x <= platformData.x + platformData.w / 2 && z >= platformData.z - platformData.d / 2 && z <= platformData.z + platformData.d / 2;
    if (inside && platformData.y <= ceiling && (!best || platformData.y > best.y)) best = platformData;
  }
  return best;
}
function setInitialRespawn() {
  const floor = groundBelow(level.spawn.x, level.spawn.z);
  pstate.respawn.set(level.spawn.x, floor ? floor.y + halfHeight() + 0.02 : Math.max(1.1, level.spawn.y), level.spawn.z);
}
function resetPlayer() {
  player.position.copy(pstate.respawn);
  pstate.vel.set(0, 0, 0);
  pstate.grounded = false;
  pstate.coyote = 0;
  pstate.jumpBuffer = 0;
  pstate.jumpsAvailable = 2;
  pstate.wasGrounded = false;
  pstate.landingPulse = 0;
  pstate.invuln = 0.8;
  cameraRig.yaw = 0;
  cameraRig.pitch = 0.22;
}
function toast(message, duration = 1350) {
  ui.toast.textContent = message;
  ui.toast.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ui.toast.classList.remove('show'), duration);
}
function flash() {
  ui.flash.style.opacity = '0.22';
  clearTimeout(flash.timer);
  flash.timer = setTimeout(() => { ui.flash.style.opacity = '0'; }, 115);
}
function setMode(mode) {
  state.mode = mode;
  ui.menu.classList.toggle('hidden', mode !== 'menu');
  ui.hud.classList.toggle('hidden', !['playing', 'paused'].includes(mode));
  ui.pause.classList.toggle('hidden', mode !== 'paused');
  ui.gameOver.classList.toggle('hidden', mode !== 'gameover');
  ui.victory.classList.toggle('hidden', mode !== 'victory');
  ui.studio.classList.toggle('hidden', mode !== 'studio');
}
function objectiveText() {
  const closed = doors.filter((gate) => !gate.open).sort((a, b) => a.requiredKey - b.requiredKey)[0];
  if (closed) {
    if (state.keys < closed.requiredKey) return `FIND THE KEY FOR ${closed.label}`;
    return `PASS THROUGH ${closed.label}`;
  }
  return 'REACH THE FIRST LIGHT PORTAL';
}
function updateHud() {
  ui.shards.textContent = `${state.shards} / ${collectibles.filter((item) => item.kind === 'shard').length}`;
  ui.keys.textContent = `${state.keys} / ${collectibles.filter((item) => item.kind === 'key').length}`;
  ui.score.textContent = state.score;
  ui.best.textContent = state.best;
  ui.healthBar.style.width = `${state.health}%`;
  ui.healthText.textContent = `${Math.round(state.health)}%`;
  const dashReady = clamp(1 - pstate.dashCooldown / 0.82, 0, 1);
  ui.dashBar.style.width = `${dashReady * 100}%`;
  ui.dashText.textContent = dashReady >= 0.99 ? 'READY' : `${(dashReady * 100).toFixed(0)}%`;
  ui.checkpoint.textContent = state.checkpoint;
  ui.objective.textContent = objectiveText();
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem('skybound_best', state.best);
    ui.best.textContent = state.best;
    ui.bestMenu.textContent = state.best;
  }
}
function startGame() {
  state.score = 0;
  state.shards = 0;
  state.keys = 0;
  state.health = 100;
  state.checkpoint = 'START';
  state.runTime = 0;
  collectibles.forEach((item) => { item.got = false; item.group.visible = true; });
  checkpoints.forEach((checkpointData) => {
    checkpointData.active = false;
    checkpointData.ring.material = MAT.cyan;
  });
  enemies.forEach((enemyData) => { enemyData.dead = false; enemyData.group.visible = true; });
  doors.forEach((gate) => { gate.open = false; gate.group.position.y = gate.baseY; gate.group.visible = true; });
  setInitialRespawn();
  resetPlayer();
  setMode('playing');
  toast(`LEVEL STARTED • ${level.name}`, 1700);
  updateHud();
}
function restartGame() { startGame(); }
function continueFromCheckpoint() {
  state.health = 100;
  resetPlayer();
  setMode('playing');
  toast(`REDEPLOYED • ${state.checkpoint}`, 1400);
  updateHud();
}
function goHome() {
  setMode('menu');
  document.exitPointerLock?.();
  resetPlayer();
}
function togglePause() {
  if (state.mode === 'playing') {
    document.exitPointerLock?.();
    setMode('paused');
  } else if (state.mode === 'paused') setMode('playing');
}
function gameOver(title, message) {
  setMode('gameover');
  ui.goTitle.textContent = title;
  ui.goText.textContent = message;
  ui.goScore.textContent = state.score;
  ui.goShards.textContent = state.shards;
}
function victory() {
  if (state.mode !== 'playing') return;
  state.score += 600;
  updateHud();
  setMode('victory');
  ui.vScore.textContent = state.score;
  ui.vShards.textContent = state.shards;
  ui.vText.textContent = `${level.name} complete — the First Light is restored.`;
}
function respawn(reason = 'SKYLINE RECOVERY') {
  resetPlayer();
  toast(`${reason} • ${state.checkpoint}`, 1200);
}
function damage(amount, message) {
  if (pstate.invuln > 0 || state.mode !== 'playing') return;
  state.health = Math.max(0, state.health - amount);
  pstate.invuln = 0.85;
  flash();
  burst(player.position, 0xff6479);
  toast(message);
  if (state.health <= 0) gameOver('SUIT OFFLINE', `Your recovery beacon is active at ${state.checkpoint}.`);
  updateHud();
}
function collect(item) {
  if (item.got) return;
  item.got = true;
  item.group.visible = false;
  if (item.kind === 'shard') {
    state.shards += 1;
    state.score += item.value;
    state.health = Math.min(100, state.health + 4);
    toast(`SKY SHARD SECURED +${item.value}`, 1150);
    burst(item.group.position, 0x74efff);
  } else {
    state.keys += 1;
    state.score += item.value;
    toast(`AETHER KEY ACQUIRED • ${state.keys}`, 1250);
    burst(item.group.position, 0xffd66f);
  }
  updateHud();
}
function activate(checkpointData) {
  if (checkpointData.active) return;
  checkpointData.active = true;
  state.checkpoint = checkpointData.label;
  const floor = groundBelow(checkpointData.x, checkpointData.z);
  pstate.respawn.set(checkpointData.x, floor ? floor.y + halfHeight() + 0.02 : checkpointData.y + halfHeight(), checkpointData.z + 1.25);
  checkpointData.ring.material = MAT.gold;
  state.score += 125;
  state.health = Math.min(100, state.health + 20);
  toast(`CHECKPOINT SYNCHRONIZED • ${checkpointData.label}`, 1650);
  burst(checkpointData.group.position, 0x86f5ff);
  updateHud();
}
function killEnemy(enemyData) {
  if (enemyData.dead) return;
  enemyData.dead = true;
  enemyData.group.visible = false;
  state.score += 300;
  toast('SENTINEL DISABLED +300', 1000);
  burst(enemyData.group.position, 0xff6077);
  updateHud();
}
function burst(position, color = 0x8ff3ff) {
  const group = new THREE.Group();
  for (let i = 0; i < 11; i++) {
    const piece = addMesh(group, GEO.sphere(0.045, 6, 4), new THREE.MeshBasicMaterial({ color, transparent: true }), [0, 0, 0]);
    piece.position.copy(position);
    piece.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 3.3, (Math.random() - 0.5) * 4);
  }
  group.userData.age = 0;
  group.userData.max = 0.68;
  effects.add(group);
}
function updateEffects(dt) {
  for (let i = effects.children.length - 1; i >= 0; i--) {
    const group = effects.children[i];
    group.userData.age += dt;
    for (const piece of group.children) {
      piece.position.addScaledVector(piece.userData.velocity, dt);
      piece.userData.velocity.y -= 5.4 * dt;
      piece.material.opacity = Math.max(0, 1 - group.userData.age / group.userData.max);
    }
    if (group.userData.age > group.userData.max) effects.remove(group);
  }
}

function processInteractions() {
  for (const item of collectibles) if (!item.got && player.position.distanceTo(item.group.position) < 1.35) collect(item);
  for (const checkpointData of checkpoints) if (!checkpointData.active && Math.hypot(player.position.x - checkpointData.x, player.position.z - checkpointData.z) < 1.8 && player.position.y > checkpointData.y - 0.7) activate(checkpointData);
  for (const gate of doors) {
    if (!gate.open && state.keys >= gate.requiredKey) {
      gate.open = true;
      toast(`${gate.label} UNLOCKED`, 1250);
      burst(gate.group.position, 0xb68aff);
      updateHud();
    }
  }
  for (const goalData of goals) if (Math.hypot(player.position.x - goalData.x, player.position.z - goalData.z) < 2.5 && Math.abs(player.position.y - goalData.y) < 3.1) victory();
}
function updatePlayer(dt) {
  pstate.invuln = Math.max(0, pstate.invuln - dt);
  pstate.coyote = Math.max(0, pstate.coyote - dt);
  pstate.jumpBuffer = Math.max(0, pstate.jumpBuffer - dt);
  pstate.dashCooldown = Math.max(0, pstate.dashCooldown - dt);
  const forwardKey = Boolean(keysDown.KeyW || keysDown.ArrowUp);
  const backKey = Boolean(keysDown.KeyS || keysDown.ArrowDown);
  const leftKey = Boolean(keysDown.KeyA || keysDown.ArrowLeft);
  const rightKey = Boolean(keysDown.KeyD || keysDown.ArrowRight);
  let inputX = (rightKey ? 1 : 0) - (leftKey ? 1 : 0);
  let inputZ = (forwardKey ? 1 : 0) - (backKey ? 1 : 0);
  const inputLength = Math.hypot(inputX, inputZ);
  if (inputLength) { inputX /= inputLength; inputZ /= inputLength; }
  const forward = new THREE.Vector3(-Math.sin(cameraRig.yaw), 0, -Math.cos(cameraRig.yaw));
  const right = new THREE.Vector3(Math.cos(cameraRig.yaw), 0, -Math.sin(cameraRig.yaw));
  let moveX = right.x * inputX + forward.x * inputZ;
  let moveZ = right.z * inputX + forward.z * inputZ;
  const moveLength = Math.hypot(moveX, moveZ);
  if (moveLength > 0.0001) { moveX /= moveLength; moveZ /= moveLength; }
  const sprint = Boolean(keysDown.ShiftLeft || keysDown.ShiftRight);
  const speed = sprint ? 8.8 : 6.4;
  const acceleration = pstate.grounded ? 32 : 22;
  const blend = 1 - Math.exp(-acceleration * dt);
  pstate.vel.x += (moveX * speed - pstate.vel.x) * blend;
  pstate.vel.z += (moveZ * speed - pstate.vel.z) * blend;
  if (!inputLength) {
    const braking = pstate.grounded ? 15 : 6.2;
    const brake = Math.exp(-braking * dt);
    pstate.vel.x *= brake;
    pstate.vel.z *= brake;
  }
  if (inputLength) {
    const desired = Math.atan2(moveX, moveZ);
    let delta = desired - player.rotation.y;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    player.rotation.y += delta * (1 - Math.exp(-18 * dt));
  }
  if (sprint && inputLength && !pstate.dashHeld && pstate.dashCooldown <= 0) {
    pstate.vel.x = moveX * 13;
    pstate.vel.z = moveZ * 13;
    pstate.dashCooldown = 0.82;
    pstate.dashHeld = true;
    trail.intensity = 5.5;
    burst(player.position, 0x7af1ff);
  } else if (!sprint) pstate.dashHeld = false;
  if (jumpQueued) pstate.jumpBuffer = 0.14;
  if (pstate.jumpBuffer > 0 && (pstate.grounded || pstate.coyote > 0 || pstate.jumpsAvailable > 0)) {
    pstate.vel.y = 11.4;
    pstate.grounded = false;
    pstate.coyote = 0;
    pstate.jumpBuffer = 0;
    pstate.jumpsAvailable = Math.max(0, pstate.jumpsAvailable - 1);
    jumpQueued = false;
    burst(player.position, pstate.jumpsAvailable === 1 ? 0x92f6ff : 0xffd66f);
  }
  jumpQueued = false;
  pstate.vel.y = Math.max(-34, pstate.vel.y - 27 * dt);
  const radius = pstate.radius;
  const hh = halfHeight();
  const px = player.position.x, py = player.position.y, pz = player.position.z;
  const solids = [
    ...platforms.map((item) => ({ x: item.x, z: item.z, y: item.y, w: item.w, h: item.h, d: item.d })),
    ...doors.filter((gate) => !gate.open).map((gate) => ({ x: gate.group.position.x, z: gate.group.position.z, y: gate.group.position.y + gate.h / 2, w: gate.w, h: gate.h, d: gate.d }))
  ];
  let nx = px + pstate.vel.x * dt;
  for (const solid of solids) {
    const vertical = py - hh < solid.y && py + hh > solid.y - solid.h;
    const overlap = nx + radius > solid.x - solid.w / 2 && nx - radius < solid.x + solid.w / 2 && pz + radius > solid.z - solid.d / 2 && pz - radius < solid.z + solid.d / 2;
    if (vertical && overlap) { nx = px; pstate.vel.x = 0; break; }
  }
  let nz = pz + pstate.vel.z * dt;
  for (const solid of solids) {
    const vertical = py - hh < solid.y && py + hh > solid.y - solid.h;
    const overlap = nx + radius > solid.x - solid.w / 2 && nx - radius < solid.x + solid.w / 2 && nz + radius > solid.z - solid.d / 2 && nz - radius < solid.z + solid.d / 2;
    if (vertical && overlap) { nz = pz; pstate.vel.z = 0; break; }
  }
  player.position.x = nx;
  player.position.z = nz;
  const newY = py + pstate.vel.y * dt;
  let landing = null;
  let top = -Infinity;
  if (pstate.vel.y <= 0) {
    for (const solid of solids) {
      const overlap = player.position.x + radius > solid.x - solid.w / 2 && player.position.x - radius < solid.x + solid.w / 2 && player.position.z + radius > solid.z - solid.d / 2 && player.position.z - radius < solid.z + solid.d / 2;
      const oldFoot = py - hh;
      const newFoot = newY - hh;
      // Use a small downward sweep tolerance so a fast fall cannot tunnel through
      // a platform edge between animation frames, especially on the upper route.
      if (overlap && oldFoot >= solid.y - 0.42 && newFoot <= solid.y && solid.y > top) { top = solid.y; landing = solid; }
    }
  }
  if (landing) {
    const impact = Math.abs(pstate.vel.y);
    player.position.y = landing.y + hh;
    pstate.vel.y = 0;
    pstate.grounded = true;
    pstate.coyote = 0.12;
    pstate.jumpsAvailable = 2;
    if (!pstate.wasGrounded && impact > 5) {
      pstate.landingPulse = Math.min(1, impact / 18);
      burst(player.position.clone().setY(landing.y + 0.06), 0x72eaff);
    }
  } else {
    player.position.y = newY;
    pstate.grounded = false;
  }
  if (player.position.y < -22) { respawn('FALL RECOVERED'); return; }
  for (const hazardData of hazards) if (Math.abs(player.position.x - hazardData.x) < hazardData.w * 0.56 && Math.abs(player.position.z - hazardData.z) < hazardData.d * 0.56 && Math.abs(player.position.y - hazardData.y) < 1.05) damage(22, 'RUNE SURGE');
  for (const enemyData of enemies) {
    if (enemyData.dead) continue;
    const distance = Math.hypot(player.position.x - enemyData.group.position.x, player.position.z - enemyData.group.position.z);
    if (distance < 1.05 && Math.abs(player.position.y - enemyData.group.position.y) < 1.55) {
      if (pstate.vel.y < 0 && player.position.y > enemyData.group.position.y + 0.48) { killEnemy(enemyData); pstate.vel.y = 10.8; pstate.grounded = false; pstate.jumpsAvailable = 1; }
      else damage(24, 'SENTINEL STRIKE');
    }
  }
  processInteractions();
  body.rotation.x = clamp(-pstate.vel.y * 0.02, -0.18, 0.18);
  const runSpeed = Math.hypot(pstate.vel.x, pstate.vel.z);
  body.position.y = 0.74 + (pstate.grounded ? Math.sin(state.time * 11) * Math.min(0.05, runSpeed * 0.004) : 0);
  body.rotation.z = clamp(-moveX * runSpeed * 0.012, -0.14, 0.14);
  player.scale.y += ((1 - pstate.landingPulse * 0.16) - player.scale.y) * Math.min(1, dt * 18);
  pstate.landingPulse = Math.max(0, pstate.landingPulse - dt * 4.5);
  pstate.wasGrounded = pstate.grounded;
  trail.intensity += (1.8 - trail.intensity) * Math.min(1, dt * 8);
  updateHud();
}

let demoIndex = 0;
const demoRoute = [
  new THREE.Vector3(-4.5, 1.08, 6), new THREE.Vector3(-1.5, 3.18, -6.5), new THREE.Vector3(2, 4.98, -19), new THREE.Vector3(-2, 6.78, -33), new THREE.Vector3(0, 8.58, -50)
];
function updateDemo(dt) {
  const target = demoRoute[demoIndex];
  const direction = target.clone().sub(player.position);
  direction.y = 0;
  if (direction.lengthSq() > 0.04) {
    player.position.addScaledVector(direction.normalize(), dt * 4.2);
    player.position.y += (target.y - player.position.y) * Math.min(1, dt * 2.4);
    player.rotation.y = Math.atan2(direction.x, direction.z);
  } else demoIndex = (demoIndex + 1) % demoRoute.length;
  processInteractions();
}
function updateWorld(dt) {
  for (const item of collectibles) {
    if (item.got) continue;
    item.group.rotation.y += dt * (item.kind === 'shard' ? 1.9 : 1.35);
    item.group.position.y = item.baseY + Math.sin(state.time * 2.4 + item.phase) * 0.18;
  }
  for (const checkpointData of checkpoints) {
    checkpointData.spire.rotation.y += dt * 1.4;
    checkpointData.spire.position.y = 1.15 + Math.sin(state.time * 2.2) * 0.06;
  }
  for (const enemyData of enemies) {
    if (enemyData.dead) continue;
    const phase = state.time * 0.9 + enemyData.phase;
    enemyData.group.position.x = enemyData.originX + Math.sin(phase) * enemyData.path;
    enemyData.group.position.y = enemyData.baseY + Math.sin(phase * 1.7) * 0.18;
    enemyData.group.rotation.y = Math.sin(phase) * 0.6;
  }
  for (const hazardData of hazards) {
    const pulse = 0.65 + Math.sin(state.time * 5 + hazardData.phase) * 0.35;
    hazardData.ring.scale.setScalar(0.86 + pulse * 0.16);
    hazardData.ring.material.emissiveIntensity = 0.75 + pulse;
  }
  for (const gate of doors) {
    if (gate.open) {
      gate.group.position.y += (gate.baseY + 7 - gate.group.position.y) * Math.min(1, dt * 3.2);
      if (gate.group.position.y > gate.baseY + 6.7) gate.group.visible = false;
    }
  }
  for (const goalData of goals) {
    goalData.group.rotation.y += dt * 0.42;
    goalData.ring.rotation.z += dt * 0.34;
  }
  atmosphere.rotation.y += dt * 0.0025;
  for (const cloud of atmosphere.children) if (cloud.userData.speed) cloud.position.x += Math.sin(state.time * cloud.userData.speed) * dt * 0.28;
}
function updateCamera(dt) {
  if (state.mode === 'menu') {
    cameraRig.yaw += dt * 0.055;
    const focus = new THREE.Vector3(0, 3.7, -17);
    const offset = new THREE.Vector3(Math.sin(cameraRig.yaw) * 16, 7.3, Math.cos(cameraRig.yaw) * 16);
    camera.position.lerp(focus.clone().add(offset), 1 - Math.exp(-2 * dt));
    camera.lookAt(focus);
    return;
  }
  if (state.mode === 'studio') return;
  cameraRig.yaw -= mouseDX * 0.0025;
  cameraRig.pitch = clamp(cameraRig.pitch - mouseDY * 0.0017, -0.04, 0.58);
  mouseDX = 0;
  mouseDY = 0;
  const offset = new THREE.Vector3(
    Math.sin(cameraRig.yaw) * cameraRig.distance,
    Math.sin(cameraRig.pitch) * cameraRig.distance * 0.7 + cameraRig.height,
    Math.cos(cameraRig.yaw) * cameraRig.distance
  );
  camera.position.lerp(player.position.clone().add(offset), 1 - Math.exp(-7 * dt));
  camera.lookAt(player.position.clone().add(new THREE.Vector3(0, 1.12, 0)));
}

const editor = { selected: null, selectedMesh: null, tool: 'select', snap: true, snapSize: 1, moveForward: false, moveBack: false, moveLeft: false, moveRight: false, moveUp: false, moveDown: false, fast: false };
let studioOrbit = null, studioTransform = null, studioTransformHelper = null, studioGrid = null, studioOutline = null, studioDomGizmo = null, studioDomDrag = null;
const studioRay = new THREE.Raycaster();
const studioMouse = new THREE.Vector2();
const studioOrbitInput = { active: false, lastX: 0, lastY: 0 };
function studioStatus(text) { ui.studioStatus.textContent = text; }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character])); }
function snap(value) { return editor.snap ? Math.round(value / editor.snapSize) * editor.snapSize : value; }
function markEditorObject(root, object) { root.traverse((node) => { if (node.isMesh || node.isGroup) node.userData.levelObject = object; }); }
function buildEditorIndex() { /* Entities mark their meshes during construction; this preserves selection after every rebuild. */ }
function refreshExplorer() {
  ui.explorer.innerHTML = '';
  level.objects.forEach((object) => {
    const row = document.createElement('button');
    row.className = `explorer-item${editor.selected === object ? ' selected' : ''}`;
    const icon = { platform: '▰', wall: '▤', shard: '◇', key: '◆', checkpoint: '◉', enemy: '●', hazard: '▲', door: '▥', goal: '✦' }[object.type] || '•';
    row.innerHTML = `<span class="explorer-icon">${icon}</span><span class="explorer-name">${escapeHtml(object.label || object.type)}</span><span class="explorer-type">${object.type}</span>`;
    row.onclick = () => selectObject(object, true);
    ui.explorer.appendChild(row);
  });
}
function studioSelectableRoots() {
  return [...platforms.map((item) => item.mesh), ...collectibles.map((item) => item.group), ...checkpoints.map((item) => item.group), ...enemies.map((item) => item.group), ...hazards.map((item) => item.mesh), ...doors.map((item) => item.group), ...goals.map((item) => item.group)];
}
function studioSelectableParts() {
  const parts = [];
  world.traverse((node) => { if (node.userData.levelObject) parts.push(node); });
  return parts;
}
function objectAt(clientX, clientY) {
  const rect = ui.game.getBoundingClientRect();
  studioMouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  studioMouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  studioRay.setFromCamera(studioMouse, camera);
  const hit = studioRay.intersectObjects(studioSelectableParts(), true)[0];
  if (!hit) return null;
  let node = hit.object;
  while (node && node.parent && !node.userData.levelObject) node = node.parent;
  return node?.userData?.levelObject || null;
}
function getRootForObject(object) {
  return studioSelectableRoots().find((root) => root.userData.levelObject === object) || null;
}
function syncSelected(object) {
  editor.selected = object || null;
  if (!object) {
    ui.selNone.classList.remove('hidden');
    ui.selPanel.classList.add('hidden');
    refreshExplorer();
    return;
  }
  ui.selNone.classList.add('hidden');
  ui.selPanel.classList.remove('hidden');
  ui.selType.value = object.type;
  ui.selX.value = object.x;
  ui.selY.value = object.y;
  ui.selZ.value = object.z;
  ui.selW.value = object.w ?? 4;
  ui.selH.value = object.h ?? 1;
  ui.selD.value = object.d ?? 4;
  ui.selLabel.value = object.label || '';
  refreshExplorer();
}
function selectObject(object, focus = false) {
  editor.selected = object || null;
  editor.selectedMesh = null;
  syncSelected(object);
  if (studioTransform) { studioTransform.detach(); studioTransform.visible = false; }
  if (studioTransformHelper) studioTransformHelper.visible = false;
  if (object) {
    const root = getRootForObject(object);
    editor.selectedMesh = root;
    if (root && studioTransform && editor.tool !== 'select') {
      studioTransform.attach(root);
      studioTransform.visible = true;
      if (studioTransformHelper) studioTransformHelper.visible = true;
    }
    if (focus && studioOrbit && root) { studioOrbit.target.copy(root.position); studioOrbit.update(); }
  }
}
function setEditorTool(tool) {
  editor.tool = tool;
  ui.toolSelect.classList.toggle('active', tool === 'select');
  ui.toolMove.classList.toggle('active', tool === 'move');
  ui.toolScale.classList.toggle('active', tool === 'scale');
  if (studioTransform) {
    studioTransform.detach();
    studioTransform.visible = false;
    if (studioTransformHelper) studioTransformHelper.visible = false;
    if (editor.selectedMesh && tool !== 'select') {
      studioTransform.setMode(tool === 'scale' ? 'scale' : 'translate');
      studioTransform.attach(editor.selectedMesh);
      studioTransform.visible = true;
      if (studioTransformHelper) studioTransformHelper.visible = true;
    }
  }
  studioStatus(tool === 'select' ? 'SELECT TOOL • Click an object to select it' : tool === 'move' ? 'MOVE TOOL • Drag the colored arrows to move' : 'SCALE TOOL • Drag the boxes to resize');
}
function setupStudioCamera() {
  ensureDomGizmo();
  studioOrbit?.dispose();
  studioOrbit = new OrbitControls(camera, renderer.domElement);
  studioOrbit.enableDamping = true;
  studioOrbit.dampingFactor = 0.1;
  studioOrbit.screenSpacePanning = true;
  studioOrbit.minDistance = 3;
  studioOrbit.maxDistance = 140;
  studioOrbit.maxPolarAngle = Math.PI - 0.05;
  // Left drag is handled below so selection can use a true click without
  // competing with OrbitControls' pointer handler.
  studioOrbit.mouseButtons.LEFT = null;
  studioOrbit.mouseButtons.RIGHT = THREE.MOUSE.PAN;
  studioOrbit.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
  studioOrbit.target.set(0, 3, -22);
  camera.position.set(0, 19, 30);
  studioOrbit.update();
  if (!studioTransform) {
    studioTransform = new TransformControls(camera, renderer.domElement);
    studioTransform.setSpace('world');
    studioTransform.setSize(1.25);
    // The visible controller is used as a gizmo surface; pointer math below
    // performs the edit directly so OrbitControls cannot steal the drag.
    studioTransform.enabled = false;
    studioTransform.showX = true;
    studioTransform.showY = true;
    studioTransform.showZ = true;
    studioTransform.setTranslationSnap(editor.snapSize);
    studioTransform.setScaleSnap(editor.snapSize / 2);
    studioTransform.addEventListener('dragging-changed', (event) => {
      studioTransform.userData.dragging = event.value;
      studioStatus(event.value ? `${editor.tool === 'scale' ? 'SCALING' : 'MOVING'} • Release mouse to commit` : editor.tool === 'scale' ? 'SCALE TOOL • Drag the colored boxes to resize' : 'MOVE TOOL • Drag the colored arrows to move');
      if (event.value && editor.tool === 'scale' && editor.selected) {
        studioTransform.userData.scaleBase = { w: editor.selected.w ?? 1, h: editor.selected.h ?? 1, d: editor.selected.d ?? 1 };
      }
      if (!event.value && editor.tool === 'scale' && editor.selected && studioTransform.userData.scaleBase) {
        const object = editor.selected;
        const mesh = editor.selectedMesh;
        if (mesh) {
          mesh.scale.set(1, 1, 1);
          buildLevel(level);
          selectObject(object, false);
        }
        studioTransform.userData.scaleBase = null;
      }
      if (studioOrbit) studioOrbit.enabled = !event.value;
    });
    studioTransform.addEventListener('objectChange', () => {
      const object = editor.selected;
      const mesh = editor.selectedMesh;
      if (!object || !mesh) return;
      object.x = snap(mesh.position.x);
      object.y = snap(mesh.position.y);
      object.z = snap(mesh.position.z);
      if (editor.tool === 'scale' && ['platform', 'wall', 'door', 'hazard'].includes(object.type)) {
        const base = studioTransform.userData.scaleBase || { w: object.w, h: object.h, d: object.d };
        object.w = Math.max(0.25, snap(base.w * mesh.scale.x));
        object.h = Math.max(0.25, snap(base.h * mesh.scale.y));
        object.d = Math.max(0.25, snap(base.d * mesh.scale.z));
      }
      mesh.position.set(object.x, object.y, object.z);
      syncSelected(object);
      updateStudioOutline();
    });
    // This CDN build renders TransformControls directly as an Object3D;
    // mounting a separate helper is not available in every release.
    studioTransformHelper = studioTransform;
    scene.add(studioTransform);
  }
  if (!studioGrid) { studioGrid = new THREE.GridHelper(160, 160, 0x4d7b8d, 0x244452); scene.add(studioGrid); }
  setEditorTool(editor.tool);
  updateStudioOutline();
}
function teardownStudioHelpers() {
  if (studioOrbit) { studioOrbit.dispose(); studioOrbit = null; }
  if (studioTransform) { studioTransform.detach(); studioTransform.visible = false; }
  if (studioTransformHelper) { scene.remove(studioTransformHelper); studioTransformHelper = null; }
  if (studioGrid) { scene.remove(studioGrid); studioGrid = null; }
  if (studioOutline) { scene.remove(studioOutline); studioOutline.geometry.dispose(); studioOutline.material.dispose(); studioOutline = null; }
}
function updateStudioOutline() {
  if (state.mode !== 'studio' || !editor.selectedMesh) { if (studioOutline) studioOutline.visible = false; return; }
  if (!studioOutline) { studioOutline = new THREE.BoxHelper(editor.selectedMesh, 0x59efff); scene.add(studioOutline); }
  else { studioOutline.visible = true; studioOutline.setFromObject(editor.selectedMesh); }
  studioOutline.material.color.setHex(editor.tool === 'select' ? 0x59efff : editor.tool === 'scale' ? 0xffc857 : 0x62ff9a);
  studioOutline.material.transparent = true;
  studioOutline.material.opacity = 0.95;
  studioOutline.material.depthTest = false;
  studioOutline.renderOrder = 20;
}
function ensureDomGizmo() {
  if (studioDomGizmo) return;
  studioDomGizmo = document.createElement('div');
  studioDomGizmo.className = 'studio-gizmo-overlay';
  const handles = [['x', 'axis'], ['y', 'axis'], ['z', 'axis'], ['nw', 'scale'], ['ne', 'scale'], ['sw', 'scale'], ['se', 'scale']];
  for (const [name, kind] of handles) {
    const handle = document.createElement('button');
    handle.className = `studio-gizmo-handle studio-gizmo-${kind} ${name}`;
    handle.dataset.axis = name;
    if (kind === 'axis') { handle.innerHTML = '<i class="studio-gizmo-tip"></i>'; }
    handle.addEventListener('pointerdown', (event) => {
      if (state.mode !== 'studio' || !editor.selected || editor.tool === 'select') return;
      event.preventDefault(); event.stopPropagation();
      studioDomDrag = { axis: name, x: event.clientX, y: event.clientY, object: editor.selected, tool: editor.tool };
      handle.setPointerCapture?.(event.pointerId);
      studioStatus(`${editor.tool === 'scale' ? 'SCALING' : 'MOVING'} ${name.toUpperCase()} • Release mouse to commit`);
    });
    handle.addEventListener('mousedown', (event) => {
      if (studioDomDrag || state.mode !== 'studio' || !editor.selected || editor.tool === 'select') return;
      event.preventDefault(); event.stopPropagation();
      studioDomDrag = { axis: name, x: event.clientX, y: event.clientY, object: editor.selected, tool: editor.tool };
      studioStatus(`${editor.tool === 'scale' ? 'SCALING' : 'MOVING'} ${name.toUpperCase()} • Release mouse to commit`);
    });
    studioDomGizmo.append(handle);
  }
  document.querySelector('.studio-main').append(studioDomGizmo);
  window.addEventListener('pointermove', (event) => {
    if (!studioDomDrag) return;
    event.preventDefault();
    const drag = studioDomDrag; const dx = event.clientX - drag.x; const dy = event.clientY - drag.y; const object = drag.object;
    if (drag.tool === 'move') {
      if (drag.axis.includes('x') || drag.axis === 'nw' || drag.axis === 'sw') object.x = snap(object.x + dx * 0.025);
      if (drag.axis.includes('y') || drag.axis === 'nw' || drag.axis === 'ne') object.y = snap(object.y - dy * 0.025);
      if (drag.axis === 'z') object.z = snap(object.z + dx * 0.025);
    } else {
      const factor = clamp(1 + (dx - dy) * 0.004, 0.1, 4);
      const scaleAxis = drag.axis === 'x' || drag.axis === 'nw' || drag.axis === 'sw' ? 'x' : drag.axis === 'y' || drag.axis === 'ne' || drag.axis === 'se' ? 'y' : 'z';
      if (scaleAxis === 'x') object.w = Math.max(0.25, snap((object.w || 1) * factor));
      if (scaleAxis === 'y') object.h = Math.max(0.25, snap((object.h || 1) * factor));
      if (scaleAxis === 'z') object.d = Math.max(0.25, snap((object.d || 1) * factor));
    }
    drag.x = event.clientX; drag.y = event.clientY;
    buildLevel(level); selectObject(object, false);
  }, { capture: true });
  window.addEventListener('pointerup', (event) => {
    if (!studioDomDrag) return;
    event.preventDefault(); studioDomDrag = null;
    studioStatus(editor.tool === 'scale' ? 'SCALE TOOL • Drag the colored boxes to resize' : 'MOVE TOOL • Drag the colored arrows to move');
  }, { capture: true });
  window.addEventListener('mousemove', (event) => {
    if (!studioDomDrag || event.buttons === 0) return;
    const synthetic = { ...event, preventDefault: () => event.preventDefault() };
    const drag = studioDomDrag; const dx = synthetic.clientX - drag.x; const dy = synthetic.clientY - drag.y; const object = drag.object;
    if (drag.tool === 'move') {
      if (drag.axis.includes('x') || drag.axis === 'nw' || drag.axis === 'sw') object.x = snap(object.x + dx * 0.025);
      if (drag.axis.includes('y') || drag.axis === 'nw' || drag.axis === 'ne') object.y = snap(object.y - dy * 0.025);
      if (drag.axis === 'z') object.z = snap(object.z + dx * 0.025);
    } else {
      const factor = clamp(1 + (dx - dy) * 0.004, 0.1, 4);
      const scaleAxis = drag.axis === 'x' || drag.axis === 'nw' || drag.axis === 'sw' ? 'x' : drag.axis === 'y' || drag.axis === 'ne' || drag.axis === 'se' ? 'y' : 'z';
      if (scaleAxis === 'x') object.w = Math.max(0.25, snap((object.w || 1) * factor));
      if (scaleAxis === 'y') object.h = Math.max(0.25, snap((object.h || 1) * factor));
      if (scaleAxis === 'z') object.d = Math.max(0.25, snap((object.d || 1) * factor));
    }
    drag.x = synthetic.clientX; drag.y = synthetic.clientY; buildLevel(level); selectObject(object, false);
  }, { capture: true });
  window.addEventListener('mouseup', () => {
    if (!studioDomDrag) return;
    studioDomDrag = null;
    studioStatus(editor.tool === 'scale' ? 'SCALE TOOL • Drag the colored boxes to resize' : 'MOVE TOOL • Drag the colored arrows to move');
  }, { capture: true });
}
function updateDomGizmo() {
  if (!studioDomGizmo || state.mode !== 'studio' || !editor.selectedMesh || editor.tool === 'select') { if (studioDomGizmo) studioDomGizmo.style.display = 'none'; return; }
  if (studioDomDrag) return;
  studioDomGizmo.style.display = 'block';
  const rect = ui.game.getBoundingClientRect(); const main = document.querySelector('.studio-main').getBoundingClientRect();
  const p = editor.selectedMesh.position.clone().project(camera); const x = rect.left + (p.x + 1) * rect.width / 2 - main.left; const y = rect.top + (1 - p.y) * rect.height / 2 - main.top;
  const set = (selector, left, top, transform = '') => { const node = studioDomGizmo.querySelector(selector); if (node) { node.style.left = `${left}px`; node.style.top = `${top}px`; node.style.transform = transform; } };
  set('.x', x, y - 5); set('.y', x - 5, y, 'rotate(-90deg)'); set('.z', x, y - 5, 'rotate(35deg)');
  set('.nw', x - 86, y - 86); set('.ne', x + 70, y - 86); set('.sw', x - 86, y + 70); set('.se', x + 70, y + 70);
}
function updateStudioCamera(dt) {
  if (state.mode !== 'studio' || !studioOrbit) return;
  const speed = (editor.fast ? 18 : 9) * dt;
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1); else forward.normalize();
  const right = new THREE.Vector3(forward.z, 0, -forward.x);
  if (editor.moveForward) { studioOrbit.target.addScaledVector(forward, speed); camera.position.addScaledVector(forward, speed); }
  if (editor.moveBack) { studioOrbit.target.addScaledVector(forward, -speed); camera.position.addScaledVector(forward, -speed); }
  if (editor.moveRight) { studioOrbit.target.addScaledVector(right, speed); camera.position.addScaledVector(right, speed); }
  if (editor.moveLeft) { studioOrbit.target.addScaledVector(right, -speed); camera.position.addScaledVector(right, -speed); }
  if (editor.moveUp) { studioOrbit.target.y += speed; camera.position.y += speed; }
  if (editor.moveDown) { studioOrbit.target.y -= speed; camera.position.y -= speed; }
}
function addObject(type, x = 0, z = -6) {
  const y = { platform: 0.5, wall: 2, shard: 2.2, key: 2.3, checkpoint: 0.5, enemy: 1, hazard: 0, door: 3, goal: 2.5 }[type] ?? 0.5;
  const defaults = { platform: [6, 1, 6], wall: [6, 4, 0.8], shard: [1, 1, 1], key: [0.25, 0.75, 0.25], checkpoint: [1.35, 0.25, 1.35], enemy: [1, 1, 1], hazard: [2, 0.18, 2], door: [6, 5, 0.8], goal: [4, 4, 1] };
  const [w, h, d] = defaults[type] || defaults.platform;
  const object = { type, x: snap(x), y: snap(y), z: snap(z), w, h, d, label: `${type.toUpperCase()}-${level.objects.length + 1}` };
  level.objects.push(object);
  buildLevel(level);
  selectObject(object, true);
  studioStatus(`${type.toUpperCase()} added • use MOVE (2) to position it`);
}
function selectedChanged() {
  if (!editor.selected) return;
  const index = level.objects.indexOf(editor.selected);
  if (index < 0) return;
  const object = editor.selected;
  object.x = snap(Number(ui.selX.value) || 0);
  object.y = snap(Number(ui.selY.value) || 0);
  object.z = snap(Number(ui.selZ.value) || 0);
  object.w = Math.max(0.1, Number(ui.selW.value) || 1);
  object.h = Math.max(0.1, Number(ui.selH.value) || 1);
  object.d = Math.max(0.1, Number(ui.selD.value) || 1);
  object.label = ui.selLabel.value;
  buildLevel(level);
  selectObject(level.objects[index], true);
}
function duplicateSelected() {
  if (!editor.selected) return;
  const index = level.objects.indexOf(editor.selected);
  if (index < 0) return;
  const copy = { ...editor.selected, x: snap(editor.selected.x + editor.snapSize), z: snap(editor.selected.z + editor.snapSize), label: `${editor.selected.label || editor.selected.type} COPY` };
  level.objects.splice(index + 1, 0, copy);
  buildLevel(level);
  selectObject(copy, true);
  studioStatus('Duplicated object • drag the gizmo to position it');
}
function exportData() {
  level.name = ui.levelName.value.trim() || 'Untitled Level';
  ui.jsonBox.value = JSON.stringify({ version: 2, name: level.name, spawn: level.spawn, objects: level.objects }, null, 2);
  ui.jsonBox.select();
  navigator.clipboard?.writeText(ui.jsonBox.value).then(() => studioStatus('JSON copied. Share it or paste it into LOAD JSON.')).catch(() => studioStatus('JSON selected — press Ctrl+C.'));
}
function downloadData() {
  exportData();
  const blob = new Blob([ui.jsonBox.value], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${level.name.replace(/[^a-z0-9]+/gi, '_') || 'skybound_level'}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 500);
}
function loadData() {
  try {
    const data = JSON.parse(ui.jsonBox.value);
    buildLevel(data);
    ui.levelName.value = level.name;
    selectObject(null);
    studioStatus(`Loaded ${level.name} • ${level.objects.length} objects`);
  } catch (error) { studioStatus(`Invalid JSON: ${error.message}`); }
}
function newLevel() {
  buildLevel({ name: 'New Skybound Level', spawn: { x: 0, y: 1.1, z: 8 }, objects: [{ type: 'platform', x: 0, y: 0, z: 0, w: 18, h: 1, d: 18, label: 'START' }] });
  ui.levelName.value = level.name;
  selectObject(null);
  studioStatus('New level created');
}
function setSpawnHere() {
  const object = editor.selected;
  if (object) level.spawn = { x: snap(object.x), y: 1.1, z: snap(object.z + Math.max(2, (object.d || 4) / 2 + 2)) };
  else if (studioOrbit) level.spawn = { x: snap(studioOrbit.target.x), y: 1.1, z: snap(studioOrbit.target.z + 3) };
  setInitialRespawn();
  studioStatus(`Spawn set to ${level.spawn.x}, ${level.spawn.y}, ${level.spawn.z}`);
}
function enterStudio() {
  document.exitPointerLock?.();
  state.mode = 'studio';
  ui.menu.classList.add('hidden');
  ui.hud.classList.add('hidden');
  ui.pause.classList.add('hidden');
  ui.gameOver.classList.add('hidden');
  ui.victory.classList.add('hidden');
  ui.studio.classList.remove('hidden');
  ui.studio.style.display = 'flex';
  buildLevel(level);
  ui.levelName.value = level.name;
  setupStudioCamera();
  selectObject(null);
  studioStatus('DEV STUDIO READY • 1 Select • 2 Move • 3 Scale • Ctrl+D Duplicate');
}
function exitStudio() {
  document.exitPointerLock?.();
  teardownStudioHelpers();
  setMode('menu');
  ui.studio.style.display = 'none';
}

addEventListener('keydown', (event) => {
  keysDown[event.code] = true;
  if (event.code === 'Space' || event.code === 'Numpad0') jumpQueued = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  if (event.code === 'Escape' && (state.mode === 'playing' || state.mode === 'paused')) togglePause();
  if (event.code === 'KeyR' && (state.mode === 'playing' || state.mode === 'paused')) restartGame();
});
addEventListener('keyup', (event) => { keysDown[event.code] = false; });
addEventListener('mousemove', (event) => { if (pointerLocked && state.mode === 'playing') { mouseDX += event.movementX; mouseDY += event.movementY; } });
ui.game.addEventListener('click', () => { if (state.mode === 'playing' && !pointerLocked && !demoMode) ui.game.requestPointerLock?.(); });
document.addEventListener('pointerlockchange', () => { pointerLocked = document.pointerLockElement === ui.game; });

ui.play.onclick = startGame;
ui.dev.onclick = (event) => { event.preventDefault(); enterStudio(); };
ui.howBtn.onclick = () => ui.how.classList.toggle('hidden');
ui.closeHow.onclick = () => ui.how.classList.add('hidden');
ui.resume.onclick = () => setMode('playing');
ui.restartPause.onclick = restartGame;
ui.homePause.onclick = goHome;
ui.retry.onclick = continueFromCheckpoint;
ui.homeGameOver.onclick = goHome;
ui.victoryRetry.onclick = restartGame;
ui.victoryHome.onclick = goHome;
ui.studioBack.onclick = exitStudio;
ui.studioPlay.onclick = () => { teardownStudioHelpers(); startGame(); };
ui.newLevel.onclick = newLevel;
ui.exportJson.onclick = exportData;
ui.downloadJson.onclick = downloadData;
ui.loadJson.onclick = loadData;
ui.deleteSelected.onclick = () => {
  if (!editor.selected) return;
  const index = level.objects.indexOf(editor.selected);
  if (index >= 0) { level.objects.splice(index, 1); buildLevel(level); selectObject(null); studioStatus('Object deleted'); }
};
for (const field of ['selX', 'selY', 'selZ', 'selW', 'selH', 'selD', 'selLabel']) ui[field].onchange = selectedChanged;
for (const button of document.querySelectorAll('[data-add]')) button.onclick = () => { const target = studioOrbit?.target || new THREE.Vector3(0, 0, -6); addObject(button.dataset.add, target.x, target.z); };
ui.studioResetCam.onclick = setupStudioCamera;
ui.studioTestSpawn.onclick = setSpawnHere;
ui.toolSelect.onclick = () => setEditorTool('select');
ui.toolMove.onclick = () => setEditorTool('move');
ui.toolScale.onclick = () => setEditorTool('scale');
ui.duplicateSelected.onclick = duplicateSelected;
ui.focusSelected.onclick = () => { if (editor.selectedMesh && studioOrbit) { studioOrbit.target.copy(editor.selectedMesh.position); studioOrbit.update(); } };
ui.snapToggle.onchange = () => {
  editor.snap = ui.snapToggle.checked;
  studioTransform?.setTranslationSnap(editor.snap ? editor.snapSize : null);
  studioTransform?.setScaleSnap(editor.snap ? editor.snapSize / 2 : null);
  studioStatus(editor.snap ? `Snap ON • ${editor.snapSize} stud grid` : 'Snap OFF');
};
ui.snapSize.onchange = () => {
  editor.snapSize = Math.max(0.25, Number(ui.snapSize.value) || 1);
  ui.snapSize.value = editor.snapSize;
  studioTransform?.setTranslationSnap(editor.snap ? editor.snapSize : null);
  studioTransform?.setScaleSnap(editor.snap ? editor.snapSize / 2 : null);
};
let studioPointer = null;
let studioGizmoDrag = null;
const studioGizmoRay = new THREE.Raycaster();
const studioGizmoMouse = new THREE.Vector2();
function gizmoAxisAt(clientX, clientY) {
  if (!editor.selectedMesh || editor.tool === 'select') return null;
  // Move/Scale tools are transform-first. Any left drag in these modes is a
  // valid edit gesture; this guarantees the visible arrows never dead-end if
  // browser canvas coordinates differ from the rendered gizmo coordinates.
  if (editor.tool === 'move') return 'X';
  if (editor.tool === 'scale') return 'XYZ';
  const rect = ui.game.getBoundingClientRect();
  studioGizmoMouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  studioGizmoMouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  // Do not depend on the controller's private picker meshes; they differ
  // between Three.js CDN builds and were the reason the arrows appeared dead.
  // Some Three.js revisions do not expose the controller's internal picker
  // meshes to Raycaster. Keep the visible arrows clickable with screen-space
  // fallback zones around their projected endpoints.
  const center = editor.selectedMesh.position.clone().project(camera);
  const sx = rect.left + (center.x + 1) * rect.width / 2;
  const sy = rect.top + (1 - center.y) * rect.height / 2;
  const handles = [
    ['X', sx + 105, sy], ['Y', sx, sy - 105], ['Z', sx, sy + 105],
    ['XY', sx + 55, sy - 55], ['YZ', sx - 55, sy + 55], ['XZ', sx + 55, sy + 55]
  ];
  const nearest = handles.map(([name, x, y]) => ({ name, distance: Math.hypot(clientX - x, clientY - y) })).sort((a, b) => a.distance - b.distance)[0];
  // Use a forgiving zone because the rendered gizmo can be visually scaled
  // by the browser while the canvas keeps its internal pixel dimensions.
  if (nearest?.distance <= 140) return nearest.name;
  // Move/Scale modes are intentionally transform-first: if a user misses a
  // thin arrow by a few pixels, still start an axis drag from the gizmo area
  // rather than silently falling back to camera movement.
  const offsetX = clientX - sx;
  const offsetY = clientY - sy;
  if (Math.hypot(offsetX, offsetY) <= 300) return Math.abs(offsetX) >= Math.abs(offsetY) ? 'X' : 'Y';
  return null;
}
function beginGizmoDrag(event) {
  const axis = gizmoAxisAt(event.clientX, event.clientY);
  if (!axis || !editor.selected) return false;
  studioGizmoDrag = { axis, x: event.clientX, y: event.clientY, object: editor.selected, mesh: editor.selectedMesh };
  studioTransform.userData.dragging = true;
  studioStatus(editor.tool === 'scale' ? `SCALING ${axis} • Release mouse to commit` : `MOVING ${axis} • Release mouse to commit`);
  studioOrbit.enabled = false;
  event.stopImmediatePropagation();
  ui.game.setPointerCapture?.(event.pointerId);
  return true;
}
function updateGizmoDrag(event) {
  if (!studioGizmoDrag) return;
  const drag = studioGizmoDrag;
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  const amount = (dx - dy) * 0.018;
  const object = drag.object;
  if (editor.tool === 'move') {
    if (drag.axis.includes('X')) object.x = snap(object.x + dx * 0.025);
    if (drag.axis.includes('Y')) object.y = snap(object.y - dy * 0.025);
    if (drag.axis.includes('Z')) object.z = snap(object.z + dx * 0.025);
  } else {
    const factor = clamp(1 + amount * 0.08, 0.1, 4);
    if (drag.axis.includes('X')) object.w = Math.max(0.25, snap(object.w * factor));
    if (drag.axis.includes('Y')) object.h = Math.max(0.25, snap(object.h * factor));
    if (drag.axis.includes('Z')) object.d = Math.max(0.25, snap(object.d * factor));
  }
  drag.x = event.clientX;
  drag.y = event.clientY;
  buildLevel(level);
  selectObject(object, false);
}
function endGizmoDrag(event) {
  if (!studioGizmoDrag) return;
  studioGizmoDrag = null;
  studioTransform.userData.dragging = false;
  studioOrbit.enabled = true;
  ui.game.releasePointerCapture?.(event.pointerId);
  studioStatus(editor.tool === 'scale' ? 'SCALE TOOL • Drag the colored boxes to resize' : 'MOVE TOOL • Drag the colored arrows to move');
}
ui.game.addEventListener('pointerdown', (event) => {
  if (state.mode !== 'studio' || ![0, 2].includes(event.button)) return;
  // Roblox-style camera control: right-drag always orbits, regardless of
  // the active editing tool. Left-drag is reserved for selection/transforms.
  if (event.button === 2) {
    event.preventDefault();
    studioPointer = { x: event.clientX, y: event.clientY, moved: false, camera: true };
    studioOrbitInput.active = true;
    studioOrbitInput.lastX = event.clientX;
    studioOrbitInput.lastY = event.clientY;
    ui.game.setPointerCapture?.(event.pointerId);
    return;
  }
  if (beginGizmoDrag(event)) return;
  const hit = objectAt(event.clientX, event.clientY);
  // Select immediately so a visible object is never lost to a competing
  // camera/transform pointer handler. The same gesture may still orbit.
  if (hit) selectObject(hit, false);
  studioPointer = { x: event.clientX, y: event.clientY, moved: false };
  studioOrbitInput.active = true;
  studioOrbitInput.lastX = event.clientX;
  studioOrbitInput.lastY = event.clientY;
  ui.game.setPointerCapture?.(event.pointerId);
}, true);
ui.game.addEventListener('pointermove', (event) => {
  if (state.mode !== 'studio') return;
  if (studioGizmoDrag) { updateGizmoDrag(event); return; }
  if (!studioPointer) return;
  if (studioTransform?.userData.dragging) return;
  if (studioOrbitInput.active) {
    const dx = event.clientX - studioOrbitInput.lastX;
    const dy = event.clientY - studioOrbitInput.lastY;
    if (Math.abs(dx) + Math.abs(dy) > 0) {
      studioOrbit.rotateLeft(dx * 0.008);
      studioOrbit.rotateUp(dy * 0.008);
      studioOrbit.update();
      studioOrbitInput.lastX = event.clientX;
      studioOrbitInput.lastY = event.clientY;
    }
  }
  if (Math.hypot(event.clientX - studioPointer.x, event.clientY - studioPointer.y) > 5) studioPointer.moved = true;
}, true);
ui.game.addEventListener('pointerup', (event) => {
  if (state.mode !== 'studio' || ![0, 2].includes(event.button)) return;
  if (studioGizmoDrag) { endGizmoDrag(event); return; }
  if (!studioPointer) return;
  const click = !studioPointer.moved;
  const cameraDrag = studioPointer.camera;
  studioPointer = null;
  studioOrbitInput.active = false;
  ui.game.releasePointerCapture?.(event.pointerId);
  if (cameraDrag || !click || editor.tool !== 'select') return;
  const hit = objectAt(event.clientX, event.clientY);
  if (hit) selectObject(hit, true);
}, true);
ui.game.addEventListener('pointercancel', (event) => { if (studioGizmoDrag) endGizmoDrag(event); studioPointer = null; studioOrbitInput.active = false; });
ui.game.addEventListener('contextmenu', (event) => { if (state.mode === 'studio') event.preventDefault(); });
window.addEventListener('keydown', (event) => {
  if (state.mode !== 'studio' || ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  if (editor.selected && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyZ', 'KeyX'].includes(event.code)) {
    event.preventDefault();
    const amount = event.shiftKey ? 0.25 : 1;
    if (editor.tool === 'scale') {
      const factor = event.code === 'ArrowLeft' || event.code === 'ArrowDown' || event.code === 'KeyX' ? 1 - amount * 0.05 : 1 + amount * 0.05;
      if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') editor.selected.w = Math.max(0.25, snap(editor.selected.w * factor));
      else if (event.code === 'ArrowUp' || event.code === 'ArrowDown') editor.selected.h = Math.max(0.25, snap(editor.selected.h * factor));
      else editor.selected.d = Math.max(0.25, snap(editor.selected.d * factor));
    } else if (editor.tool === 'move') {
      if (event.code === 'ArrowLeft') editor.selected.x = snap(editor.selected.x - amount);
      if (event.code === 'ArrowRight') editor.selected.x = snap(editor.selected.x + amount);
      if (event.code === 'ArrowUp') editor.selected.y = snap(editor.selected.y + amount);
      if (event.code === 'ArrowDown') editor.selected.y = snap(editor.selected.y - amount);
      if (event.code === 'KeyZ') editor.selected.z = snap(editor.selected.z - amount);
      if (event.code === 'KeyX') editor.selected.z = snap(editor.selected.z + amount);
    }
    buildLevel(level); selectObject(editor.selected, false);
    studioStatus(editor.tool === 'scale' ? 'SCALE TOOL • Arrow keys resize selected part' : 'MOVE TOOL • Arrow keys move selected part');
    return;
  }
  const key = event.key.toLowerCase();
  if ((event.ctrlKey || event.metaKey) && key === 'd') { event.preventDefault(); duplicateSelected(); return; }
  if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); ui.deleteSelected.click(); return; }
  if (key === '1') return setEditorTool('select');
  if (key === '2') return setEditorTool('move');
  if (key === '3') return setEditorTool('scale');
  if (key === 'f') return ui.focusSelected.click();
  if (key === 'w') editor.moveForward = true;
  else if (key === 's') editor.moveBack = true;
  else if (key === 'a') editor.moveLeft = true;
  else if (key === 'd') editor.moveRight = true;
  else if (key === 'q') editor.moveDown = true;
  else if (key === 'e') editor.moveUp = true;
  else if (key === 'shift') editor.fast = true;
});
window.addEventListener('keyup', (event) => {
  if (state.mode !== 'studio') return;
  const key = event.key.toLowerCase();
  if (key === 'w') editor.moveForward = false;
  else if (key === 's') editor.moveBack = false;
  else if (key === 'a') editor.moveLeft = false;
  else if (key === 'd') editor.moveRight = false;
  else if (key === 'q') editor.moveDown = false;
  else if (key === 'e') editor.moveUp = false;
  else if (key === 'shift') editor.fast = false;
});

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', resize);

buildLevel(defaultLevel());
let last = performance.now();
function animate(now) {
  const dt = Math.min(0.033, (now - last) / 1000 || 0.016);
  last = now;
  state.time += dt;
  if (state.mode === 'playing') state.runTime += dt;
  updateWorld(dt);
  updateEffects(dt);
  if (state.mode === 'playing') {
    if (demoMode) updateDemo(dt);
    else updatePlayer(dt);
  }
  if (state.mode === 'studio') {
    updateStudioCamera(dt);
    studioOrbit?.update();
    updateStudioOutline();
    updateDomGizmo();
  } else updateCamera(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
(async () => {
  for (let progress = 0; progress <= 100; progress += 20) {
    await new Promise((resolve) => setTimeout(resolve, 55));
    ui.loadingBar.style.width = `${progress}%`;
    ui.loadingText.textContent = ['SCANNING THE HORIZON...', 'FORMING SKY ISLANDS...', 'TUNING THE AETHER...', 'ARMING RECOVERY BEACONS...', 'READY'][progress / 20];
  }
  await new Promise((resolve) => setTimeout(resolve, 180));
  ui.loading.classList.add('done');
  setMode('menu');
  if (demoMode) startGame();
  requestAnimationFrame(animate);
})();
