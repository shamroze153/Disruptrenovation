"""Rooftop solar concept for Disrupt 141-C: usable roof, elevated-table layout on the RCC column grid, shading check
(21 Dec, 09:00-15:00 solar time) and a list of everything for the viewer. Run: python3 layout.py"""
import json, math, numpy as np
from shapely.geometry import box, Polygon, MultiPolygon, MultiPoint, Point, mapping
from shapely.ops import unary_union
from roofgeo import *

LAT = 24.86
MOD_L, MOD_W, MOD_T = 2.384 * M, 1.303 * M, 0.035 * M       # 7.822 ft x 4.275 ft x 0.115 ft
GAP = 0.020 * M                                             # 20 mm between modules in a table
import os
TILT = float(os.environ.get("SOLAR_TILT", "15"))
SETBACK = 1.0 * M                                           # 1 m from the parapet / roof edge
CLEAR = 8.0                                                 # 8'-0" clear under the lowest steel member
BEAM_D = 0.66                                               # primary beam depth (ISMB 200 / UB 203)
RAFTER_D = 0.33                                             # C 100 rafter
PURLIN_D = 0.33                                             # C 100 x 50 lipped purlin
CANT = 1.5 * M                                              # max cantilever beyond a column line
TABLE_MAX = 10                                              # modules along a table
TABLE_GAP = 1.0                                             # ft between tables in a row
WALK = 2.5                                                  # 2'-6" catwalk between rows (inside the shading gap)
MONTH = {"dec": -23.44, "jun": 23.44}

def sun(decl, hour):
    """sun unit vector (east, north, up), altitude, azimuth (deg from north) at solar time `hour`"""
    p, d, h = math.radians(LAT), math.radians(decl), math.radians(15 * (hour - 12))
    alt = math.asin(math.sin(p) * math.sin(d) + math.cos(p) * math.cos(d) * math.cos(h))
    az = math.atan2(math.sin(h), math.cos(h) * math.sin(p) - math.tan(d) * math.cos(p)) + math.pi
    return np.array([math.cos(alt) * math.sin(az), math.cos(alt) * math.cos(az), math.sin(alt)]), math.degrees(alt), math.degrees(az)

T0, T1 = float(os.environ.get("SOLAR_T0", "9")), float(os.environ.get("SOLAR_T1", "15"))
TIMES = [T0 + i / 6 for i in range(int(round((T1 - T0) * 6)) + 1)]                      # 09:00 .. 15:00, every 10 min
SUN_DEC = [sun(MONTH["dec"], t)[0] for t in TIMES]

KINDS = {  # table kinds: modules across the slope, slant depth, along-row pitch per module
    "2P": dict(n=2, slant=2 * MOD_L + GAP, pitch=MOD_W + GAP, orient="portrait"),
    "3L": dict(n=3, slant=3 * MOD_W + 2 * GAP, pitch=MOD_L + GAP, orient="landscape"),
    "2L": dict(n=2, slant=2 * MOD_W + GAP, pitch=MOD_L + GAP, orient="landscape"),
    "1P": dict(n=1, slant=MOD_L, pitch=MOD_W + GAP, orient="portrait"),
}
for k, v in KINDS.items():
    v["proj"] = v["slant"] * math.cos(math.radians(TILT)); v["rise"] = v["slant"] * math.sin(math.radians(TILT))
    v["gap"] = max(0.0, max(-s[1] / s[2] for s in SUN_DEC)) * v["rise"]       # shadow of the high edge, northwards
    v["gap"] = max(v["gap"], WALK)
    v["row_pitch"] = v["proj"] + v["gap"]

# ---------------------------------------------------------------- zones
def bay(cx0, cy0, cx1, cy1, cant=CANT):
    return box(cx0 - cant, cy0 - cant, cx1 + cant, cy1 + cant)

obst35 = unary_union([mumty.buffer(0.5 * M, join_style=2), door, skylight.buffer(0.6 * M, join_style=2), lightwell.buffer(SETBACK, join_style=2),
                      courtyard.buffer(SETBACK, join_style=2)])
usable35 = deck35.buffer(-SETBACK, join_style=2).difference(obst35)
usable35_nosheet = usable35.difference(sheet.buffer(0.5, join_style=2))

ZONES = []
# A: east RCC block. Columns x 75.0 / 90.3 / 105.7 / 115.8 / 134.0 on the y 108.6 and 128.2 lines, x 75.0 / 84.1 / 94.9 on y 93.6.
supA = unary_union([bay(75.0, 108.6, 134.0, 128.2), box(75.0 - CANT, 93.6 - CANT, 94.9 + CANT, 108.6), box(75.0 - CANT, 79.2, 96.7 + CANT, 93.6)])
ZONES.append(dict(id="A", name="East RCC block roof (+35'-3\")", base=True, roof=ROOF_Z, allow=usable35_nosheet.intersection(supA),
                  cols=[(75.0, 93.6), (84.1, 93.6), (94.9, 93.6), (75.0, 108.6), (90.3, 108.6), (105.7, 108.6), (115.8, 108.6), (134.0, 108.5),
                        (74.9, 127.5), (90.3, 128.2), (105.7, 128.2), (115.8, 128.2), (134.0, 128.2), (75.1, 79.2), (96.7, 79.2)]))
# B: over the reception / masjid, four RCC columns at the courtyard's south corners and the reception's south face
supB = bay(75.1, 30.2, 96.5, 51.2)
ZONES.append(dict(id="B", name="South bay over reception / masjid (+35'-3\")", base=True, roof=ROOF_Z, allow=usable35_nosheet.intersection(supB),
                  cols=[(75.1, 30.2), (93.1, 30.2), (75.1, 51.1), (96.5, 51.2)]))
# D: single-storey south-east block, +12'-5" roof, proposed RCC columns on A-111
D_COLS = [(148.3, 8.2), (138.9, 16.8), (148.4, 17.6), (128.2, 25.9), (139.7, 25.9), (126.5, 31.4), (140.6, 37.9)]
roofD = roof125.intersection(box(124, 5, 152, 50))
supD = MultiPoint(D_COLS).convex_hull.buffer(CANT, join_style=2)
ZONES.append(dict(id="D", name="South-east single-storey roof (+12'-5\")", base=True, roof=12.417, allow=roofD.buffer(-SETBACK, join_style=2).intersection(supD), cols=D_COLS))
# option C: canopy over the rooftop cafeteria / recreation area (the asbestos-sheet zone). No RCC columns inside it.
ZONES.append(dict(id="C", name="Option C: canopy over the rooftop cafeteria (asbestos-sheet zone)", base=False, roof=ROOF_Z,
                  allow=usable35.intersection(sheet).difference(skylight.buffer(0.6 * M)), cols=[]))
# option W: west block roof, no RCC columns on A-113 (load-bearing existing walls)
westW = usable35_nosheet.difference(supA.buffer(0.01)).difference(supB.buffer(0.01)).intersection(box(0, 20, 74.5, 135))
ZONES.append(dict(id="W", name="Option W: west block roof (load-bearing walls, no RCC columns)", base=False, roof=ROOF_Z, allow=westW, cols=[]))

# ---------------------------------------------------------------- raster placement
RES = 0.1
NX, NY = int(155 / RES), int(137 / RES)
def raster(poly):
    from matplotlib.path import Path
    m = np.zeros((NY, NX), bool)
    polys = [poly] if isinstance(poly, Polygon) else list(getattr(poly, "geoms", []))
    xs = (np.arange(NX) + 0.5) * RES; ys = (np.arange(NY) + 0.5) * RES
    X, Y = np.meshgrid(xs, ys)
    pts = np.c_[X.ravel(), Y.ravel()]
    for p in polys:
        if p.is_empty or p.area < 1: continue
        inside = Path(np.array(p.exterior.coords)).contains_points(pts)
        for h in p.interiors: inside &= ~Path(np.array(h.coords)).contains_points(pts)
        m |= inside.reshape(NY, NX)
    return m

def row_tables(mask, kind, y):
    """tables of one row whose plan strip [y, y+proj] lies fully inside the mask"""
    K = KINDS[kind]; tables = []
    r0, r1 = int(math.floor(y / RES)), int(math.ceil((y + K["proj"]) / RES))
    if r0 < 0 or r1 >= NY: return tables
    ok = mask[r0:r1].all(axis=0); c = 0
    while c < NX:
        if not ok[c]: c += 1; continue
        s = c
        while c < NX and ok[c]: c += 1
        x, end = s * RES, c * RES
        n = int((end - x + GAP) // K["pitch"])
        # split a long run into tables of <= TABLE_MAX, as even as possible
        if n >= 2:
            k = math.ceil(n / TABLE_MAX)
            while k > 1 and (n - (k - 1) * TABLE_GAP / K["pitch"]) / k < 2: k -= 1
            n_eff = int((end - x + GAP - (k - 1) * TABLE_GAP) // K["pitch"]); sizes = [n_eff // k + (1 if i < n_eff % k else 0) for i in range(k)]
            for m_ in sizes:
                if m_ < 2 and K["n"] < 2: continue
                if m_ < 1: continue
                L = m_ * K["pitch"] - GAP
                tables.append(dict(kind=kind, x0=x, x1=x + L, y0=y, y1=y + K["proj"], m=m_, n=m_ * K["n"])); x += L + TABLE_GAP
    return tables

def best_layout(zone):
    """rows from south to north; dynamic programming over the row start (0.25 ft steps) and the table kind of each
    row. A row of kind k starting at y leaves the next row free from y + proj_k + gap_k (the 21 Dec 09-15 shadow)."""
    out = []
    comps = [zone["allow"]] if isinstance(zone["allow"], Polygon) else list(getattr(zone["allow"], "geoms", []))
    for comp in comps:
        if comp.is_empty or comp.area < 40: continue
        mask = raster(comp)
        if not mask.any(): continue
        rows = np.where(mask.any(axis=1))[0]; ylo, yhi = rows[0] * RES, (rows[-1] + 1) * RES
        Y = np.arange(ylo, yhi + 0.001, 0.25); nY = len(Y)
        cnt = {k: [row_tables(mask, k, y) for y in Y] for k in KINDS}
        f = [0.0] * (nY + 1); ch = [None] * (nY + 1)
        for i in range(nY - 1, -1, -1):
            f[i], ch[i] = f[i + 1], None
            for k, K in KINDS.items():
                t = cnt[k][i]; n = sum(x["n"] for x in t)
                if not n: continue
                j = min(nY, i + int(math.ceil((K["proj"] + K["gap"]) / 0.25)))
                v = n + f[j] - 0.001 * len(t)                       # fewer, longer tables if equal
                if v > f[i]: f[i], ch[i] = v, (k, j)
        i = 0
        while i < nY:
            if ch[i] is None: i += 1; continue
            k, j = ch[i]; out += cnt[k][i]; i = j
    kinds = sorted(set(t["kind"] for t in out))
    return out, "/".join(kinds) if kinds else None

LAYOUT = []
for z in ZONES:
    t, kind = best_layout(z)
    zb = z["roof"] + CLEAR + BEAM_D + RAFTER_D + PURLIN_D                     # low edge of the modules
    for i, tb in enumerate(t):
        tb.update(zone=z["id"], id=f"{z['id']}{i + 1}", zlow=zb, zhigh=zb + KINDS[tb["kind"]]["rise"])
    z["tables"] = t; z["kind"] = kind; z["modules"] = sum(x["n"] for x in t)
    LAYOUT += t

# ---------------------------------------------------------------- shading check (ray casting)
BOX3 = []
for k, v in G.items():
    for b in v: BOX3.append(b)
BOX3 += [[mumty.bounds[0], mumty.bounds[1], ROOF_Z, mumty.bounds[2], mumty.bounds[3], ROOF_Z + MUMTY_H],
         [79.84, 1.14, 0, 86.64, 6.96, 9.0]]
for g in sheet.geoms if hasattr(sheet, "geoms") else [sheet]:
    b = g.bounds; BOX3.append([b[0], b[1], 35.3, b[2], b[3], 35.7])
BOX3 = np.array(BOX3, float)

def module_rects(tb):
    """each module as (corner, u(along x), v(up slope)) in 3D"""
    K = KINDS[tb["kind"]]; out = []
    c, s = math.cos(math.radians(TILT)), math.sin(math.radians(TILT))
    along = MOD_W if K["orient"] == "portrait" else MOD_L; across = MOD_L if K["orient"] == "portrait" else MOD_W
    for i in range(tb["m"]):
        for j in range(K["n"]):
            x = tb["x0"] + i * (along + GAP); d = j * (across + GAP)
            o = np.array([x, tb["y0"] + d * c, tb["zlow"] + d * s])
            out.append((o, np.array([along, 0, 0]), np.array([0, across * c, across * s])))
    return out

def shaded_points(tb, suns, others):
    """fraction of sample points on the table's modules that are in shadow at any of the sun positions"""
    pts = []
    for o, u, v in module_rects(tb):
        for a in (0.03, 0.5, 0.97):
            for b in (0.03, 0.5, 0.97): pts.append(o + a * u + b * v + np.array([0, 0, 0.02]))
    P = np.array(pts); hit = np.zeros(len(P), bool)
    for s in suns:
        if s[2] <= 0.02: continue
        inv = 1 / np.where(np.abs(s) < 1e-9, 1e-9, s)
        t1 = (BOX3[None, :, 0:3] - P[:, None, :]) * inv; t2 = (BOX3[None, :, 3:6] - P[:, None, :]) * inv
        tmin = np.minimum(t1, t2).max(axis=2); tmax = np.maximum(t1, t2).min(axis=2)
        hit |= ((tmax > np.maximum(tmin, 0.05)) & (tmax > 0)).any(axis=1)
        for ob in others:                                   # other tables: tilted planes
            n = np.cross(ob[1], ob[2]); den = n @ s
            if abs(den) < 1e-9: continue
            t = ((ob[0] - P) @ n) / den
            q = P + t[:, None] * s - ob[0]
            a = q @ ob[1] / (ob[1] @ ob[1]); b = q @ ob[2] / (ob[2] @ ob[2])
            hit |= (t > 0.05) & (a >= 0) & (a <= 1) & (b >= 0) & (b <= 1)
    return hit.mean(), P, hit

def table_plane(tb):
    K = KINDS[tb["kind"]]
    return (np.array([tb["x0"], tb["y0"], tb["zlow"]]), np.array([tb["x1"] - tb["x0"], 0, 0]), np.array([0, K["proj"], K["rise"]]))

def shade_check(month_decl, hours):
    suns = [sun(month_decl, h)[0] for h in hours]; res = {}
    planes = {tb["id"]: table_plane(tb) for tb in LAYOUT}
    for tb in LAYOUT:
        others = [p for k, p in planes.items() if k != tb["id"]]
        f, _, _ = shaded_points(tb, suns, others); res[tb["id"]] = f
    return res

# drop tables that the building shades on 21 Dec 09-15 (row-to-row spacing already takes care of the rows)
for it in range(3):
    sh = shade_check(MONTH["dec"], TIMES)
    bad = [k for k, f in sh.items() if f > 0]
    if not bad: break
    # trim: remove shaded modules by shortening / removing the table
    keep = []
    for tb in LAYOUT:
        if tb["id"] in bad:
            K = KINDS[tb["kind"]]
            planes = [table_plane(o) for o in LAYOUT if o["id"] != tb["id"]]
            _, P, hit = shaded_points(tb, SUN_DEC, planes)
            per = hit.reshape(-1, 9).any(axis=1).reshape(tb["m"], K["n"]).any(axis=1)   # shaded module columns
            cols_ok = np.where(~per)[0]
            if len(cols_ok) >= 2:
                # keep the longest contiguous run
                runs, s0 = [], cols_ok[0]
                for a, b in zip(cols_ok, list(cols_ok[1:]) + [None]):
                    if b is None or b != a + 1: runs.append((s0, a)); s0 = b
                r = max(runs, key=lambda r: r[1] - r[0])
                m_ = r[1] - r[0] + 1
                if m_ >= 2:
                    x0 = tb["x0"] + r[0] * K["pitch"]; tb.update(x0=x0, x1=x0 + m_ * K["pitch"] - GAP, m=m_, n=m_ * K["n"]); keep.append(tb)
        else: keep.append(tb)
    LAYOUT[:] = keep
for z in ZONES:
    z["tables"] = [t for t in LAYOUT if t["zone"] == z["id"]]; z["modules"] = sum(t["n"] for t in z["tables"])

SH_DEC = shade_check(MONTH["dec"], TIMES)
SH_JUN = shade_check(MONTH["jun"], TIMES)

if __name__ == "__main__":
    for k, v in KINDS.items(): print(k, {a: round(b, 2) for a, b in v.items() if isinstance(b, float)})
    for z in ZONES:
        print(z["id"], z["name"], "allow %.0f sqft" % z["allow"].area, "kind", z.get("kind"), "tables", len(z["tables"]), "modules", z["modules"])
    print("usable35 %.0f, no sheet %.0f, deck %.0f" % (usable35.area, usable35_nosheet.area, deck35.area))
    print("max shaded fraction Dec", max(SH_DEC.values() or [0]), "Jun", max(SH_JUN.values() or [0]))
    for s in [sun(-23.44, h) for h in (9, 12, 15)]: print("sun", np.round(s[0], 3), round(s[1], 1), round(s[2], 1))
