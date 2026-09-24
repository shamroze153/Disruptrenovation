# Disrupt 141-C — Complete Project Archive (v3.4)

> **v3.4 update (September 2026).** Building map fixes only; the 3D model is unchanged.
> - Six rooms (GF courtyard, board room, male toilet; FF workstation 16'-6" × 11'-8"; SF male bath, rooftop cafeteria) now colour their whole drawn outline, within ±10 % of the drawn area.
> - Number markers never cover a label.
> - Every size is complete, or reads "size not given on drawing".
> - Details: the v3.4 part at the end of `HANDOFF_v3.md`.

# (v3.3 notes)

> **v3.3 update (September 2026).** Room-by-room check against the key plans A-101 / A-102 / A-103 and the door / window schedules A-601 / A-602 / A-603.
> - Every room is now labelled on the building map (zoom, pan, drawing underlay), in search (by name or size) and in the Architect view.
> - Names and sizes follow the drawings; missing rooms and drawing notes (CB, 4S / 6S, exits, counters) were added.
> - The first-floor "Stay lev." landing was added to the model, and the first-floor windows now sit on a 1'-0" upstand (A-602).
> - Full table: `10_v3_rebuild/v3.3_room_check.md`. Details: the v3.3 part at the end of `HANDOFF_v3.md`.

# (v3.2 notes)

> **v3.2 update (September 2026).** Adds the **📐 Architect view** for construction checks and **✈ Fly**.
> - The Architect view shows a plan cut per floor, the registered drawings A-111/112/113 on each floor, wall hatch from the drawing legend, and existing and proposed columns.
> - Room tags give the stated size and FFL. Hovering shows X/Y and height, and a tape measure reads to ½".
> - Fly is a drone camera over and through the building.
> - v3.1 before it corrected the coordinate frame and the north-west extension, traced the furniture from A-401/402/403, and added realistic people, department equipment and the generator.
> - Nobody and nothing is placed outside the building except drawn open-air items.
> **If you are an AI assistant picking this up: read the v3.1/v3.2 part at the end of `HANDOFF_v3.md` first.**
>
> `04_model/viewer_standalone.html` is the v3.2 viewer. `04_model/Disrupt_141C_v3_final.glb` is the final building model (cleaned walls, feet, Z-up) for Blender / Twinmotion / D5. The furniture and people are generated inside the viewer from `furniture.json`.

# (v3 notes)

> **v3 update (September 2026).** The model was re-checked against every plan sheet and rebuilt: the first and
> second floors are now registered to the ground floor (they were ~4 ft out), the second-floor masjid is back,
> the north-west compound is open ground, the new partitions are in, and every floor level follows the LEV tags.
> **If you are an AI assistant picking this up: read `HANDOFF_v3.md` first, then `HANDOFF_v2.md`, then this file.**
>
> `04_model/viewer_standalone.html` is now the v3 viewer (v2 kept as `viewer_standalone_v2.html`).
> `04_model/Disrupt_141C_v3.glb` is the v3 model. `10_v3_rebuild/` holds the v3 pipeline and the verification overlays.

# (v2 notes)

> **v2 update (September 2026).** Everything from v1 is still here unchanged. v2 adds an interactive
> walkthrough, a building directory map with wayfinding, furniture and people, lighting and a corrected model.
> **If you are an AI assistant picking this up: read `HANDOFF_v2.md` first, then this file.**

## What's new in v2, in one place

| | |
| --- | --- |
| `04_model/viewer_standalone.html` | **The v2 viewer.** Open in any browser, offline. (v1 kept as `viewer_standalone_v1_original.html`.) |
| `04_model/Disrupt_141C_v2_corrected.glb` | Corrected model with all v2 geometry fixes baked in, for Blender / Twinmotion / D5. Same units (feet, Z-up) and object names; the two low-roof parapets are gone. |
| `08_viewer_v2/` | Viewer source, data and the walk/room/furniture pipeline. `build_viewer.py` rebuilds the viewer exactly. |
| `09_v2_screens/` | Reference screenshots of v2. |

---

# v1 notes (original archive)

**Everything from this project, self-contained. Nothing external is required.**

If you are an AI assistant picking this up: read this file first, then
`03_reports/FULL_PROJECT_REPORT.md`. That report contains the complete drawing
analysis and every modelling decision. You can continue the work from here
without re-deriving anything.

---

## What this project is

A 3D architectural reconstruction of the **Disrupt 141-C** building (Karachi) from a
23-sheet architectural working drawing set produced by Ingenious Design Studio,
February 2026. The building is an existing three-storey courtyard office building
being refurbished — the drawings are a survey plus proposed internal alterations,
not a new-build design.

**Status: complete.** The model, renders and documentation are all finished.
One open item remains (see "Open item" below).

---

## Folder guide

| Folder | Contents |
| --- | --- |
| `01_source_drawings/` | The original 23-page PDF working set — the source of truth |
| `02_briefs/` | The two project briefs exactly as issued by the client, plus a PDF of them |
| `03_reports/` | **FULL_PROJECT_REPORT.md** — drawing analysis + Parts A–G reconstruction record |
| `04_model/` | The 3D model (GLB, OBJ) and a standalone offline viewer |
| `05_renders/` | 12 rendered views at 1920×1200 |
| `06_pipeline/` | Every script that produced the model — it is fully procedural and re-runnable |
| `07_working_data/` | Intermediate extraction data: wall masks, floor plates, calibration crops |

---

## The model

**`04_model/Disrupt_141C.glb`** — binary glTF, 26 named objects, 49,068 triangles.
**`04_model/Disrupt_141C.obj`** — universal fallback.

- **Units: feet. Up axis: Z.** Origin at the south-west corner of the compound.
- X runs east 0–151.08 ft, Y runs north 0–129.98 ft, Z is height above road datum.
- Opens in Blender, 3ds Max, Revit, Twinmotion, D5 Render, Unreal, or any web viewer.
- To scale to metres in Blender: multiply by 0.3048.

**`04_model/viewer_standalone.html`** — open this file in any browser, offline.
The model is embedded inside it. Orbit, toggle the seven layer groups, switch between
eight camera presets, and switch between materials / white model / three floor cutaways /
exploded axonometric.

### Object names

```
GF_Slab  GF_External_Walls  GF_Glazing  GF_Internal_Walls  GF_Stairs
FF_Slab  FF_External_Walls  FF_Glazing  FF_Internal_Walls  FF_Stairs
SF_Slab  SF_External_Walls  SF_Glazing  SF_Internal_Walls  SF_Stairs
Roof_Level_12-5_Slab      Roof_Level_12-5_Parapet
Roof_Level_23-10_Slab     Roof_Level_23-10_Parapet
Roof_Level_35-3_Slab      Roof_Level_35-3_Parapet
Roof_Corrugated_Sheet     Courtyard_Paving  Courtyard_Glazing
Site_Boundary_Wall        Ground_Apron
```

---

## The key facts, in one place

| | |
| --- | --- |
| Storeys | 3, plus roof |
| Floor-to-floor | **11'-5"** on all three storeys (constant, stated) |
| Ground FFL | +1'-0" (west wing +2'-0") |
| First FFL | +12'-5" (west wing +13'-11" and +16'-11") |
| Second FFL | +23'-10" (west wing +25'-9") |
| Roof slab | +35'-3" |
| Parapet | +39'-3" |
| Clear height | 10'-8" to soffit, 10'-2" under beams |
| Slab / beam | 6" / 9" |
| Doors | 8'-0" high throughout |
| Windows | 7'-0" high on a 1'-0" sill |
| Stairs | 5¾" riser, 1'-0" tread |
| Courtyard | 23'-0" × 28'-4", full height, open to sky, glazed 34'-0" |
| Reception | 20'-6" × 21'-5", 22'-1" high (double height) |
| Building envelope | ≈ 148' × 127'-6" within a compound of ≈ 151' × 130' |
| Gross internal area | ≈ 37,600 sq ft over three floors |

---

## How the geometry was derived (important)

**Vertical geometry is exact.** The level ladder on the elevations and sections is
internally consistent to the inch and was used as drawn.

**Horizontal geometry is calibrated, not dimensioned.** The drawings are stamped NTS
and contain **no overall perimeter dimension anywhere**. So the plan geometry was
rasterised directly from the drawings rather than hand-modelled:

1. The dimension plans (A-111/112/113) colour-code existing walls in cyan and new walls
   in solid black — these layers were extracted by colour.
2. The reflected ceiling plans (A-501/502/503) fill the enclosed floor area in grey —
   this gives the floor plate per storey directly.
3. Both were converted at **41.70 pixels per foot at 500 dpi (1" = 12'-0")**, verified
   against three stated dimensions on three different sheets to better than 0.5%.
4. Facade openings were detected on the four elevations, each calibrated against its own
   level ladder (the four elevations are plotted at four different scales: 29.05, 31.72,
   38.98 and 39.62 px/ft).

**Independent cross-check that validates the whole approach:** first-floor window heads
and sills derived from the elevations landed at 13.36–20.42 ft, against 13.42–20.42 ft
predicted from the schedules. A 0.06 ft agreement that was not built in.

---

## Open item — the one thing that would improve this

**There is no overall building dimension anywhere in the 23 sheets.** The whole model's
absolute scale rests on the calibration above.

**One tape measurement of the front elevation length** would convert this from a
*calibrated* reconstruction to a *dimensioned* one. Because the pipeline is procedural,
nothing else would need to change — edit the constant and re-run `build_model.py`.

Also worth sending back to Ingenious Design Studio:
- Front parapet is tagged +38'-3" in the body of A-201 but +39'-3" in its own ladder and on A-202/A-203 (modelled as +39'-3")
- The elevation names in the A-000 register are one sheet out of step with the sheet titles
- Door schedules are numbered A-601/602/603 in the register but A-401/402(A)/403 on the sheets, colliding with the furniture plans

---

## Rebuilding the model from scratch

The pipeline in `06_pipeline/` is complete and deterministic. Requirements:

```
python3 -m pip install numpy opencv-python pillow scipy trimesh shapely mapbox_earcut playwright
# plus poppler-utils for pdftoppm
```

Order of operations:

```
pdftoppm -r 500 -png <source PDF> ...   # render the sheets
python3 extract_plans.py     # wall masks from A-111/112/113
python3 plates.py            # floor plates from A-501/502/503, registered
python3 elevations.py        # facade openings from A-201..A-204
python3 build_model.py       # assembles and exports GLB + OBJ
python3 qa.py                # QA data
python3 assemble.py          # builds the standalone viewer
python3 shoot.py             # renders the 12 views headlessly via Chromium
```

`build_model.py` holds every decision as a named constant at the top of the file —
levels, the courtyard and reception rectangles, stair positions, the sheet-roof zone.
Change one and re-run; the whole model follows.

**Known limitation:** wall edges carry a faint 6" stepping because the plan is rasterised
at 6" resolution. Reduce `CELL` in `build_model.py` for smoother silhouettes at the cost
of triangle count.

---

## Renders

| File | View |
| --- | --- |
| 01 | Front elevation, near-orthographic — overlays A-201 |
| 02 | Front three-quarter |
| 03 | Rear three-quarter |
| 04 | Left (west) side |
| 05 | Right (east) side — the service face |
| 06 | High three-quarter aerial |
| 07 | Eye level at the entrance |
| 08 | White-model axonometric |
| 09 | Ground floor cutaway (labelled) |
| 10 | First floor cutaway |
| 11 | Second floor cutaway |
| 12 | Exploded floor-by-floor axonometric |

All rendered from the model itself. No image generation was used anywhere in this project.

---

## Production rendering prompts

Ready-to-use prompts for Midjourney, D5 Render / Twinmotion, and Blender are in
`03_reports/FULL_PROJECT_REPORT.md`, Part F. They are written specifically for this
building, with negative prompts for the features these tools habitually invent.

---

## One safety note

The sections tag **asbestos cement sheet** as existing roofing at +35'-3". If this model
is ever used to brief physical work, confirm the presence of asbestos with the consultant
before anyone touches that roof.
