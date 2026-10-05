# Skybound Runtime Structure

Skybound is a self-contained static Three.js game. `index.html` owns the canvas and DOM overlays, `style.css` owns the visual system, and `game.js` owns rendering, gameplay, progression, and the integrated level studio. No build tool is required by the PlayHaven host.

| Area | Ownership | Responsibility |
|---|---|---|
| Renderer and scene | `game.js` scene setup | Lighting, per-level sky palettes, fog, camera, and world groups |
| Authored levels | `defaultLevel()` and `campaignLevels()` | Five multidirectional campaigns with shaped platforms, keys, gates, hazards, checkpoints, enemies, and landmark architecture |
| World geometry | `platformOutline()`, `platform()`, `structure()` | Extruded island silhouettes, matching player collision footprints, platform-attached cliff/dressing meshes, edge runes, animated windmills, and authored ruins/towers/temples/citadels |
| Runtime entities | `platforms`, `hazards`, `collectibles`, `checkpoints`, `enemies`, `doors`, `structures`, `goals` | Collision, rendering, animation, and interaction state; rebuilds clear children without detaching their permanent scene groups |
| Player | `player` and `pstate` | Camera-relative movement, coyote time, jump buffer, double jump, sprint dash, health, and respawn state |
| Progression | `state`, campaign selection, and entity interactions | Shards, keys, score, saved campaign completions, gate unlocking, checkpoints, and recovery |
| Dev Studio | `editor`, Studio helpers, and inspector | Left-click picking, right-drag orbit, shape/rotation controls, XYZ step buttons, axis handles, import/export, and reversible playtesting |

## Campaign

The five campaign routes now weave east/west as well as north/south, climb at different rates, and use octagonal, hexagonal, circular, diamond, cross, bridge, and crescent landings. The environments have distinct palettes and site layouts: a ruined skyport and dawn citadel; windmills and a sunrise observatory; storm piers and a crown fortress; crescent moon ledges and an eclipse monastery; and a long aether citadel circuit. Gates remain key-gated, and checkpoints are placed along the longer routes.

Platform rendering and ground checks share the same rotated polygon outline. Side collision and landing sweeps use that footprint too, so a player cannot land on invisible square corners outside a shaped island.

Island undersides, rubble, grass tufts, and beacon posts are children of their platform so they stay attached during Studio transforms. Campaign shards, keys, hazards, and sentinels use surface-relative offsets; pickups retain only a restrained bob, while portal rings and beacon crystals intentionally hover as visual landmarks.

The campaign selector keeps the first level available and unlocks the next stage when a campaign level is completed. Completion IDs and unlock progress are stored in browser local storage. Levels saved from Dev Studio are stored there too and can be launched or removed from the My Levels tab.

## Dev Studio

The viewport frames the current route on entry. A left-click on visible geometry selects it in every tool mode; clicking buttons, handles, or inspector controls does not move the selected part. Right-mouse drag explicitly rotates the camera, empty-space left drag also orbits, and the wheel zooms. The inspector provides X/Y/Z movement, rotation in degrees, and footprint choices for platforms and walls. Move arrows and the Z−/Z+ buttons remain separate from menu/tool icons. Test Run can return to the same editor from pause, defeat, or victory.

Scale controls apply only to platforms, walls, hazards, and gates. New Level creates a shaped, turning starter course with a key gate, hazards, a checkpoint, landmarks, and a portal. Imported coordinates and dimensions are normalized to finite values and per-type defaults.

## Level Object Contract

Every object is a JSON record with `type`, `x`, `y`, `z`, optional `w`, `h`, `d`, `rotation` (radians), `shape`, `variant`, `theme`, and `label`. Supported types are `platform`, `wall`, `structure`, `shard`, `key`, `checkpoint`, `enemy`, `hazard`, `door`, and `goal`. A `shard` is a score collectible; a `key` contributes to the sequential gate requirement. Campaign platform `y` is its center, so its walkable top is `y + h/2`; generated pickups and hazards are positioned relative to that surface. Legacy rectangle levels remain supported when `shape` is omitted.

## Recovery Contract

`pstate.respawn` is the only authoritative active recovery position. It is set from the level spawn at run start and overwritten only when a checkpoint is activated. Fall recovery and lethal damage reset velocity and return the player to `pstate.respawn`; they do not erase collected progress.
