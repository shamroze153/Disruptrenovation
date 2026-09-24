import json, struct, numpy as np
def load(path):
    b=open(path,'rb').read()
    L=struct.unpack('<I',b[12:16])[0]; J=json.loads(b[20:20+L]); off=20+L
    BL=struct.unpack('<I',b[off:off+4])[0]; BIN=b[off+8:off+8+BL]
    CT={5126:np.float32,5125:np.uint32,5123:np.uint16,5121:np.uint8}
    NC={'SCALAR':1,'VEC3':3,'VEC4':4,'VEC2':2,'MAT4':16}
    def acc(i):
        a=J['accessors'][i]; bv=J['bufferViews'][a['bufferView']]
        o=bv.get('byteOffset',0)+a.get('byteOffset',0)
        dt=CT[a['componentType']]; n=a['count']*NC[a['type']]
        return np.frombuffer(BIN,dtype=dt,count=n,offset=o).reshape(a['count'],NC[a['type']])
    out={}
    for node in J['nodes']:
        if 'mesh' not in node: continue
        m=J['meshes'][node['mesh']]
        for p in m['primitives']:
            V=acc(p['attributes']['POSITION']).astype(float)
            F=acc(p['indices']).reshape(-1,3) if 'indices' in p else np.arange(len(V)).reshape(-1,3)
            if 'matrix' in node:
                M=np.array(node['matrix']).reshape(4,4).T; V=(np.c_[V,np.ones(len(V))]@M.T)[:,:3]
            if 'translation' in node or 'rotation' in node: print('TRS on',node.get('name'),node.get('translation'),node.get('rotation'))
            out[node.get('name')]=(V,F)
    return out
