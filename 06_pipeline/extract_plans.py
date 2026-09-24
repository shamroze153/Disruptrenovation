"""Extract wall occupancy + floor plate outlines from the colour-coded dimension plans."""
import numpy as np, cv2, json
from PIL import Image
Image.MAX_IMAGE_PIXELS = None

SCR = "/tmp/claude-0/-home-claude/34446d55-ff8c-562b-9051-9c5992b25ba3/scratchpad/"
PXPF = 41.70                      # pixels per foot @500dpi  (1" = 12'-0")
CELL_FT = 0.5                     # rasterisation cell
CELL_PX = PXPF * CELL_FT          # 20.85 px

# drawing-area window (excludes sheet frame, title block, legend)
X0, X1, Y0, Y1 = 400, 6700, 205, 5625

SHEETS = {"GF": "a111-06.png", "FF": "ff-07.png", "SF": "ff-08.png"}

def masks(path):
    a = np.array(Image.open(SCR + path).convert("RGB")).astype(np.int16)
    a = a[Y0:Y1, X0:X1]
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    cyan = ((b > 140) & (g > 140) & (r < 150)).astype(np.uint8)
    blk = ((r < 110) & (g < 110) & (b < 110)).astype(np.uint8)
    K = lambda n: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (n, n))
    blk = cv2.morphologyEx(blk, cv2.MORPH_CLOSE, K(9))
    blk = cv2.morphologyEx(blk, cv2.MORPH_OPEN, K(13))
    n, lab, st, _ = cv2.connectedComponentsWithStats(blk, 8)
    keep = np.zeros_like(blk)
    for i in range(1, n):
        x, y, w, h, area = st[i]
        if area > 2500 and max(w, h) > 60:
            keep[lab == i] = 1
    wall = cv2.morphologyEx(cyan, cv2.MORPH_CLOSE, K(15)) | keep
    return cyan, keep, wall

def to_grid(mask):
    h, w = mask.shape
    gh, gw = int(h / CELL_PX), int(w / CELL_PX)
    out = np.zeros((gh, gw), np.float32)
    for j in range(gh):
        y0, y1 = int(j * CELL_PX), int((j + 1) * CELL_PX)
        band = mask[y0:y1]
        for i in range(gw):
            x0, x1 = int(i * CELL_PX), int((i + 1) * CELL_PX)
            out[j, i] = band[:, x0:x1].mean()
    return out

def strip_boundary(grid):
    """Remove the compound boundary wall: the outermost closed rectangle."""
    g = (grid > 0.25).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(g, 8)
    gh, gw = g.shape
    out = g.copy()
    for i in range(1, n):
        x, y, w, h, area = st[i]
        # a thin component spanning almost the whole sheet = boundary wall
        if w > 0.93 * gw and h > 0.93 * gh and area < 0.22 * w * h:
            out[lab == i] = 0
    return out, g

if __name__ == "__main__":
    res = {}
    for name, f in SHEETS.items():
        cy, bk, wall = masks(f)
        grid = to_grid(wall)
        walls, allg = strip_boundary(grid)
        # floor plate: close hard, fill holes, keep largest blob
        K = lambda n: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (n, n))
        plate = cv2.morphologyEx(walls, cv2.MORPH_CLOSE, K(15))
        cnts, _ = cv2.findContours(plate, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cnts = sorted(cnts, key=cv2.contourArea, reverse=True)
        plate_f = np.zeros_like(plate)
        cv2.drawContours(plate_f, cnts[:1], -1, 1, -1)
        np.save(f"walls_{name}.npy", walls)
        np.save(f"plate_{name}.npy", plate_f)
        res[name] = dict(grid=list(walls.shape), wall_cells=int(walls.sum()),
                         plate_cells=int(plate_f.sum()),
                         plate_area_sqft=round(float(plate_f.sum()) * CELL_FT ** 2, 1))
        vis = np.dstack([255 - plate_f * 60, 255 - plate_f * 25 - walls * 195,
                         255 - plate_f * 25 - walls * 195]).astype(np.uint8)
        Image.fromarray(vis).resize((vis.shape[1] * 3, vis.shape[0] * 3), Image.NEAREST).save(f"chk_{name}.png")
    res["meta"] = dict(pxpf=PXPF, cell_ft=CELL_FT, window=[X0, X1, Y0, Y1],
                       extent_ft=[round((X1 - X0) / PXPF, 2), round((Y1 - Y0) / PXPF, 2)])
    json.dump(res, open("plans.json", "w"), indent=1)
    print(json.dumps(res, indent=1))
