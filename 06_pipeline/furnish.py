import numpy as np, json, math, random
from scipy import ndimage as ndi
from anchors import A
random.seed(141); np.random.seed(141)
d=np.load('grids.npz'); C=0.5; H,W=260,303
data=json.load(open('walkdata.json'))
def ffl(k,x,y):
    if k=='GF': return 2.0 if x<60 else 1.0
    if k=='FF': return 16+11/12 if (x<32 and y>92) else (13+11/12 if x<55 else 12+5/12)
    return 25.75 if x<55 else 23+10/12
ITEMS={}; SEATS={}
PEOPLE_RATE=0.72
class Floor:
    def __init__(s,k):
        s.k=k; s.walk=d[k+'_walk'].copy(); s.lab=np.load(f'lab_{k}.npy')
        s.occ=np.zeros_like(s.walk); s.res=np.zeros_like(s.walk)
        s.items=[]
        # reserve around stair arrivals, tour stops, room signs
        pts=[st['p'][k][:2] for st in data['stairs'] if k in st['p']]
        pts+=[[t['x'],t['y']] for t in data['tour'] if t['f']==k]
        yy,xx=np.mgrid[0:H,0:W]; X=xx*C+0.25; Y=yy*C+0.25
        s.X,s.Y=X,Y
        for (px,py) in pts: s.res|=(X-px)**2+(Y-py)**2<5.5**2
        s.ref=pts[0]
        s.refresh()
    def refresh(s):
        s.dist=ndi.distance_transform_edt(s.walk)*C
        st=s.dist>=0.7; lab,_=ndi.label(st); r,c=int(s.ref[1]/C),int(s.ref[0]/C)
        if not st[r,c]:
            ys,xs=np.nonzero(st); j=np.argmin((xs-c)**2+(ys-r)**2); r,c=ys[j],xs[j]
        s.reach=(lab==lab[r,c]); s.nreach=s.reach.sum()
    def rect_cells(s,x0,x1,y0,y1):
        c0,c1=int(math.floor(x0/C)),int(math.ceil(x1/C)); r0,r1=int(math.floor(y0/C)),int(math.ceil(y1/C))
        if c0<0 or r0<0 or c1>W or r1>H: return None
        return (slice(r0,r1),slice(c0,c1))
    def ok(s,rects,room=None,mind=0.3,margin=0.0,inroom=False):
        for (x0,x1,y0,y1) in rects:
            sl=s.rect_cells(x0,x1,y0,y1)
            if sl is None: return False
            if not s.walk[sl].all() or s.res[sl].any(): return False
            if (s.dist[sl]<mind).any(): return False
            if inroom and room is not None and not (s.lab[sl]==room).all(): return False
            if margin>0:
                sm=s.rect_cells(x0-margin,x1+margin,y0-margin,y1+margin)
                if sm is None or s.occ[sm].any(): return False
        return True
    def commit(s,rects,items,check=True):
        old=s.walk.copy()
        for (x0,x1,y0,y1) in rects:
            sl=s.rect_cells(x0,x1,y0,y1); s.walk[sl]=False; s.occ[sl]=True
        if check:
            before_reach=s.reach; before=s.nreach
            s.refresh()
            lost=before-s.nreach
            fp=np.zeros_like(old)
            for (x0,x1,y0,y1) in rects:
                sl=s.rect_cells(x0-1.2,x1+1.2,y0-1.2,y1+1.2)
                if sl: fp[sl]=True
            allowed=(before_reach&fp).sum()
            if lost>allowed+6:
                s.walk=old
                for (x0,x1,y0,y1) in rects:
                    sl=s.rect_cells(x0,x1,y0,y1); s.occ[sl]=False
                s.refresh(); return False
        s.items+=items; return True
    def z(s,x,y): return round(ffl(s.k,x,y),3)
    def it(s,t,x,y,yaw=0,sx=1,sy=1,sz=1,col=0):
        return [t,round(x,2),round(y,2),s.z(x,y),round(yaw,3),round(sx,2),round(sy,2),round(sz,2),col]
    def region(s,rid):
        m=(s.lab==rid)&s.walk
        return m
def person(F,x,y,yaw,sit=True):
    return F.it('psit' if sit else 'pst',x,y,yaw,col=random.randint(0,999))
def seat(F,x,y,yaw,rate=PEOPLE_RATE,chair='chair'):
    out=[F.it(chair,x,y,yaw)]
    if random.random()<rate: out.append(person(F,x,y,yaw))
    return out
def bbox(m):
    ys,xs=np.nonzero(m); return xs.min()*C,(xs.max()+1)*C,ys.min()*C,(ys.max()+1)*C
# ---------------------------------------------------------------- recipes
def workstations(F,rid,single_max=None):
    m=F.region(rid)
    if m.sum()*C*C<40: return 0
    x0,x1,y0,y1=bbox(m); n=0
    horiz=(x1-x0)>=(y1-y0)
    for pass_ in ('pod','single'):
        step=0.5
        ys=np.arange(y0,y1,step); xs=np.arange(x0,x1,step)
        for a in ys:
            for b in xs:
                if single_max and n>=single_max: return n
                cx,cy=b,a
                if F.lab[min(int(cy/C),H-1),min(int(cx/C),W-1)]!=rid: continue
                if pass_=='pod':
                    if horiz:
                        rects=[(cx-2.5,cx+2.5,cy-5.2,cy+5.2)]
                        seats=[(cx,cy-3.4,0.0),(cx,cy+3.4,math.pi)]; desks=[(cx,cy-1.25,0.0),(cx,cy+1.25,math.pi)]
                        mar=(0.0,1.6)
                    else:
                        rects=[(cx-5.2,cx+5.2,cy-2.5,cy+2.5)]
                        seats=[(cx-3.4,cy,math.pi/2),(cx+3.4,cy,-math.pi/2)]; desks=[(cx-1.25,cy,math.pi/2),(cx+1.25,cy,-math.pi/2)]
                        mar=(1.6,0.0)
                else:
                    # single desk against the nearest wall, facing it
                    best=None
                    for yaw,dx,dy in ((0,0,1),(math.pi,0,-1),(math.pi/2,-1,0),(-math.pi/2,1,0)):
                        # wall ahead within 3 ft?
                        wx,wy=cx+dx*3.0,cy+dy*3.0
                        r,c=int(wy/C),int(wx/C)
                        if 0<=r<H and 0<=c<W and not d[F.k+'_walk'][r,c]:
                            best=(yaw,dx,dy); break
                    if not best: continue
                    yaw,dx,dy=best
                    dcx,dcy=cx+dx*1.4,cy+dy*1.4; scx,scy=cx-dx*0.9,cy-dy*0.9
                    if dx==0: rects=[(cx-2.5,cx+2.5,min(dcy,scy)-1.3,max(dcy,scy)+1.3)]
                    else: rects=[(min(dcx,scx)-1.3,max(dcx,scx)+1.3,cy-2.5,cy+2.5)]
                    seats=[(scx,scy,yaw)]; desks=[(dcx,dcy,yaw)]; mar=(1.2,1.2)
                ok=F.ok(rects,rid,mind=0.3) and all(F.ok([(r[0]-mar[0],r[1]+mar[0],r[2]-mar[1],r[3]+mar[1])],rid,mind=0) or True for r in rects)
                if not ok: continue
                # aisle margins against other furniture
                if any(F.occ[F.rect_cells(r[0]-mar[0],r[1]+mar[0],r[2]-mar[1],r[3]+mar[1]) or (slice(0,0),slice(0,0))].any() for r in rects): continue
                items=[]
                for (dx_,dy_,yw) in desks:
                    items.append(F.it('desk',dx_,dy_,yw)); items.append(F.it('mon',dx_,dy_,yw))
                for (sx_,sy_,yw) in seats: items+=seat(F,sx_,sy_,yw)
                if F.commit(rects,items): n+=len(seats)
    return n
def conference(F,rid,big=False):
    m=F.region(rid); area=m.sum()*C*C
    core=m&(F.dist>=2.6)
    if core.sum()<4:
        core=m&(F.dist>=1.8)
        if core.sum()<2: return 0
    x0,x1,y0,y1=bbox(core); cx,cy=(x0+x1)/2,(y0+y1)/2
    if not core[int(cy/C),int(cx/C)]:
        ys,xs=np.nonzero(core); j=len(xs)//2; cx,cy=xs[j]*C+.25,ys[j]*C+.25
    Lx,Ly=x1-x0,y1-y0
    if area<110 or max(Lx,Ly)<4:
        D=3.0
        for D in (3.2,2.6):
            items=[F.it('rtbl',cx,cy,0,D,D,2.45)]
            ch=[]
            for i in range(3):
                a=i*2*math.pi/3+0.4; px,py=cx+math.sin(a)*(D/2+1.2),cy+math.cos(a)*(D/2+1.2)
                ch.append((px,py,math.atan2(cx-px,cy-py)))
            rects=[(cx-D/2,cx+D/2,cy-D/2,cy+D/2)]
            if F.ok(rects,mind=0.2) and all(F.walk[int(p[1]/C),int(p[0]/C)] for p in ch):
                for p in ch: items+=seat(F,*p,rate=0.6)
                if F.commit(rects,items,check=True): return 3
        return 0
    horiz=Lx>=Ly
    L=min(max(Lx,Ly),26 if big else 16); Wd=3.6 if not big else 4.5
    L=max(L,4.5)
    tx0,tx1,ty0,ty1=(cx-L/2,cx+L/2,cy-Wd/2,cy+Wd/2) if horiz else (cx-Wd/2,cx+Wd/2,cy-L/2,cy+L/2)
    for shrink in (0,2,4,6):
        if L-shrink<4: break
        l=L-shrink
        rect=(cx-l/2,cx+l/2,cy-Wd/2,cy+Wd/2) if horiz else (cx-Wd/2,cx+Wd/2,cy-l/2,cy+l/2)
        if not F.ok([rect],mind=1.2): continue
        items=[F.it('tbl',cx,cy,0 if horiz else math.pi/2,l,Wd,2.45)]
        k=max(1,int((l-1)//2.5)); n=0
        for i in range(k):
            t=(i+0.5)/k*l-l/2
            for side in (-1,1):
                if horiz: px,py,yw=cx+t,cy+side*(Wd/2+1.0),(math.pi if side>0 else 0)
                else: px,py,yw=cx+side*(Wd/2+1.0),cy+t,(-math.pi/2 if side>0 else math.pi/2)
                if F.walk[int(py/C),int(px/C)] and F.dist[int(py/C),int(px/C)]>0.6:
                    items+=seat(F,px,py,yw,rate=0.8 if big else 0.65); n+=1
        # head of table
        if horiz: hx,hy,hy_=cx-l/2-1.0,cy,-math.pi/2
        else: hx,hy,hy_=cx,cy-l/2-1.0,0
        if F.walk[int(hy/C),int(hx/C)] and F.dist[int(hy/C),int(hx/C)]>0.8: items+=seat(F,hx,hy,hy_,rate=0.9)
        if F.commit([rect],items): return n
    return 0
def grid_tables(F,rid,D=3.6,pitch=8.0,rate=0.6,kind='rtbl',chairs=4,h=2.45,chair='chair'):
    m=F.region(rid)&(F.dist>=D/2+1.6)
    if not m.any(): return 0
    x0,x1,y0,y1=bbox(F.region(rid)); n=0
    for a in np.arange(y0+D/2+1.8,y1,pitch):
        for b in np.arange(x0+D/2+1.8,x1,pitch):
            r,c=int(a/C),int(b/C)
            if not(0<=r<H and 0<=c<W) or not m[r,c]: continue
            rect=(b-D/2,b+D/2,a-D/2,a+D/2)
            if not F.ok([rect],mind=1.2,margin=1.5): continue
            items=[F.it(kind,b,a,0,D,D,h)]
            for i in range(chairs):
                ang=i*2*math.pi/chairs+(math.pi/4 if chairs==4 else 0)
                px,py=b+math.sin(ang)*(D/2+1.05),a+math.cos(ang)*(D/2+1.05)
                items+=seat(F,px,py,math.atan2(b-px,a-py),rate=rate,chair=chair)
            if F.commit([rect],items): n+=1
    return n
def lounge(F,rid,pingpong=False):
    m=F.region(rid); n=0
    if pingpong:
        core=m&(F.dist>=3.6)
        if core.any():
            ys,xs=np.nonzero(core); j=len(xs)//2; cx,cy=xs[j]*C+.25,ys[j]*C+.25
            x0,x1,y0,y1=bbox(core); horiz=(x1-x0)>(y1-y0)
            rect=(cx-4.6,cx+4.6,cy-2.6,cy+2.6) if horiz else (cx-2.6,cx+2.6,cy-4.6,cy+4.6)
            if F.ok([rect],mind=0.8):
                yw=0 if not horiz else math.pi/2
                items=[F.it('pp',cx,cy,yw)]
                o=6.2
                p1=(cx-o,cy) if horiz else (cx,cy-o); p2=(cx+o,cy) if horiz else (cx,cy+o)
                for (px,py),face in ((p1,1),(p2,-1)):
                    if F.walk[int(py/C),int(px/C)]:
                        items.append(person(F,px,py,(math.pi/2 if horiz else 0)*(1 if face>0 else -1) + (0 if face>0 or horiz else math.pi),sit=False))
                F.commit([rect],items); n+=1
    # sofa groups: two sofas facing across a coffee table
    for _ in range(3):
        core=m&(F.dist>=3.2)&~F.occ
        if not core.any(): break
        ys,xs=np.nonzero(core)
        cand=list(range(0,len(xs),max(1,len(xs)//25)))
        placed=False
        for j in cand:
            cx,cy=xs[j]*C+.25,ys[j]*C+.25
            rect=(cx-3.4,cx+3.4,cy-3.6,cy+3.6)
            if not F.ok([rect],mind=0.6,margin=2.0): continue
            items=[F.it('ctbl',cx,cy,0),F.it('sofa',cx,cy-2.4,0,6.0,1,1),F.it('sofa',cx,cy+2.4,math.pi,6.0,1,1)]
            for sx_ in (-1.4,1.4):
                if random.random()<0.6: items.append(F.it('psofa',cx+sx_,cy-2.4,0,col=random.randint(0,999)))
                if random.random()<0.6: items.append(F.it('psofa',cx+sx_,cy+2.4,math.pi,col=random.randint(0,999)))
            if F.commit([rect],items): n+=1; placed=True; break
        if not placed: break
    return n
def rows_of(F,rid,t,w,dp,pitch_x,pitch_y,yaw=0,stand=0):
    m=F.region(rid); x0,x1,y0,y1=bbox(m); n=0
    for a in np.arange(y0+dp/2+0.8,y1,pitch_y):
        for b in np.arange(x0+w/2+0.8,x1,pitch_x):
            r,c=int(a/C),int(b/C)
            if not(0<=r<H and 0<=c<W) or F.lab[r,c]!=rid: continue
            rect=(b-w/2,b+w/2,a-dp/2,a+dp/2) if abs(math.sin(yaw))<0.5 else (b-dp/2,b+dp/2,a-w/2,a+w/2)
            if not F.ok([rect],mind=0.3,margin=0.2): continue
            items=[F.it(t,b,a,yaw)]
            if stand and random.random()<stand: items.append(person(F,b,a,yaw,sit=False))
            if F.commit([rect],items,check=(t!='rug')): n+=1
    return n
def standers(F,rid,per=260):
    m=F.region(rid)&(F.dist>=1.6)&~F.occ; n=int(F.region(rid).sum()*C*C/per); out=0
    ys,xs=np.nonzero(m)
    for _ in range(n*6):
        if out>=n or len(xs)==0: break
        j=random.randrange(len(xs)); x,y=xs[j]*C+.25,ys[j]*C+.25
        if F.occ[max(0,ys[j]-4):ys[j]+5,max(0,xs[j]-4):xs[j]+5].any() or F.res[ys[j],xs[j]]: continue
        if F.commit([(x-0.6,x+0.6,y-0.6,y+0.6)],[person(F,x,y,random.uniform(-math.pi,math.pi),sit=False)],check=False): out+=1
    return out
# ---------------------------------------------------------------- run
summary={}
for k in ('GF','FF','SF'):
    F=Floor(k); rooms=A[k]; cnt={}
    order=sorted(range(len(rooms)),key=lambda i:{'meet':0,'work':1}.get(rooms[i][4],2))
    for i in order:
        nm,_,_,_,kind=rooms[i]; rid=i+1; r=0
        if nm.startswith('Reception'):
            # counter + waiting sofas
            items=[F.it('counter',85,44.2,math.pi,10,1,1),person(F,85,46.4,math.pi,sit=False)]
            F.commit([(80,90,43,45.5)],items)
            lounge(F,rid); r='special'
        elif any(s in nm for s in ('Meeting','Board','Huddle','Visitor')): r=conference(F,rid,big='Board' in nm)
        elif 'Reading' in nm: r=grid_tables(F,rid,D=3.4,pitch=8.5,rate=0.55,kind='rtbl')
        elif any(s in nm for s in ('Office','office','check in')): r=workstations(F,rid,single_max=2)
        elif kind=='work': r=workstations(F,rid)
        elif any(s in nm for s in ('cafeteria','dining','Refreshment')): r=grid_tables(F,rid,D=3.5,pitch=7.6,rate=0.62)
        elif 'Recreational' in nm: r=lounge(F,rid,pingpong=True)
        elif any(s in nm for s in ('Sitting','common room')): r=lounge(F,rid)
        elif 'Gaming' in nm: r=conference(F,rid)
        elif nm=='Gym': r=rows_of(F,rid,'tread',2.8,6.2,4.2,9.5,0,stand=0.45)
        elif 'Masjid' in nm: r=rows_of(F,rid,'rug',2.4,4.2,2.6,5.2,-math.pi/2)
        elif 'Day care' in nm: r=grid_tables(F,rid,D=2.8,pitch=7.0,rate=0.0,kind='ltbl',h=1.7,chair='kchair')
        elif any(s in nm for s in ('Server','IT room','UPS')): r=rows_of(F,rid,'rack',2.2,3.6,2.3,7.5,0)
        elif 'CCTV' in nm: r=workstations(F,rid,single_max=1)
        elif 'Medical' in nm: r=rows_of(F,rid,'bed',3.2,6.8,6,9,math.pi/2)
        elif 'Generator room' in nm: r=rows_of(F,rid,'gen',10,4.5,13,8,0)
        if kind=='circ' or nm.startswith('Entrance') or 'Lobby' in nm: standers(F,rid,per=230)
        cnt[nm+f'#{rid}']=r
    ITEMS[k]=F.items
    # write back walk mask (furniture blocks walking)
    np.save(f'walkF_{k}.npy',F.walk)
    types={}
    for it in F.items: types[it[0]]=types.get(it[0],0)+1
    summary[k]=types
    print(k,types)
json.dump(ITEMS,open('furniture.json','w'),separators=(',',':'))
