# Disrupt 141-C — v3 handoff (September 2026)

Read this first. v3 re-checks the whole model against the 23-sheet working set and rebuilds it. v1 and v2
files are all still here (`04_model/viewer_standalone_v2.html`, `Disrupt_141C.glb`, `Disrupt_141C_v2_corrected.glb`).

## What was wrong in v2, and what v3 does

| # | Problem found by overlaying the model on A-111 / A-112 / A-113 | v3 fix |
| --- | --- | --- |
| 1 | **First and second floors ~4 ft south of the ground floor** (and ~1 % larger). A-112/A-113 are plotted at a different position than A-111; v1 computed a registration (`reg_floors.json`) but never applied it. Courtyard columns, stair and reception did not stack. | Both sheets registered to A-111 on 12–14 shared structural columns each (courtyard corners, reception corners, north row). Residual RMS **0.2 ft**. `floor_reg.json`: FF scale 0.9906, dx +10.3 px, dy −144.5 px; SF scale 0.9899, dx +28.8, dy −123.8. Every extraction runs on the registered sheets. |
| 2 | **Second-floor masjid / prayer area (Block D) missing.** v1 cut the reception rectangle out of the second floor too. | The masjid sits over the double-height reception (A-301: 22'-1" high, capped at +23'-1"). Only the first floor has the void (19'-3" × 21'-5"). |
| 3 | **Ground-floor north-west compound modelled as a closed box.** v1 grew the ground floor under the whole first floor. A-111 shows open compound there; the emergency exits open onto it. | Ground floor = A-111 only (plus ≤ 2 ft registration slivers). The first-floor block over the compound (≈1,540 sq ft) stands on 17 columns. |
| 4 | Courtyard / reception rectangles measured on the unregistered first floor (reception 3 ft too far south, gap between it and the courtyard). | Re-measured on A-111: courtyard x 74.7–97.5, y 51.0–79.5 (23'-0" × 28'-4"); reception x 74.8–95.3, y 29.6–51.0 (20'-6" × 21'-5"). |
| 5 | **Most new partitions missing** — the "proposed extension wall" (two lines with grey cross-hatch) was never extracted, only cyan existing walls and solid black. | `hatch.py` detects paired parallel lines with hatch between. Bath rooms, store rooms, workstation partitions etc. are now in. |
| 6 | Envelope was a solid band all round the floor plate, so doors in the plan were walls. | External wall only where the plan draws one (checked across the edge, so door widths are kept). Drawn gaps: open doorways with an 8'-0" lintel on the ground floor (≤ 5'-6", and the covered porch), glazed elsewhere. The GF courtyard edge is the glazed screen. |
| 7 | Floor levels simplified (x < 55 ⇒ +13'-11" etc.). | `levels.py`: every level from the LEV tags. GF west wing +2'-0" (to the 4'-6" passage), FF +12'-5" / +13'-3" (south-west) / +13'-11" / +16'-11" (north-west), SF +23'-10" / +25'-9". Wall tops follow the floor above. |
| 8 | Compound wall drawn as the 151 × 130 ft sheet window, not the drawn wall; guard post, foyer, porch, generator room, janitorial block missing or wrong; lawn modelled as a room. | Compound x 0.3–149.5, y 7.8–128.9 as drawn; foyer, covered porch (24'-7"), guard post 6'-0" × 6'-0" outside the gate, generator room and janitorial block added; lawn is open ground. |
| 9 | Stairs positioned from the old frame. | Main stair x 84.0–94.6, y 93.0–108.3 (to roof); west stair x 10.8–27.2, y 78.6–88.2 (GF compound → FF → SF +25'-9"); service stair x 140.2–147.8, y 93.4–107.7. |
| 10 | Room names on FF/SF mostly "Work stations" with no sizes; FF/SF labels in the wrong frame; > 63 rooms overflowed the 6-bit room id. | 151 rooms (GF 67, FF 50, SF 34) with the stated sizes, OCR'd off the registered sheets and hand-checked. Grid now 8-bit room id (plate bit 256, walk bit 512). |
| 11 | 13 rooms unreachable in the walkthrough. | 11 doorways opened automatically where door frames sealed a room (listed in `model_log_v3.json`); furniture layout keeps the walker's 0.6 ft clearance. Every room has a route; only the tiny guard W/C and the gen store are sealed as drawn (Fly mode gets in). |

Kept from v2 (client requests): no spiral stair, no parapets on the +12'-5" / +23'-10" roofs.

## Files

- `04_model/viewer_standalone.html` — **v3 viewer** (offline, model embedded).
- `04_model/Disrupt_141C_v3.glb` / `.obj` — v3 model for Blender / Twinmotion / D5 (feet, Z-up, same object names + `GF_Columns`, `Guard_Post`).
- `10_v3_rebuild/model_pipeline/` — `regsheets.py` (sheet registration), `hatch.py` (partitions), `extract_plans.py`, `plates.py`, `plate_edits.py` (every hand correction, with its drawing reference), `levels.py`, `build_v3.py`.
- `10_v3_rebuild/viewer/` — walk / room / furniture pipeline and `build_viewer_v3.py`.
- `10_v3_rebuild/verification/` — the model overlaid on each registered dimension plan, the three building maps, a cutaway and a walk view.

## Rebuild order

```
pdftoppm -r 500 -png -f 6 -l 8  <PDF> ...   # A-111/112/113
pdftoppm -r 500 -png -f 12 -l 14 <PDF> ...  # A-501/502/503
python3 regsheets.py       # registered sheets + composed RCP registration
python3 hatch.py ff-07 ff-08 a111-06
python3 extract_plans.py && python3 plates.py && python3 plate_edits.py && python3 build_v3.py
cd viewer/walk_pipeline && python3 smooth.py && python3 grid.py && python3 rooms.py && python3 export.py \
  && python3 furnish.py && python3 export.py && python3 write_glb.py
cd .. && python3 build_viewer_v3.py
```
Scripts carry absolute paths from the build session (`/home/claude/work/...`); change them at the top of each file.

## Still open (unchanged)

- **Scale**: still calibrated (41.70 px/ft), not dimensioned. One tape measurement of the front elevation settles it.
- **North point** assumed (entrance faces south).
- ~~Furniture illustrative~~ → traced from A-401/402/403 in v3.1.
- Some small partitions (WC cubicles, glass screens drawn as single lines) are not extracted.
- The second-floor strip x 37–46 between the south-west rooms is modelled as an open-air corridor (4'-9"); the X on A-113 there is read as open to sky.
- **Asbestos** cement sheet tagged at +35'-3": confirm before any roof work.


---

# v3.1 and v3.2 (September 2026): read this part first

v3.1 is a second accuracy pass plus furniture, people and equipment. v3.2 adds the **Architect view** and **Fly**.
`04_model/viewer_standalone.html` is now v3.2. The v3.0 viewer is kept as `viewer_standalone_v3.0.html`.
`04_model/Disrupt_141C_v3_final.glb` is the final building model with the cleaned wall boxes. Furniture and people are not in the GLB: the viewer builds them from `data/furniture.json`.

## v3.1: what changed

| # | Found | Fix |
| --- | --- | --- |
| 1 | v3.0 put the plates on a grid stretched to 41.85 px/ft, while the sheets are calibrated at 41.70 px/ft. Everything drifted up to about 1 ft towards the north. The drawing window also stopped at row 205, which cut off the north-west extension. | `frame.py` is the one frame for everything: PXPF 41.70, 0.5 ft cells, window x 400–6700, y 80–5625 px. Every hand-read coordinate goes through `T()` / `TR()`. The first-floor block over the NW compound now reaches its drawn north edge. |
| 2 | Grey stipple and text were being read as cyan "existing wall". | Stricter cyan test: `(b>140)&(g>140)&(r<150)&(b-r>50)&(g-r>50)`. |
| 3 | Plate gaps: the GF generator store and service stair, the SF steps to the west block and the SF 4-seat lounge were missing. Two SF plate holes. | Added in `plate_edits.py` (ADD_TRUE / HOLES_TRUE), each with its drawing reference. |
| 4 | Furniture was illustrative, and some desks and people were in the compound outside the building. | Seating traced from A-401/402/403 (`detect_furn.py`, then `regfurn.py` → `furn_detect.json`, `furn_reg.json`). Desks and tables are grouped from the traced chairs (`furnish4.py`). An item is placed only on a floor plate and on walkable floor. The only things outdoors are the drawn open-air ones: guard post, vending / tea counter, bench. |
| 5 | People and the generator looked like placeholders. | Procedural people (`m_people.js`): shalwar kameez, hijab and office wear, poses for typing, phone, meeting and standing. Department equipment (`m_furn.js`, `furnish3.py`): server racks, UPS, gym, board room, gaming room, and prayer rugs facing the qibla (north-west). Generator with canopy, exhaust, fuel tank and cable tray. About 3.7 M triangles in total. |

Checks after v3.2 (`test_route.py`, `conn.py`):

- 154 rooms. Every room has a walking route except "Main gate & guard post", which is outside by design.
- Reachability failures: 0.

## v3.2: Architect view (📐) and Fly (✈), for checking the building during construction

**📐 Architect view** is on the header, in Views → Mode, and in the walk bar.

- **Look:** a white model with black linework. Line edges come from a normal and depth post-process.
- **Plan cut:**
  - Ground: +6'-0"
  - First: +20'-5"
  - Second: +29'-9"
  - Full: no cut
  - Auto: follows the floor the camera is on
- **Drawings on the floors:** A-111, A-112 and A-113, registered to the model, are laid on each floor only where that floor exists. The whole A-111 sheet (gate, lawns, ramps) is on the ground.
- **Wall hatch and colours follow the A-111 legend.** Cut walls show their hatch from above.
  - Existing wall: cyan cross-hatch.
  - Proposed extension wall: grey cross-hatch. Solid black new partitions also count here.
  - Envelope not drawn on the plan: dark.
- **Columns** come from the drawings: grey = existing, blue = proposed.
- **Room tags:** room name, stated size and FFL. Tags are thinned out so they don't overlap.
- **Hover read-out:** room, floor, FFL, and the X / Y / height under the cursor. X and Y are in feet in the model frame (the same frame as the GLB).
- **📏 Measure:** click two points. Hold Shift on the second click to lock to one axis. The result shows the total and its E–W / N–S / up parts, snapped to ½". Check: the reception measures **20'-6"** wall to wall, matching the 20'-6" on A-111.
- **Walking inside in Architect view:** with the cut on Auto, the ceiling is removed just under the slab above. The drawing and its dimensions show on the floor. Measuring works here too: click without dragging.
- **Views:** "Plan (top)" is a true plan, looking straight down. "Plan 3/4" is the architect axonometric.

**✈ Fly** (header button, walk-bar button, or F while walking) works in both Architect and realistic mode.

- **Start:** south of the gate, about 48 ft up.
- **Controls:**
  - W A S D: move
  - drag: look
  - E or Space: up
  - Q or C: down
  - Shift: fast
  - F: land
- **Behaviour:**
  - Speed increases with altitude.
  - The altitude is shown in the location card.
  - In Architect view on Auto: above the roof you get the second-floor plan cut. Flying low inside a floor gives the ceiling-off cut for that floor.

**Code:** `10_v3_rebuild/viewer/src/m_arch.js`. It is spliced into `viewer_app.js` between `// @@ARCH_BEGIN` and `// @@ARCH_END` by `splice_arch.sh`. Its data comes from `walk_pipeline/arch_prep.py`:

- `arch_data.json`: wall classes and columns.
- `arch_under.json`: the underlay JPEGs.

Useful console hooks, used by the test scripts:

- `__api.arch(true)`
- `__api.archCut("FF")`
- `__api.fly()`
- `__api.setView("planTop")`
- `__api.archState()`
- `__api.project(x,y,z)`

## v3.2 rebuild order (after the v3 model steps above)

```
cd viewer/walk_pipeline
python3 smooth.py && python3 grid.py && python3 rooms.py && python3 export.py
python3 furnish4.py && python3 export.py && python3 write_glb.py     # traced furniture + people
python3 arch_prep.py                                                 # architect-view data
cd .. && bash splice.sh && bash splice_arch.sh && python3 build_viewer_v3.py
```

`splice.sh` inserts `m_core/m_people/m_furn/m_build.js`. `viewer_app.js` in the archive already contains the spliced result.

## Still open

- **Scale** is still calibrated at 41.70 px/ft, not dimensioned. Wall-to-wall checks match the drawn dimensions (reception 20'-6"). One tape measurement on site settles it.
- **North point** is assumed: the entrance faces south.
- WC cubicles and single-line glass screens are still not extracted.
- **Asbestos** cement sheet tagged at +35'-3": confirm before any roof work.


---

# v3.3 (September 2026): room-by-room check against A-101 / A-102 / A-103, schedules A-601 / A-602 / A-603

**Read this part first.** The full table is `10_v3_rebuild/v3.3_room_check.md` (and `.csv`).

## Why rooms looked "missing" on the ground floor

Most of the 10 ground-floor rooms reported missing were already in the data and the 3D model: CCTV room, shower & changing, workshop, procurement office, medical assist, janitorial, female toilet, both lobbies, both huddle hubs, water pumps & tools, sitting.

The building map drew labels biggest room first and **dropped any label that collided** with one already placed, so small rooms lost their names, more so on smaller screens.

v3.3 changes how labels are placed:

- **Building map** (`src/m_map.js`, spliced between `// @@MAP_BEGIN` / `// @@MAP_END` by `splice_map.sh`):
  - Every room is labelled. The map tries the drawing's label position, then the room's inner point, shrinking the font to 9 px.
  - A room that still does not fit gets a numbered marker. It is also listed in "Zoom in to read these" (top-left); clicking an entry zooms to the room.
  - Zoom: mouse wheel, pinch, + / − / ⤢.
  - Pan: drag.
  - **Drawing** tick box: lays the registered A-111 / A-112 / A-113 under the colours.
- **Search:** finds rooms by name or by size, e.g. `13'-0"`. It also finds drawing notes (CB, 4S / 6S, exits, counters, voids).
- **Architect view tags:**
  - Every room gets a tag, plus the drawing notes.
  - A tag that doesn't fit falls back to a compact form (name only) or to the room's inner point.
  - "All (overlap)" shows every tag regardless of collisions.
  - The bar shows how many rooms are tagged at the current zoom.
- **Cutaway 3D labels:** shown for every named room larger than 18 sq ft (was 70).

## Data changes

- **Anchors** (`walk_pipeline/anchors.py`: `PATCH`, `MOVE`, `A_V33`, `NOTES`, `CAP_BY_NAME`):
  - Names and sizes follow the drawings.
  - New rooms added.
  - Drawing notes are exported as `floors[k].notes` in `walkdata.json`.
  - Each room now also carries `a` (area), `p` (inner label point) and `b` (bounding box).
- **Room regions** (`rooms.py`): door-size gaps (≤ 3'-6") between collinear wall runs are closed for the region growth only. A label region now stops at its door; walking is unchanged.
- **Stay lev. 9'-4" × 8'-8"** (A-112, west-stair landing with the fire exit): a landing slab was added to the model.
  - Where: `plate_edits.py` ADD_TRUE FF.
  - Effect: +81 sq ft FF plate and one more column under it.
- **First-floor glazing** now sits on a 1'-0" upstand with its head at 8'-0". This follows A-602 W1 / W2 / W3 (7'-0" high on 1'-0"). See `build_v3.py`.
- **Furniture:**
  - Narrow passages (under 60 sq ft) get no plants or standing people.
  - The refreshment tea counter falls back to 4'-6" when 6'-0" doesn't fit.

## Where the drawings and the request disagreed (drawing values kept)

| Room | Size given in the request | Size on the drawings |
| --- | --- | --- |
| Medical assist | 15'-6" | 19'-4" × 8'-4" (A-101 and A-111) |
| Lobbies | 8'-6", 8'-3" | 8'-1" × 6'-9" and 11'-6" × 6'-3" |
| Huddle hubs | 10'-1" × 11'-10", 6'-0" × 13'-6" | 19'-7" × 11'-10" and 8'-0" × 13'-5" |

- The drawing name is "WATER PUMPS & TOOLS", with "U G W TANK" drawn under it.
- "Male toilet" is kept: A-101 draws the WCs without a name, but A-111 names it MALE TOILET 17'-9" × 16'-7".
- The refreshment area (red note) is a separate open strip east of medical assist. Both are shown.

## Door / window schedules

**A-601 (ground floor; the sheet itself is numbered A-401)**

- Doors: rows sum to 30 = TOTAL 30.
- Windows: 4 = TOTAL 4.
- Against the plan tags on A-101:
  - FG3 4'-0" × 7'-0" is tagged **twice** on A-101 (south of the huddle, and at admin check in / out) but scheduled 01. The plan shows 5 windows, not 4.
  - GDW 7'-6" is listed for "READING ROOM", but A-101 tags GDW on the 8'-3" × 5'-0" huddle by the board room. The reading room carries SDF 16'-0".
  - The gaming-room door is tagged "D1" with the size 3'-6" × 8'-0". That size is D2, and A-601 lists GAME ROOM under D2. This is a tag typo.
- Other counts on A-101 match the schedule:
  - D2: 7 (including the gaming room)
  - D3: 9
  - PVD: 7 (3 changing, 3 commode, janitorial)
  - DD1 / DD2 / DD3: 1 each
  - D1: 2
- Model openings at the A-101 tags were measured automatically (to ½ ft).
  - 10 of 16 are within ±6" of the scheduled width.
  - Still to check:

| Door | Location (x, y) | Model opening | Scheduled |
| --- | --- | --- | --- |
| D2 procurement office | (141, 45) | 2'-0" | 3'-6" |
| D2 admin dining | (136, 92) | 4'-6" | 3'-6" |
| D3 admin / guard washroom | (139, 82) | 1'-6" | 3'-0" |
| D3 gen store | (141, 112) | 5'-6" | 3'-0" |
| DD2 sitting | (78, 108) | 10'-6" | 6'-0" |
| GDW huddle | (109, 30) | 6'-6" | 7'-6" |

**A-602 (first floor)**

- The doors table sums to **32 while TOTAL says 23** (a known drawing error).
- Also, GDW 19'-0" is 01 in the table but its elevation note lists meeting room + meeting room = 02.
- Windows: 3 + 2 + 4 = 9 = TOTAL.
- A-102 carries no door tags, so doors can only be checked against the room lists.

**A-603 (second floor)**

- 2 + 1 + 1 + 2 + 4 + 3 + 10 = 23 = TOTAL.
- There are no windows in the schedule.

**Marks are per sheet, not per project.** The same mark has different sizes on different floors:

| Mark | A-601 (GF) | A-602 (FF) | A-603 (SF) |
| --- | --- | --- | --- |
| D1 | 4'-0" | 3'-6" | 4'-0" |
| D2 | 3'-6" | 3'-0" | 3'-6" |
| GDW1 | — | 9'-6" | 7'-0" |
| PVD | 2'-3" | 2'-0" | 2'-0" |

- All scheduled doors are 8'-0" high. The model's door head is 8'-0".

Other drawing errors (not model errors): A-000 lists Section A-A as "5-301", which should be A-301.

## Still open after v3.3

- The six GF door openings listed above that differ from the schedule.
- The **Stay lev.** landing's south edge follows the double line drawn on A-112 and is modelled as a wall. It may be a railing; confirm on site.
- The landing's 4'-0" double door into the stair enclosure is glazed, like every other first-floor envelope gap.

## Checks after v3.3

- `test_route.py`: 159 rooms. Every room has a walking route except the main gate & guard post, which is outside by design.
- `conn.py` is a stricter 0.75 ft-body check. It flags the gaming room and the new 4'-0" basin passage because their shared door strip is narrow. The viewer's own walker (0.6 ft) reaches both.

## v3.3 rebuild order

```
cd model_pipeline && python3 plate_edits.py && python3 build_v3.py      # only if plates / walls change
cd ../viewer/walk_pipeline
python3 smooth.py && python3 grid.py && python3 rooms.py && python3 export.py
python3 furnish4.py && python3 export.py && python3 write_glb.py && python3 arch_prep.py
cd .. && bash splice.sh && bash splice_arch.sh && bash splice_map.sh && python3 build_viewer_v3.py
```

The key plans were registered onto the dimension sheets with AKAZE + RANSAC (`10_v3_rebuild/key_plan_check/reg101.py`, `reg_key.json`; residual under 1 px). The overlays used for the room-by-room read are in the same folder.


---

# v3.4 (September 2026): building map regions, labels and sizes

The v3.2 and v3.3 viewer files are not repeated in this archive; they are in the v3.2 / v3.3 ZIPs.

Only map data changed: room regions, labels and room texts. **No 3D walls, slabs or furniture were touched.**
The model GLB is the v3.3 one, and furniture.json and walkF_*.npy are unchanged.

## 1. Rooms whose colour now reaches the drawn walls

`walk_pipeline/anchors.py` `FILL` holds rectangles read on A-111 / A-112 / A-113 in model feet. `rooms.py` gives every floor cell inside them to the room.

- Thin partitions inside a room's outline (cubicle walls) count in its area. The map still draws them as walls: grid bit 1024 marks a wall cell (`export.py`).
- A filled room is exactly its outline. Cells it had grown into outside the outline go back to the nearest other room.

| Room | v3.3 region | v3.4 region | Drawing |
| --- | --- | --- | --- |
| GF Courtyard | 260 sq ft | 682 sq ft (+4.5 %) | 23'-0" × 28'-4" = 652 |
| GF Board room | 257 | 395 (−6.7 %) | 23'-6" × 18'-0" = 423 |
| GF Male toilet | 132 | 277 (−5.8 %) | 17'-9" × 16'-7" = 294 |
| FF Workstation (below the IT room) | 57 | 196 (+2.1 %) | 16'-6" × 11'-8" = 192 |
| SF Male bath room | 117 | 214 (−6.6 %) | 13'-2" × 17'-5" = 229 |
| SF Rooftop cafeteria | 764 | 1249 (−2.3 %) | 24'-1" × 53'-1" = 1278 |
| SF Recreational area (its cells had sat in the cafeteria) | 490 | 488 (−6.4 %) | 27'-2" × 19'-2" = 521 |

What changed around these rooms:

- The **SF 4'-0" wide passage** is now only the 4'-2" strip on the courtyard side (x 97.3–101.5), 137 sq ft. The rest went to the cafeteria.
- **GF courtyard:** A-111 dimensions the courtyard as 4'-6" + 18'-8" by 5'-9" + 22'-7". That means its 23'-0" × 28'-4" includes the 4'-6" and 5'-9" passages. Both passages are now drawing notes inside the courtyard, not separate rooms.
- **FF "Huddle hub" (no size):** it is a marked table area inside Workstation 16'-6" × 11'-8". It is now a note too.

## 2. Markers never cover a label

`src/m_map.js` works in three passes:

1. Every room label is placed where it fits.
2. Rooms left over get a numbered marker in a free spot: inside the room first, then within 66 px with a leader line. If there is no free spot, the room is only listed and never drawn over a label.
3. The drawing notes are placed last.

Testing: every drawn rectangle was checked pairwise on GF / FF / SF at 1440×900, 1100×700 and 900×640, with 0 overlaps (`tests/t_ovl.py`). Markers also stay clear of the north arrow, the scale bar, the zoom buttons and the list panel. "Female staff common room / prayer area" gets its full label at all three sizes. The "Zoom in to read these" list starts folded below 1300 px wide. Screenshots with the drawing overlay are `verification/v34_*.jpg`.

## 3. Sizes completed

`anchors.py` `SIZE34` holds the completed sizes. Anything with no dimension on the drawing now reads "size not given on drawing":

| Room | v3.3 size text | v3.4 size text | Source |
| --- | --- | --- | --- |
| SF Work stations (22 pax) | 12'-11" | 12'-11" × 14'-9" | A-113: 8'-3" + 3'-0" + 3'-6" |
| FF Huddle hub (the one by the 18'-2" × 25'-7" work stations) | 7'-0" | 7'-0" × ≈3'-4" | The depth figure is hidden under the label on A-112; 3'-4" is measured. 4S. |
| FF Huddle hub (inside Workstation 16'-6" × 11'-8") | — | size not given on drawing | Now a note |
| GF Entrance porch | 24'-7" wide | 24'-7" × 8'-6" | Plus 3'-8" of steps |
| SF Steps to the west block | — | 12'-1" × 29'-0" | A-113 |
| SF Huddle hub (10 pax) | — | size not given on drawing | A-113 dimensions the whole room as Work stations 19'-5" × 15'-2" |
| SF 4S booth | — | size not given on drawing | About 7'-4" × 3'-9" measured |
| GF CB booths | 3'-4" wide | 3'-4" × 3'-4" | — |

Other rows now marked "size not given on drawing":

- GF: green lawn, open to sky, refreshment area, compound, north-west compound, service stair lobby
- FF: green areas
- SF: fire exit

Passages, whose drawings give only the width, now read "… wide (length not given on drawing)".

## Rooms still far from their drawn size

These regions are not in the v3.4 scope. They are left as grown from the drawn door openings; the list is in `v3.4_region_check.csv`.

- Some are small booths whose region spills into the space in front of them.
- Some are open-plan areas sharing one space with a neighbour.

The same `FILL` mechanism fixes any of them: add the room's rectangles and rerun `rooms.py`, then `export.py`.

## Checks after v3.4

- `test_route.py`: 156 rooms (3 spaces became notes). Every room has a route except the main gate, which is outside by design.

## v3.4 rebuild order (map data only)

```
cd viewer/walk_pipeline && python3 rooms.py && python3 export.py
cd .. && bash splice_map.sh && bash splice_arch.sh && python3 build_viewer_v3.py
```
