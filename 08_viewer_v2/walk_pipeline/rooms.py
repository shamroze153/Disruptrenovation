import numpy as np, json, cv2, heapq
from anchors import A
d=np.load('grids.npz'); C=0.5
SQ2=2**0.5
def geodesic(walk,plate,seeds,maxd):
    H,W=walk.shape; dist=np.full((H,W),np.inf); lab=np.zeros((H,W),np.int32)
    pq=[]
    for i,(r,c) in enumerate(seeds):
        dist[r,c]=0; lab[r,c]=i+1; heapq.heappush(pq,(0.0,r,c))
    nb=[(-1,0,1),(1,0,1),(0,-1,1),(0,1,1),(-1,-1,SQ2),(-1,1,SQ2),(1,-1,SQ2),(1,1,SQ2)]
    while pq:
        dd,r,c=heapq.heappop(pq)
        if dd>dist[r,c]: continue
        for dr,dc,w in nb:
            rr,cc=r+dr,c+dc
            if 0<=rr<H and 0<=cc<W and walk[rr,cc]:
                if dr and dc and not (walk[r,cc] and walk[rr,c]): continue
                nd=dd+w*C+(25.0 if plate[rr,cc]!=plate[r,c] else 0)
                if nd<dist[rr,cc] and nd<maxd:
                    dist[rr,cc]=nd; lab[rr,cc]=lab[r,c]; heapq.heappush(pq,(nd,rr,cc))
    return lab,dist
out={}
for k in ('GF','FF','SF'):
    walk=d[f'{k}_walk']; plate=d[f'{k}_plate']; H,W=walk.shape
    wy,wx=np.nonzero(walk); seeds=[]
    for (n,x,y,dim,kind) in A[k]:
        c,r=int(x/C),int(y/C)
        if not (0<=r<H and 0<=c<W and walk[r,c]):
            j=np.argmin((wx-c)**2+(wy-r)**2); r,c=wy[j],wx[j]
        seeds.append((r,c))
    lab,dist=geodesic(walk,plate,seeds,60.0)
    np.save(f'lab_{k}.npy',lab.astype(np.uint8))
    rng=np.random.RandomState(5); cols=rng.randint(90,245,(len(A[k])+1,3)); cols[0]=(255,255,255)
    img=cols[lab].astype(np.uint8); img[d[f'{k}_walls']]=(30,30,30)
    img=np.flipud(img); S=5; img=cv2.resize(img,(W*S,H*S),interpolation=cv2.INTER_NEAREST)
    for i,(r,c) in enumerate(seeds):
        cv2.circle(img,(c*S,(H-r)*S),4,(0,0,200),-1)
        cv2.putText(img,A[k][i][0][:20],(c*S-30,(H-r)*S-6),cv2.FONT_HERSHEY_SIMPLEX,0.4,(0,0,0),1)
    cv2.imwrite(f'rooms_{k}.png',img)
    areas=np.bincount(lab.ravel(),minlength=len(A[k])+1)*C*C
    out[k]=dict(seeds=seeds)
    print(k,'unlabeled walk ft2',round(((lab==0)&walk).sum()*C*C), [(A[k][i][0][:12],round(areas[i+1])) for i in range(len(A[k])) if areas[i+1]<30])
json.dump({k:[list(map(int,s)) for s in v['seeds']] for k,v in out.items()},open('seeds.json','w'))
