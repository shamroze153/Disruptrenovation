"""Structure, electrical design, bill of quantities, plan drawing and viewer data for the rooftop solar concept.
Run: python3 design.py   ->  solar_design.json (viewer), solar_report.json (numbers for HANDOFF), solar_plan.png"""
import json, math, numpy as np
from shapely.geometry import box, Point, LineString
from shapely.ops import unary_union, nearest_points
from layout import *

Y = json.load(open("yield.json"))
MOD = dict(p=645, voc=44.9, isc=18.30, vmp=37.6, imp=17.16, b_voc=-0.25, b_vmp=-0.29, g_p=-0.34, noct=43, bifaciality=0.70,
           L=2384, W=1303, T=35, kg=34, cells="132 half-cut (210 mm)")
T_MIN, T_CELL_MAX = 0.0, 75.0          # Karachi record low 0 C; hot cell temperature for the MPPT check
VDC_MAX = 1100
FULLMPPT_MIN = 480                      # full-power MPPT lower limit of a 400 V three-phase string inverter

BASE = [z for z in ZONES if z["base"]]; OPT = [z for z in ZONES if not z["base"]]
n_all = sum(z["modules"] for z in ZONES); n_base = sum(z["modules"] for z in BASE)

# ---------------------------------------------------------------- structure
SF_WALLS = [b for k in ("SF_External_Walls", "SF_Internal_Walls") for b in G[k]]
WALL_U = unary_union([box(b[0], b[1], b[3], b[4]) for b in SF_WALLS])
def snap_to_wall(x, y, tol=4.0):
    p = Point(x, y)
    if WALL_U.contains(p): return x, y, True
    q = nearest_points(WALL_U, p)[0]
    if q.distance(p) <= tol: return q.x, q.y, True
    return x, y, False

STEEL = []      # [kind, x0, y0, z0, x1, y1, z1, section, kg/m, zone]
COLS = []       # [x, y, z0, z1, zone, status]
KGM = {"SHS 150x150x6": 26.4, "ISMB 200": 25.4, "ISMC 125": 12.7, "C 100x50x20x2.5 (rafter)": 4.3, "C 100x50x20x2.0 (purlin)": 3.5, "SHS 50x50x3 (post)": 4.3}
def member(kind, a, b, sec, zone): STEEL.append([kind, *a, *b, sec, KGM[sec], zone])

def zone_structure(z):
    tb = z["tables"]
    if not tb: return
    roof = z["roof"]; zc = roof + CLEAR                      # underside of the primary beams
    ztop = zc + BEAM_D                                       # top of the primary beams = seat of the secondary beams
    xs0, xs1 = min(t["x0"] for t in tb), max(t["x1"] for t in tb)
    ys0, ys1 = min(t["y0"] for t in tb), max(t["y1"] for t in tb)
    if z["cols"]:
        cols = [(x, y) for (x, y) in z["cols"] if xs0 - 17 <= x <= xs1 + 17 and ys0 - 6.5 <= y <= ys1 + 6.5]
        status = "existing RCC column below"
        # primary beams join the columns along each column line, using their real positions
        lines = {}
        for (x, y) in cols: lines.setdefault(round(x / 3) * 3, []).append((x, y))
        for k, pts in lines.items():
            pts.sort(key=lambda p: p[1])
            for p, q in zip(pts, pts[1:]): member("primary", (p[0], p[1], zc + BEAM_D / 2), (q[0], q[1], zc + BEAM_D / 2), "ISMB 200", z["id"])
            if len(pts) == 1: member("primary", (pts[0][0], ys0 - 0.3, zc + BEAM_D / 2), (pts[0][0], ys1 + 0.3, zc + BEAM_D / 2), "ISMB 200", z["id"])
        xl = sorted(set(sum(p[0] for p in v) / len(v) for v in lines.values()))
    else:
        # options: new N-S primary beams every <= 6 m, each carried by columns <= 6 m apart over the tables it supports;
        # in the west block each column is moved onto the nearest second-floor wall line (within 4 ft) for the engineer to check
        status = "new column: to be located by the structural engineer"
        nx = max(1, math.ceil((xs1 - xs0) / 19.5)); xl = [xs0 + 0.5 + i * (xs1 - xs0 - 1) / nx for i in range(nx + 1)]
        cols = []
        for x in xl:
            iv = sorted((t["y0"], t["y1"]) for t in tb if t["x0"] - CANT <= x <= t["x1"] + CANT)
            segs = []
            for a_, b_ in iv:
                if segs and a_ - segs[-1][1] <= 12: segs[-1][1] = max(segs[-1][1], b_)
                else: segs.append([a_, b_])
            for ya, yb in segs:
                n = max(1, math.ceil((yb - ya) / 19.5)); pts = []
                for j in range(n + 1):
                    y = ya + 1 + j * (yb - ya - 2) / n
                    sx, sy, ok = snap_to_wall(x, y) if z["id"] == "W" else (x, y, False)
                    if z["roof"] == ROOF_Z and not deck35.buffer(-0.5).contains(Point(sx, sy)): continue
                    cols.append((sx, sy)); pts.append((sx, sy))
                member("primary", (x, ya - 0.3, zc + BEAM_D / 2), (x, yb + 0.3, zc + BEAM_D / 2), "ISMB 200", z["id"])
    for (x, y) in cols: COLS.append([round(x, 2), round(y, 2), roof, round(zc, 3), z["id"], status])
    # per table: secondary E-W beams at the front and back, rafters with stub posts, purlins
    for t in tb:
        K = KINDS[t["kind"]]; L = t["x1"] - t["x0"]
        x_a, x_b = min(t["x0"] - 0.3, *[x for x in xl if x <= t["x0"]] or [t["x0"] - 0.3]), max(t["x1"] + 0.3, *[x for x in xl if x >= t["x1"]] or [t["x1"] + 0.3])
        x_a = max([x for x in xl if x <= t["x0"] + 0.01] or [t["x0"] - 0.3]); x_b = min([x for x in xl if x >= t["x1"] - 0.01] or [t["x1"] + 0.3])
        x_a, x_b = min(x_a, t["x0"] - 0.3), max(x_b, t["x1"] + 0.3)
        for yy in (t["y0"] + 0.4, t["y1"] - 0.4):
            member("secondary", (x_a, yy, ztop + 0.25), (x_b, yy, ztop + 0.25), "ISMC 125", z["id"])
        nr = max(2, math.ceil(L / 8.2) + 1)
        for i in range(nr):
            x = t["x0"] + 0.4 + i * (L - 0.8) / (nr - 1)
            member("rafter", (x, t["y0"] + 0.2, t["zlow"] - PURLIN_D - RAFTER_D / 2), (x, t["y1"] - 0.2, t["zhigh"] - PURLIN_D - RAFTER_D / 2), "C 100x50x20x2.5 (rafter)", z["id"])
            member("post", (x, t["y1"] - 0.4, ztop + 0.5), (x, t["y1"] - 0.4, t["zhigh"] - PURLIN_D - RAFTER_D - 0.1), "SHS 50x50x3 (post)", z["id"])
        npur = {"2P": 4, "3L": 6, "2L": 4, "1P": 2}[t["kind"]]
        for j in range(npur):
            f = (j + 0.5) / npur
            yy = t["y0"] + f * K["proj"]; zz = t["zlow"] + f * K["rise"] - PURLIN_D / 2
            member("purlin", (t["x0"] - 0.15, yy, zz), (t["x1"] + 0.15, yy, zz), "C 100x50x20x2.0 (purlin)", z["id"])
for z in ZONES: zone_structure(z)

# catwalks: 2'-6" grating in the shading gap north of each row that has another row behind it
CATWALK = []
for z in ZONES:
    rows = sorted(set(round(t["y0"], 2) for t in z["tables"]))
    for t in z["tables"]:
        behind = [u for u in z["tables"] if u["y0"] > t["y1"] + 0.5 and u["x0"] < t["x1"] and u["x1"] > t["x0"]]
        if behind:
            y = t["y1"] + 0.4
            CATWALK.append([round(t["x0"], 2), round(y, 2), round(t["x1"], 2), round(y + WALK, 2), round(z["roof"] + CLEAR + BEAM_D + 0.3, 2), z["id"]])

# ---------------------------------------------------------------- modules (for the viewer) and strings
MODS = []
for tb in LAYOUT:
    K = KINDS[tb["kind"]]
    for (o, u, v) in module_rects(tb):
        c = o + u / 2 + v / 2
        MODS.append(dict(x=round(c[0], 3), y=round(c[1], 3), z=round(c[2], 3), o=0 if K["orient"] == "portrait" else 1, t=tb["id"], zone=tb["zone"]))
# inverter groups: INV-1 east (A, B, C), INV-2 west (W)
GROUPS = [("INV-1", ["A", "B", "C"]), ("INV-2", ["W"])]
def split_strings(n, lo=16, hi=21):
    k = max(1, math.ceil(n / hi))
    while n / k < lo and k > 1: k -= 1
    return [n // k + (1 if i < n % k else 0) for i in range(k)]
STRINGS = []; INV = []
for inv, zs in GROUPS:
    ms = [m for m in MODS if m["zone"] in zs]
    # order: zone, then serpentine by table rows
    ms.sort(key=lambda m: (zs.index(m["zone"]), -round(m["y"] / 6), m["x"] if round(m["y"] / 6) % 2 else -m["x"]))
    sizes = split_strings(len(ms)); i = 0
    for k, s in enumerate(sizes):
        sid = f"{inv[-1]}.{k + 1}"
        for m in ms[i:i + s]: m["s"] = sid
        STRINGS.append(dict(id=sid, inv=inv, n=s, zones=sorted(set(m["zone"] for m in ms[i:i + s]))))
        i += s
    INV.append(dict(id=inv, zones=zs, modules=len(ms), kwp=round(len(ms) * MOD["p"] / 1000, 2), strings=sizes))

def voc_cold(n): return n * MOD["voc"] * (1 + MOD["b_voc"] / 100 * (T_MIN - 25))
def vmp_hot(n): return n * MOD["vmp"] * (1 + MOD["b_vmp"] / 100 * (T_CELL_MAX - 25))
def vmp_stc(n): return n * MOD["vmp"]
nmax = int(VDC_MAX // (MOD["voc"] * (1 + MOD["b_voc"] / 100 * (T_MIN - 25))))
nmin = math.ceil(FULLMPPT_MIN / (MOD["vmp"] * (1 + MOD["b_vmp"] / 100 * (T_CELL_MAX - 25))))
for S in STRINGS: S.update(voc_cold=round(voc_cold(S["n"])), vmp_hot=round(vmp_hot(S["n"])), vmp_stc=round(vmp_stc(S["n"])))
for I in INV:
    kw = 40 if I["kwp"] <= 48 else 50 if I["kwp"] <= 60 else 60
    I.update(ac_kw=kw, dc_ac=round(I["kwp"] / kw, 2), iac=round(kw * 1000 / (math.sqrt(3) * 400 * 0.99), 1))
AC_KW = sum(I["ac_kw"] for I in INV)
I_AC = AC_KW * 1000 / (math.sqrt(3) * 400 * 0.99)

# electrical equipment (plan positions)
MZ = (mumty.bounds)                                            # the inverters hang on the mumty's north wall, under the array
EQUIP = [
    dict(k="inv", id="INV-1", x=86.2, y=MZ[3] + 0.35, z=ROOF_Z + 2.6, w=2.2, d=0.8, h=3.0, txt=f"Inverters INV-1 {INV[0]['ac_kw']} kW + INV-2 {INV[1]['ac_kw'] if len(INV) > 1 else 0} kW, DCDBs, ACDB (shaded north wall)"),
    dict(k="inv", id="INV-2", x=89.3, y=MZ[3] + 0.35, z=ROOF_Z + 2.6, w=2.2, d=0.8, h=3.0, txt=""),
    dict(k="dcdb", id="DCDB-1/2", x=92.1, y=MZ[3] + 0.3, z=ROOF_Z + 3.2, w=1.8, d=0.6, h=1.6, txt=""),
    dict(k="acdb", id="ACDB", x=94.1, y=MZ[3] + 0.3, z=ROOF_Z + 3.0, w=1.6, d=0.6, h=2.2, txt=""),
    dict(k="tap", id="TAP", x=88.4, y=MZ[1] - 0.35, z=ROOF_Z + 2.5, w=0.5, d=0.4, h=0.5, txt="Water tap + hose reel (cleaning)"),
    dict(k="la", id="LA", x=MZ[0] + 1.0, y=MZ[3] - 1.0, z=ROOF_Z + MUMTY_H, w=0.3, d=0.3, h=16.4, txt="ESE lightning arrester on 5 m mast"),
    dict(k="pit", id="EP-1", x=137.5, y=112.0, z=0.0, w=2.0, d=2.0, h=0.3, txt="Earth pit: DC / structure"),
    dict(k="pit", id="EP-2", x=137.5, y=116.0, z=0.0, w=2.0, d=2.0, h=0.3, txt="Earth pit: AC / inverters"),
    dict(k="pit", id="EP-3", x=137.5, y=104.0, z=0.0, w=2.0, d=2.0, h=0.3, txt="Earth pit: lightning arrester (separate, bonded)"),
]
# cable trays (plan polylines at the roof + 1 ft, under the structure) and the AC riser
TRAYS = [
    dict(k="dc", pts=[[95.0, 110.2], [125.0, 110.2]], z=ROOF_Z + 0.6, txt="DC tray 150x50 (zone A)"),
    dict(k="dc", pts=[[96.0, 96.0], [99.0, 96.0], [99.0, 36.0]], z=ROOF_Z + 0.6, txt="DC tray 150x50 (zones B, C)"),
    dict(k="dc", pts=[[70.0, 44.0], [74.0, 44.0], [74.0, 48.0]], z=ROOF_Z + 0.6, txt="DC tray (zone B)"),
    dict(k="dc", pts=[[12.0, 96.5], [45.0, 96.5], [45.0, 86.0], [82.6, 86.0], [82.6, 109.2]], z=ROOF_Z + 0.6, txt="DC tray 200x50 (zone W)"),
    dict(k="dc", pts=[[40.0, 43.0], [40.0, 86.0]], z=ROOF_Z + 0.6, txt="DC tray (zone W south rows)"),
    dict(k="ac", pts=[[94.6, 109.4], [134.2, 109.4], [134.2, 117.0]], z=ROOF_Z + 0.6, txt="AC cable 4C x 70 mm2 Cu XLPE/SWA + 35 mm2 PE"),
]
RISER = dict(pts=[[134.8, 117.0, ROOF_Z], [135.9, 117.0, ROOF_Z], [135.9, 117.0, 12.9], [138.5, 117.0, 12.9], [138.5, 117.0, 3.0]],
             txt="AC riser: GI trunking down the north-east wall to the +12'-5\" roof and into the generator room (main LT panel)")
L_AC = sum(math.dist(a, b) for a, b in zip(RISER["pts"], RISER["pts"][1:])) + sum(math.dist(a, b) for a, b in zip(TRAYS[-1]["pts"], TRAYS[-1]["pts"][1:])) + 15
L_AC_M = L_AC * FT
VD_AC = math.sqrt(3) * I_AC * L_AC_M * 0.55e-3 * 1 / 400 * 100          # 70 mm2 Cu: ~0.55 mV/A/m (3-phase)
# DC string cable lengths: from each string's centroid to the inverter (Manhattan) x2 (+/-) + 10 %
inv_xy = {"INV-1": (86.2, MZ[3]), "INV-2": (89.3, MZ[3])}
DC_LEN = 0; VD_DC = []
for S in STRINGS:
    ms = [m for m in MODS if m.get("s") == S["id"]]; cx = sum(m["x"] for m in ms) / len(ms); cy = sum(m["y"] for m in ms) / len(ms)
    ix, iy = inv_xy[S["inv"]]; run = (abs(cx - ix) + abs(cy - iy) + 12) * 1.1
    DC_LEN += 2 * run; S["run_ft"] = round(run)
    vd = 2 * run * FT * MOD["imp"] * 3.9e-3 / (6) * 6 / 6         # 6 mm2 Cu at 70 C ~ 3.9 ohm/km
    S["vd_pct"] = round(2 * run * FT * MOD["imp"] * 3.9e-3 / vmp_stc(S["n"]) * 100, 2)

# ---------------------------------------------------------------- BoQ
def steel_len(kind=None, sec=None, zones=None):
    return sum(math.dist(s[1:4], s[4:7]) * FT for s in STEEL if (kind is None or s[0] == kind) and (sec is None or s[7] == sec) and (zones is None or s[9] in zones))
def boq(zones):
    zs = set(zones); mods = [m for m in MODS if m["zone"] in zs]; cols = [c for c in COLS if c[4] in zs]
    rows = []
    rows.append(("PV module 645 Wp bifacial, 2384x1303x35 mm, 34 kg", len(mods), "no."))
    rows.append(("Column SHS 150x150x6 HDG, base plate 350x350x20 + 4 M20 chemical anchors into the RCC column head", len(cols), "no."))
    rows.append(("  columns, total length", round(sum((c[3] - c[2]) * FT for c in cols), 1), "m"))
    for sec in ("ISMB 200", "ISMC 125", "C 100x50x20x2.5 (rafter)", "SHS 50x50x3 (post)", "C 100x50x20x2.0 (purlin)"):
        L = steel_len(sec=sec, zones=zs)
        if L: rows.append((f"{sec}, HDG", round(L, 1), "m"))
    kg = sum(math.dist(s[1:4], s[4:7]) * FT * s[8] for s in STEEL if s[9] in zs) + sum((c[3] - c[2]) * FT * KGM["SHS 150x150x6"] for c in cols)
    rows.append(("Structural steel, total (+10 % plates, cleats, bracing)", round(kg * 1.10 / 1000, 2), "t"))
    rows.append(("Module clamps (mid + end), Al with SS bolts", sum({"2P": 4, "3L": 6, "2L": 4, "1P": 2}[t["kind"]] * (t["m"] + 1) for t in LAYOUT if t["zone"] in zs), "no."))
    cw = [c for c in CATWALK if c[5] in zs]
    rows.append(("Catwalk 2'-6\" (760 mm) HDG grating with handrail", round(sum((c[2] - c[0]) * FT for c in cw), 1), "m"))
    return rows, kg
BOQ_BASE, KG_BASE = boq([z["id"] for z in BASE]); BOQ_ALL, KG_ALL = boq([z["id"] for z in ZONES])
ELEC = [
    ("String inverter, 3-phase 400 V, 1100 V DC max, >= 4 MPPT, >= 20 A per string input, IP66", " + ".join(f"{i['ac_kw']} kW" for i in INV), ""),
    ("DCDB: DC isolator 1000 V 32 A per string + Type II DC SPD 1000 V", len(STRINGS), "string ways"),
    ("PV cable 6 mm2 H1Z2Z2-K / PV1-F (red + black), MC4 connectors", round(DC_LEN * FT), "m"),
    ("ACDB: 2 x MCCB 4P (80 A / 100 A), outgoing MCCB 4P 160 A, Type II AC SPD, meter", 1, "set"),
    ("AC cable 4C x 70 mm2 Cu XLPE/SWA + 1C x 35 mm2 PE (roof to LT panel)", round(L_AC_M), "m"),
    ("Inverter AC tails 4C x 16 / 4C x 25 mm2 Cu", 6, "m"),
    ("Cable tray HDG perforated 150x50 / 200x50 with covers", round(sum(sum(math.dist(a, b) for a, b in zip(t['pts'], t['pts'][1:])) for t in TRAYS) * FT), "m"),
    ("GI trunking for the AC riser, 150x100", round(sum(math.dist(a, b) for a, b in zip(RISER['pts'], RISER['pts'][1:])) * FT), "m"),
    ("Earth pits, 3 m Cu-bonded rod, test chamber (DC / AC / LA), <= 5 ohm, bonded", 3, "no."),
    ("Bonding: 16 mm2 Cu (structure, module frames via WEEB/earth clips), 25 x 3 mm Cu tape", "lot", ""),
    ("ESE lightning arrester (dT >= 30 us) on 5 m GI mast + 70 mm2 Cu down conductor", 1, "set"),
    ("Water point: 3/4\" GI line from the booster pump, tap + 30 m hose reel (RO / soft water for cleaning)", 1, "set"),
    ("Monitoring: inverter Wi-Fi / 4G dongle, export limiter / zero-export meter (generator interlock)", 1, "set"),
]

# ---------------------------------------------------------------- outputs
def r2(v): return round(float(v), 3)
SUNPATH = {m: [[h, *[r2(x) for x in sun(MONTH[m], h)[0]], round(sun(MONTH[m], h)[1], 1), round(sun(MONTH[m], h)[2], 1)] for h in np.arange(6.5, 17.51, 0.25) if sun(MONTH[m], h)[1] > 0] for m in MONTH}
view = dict(
    mod=dict(L=r2(MOD_L), W=r2(MOD_W), T=r2(MOD_T), tilt=TILT, wp=MOD["p"]),
    zones=[dict(id=z["id"], name=z["name"], base=z["base"], roof=z["roof"], modules=z["modules"], kwp=round(z["modules"] * MOD["p"] / 1000, 2),
                kind=z.get("kind"), area=round(z["allow"].area)) for z in ZONES],
    m=[[m["x"], m["y"], m["z"], m["o"], "ABCDW".index(m["zone"]), m.get("s", "")] for m in MODS],
    tables=[[t["id"], t["kind"], r2(t["x0"]), r2(t["y0"]), r2(t["x1"]), r2(t["y1"]), r2(t["zlow"]), r2(t["zhigh"]), t["n"]] for t in LAYOUT],
    cols=COLS, steel=[[s[0], *[r2(v) for v in s[1:7]], s[9]] for s in STEEL], catwalks=CATWALK,
    mumty=dict(b=[r2(v) for v in mumty.bounds], z0=ROOF_Z, z1=ROOF_Z + MUMTY_H, door=[r2(v) for v in door.bounds]),
    skylight=[r2(v) for v in skylight.bounds], equip=EQUIP, trays=TRAYS, riser=RISER,
    inv=INV, strings=STRINGS, sunpath=SUNPATH, shade=dict(dec=max(SH_DEC.values()), jun=max(SH_JUN.values())),
    yield_=dict(sy=Y["specific_yield_monofacial"], sy_bif=Y["specific_yield_bifacial"], monthly=Y["monthly_kwh_per_kwp"]),
    counts=dict(base=n_base, all=n_all, target=210, kwp_base=round(n_base * 0.645, 2), kwp_all=round(n_all * 0.645, 2)),
    boq_base=BOQ_BASE, boq_all=BOQ_ALL, elec=ELEC, kg_base=round(KG_BASE * 1.1), kg_all=round(KG_ALL * 1.1),
    el=dict(nmax=nmax, nmin=nmin, voc1=round(voc_cold(1), 2), vmp1=round(vmp_hot(1), 2), tmin=T_MIN, tcell=T_CELL_MAX, ac_kw=AC_KW, i_ac=round(I_AC, 1),
            l_ac=round(L_AC_M, 1), vd_ac=round(VD_AC, 2), dc_m=round(DC_LEN * FT)),
    modspec=MOD,
    areas=dict(deck=round(deck35.area), setback=round(deck35.buffer(-SETBACK, join_style=2).area), usable=round(usable35.area), usable_rcc=round(usable35_nosheet.area)),
)
json.dump(view, open("solar_design.json", "w"), separators=(",", ":"), default=lambda o: o.item() if hasattr(o, "item") else float(o))
rep = dict(KINDS={k: {a: round(float(b), 2) for a, b in v.items() if not isinstance(b, str)} for k, v in KINDS.items()},
           areas=dict(deck35=round(deck35.area), setback_usable=round(deck35.buffer(-SETBACK, join_style=2).area), usable_after_obstructions=round(usable35.area),
                      usable_no_sheet=round(usable35_nosheet.area), sheet_zone=round(sheet.area), courtyard=round(courtyard.area), mumty=round(mumty.area),
                      skylight=round(skylight.area), door=round(door.area)),
           zones=view["zones"], counts=view["counts"], inv=INV, strings=STRINGS, nmax=nmax, nmin=nmin, voc_cold_1=round(voc_cold(1), 2), vmp_hot_1=round(vmp_hot(1), 2),
           ac_kw=AC_KW, i_ac=round(I_AC, 1), l_ac_m=round(L_AC_M, 1), vd_ac=round(VD_AC, 2), dc_len_m=round(DC_LEN * FT),
           boq_base=BOQ_BASE, boq_all=BOQ_ALL, kg_base=round(KG_BASE), kg_all=round(KG_ALL), elec=ELEC, yield_=Y, shade=view["shade"],
           cols=len(COLS), cols_new=sum(1 for c in COLS if c[5].startswith("new")), mod=MOD, tmin=T_MIN, tcell=T_CELL_MAX)
json.dump(rep, open("solar_report.json", "w"), indent=1, default=lambda o: o.item() if hasattr(o, "item") else float(o))
print(json.dumps(dict(counts=view["counts"], zones=[(z["id"], z["modules"], z["kind"]) for z in ZONES], inv=INV, strings=[(s["id"], s["n"], s["voc_cold"], s["vmp_hot"], s["vd_pct"]) for s in STRINGS],
                      nmax=nmax, nmin=nmin, ac=AC_KW, iac=round(I_AC), lac=round(L_AC_M), vdac=round(VD_AC, 2), cols=len(COLS), steel_t=round(KG_ALL / 1000, 2), shade=view["shade"]), default=float))
