import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.162.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.162.0/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'https://cdn.jsdelivr.net/npm/three@0.162.0/examples/jsm/controls/TransformControls.js';
import firstCampaignLevel from './level-1.json' with { type: 'json' };

const $ = (id) => document.getElementById(id);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const formatRunTime = (seconds) => {
  const tenths = Math.floor(Math.max(0, seconds) * 10);
  return `${String(Math.floor(tenths / 600)).padStart(2, '0')}:${String(Math.floor(tenths / 10) % 60).padStart(2, '0')}.${tenths % 10}`;
};
const wrapRotation = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));
const ui = {
  menu: $('menu'), levelSelect: $('levelSelect'), levelGrid: $('levelGrid'), campaignTab: $('campaignTab'), myLevelsTab: $('myLevelsTab'), closeLevels: $('closeLevels'), hud: $('hud'), pause: $('pauseScreen'), gameOver: $('gameOverScreen'), victory: $('victoryScreen'), how: $('howPanel'), loading: $('loading'), loadingBar: $('loadingBar'), loadingText: $('loadingText'), studio: $('studio'), game: $('game'), flash: $('flash'),
  play: $('playBtn'), levels: $('levelsBtn'), dev: $('devBtn'), howBtn: $('howBtn'), closeHow: $('closeHow'), resume: $('resumeBtn'), restartPause: $('restartPauseBtn'), pauseLevels: $('pauseLevelsBtn'), pauseStudio: $('pauseStudioBtn'), homePause: $('homePauseBtn'), retry: $('retryBtn'), gameOverLevels: $('gameOverLevelsBtn'), gameOverStudio: $('gameOverStudioBtn'), homeGameOver: $('homeGameOverBtn'), nextLevel: $('nextLevelBtn'), victoryRetry: $('victoryRetryBtn'), victoryLevels: $('victoryLevelsBtn'), victoryStudio: $('victoryStudioBtn'), victoryHome: $('victoryHomeBtn'),
  shards: $('shardsHud'), keys: $('keysHud'), timer: $('timerHud'), bestTime: $('bestTimeHud'), score: $('scoreHud'), best: $('bestHud'), bestMenu: $('bestScoreMenu'), levelTitle: $('levelTitleHud'), healthBar: $('healthBar'), healthText: $('healthText'), dashBar: $('dashBar'), dashText: $('dashText'), checkpoint: $('checkpointHud'), objective: $('objectiveHud'), toast: $('messageToast'),
  goScore: $('gameOverScore'), goShards: $('gameOverShards'), goTime: $('gameOverTime'), goBestTime: $('gameOverBestTime'), goTitle: $('gameOverTitle'), goText: $('gameOverText'), vScore: $('victoryScore'), vShards: $('victoryShards'), vTime: $('victoryTime'), vBestTime: $('victoryBestTime'), vText: $('victoryText'),
  explorer: $('explorer'), toolSelect: $('toolSelect'), toolMove: $('toolMove'), toolScale: $('toolScale'), toolRotate: $('toolRotate'), snapToggle: $('snapToggle'), snapSize: $('snapSize'), duplicateSelected: $('duplicateSelected'), focusSelected: $('focusSelected'),
  levelName: $('levelName'), selNone: $('selectedNone'), selPanel: $('selectedPanel'), selType: $('selType'), selX: $('selX'), selY: $('selY'), selZ: $('selZ'), selW: $('selW'), selH: $('selH'), selD: $('selD'), selRotation: $('selRotation'), selShape: $('selShape'), dimensionFields: $('dimensionFields'), dimensionHint: $('dimensionHint'), selLabel: $('selLabel'), deleteSelected: $('deleteSelected'),
  newLevel: $('newLevel'), saveMyLevel: $('saveMyLevel'), exportJson: $('exportJson'), downloadJson: $('downloadJson'), jsonBox: $('jsonBox'), loadJson: $('loadJson'), studioStatus: $('studioStatus'), studioPlay: $('studioPlay'), studioBack: $('studioBack'), studioResetCam: $('studioResetCam'), studioTestSpawn: $('studioTestSpawn')
};

const demoMode = new URLSearchParams(location.search).has('demo');
const state = {
  mode: 'menu', score: 0, shards: 0, keys: 0, health: 100,
  best: Number(localStorage.getItem('skybound_best') || 0), checkpoint: 'START', time: 0, runTime: 0
};
const bestTimeStorageKey = 'skybound_best_times';
const bestTimes = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem(bestTimeStorageKey) || '{}');
    return saved && typeof saved === 'object' && !Array.isArray(saved)
      ? Object.fromEntries(Object.entries(saved).filter(([, value]) => Number.isFinite(value) && value >= 0))
      : {};
  } catch { return {}; }
})();
let selectedCampaignIndex = 0;
let activeCampaignIndex = 0;
let activeLevelKind = 'campaign';
let playtestActive = false;
let levelMenuTab = 'campaign';
let maxUnlockedCampaign = Math.max(0, Number(localStorage.getItem('skybound_unlocked_level') || 0));
const completedCampaignIds = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem('skybound_completed_levels') || '[]');
    return new Set(Array.isArray(saved) ? saved.filter((id) => typeof id === 'string') : []);
  } catch { return new Set(); }
})();
ui.best.textContent = state.best;
ui.bestMenu.textContent = state.best;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x75cbed);
scene.fog = new THREE.FogExp2(0x73c1db, 0.0065);
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
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -65;
sun.shadow.camera.right = 65;
sun.shadow.camera.top = 65;
sun.shadow.camera.bottom = -65;
sun.shadow.bias = -0.00028;
sun.shadow.normalBias = 0.024;
sun.shadow.radius = 4;
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
  cloud: new THREE.MeshBasicMaterial({ color: 0xe6fbff, transparent: true, opacity: 0.3, depthWrite: false }),
  turf: new THREE.MeshStandardMaterial({ color: 0x74bd7a, emissive: 0x123019, emissiveIntensity: 0.18, roughness: 0.92 }),
  paleStone: new THREE.MeshStandardMaterial({ color: 0xb6d1cc, roughness: 0.9 }),
  darkStone: new THREE.MeshStandardMaterial({ color: 0x35445e, roughness: 0.86, metalness: 0.12 }),
  bronze: new THREE.MeshStandardMaterial({ color: 0x9d7042, roughness: 0.42, metalness: 0.56 })
};
const sharedMaterials = new Set(Object.values(MAT));
const GEO = {
  box: (x, y, z) => new THREE.BoxGeometry(x, y, z), sphere: (r, w = 18, h = 12) => new THREE.SphereGeometry(r, w, h),
  cylinder: (top, bottom, height, sides = 16) => new THREE.CylinderGeometry(top, bottom, height, sides),
  torus: (major, tube, radial = 12, tubular = 32) => new THREE.TorusGeometry(major, tube, radial, tubular),
  octahedron: (radius) => new THREE.OctahedronGeometry(radius, 0)
};

const platforms = [], hazards = [], collectibles = [], checkpoints = [], enemies = [], doors = [], structures = [];
let goals = [];
let level = { name: 'Skybound: First Light', spawn: { x: 0, y: 1.1, z: 8 }, objects: [] };

function makeCampaignWorld(name, theme, route, architecture) {
  const objects = [];
  route.forEach((step, index) => {
    const last = index === route.length - 1;
    objects.push({ type: 'platform', x: step.x, y: step.y, z: step.z, w: step.w, h: 1, d: step.d, shape: step.shape, rotation: step.rotation || 0, label: step.label });
    if (step.shard ?? (index % 2 === 1 || last)) objects.push({ type: 'shard', x: step.x + (index % 2 ? 2 : -2), y: step.y + 0.82, z: step.z, label: `${theme.toUpperCase()} SHARD ${index + 1}` });
    if (step.key) objects.push({ type: 'key', x: step.x - 1.15, y: step.y + 0.82, z: step.z, label: `KEY-${step.key}` });
    if (step.checkpoint) objects.push({ type: 'checkpoint', x: step.x, y: step.y + 0.5, z: step.z + 1, label: step.checkpoint });
    if (step.hazard) objects.push({ type: 'hazard', x: step.x + (step.hazardSide || 2.1), y: step.y + 0.465, z: step.z - 0.4, w: step.hazardW || 2.4, h: 0.18, d: step.hazardD || 2, label: step.hazard });
    if (step.enemy) objects.push({ type: 'enemy', x: step.x, y: step.y + 1, z: step.z - 1.8, label: step.enemy });
    if (step.gateAfter && route[index + 1]) {
      const next = route[index + 1];
      const dx = next.x - step.x, dz = next.z - step.z;
      objects.push({ type: 'door', x: (step.x + next.x) / 2, y: (step.y + next.y) / 2 + 2.9, z: (step.z + next.z) / 2, w: 7.4, h: 5.8, d: 0.8, rotation: Math.atan2(dx, dz), label: `GATE-${step.gateAfter}` });
    }
  });
  architecture.forEach((site) => {
    const base = route[site.node];
    objects.push({ type: 'structure', x: base.x + (site.dx || 0), y: base.y + 0.5, z: base.z + (site.dz || 0), w: site.w || 6, h: site.h || 6, d: site.d || 5, rotation: site.rotation || 0, variant: site.variant, theme, label: site.label });
  });
  const summit = route[route.length - 1];
  objects.push({ type: 'goal', x: summit.x, y: summit.y + 1.9, z: summit.z, label: `${theme.toUpperCase()} PORTAL` });
  return { name, theme, spawn: { x: route[0].x, y: route[0].y + 1.1, z: route[0].z }, objects };
}

function defaultLevel() {
  return JSON.parse(JSON.stringify(firstCampaignLevel));
}

function campaignLevels() {
  const n = (x, y, z, w, d, shape, label, more = {}) => ({ x, y, z, w, d, shape, label, ...more });
  const cloudbreak = makeCampaignWorld('Skybound: Cloudbreak Run', 'windworks', [
    n(0, 0, 14, 20, 18, 'octagon', 'WINDWARD AIRDOCK'),
    n(-5, 1.8, 5, 10, 8, 'hex', 'LOWER TURBINE'),
    n(-13, 3.6, 9, 8, 7, 'diamond', 'WINDMILL KEYHOUSE', { key: 1, gateAfter: 1, shard: true }),
    n(-19, 5.4, 1, 9, 8, 'round', 'CROSSWIND GANTRY', { hazard: 'CROSSWIND SURGE', enemy: 'DOCK SENTINEL' }),
    n(-12, 7.2, -8, 11, 9, 'cross', 'AERIE CAMP', { checkpoint: 'AERIE BEACON', shard: true }),
    n(-2, 9, -5, 9, 7, 'bridge', 'SKYRAIL TRANSFER'),
    n(7, 10.8, 2, 8, 8, 'hex', 'UPPER TURBINE', { key: 2, gateAfter: 2, shard: true }),
    n(16, 12.6, -5, 8, 8, 'diamond', 'WINDLASS', { hazard: 'WINDLASS ARC', hazardSide: -1 }),
    n(11, 14.4, -15, 11, 9, 'round', 'CLOUD BREAK STATION', { checkpoint: 'CLOUD BREAK BEACON', enemy: 'CLOUD STALKER', shard: true }),
    n(1, 16.2, -22, 20, 17, 'octagon', 'SUNRISE OBSERVATORY', { shard: true })
  ], [
    { node: 0, variant: 'dock', dx: -5, dz: -2, w: 7, h: 4, d: 6, label: 'WINDWARD PORT' },
    { node: 2, variant: 'windmill', dx: -2.3, dz: 1.6, w: 4, h: 8, d: 4, label: 'LOWER WINDMILL' },
    { node: 3, variant: 'arch', dx: 1.2, dz: -2.4, w: 6, h: 5.5, d: 2.2, label: 'CROSSWIND ARCH' },
    { node: 4, variant: 'ruin', dx: 3.5, dz: 1.5, w: 5, h: 5, d: 4, label: 'AERIE OUTPOST' },
    { node: 6, variant: 'windmill', dx: 2.7, dz: -1.5, w: 4.5, h: 8.5, d: 4.5, label: 'UPPER WINDMILL' },
    { node: 8, variant: 'observatory', dx: -3.5, dz: 1, w: 7, h: 7, d: 7, label: 'CLOUD BREAK OBSERVATORY' },
    { node: 9, variant: 'citadel', dx: 4.6, dz: -1, w: 10, h: 8, d: 9, label: 'SUNRISE STATION' }
  ]);
  const storm = makeCampaignWorld('Skybound: Storm Crown', 'storm', [
    n(0, 0, 14, 18, 16, 'octagon', 'THUNDER DOCK'),
    n(7, 2, 6, 8, 8, 'hex', 'EAST LIGHTNING PIER'),
    n(14, 4, -1, 7.5, 7.5, 'diamond', 'STATIC KEY SPIRE', { key: 1, gateAfter: 1, shard: true }),
    n(11, 6, -11, 7.5, 7, 'round', 'STORM CUT', { hazard: 'LIGHTNING STRIKE', enemy: 'STORM WARDEN' }),
    n(3, 8, -18, 8.5, 8, 'cross', 'RAINWATCH', { checkpoint: 'RAINWATCH BEACON', shard: true }),
    n(-6, 10, -12, 7.5, 7.5, 'diamond', 'WESTERN BRIDGEHEAD'),
    n(-14, 12, -19, 7.5, 8, 'hex', 'EYE OF THE KEY', { key: 2, gateAfter: 2, shard: true }),
    n(-10, 14, -29, 7, 7, 'round', 'THUNDER ROOF', { hazard: 'THUNDER ROOF SURGE', enemy: 'CLOUD STALKER', hazardSide: -1 }),
    n(-1, 16, -35, 9, 8, 'cross', 'STORM EYE BEACON', { checkpoint: 'STORM EYE', shard: true }),
    n(9, 18, -28, 7.5, 7.5, 'diamond', 'EAST CROWN'),
    n(14, 20, -18, 7.5, 8, 'hex', 'UPPER LIGHTNING PIER', { hazard: 'ARC FIELD', hazardSide: -1 }),
    n(5, 22, -12, 9, 8, 'bridge', 'CROWN CAUSEWAY', { enemy: 'CROWN SENTINEL', shard: true }),
    n(-3, 24, -20, 19, 16, 'octagon', 'STORM CROWN', { shard: true })
  ], [
    { node: 0, variant: 'dock', dx: -5, dz: 2, w: 7, h: 4, d: 6, label: 'THUNDER MOORING' },
    { node: 2, variant: 'spire', dx: 2.1, dz: 1, w: 4, h: 10, d: 4, label: 'STATIC SPIRE' },
    { node: 4, variant: 'tower', dx: -2.8, dz: 2.4, w: 4.5, h: 8, d: 4.5, label: 'RAINWATCH TOWER' },
    { node: 6, variant: 'observatory', dx: -2, dz: -1.5, w: 6, h: 7, d: 6, label: 'KEY OBSERVATORY' },
    { node: 8, variant: 'temple', dx: 3.4, dz: -1.6, w: 7, h: 7, d: 6, label: 'STORM EYE SANCTUM' },
    { node: 10, variant: 'spire', dx: -2, dz: 1.4, w: 3.6, h: 9, d: 3.6, label: 'LIGHTNING ROD' },
    { node: 12, variant: 'citadel', dx: -4, dz: 2.2, w: 11, h: 10, d: 9, label: 'CROWN FORTRESS' }
  ]);
  const eclipse = makeCampaignWorld('Skybound: Eclipse Spires', 'eclipse', [
    n(0, 0, 14, 18, 16, 'octagon', 'MOON GATE LANDING'),
    n(-7, 2.2, 5, 8.5, 8, 'crescent', 'OUTER CRESCENT'),
    n(-15, 4.4, 1, 7.5, 7.5, 'hex', 'DUSK KEY SHRINE', { key: 1, gateAfter: 1, shard: true }),
    n(-11, 6.6, -8, 7.5, 7, 'diamond', 'SHADOW WALK', { hazard: 'ECLIPSE FIELD' }),
    n(-1, 8.8, -14, 9, 8, 'bridge', 'BROKEN MOON BRIDGE', { checkpoint: 'MOON BRIDGE', shard: true }),
    n(8, 11, -9, 7.5, 7.5, 'round', 'DARKSIDE TERRACE', { enemy: 'UMBRA SENTINEL' }),
    n(15, 13.2, 0, 7.5, 7.5, 'hex', 'NIGHT KEY TOWER', { key: 2, gateAfter: 2, shard: true }),
    n(10, 15.4, 9, 7, 7, 'diamond', 'EASTERN CRESCENT', { enemy: 'ECLIPSE STALKER' }),
    n(1, 17.6, 13, 9, 8, 'cross', 'HALF-MOON COURT', { checkpoint: 'HALF-MOON BEACON', shard: true }),
    n(-8, 19.8, 8, 7.5, 7, 'crescent', 'WESTERN RIM'),
    n(-15, 22, -1, 7.5, 7.5, 'hex', 'UMBRA GARDEN', { hazard: 'UMBRA SURGE' }),
    n(-8, 24.2, -11, 8, 7, 'diamond', 'LAST SHADOW', { enemy: 'DUSK SENTINEL', shard: true }),
    n(2, 26.4, -18, 19, 16, 'octagon', 'ECLIPSE MONASTERY', { checkpoint: 'ECLIPSE MONASTERY', shard: true })
  ], [
    { node: 0, variant: 'arch', dx: 4, dz: 1, w: 7, h: 6, d: 2.5, label: 'MOON GATE' },
    { node: 2, variant: 'observatory', dx: -2, dz: -1.8, w: 6, h: 7, d: 6, label: 'DUSK SHRINE' },
    { node: 4, variant: 'ruin', dx: 2.8, dz: 1.3, w: 5, h: 6, d: 4, label: 'BROKEN MOON PYLON' },
    { node: 6, variant: 'spire', dx: 2.1, dz: 1.1, w: 4, h: 11, d: 4, label: 'NIGHT KEY TOWER' },
    { node: 8, variant: 'temple', dx: -3, dz: -1.8, w: 7.5, h: 8, d: 6.5, label: 'HALF-MOON SANCTUM' },
    { node: 10, variant: 'dome', dx: -2, dz: 1.6, w: 6, h: 6, d: 6, label: 'UMBRA DOME' },
    { node: 12, variant: 'citadel', dx: 4.5, dz: 0, w: 11, h: 11, d: 10, label: 'ECLIPSE MONASTERY' }
  ]);
  const aetherlight = makeCampaignWorld('Skybound: Aetherlight Keep', 'aetherlight', [
    n(0, 0, 14, 20, 18, 'octagon', 'CELESTIAL GATE'),
    n(7, 2, 5, 8.5, 8, 'hex', 'EASTERN GALLERY'),
    n(15, 4, 3, 7.5, 7.5, 'diamond', 'GOLD KEY SPIRE', { key: 1, gateAfter: 1, shard: true }),
    n(18, 6, -6, 7.5, 7, 'round', 'SUNLINE TERRACE', { hazard: 'SUNLINE BURST' }),
    n(10, 8, -14, 8.5, 8, 'cross', 'FIRST CITADEL', { checkpoint: 'FIRST CITADEL', shard: true }),
    n(0, 10, -10, 9, 7, 'bridge', 'CENTRAL SKYBRIDGE', { enemy: 'GOLDEN SENTINEL' }),
    n(-10, 12, -5, 7.5, 7.5, 'hex', 'WEST KEY CHAMBER', { key: 2, gateAfter: 2, shard: true }),
    n(-18, 14, -12, 7, 7, 'diamond', 'OUTER BUTTRESS', { hazard: 'AETHER SURGE', enemy: 'CITADEL STALKER' }),
    n(-13, 16, -23, 8.5, 8, 'round', 'HIGH BEACON', { checkpoint: 'HIGH CITADEL', shard: true }),
    n(-3, 18, -29, 7.5, 7.5, 'hex', 'NORTH GALLERY'),
    n(8, 20, -23, 7, 7, 'diamond', 'SUN SPIRE', { enemy: 'SUN SENTINEL' }),
    n(16, 22, -30, 7.5, 7.5, 'cross', 'EASTERN CROWN'),
    n(9, 24, -41, 7, 7, 'round', 'LAST BEACON', { checkpoint: 'LAST BEACON', hazard: 'LAST LIGHT SURGE' }),
    n(-2, 26, -47, 8, 8, 'hex', 'NORTH STAR BRIDGE', { shard: true }),
    n(-8, 28, -57, 20, 18, 'octagon', 'AETHERLIGHT CITADEL', { shard: true })
  ], [
    { node: 0, variant: 'dock', dx: -5, dz: 2, w: 7, h: 4, d: 6, label: 'CELESTIAL MOORING' },
    { node: 2, variant: 'spire', dx: 2, dz: 1.4, w: 4, h: 11, d: 4, label: 'GOLD KEY SPIRE' },
    { node: 4, variant: 'citadel', dx: 3, dz: -1.8, w: 8, h: 9, d: 7, label: 'FIRST CITADEL' },
    { node: 6, variant: 'temple', dx: -2, dz: 1.8, w: 7, h: 8, d: 6, label: 'WEST KEY CHAMBER' },
    { node: 8, variant: 'observatory', dx: -2.5, dz: -1.6, w: 6.5, h: 8, d: 6.5, label: 'HIGH BEACON OBSERVATORY' },
    { node: 11, variant: 'spire', dx: -2.2, dz: 1.4, w: 4, h: 12, d: 4, label: 'EASTERN CROWN SPIRE' },
    { node: 14, variant: 'citadel', dx: 4.2, dz: 2, w: 12, h: 12, d: 10, label: 'AETHERLIGHT KEEP' }
  ]);
  return [defaultLevel(), cloudbreak, storm, eclipse, aetherlight];
}

const campaignLevelIds = ['first-light', 'cloudbreak-run', 'storm-crown', 'eclipse-spires', 'aetherlight-summit'];
const campaignSummaries = [
  'Climb celestial galleries, key spires, skybridges, and the North Star summit.',
  'Loop between windmills, skyrail gantries, outposts, and the sunrise observatory.',
  'Zig-zag across storm spires, rainwatch towers, lightning piers, and the crown fortress.',
  'Circle moon-crescent ledges, shadow gardens, and a high eclipse monastery.',
  'A long citadel circuit over galleries, bridges, beacons, and gold-tipped spires.'
];
const campaignCatalog = campaignLevels().map((entry, index) => ({ ...entry, id: campaignLevelIds[index] }));
for (let index = 0; index < campaignCatalog.length; index++) {
  if (completedCampaignIds.has(campaignCatalog[index].id)) maxUnlockedCampaign = Math.max(maxUnlockedCampaign, index + 1);
}
for (let index = 0; index < Math.min(maxUnlockedCampaign, campaignCatalog.length); index++) completedCampaignIds.add(campaignCatalog[index].id);
maxUnlockedCampaign = clamp(maxUnlockedCampaign, 0, campaignCatalog.length - 1);
localStorage.setItem('skybound_completed_levels', JSON.stringify([...completedCampaignIds]));
const cloneLevelData = (data) => JSON.parse(JSON.stringify(data));
let activeLevelData = cloneLevelData(campaignCatalog[0]);
function campaignBestTimeKey(entry) { return `campaign:${entry.id}`; }
function customBestTimeKey(entry) {
  const id = String(entry?.id || '').trim();
  if (id) return `custom:${id}`;
  const serialized = JSON.stringify({ name: entry?.name || '', theme: entry?.theme || '', spawn: entry?.spawn || {}, objects: entry?.objects || [] });
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index++) hash = Math.imul(hash ^ serialized.charCodeAt(index), 16777619);
  return `custom:draft-${(hash >>> 0).toString(16)}`;
}
function activeBestTimeKey() {
  if (activeLevelKind === 'campaign' && campaignCatalog[activeCampaignIndex]) return campaignBestTimeKey(campaignCatalog[activeCampaignIndex]);
  return customBestTimeKey(activeLevelData || level);
}
function bestTimeFor(key) {
  const time = bestTimes[key];
  return Number.isFinite(time) && time >= 0 ? time : null;
}
function formatBestTime(key) {
  const time = bestTimeFor(key);
  return time === null ? '—' : formatRunTime(time);
}
function saveBestTimeForActiveLevel() {
  const key = activeBestTimeKey();
  const previous = bestTimeFor(key);
  if (previous !== null && previous <= state.runTime) return false;
  bestTimes[key] = state.runTime;
  try { localStorage.setItem(bestTimeStorageKey, JSON.stringify(bestTimes)); } catch {}
  return true;
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
  const disposedGeometries = new Set();
  const disposedMaterials = new Set();
  const clearGroup = (group) => {
    for (const child of [...group.children]) {
      child.traverse((node) => {
        if (node.geometry && !disposedGeometries.has(node.geometry)) {
          node.geometry.dispose();
          disposedGeometries.add(node.geometry);
        }
        const materials = Array.isArray(node.material) ? node.material : node.material ? [node.material] : [];
        for (const material of materials) {
          if (!sharedMaterials.has(material) && !disposedMaterials.has(material)) {
            material.dispose();
            disposedMaterials.add(material);
          }
        }
      });
      group.remove(child);
    }
  };
  const permanentGroups = new Set([dynamic, effects, atmosphere]);
  for (const child of [...world.children]) {
    if (child === player || permanentGroups.has(child)) continue;
    child.traverse((node) => {
      if (node.geometry && !disposedGeometries.has(node.geometry)) {
        node.geometry.dispose();
        disposedGeometries.add(node.geometry);
      }
      const materials = Array.isArray(node.material) ? node.material : node.material ? [node.material] : [];
      for (const material of materials) {
        if (!sharedMaterials.has(material) && !disposedMaterials.has(material)) {
          material.dispose();
          disposedMaterials.add(material);
        }
      }
    });
    world.remove(child);
  }
  clearGroup(dynamic);
  clearGroup(effects);
  clearGroup(atmosphere);
  platforms.length = hazards.length = collectibles.length = checkpoints.length = enemies.length = doors.length = structures.length = 0;
  goals = [];
}
function addIslandUnderside(o, root) {
  if (o.type !== 'platform') return;
  const radius = Math.max(2.6, Math.min(o.w, o.d) * 0.38);
  const height = clamp(Math.min(o.w, o.d) * 0.65, 4.5, 10);
  const rock = addMesh(root, GEO.cylinder(radius * 0.55, radius, height, 9), MAT.underside, [0, -height / 2 - 0.35, 0]);
  rock.rotation.y = (o.x + o.z) * 0.17;
  rock.scale.x = Math.max(0.85, o.w / Math.max(o.d, 1));
  rock.scale.z = Math.max(0.85, o.d / Math.max(o.w, 1));
  const glow = addMesh(root, GEO.cylinder(radius * 0.6, radius * 0.75, 0.15, 12), MAT.moss, [0, -0.55, 0]);
  glow.scale.x = Math.max(0.85, o.w / Math.max(o.d, 1));
  glow.scale.z = Math.max(0.85, o.d / Math.max(o.w, 1));
}
function addPlatformDressing(o, root) {
  const seed = Math.abs(Math.round(o.x * 17 + o.z * 13));
  const top = (o.h ?? 1) / 2;
  const footprint = { x: 0, z: 0, w: o.w, d: o.d, shape: o.shape || 'rect', rotation: 0 };
  for (let i = 0; i < 5; i++) {
    const a = ((seed + i * 71) % 360) * Math.PI / 180;
    let x = Math.cos(a) * o.w * 0.34;
    let z = Math.sin(a) * o.d * 0.34;
    if (!footprintTouches(footprint, x, z, 0.08)) { x *= 0.62; z *= 0.62; }
    if (!footprintTouches(footprint, x, z, 0.04)) continue;
    const size = 0.22 + ((seed + i) % 4) * 0.045;
    const rock = addMesh(root, GEO.octahedron(size), MAT.ruin, [x, top + size * 0.65 - 0.025, z]);
    rock.scale.y = 0.65;
    rock.rotation.y = a;
  }
  for (let i = 0; i < 4; i++) {
    const a = ((seed + 31 + i * 97) % 360) * Math.PI / 180;
    const x = Math.cos(a) * o.w * 0.23;
    const z = Math.sin(a) * o.d * 0.23;
    if (!footprintTouches(footprint, x, z, 0.25)) continue;
    const tuft = new THREE.Group();
    tuft.position.set(x, top, z);
    root.add(tuft);
    for (let bladeIndex = 0; bladeIndex < 3; bladeIndex++) {
      const height = 0.22 + ((seed + i + bladeIndex) % 3) * 0.035;
      const blade = addMesh(tuft, GEO.cylinder(0, 0.045, height, 5), MAT.turf, [(bladeIndex - 1) * 0.055, height / 2, 0]);
      blade.rotation.z = (bladeIndex - 1) * 0.22;
      blade.rotation.x = (bladeIndex - 1) * -0.13;
    }
  }
  if (o.label.includes('SUMMIT') || o.label.includes('GATE')) {
    for (const side of [-1, 1]) {
      const beacon = new THREE.Group();
      beacon.position.set(side * Math.min(o.w * 0.32, 4.5), o.h / 2, -o.d * 0.22);
      addMesh(beacon, GEO.cylinder(0.25, 0.36, 1.8, 6), MAT.ruin, [0, 0.9, 0]);
      const crystal = addMesh(beacon, GEO.octahedron(0.26), MAT.cyan, [0, 1.95, 0]);
      crystal.rotation.z = Math.PI / 4;
      root.add(beacon);
    }
  }
}
function platformOutline(shape, w, d) {
  const hx = w / 2, hz = d / 2;
  if (shape === 'diamond') return [[0, -hz], [hx, 0], [0, hz], [-hx, 0]];
  if (shape === 'cross') return [[-hx * .22, -hz], [hx * .22, -hz], [hx * .22, -hz * .22], [hx, -hz * .22], [hx, hz * .22], [hx * .22, hz * .22], [hx * .22, hz], [-hx * .22, hz], [-hx * .22, hz * .22], [-hx, hz * .22], [-hx, -hz * .22], [-hx * .22, -hz * .22]];
  if (shape === 'crescent') return [[-hx * .28, -hz], [hx * .34, -hz * .88], [hx * .82, -hz * .55], [hx, 0], [hx * .82, hz * .55], [hx * .34, hz * .88], [-hx * .28, hz], [-hx * .78, hz * .58], [-hx * .28, hz * .44], [hx * .04, hz * .22], [hx * .18, 0], [hx * .04, -hz * .22], [-hx * .28, -hz * .44], [-hx * .78, -hz * .58]];
  const sides = shape === 'hex' ? 6 : shape === 'octagon' ? 8 : shape === 'round' ? 16 : 4;
  if (sides === 4) return [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]];
  return Array.from({ length: sides }, (_, i) => {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    return [Math.cos(angle) * hx, Math.sin(angle) * hz];
  });
}
function footprintTouches(solid, x, z, padding = 0) {
  const dx = x - solid.x, dz = z - solid.z;
  const angle = solid.rotation || 0, cosine = Math.cos(angle), sine = Math.sin(angle);
  const localX = cosine * dx - sine * dz, localZ = sine * dx + cosine * dz;
  const points = solid.footprint || platformOutline(solid.shape || 'rect', solid.w, solid.d);
  let inside = false, nearest = Infinity;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, az] = points[j], [bx, bz] = points[i];
    if ((az > localZ) !== (bz > localZ) && localX < ((bx - ax) * (localZ - az)) / (bz - az) + ax) inside = !inside;
    const vx = bx - ax, vz = bz - az;
    const ratio = clamp(((localX - ax) * vx + (localZ - az) * vz) / (vx * vx + vz * vz || 1), 0, 1);
    nearest = Math.min(nearest, Math.hypot(localX - (ax + vx * ratio), localZ - (az + vz * ratio)));
  }
  return padding >= 0 ? inside && nearest + 1e-5 >= padding : inside || nearest <= -padding;
}
function platform(o) {
  const h = o.h ?? 1, w = o.w || 4, d = o.d || 4;
  const outline = platformOutline(o.shape || 'rect', w, d);
  const path = new THREE.Shape();
  path.moveTo(outline[0][0], -outline[0][1]);
  for (const [x, z] of outline.slice(1)) path.lineTo(x, -z);
  path.closePath();
  const geometry = new THREE.ExtrudeGeometry(path, { depth: h, bevelEnabled: false, curveSegments: 6 });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -h / 2, 0);
  const root = new THREE.Group();
  root.position.set(o.x, o.y, o.z);
  root.rotation.y = o.rotation || 0;
  const mesh = addMesh(root, geometry, o.type === 'wall' ? MAT.ruin : MAT.rune);
  mesh.castShadow = true;
  if (o.type === 'platform') {
    const rimGeometry = new THREE.BufferGeometry().setFromPoints(outline.map(([x, z]) => new THREE.Vector3(x, h / 2 + 0.025, z)));
    const rim = new THREE.LineLoop(rimGeometry, new THREE.LineBasicMaterial({ color: (o.label || '').includes('CITADEL') || (o.label || '').includes('CROWN') ? 0xffd46e : 0x8af0a7, transparent: true, opacity: 0.8 }));
    root.add(rim);
    const innerRune = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(outline.map(([x, z]) => new THREE.Vector3(x * 0.82, h / 2 + 0.016, z * 0.82))),
      new THREE.LineBasicMaterial({ color: 0x64e5ed, transparent: true, opacity: 0.28 })
    );
    root.add(innerRune);
    addIslandUnderside(o, root);
    addPlatformDressing(o, root);
  }
  root.userData.outlineTarget = mesh;
  world.add(root);
  markEditorObject(root, o);
  platforms.push({ x: o.x, z: o.z, y: o.y + h / 2, w, d, h, shape: o.shape || 'rect', rotation: o.rotation || 0, footprint: outline, mesh: root, label: o.label || '' });
}
function structure(o) {
  const group = new THREE.Group();
  group.position.set(o.x, o.y, o.z);
  group.rotation.y = o.rotation || 0;
  const w = o.w || 6, h = o.h || 6, d = o.d || 5;
  const stone = ['storm', 'eclipse'].includes(o.theme) ? MAT.darkStone : o.theme === 'windworks' ? MAT.paleStone : MAT.ruin;
  const trim = o.theme === 'aetherlight' ? MAT.bronze : MAT.gateGold;
  const beam = (x, y, z, sx, sy, sz, material = stone) => addBox(group, material, [x, y, z], [sx, sy, sz]);
  const pillar = (x, z, height = h * .72, width = Math.max(.42, w * .085)) => {
    beam(x, height / 2, z, width, height, width, stone);
    beam(x, .13, z, width * 1.55, .26, width * 1.55, trim);
    beam(x, height - .12, z, width * 1.22, .22, width * 1.22, trim);
  };
  let rotor = null;
  if (o.variant === 'dock') {
    beam(0, .25, 0, w, .55, d, MAT.darkStone);
    beam(0, .57, 0, w * .9, .12, d * .88, trim);
    for (const x of [-.38, .38]) for (const z of [-.36, .36]) pillar(x * w, z * d, h * .58, .42);
    beam(0, h * .64, -d * .22, w * .62, .28, .3, stone);
    beam(w * .31, h * .78, -d * .22, .28, h * .3, .28, trim);
  } else if (o.variant === 'arch') {
    for (const side of [-1, 1]) pillar(side * w * .36, 0, h * .78, Math.max(.55, w * .12));
    beam(0, h * .84, 0, w * .9, h * .16, d * .72, stone);
    beam(0, h * .95, 0, w, .18, d * .82, trim);
    const sigil = addMesh(group, GEO.octahedron(.42), MAT.cyan, [0, h * .64, d * .12]);
    sigil.rotation.z = Math.PI / 4;
  } else if (o.variant === 'windmill') {
    beam(0, h * .31, 0, w * .38, h * .62, d * .38, stone);
    beam(0, h * .12, 0, w * .72, .24, d * .72, trim);
    rotor = new THREE.Group();
    rotor.position.set(0, h * .74, d * .23);
    addBox(rotor, trim, [0, 0, 0], [w * .85, .16, .22]);
    const blade = addBox(rotor, stone, [0, h * .19, 0], [w * .18, h * .38, .25]);
    blade.rotation.z = -.16;
    const blade2 = addBox(rotor, stone, [0, -h * .19, 0], [w * .18, h * .38, .25]);
    blade2.rotation.z = .16;
    addMesh(rotor, GEO.sphere(.23, 10, 8), MAT.cyan, [0, 0, .18]);
    group.add(rotor);
  } else if (o.variant === 'tower' || o.variant === 'spire') {
    beam(0, h * .08, 0, w * .72, .36, d * .72, trim);
    const shaft = addMesh(group, GEO.cylinder(w * .22, w * .34, h * .73, o.variant === 'spire' ? 8 : 10), stone, [0, h * .48, 0]);
    shaft.castShadow = true;
    addMesh(group, GEO.torus(w * .34, .12, 8, 28), trim, [0, h * .78, 0]);
    const crystal = addMesh(group, GEO.octahedron(w * .16), MAT.cyan, [0, h * .91, 0]);
    crystal.scale.y = 1.8;
  } else if (o.variant === 'observatory' || o.variant === 'dome') {
    beam(0, .32, 0, w, .64, d, stone);
    addMesh(group, GEO.cylinder(w * .48, w * .5, .34, 12), trim, [0, .8, 0]);
    const dome = addMesh(group, new THREE.SphereGeometry(Math.min(w, d) * .42, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), o.variant === 'dome' ? MAT.darkStone : MAT.paleStone, [0, .94, 0]);
    dome.scale.y = h / Math.max(w, d) * 1.25;
    addMesh(group, GEO.torus(Math.min(w, d) * .43, .09, 8, 28), trim, [0, .96, 0]);
    const lens = addMesh(group, GEO.octahedron(.36), MAT.cyan, [0, h * .9, 0]);
    lens.scale.y = 1.6;
  } else if (o.variant === 'temple' || o.variant === 'citadel') {
    beam(0, .28, 0, w, .56, d, stone);
    beam(0, .62, 0, w * .92, .12, d * .9, trim);
    for (const x of [-.36, .36]) for (const z of [-.32, .32]) pillar(x * w, z * d, h * .63, Math.max(.45, w * .075));
    beam(0, h * .68, 0, w * .94, .42, d * .9, stone);
    beam(0, h * .82, 0, w * .8, .16, d * .75, trim);
    if (o.variant === 'citadel') {
      for (const x of [-.36, .36]) for (const z of [-.32, .32]) addMesh(group, GEO.cylinder(.05, .42, h * .32, 6), stone, [x * w, h * .98, z * d]);
    } else {
      const heart = addMesh(group, GEO.octahedron(.62), MAT.cyan, [0, h * .58, 0]);
      heart.scale.y = 1.6;
    }
  } else if (o.variant === 'ruin') {
    for (const [x, z, height] of [[-.38, -.28, .7], [.35, -.26, .92], [-.2, .28, .55], [.4, .32, .76]]) pillar(x * w, z * d, h * height, Math.max(.42, w * .09));
    beam(0, h * .82, -d * .26, w * .82, .24, .34, trim);
  } else {
    beam(0, h * .12, 0, w, h * .24, d, stone);
    for (const side of [-1, 1]) pillar(side * w * .34, 0, h * .76, Math.max(.5, w * .08));
    beam(0, h * .82, 0, w, .34, d, trim);
  }
  world.add(group);
  markEditorObject(group, o);
  structures.push({ group, rotor, phase: Math.random() * Math.PI * 2 });
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
  group.position.set(o.x, o.y, o.z);
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
  enemies.push({ group, originX: o.x, originZ: o.z, baseY: o.y, path: 1.8, phase: Math.random() * Math.PI * 2, dead: false, label: o.label || 'SENTINEL' });
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
  group.rotation.y = o.rotation || 0;
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
  doors.push({ group, slab, requiredKey, label: o.label || 'GATE', baseY: o.y, open: false, w: o.w || 8, h: o.h || 5, d: o.d || 0.8, rotation: o.rotation || 0, footprint: platformOutline('rect', o.w || 8, o.d || 0.8) });
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
  const validTypes = new Set(['platform', 'wall', 'shard', 'key', 'checkpoint', 'enemy', 'hazard', 'door', 'goal', 'structure']);
  const dimensions = {
    platform: [4, 1, 4], wall: [4, 4, 0.8], shard: [1, 1, 1], key: [1, 1, 1],
    checkpoint: [1.35, 0.25, 1.35], enemy: [1, 1, 1], hazard: [2, 0.18, 2], door: [8, 5, 0.8], goal: [4, 4, 1], structure: [6, 6, 5]
  };
  const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  return {
    name: String(safe.name || 'Untitled Level'), theme: String(safe.theme || 'dawn'),
    spawn: { x: finite(safe.spawn?.x, 0), y: finite(safe.spawn?.y, 1.1), z: finite(safe.spawn?.z, 8) },
    objects: safe.objects.filter((object) => object && validTypes.has(String(object.type || 'platform'))).map((object) => {
      const type = String(object.type || 'platform');
      const [defaultW, defaultH, defaultD] = dimensions[type];
      return {
        type, x: finite(object.x, 0), y: finite(object.y, 0), z: finite(object.z, 0),
        w: Math.max(0.1, finite(object.w, defaultW)), h: Math.max(0.1, finite(object.h, defaultH)), d: Math.max(0.1, finite(object.d, defaultD)),
        shape: ['hex', 'octagon', 'round', 'diamond', 'cross', 'crescent', 'bridge'].includes(String(object.shape)) ? String(object.shape) : 'rect',
        rotation: finite(object.rotation, 0), variant: type === 'structure' ? String(object.variant || 'arch') : undefined,
        theme: type === 'structure' ? String(object.theme || safe.theme || 'dawn') : undefined,
        label: String(object.label || '')
      };
    })
  };
}
function buildAtmosphere() {
  const sky = addMesh(atmosphere, GEO.sphere(220, 24, 14), new THREE.MeshBasicMaterial({ color: 0x83d9ef, side: THREE.BackSide }), [0, 25, -28]);
  sky.scale.y = 0.6;
  const cloudMaterial = MAT.cloud.clone();
  for (let i = 0; i < 26; i++) {
    const cloud = new THREE.Group();
    const angle = i * 2.4;
    const radius = 86 + (i % 6) * 13;
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
  const count = 420;
  const points = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    points[i * 3] = (Math.sin(i * 87.1) * 0.5 + 0.5) * 220 - 110;
    points[i * 3 + 1] = 12 + ((i * 29) % 58);
    points[i * 3 + 2] = -170 + ((i * 53) % 230);
  }
  starGeometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
  const dust = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xe2fbff, size: 0.085, transparent: true, opacity: 0.4 }));
  atmosphere.add(dust);
}
function buildLevel(data) {
  const preserveObjects = data === level;
  const existingObjects = preserveObjects ? level.objects.slice() : [];
  clearWorld();
  const normalized = normalizeLevel(data);
  if (preserveObjects) {
    const objects = normalized.objects.map((nextObject, index) => {
      const existing = existingObjects[index];
      if (!existing) return nextObject;
      for (const key of Object.keys(existing)) if (!(key in nextObject)) delete existing[key];
      return Object.assign(existing, nextObject);
    });
    level = { ...normalized, objects };
  } else level = normalized;
  const palettes = {
    dawn: [0x79c9e4, 0x74bfd6, 0xb9efff, 0xfff1c9], windworks: [0x9adcf0, 0x8bcfdd, 0xc8f2ff, 0xfff4da],
    storm: [0x40516a, 0x485d70, 0x9db8d0, 0xb7c6d8], eclipse: [0x39365e, 0x48466d, 0xc2b9f0, 0xd7d0ff],
    aetherlight: [0x5192bd, 0x5796b7, 0xc6efff, 0xffe9b7]
  };
  const palette = palettes[level.theme] || palettes.dawn;
  scene.background.setHex(palette[0]);
  scene.fog.color.setHex(palette[1]);
  scene.fog.density = level.theme === 'eclipse' ? 0.0074 : 0.0062;
  hemi.color.setHex(palette[2]);
  sun.color.setHex(palette[3]);
  buildAtmosphere();
  const skyDome = atmosphere.children.find((child) => child.isMesh);
  if (skyDome) skyDome.material.color.setHex(palette[0]);
  for (const object of level.objects) {
    if (object.type === 'platform' || object.type === 'wall') platform(object);
    else if (object.type === 'shard') shard(object);
    else if (object.type === 'key') key(object);
    else if (object.type === 'checkpoint') checkpoint(object);
    else if (object.type === 'enemy') enemy(object);
    else if (object.type === 'hazard') hazard(object);
    else if (object.type === 'door') door(object);
    else if (object.type === 'goal') goal(object);
    else if (object.type === 'structure') structure(object);
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
    const inside = footprintTouches(platformData, x, z);
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
  for (const button of [ui.pauseStudio, ui.gameOverStudio, ui.victoryStudio]) button.classList.toggle('hidden', !playtestActive);
  ui.menu.classList.toggle('hidden', mode !== 'menu');
  ui.levelSelect.classList.toggle('hidden', mode !== 'levels');
  ui.hud.classList.toggle('hidden', !['playing', 'paused'].includes(mode));
  ui.pause.classList.toggle('hidden', mode !== 'paused');
  ui.gameOver.classList.toggle('hidden', mode !== 'gameover');
  ui.victory.classList.toggle('hidden', mode !== 'victory');
  ui.studio.classList.toggle('hidden', mode !== 'studio');
}
function getCustomLevels() {
  try {
    const stored = JSON.parse(localStorage.getItem('skybound_custom_levels') || '[]');
    return Array.isArray(stored) ? stored.filter((item) => item && item.id && Array.isArray(item.objects)) : [];
  } catch { return []; }
}
function renderLevelSelect() {
  ui.campaignTab.classList.toggle('active', levelMenuTab === 'campaign');
  ui.myLevelsTab.classList.toggle('active', levelMenuTab === 'custom');
  if (levelMenuTab === 'campaign') {
    ui.levelGrid.innerHTML = campaignCatalog.map((entry, index) => {
      const locked = index > maxUnlockedCampaign;
      const complete = completedCampaignIds.has(entry.id);
      return `<button class="level-card" data-campaign="${index}" ${locked ? 'disabled' : ''}><span class="level-number">CAMPAIGN ${String(index + 1).padStart(2, '0')}</span><strong>${escapeHtml(entry.name.replace(/^Skybound:\s*/, ''))}</strong><small>${campaignSummaries[index] || 'A new sky-island route awaits.'}</small><span class="level-best-time">BEST TIME <b>${formatBestTime(campaignBestTimeKey(entry))}</b></span><span class="level-state">${locked ? 'LOCKED' : complete ? 'CLEARED' : 'AVAILABLE'}</span></button>`;
    }).join('');
    ui.levelGrid.querySelectorAll('[data-campaign]').forEach((card) => card.addEventListener('click', () => launchCampaignLevel(Number(card.dataset.campaign))));
    return;
  }
  const customLevels = getCustomLevels();
  if (!customLevels.length) {
    ui.levelGrid.innerHTML = '<div class="level-empty">No saved levels yet.<br>Open the Dev Studio, build a route, then choose <b>SAVE TO MY LEVELS</b>.</div>';
    return;
  }
  ui.levelGrid.innerHTML = customLevels.map((entry) => `<article class="level-card" data-custom-card="${escapeHtml(entry.id)}" role="button" tabindex="0"><span class="level-number">YOUR LEVEL · ${entry.objects.length} OBJECTS</span><strong>${escapeHtml(entry.name || 'Untitled Level')}</strong><small>Saved in this browser. Select to play or remove it from your library.</small><span class="level-best-time">BEST TIME <b>${formatBestTime(customBestTimeKey(entry))}</b></span><button class="delete-level" data-delete-custom="${escapeHtml(entry.id)}">REMOVE</button></article>`).join('');
  ui.levelGrid.querySelectorAll('[data-custom-card]').forEach((card) => card.addEventListener('click', (event) => {
    if (event.target.closest('[data-delete-custom]')) return;
    launchCustomLevel(getCustomLevels().find((entry) => entry.id === card.dataset.customCard));
  }));
  ui.levelGrid.querySelectorAll('[data-custom-card]').forEach((card) => card.addEventListener('keydown', (event) => {
    if (['Enter', ' '].includes(event.key) && !event.target.closest('[data-delete-custom]')) {
      event.preventDefault();
      launchCustomLevel(getCustomLevels().find((entry) => entry.id === card.dataset.customCard));
    }
  }));
  ui.levelGrid.querySelectorAll('[data-delete-custom]').forEach((button) => button.addEventListener('click', (event) => {
    event.stopPropagation();
    localStorage.setItem('skybound_custom_levels', JSON.stringify(getCustomLevels().filter((entry) => entry.id !== button.dataset.deleteCustom)));
    renderLevelSelect();
  }));
}
function openLevelSelect(tab = 'campaign') {
  document.exitPointerLock?.();
  for (const key of Object.keys(keysDown)) keysDown[key] = false;
  jumpQueued = false;
  levelMenuTab = tab;
  renderLevelSelect();
  setMode('levels');
}
function launchCampaignLevel(index) {
  if (index < 0 || index > maxUnlockedCampaign || !campaignCatalog[index]) return;
  activeCampaignIndex = index;
  selectedCampaignIndex = index;
  activeLevelKind = 'campaign';
  activeLevelData = cloneLevelData(campaignCatalog[index]);
  startGame();
}
function launchCustomLevel(entry) {
  if (!entry) return;
  activeCampaignIndex = -1;
  activeLevelKind = 'custom';
  activeLevelData = normalizeLevel(entry);
  activeLevelData.id = String(entry.id);
  startGame();
}
function saveMyLevel() {
  level.name = ui.levelName.value.trim() || level.name || 'Untitled Level';
  const levels = getCustomLevels();
  const existing = levels.find((item) => item.name.toLowerCase() === level.name.toLowerCase());
  const saved = { id: existing?.id || `custom-${Date.now()}`, name: level.name, theme: level.theme, spawn: { ...level.spawn }, objects: cloneLevelData(level).objects };
  const next = existing ? levels.map((item) => item.id === existing.id ? saved : item) : [...levels, saved];
  localStorage.setItem('skybound_custom_levels', JSON.stringify(next));
  activeLevelData = cloneLevelData(saved);
  activeCampaignIndex = -1;
  activeLevelKind = 'custom';
  studioStatus(`Saved “${saved.name}” to My Levels`);
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
  ui.timer.textContent = formatRunTime(state.runTime);
  ui.bestTime.textContent = formatBestTime(activeBestTimeKey());
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
  buildLevel(activeLevelData);
  ui.levelTitle.textContent = level.name.replace(/^Skybound:\s*/i, '').toUpperCase();
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
  playtestActive = false;
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
  document.exitPointerLock?.();
  setMode('gameover');
  ui.goTitle.textContent = title;
  ui.goText.textContent = message;
  ui.goScore.textContent = state.score;
  ui.goShards.textContent = state.shards;
  ui.goTime.textContent = formatRunTime(state.runTime);
  ui.goBestTime.textContent = formatBestTime(activeBestTimeKey());
}
function victory() {
  if (state.mode !== 'playing') return;
  document.exitPointerLock?.();
  if (activeLevelKind === 'campaign' && activeCampaignIndex >= 0) {
    completedCampaignIds.add(campaignCatalog[activeCampaignIndex].id);
    localStorage.setItem('skybound_completed_levels', JSON.stringify([...completedCampaignIds]));
    maxUnlockedCampaign = Math.max(maxUnlockedCampaign, Math.min(campaignCatalog.length - 1, activeCampaignIndex + 1));
    localStorage.setItem('skybound_unlocked_level', String(maxUnlockedCampaign));
  }
  const isNewBestTime = saveBestTimeForActiveLevel();
  state.score += 600;
  updateHud();
  ui.vTime.textContent = formatRunTime(state.runTime);
  ui.vBestTime.textContent = formatBestTime(activeBestTimeKey());
  setMode('victory');
  ui.nextLevel.classList.toggle('hidden', activeLevelKind !== 'campaign' || activeCampaignIndex >= campaignCatalog.length - 1);
  ui.vScore.textContent = state.score;
  ui.vShards.textContent = state.shards;
  ui.vText.textContent = `${level.name} complete — the First Light is restored.${isNewBestTime ? ' New personal best!' : ''}`;
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
    ...platforms.map((item) => ({ x: item.x, z: item.z, y: item.y, w: item.w, h: item.h, d: item.d, shape: item.shape, rotation: item.rotation, footprint: item.footprint })),
    ...doors.filter((gate) => !gate.open).map((gate) => ({ x: gate.group.position.x, z: gate.group.position.z, y: gate.group.position.y + gate.h / 2, w: gate.w, h: gate.h, d: gate.d, shape: 'rect', rotation: gate.rotation, footprint: gate.footprint }))
  ];
  let nx = px + pstate.vel.x * dt;
  for (const solid of solids) {
    // Don't treat a player standing on a platform top as intersecting its side.
    // The small tolerance also prevents floating-point drift from pinning movement.
    const vertical = py - hh < solid.y - 0.08 && py + hh > solid.y - solid.h + 0.02;
    const overlap = footprintTouches(solid, nx, pz, -radius);
    if (vertical && overlap) { nx = px; pstate.vel.x = 0; break; }
  }
  let nz = pz + pstate.vel.z * dt;
  for (const solid of solids) {
    const vertical = py - hh < solid.y - 0.08 && py + hh > solid.y - solid.h + 0.02;
    const overlap = footprintTouches(solid, nx, nz, -radius);
    if (vertical && overlap) { nz = pz; pstate.vel.z = 0; break; }
  }
  player.position.x = nx;
  player.position.z = nz;
  const newY = py + pstate.vel.y * dt;
  let landing = null;
  let top = -Infinity;
  if (pstate.vel.y <= 0) {
    for (const solid of solids) {
      const overlap = footprintTouches(solid, player.position.x, player.position.z, -radius);
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
  for (const landmark of structures) if (landmark.rotor) landmark.rotor.rotation.z += dt * 0.7;
  for (const item of collectibles) {
    if (item.got) continue;
    item.group.rotation.y += dt * (item.kind === 'shard' ? 1.9 : 1.35);
    item.group.position.y = item.baseY + Math.sin(state.time * 2.4 + item.phase) * 0.045;
  }
  for (const checkpointData of checkpoints) {
    checkpointData.spire.rotation.y += dt * 1.4;
    checkpointData.spire.position.y = 1.15 + Math.sin(state.time * 2.2) * 0.06;
  }
  for (const enemyData of enemies) {
    if (enemyData.dead) continue;
    const phase = state.time * 0.9 + enemyData.phase;
    enemyData.group.position.x = enemyData.originX + Math.sin(phase) * enemyData.path;
    enemyData.group.position.y = enemyData.baseY + Math.sin(phase * 1.7) * 0.035;
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
const sizeEditableTypes = new Set(['platform', 'wall', 'door', 'hazard']);
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
    const icon = { platform: '▰', wall: '▤', structure: '⌂', shard: '◇', key: '◆', checkpoint: '◉', enemy: '●', hazard: '▲', door: '▥', goal: '✦' }[object.type] || '•';
    row.innerHTML = `<span class="explorer-icon">${icon}</span><span class="explorer-name">${escapeHtml(object.label || object.type)}</span><span class="explorer-type">${object.type}</span>`;
    row.onclick = () => selectObject(object, true);
    ui.explorer.appendChild(row);
  });
}
function studioSelectableRoots() {
  return [...platforms.map((item) => item.mesh), ...structures.map((item) => item.group), ...collectibles.map((item) => item.group), ...checkpoints.map((item) => item.group), ...enemies.map((item) => item.group), ...hazards.map((item) => item.mesh), ...doors.map((item) => item.group), ...goals.map((item) => item.group)];
}
function studioSelectableParts() {
  const parts = [];
  camera.updateMatrixWorld();
  world.updateMatrixWorld(true);
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
function setDimensionControls(enabled) {
  for (const field of [ui.selW, ui.selH, ui.selD]) field.disabled = !enabled;
  ui.dimensionHint.classList.toggle('hidden', enabled);
  for (const button of document.querySelectorAll('[data-transform="scale"]')) button.disabled = !enabled;
  ui.toolScale.disabled = Boolean(editor.selected) && !enabled;
}
function syncSelected(object) {
  editor.selected = object || null;
  if (!object) {
    setDimensionControls(true);
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
  ui.selRotation.value = Math.round((object.rotation || 0) * 180 / Math.PI);
  ui.selShape.value = object.shape || 'rect';
  ui.selShape.disabled = !['platform', 'wall'].includes(object.type);
  ui.selLabel.value = object.label || '';
  setDimensionControls(sizeEditableTypes.has(object.type));
  refreshExplorer();
}
function selectObject(object, focus = false) {
  editor.selected = object || null;
  if (object && editor.tool === 'scale' && !sizeEditableTypes.has(object.type)) setEditorTool('select');
  editor.selectedMesh = null;
  syncSelected(object);
  if (studioTransform) { studioTransform.detach(); studioTransform.visible = false; }
  if (studioTransformHelper) studioTransformHelper.visible = false;
  if (object) {
    const root = getRootForObject(object);
    editor.selectedMesh = root;
    if (root && studioTransform && editor.tool !== 'select' && editor.tool !== 'rotate') {
      studioTransform.attach(root);
      studioTransform.visible = true;
      if (studioTransformHelper) studioTransformHelper.visible = true;
    }
    if (focus && studioOrbit && root) { studioOrbit.target.copy(root.position); studioOrbit.update(); }
  }
}
function setEditorTool(tool) {
  if (tool === 'scale' && editor.selected && !sizeEditableTypes.has(editor.selected.type)) {
    studioStatus('SCALE applies to platforms, walls, hazards and gates; this item has a fixed size');
    return;
  }
  editor.tool = tool;
  ui.toolSelect.classList.toggle('active', tool === 'select');
  ui.toolMove.classList.toggle('active', tool === 'move');
  ui.toolScale.classList.toggle('active', tool === 'scale');
  ui.toolRotate.classList.toggle('active', tool === 'rotate');
  if (studioTransform) {
    studioTransform.detach();
    studioTransform.visible = false;
    if (studioTransformHelper) studioTransformHelper.visible = false;
    if (editor.selectedMesh && tool !== 'select' && tool !== 'rotate') {
      studioTransform.setMode(tool === 'scale' ? 'scale' : 'translate');
      studioTransform.attach(editor.selectedMesh);
      studioTransform.visible = true;
      if (studioTransformHelper) studioTransformHelper.visible = true;
    }
  }
  studioStatus(editorToolPrompt(tool));
}
function editorToolPrompt(tool = editor.tool) {
  if (tool === 'select') return 'SELECT TOOL • Click an object to select it';
  if (tool === 'move') return 'MOVE TOOL • Drag a colored arrow or use the inspector';
  if (tool === 'scale') return 'SCALE TOOL • Drag a colored box or use the inspector';
  return 'ROTATE TOOL • Drag the pink ring or use ← / →';
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
  // Pointer gestures below own selection, orbit and gizmo drags. OrbitControls
  // remains responsible for wheel zoom and middle-button dolly only.
  studioOrbit.mouseButtons.LEFT = null;
  studioOrbit.mouseButtons.RIGHT = null;
  studioOrbit.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
  const surfaces = level.objects.filter((object) => ['platform', 'wall'].includes(object.type));
  if (surfaces.length) {
    const bounds = surfaces.reduce((result, object) => ({
      minX: Math.min(result.minX, object.x - object.w / 2), maxX: Math.max(result.maxX, object.x + object.w / 2),
      minY: Math.min(result.minY, object.y - object.h / 2), maxY: Math.max(result.maxY, object.y + object.h / 2),
      minZ: Math.min(result.minZ, object.z - object.d / 2), maxZ: Math.max(result.maxZ, object.z + object.d / 2)
    }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity });
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const centerZ = (bounds.minZ + bounds.maxZ) / 2;
    const spanX = bounds.maxX - bounds.minX;
    const spanY = bounds.maxY - bounds.minY;
    const spanZ = bounds.maxZ - bounds.minZ;
    const distance = clamp(Math.max(spanZ * 0.66, spanX * 1.15, spanY * 2.4, 23), 23, 100);
    studioOrbit.target.set(centerX, centerY, centerZ);
    camera.position.set(centerX + distance * 0.16, centerY + distance * 0.3, centerZ + distance);
    studioOrbit.maxDistance = Math.max(140, distance * 3);
  } else {
    studioOrbit.target.set(0, 3, -6);
    camera.position.set(0, 19, 30);
  }
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
      studioStatus(event.value ? `${editor.tool.toUpperCase()} • Release mouse to commit` : editorToolPrompt());
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
      if (editor.tool === 'rotate') object.rotation = mesh.rotation.y;
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
  if (studioTransform.parent !== scene) scene.add(studioTransform);
  studioTransformHelper = studioTransform;
  if (!studioGrid) { studioGrid = new THREE.GridHelper(160, 160, 0x4d7b8d, 0x244452); scene.add(studioGrid); }
  setEditorTool(editor.tool);
  updateStudioOutline();
}
function teardownStudioHelpers() {
  if (studioOrbit) { studioOrbit.dispose(); studioOrbit = null; }
  if (studioTransform) { studioTransform.detach(); studioTransform.visible = false; }
  if (studioTransformHelper) { scene.remove(studioTransformHelper); studioTransformHelper = null; }
  if (studioGrid) {
    scene.remove(studioGrid);
    studioGrid.geometry.dispose();
    for (const material of Array.isArray(studioGrid.material) ? studioGrid.material : [studioGrid.material]) material.dispose();
    studioGrid = null;
  }
  if (studioOutline) { scene.remove(studioOutline); studioOutline.geometry.dispose(); studioOutline.material.dispose(); studioOutline = null; }
}
function updateStudioOutline() {
  if (state.mode !== 'studio' || !editor.selectedMesh) { if (studioOutline) studioOutline.visible = false; return; }
  const outlineTarget = editor.selectedMesh.userData.outlineTarget || editor.selectedMesh;
  if (!studioOutline) { studioOutline = new THREE.BoxHelper(outlineTarget, 0x59efff); scene.add(studioOutline); }
  else { studioOutline.visible = true; studioOutline.setFromObject(outlineTarget); }
  studioOutline.material.color.setHex(editor.tool === 'select' ? 0x59efff : editor.tool === 'scale' ? 0xffc857 : editor.tool === 'rotate' ? 0xff83d1 : 0x62ff9a);
  studioOutline.material.transparent = true;
  studioOutline.material.opacity = 0.95;
  studioOutline.material.depthTest = false;
  studioOutline.renderOrder = 20;
}
function ensureDomGizmo() {
  if (studioDomGizmo) return;
  studioDomGizmo = document.createElement('div');
  studioDomGizmo.className = 'studio-gizmo-overlay';
  const handles = [['x', 'axis'], ['y', 'axis'], ['z', 'axis'], ['nw', 'scale'], ['ne', 'scale'], ['sw', 'scale'], ['se', 'scale'], ['rotate', 'rotate']];
  for (const [name, kind] of handles) {
    const handle = document.createElement('button');
    handle.className = `studio-gizmo-handle studio-gizmo-${kind} ${name}`;
    handle.dataset.axis = name;
    if (kind === 'axis') { handle.innerHTML = '<i class="studio-gizmo-tip"></i>'; }
    if (kind === 'rotate') handle.setAttribute('aria-label', 'Drag to rotate the selected part around Y');
    handle.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || state.mode !== 'studio' || !editor.selected || editor.tool === 'select') return;
      if (kind === 'axis' && editor.tool !== 'move') return;
      if (kind === 'scale' && editor.tool !== 'scale') return;
      if (kind === 'rotate' && editor.tool !== 'rotate') return;
      if (editor.tool === 'scale' && !sizeEditableTypes.has(editor.selected.type)) return;
      event.preventDefault(); event.stopPropagation();
      const axis = studioGizmoLayout()?.axes.find((item) => item.name.toLowerCase() === name);
      const layout = kind === 'rotate' ? studioGizmoLayout() : null;
      studioDomDrag = { axis: name, x: event.clientX, y: event.clientY, object: editor.selected, tool: editor.tool, direction: axis?.direction || { x: 0, y: -1 }, lastAngle: layout ? Math.atan2(event.clientY - layout.origin.y, event.clientX - layout.origin.x) : 0 };
      handle.setPointerCapture?.(event.pointerId);
      studioStatus(editor.tool === 'rotate' ? 'ROTATING Y • Release mouse to commit' : `${editor.tool === 'scale' ? 'SCALING' : 'MOVING'} ${name.toUpperCase()} • Release mouse to commit`);
    });
    studioDomGizmo.append(handle);
  }
  document.querySelector('.studio-main').append(studioDomGizmo);
  window.addEventListener('pointermove', (event) => {
    if (!studioDomDrag) return;
    event.preventDefault();
    const drag = studioDomDrag; const dx = event.clientX - drag.x; const dy = event.clientY - drag.y; const object = drag.object;
    if (drag.tool === 'rotate') {
      const origin = studioGizmoLayout()?.origin;
      if (origin) {
        const angle = Math.atan2(event.clientY - origin.y, event.clientX - origin.x);
        let delta = angle - drag.lastAngle;
        if (delta > Math.PI) delta -= Math.PI * 2;
        if (delta < -Math.PI) delta += Math.PI * 2;
        drag.lastAngle = angle;
        const step = Math.PI / 12;
        const nextRotation = (object.rotation || 0) + delta;
        object.rotation = wrapRotation(editor.snap ? Math.round(nextRotation / step) * step : nextRotation);
      }
    } else if (drag.tool === 'move') {
      if (['x', 'y', 'z'].includes(drag.axis)) {
        const amount = (dx * drag.direction.x + dy * drag.direction.y) * 0.025;
        object[drag.axis] = snap(object[drag.axis] + amount);
      } else {
        if (drag.axis === 'nw' || drag.axis === 'sw') object.x = snap(object.x + dx * 0.025);
        if (drag.axis === 'nw' || drag.axis === 'ne') object.y = snap(object.y - dy * 0.025);
      }
    } else {
      const axisDelta = ['x', 'y', 'z'].includes(drag.axis) ? dx * drag.direction.x + dy * drag.direction.y : dx - dy;
      const factor = clamp(1 + axisDelta * 0.004, 0.1, 4);
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
    studioStatus(editorToolPrompt());
  }, { capture: true });
  window.addEventListener('pointercancel', () => { studioDomDrag = null; }, { capture: true });
}
function studioGizmoLayout() {
  if (!editor.selectedMesh) return null;
  const rect = ui.game.getBoundingClientRect();
  camera.updateMatrixWorld(true);
  const position = editor.selectedMesh.getWorldPosition(new THREE.Vector3());
  const project = (point) => {
    const ndc = point.clone().project(camera);
    return { x: rect.left + (ndc.x + 1) * rect.width / 2, y: rect.top + (1 - ndc.y) * rect.height / 2 };
  };
  const origin = project(position);
  const worldAxes = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
  const axes = Object.entries(worldAxes).map(([name, direction]) => {
    const end = project(position.clone().addScaledVector(direction, 2));
    let dx = end.x - origin.x, dy = end.y - origin.y;
    const length = Math.hypot(dx, dy);
    if (length < 0.01) { dx = name === 'y' ? 0 : 1; dy = name === 'y' ? -1 : 0; }
    else { dx /= length; dy /= length; }
    return { name, direction: { x: dx, y: dy }, angle: Math.atan2(dy, dx), end: { x: origin.x + dx * 110, y: origin.y + dy * 110 } };
  });
  return { origin, axes };
}
function updateDomGizmo() {
  if (!studioDomGizmo || state.mode !== 'studio' || !editor.selectedMesh || editor.tool === 'select') { if (studioDomGizmo) studioDomGizmo.style.display = 'none'; return; }
  if (editor.tool === 'scale' && !sizeEditableTypes.has(editor.selected?.type)) { studioDomGizmo.style.display = 'none'; return; }
  if (studioDomDrag) return;
  studioDomGizmo.style.display = 'block';
  const layout = studioGizmoLayout();
  if (!layout) { studioDomGizmo.style.display = 'none'; return; }
  const main = document.querySelector('.studio-main').getBoundingClientRect();
  const x = layout.origin.x - main.left; const y = layout.origin.y - main.top;
  const set = (selector, left, top, transform = '') => { const node = studioDomGizmo.querySelector(selector); if (node) { node.style.left = `${left}px`; node.style.top = `${top}px`; node.style.transform = transform; } };
  const rotateHandle = studioDomGizmo.querySelector('.studio-gizmo-rotate');
  if (editor.tool === 'rotate') {
    studioDomGizmo.querySelectorAll('.studio-gizmo-axis, .studio-gizmo-scale').forEach((handle) => { handle.style.display = 'none'; });
    if (rotateHandle) rotateHandle.style.display = 'block';
    set('.studio-gizmo-rotate', x - 66, y - 66);
    return;
  }
  if (rotateHandle) rotateHandle.style.display = 'none';
  studioDomGizmo.querySelectorAll('.studio-gizmo-axis').forEach((handle) => { handle.style.display = editor.tool === 'move' ? 'block' : 'none'; });
  studioDomGizmo.querySelectorAll('.studio-gizmo-scale').forEach((handle) => { handle.style.display = editor.tool === 'scale' ? 'block' : 'none'; });
  for (const axis of layout.axes) set(`.${axis.name.toLowerCase()}`, x, y - 5, `rotate(${axis.angle}rad) scale(${110 / 150})`);
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
  const y = { platform: 0.5, wall: 2, structure: 0.5, shard: 2.2, key: 2.3, checkpoint: 0.5, enemy: 1, hazard: 0, door: 3, goal: 2.5 }[type] ?? 0.5;
  const defaults = { platform: [6, 1, 6], wall: [6, 4, 0.8], structure: [6, 5, 4], shard: [1, 1, 1], key: [0.25, 0.75, 0.25], checkpoint: [1.35, 0.25, 1.35], enemy: [1, 1, 1], hazard: [2, 0.18, 2], door: [6, 5, 0.8], goal: [4, 4, 1] };
  const [w, h, d] = defaults[type] || defaults.platform;
  const object = { type, x: snap(x), y: snap(y), z: snap(z), w, h, d, shape: type === 'platform' ? 'hex' : 'rect', variant: type === 'structure' ? 'arch' : undefined, rotation: 0, theme: level.theme || 'dawn', label: `${type.toUpperCase()}-${level.objects.length + 1}` };
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
  object.rotation = Number(ui.selRotation.value || 0) * Math.PI / 180;
  if (['platform', 'wall'].includes(object.type)) object.shape = ui.selShape.value;
  if (sizeEditableTypes.has(object.type)) {
    object.w = Math.max(0.1, Number(ui.selW.value) || 1);
    object.h = Math.max(0.1, Number(ui.selH.value) || 1);
    object.d = Math.max(0.1, Number(ui.selD.value) || 1);
  }
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
  ui.jsonBox.value = JSON.stringify({ version: 3, name: level.name, theme: level.theme, spawn: level.spawn, objects: level.objects }, null, 2);
  ui.jsonBox.select();
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(ui.jsonBox.value).then(() => studioStatus('JSON copied. Share it or paste it into LOAD JSON.')).catch(() => studioStatus('JSON selected — press Ctrl+C.'));
  else studioStatus('JSON selected — press Ctrl+C.');
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
    setupStudioCamera();
    studioStatus(`Loaded ${level.name} • ${level.objects.length} objects`);
  } catch (error) { studioStatus(`Invalid JSON: ${error.message}`); }
}
function newLevel() {
  buildLevel({
    name: 'New Skybound Level', theme: 'dawn', spawn: { x: 0, y: 1.1, z: 10 }, objects: [
      { type: 'platform', x: 0, y: 0, z: 10, w: 17, h: 1, d: 15, shape: 'octagon', label: 'START DOCK' },
      { type: 'structure', x: 4.8, y: 0.5, z: 11, w: 6, h: 4, d: 5, variant: 'dock', label: 'OLD AIRDOCK' },
      { type: 'platform', x: -7, y: 1.8, z: 0, w: 9, h: 1, d: 8, shape: 'diamond', label: 'WIND TURN' },
      { type: 'platform', x: -12, y: 3.6, z: -10, w: 8, h: 1, d: 9, shape: 'hex', label: 'KEYKEEPER RUIN' },
      { type: 'structure', x: -14.2, y: 4.1, z: -10, w: 4, h: 7, d: 4, variant: 'tower', label: 'KEYKEEPER TOWER' },
      { type: 'key', x: -13, y: 4.6, z: -10, label: 'KEY-1' },
      { type: 'door', x: -7, y: 6.5, z: -13.5, w: 7, h: 5.8, d: 0.8, rotation: 0.45, label: 'GATE-1' },
      { type: 'platform', x: -2, y: 5.4, z: -18, w: 9, h: 1, d: 7, shape: 'crescent', label: 'MOON BRIDGE' },
      { type: 'checkpoint', x: -2, y: 5.9, z: -18, label: 'MOON BRIDGE BEACON' },
      { type: 'enemy', x: -3, y: 5.9, z: -19.5, label: 'BRIDGE SENTINEL' },
      { type: 'platform', x: 8, y: 7.2, z: -11, w: 8, h: 1, d: 8, shape: 'cross', label: 'AERIE COURT' },
      { type: 'hazard', x: 9.8, y: 7.56, z: -11, w: 2.2, h: 0.18, d: 2, label: 'RUNE SURGE' },
      { type: 'platform', x: 4, y: 9, z: -23, w: 16, h: 1, d: 14, shape: 'round', label: 'FINISH CITADEL' },
      { type: 'structure', x: 8, y: 9.5, z: -23, w: 8, h: 8, d: 7, variant: 'citadel', label: 'FINISH CITADEL KEEP' },
      { type: 'shard', x: 1, y: 10, z: -23, label: 'SUMMIT SHARD' },
      { type: 'goal', x: 4, y: 10.9, z: -23, label: 'FINISH PORTAL' }
    ]
  });
  ui.levelName.value = level.name;
  selectObject(null);
  setupStudioCamera();
  studioStatus('Starter course created • press TEST RUN to play it');
}
function setSpawnHere() {
  const object = editor.selected;
  const x = object ? object.x : studioOrbit ? studioOrbit.target.x : 0;
  const z = object ? object.z : studioOrbit ? studioOrbit.target.z + 3 : 8;
  level.spawn = { x: snap(x), y: 1.1, z: snap(z) };
  setInitialRespawn();
  const floor = groundBelow(level.spawn.x, level.spawn.z);
  studioStatus(floor ? `Spawn set on ${object?.label || floor.label || 'platform'}` : 'Spawn saved, but there is no platform directly below it yet');
}
function enterStudio() {
  document.exitPointerLock?.();
  resetStudioInput();
  state.mode = 'studio';
  ui.menu.classList.add('hidden');
  ui.hud.classList.add('hidden');
  ui.pause.classList.add('hidden');
  ui.gameOver.classList.add('hidden');
  ui.victory.classList.add('hidden');
  ui.studio.classList.remove('hidden');
  ui.studio.style.display = 'flex';
  selectObject(null);
  buildLevel(level);
  ui.levelName.value = level.name;
  setupStudioCamera();
  selectObject(null);
  studioStatus('DEV STUDIO READY • 1 Select • 2 Move • 3 Scale • Ctrl+D Duplicate');
}
function resetStudioInput() {
  editor.moveForward = editor.moveBack = editor.moveLeft = editor.moveRight = false;
  editor.moveUp = editor.moveDown = editor.fast = false;
  studioPointer = null;
  studioGizmoDrag = null;
  studioDomDrag = null;
  studioOrbitInput.active = false;
  if (studioTransform) { studioTransform.userData.dragging = false; studioTransform.userData.scaleBase = null; }
  if (studioOrbit) studioOrbit.enabled = true;
}
function returnToStudio() {
  playtestActive = false;
  enterStudio();
}
function exitStudio() {
  document.exitPointerLock?.();
  playtestActive = false;
  resetStudioInput();
  teardownStudioHelpers();
  activeLevelData = normalizeLevel(level);
  activeCampaignIndex = -1;
  activeLevelKind = 'custom';
  setMode('menu');
  ui.studio.style.display = 'none';
}

addEventListener('keydown', (event) => {
  keysDown[event.code] = true;
  if (event.code === 'Space' || event.code === 'Numpad0') jumpQueued = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  if (event.code === 'Escape' && state.mode === 'levels') setMode('menu');
  if (event.code === 'Escape' && (state.mode === 'playing' || state.mode === 'paused')) togglePause();
  if (event.code === 'KeyR' && (state.mode === 'playing' || state.mode === 'paused')) restartGame();
});
addEventListener('keyup', (event) => { keysDown[event.code] = false; });
addEventListener('mousemove', (event) => { if (pointerLocked && state.mode === 'playing') { mouseDX += event.movementX; mouseDY += event.movementY; } });
ui.game.addEventListener('click', () => { if (state.mode === 'playing' && !pointerLocked && !demoMode) ui.game.requestPointerLock?.(); });
document.addEventListener('pointerlockchange', () => { pointerLocked = document.pointerLockElement === ui.game; });

ui.play.onclick = startGame;
ui.levels.onclick = () => openLevelSelect('campaign');
ui.pauseLevels.onclick = () => openLevelSelect('campaign');
ui.gameOverLevels.onclick = () => openLevelSelect('campaign');
ui.victoryLevels.onclick = () => openLevelSelect('campaign');
ui.campaignTab.onclick = () => openLevelSelect('campaign');
ui.myLevelsTab.onclick = () => openLevelSelect('custom');
ui.closeLevels.onclick = () => setMode('menu');
ui.dev.onclick = (event) => { event.preventDefault(); enterStudio(); };
ui.howBtn.onclick = () => ui.how.classList.toggle('hidden');
ui.closeHow.onclick = () => ui.how.classList.add('hidden');
ui.resume.onclick = () => setMode('playing');
ui.restartPause.onclick = restartGame;
ui.homePause.onclick = goHome;
ui.retry.onclick = continueFromCheckpoint;
ui.homeGameOver.onclick = goHome;
ui.pauseStudio.onclick = returnToStudio;
ui.gameOverStudio.onclick = returnToStudio;
ui.victoryStudio.onclick = returnToStudio;
ui.victoryRetry.onclick = restartGame;
ui.victoryHome.onclick = goHome;
ui.nextLevel.onclick = () => launchCampaignLevel(activeCampaignIndex + 1);
ui.studioBack.onclick = exitStudio;
ui.studioPlay.onclick = () => { activeLevelData = normalizeLevel(level); activeLevelKind = 'custom'; activeCampaignIndex = -1; playtestActive = true; teardownStudioHelpers(); startGame(); };
ui.newLevel.onclick = newLevel;
ui.saveMyLevel.onclick = saveMyLevel;
ui.exportJson.onclick = exportData;
ui.downloadJson.onclick = downloadData;
ui.loadJson.onclick = loadData;
ui.deleteSelected.onclick = () => {
  if (!editor.selected) return;
  const index = level.objects.indexOf(editor.selected);
  if (index >= 0) { level.objects.splice(index, 1); buildLevel(level); selectObject(null); studioStatus('Object deleted'); }
};
function applyTransformStrip(action, axis, direction) {
  const object = editor.selected;
  if (!object) return;
  if (action === 'scale' && !sizeEditableTypes.has(object.type)) {
    studioStatus('Scale is available for platforms, walls, hazards and gates');
    return;
  }
  const step = editor.snap ? editor.snapSize : 0.25;
  if (action === 'move') object[axis] = snap((object[axis] || 0) + direction * step);
  else {
    const field = axis === 'x' ? 'w' : axis === 'y' ? 'h' : 'd';
    object[field] = Math.max(0.25, snap((object[field] || 1) + direction * step));
  }
  buildLevel(level);
  selectObject(object, false);
  studioStatus(`${action === 'move' ? 'MOVED' : 'SCALED'} ${axis.toUpperCase()} AXIS • Selection kept`);
}
for (const button of document.querySelectorAll('[data-transform]')) {
  let repeatTimer = null, holdTimer = null;
  const axisLabel = button.dataset.axis.toUpperCase();
  const directionLabel = Number(button.dataset.dir) < 0 ? 'negative' : 'positive';
  button.title = button.dataset.transform === 'move'
    ? `Move selected part in ${axisLabel} ${directionLabel} direction by one grid step; hold to repeat`
    : `Resize selected part along ${axisLabel} in ${directionLabel} direction; hold to repeat`;
  button.setAttribute('aria-label', button.title);
  const apply = () => applyTransformStrip(button.dataset.transform, button.dataset.axis, Number(button.dataset.dir));
  // A normal click is one step; keyboard activation also uses click.
  button.addEventListener('click', (event) => { if (event.detail === 0) apply(); });
  button.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    apply();
    button.setPointerCapture?.(event.pointerId);
    holdTimer = setTimeout(() => { repeatTimer = setInterval(apply, 110); }, 320);
  });
  const stopRepeat = () => {
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
    if (repeatTimer) { clearInterval(repeatTimer); repeatTimer = null; }
  };
  button.addEventListener('pointerup', stopRepeat);
  button.addEventListener('pointercancel', stopRepeat);
  button.addEventListener('lostpointercapture', stopRepeat);
}
for (const field of ['selX', 'selY', 'selZ', 'selW', 'selH', 'selD', 'selRotation', 'selShape', 'selLabel']) ui[field].onchange = selectedChanged;
for (const button of document.querySelectorAll('[data-add]')) button.onclick = () => { const target = studioOrbit?.target || new THREE.Vector3(0, 0, -6); addObject(button.dataset.add, target.x, target.z); };
ui.studioResetCam.onclick = setupStudioCamera;
ui.studioTestSpawn.onclick = setSpawnHere;
ui.toolSelect.onclick = () => setEditorTool('select');
ui.toolMove.onclick = () => setEditorTool('move');
ui.toolScale.onclick = () => setEditorTool('scale');
ui.toolRotate.onclick = () => setEditorTool('rotate');
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
function gizmoAxisAt(clientX, clientY) {
  if (!editor.selectedMesh || editor.tool === 'select' || editor.tool === 'rotate') return null;
  if (editor.tool === 'scale' && !sizeEditableTypes.has(editor.selected?.type)) return null;
  const layout = studioGizmoLayout();
  if (!layout) return null;
  const candidates = layout.axes.map((axis) => {
    const dx = axis.end.x - layout.origin.x, dy = axis.end.y - layout.origin.y;
    const lengthSq = dx * dx + dy * dy;
    const ratio = clamp(((clientX - layout.origin.x) * dx + (clientY - layout.origin.y) * dy) / lengthSq, 0, 1);
    const distance = Math.hypot(clientX - (layout.origin.x + ratio * dx), clientY - (layout.origin.y + ratio * dy));
    return { name: axis.name.toUpperCase(), direction: axis.direction, ratio, distance };
  }).filter((axis) => axis.ratio >= 0.32 && axis.distance <= 18).sort((a, b) => a.distance - b.distance);
  return candidates[0] || null;
}
function captureStudioPointer(event, target = ui.game) {
  try { target.setPointerCapture?.(event.pointerId); } catch { /* pointer already released or synthetic */ }
}
function releaseStudioPointer(event, target = ui.game) {
  try { target.releasePointerCapture?.(event.pointerId); } catch { /* capture already gone */ }
}
function beginGizmoDrag(event) {
  const axis = gizmoAxisAt(event.clientX, event.clientY);
  if (!axis || !editor.selected) return false;
  studioGizmoDrag = { ...axis, x: event.clientX, y: event.clientY, object: editor.selected, mesh: editor.selectedMesh };
  if (studioTransform) studioTransform.userData.dragging = true;
  studioStatus(`${editor.tool === 'scale' ? 'SCALING' : 'MOVING'} ${axis.name} • Release mouse to commit`);
  studioOrbit.enabled = false;
  event.stopImmediatePropagation();
  captureStudioPointer(event);
  return true;
}
function updateGizmoDrag(event) {
  if (!studioGizmoDrag) return;
  const drag = studioGizmoDrag;
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  const amount = dx * drag.direction.x + dy * drag.direction.y;
  const object = drag.object;
  if (editor.tool === 'move') {
    object[drag.name.toLowerCase()] = snap(object[drag.name.toLowerCase()] + amount * 0.025);
  } else {
    const factor = clamp(1 + amount * 0.008, 0.1, 4);
    const dimension = { X: 'w', Y: 'h', Z: 'd' }[drag.name];
    object[dimension] = Math.max(0.25, snap(object[dimension] * factor));
  }
  drag.x = event.clientX;
  drag.y = event.clientY;
  buildLevel(level);
  selectObject(object, false);
}
function endGizmoDrag(event) {
  if (!studioGizmoDrag) return;
  studioGizmoDrag = null;
  if (studioTransform) studioTransform.userData.dragging = false;
  if (studioOrbit) studioOrbit.enabled = true;
  releaseStudioPointer(event);
  studioStatus(editorToolPrompt());
}
function orbitStudioByDrag(dx, dy) {
  if (!studioOrbit || (!dx && !dy)) return;
  const target = studioOrbit.target;
  const offset = camera.position.clone().sub(target);
  const spherical = new THREE.Spherical().setFromVector3(offset);
  const speed = (Math.PI * 2) / Math.max(1, ui.game.clientHeight);
  spherical.theta -= dx * speed;
  spherical.phi = clamp(spherical.phi - dy * speed, 0.06, Math.PI - 0.06);
  offset.setFromSpherical(spherical);
  camera.position.copy(target).add(offset);
  camera.lookAt(target);
  studioOrbit.update();
}
window.addEventListener('pointerdown', (event) => {
  if (state.mode !== 'studio' || event.target !== ui.game || (event.button !== 0 && event.button !== 2)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (event.button === 2) {
    studioPointer = { button: 2, pointerId: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, moved: false };
    studioOrbitInput.active = true;
    captureStudioPointer(event);
    return;
  }
  const previousSelection = editor.selected;
  const hit = objectAt(event.clientX, event.clientY);
  if (hit) selectObject(hit, false);
  if ((!hit || hit === previousSelection) && beginGizmoDrag(event)) return;
  studioPointer = { button: 0, pointerId: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, moved: false };
  studioOrbitInput.active = true;
  captureStudioPointer(event);
}, true);
window.addEventListener('pointermove', (event) => {
  if (state.mode !== 'studio') return;
  if (studioGizmoDrag) { updateGizmoDrag(event); return; }
  if (!studioPointer || studioPointer.pointerId !== event.pointerId) return;
  const dx = event.clientX - studioPointer.lastX;
  const dy = event.clientY - studioPointer.lastY;
  orbitStudioByDrag(dx, dy);
  studioPointer.lastX = event.clientX;
  studioPointer.lastY = event.clientY;
  if (Math.hypot(event.clientX - studioPointer.x, event.clientY - studioPointer.y) > 5) studioPointer.moved = true;
}, true);
window.addEventListener('pointerup', (event) => {
  if (state.mode !== 'studio') return;
  if (studioGizmoDrag) { endGizmoDrag(event); return; }
  if (!studioPointer || studioPointer.pointerId !== event.pointerId) return;
  const pointer = studioPointer;
  const click = !pointer.moved;
  studioPointer = null;
  studioOrbitInput.active = false;
  releaseStudioPointer(event);
  if (!click || pointer.button !== 0) return;
  const hit = objectAt(event.clientX, event.clientY);
  if (hit) selectObject(hit, true);
  else if (editor.tool === 'select') selectObject(null);
}, true);
window.addEventListener('pointercancel', (event) => {
  if (studioGizmoDrag) endGizmoDrag(event);
  if (studioPointer?.pointerId === event.pointerId) studioPointer = null;
  studioOrbitInput.active = false;
});
ui.game.addEventListener('contextmenu', (event) => { if (state.mode === 'studio') event.preventDefault(); });
window.addEventListener('keydown', (event) => {
  if (state.mode !== 'studio' || ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  const transformKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyZ', 'KeyX'];
  const rotateKeys = ['ArrowLeft', 'ArrowRight', 'KeyZ', 'KeyX'];
  const handlesTransformKey = editor.tool === 'rotate' ? rotateKeys.includes(event.code) : ['move', 'scale'].includes(editor.tool) && transformKeys.includes(event.code);
  if (editor.selected && handlesTransformKey) {
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
    } else if (editor.tool === 'rotate') {
      const direction = ['ArrowLeft', 'KeyZ'].includes(event.code) ? -1 : 1;
      const angleStep = event.shiftKey ? Math.PI / 180 : Math.PI / 12;
      const nextRotation = (editor.selected.rotation || 0) + direction * angleStep;
      editor.selected.rotation = wrapRotation(editor.snap ? Math.round(nextRotation / angleStep) * angleStep : nextRotation);
    }
    buildLevel(level); selectObject(editor.selected, false);
    studioStatus(editor.tool === 'rotate' ? `ROTATION • ${Math.round((editor.selected.rotation || 0) * 180 / Math.PI)}°` : editor.tool === 'scale' ? 'SCALE TOOL • Arrow keys resize selected part' : 'MOVE TOOL • Arrow keys move selected part');
    return;
  }
  const key = event.key.toLowerCase();
  if ((event.ctrlKey || event.metaKey) && key === 'd') { event.preventDefault(); duplicateSelected(); return; }
  if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); ui.deleteSelected.click(); return; }
  if (key === '1') return setEditorTool('select');
  if (key === '2') return setEditorTool('move');
  if (key === '3') return setEditorTool('scale');
  if (key === '4') return setEditorTool('rotate');
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
  if (state.mode === 'playing') {
    state.runTime += dt;
    ui.timer.textContent = formatRunTime(state.runTime);
  }
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
