"""Align the three floor plates to each other before they are stacked.

The ceiling sheets are plotted at slightly different zooms, so the raw plates
differ by a foot or two at the perimeter.  Left uncorrected those slivers become
false roof terraces with parapets running across the plan.
"""
import numpy as np, cv2, json

P = {k: np.load(f"plate_{k}.npy") for k in ("GF", "FF", "SF")}
PXPF = 41.70
S = 4
pad = 100


def blur(m):
    return cv2.GaussianBlur((m * 255).astype(np.uint8), (31, 31), 0)


A = cv2.resize(blur(P["GF"]), None, fx=1 / S, fy=1 / S)
Ap = cv2.copyMakeBorder(A, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=0)
out = {"GF": dict(scale=1.0, dx=0, dy=0, score=1.0)}

for k in ("FF", "SF"):
    Bf = blur(P[k])
    best = None
    for sc in np.arange(0.96, 1.045, 0.0025):
        B = cv2.resize(Bf, None, fx=sc / S, fy=sc / S)
        if B.shape[0] >= Ap.shape[0] or B.shape[1] >= Ap.shape[1]:
            continue
        r = cv2.matchTemplate(Ap, B, cv2.TM_CCOEFF_NORMED)
        _, mx, _, loc = cv2.minMaxLoc(r)
        if best is None or mx > best[0]:
            best = (mx, sc, (loc[0] - pad) * S, (loc[1] - pad) * S)
    mx, sc, dx, dy = best
    out[k] = dict(scale=round(float(sc), 4), dx=int(dx), dy=int(dy), score=round(float(mx), 3))
    M = np.float32([[sc, 0, dx], [0, sc, dy]])
    W = cv2.warpAffine(P[k].astype(np.uint8), M, (P["GF"].shape[1], P["GF"].shape[0]),
                       flags=cv2.INTER_NEAREST)
    np.save(f"plate_{k}_al.npy", W)
    print(k, out[k], "area", round(W.sum() / PXPF ** 2, 1))

np.save("plate_GF_al.npy", P["GF"])
json.dump(out, open("plate_align.json", "w"), indent=1)
print("GF area", round(P["GF"].sum() / PXPF ** 2, 1))
