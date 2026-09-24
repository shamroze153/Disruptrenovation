"""Shared geometry helpers: grid -> maximal rectangles."""
import numpy as np

def greedy_rects(mask, min_cells=1):
    """Decompose a binary grid into axis-aligned rectangles (greedy, largest first)."""
    m = mask.astype(bool).copy()
    H, W = m.shape
    rects = []
    while m.any():
        # histogram-based largest rectangle
        best = (0, None)
        h = np.zeros(W, int)
        for r in range(H):
            h = np.where(m[r], h + 1, 0)
            stack = []
            for c in range(W + 1):
                cur = h[c] if c < W else 0
                start = c
                while stack and stack[-1][1] >= cur:
                    s, ht = stack.pop()
                    area = ht * (c - s)
                    if area > best[0]:
                        best = (area, (r - ht + 1, s, ht, c - s))   # r0,c0,nh,nw
                    start = s
                stack.append((start, cur))
        area, box = best
        if box is None or area < min_cells:
            break
        r0, c0, nh, nw = box
        m[r0:r0 + nh, c0:c0 + nw] = False
        rects.append((r0, c0, nh, nw))
    return rects
