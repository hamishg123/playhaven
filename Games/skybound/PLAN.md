# Game Plan: Skybound — First Light

## Visual Target

The game targets a **bright, stylized sky-island ascent**: warm sunlight, cyan rune energy, mossy stone platforms, readable floating-route silhouettes, and a clear goal portal. The generated reference image is stored outside the repository at `/home/ubuntu/skybound-art/skybound-reference.png` and the in-game rune-stone texture is `assets/skybound-rune-tile.jpg`.

## Risk Tasks

### 1. Third-person movement, camera, and recovery
- **Why isolated:** The experience depends on responsive camera-relative movement and reliable recovery from falls. A broken checkpoint path makes the entire progression loop feel untrustworthy.
- **Approach:** Keep the existing fixed third-person camera, retain coyote time and jump buffering, add a single persistent respawn position, and reset only the player's physics state when recovering.
- **Verify:** W/A/S/D movement follows the camera direction; a late jump is accepted during coyote time; falling below the world returns the player to the most recently activated checkpoint rather than the initial spawn.

### 2. Locked-route progression
- **Why isolated:** Keys, doors, checkpoints, shards, and the summit must resolve in an unambiguous order. The original level contained no shard entities and almost no gameplay encounters.
- **Approach:** Build one authored route through a start island, relay island, gate island, and summit. Use shard pickups for score and a small boost, keys for gates, sentinels and hazard pads for pressure, and clearly signpost the next objective.
- **Verify:** Collecting a shard increments SHARDS and SCORE; each key opens its matching gate; activating a checkpoint changes the recovery spawn; the portal ends the run only after the route is traversed.

### 3. Studio integrity
- **Why isolated:** The level editor shares the runtime level representation and can silently corrupt playable level data if new entity types are not registered consistently.
- **Approach:** Make shards editable entities, preserve the type during JSON import/export, and use the same build pipeline for editor and play modes.
- **Verify:** A shard can be created from the studio palette, selected, exported, re-imported, and collected in Play mode.

## Main Build

Replace the sparse staircase with a designed sky-island course and strengthen environmental readability with procedural island undersides, beacon ruins, clouds, and a generated rune-stone material. Improve the explorer silhouette, the sentinels, collectible feedback, HUD objective text, pause/retry behavior, and responsive mobile HUD layout. Keep the static Three.js deployment compatible with the existing PlayHaven repository.

- **Assets:** `assets/skybound-rune-tile.jpg` as a repeating stone-rune material, intended to tile at approximately 3.5 world units per repeat across platform surfaces.
- **Verify:**
  - Movement, jump, sprint-dash, collisions, and fall recovery are responsive.
  - Shards, keys, checkpoints, hazards, sentinels, gates, and portal all visibly communicate their roles.
  - HUD updates without overlap and displays the active objective.
  - The Dev Studio creates, edits, exports, imports, and plays all supported object types.
  - No missing textures, JavaScript errors, or placeholder-only environment in a browser run.
  - The result is visually consistent with the generated sky-island reference: teal sky, mossy rune stone, cyan energy, warm gold accents, and a readable ascending route.
