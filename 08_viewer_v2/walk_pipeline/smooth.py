import sys; sys.path.insert(0,'.')
import glb, numpy as np, json, cv2
from scipy import ndimage as ndi
G=glb.load('../../04_model/Disrupt_141C.glb'); C=0.5; W,H=304,262
def bx(name):
    V,F=G[name]; B=V.reshape(-1,8,3); return np.c_[B.min(1),B.max(1)]
def ras_prof(name):
    M=np.zeros((H,W),bool); P=np.full((H,W),-1,np.int32); prof={}
    for b in bx(name):
        r0,r1=int(round(b[1]/C)),int(round(b[4]/C)); c0,c1=int(round(b[0]/C)),int(round(b[3]/C))
        M[r0:r1,c0:c1]=True
        for r in range(r0,r1):
            for c in range(c0,c1): prof.setdefault((r,c),set()).add((round(b[2],3),round(b[5],3)))
    keys={}
    for (r,c),iv in prof.items(): P[r,c]=keys.setdefault(tuple(sorted(iv)),len(keys))
    return M,P,{v:k for k,v in keys.items()}
def greedy(mask):
    m=mask.copy(); out=[]; Hh,Ww=m.shape
    for r in range(Hh):
        c=0
        while c<Ww:
            if not m[r,c]: c+=1; continue
            c1=c
            while c1<Ww and m[r,c1]: c1+=1
            r1=r+1
            while r1<Hh and m[r1,c:c1].all(): r1+=1
            m[r:r1,c:c1]=False; out.append((r,r1,c,c1)); c=c1
    return out
def rebuild(newM,oldM,P,inv):
    _,(ir,ic)=ndi.distance_transform_edt(~oldM,return_indices=True)
    NP=np.where(newM,P[ir,ic],-1); out=[]
    for pid in np.unique(NP[NP>=0]):
        for (r0,r1,c0,c1) in greedy(NP==pid):
            for (z0,z1) in inv[pid]: out.append([c0*C,r0*C,z0,c1*C,r1*C,z1])
    return out
def rectilinear(cnt,eps=1.6,tol=2.6):
    ap=cv2.approxPolyDP(cnt,eps,True)[:,0,:].astype(float)
    n=len(ap); segs=[]
    for i in range(n):
        p,q=ap[i],ap[(i+1)%n]; dx,dy=q-p
        if abs(dx)>=abs(dy): segs.append(['H',(p[1]+q[1])/2,abs(dx)+1e-3,p,q])
        else: segs.append(['V',(p[0]+q[0])/2,abs(dy)+1e-3,p,q])
    changed=True
    while changed and len(segs)>3:
        changed=False; i=0
        while i<len(segs):
            a,b=segs[i],segs[(i+1)%len(segs)]
            if a[0]==b[0]:
                if abs(a[1]-b[1])<tol or min(a[2],b[2])<1.5:
                    L=a[2]+b[2]; a[1]=(a[1]*a[2]+b[1]*b[2])/L; a[2]=L; a[4]=b[4]; segs.pop((i+1)%len(segs)); changed=True; continue
                else:
                    o='V' if a[0]=='H' else 'H'; coord=a[4][0] if o=='V' else a[4][1]
                    segs.insert(i+1,[o,coord,abs(a[1]-b[1]),a[4],a[4]]); changed=True
            i+=1
    pts=[]
    for i in range(len(segs)):
        a,b=segs[i],segs[(i+1)%len(segs)]
        if a[0]=='H' and b[0]=='V': pts.append((b[1],a[1]))
        elif a[0]=='V' and b[0]=='H': pts.append((a[1],b[1]))
    return np.round(np.array(pts)).astype(np.int32)
def smooth_mask(M):
    cs,hier=cv2.findContours(M.astype(np.uint8),cv2.RETR_CCOMP,cv2.CHAIN_APPROX_NONE)
    out=np.zeros((H,W),np.uint8)
    if hier is None: return M
    for i,c in enumerate(cs):
        if cv2.contourArea(c)<6: continue
        poly=rectilinear(c)
        if len(poly)<4: continue
        val=1 if hier[0][i][3]<0 else 0
        cv2.fillPoly(out,[poly],val)
    # fillPoly paints boundary pixels of holes; small leftovers fine
    return out.astype(bool)
res={}; report={}
K3=np.ones((3,3),bool)
for k in ('GF','FF','SF'):
    SM,SP,SI=ras_prof(k+'_Slab')
    P2=smooth_mask(SM)
    inter=(P2&SM).sum(); union=(P2|SM).sum(); report[k]=round(inter/union,4)
    res[k+'_Slab']=rebuild(P2,SM,SP,SI)
    EM,EP,EI=ras_prof(k+'_External_Walls')
    band=P2&~ndi.binary_erosion(P2,K3)
    res[k+'_External_Walls']=rebuild(band,EM,EP,EI)
    IM,IP,II=ras_prof(k+'_Internal_Walls')
    # straighten internal walls: rectify horizontal & vertical runs, keep only inside the new plate
    def rect(M,axis):
        k_=np.ones((1,7),bool) if axis==0 else np.ones((7,1),bool)
        O=ndi.binary_opening(M,structure=k_); lab,n=ndi.label(O); out=np.zeros_like(M)
        for i,sl in enumerate(ndi.find_objects(lab),1):
            comp=lab[sl]==i
            if axis==0:
                cols=np.nonzero(comp.any(0))[0]; t=[np.nonzero(comp[:,c])[0] for c in cols]
                tops=np.array([a.min() for a in t]); bots=np.array([a.max() for a in t])
                if (bots-tops).max()>7: out[sl]|=comp; continue
                s=np.zeros_like(comp); s[int(np.median(tops)):int(np.median(bots))+1,cols.min():cols.max()+1]=True
            else:
                rows=np.nonzero(comp.any(1))[0]; t=[np.nonzero(comp[r])[0] for r in rows]
                ls=np.array([a.min() for a in t]); rs=np.array([a.max() for a in t])
                if (rs-ls).max()>7: out[sl]|=comp; continue
                s=np.zeros_like(comp); s[rows.min():rows.max()+1,int(np.median(ls)):int(np.median(rs))+1]=True
            out[sl]|=s
        return out,O
        
    IMc=IM|ndi.binary_closing(IM,structure=np.ones((1,5),bool))|ndi.binary_closing(IM,structure=np.ones((5,1),bool))
    RH,OH=rect(IMc,0); RV,OV=rect(IMc,1)
    resid=IMc&~(OH|OV); resid=ndi.binary_opening(resid,structure=np.ones((2,2),bool))
    I2=(RH|RV|resid)&P2&~band
    res[k+'_Internal_Walls']=rebuild(I2,IM,IP,II)
    np.save(f'plate2_{k}.npy',P2); np.save(f'ext2_{k}.npy',band); np.save(f'int2_{k}.npy',I2)
# roof at +35'-3" and its parapet follow the second floor plate
RM,RP,RI=ras_prof('Roof_Level_35-3_Slab'); R2=smooth_mask(RM)
res['Roof_Level_35-3_Slab']=rebuild(R2,RM,RP,RI)
PM,PP,PI=ras_prof('Roof_Level_35-3_Parapet'); res['Roof_Level_35-3_Parapet']=rebuild(R2&~ndi.binary_erosion(R2,K3),PM,PP,PI)
print('plate IoU',report, {k:len(v) for k,v in res.items()})
json.dump({k:[[round(x,3) for x in b] for b in v] for k,v in res.items()},open('clean_geom.json','w'),separators=(',',':'))
# low roofs: straighten outlines; cut the reception and courtyard voids (A-301) out of the +12'-5" roof
VOIDS=[(74.3,95.8,26.1,48.5),(75.6,99.6,51.5,80.8)]
for nm in ('Roof_Level_12-5_Slab','Roof_Level_23-10_Slab'):
    M_,P_,I_=ras_prof(nm)
    if nm.startswith('Roof_Level_12-5'):
        yy,xx=np.mgrid[0:H,0:W]; X=(xx+0.5)*C; Y=(yy+0.5)*C
        for (x0,x1,y0,y1) in VOIDS: M_=M_&~((X>x0)&(X<x1)&(Y>y0)&(Y<y1))
    M2=smooth_mask(ndi.binary_opening(M_,structure=np.ones((3,3),bool)))
    res[nm]=rebuild(M2,M_,P_,I_)
    print(nm,'cells',M_.sum(),'->',M2.sum(),'boxes',len(res[nm]))
json.dump({k:[[round(x,3) for x in b] for b in v] for k,v in res.items()},open('clean_geom.json','w'),separators=(',',':'))
