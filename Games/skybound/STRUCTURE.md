# Skybound Runtime Structure

Skybound is a self-contained static Three.js game. `index.html` owns the canvas and DOM overlays, `style.css` owns the visual system, and `game.js` owns rendering, gameplay, UI state, and the integrated level studio. No build tool is required by the PlayHaven host.

| Area | Ownership | Responsibility |
|---|---|---|
| Renderer and scene | `game.js` scene setup | Lighting, sky, fog, camera, and world groups |
| Authored levels | `defaultLevel()` and `campaignLevels()` | The three campaign routes, with level data, gates, checkpoints, encounters, and goals |
| Runtime entities | `platforms`, `hazards`, `collectibles`, `checkpoints`, `enemies`, `doors`, `goals` | Collision, visibility, animation, and interaction state |
| Player | `player` and `pstate` | Camera-relative movement, coyote time, jump buffer, double jump, sprint dash, health, and respawn state |
| Progression | `state`, campaign selection, and entity interactions | Shards, keys, score, campaign unlocks, gate unlocks, objective text, and checkpoint recovery |
| User interface | `ui` plus `updateHud()` | Main menu, campaign/My Levels selector, HUD, overlays, toasts, objective, and status feedback |
| Dev Studio | `editor`, Studio helpers | Level selection, transforms, serialization, import/export, and testing |

The campaign selector keeps the first level available and unlocks the next stage when a campaign level is completed. Levels saved from Dev Studio are stored in browser local storage and can be launched or removed from the My Levels tab.

The Studio viewport uses `OrbitControls` with left-button orbit. Selection is deferred until pointer-up when the pointer has not moved, so a click selects an object while a held left drag rotates the camera without stealing the gesture.

## Level Object Contract

Every object is a JSON record with `type`, `x`, `y`, `z`, optional `w`, `h`, `d`, and `label`. The supported types are `platform`, `wall`, `shard`, `key`, `checkpoint`, `enemy`, `hazard`, `door`, and `goal`. A `shard` is a score collectible; a `key` contributes to the sequential gate requirement.

## Recovery Contract

`pstate.respawn` is the only authoritative active recovery position. It is set from the level spawn at run start and overwritten only when a checkpoint is activated. Fall recovery and lethal damage reset velocity and return the player to `pstate.respawn`; they do not regenerate the world state or erase collected progress.
