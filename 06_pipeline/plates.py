"""Floor plates from the reflected ceiling plans, mapped into the dimension-plan frame."""
import numpy as np, cv2, json
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
SCR = "/tmp/claude-0/-home-claude/34446d55-ff8c-562b-9051-9c5992b25ba3/scratchpad/"
REG = json.load(open("reg.json"))
X0, X1, Y0, Y1 = 400, 6700, 205, 5625
PXPF, CELL_FT = 41.70, 0.5
CELL_PX = PXPF * CELL_FT
RCP = {"GF": "rcp-12.png", "FF": "rcp-13.png", "SF": "rcp-14.png"}
K = lambda n: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (n, n))

def plate(name):
    a = np.array(Image.open(SCR + RCP[name]).convert("RGB")).astype(np.int16)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    m = (((abs(r-g) < 14) & (abs(g-b) < 14) & (r > 180) & (r < 246)) * 255).astype(np.uint8)
    m[:, 6900:] = 0
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, K(41))
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, K(15))
    # map RCP pixel -> dimension-plan pixel:  p_dim = p_rcp*scale + d
    s, dx, dy = REG[name]["scale"], REG[name]["dx"], REG[name]["dy"]
    M = np.float32([[s, 0, dx], [0, s, dy]])
    big = cv2.warpAffine(m, M, (7000, 5900), flags=cv2.INTER_NEAREST)
    win = big[Y0:Y1, X0:X1]
    # keep blobs bigger than 150 sq ft, fill interior holes except real voids
    n, lab, st, _ = cv2.connectedComponentsWithStats((win > 0).astype(np.uint8), 8)
    keep = np.zeros_like(win)
    for i in range(1, n):
        if st[i][4] / (PXPF ** 2) > 60:
            keep[lab == i] = 255
    return keep

if __name__ == "__main__":
    info = {}
    for nm in RCP:
        p = plate(nm)
        # merge into one plate, then fill small internal holes (< 80 sqft)
        merged = cv2.morphologyEx(p, cv2.MORPH_CLOSE, K(121))
        inv = (merged == 0).astype(np.uint8)
        n, lab, st, cen = cv2.connectedComponentsWithStats(inv, 4)
        filled = merged.copy()
        holes = []
        for i in range(1, n):
            x, y, w, h, area = st[i]
            if x == 0 or y == 0 or x + w >= inv.shape[1] or y + h >= inv.shape[0]:
                continue                       # outside
            aft = area / (PXPF ** 2)
            if aft < 80:
                filled[lab == i] = 255
            else:
                holes.append(dict(area_sqft=round(aft, 1),
                                  cx_ft=round(cen[i][0] / PXPF, 1), cy_ft=round(cen[i][1] / PXPF, 1),
                                  w_ft=round(w / PXPF, 1), h_ft=round(h / PXPF, 1)))
        np.save(f"plate_{nm}.npy", (filled > 0).astype(np.uint8))
        info[nm] = dict(area_sqft=round(float((filled > 0).sum()) / PXPF ** 2, 1),
                        voids=sorted(holes, key=lambda d: -d["area_sqft"])[:6])
        Image.fromarray(255 - filled).resize((1100, int(1100 * filled.shape[0] / filled.shape[1]))).save(f"plate_{nm}.png")
    json.dump(info, open("plates.json", "w"), indent=1)
    print(json.dumps(info, indent=1))
