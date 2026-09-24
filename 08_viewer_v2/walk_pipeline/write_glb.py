import glb, json, struct, numpy as np
G=glb.load('../../04_model/Disrupt_141C.glb')
CG=json.load(open('clean_geom.json'))
PAL={"Site_Boundary_Wall":0xc3bdb0,"Ground_Apron":0xb5b1a8,"Slab":0xb0aca4,"External_Walls":0xdedacf,"Internal_Walls":0xe8e4da,
 "Glazing":0x8fb6cc,"Roof_Level_12-5_Slab":0xa9a59c,"Roof_Level_23-10_Slab":0xa9a59c,"Roof_Level_35-3_Slab":0xa9a59c,
 "Parapet":0xd8d3c8,"Roof_Corrugated_Sheet":0x9a9c99,"Stairs":0xc6c2b8,"Courtyard_Paving":0xb8b2a6}
def col(n):
    if n in PAL: return PAL[n]
    for k,v in PAL.items():
        if n.endswith(k): return v
    return 0xd6d2c8
def boxes_tris(bx):
    out=[]
    for x0,y0,z0,x1,y1,z1 in bx:
        v=np.array([[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]])
        f=[[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]]
        out.append(v[np.array(f)])
    return np.concatenate(out) if out else np.zeros((0,3,3))
objs=[]
for n,(V,F) in G.items():
    if n in ('Roof_Level_12-5_Parapet','Roof_Level_23-10_Parapet'): continue
    if n in CG: T=boxes_tris(CG[n])
    else:
        T=V[F]
        if n.endswith('_Stairs'):
            c=T.mean(1); T=T[np.hypot(c[:,0]-143.5,c[:,1]-18.5)>4.6]
    if n=='Roof_Level_23-10_Slab':
        T=np.concatenate([T,boxes_tris([[74.8,26.6,23+1/12,95.3,48.0,23+1/12+0.75]])])
    objs.append((n,T))
# write binary glTF, flat normals, non-indexed
bin_=bytearray(); J={"asset":{"version":"2.0","generator":"Disrupt 141-C v2 corrected (feet, Z-up)"},"scene":0,"scenes":[{"nodes":[]}],
   "nodes":[],"meshes":[],"materials":[],"accessors":[],"bufferViews":[],"buffers":[]}
def lin(c): return ((c/255)/12.92) if c/255<=0.04045 else (((c/255)+0.055)/1.055)**2.4
for i,(n,T) in enumerate(objs):
    P=T.reshape(-1,3).astype(np.float32)
    e1=T[:,1]-T[:,0]; e2=T[:,2]-T[:,0]; N=np.cross(e1,e2); N/=np.maximum(np.linalg.norm(N,axis=1,keepdims=True),1e-9)
    N=np.repeat(N,3,axis=0).astype(np.float32)
    for arr,typ in ((P,'pos'),(N,'nor')):
        off=len(bin_); b=arr.tobytes(); bin_+=b; bin_+=b'\0'*((4-len(b)%4)%4)
        J["bufferViews"].append({"buffer":0,"byteOffset":off,"byteLength":len(b),"target":34962})
        acc={"bufferView":len(J["bufferViews"])-1,"componentType":5126,"count":len(arr),"type":"VEC3"}
        if typ=='pos': acc["min"]=P.min(0).tolist(); acc["max"]=P.max(0).tolist()
        J["accessors"].append(acc)
    c=col(n); rgb=[lin((c>>16)&255),lin((c>>8)&255),lin(c&255)]
    m={"name":n+"_mat","pbrMetallicRoughness":{"baseColorFactor":rgb+[0.45 if 'Glazing' in n else 1.0],"metallicFactor":0,"roughnessFactor":0.1 if 'Glazing' in n else 0.85},"doubleSided":True}
    if 'Glazing' in n: m["alphaMode"]="BLEND"
    J["materials"].append(m)
    J["meshes"].append({"name":n,"primitives":[{"attributes":{"POSITION":len(J["accessors"])-2,"NORMAL":len(J["accessors"])-1},"material":i}]})
    J["nodes"].append({"name":n,"mesh":i}); J["scenes"][0]["nodes"].append(i)
J["buffers"].append({"byteLength":len(bin_)})
js=json.dumps(J,separators=(',',':')).encode(); js+=b' '*((4-len(js)%4)%4)
out=struct.pack('<III',0x46546C67,2,12+8+len(js)+8+len(bin_))+struct.pack('<II',len(js),0x4E4F534A)+js+struct.pack('<II',len(bin_),0x004E4942)+bytes(bin_)
open('../../04_model/Disrupt_141C_v2_corrected.glb','wb').write(out)
print('objects',len(objs),'tris',sum(len(t) for _,t in objs),'MB',round(len(out)/1e6,2))
