"""Top-view drawing of the solar concept for the HANDOFF (solar_plan.png) and the shading figure (solar_shading.png)."""
import json, math, numpy as np, matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Polygon as MP, FancyArrow
from matplotlib.lines import Line2D
from design import *
ZC = {"A": "#1f6fd1", "B": "#6a3fb5", "C": "#e08a00", "W": "#2a9d55", "D": "#999"}
from matplotlib.path import Path as MPath
from matplotlib.patches import PathPatch
from shapely.geometry.polygon import orient
def draw(ax, poly, **kw):
    for p in ([poly] if isinstance(poly, Polygon) else list(getattr(poly, "geoms", []))):
        if p.is_empty: continue
        p = orient(p, 1.0); verts, codes = [], []
        for ring in [p.exterior] + list(p.interiors):
            c = np.array(ring.coords); verts += c.tolist(); codes += [MPath.MOVETO] + [MPath.LINETO] * (len(c) - 2) + [MPath.CLOSEPOLY]
        ax.add_patch(PathPatch(MPath(verts, codes), **kw))
def base_plan(ax, title):
    draw(ax, roof125, fc="#efe6cf", ec="#c9b98e", lw=0.6, zorder=0); draw(ax, roof2310, fc="#dcebd6", ec="#9fbf95", lw=0.6, zorder=0)
    draw(ax, slab35, fc="#e4e4e4", ec="none", zorder=1); draw(ax, parapet, fc="#3a3a3a", ec="none", zorder=3)
    draw(ax, sheet, fc="none", ec="#d99a3a", hatch="////", lw=0.8, zorder=2)
    draw(ax, courtyard, fc="#cfe8ff", ec="#2d7ad6", lw=1, zorder=2); ax.text(86.1, 65, "COURTYARD\nVOID\n(open to sky)", ha="center", va="center", fontsize=7, color="#2d5f99", zorder=4)
    draw(ax, lightwell.buffer(-2), fc="#cfe8ff", ec="#2d7ad6", lw=0.8, zorder=2)
    draw(ax, mumty, fc="#8c3b3b", ec="k", lw=0.8, zorder=6); ax.text(89.3, 100.5, "STAIR\nHEADROOM\n(assumed)", ha="center", va="center", fontsize=6, color="w", zorder=7)
    draw(ax, door, fc="#ffd6d6", ec="#c62828", lw=0.8, ls="--", zorder=6); ax.text(92.3, 89.5, "door\nclear", ha="center", va="center", fontsize=5.5, color="#c62828", zorder=7)
    draw(ax, skylight, fc="#9fd3ff", ec="#1565c0", lw=0.8, zorder=6); ax.text(101.5, 103.7, "SKYLIGHT", ha="center", va="center", fontsize=5.5, color="#0d3c73", zorder=7)
    ax.set_xlim(-3, 153); ax.set_ylim(-4, 146); ax.set_aspect("equal"); ax.set_xticks([]); ax.set_yticks([])
    for sp in ax.spines.values(): sp.set_visible(False)
    ax.set_title(title, fontsize=12, fontweight="bold", loc="left")
    # north arrow + scale
    ax.add_patch(FancyArrow(148, 118, 0, 8, width=0.8, head_width=3, head_length=3, color="k", zorder=9)); ax.text(148, 115, "N", ha="center", fontsize=9, fontweight="bold")
    ax.plot([2, 32], [-2, -2], color="k", lw=2); [ax.plot([x, x], [-2.8, -1.2], color="k", lw=1) for x in (2, 12, 22, 32)]; ax.text(17, -3.9, "30 ft (9.1 m)", ha="center", fontsize=7)
fig, ax = plt.subplots(figsize=(15.5, 14.5)); base_plan(ax, "Disrupt 141-C — rooftop solar concept: plan at +35'-3\" (modules shown in plan projection, tilted 15° to the south)")
for z in ZONES:
    if not z["base"]: draw(ax, z["allow"], fc="none", ec=ZC[z["id"]], lw=1.2, ls=(0, (4, 3)), zorder=4)
for c in CATWALK: ax.add_patch(Rectangle((c[0], c[1]), c[2] - c[0], c[3] - c[1], fc="#bbb", ec="#777", lw=0.4, hatch="....", zorder=5))
for s in STEEL:
    if s[0] == "primary": ax.plot([s[1], s[4]], [s[2], s[5]], color="#555", lw=1.4, zorder=7)
for t in LAYOUT:
    K = KINDS[t["kind"]]
    for (o, u, v) in module_rects(t):
        ax.add_patch(Rectangle((o[0], o[1]), u[0], v[1], fc=ZC[t["zone"]], ec="white", lw=0.35, alpha=0.9 if ZONES[[z["id"] for z in ZONES].index(t["zone"])]["base"] else 0.55, zorder=8))
    ax.text((t["x0"] + t["x1"]) / 2, t["y1"] + 0.6, f"{t['id']} · {t['kind']} · {t['n']}", ha="center", fontsize=5.5, color="#222", zorder=9)
for c in COLS:
    new = c[5].startswith("new")
    ax.add_patch(Rectangle((c[0] - 0.8, c[1] - 0.8), 1.6, 1.6, fc="#ff7a00" if new else "k", ec="k", lw=0.5, zorder=10))
for t in TRAYS:
    p = np.array(t["pts"]); ax.plot(p[:, 0], p[:, 1], color="#c2185b" if t["k"] == "ac" else "#6d4c41", lw=1.6 if t["k"] == "ac" else 1.0, ls="-" if t["k"] == "ac" else "--", zorder=11)
r = np.array(RISER["pts"]); ax.plot(r[:, 0], r[:, 1], color="#c2185b", lw=2.2, zorder=11); ax.plot(r[-1, 0], r[-1, 1], "s", color="#c2185b", ms=6, zorder=12)
ax.annotate("AC riser to the main LT panel\n(generator room, ground floor)", (138.5, 117), (128, 139), fontsize=6.5, arrowprops=dict(arrowstyle="->", lw=0.6), zorder=12)
for e in EQUIP:
    if e["k"] in ("inv", "dcdb", "acdb"): ax.add_patch(Rectangle((e["x"] - e["w"] / 2, e["y"]), e["w"], 1.1, fc="#ffeb3b", ec="k", lw=0.6, zorder=12))
    if e["k"] == "la": ax.plot(e["x"], e["y"], marker="*", color="#d50000", ms=13, zorder=12)
    if e["k"] == "tap": ax.plot(e["x"], e["y"], marker="o", color="#0288d1", ms=6, zorder=12)
    if e["k"] == "pit": ax.plot(e["x"], e["y"], marker="v", color="#2e7d32", ms=7, zorder=12)
ax.annotate("INV-1 / INV-2, DCDBs, ACDB\non the shaded north wall of the stair headroom", (90, 109.5), (100, 136), fontsize=6.5, arrowprops=dict(arrowstyle="->", lw=0.6), zorder=12)
ax.annotate("ESE lightning arrester, 5 m mast", (84.4, 107.7), (40, 136), fontsize=6.5, arrowprops=dict(arrowstyle="->", lw=0.6), zorder=12)
ax.annotate("water tap + hose reel", (88.4, 92.1), (101, 84), fontsize=6.5, arrowprops=dict(arrowstyle="->", lw=0.6), zorder=12)
ax.annotate("earth pits EP-1..3 (ground)", (137.5, 108), (141, 99), fontsize=6.5, arrowprops=dict(arrowstyle="->", lw=0.6), zorder=12)
cnt = view["counts"]
leg = [Line2D([], [], marker="s", ls="", color=ZC["A"], ms=9, label=f"Zone A, east RCC block: {ZONES[0]['modules']} modules"),
       Line2D([], [], marker="s", ls="", color=ZC["B"], ms=9, label=f"Zone B, over reception / masjid: {ZONES[1]['modules']} modules"),
       Line2D([], [], marker="s", ls="", color=ZC["C"], ms=9, alpha=0.6, label=f"Option C, canopy over the rooftop cafeteria: {ZONES[3]['modules']} modules"),
       Line2D([], [], marker="s", ls="", color=ZC["W"], ms=9, alpha=0.6, label=f"Option W, west block: {ZONES[4]['modules']} modules"),
       Line2D([], [], marker="s", ls="", color="k", ms=7, label="SHS 150 column on an existing RCC column"),
       Line2D([], [], marker="s", ls="", color="#ff7a00", mec="k", ms=7, label="new column (options): structural engineer to locate"),
       Line2D([], [], color="#555", lw=1.4, label="primary beam ISMB 200 at 8'-0\" clear"),
       Line2D([], [], color="#6d4c41", lw=1, ls="--", label="DC cable tray"), Line2D([], [], color="#c2185b", lw=1.6, label="AC cable / riser"),
       Rectangle((0, 0), 1, 1, fc="none", ec="#d99a3a", hatch="////", label="asbestos-cement sheet roof (as modelled)"),
       Rectangle((0, 0), 1, 1, fc="#bbb", ec="#777", hatch="....", label="2'-6\" catwalk between rows")]
ax.legend(handles=leg, loc="lower right", fontsize=7.5, frameon=True, framealpha=0.95, bbox_to_anchor=(1.0, 0.0))
ax.text(1, 145, f"Fits: {cnt['base']} modules = {cnt['kwp_base']} kWp on the RCC grid (all rules met).  With options C + W: {int(cnt['all'])} modules = {cnt['kwp_all']} kWp.\n"
        f"The 210-module / 135.45 kWp target does not fit (short by {210 - int(cnt['all'])} modules even with both options).  Shading check 21 Dec 09:00–15:00 solar time: 0 % on every module.",
        fontsize=8.5, va="top", color="#b71c1c", fontweight="bold")
ax.text(1, -8, "Concept / visual design only. Structural (Karachi wind load, slab / beam / column capacity) and electrical design must be verified by certified engineers.", fontsize=7.5, color="#444")
plt.savefig("solar_plan.png", dpi=110, bbox_inches="tight"); plt.close()

# shading figure: shadows of all tables (and the stair headroom) at 09:00, 12:00 and 15:00 on 21 Dec and 21 Jun
fig, axs = plt.subplots(2, 3, figsize=(18, 11.5))
for r_, (mn, lab) in enumerate((("dec", "21 December"), ("jun", "21 June"))):
    for c_, h in enumerate((9, 12, 15)):
        ax = axs[r_][c_]; base_plan(ax, f"{lab}, {h:02d}:00 solar time ({h}:30 PKT approx.)")
        s, alt, az = sun(MONTH[mn], h)
        for t in LAYOUT:
            for (o, u, v) in module_rects(t):
                P = np.array([o, o + u, o + u + v, o + v]); zr = next(z["roof"] for z in ZONES if z["id"] == t["zone"])
                sh = P[:, :2] - (P[:, 2:3] - zr) * s[:2] / s[2]
                ax.add_patch(MP(sh, closed=True, fc="#000", alpha=0.22, ec="none", zorder=7))
                ax.add_patch(Rectangle((o[0], o[1]), u[0], v[1], fc=ZC[t["zone"]], ec="white", lw=0.2, zorder=8))
        ax.text(2, 131, f"sun altitude {alt:.1f}°, azimuth {az:.0f}°", fontsize=8)
plt.suptitle("Shadows cast by the array on the roof (grey). Row spacing keeps every module unshaded 09:00–15:00 on 21 December.", fontsize=12)
plt.savefig("solar_shading.png", dpi=80, bbox_inches="tight")
print("ok")
