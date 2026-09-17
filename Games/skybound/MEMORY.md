# Skybound Development Memory

The original prototype was a static Three.js module using CDN imports. It contained an attractive menu and level studio but its authored level had only platforms, keys, checkpoints, gates, and a goal—no shards, hazards, or enemies—so its HUD and score loop were incomplete. The `flash()` function referenced `ui.flash` even though that node was not indexed, causing damage to throw at runtime. Checkpoint activation updated `pstate.spawn`, but `resetPlayer()` always rebuilt its position from `level.spawn`, causing every recovery to return to the beginning.

The upgrade keeps the static deployment shape to preserve PlayHaven compatibility. It uses `assets/skybound-rune-tile.jpg`, a generated repository-local texture. The generated visual target is stored externally at `/home/ubuntu/skybound-art/skybound-reference.png` and is not needed by the runtime.
