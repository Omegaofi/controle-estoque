# MERIDIAN — 12s brand film (1920×1080 · 30fps · 360 frames)

Fictional infrastructure-tech brand. One motif carries the whole film: **a single
horizontal line of light** (the meridian). It opens the film, rebuilds itself as the
edges of glass layers and as orbits, and closes as the equator of the logo mark.

## Visual identity
- Palette: ink `#04050A`, fog `#0B0F1A`, text `#EEF2F8`, one cool accent `#8FB8FF`, hot core `#E4EEFF`.
- Type: Inter Display (500 headlines, tight −0.045em tracking), Inter body, DejaVu Sans Mono for HUD labels (+0.28em tracking, uppercase).
- Light: one key light per scene that moves smoothly between scenes, a restrained bloom, a vignette and animated film grain over every frame.
- HUD: crop marks, timecode, scene index and Greenwich coordinates, all quiet and in the corners, giving the negative space a frame to sit in.

## Timeline (global frames)
| # | Scene | Frames | Beat | Hand-off |
|---|-------|--------|------|----------|
| 1 | Signal | 0–108 | Point flare → line of light ignites → splits into an opening slit that reveals "Precision is / engineered." word by word | Camera pushes *through* the type (z +900, blur in) |
| 2 | Architecture | 84–205 | A five-layer glass stack flies in from depth; layers spring apart; perspective grid and three-depth particle parallax; "Every layer, / considered." | Stack collapses flat, rotates to face camera and shrinks to a glowing tile |
| 3 | Scale | 192–300 | Tile morphs into a core; three tilted orbits draw on, with comets and nodes; counters for throughput and latency; "Built to scale." | Orbits flatten to face camera and converge to one circle at r=100 |
| 4 | Resolve | 288–360 | Circle becomes the mark (a meridian ellipse springs open, the equator line returns); wordmark letters stagger out from the centre with tracking settling; tagline; specular sweep; hold | — |

## Motion language
- Entrances use springs (soft: d20/s90, heavy: d28/s70/m1.4); exits use expo-in. Nothing fades in on opacity alone; every reveal pairs opacity with a mask, blur, transform or tracking change.
- Words rise through overflow masks, starting at a slight rotation and 10px of blur, and settle on a spring.
- Depth comes from real CSS 3D perspective: the camera moves the world, and layers at different Z produce true parallax.
