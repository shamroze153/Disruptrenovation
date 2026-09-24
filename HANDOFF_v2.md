# Disrupt 141-C — v2 handoff

Read this before changing anything. It records what v2 changed on top of the v1 reconstruction, why, and where every piece lives.

## Status

Working and published. The client (Shamroze Nasir, Disrupt) uses the viewer to explain the building to non-technical staff. Every request so far has come as screenshots plus short instructions ("remove this", "make it more real"), so change exactly what is pointed at and keep everything else as it is.

## Features in the v2 viewer (`04_model/viewer_standalone.html`)

1. **Lighting.** Real sun position for Karachi (24.86° N) by date and time, a day timeline with play, 8 presets (Sunrise … Night, Studio), sky dome with haze, stars at night, interior lights, and a sun-path diagram. The orientation is still the v1 assumption: entrance faces south, +Y = north.
2. **Walkthrough** (🚶 Walk inside). First person at eye height 5'-3". WASD/arrows, drag or double-click for mouse-look, Space to jump, **F to fly through walls** (Space/C up/down), Shift to run. Mobile has a joystick and ▲▼ fly buttons. There is collision, a room-name card, a minimap you can click to jump, stair prompts (stairs teleport between floors), a Day/Night toggle and a 15-stop guided tour.
3. **Building map** (🗺, or M while walking). A colour-coded directory plan per floor with search. Pick a room → "Show me the way" draws animated arrows on the floor (A* on the walk grid, across floors via stairs), or "Take me there" teleports.
4. **Furniture and people.** About 330 seated/standing figures, 220 desks, meeting tables, cafeteria tables, sofas, gym treadmills, masjid rugs facing west, server racks and more. **Illustrative only**: laid out automatically by room type, *not* traced from the furniture plans A-401/402/403. "Furniture & people" is a layer toggle.
5. **Realism.** Plaster noise, floor-contact shading and skirting, 2-ft ceiling tiles with light panels, porcelain floor tiles, aluminium window frames and mullions, grass on the lawns, the courtyard tree in the drawn circular planter, a "Main entrance" pin and a compass.
6. **Room labels.** 122 named spaces across three floors, with stated sizes where the drawings give them.

## Geometry changes vs the v1 GLB (applied in the viewer and baked into `Disrupt_141C_v2_corrected.glb`)

| Change | Why |
| --- | --- |
| Slabs, external walls, internal walls and the +35'-3" roof and parapet rebuilt as straight axis-aligned runs (`smooth.py`) | The v1 6" raster produced stair-stepped walls that read as vertical stripes. Plate IoU against v1 is ~98.5%; window openings keep the v1 z-profiles |
| Dashed wall fragments merged into solid runs (gaps ≤ 2 ft) | They rendered as stray posts |
| Reception made double height (22'-1", capped at +23'-1") and the courtyard opened to the sky | A-301. v1 wrongly capped both with the +12'-5" roof |
| `Roof_Level_12-5_Parapet` and `Roof_Level_23-10_Parapet` **removed** | Client request: not on the drawings. Only the +39'-3" parapet is stated |
| Spiral stair at the south-east corner (≈143.5, 18.5) **removed** | Client request |
| +12'-5" and +23'-10" roof slab outlines straightened | Same stepping issue |

`Disrupt_141C.glb` / `.obj` are still the untouched v1 files. The viewer loads v1 and applies the v2 corrections at runtime from `08_viewer_v2/data/clean_geom.json`.

## Room names — how they were placed

The PDF has no text layer. Room names were OCR'd (tesseract) from A-111/112/113 rendered at 500 dpi, converted to model feet (41.70 px/ft, crop origin 400,205), then curated by hand in `walk_pipeline/anchors.py` (name, x, y, stated size, kind). Rooms are regions of the walk grid, each assigned to its nearest anchor by walking distance (`rooms.py`). So boundaries near doorways are approximate. To rename or move a room, edit `anchors.py` and re-run the pipeline.

## Rebuilding

```
cd 08_viewer_v2/walk_pipeline
python3 smooth.py        # clean geometry          -> clean_geom.json
python3 grid.py          # walk grids per floor     -> grids.npz
python3 rooms.py         # room regions             -> lab_*.npy, seeds.json
python3 export.py        # walk data                -> walkdata.json
python3 furnish.py       # furniture, blocks walking -> furniture.json, walkF_*.npy
python3 export.py        # re-export with furniture
cp clean_geom.json walkdata.json furniture.json ../data/
python3 write_glb.py     # corrected GLB            -> 04_model/Disrupt_141C_v2_corrected.glb
cd .. && python3 build_viewer.py   # -> 04_model/viewer_standalone.html
```

Needs numpy, scipy, scikit-image, opencv-python. `build_viewer.py` takes the three.js bundle and embedded v1 model from `viewer_standalone_v1_original.html`, so that file must stay. It reproduces the published viewer byte for byte.

JS layout (`08_viewer_v2/src/viewer_app.js` is the single source of truth; the other .js files are the modules as first written and are already merged in): lighting/sky → realism layer → map & wayfinding → furniture → walkthrough → `window.__api` (test hooks: `enterWalk`, `tourGo`, `setRoute`, `openMap`, `walkTo`, …).

## Open items and honest limits

- **Scale.** There is still no overall dimension in the set. One tape measurement of the front elevation would make it dimensioned rather than calibrated (v1 open item, unchanged).
- **North point.** It is assumed. Confirm the street side; every shadow and the sun study depend on it.
- **Furniture** is illustrative. Tracing A-401/402/403 would make it accurate.
- **Doors.** Some rooms (e.g. the FF server room) have no door gap in the extracted walls. Fly mode gets in, and the route tells the user to use it.
- **Photo-realism** needs Twinmotion / D5 / Unreal with the v2 GLB. Prompts are in `03_reports/FULL_PROJECT_REPORT.md` Part F.
- The drawing register discrepancies from v1 have still not been sent back to Ingenious Design Studio.
- **Asbestos** cement sheet is tagged on the roof at +35'-3". Confirm with the consultant before any physical work.
