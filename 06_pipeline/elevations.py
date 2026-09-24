"""Extract facade openings from the four elevations, calibrated by each sheet's own level ladder."""
import numpy as np, cv2, json
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
SCR = "/tmp/claude-0/-home-claude/34446d55-ff8c-562b-9051-9c5992b25ba3/scratchpad/"
SHEETS = {"front": "p-15.png", "rear": "p-16.png", "left": "p-17.png", "right": "p-18.png"}
LEVELS_TOP, LEVELS_BOT = 39.25, 0.0          # parapet, road

def ladder(gray):
    H, W = gray.shape
    lad = gray[:, int(0.025 * W):int(0.115 * W)] < 140
    rows = [y for y in range(H) if lad[y].sum() > 0.18 * lad.shape[1]]
    cl = []
    for y in rows:
        if cl and y - cl[-1][-1] <= 4:
            cl[-1].append(y)
        else:
            cl.append([y])
    cs = [int(np.mean(c)) for c in cl if 300 < np.mean(c) < 4400]
    top, bot = cs[0], cs[-1]
    return (bot - top) / (LEVELS_TOP - LEVELS_BOT), bot          # px per ft, y of road level

def openings(name):
    g = np.array(Image.open(SCR + SHEETS[name]).convert("L"))
    H, W = g.shape
    pxpf, y0 = ladder(g)
    bx0, bx1 = int(0.125 * W), int(0.86 * W)
    body = g[:, bx0:bx1]
    b = (body < 140).astype(np.uint8)
    # openings are drawn as nested rectangles; close then find rectangular contours
    cnts, hier = cv2.findContours(b, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    raw = []
    for c in cnts:
        x, y, w, h = cv2.boundingRect(c)
        wf, hf = w / pxpf, h / pxpf
        if not (1.2 <= wf <= 22 and 2.2 <= hf <= 11):
            continue
        per = cv2.arcLength(c, True)
        ap = cv2.approxPolyDP(c, 0.03 * per, True)
        if len(ap) < 4 or len(ap) > 8:
            continue
        if cv2.contourArea(c) < 0.5 * w * h:
            continue
        raw.append([x, y, w, h])
    # merge the nested double-line outlines of the same opening
    raw.sort(key=lambda r: -r[2] * r[3])
    keep = []
    for r in raw:
        x, y, w, h = r
        dup = False
        for k in keep:
            ix = max(0, min(x + w, k[0] + k[2]) - max(x, k[0]))
            iy = max(0, min(y + h, k[1] + k[3]) - max(y, k[1]))
            if ix * iy > 0.55 * min(w * h, k[2] * k[3]):
                dup = True
                break
        if not dup:
            keep.append(r)
    out = []
    for x, y, w, h in keep:
        out.append(dict(u0=round(x / pxpf, 2), u1=round((x + w) / pxpf, 2),
                        z0=round((y0 - (y + h)) / pxpf, 2), z1=round((y0 - y) / pxpf, 2)))
    # drawn extent of the building silhouette
    col = b.sum(axis=0)
    nz = np.nonzero(col > 3)[0]
    return dict(pxpf=round(pxpf, 3), road_y=y0,
                extent_ft=round((nz[-1] - nz[0]) / pxpf, 1),
                u_off=round(nz[0] / pxpf, 2),
                openings=sorted(out, key=lambda d: (round(d["z0"]), d["u0"])))

if __name__ == "__main__":
    res = {k: openings(k) for k in SHEETS}
    json.dump(res, open("elev.json", "w"), indent=1)
    for k, v in res.items():
        print(f"{k:6s} pxpf={v['pxpf']:.2f} drawn extent={v['extent_ft']}ft  openings={len(v['openings'])}")
        for o in v["openings"][:40]:
            print(f"    u {o['u0']:7.2f}->{o['u1']:7.2f}  z {o['z0']:6.2f}->{o['z1']:6.2f}   "
                  f"w={o['u1']-o['u0']:5.2f} h={o['z1']-o['z0']:5.2f}")
