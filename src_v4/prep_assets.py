"""v4 assets: strip the GLB meshes that CLEAN_GEOM rebuilds in the viewer (walls, slabs, roofs), re-encode the
drawing underlays as WebP, and report sizes."""
import json, struct, base64, io, numpy as np
from PIL import Image
CG = json.load(open('data/clean_geom.json'))
b = open('model/Disrupt_141C_v3.glb', 'rb').read()
jl = struct.unpack('<I', b[12:16])[0]; J = json.loads(b[20:20 + jl]); BIN = b[20 + jl + 8:]
acc, bv = J['accessors'], J['bufferViews']
nodes = {nd['mesh']: nd.get('name') for nd in J['nodes'] if 'mesh' in nd}
out = bytearray(); newbv = []; newacc = []
def add_view(data, target=None):
    while len(out) % 4: out.append(0)
    off = len(out); out.extend(data); v = {"buffer": 0, "byteOffset": off, "byteLength": len(data)}
    if target: v["target"] = target
    newbv.append(v); return len(newbv) - 1
def copy_acc(i):
    a = dict(acc[i]); v = bv[a['bufferView']]; data = BIN[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
    a['bufferView'] = add_view(data, v.get('target')); newacc.append(a); return len(newacc) - 1
stub_p = np.array([[0, 0, -50], [0.01, 0, -50], [0, 0.01, -50]], np.float32)
for mi, m in enumerate(J['meshes']):
    name = nodes.get(mi)
    for p in m['primitives']:
        if name in CG:     # geometry rebuilt from CLEAN_GEOM at load: keep a 1-triangle stub so the node and its name stay
            vi = add_view(stub_p.tobytes(), 34962)
            newacc.append({"bufferView": vi, "componentType": 5126, "count": 3, "type": "VEC3", "min": stub_p.min(0).tolist(), "max": stub_p.max(0).tolist()})
            p['attributes'] = {"POSITION": len(newacc) - 1}; p.pop('indices', None)
        else:
            p['attributes'] = {k: copy_acc(v) for k, v in p['attributes'].items()}
            if 'indices' in p: p['indices'] = copy_acc(p['indices'])
while len(out) % 4: out.append(0)
J['accessors'] = newacc; J['bufferViews'] = newbv; J['buffers'] = [{"byteLength": len(out)}]
js = json.dumps(J, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
glb = b'glTF' + struct.pack('<II', 2, 12 + 8 + len(js) + 8 + len(out)) + struct.pack('<I', len(js)) + b'JSON' + js + struct.pack('<I', len(out)) + b'BIN\x00' + bytes(out)
open('model/Disrupt_141C_v4_shell.glb', 'wb').write(glb)
print('GLB', len(b) // 1024, 'KB ->', len(glb) // 1024, 'KB')
# underlays
U = json.load(open('data/arch_under.json')); U2 = {}
for k, v in U.items():
    im = Image.open(io.BytesIO(base64.b64decode(v.split(',', 1)[1]))).convert('RGB')
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=72, method=6)
    U2[k] = 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()
    print(k, im.size, 'jpeg', len(v) // 1024, 'KB b64 -> webp', len(U2[k]) // 1024, 'KB b64')
json.dump(U2, open('data/arch_under_webp.json', 'w'), separators=(',', ':'))
