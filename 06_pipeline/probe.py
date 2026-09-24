import sys; sys.path.insert(0,'/home/claude')
import glb, numpy as np
from scipy import ndimage as ndi
G=glb.load('/home/claude/p141c/DISRUPT_141C_COMPLETE/04_model/Disrupt_141C.glb'); C=0.5; W,H=304,262
def ras(name):
    V,F=G[name]; B=V.reshape(-1,8,3); b=np.c_[B.min(1),B.max(1)]; M=np.zeros((H,W),bool)
    for x in b: M[int(round(x[1]/C)):int(round(x[4]/C)),int(round(x[0]/C)):int(round(x[3]/C))]=True
    return M
for k in ('GF','FF','SF'):
    P=ras(k+'_Slab'); E=ras(k+'_External_Walls')
    band=P&~ndi.binary_erosion(P)
    print(k,'ext cells',E.sum(),'inside plate',(E&P).sum(),'on plate edge band',(E&band).sum(),'band cells',band.sum())
