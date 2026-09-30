# Skybound Runtime Structure

Skybound is a self-contained static Three.js game. `index.html` owns the canvas and DOM overlays, `style.css` owns the visual system, and `game.js` owns rendering, gameplay, UI state, and the integrated level studio. No build tool is required by the PlayHaven host.

| Area | Ownership | Responsibility |
|---|---|---|
| Renderer and scene | `game.js` scene setup | Lighting, sky, fog, camera, and world groups |
| Authored levels | `defaultLevel()` and `campaignLevels()` | Five campaign routes with a rising difficulty curve, narrower late-game landings, hazards, sentinels, gates, checkpoints, and goals |
| Runtime entities | `platforms`, `hazards`, `collectibles`, `checkpoints`, `enemies`, `doors`, `goals` | Collision, visibility, animation, and interaction state |
| Player | `player` and `pstate` | Camera-relative movement, coyote time, jump buffer, double jump, sprint dash, health, and respawn state |
| Progression | `state`, campaign selection, and entity interactions | Shards, keys, score, campaign unlocks, gate unlocks, objective text, and checkpoint recovery |
| User interface | `ui` plus `updateHud()` | Main menu, campaign/My Levels selector, HUD, overlays, toasts, objective, and status feedback |
| Dev Studio | `editor`, Studio helpers | Object selection, axis-aligned move/scale handles, inspector transforms, level serialization, import/export, and reversible playtesting |

The campaign selector keeps the first level available and unlocks the next stage when a campaign level is completed. Completion IDs and unlock progress are stored in browser local storage. Levels saved from Dev Studio are stored there too and can be launched or removed from the My Levels tab. The level selector is available from the main menu, pause, defeat, and victory screens.

The Studio viewport frames the current route on entry, uses right-drag to pan and wheel zoom, left-click to select, left-drag on empty space to orbit, and visible transform handles to move or resize. Editing rebuilds preserve object identity so repeated pointer and keyboard adjustments continue to affect the selected record. Test Run can return to the same editor from pause, defeat, or victory; each return restores the camera controls and helpers.

Dimension fields and scale handles apply only to platforms, walls, hazards, and gates. Other entities have fixed runtime dimensions, so the inspector disables size controls rather than accepting edits that would not change the game.

New Level creates a playable three-island starter route with a beacon and portal, and Set Spawn places the start point at the selected surface. Imported coordinates and dimensions are normalized to finite values and per-type defaults.

## Level Object Contract

Every object is a JSON record with `type`, `x`, `y`, `z`, optional `w`, `h`, `d`, and `label`. The supported types are `platform`, `wall`, `shard`, `key`, `checkpoint`, `enemy`, `hazard`, `door`, and `goal`. A `shard` is a score collectible; a `key` contributes to the sequential gate requirement.

## Recovery Contract

`pstate.respawn` is the only authoritative active recovery position. It is set from the level spawn at run start and overwritten only when a checkpoint is activated. Fall recovery and lethal damage reset velocity and return the player to `pstate.respawn`; they do not regenerate the world state or erase collected progress.
