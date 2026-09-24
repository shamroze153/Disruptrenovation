import sys; sys.path.insert(0,'.')
import glb, numpy as np, json
from scipy import ndimage as ndi
from skimage.segmentation import watershed
G=glb.load('../../04_model/Disrupt_141C.glb')
C=0.5; W,H=303,260
CLEAN=json.load(open('clean_geom.json'))
def boxes(name):
    if name in CLEAN: return np.array(CLEAN[name])[:,[0,1,2,3,4,5]] if CLEAN[name] else np.zeros((0,6))
    if name not in G: return np.zeros((0,6))
    V,F=G[name]; B=V.reshape(-1,8,3)
    return np.c_[B.min(1),B.max(1)]   # x0 y0 z0 x1 y1 z1
xs=(np.arange(W)+0.5)*C; ys=(np.arange(H)+0.5)*C
X,Y=np.meshgrid(xs,ys)   # [row=y, col=x]
def ffl(k,x,y):
    if k=='GF': return np.where(x<60,2.0,1.0)
    if k=='FF': return np.where((x<32)&(y>92),16+11/12,np.where(x<55,13+11/12,12+5/12))
    return np.where(x<55,25.75,23+10/12)
def raster(bx, test=None):
    m=np.zeros((H,W),bool)
    for b in bx:
        c0,c1=int(np.floor(b[0]/C+1e-6)),int(np.ceil(b[3]/C-1e-6))
        r0,r1=int(np.floor(b[1]/C+1e-6)),int(np.ceil(b[4]/C-1e-6))
        c0,r0=max(c0,0),max(r0,0)
        if test is None: m[r0:r1,c0:c1]=True
        else:
            sub=test(b,X[r0:r1,c0:c1],Y[r0:r1,c0:c1])
            m[r0:r1,c0:c1]|=sub
    return m
STAIRS={"Main":(85.0,94.0,92.5,105.5),"West":(14.5,25.1,77.7,87.1),"Service":(137.5,147.0,88.0,104.0)}
SPIRAL=(143.5,18.5,4.0)
COURT=(76.1,99.1,52.0,80.3)
out={}
for k in ('GF','FF','SF'):
    plate=raster(boxes(k+'_Slab'))
    if k=='GF':
        cm=(X>COURT[0])&(X<COURT[1])&(Y>COURT[2])&(Y<COURT[3]); plate|=cm
    F=ffl(k,X,Y)
    if k=='GF':
        F=np.where(plate,F,0.0); F=np.where(cm,0.5,F)
    def wtest(b,x,y,k=k):
        f=ffl(k,x,y) if k!='GF' else np.where(plate[int(b[1]/C):int(b[1]/C)+x.shape[0], int(b[0]/C):int(b[0]/C)+x.shape[1]] if False else True, ffl(k,x,y), 0)
        return (b[2]<f+5.5)&(b[5]>f+0.4)
    walls=raster(np.r_[boxes(k+'_External_Walls'),boxes(k+'_Internal_Walls')], lambda b,x,y:(b[2]<ffl(k,x,y)+5.5)&(b[5]>ffl(k,x,y)+0.4))
    blocked=walls.copy()
    for (x0,x1,y0,y1) in STAIRS.values():
        blocked|=(X>x0)&(X<x1)&(Y>y0)&(Y<y1)
    if k=='GF':
        site=raster(boxes('Site_Boundary_Wall'))
        blocked|=site
        blocked[:, :2]=True; blocked[:,-2:]=True; blocked[:2,:]=True; blocked[-2:,:]=True
        walk=~blocked
    else:
        walk=plate&~blocked
    out[k]=dict(plate=plate,walls=walls,blocked=blocked,walk=walk,ffl=F)
np.savez_compressed('grids.npz',**{f'{k}_{n}':v for k,d in out.items() for n,v in d.items()})
for k,d in out.items(): print(k,'plate',d['plate'].sum()*C*C,'walk',d['walk'].sum()*C*C)
