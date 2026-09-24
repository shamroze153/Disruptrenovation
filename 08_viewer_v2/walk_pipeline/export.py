import numpy as np, json, math
from scipy import ndimage as ndi
from anchors import A
d=np.load('grids.npz'); C=0.5; H,W=260,303
seeds=json.load(open('seeds.json'))
STAIRS={"Main stair":(85.0,94.0,92.5,105.5,["GF","FF","SF"]),
        "West stair":(14.5,25.1,77.7,87.1,["GF","FF","SF"]),
        "Service stair":(137.5,147.0,88.0,104.0,["GF","FF","SF"])}
data={"C":C,"W":W,"H":H,"floors":{}, "stairs":[]}
mains={}
for k in ('GF','FF','SF'):
    import os
    walk=np.load(f'walkF_{k}.npy') if os.path.exists(f'walkF_{k}.npy') else d[f'{k}_walk']
    plate=d[f'{k}_plate']; lab=np.load(f'lab_{k}.npy')
    lbl,n=ndi.label(walk); sizes=ndi.sum(walk,lbl,range(1,n+1)); main=lbl==(np.argmax(sizes)+1)
    mains[k]=(main,ndi.distance_transform_edt(walk)*C)
    v=(lab.astype(np.uint16)&63)|(plate.astype(np.uint16)<<6)|(walk.astype(np.uint16)<<7)
    flat=v.ravel()  # row-major, row 0 = south
    rle=[]; i=0; N=len(flat)
    while i<N:
        j=i
        while j<N and flat[j]==flat[i] and j-i<65000: j+=1
        rle+= [int(flat[i]), j-i]; i=j
    rooms=[]
    for idx,(nm,x,y,dim,kind) in enumerate(A[k]):
        r,c=seeds[k][idx]
        rooms.append({"n":nm,"d":dim,"k":kind,"x":round(c*C+0.25,2),"y":round(r*C+0.25,2)})
    data["floors"][k]={"rle":rle,"rooms":rooms}
    print(k,'rle len',len(rle))
def arrival(k,rect):
    x0,x1,y0,y1=rect; main,dist=mains[k]
    ys,xs=np.nonzero(main); X=xs*C+0.25; Y=ys*C+0.25
    dx=np.maximum(np.maximum(x0-X,X-x1),0); dy=np.maximum(np.maximum(y0-Y,Y-y1),0); g=np.hypot(dx,dy)
    ok=(g>1.2)&(g<7)&(dist[ys,xs]>1.3)
    if not ok.any(): ok=(g<9)
    score=g-0.4*dist[ys,xs]; score[~ok]=1e9
    j=np.argmin(score); px,py=float(X[j]),float(Y[j])
    cx,cy=(x0+x1)/2,(y0+y1)/2
    yaw=math.atan2(px-cx,py-cy)   # face away from the stair
    return [round(px,2),round(py,2),round(yaw,3)]
for nm,(x0,x1,y0,y1,fl) in STAIRS.items():
    data["stairs"].append({"n":nm,"r":[x0,x1,y0,y1],"f":fl,"p":{k:arrival(k,(x0,x1,y0,y1)) for k in fl}})
    print(nm, data["stairs"][-1]["p"])
def snap(k,x,y):
    main,dist=mains[k]; ys,xs=np.nonzero(main&(dist>1.4)); X=xs*C+0.25; Y=ys*C+0.25
    j=np.argmin((X-x)**2+(Y-y)**2); return round(float(X[j]),2),round(float(Y[j]),2)
T=[
 ("GF",86,2.6,86,20,0,"Main gate","You're standing at the main gate on the south side. The guard post is right here at the boundary, and the entrance foyer is straight ahead."),
 ("GF",87.6,12.5,88,30,0,"Entrance foyer","The entrance foyer, 19'-0\" × 8'-11\". It's a single-storey block with its roof at +12'-5\", so the front of the building steps down to one storey here."),
 ("GF",88.5,31,88.5,44,0.42,"Reception area","Reception, 20'-6\" × 21'-5\". Look up: this space is double height, 22'-1\" to the ceiling, and the first floor wraps around the opening above you."),
 ("GF*",87.6,74,87.6,56,0.6,"Courtyard","You're standing in the courtyard, 23'-0\" × 28'-4\". Look up: it is open to the sky and glazed on all sides through all three storeys, bringing daylight into the middle of the building."),
 ("GF",108,40,120,41,0,"Board room","The board room, 23'-6\" × 18'-0\", reached from the 6'-9\" passage beside the reception."),
 ("GF",109,77,109,86,0.08,"Reading room","The reading room, 20'-7\" × 19'-4\", with a 17'-0\" clear height noted on the drawings."),
 ("GF",100,116,115,118,0,"Gym","The staff gym, 36'-0\" × 19'-11\", in the north-east welfare wing, next to the gaming room and shower and changing area."),
 ("GF",57.6,95,57.6,102,0,"Day care","Day care, 20'-3\" × 14'-9\", in the north-west wing next to the medical assist room and the female staff common room."),
 ("GF",55,60,55,72,0,"West wing workstations","The west wing. Its floor sits one foot higher than the rest of the ground floor, at +2'-0\"."),
 ("FF",86,114,118,114,0,"First floor: open workstations","First floor, +12'-5\". The largest open-plan area: 52'-2\" × 19'-5\" for 38 people, with 12'-8\" clear height."),
 ("FF",127,95,133,96,0,"Server room","The server room, 11'-4\" × 15'-7\", beside the male bath room on the north-east side."),
 ("SF",117,48,117,62,0,"Rooftop cafeteria","Second floor, +23'-10\". The rooftop cafeteria, 24'-1\" × 53'-1\", seats 70 people, with a bar counter and store rooms alongside. Parts of this roof are corrugated sheet, not slab."),
 ("SF",108,80,112,90,0,"Recreational area","The recreational area, 27'-2\" × 19'-2\", with the open handwash and bath rooms just to the north."),
 ("SF",104,25,104,15,0,"Masjid / prayer area","The masjid and prayer area (Block D), with an ablution space and a shoe rack in front of it."),
 ("SF",99,113,99,121,0,"Second floor workstations","The largest workstation area on the second floor, 48'-0\" × 20'-1\" for 32 people. That's the end of the tour — keep walking on your own."),
]
tour=[]
for (k,x,y,lx,ly,pitch,title,cap) in T:
    if k.endswith("*"): k=k[:-1]; sx,sy=x,y
    else: sx,sy=snap(k,x,y)
    yaw=math.atan2(lx-sx,ly-sy)
    tour.append({"f":k,"x":sx,"y":sy,"yaw":round(yaw,3),"pitch":pitch,"t":title,"c":cap})
    if abs(sx-x)+abs(sy-y)>2: print('snapped',title,(x,y),'->',(sx,sy))
data["tour"]=tour
s=json.dumps(data,separators=(',',':'))
open('walkdata.json','w').write(s); print('bytes',len(s))
