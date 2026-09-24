"""Disrupt 141-C — parametric reconstruction from the architectural working set.

Horizontal geometry: rasterised from A-111/112/113 (walls) and A-501/502/503 (floor
plates) at a calibrated 41.70 px/ft (1" = 12'-0"), verified against three stated
dimensions (36'-0", 52'-2", 8'-0") to better than 0.5%.
Vertical geometry: the stated level ladder, used exactly.
"""
import numpy as np, cv2, json, trimesh, geom

FT = 1.0
PXPF, CELL = 41.70, 0.5
SITE_W, SITE_D = 151.08, 129.98

# ---- stated level ladder -------------------------------------------------
ROAD      = 0.0
GF_MAIN   = 1.0            # plinth / ground FFL
GF_WEST   = 2.0            # west wing ground FFL
FF_MAIN   = 12 + 5/12      # 12'-5"
FF_WEST   = 13 + 11/12     # 13'-11"
FF_WESTHI = 16 + 11/12     # 16'-11"
SF_MAIN   = 23 + 10/12     # 23'-10"
SF_WEST   = 25 + 9/12      # 25'-9"
ROOF      = 35 + 3/12      # 35'-3"
PARAPET   = 39 + 3/12      # 39'-3"  (coordinated decision, see report)
SLAB_T    = 0.5            # 6" structural slab
SCREED    = 0.25           # finish over slab
SOF_GF    = FF_MAIN - 0.75
SOF_FF    = SF_MAIN - 0.75
SOF_SF    = ROOF   - 0.75
LOW_ROOF_PARAPET = 3.0     # over single/two storey elements (assumption)

WEST_X_GF, WEST_X_UP = 60.0, 55.0

# ---- located from the plans (model feet) ---------------------------------
COURTYARD = dict(x0=76.1, x1=99.1, y0=52.0, y1=80.3)      # 23'-0" x 28'-4" stated
RECEPTION = dict(x0=74.8, x1=95.3, y0=26.6, y1=48.0)      # 20'-6" x 21'-5" stated
STAIRS = {
  "Stair_Main":    dict(x0=85.0, x1=94.0, y0=92.5, y1=105.5, up=+1, floors=3),
  "Stair_West":    dict(x0=14.5, x1=25.1, y0=77.7, y1=87.1, up=+1, floors=3),
  "Stair_Service": dict(x0=137.5, x1=147.0, y0=88.0, y1=104.0, up=-1, floors=3),
}
SPIRAL = dict(cx=143.5, cy=18.5, r=4.0)
SHEET_ROOF_ZONE = dict(x0=95.0, x1=151.0, y0=8.0, y1=95.0)   # east zone: masjid / cafeteria / recreation

MAT = {
 "render":  [214, 209, 199, 255],
 "slab":    [176, 174, 170, 255],
 "roof":    [158, 156, 152, 255],
 "parapet": [205, 200, 190, 255],
 "glass":   [128, 168, 186, 150],
 "sheet":   [150, 152, 150, 255],
 "stair":   [188, 186, 182, 255],
 "site":    [196, 192, 184, 255],
 "paving":  [186, 182, 174, 255],
 "intwall": [228, 224, 216, 255],
}

# ---------------------------------------------------------------- helpers
def grid_from_px(mask_px):
    h, w = mask_px.shape
    gh, gw = int(h / (PXPF * CELL)), int(w / (PXPF * CELL))
    g = cv2.resize(mask_px.astype(np.float32), (gw, gh), interpolation=cv2.INTER_AREA)
    return (g > 0.45).astype(np.uint8)

def cell_xy(c, r, gh):
    """grid cell -> (x0,y0,x1,y1) in model feet; row 0 is the TOP of the sheet (north)."""
    x0 = c * CELL
    y1 = (gh - r) * CELL
    return x0, y1 - CELL, x0 + CELL, y1

def boxes_from_rects(rects, gh, z0, z1, zfun=None):
    out = []
    for (r0, c0, nh, nw) in rects:
        x0, _, _, y1 = cell_xy(c0, r0, gh)
        x1 = x0 + nw * CELL
        y0 = y1 - nh * CELL
        a, b = (zfun(x0, x1, y0, y1) if zfun else (z0, z1))
        if b - a <= 0.01:
            continue
        bx = trimesh.creation.box(extents=(x1 - x0, y1 - y0, b - a))
        bx.apply_translation(((x0 + x1) / 2, (y0 + y1) / 2, (a + b) / 2))
        out.append(bx)
    return out

def mesh(parts, colour):
    if not parts:
        return None
    m = trimesh.util.concatenate(parts)
    m.visual.face_colors = colour
    return m

def rect_box(x0, y0, x1, y1, z0, z1):
    b = trimesh.creation.box(extents=(x1 - x0, y1 - y0, z1 - z0))
    b.apply_translation(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
    return b

# ---------------------------------------------------------------- loading
plates_px = {k: np.load(f"plate_{k}.npy") for k in ("GF", "FF", "SF")}
plates = {k: grid_from_px(v) for k, v in plates_px.items()}
walls = {k: np.load(f"walls_{k}.npy") for k in ("GF", "FF", "SF")}
GH, GW = plates["GF"].shape
for k in walls:
    walls[k] = cv2.resize(walls[k].astype(np.uint8), (GW, GH), interpolation=cv2.INTER_NEAREST)

def cut(mask, box):
    m = mask.copy()
    c0, c1 = int(box["x0"] / CELL), int(box["x1"] / CELL)
    r1, r0 = GH - int(box["y0"] / CELL), GH - int(box["y1"] / CELL)
    m[max(r0, 0):r1, max(c0, 0):c1] = 0
    return m

def clean(m, min_sqft=60, k=5):
    K_ = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, K_)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, K_)
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    out = np.zeros_like(m)
    for i in range(1, n):
        if st[i][4] * CELL ** 2 >= min_sqft:
            out[lab == i] = 1
    return out

# make the stack monotonic: registration slivers between sheets would otherwise
# produce floating slabs and spurious low parapets across the plan
def snap_up(lower, upper, reach_ft=3.0):
    """Grow the upper plate out to the lower one wherever they are within reach.
    Removes the 1-2 ft slivers left by registering independently plotted sheets."""
    n = int(reach_ft / CELL) * 2 + 1
    d = cv2.dilate(upper, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (n, n)))
    return ((upper > 0) | ((lower > 0) & (d > 0))).astype(np.uint8)

plates["GF"] = clean(plates["GF"])
plates["FF"] = clean(plates["FF"])
plates["SF"] = clean(plates["SF"])
plates["FF"] = snap_up(plates["GF"], plates["FF"])
plates["SF"] = snap_up(plates["FF"], plates["SF"])
plates["FF"] = clean(((plates["FF"] > 0) | (plates["SF"] > 0)).astype(np.uint8))
plates["GF"] = clean(((plates["GF"] > 0) | (plates["FF"] > 0)).astype(np.uint8))
plates["FF"] = cut(cut(plates["FF"], COURTYARD), RECEPTION)
plates["SF"] = cut(cut(plates["SF"], COURTYARD), RECEPTION)

K = lambda n: cv2.getStructuringElement(cv2.MORPH_RECT, (n, n))
ext_band, int_walls = {}, {}
for k, p in plates.items():
    core = cv2.erode(p, K(3))              # 0.75 ft envelope band
    ext_band[k] = ((p > 0) & (core == 0)).astype(np.uint8)
    int_walls[k] = ((walls[k] > 0) & (core > 0)).astype(np.uint8)

# ---------------------------------------------------------------- z rules
def z_floor(key):
    if key == "GF":
        return lambda x0, x1, y0, y1: ((GF_WEST if (x0 + x1) / 2 < WEST_X_GF else GF_MAIN), SOF_GF)
    if key == "FF":
        def f(x0, x1, y0, y1):
            xm, ym = (x0 + x1) / 2, (y0 + y1) / 2
            base = FF_WESTHI if (xm < 32 and ym > 92) else (FF_WEST if xm < WEST_X_UP else FF_MAIN)
            return base, SOF_FF
        return f
    def f(x0, x1, y0, y1):
        xm = (x0 + x1) / 2
        return (SF_WEST if xm < WEST_X_UP else SF_MAIN), SOF_SF
    return f

def ffl(key, x, y):
    if key == "GF":
        return GF_WEST if x < WEST_X_GF else GF_MAIN
    if key == "FF":
        return FF_WESTHI if (x < 32 and y > 92) else (FF_WEST if x < WEST_X_UP else FF_MAIN)
    return SF_WEST if x < WEST_X_UP else SF_MAIN

# ---------------------------------------------------------------- openings
elev = json.load(open("elev.json"))
bb = {}
for k, p in plates.items():
    ys, xs = np.nonzero(p)
    bb[k] = (xs.min() * CELL, xs.max() * CELL, (GH - ys.max()) * CELL, (GH - ys.min()) * CELL)
BX0 = min(v[0] for v in bb.values()); BX1 = max(v[1] for v in bb.values())
BY0 = min(v[2] for v in bb.values()); BY1 = max(v[3] for v in bb.values())

def map_openings():
    out = []
    for face in ("front", "rear", "left", "right"):
        e = elev[face]
        u0, L = e["u_off"], e["extent_ft"]
        span = (BX1 - BX0) if face in ("front", "rear") else (BY1 - BY0)
        lo = BX0 if face in ("front", "rear") else BY0
        for o in e["openings"]:
            h = o["z1"] - o["z0"]
            if h > 10.6 or h < 2.4:
                continue
            a = (o["u0"] - u0) / L
            b = (o["u1"] - u0) / L
            if face in ("front", "left"):
                c0, c1 = lo + a * span, lo + b * span
            else:                                   # rear and right are mirrored
                c0, c1 = lo + (1 - b) * span, lo + (1 - a) * span
            out.append(dict(face=face, c0=round(c0, 2), c1=round(c1, 2),
                            z0=o["z0"], z1=o["z1"]))
    return out

OPEN = map_openings()

def facade_line(face, c0, c1, z):
    """Outermost wall coordinate of the storey containing z, across span c0..c1."""
    key = "GF" if z < FF_MAIN else ("FF" if z < SF_MAIN else "SF")
    p = plates[key]
    if face in ("front", "rear"):
        cc = np.arange(max(int(c0 / CELL), 0), min(int(c1 / CELL) + 1, GW))
        rows = [np.nonzero(p[:, c])[0] for c in cc if p[:, c].any()]
        if not rows:
            return None
        if face == "front":
            r = max(rr.max() for rr in rows)            # southernmost
            return (GH - r - 1) * CELL
        r = min(rr.min() for rr in rows)
        return (GH - r) * CELL
    rr = np.arange(max(GH - int(c1 / CELL), 0), min(GH - int(c0 / CELL) + 1, GH))
    cols = [np.nonzero(p[r])[0] for r in rr if p[r].any()]
    if not cols:
        return None
    if face == "left":
        return min(cc.min() for cc in cols) * CELL
    return (max(cc.max() for cc in cols) + 1) * CELL

# ---------------------------------------------------------------- assembly
scene = trimesh.Scene()
log = {"openings_placed": 0, "openings_skipped": 0}

# site boundary wall (height assumed)
sw, t = 8.0, 0.75
site = [rect_box(0, 0, SITE_W, t, 0, sw), rect_box(0, SITE_D - t, SITE_W, SITE_D, 0, sw),
        rect_box(0, 0, t, SITE_D, 0, sw), rect_box(SITE_W - t, 0, SITE_W, SITE_D, 0, sw)]
scene.add_geometry(mesh(site, MAT["site"]), node_name="Site_Boundary_Wall", geom_name="Site_Boundary_Wall")

# ground apron
ap = rect_box(0, 0, SITE_W, SITE_D, -0.75, 0.0)
scene.add_geometry(mesh([ap], MAT["paving"]), node_name="Ground_Apron", geom_name="Ground_Apron")

for key, base_default in (("GF", GF_MAIN), ("FF", FF_MAIN), ("SF", SF_MAIN)):
    p, zf = plates[key], z_floor(key)
    # slab
    slab = []
    for (r0, c0, nh, nw) in geom.greedy_rects(p):
        x0, _, _, y1 = cell_xy(c0, r0, GH)
        x1, y0 = x0 + nw * CELL, y1 - nh * CELL
        f = ffl(key, (x0 + x1) / 2, (y0 + y1) / 2)
        slab.append(rect_box(x0, y0, x1, y1, f - SLAB_T - SCREED, f))
    scene.add_geometry(mesh(slab, MAT["slab"]), node_name=f"{key}_Slab", geom_name=f"{key}_Slab")

    # external envelope, openings subtracted
    ext_rects = geom.greedy_rects(ext_band[key])
    parts, glass = [], []
    for (r0, c0, nh, nw) in ext_rects:
        x0, _, _, y1 = cell_xy(c0, r0, GH)
        x1, y0 = x0 + nw * CELL, y1 - nh * CELL
        z0, z1 = zf(x0, x1, y0, y1)
        segs = [(x0, y0, x1, y1, z0, z1)]
        for o in OPEN:
            face = o["face"]
            if not (z0 - 0.6 <= o["z0"] and o["z1"] <= z1 + 0.6):
                continue
            line = facade_line(face, o["c0"], o["c1"], (o["z0"] + o["z1"]) / 2)
            if line is None:
                continue
            if face in ("front", "rear"):
                if abs(((y0 + y1) / 2) - line) > 1.6:
                    continue
                a, b = max(x0, o["c0"]), min(x1, o["c1"])
            else:
                if abs(((x0 + x1) / 2) - line) > 1.6:
                    continue
                a, b = max(y0, o["c0"]), min(y1, o["c1"])
            if b - a < 0.4:
                continue
            new = []
            for (sx0, sy0, sx1, sy1, sz0, sz1) in segs:
                u0, u1 = (sx0, sx1) if face in ("front", "rear") else (sy0, sy1)
                if b <= u0 or a >= u1 or o["z1"] <= sz0 or o["z0"] >= sz1:
                    new.append((sx0, sy0, sx1, sy1, sz0, sz1)); continue
                lo, hi = max(a, u0), min(b, u1)
                pieces = []
                if lo > u0: pieces.append((u0, lo, sz0, sz1))
                if hi < u1: pieces.append((hi, u1, sz0, sz1))
                if o["z0"] > sz0: pieces.append((lo, hi, sz0, o["z0"]))
                if o["z1"] < sz1: pieces.append((lo, hi, o["z1"], sz1))
                for (pa, pb, pz0, pz1) in pieces:
                    if face in ("front", "rear"):
                        new.append((pa, sy0, pb, sy1, pz0, pz1))
                    else:
                        new.append((sx0, pa, sx1, pb, pz0, pz1))
            segs = new
            gl = ((lo, sy0 + 0.25, hi, sy1 - 0.25) if face in ("front", "rear")
                  else (sx0 + 0.25, lo, sx1 - 0.25, hi))
            glass.append(rect_box(gl[0], gl[1], gl[2], gl[3], o["z0"], o["z1"]))
            log["openings_placed"] += 1
        for s in segs:
            if s[4] < s[5] - 0.01:
                parts.append(rect_box(*s))
    scene.add_geometry(mesh(parts, MAT["render"]), node_name=f"{key}_External_Walls", geom_name=f"{key}_External_Walls")
    if glass:
        scene.add_geometry(mesh(glass, MAT["glass"]), node_name=f"{key}_Glazing", geom_name=f"{key}_Glazing")

    # internal partitions
    iw = boxes_from_rects(geom.greedy_rects(int_walls[key]), GH, 0, 0, zfun=zf)
    scene.add_geometry(mesh(iw, MAT["intwall"]), node_name=f"{key}_Internal_Walls", geom_name=f"{key}_Internal_Walls")

# ---------------------------------------------------------------- roofs
def roof_zone(above, below):
    a = plates[above] if above else np.zeros_like(plates["GF"])
    return ((plates[below] > 0) & (a == 0)).astype(np.uint8)

zones = [("Roof_Level_12-5", roof_zone("FF", "GF"), FF_MAIN, FF_MAIN + LOW_ROOF_PARAPET),
         ("Roof_Level_23-10", roof_zone("SF", "FF"), SF_MAIN, SF_MAIN + LOW_ROOF_PARAPET),
         ("Roof_Level_35-3", plates["SF"].copy(), ROOF, PARAPET)]
for nm, z_full, lvl, pz in zones:
    z_full = cv2.morphologyEx(z_full, cv2.MORPH_CLOSE, K(3))
    # every uncovered plate area is capped with a slab so no wall is left open-topped
    scene.add_geometry(mesh(boxes_from_rects(geom.greedy_rects(z_full), GH, lvl - SLAB_T, lvl),
                            MAT["roof"]), node_name=nm + "_Slab", geom_name=nm + "_Slab")
    # a parapet only where the terrace is genuinely usable: >=5 ft wide and >=150 sq ft
    z = clean(z_full, min_sqft=150, k=11)
    if z.sum():
        band = ((z > 0) & (cv2.erode(z, K(3)) == 0)).astype(np.uint8)
        scene.add_geometry(mesh(boxes_from_rects(geom.greedy_rects(band), GH, lvl, pz),
                                MAT["parapet"]), node_name=nm + "_Parapet", geom_name=nm + "_Parapet")

# corrugated sheet roof over the east zone of the second floor
sheet = plates["SF"].copy()
c0, c1 = int(SHEET_ROOF_ZONE["x0"] / CELL), int(SHEET_ROOF_ZONE["x1"] / CELL)
r1, r0 = GH - int(SHEET_ROOF_ZONE["y0"] / CELL), GH - int(SHEET_ROOF_ZONE["y1"] / CELL)
m = np.zeros_like(sheet); m[max(r0, 0):r1, c0:min(c1, GW)] = 1
sheet = (sheet & m)
corr = []
for (r0_, c0_, nh, nw) in geom.greedy_rects(sheet):
    x0, _, _, y1 = cell_xy(c0_, r0_, GH)
    x1, y0 = x0 + nw * CELL, y1 - nh * CELL
    corr.append(rect_box(x0, y0, x1, y1, ROOF + 0.05, ROOF + 0.45))
scene.add_geometry(mesh(corr, MAT["sheet"]), node_name="Roof_Corrugated_Sheet", geom_name="Roof_Corrugated_Sheet")

# ---------------------------------------------------------------- stairs
RISER, TREAD = 5.75 / 12, 1.0
def flight(x0, y0, x1, y1, zb, zt, along_y=True, rev=False):
    n = max(2, int(round((zt - zb) / RISER)))
    out = []
    span = (y1 - y0) if along_y else (x1 - x0)
    step = span / n
    for i in range(n):
        z = zb + (i + 1) * (zt - zb) / n
        if along_y:
            a = y0 + i * step if not rev else y1 - (i + 1) * step
            out.append(rect_box(x0, a, x1, a + step, zb - 0.4, z))
        else:
            a = x0 + i * step if not rev else x1 - (i + 1) * step
            out.append(rect_box(a, y0, a + step, y1, zb - 0.4, z))
    return out

runs = [(GF_MAIN, FF_MAIN), (FF_MAIN, SF_MAIN), (SF_MAIN, ROOF)]
by_floor = {"GF": [], "FF": [], "SF": []}
for nm, sd in STAIRS.items():
    for lv, (zb, zt) in enumerate(runs[:sd["floors"]]):
        key = ["GF", "FF", "SF"][lv]
        mid = (zb + zt) / 2
        hy = (sd["y0"] + sd["y1"]) / 2
        by_floor[key] += flight(sd["x0"], sd["y0"], (sd["x0"] + sd["x1"]) / 2, hy, zb, mid, along_y=True, rev=(lv % 2 == 1))
        by_floor[key] += flight((sd["x0"] + sd["x1"]) / 2, hy, sd["x1"], sd["y1"], mid, zt, along_y=True, rev=(lv % 2 == 0))
        by_floor[key].append(rect_box(sd["x0"], hy - 0.5, sd["x1"], hy + 3.5, mid - 0.5, mid))
for lv, (zb, zt) in enumerate(runs[:2]):
    key = ["GF", "FF"][lv]
    n = int((zt - zb) / RISER)
    for i in range(0, n, 6):
        wedge = trimesh.creation.cylinder(radius=SPIRAL["r"], height=0.35, sections=48)
        wedge.apply_translation((SPIRAL["cx"], SPIRAL["cy"], zb + (i + 1) * RISER))
        by_floor[key].append(wedge)
for key, parts_ in by_floor.items():
    scene.add_geometry(mesh(parts_, MAT["stair"]),
                       node_name=f"{key}_Stairs", geom_name=f"{key}_Stairs")

# ---------------------------------------------------------------- courtyard
cy = COURTYARD
pav = rect_box(cy["x0"], cy["y0"], cy["x1"], cy["y1"], 0.25, 0.5)
scene.add_geometry(mesh([pav], MAT["paving"]), node_name="Courtyard_Paving", geom_name="Courtyard_Paving")
cg = []
for (a, b, c, d) in [(cy["x0"], cy["y0"], cy["x0"] + 0.3, cy["y1"]),
                     (cy["x1"] - 0.3, cy["y0"], cy["x1"], cy["y1"]),
                     (cy["x0"], cy["y0"], cy["x1"], cy["y0"] + 0.3),
                     (cy["x0"], cy["y1"] - 0.3, cy["x1"], cy["y1"])]:
    cg.append(rect_box(a, b, c, d, GF_MAIN, GF_MAIN + 34.0))     # 34'-0" per A-301
scene.add_geometry(mesh(cg, MAT["glass"]), node_name="Courtyard_Glazing", geom_name="Courtyard_Glazing")

# ---------------------------------------------------------------- export
scene.export("Disrupt_141C.glb")
scene.export("Disrupt_141C.obj")
log["nodes"] = list(scene.geometry.keys())
log["bbox_ft"] = [[round(v, 2) for v in scene.bounds[0]], [round(v, 2) for v in scene.bounds[1]]]
log["building_extent_ft"] = dict(x=[round(BX0, 1), round(BX1, 1)], y=[round(BY0, 1), round(BY1, 1)])
log["plate_area_sqft"] = {k: round(float(v.sum()) * CELL ** 2, 1) for k, v in plates.items()}
json.dump(log, open("model_log.json", "w"), indent=1)
print(json.dumps({k: v for k, v in log.items() if k != "nodes"}, indent=1))
print("nodes:", len(log["nodes"]))
for n in log["nodes"]:
    print("  ", n)
