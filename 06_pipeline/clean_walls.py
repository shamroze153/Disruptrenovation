import sys; sys.path.insert(0,'/home/claude')
import glb, numpy as np, json
from scipy import ndimage as ndi
G=glb.load('/home/claude/p141c/DISRUPT_141C_COMPLETE/04_model/Disrupt_141C.glb')
C=0.5; W,H=304,262
def boxes(name):
    V,F=G[name]; B=V.reshape(-1,8,3); return np.c_[B.min(1),B.max(1)]
def rectify(M, axis):
    k=np.ones((1,7),bool) if axis==0 else np.ones((7,1),bool)
    O=ndi.binary_opening(M,structure=k)
    lab,n=ndi.label(O); out=np.zeros_like(M); raw=np.zeros_like(M)
    for i,sl in enumerate(ndi.find_objects(lab),1):
        comp=lab[sl]==i
        if axis==0:   # horizontal bar: per column top/bottom rows
            cols=np.nonzero(comp.any(0))[0]
            tops=np.array([np.nonzero(comp[:,c])[0].min() for c in cols]); bots=np.array([np.nonzero(comp[:,c])[0].max() for c in cols])
            if (bots-tops).max()>7: raw[sl]|=comp; continue
            t,b=int(np.median(tops)),int(np.median(bots))
            sub=np.zeros_like(comp); sub[t:b+1,cols.min():cols.max()+1]=True
        else:
            rows=np.nonzero(comp.any(1))[0]
            ls=np.array([np.nonzero(comp[r])[0].min() for r in rows]); rs=np.array([np.nonzero(comp[r])[0].max() for r in rows])
            if (rs-ls).max()>7: raw[sl]|=comp; continue
            l,r=int(np.median(ls)),int(np.median(rs))
            sub=np.zeros_like(comp); sub[rows.min():rows.max()+1,l:r+1]=True
        out[sl]|=sub
    return out,raw,O
def greedy(mask):
    m=mask.copy(); rects=[]
    Hh,Ww=m.shape
    for r in range(Hh):
        c=0
        while c<Ww:
            if not m[r,c]: c+=1; continue
            c1=c
            while c1<Ww and m[r,c1]: c1+=1
            r1=r+1
            while r1<Hh and m[r1,c:c1].all(): r1+=1
            m[r:r1,c:c1]=False; rects.append((r,r1,c,c1)); c=c1
    return rects
out={}; masks={}
for name in [f'{k}_{t}' for k in ('GF','FF','SF') for t in ('External_Walls','Internal_Walls')]:
    B=boxes(name)
    M=np.zeros((H,W),bool); prof={}
    for b in B:
        c0,c1=int(round(b[0]/C)),int(round(b[3]/C)); r0,r1=int(round(b[1]/C)),int(round(b[4]/C))
        M[r0:r1,c0:c1]=True
        for r in range(r0,r1):
            for c in range(c0,c1): prof.setdefault((r,c),[]).append((round(b[2],2),round(b[5],2)))
    # profile id per cell
    keys={}; P=np.full((H,W),-1,np.int32)
    for (r,c),iv in prof.items():
        iv=tuple(sorted(set(iv))); P[r,c]=keys.setdefault(iv,len(keys))
    RH,rawH,OH=rectify(M,0); RV,rawV,OV=rectify(M,1)
    resid=M&~(OH|OV)
    N=RH|RV|rawH|rawV|resid
    # nearest original cell's profile for every new cell
    _,(ir,ic)=ndi.distance_transform_edt(~M,return_indices=True)
    NP=np.where(N,P[ir,ic],-1)
    inv={v:k for k,v in keys.items()}
    bx=[]
    for pid in np.unique(NP[NP>=0]):
        for (r0,r1,c0,c1) in greedy(NP==pid):
            for (z0,z1) in inv[pid]:
                bx.append([c0*C,r0*C,z0,c1*C,r1*C,z1])
    out[name]=bx; masks[name]=(M,N)
    print(name,'orig boxes',len(B),'new',len(bx),'cells',M.sum(),'->',N.sum())
json.dump(out,open('walls_clean.json','w'))
np.savez_compressed('wallmasks.npz',**{n+'_old':v[0] for n,v in masks.items()},**{n+'_new':v[1] for n,v in masks.items()})
