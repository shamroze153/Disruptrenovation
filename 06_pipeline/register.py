"""Register RCP sheets onto the dimension-plan frame: multi-scale template match on the wall layer."""
import numpy as np, cv2, json
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
SCR = "/tmp/claude-0/-home-claude/34446d55-ff8c-562b-9051-9c5992b25ba3/scratchpad/"

def cyan(path, blur=13):
    a = np.array(Image.open(SCR + path).convert("RGB")).astype(np.int16)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    m = (((b > 140) & (g > 140) & (r < 150)) * 255).astype(np.uint8)
    m[:, 6900:] = 0
    return cv2.GaussianBlur(m, (blur, blur), 0)

pairs = {"GF": ("a111-06.png", "rcp-12.png"),
         "FF": ("ff-07.png", "rcp-13.png"),
         "SF": ("ff-08.png", "rcp-14.png")}
S = 5
out = {}
for k, (dim, rcp) in pairs.items():
    A = cv2.resize(cyan(dim), None, fx=1/S, fy=1/S)
    Bf = cyan(rcp)
    best = None
    pad = 120
    Ap = cv2.copyMakeBorder(A, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=0)
    for sc in np.arange(0.92, 1.22, 0.005):
        B = cv2.resize(Bf, None, fx=sc/S, fy=sc/S)
        if B.shape[0] >= Ap.shape[0] or B.shape[1] >= Ap.shape[1]:
            continue
        res = cv2.matchTemplate(Ap, B, cv2.TM_CCOEFF_NORMED)
        _, mx, _, loc = cv2.minMaxLoc(res)
        if best is None or mx > best[0]:
            best = (mx, sc, (loc[0] - pad) * S, (loc[1] - pad) * S)
    mx, sc, dx, dy = best
    out[k] = dict(scale=round(float(sc), 3), dx=int(dx), dy=int(dy), score=round(float(mx), 3))
    print(k, out[k])
json.dump(out, open("reg.json", "w"), indent=1)
