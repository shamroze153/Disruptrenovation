// ================================================================ FURNITURE & PEOPLE (illustrative)
const FURN = window.FURNITURE || {};
function mat4(x, y, z, sx = 1, sy = 1, sz = 1, rz = 0, rx = 0) {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz, "ZXY"));
  return m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz));
}
function merge(parts) {
  const pos = [], nor = [];
  parts.forEach(([geo, m]) => {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(m);
    pos.push(g.attributes.position.array); nor.push(g.attributes.normal.array);
  });
  const n = pos.reduce((a, b) => a + b.length, 0), P = new Float32Array(n), N = new Float32Array(n);
  let o = 0; pos.forEach((a, i) => { P.set(a, o); N.set(nor[i], o); o += a.length; });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.BufferAttribute(N, 3));
  return g;
}
const BX = (w, d, h) => new THREE.BoxGeometry(w, d, h);
const CYL = (rt, rb, h, s = 14) => new THREE.CylinderGeometry(rt, rb, h, s).rotateX(Math.PI / 2);
const SPH = (r, a = 14, b = 10, t = Math.PI) => new THREE.SphereGeometry(r, a, b, 0, Math.PI * 2, 0, t).rotateX(Math.PI / 2);

function personGeoms(pose) {
  // facing +Y, origin on the floor. pose: "sit" (seat top 1.65 ft) or "stand"
  const S = { shirt: [], pants: [], skin: [], dark: [] };
  if (pose === "stand") {
    [-0.26, 0.26].forEach(x => {
      S.pants.push([BX(0.46, 0.5, 2.75), mat4(x, 0, 1.55)]);
      S.dark.push([BX(0.46, 0.85, 0.28), mat4(x, 0.12, 0.14)]);
      S.shirt.push([BX(0.3, 0.32, 2.05), mat4(x * 2.85, -0.02, 3.72, 1, 1, 1, 0, 0.05)]);
      S.skin.push([BX(0.26, 0.3, 0.36), mat4(x * 2.85, 0.02, 2.55)]);
    });
    S.shirt.push([CYL(0.6, 0.5, 2.1, 16), mat4(0, 0, 3.95, 1, 0.62, 1)]);
    S.skin.push([CYL(0.17, 0.17, 0.35, 10), mat4(0, 0, 5.15)]);
    S.skin.push([SPH(0.42), mat4(0, 0.02, 5.62, 0.9, 1, 1.12)]);
    S.dark.push([SPH(0.45, 14, 8, Math.PI * 0.55), mat4(0, -0.05, 5.68, 0.92, 1.03, 1.05)]);
  } else {
    [-0.28, 0.28].forEach(x => {
      S.pants.push([BX(0.5, 1.7, 0.46), mat4(x, 0.35, 1.9)]);
      S.pants.push([BX(0.44, 0.46, 1.72), mat4(x, 1.08, 0.9)]);
      S.dark.push([BX(0.46, 0.8, 0.28), mat4(x, 1.25, 0.14)]);
      S.shirt.push([BX(0.3, 0.3, 1.15), mat4(x * 2.55, -0.18, 3.2)]);
      S.shirt.push([BX(0.3, 1.2, 0.28), mat4(x * 2.25, 0.4, 2.62)]);
      S.skin.push([BX(0.26, 0.36, 0.2), mat4(x * 2.0, 1.12, 2.62)]);
    });
    S.shirt.push([CYL(0.6, 0.52, 2.0, 16), mat4(-0, -0.22, 3.1, 1, 0.62, 1, 0, -0.06)]);
    S.skin.push([CYL(0.17, 0.17, 0.35, 10), mat4(0, -0.2, 4.2)]);
    S.skin.push([SPH(0.42), mat4(0, -0.14, 4.66, 0.9, 1, 1.12)]);
    S.dark.push([SPH(0.45, 14, 8, Math.PI * 0.55), mat4(0, -0.2, 4.72, 0.92, 1.03, 1.05)]);
  }
  return Object.fromEntries(Object.entries(S).map(([k, v]) => [k, merge(v)]));
}

const FGEO = {};
function furnitureGeoms() {
  if (FGEO.desk) return FGEO;
  FGEO.desk = merge([[BX(5, 2.5, 0.12), mat4(0, 0, 2.44)]]);
  FGEO.deskFrame = merge([[BX(0.1, 2.3, 2.38), mat4(-2.4, 0, 1.19)], [BX(0.1, 2.3, 2.38), mat4(2.4, 0, 1.19)], [BX(4.7, 0.06, 1.5), mat4(0, 1.15, 1.6)]]);
  FGEO.mon = merge([[BX(1.9, 0.08, 1.12), mat4(0, 0.75, 3.35)], [BX(0.12, 0.12, 0.55), mat4(0, 0.8, 2.75)], [BX(0.6, 0.4, 0.04), mat4(0, 0.8, 2.52)], [BX(1.4, 0.45, 0.05), mat4(0, -0.35, 2.53)]]);
  FGEO.chair = merge([[BX(1.6, 1.55, 0.28), mat4(0, 0.05, 1.5)], [BX(1.55, 0.22, 1.75), mat4(0, -0.78, 2.5, 1, 1, 1, 0, -0.1)],
    [CYL(0.1, 0.1, 1.2, 8), mat4(0, 0, 0.8)], [BX(1.9, 0.14, 0.12), mat4(0, 0, 0.12)], [BX(0.14, 1.9, 0.12), mat4(0, 0, 0.12)]]);
  FGEO.tbl = merge([[BX(1, 1, 0.05), mat4(0, 0, 0.975)], [BX(0.02, 0.62, 0.95), mat4(-0.36, 0, 0.475)], [BX(0.02, 0.62, 0.95), mat4(0.36, 0, 0.475)]]);
  FGEO.rtbl = merge([[CYL(0.5, 0.5, 0.05, 28), mat4(0, 0, 0.975)], [CYL(0.05, 0.05, 0.95, 10), mat4(0, 0, 0.475)], [CYL(0.22, 0.24, 0.03, 20), mat4(0, 0, 0.015)]]);
  FGEO.sofa = merge([[BX(1, 2.6, 1.35), mat4(0, 0.1, 0.675)], [BX(1, 0.6, 1.4), mat4(0, -1.0, 2.0)], [BX(0.035, 2.8, 1.95), mat4(-0.49, 0, 0.98)], [BX(0.035, 2.8, 1.95), mat4(0.49, 0, 0.98)]]);
  FGEO.ctbl = merge([[BX(3, 2, 0.1), mat4(0, 0, 1.25)], [BX(2.6, 1.6, 0.08), mat4(0, 0, 0.4)], [BX(0.12, 0.12, 1.2), mat4(-1.35, -0.85, 0.6)], [BX(0.12, 0.12, 1.2), mat4(1.35, -0.85, 0.6)], [BX(0.12, 0.12, 1.2), mat4(-1.35, 0.85, 0.6)], [BX(0.12, 0.12, 1.2), mat4(1.35, 0.85, 0.6)]]);
  FGEO.counter = merge([[BX(1, 2.3, 3.4), mat4(0, 0, 1.7)], [BX(1.02, 2.7, 0.12), mat4(0, -0.1, 3.46)]]);
  FGEO.rack = merge([[BX(2, 3.4, 7), mat4(0, 0, 3.5)]]);
  FGEO.rug = merge([[BX(2.3, 4.0, 0.04), mat4(0, 0, 0.02)]]);
  FGEO.tread = merge([[BX(2.6, 6, 0.55), mat4(0, 0, 0.3)], [BX(0.12, 0.12, 3.6), mat4(-1.1, 2.6, 2.1)], [BX(0.12, 0.12, 3.6), mat4(1.1, 2.6, 2.1)], [BX(2.4, 0.5, 0.8), mat4(0, 2.7, 3.9, 1, 1, 1, 0, 0.4)]]);
  FGEO.pp = merge([[BX(5, 9, 0.12), mat4(0, 0, 2.5)], [BX(5.4, 0.04, 0.5), mat4(0, 0, 2.8)], [BX(4, 0.2, 2.4), mat4(0, -2.5, 1.2)], [BX(4, 0.2, 2.4), mat4(0, 2.5, 1.2)]]);
  FGEO.bed = merge([[BX(3, 6.5, 1.9), mat4(0, 0, 0.95)], [BX(2.4, 1.2, 0.4), mat4(0, 2.4, 2.1)]]);
  FGEO.gen = merge([[BX(10, 4.5, 5.2), mat4(0, 0, 2.9)], [BX(10.6, 5, 0.5), mat4(0, 0, 0.25)]]);
  FGEO.sit = personGeoms("sit"); FGEO.stand = personGeoms("stand");
  return FGEO;
}
const SHIRTS = [0xf2f2ee, 0xa9c4e0, 0x2d3e5c, 0x8a8f96, 0x7a2f3a, 0x6b7048, 0x2a2a2c, 0xd8a3a8, 0xcdb99a, 0x3f7f86, 0xe6e1d3, 0x5d7fa8];
const PANTS = [0x23262b, 0x2f3a4d, 0x5b5f66, 0x8b7a5e, 0x3a3a3a, 0x1f2a3a];
const SKINS = [0x8d5a3c, 0xa56d4b, 0xb97d57, 0xc68e68, 0x7a4b31, 0xd2a07c];
const HAIRS = [0x1a1512, 0x2a1d15, 0x3b2a1e, 0x101010, 0x4a4a4a];
const RUGS = [0x8c2f2f, 0x2f6b4f, 0x2f4f8c, 0x7a5a2a];
const FCOL = { desk: 0xcdb38f, deskFrame: 0x6b6f75, mon: 0x1c1f23, chair: 0x2c3035, tbl: 0x8a6a4a, rtbl: 0xefece5, ltbl: 0xf0c96a,
  sofa: 0x5a6e7e, ctbl: 0x8a6a4a, counter: 0xe8e2d6, rack: 0x202428, tread: 0x3a3e44, pp: 0x1f5f8b, bed: 0xf0f0ee, gen: 0xd8b13a };

function buildFurniture() {
  const G = furnitureGeoms();
  ["GF", "FF", "SF"].forEach(k => {
    const list = FURN[k] || []; if (!list.length) return;
    const name = k + "_Furniture", grp = new THREE.Group(); grp.name = name; root.add(grp); groups[name] = grp;
    const byType = {};
    list.forEach(it => (byType[it[0]] = byType[it[0]] || []).push(it));
    const add = (geo, items, colFn, matCol, xf, shadow = true) => {
      const m = new THREE.MeshStandardMaterial({ color: matCol === undefined ? 0xffffff : matCol, roughness: 0.72, metalness: 0 });
      m.userData.baseEnv = 0.8; m.envMapIntensity = 0.8; envMats.push(m);
      const im = new THREE.InstancedMesh(geo, m, items.length);
      items.forEach((it, i) => {
        const [t, x, y, z, yaw, sx, sy, sz, c] = it;
        const e = (xf && xf(it)) || {};
        im.setMatrixAt(i, mat4(x + (e.dx || 0), y + (e.dy || 0), z + (e.dz || 0), e.sx || sx, e.sy || sy, e.sz || sz, yaw));
        if (colFn) im.setColorAt(i, new THREE.Color(colFn(it, i)));
      });
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.castShadow = shadow; im.receiveShadow = true;
      im.userData.baseColor = m.color.clone(); im.userData.furniture = true;
      grp.add(im);
    };
    const pick = (arr, c, salt) => arr[Math.abs(Math.floor(c * 7919 + salt * 104729)) % arr.length];
    Object.entries(byType).forEach(([t, items]) => {
      if (t === "desk") { add(G.desk, items, null, FCOL.desk); add(G.deskFrame, items, null, FCOL.deskFrame); }
      else if (t === "chair" || t === "kchair") add(G.chair, items, null, t === "kchair" ? 0xe07a4a : FCOL.chair, it => t === "kchair" ? { sx: 0.62, sy: 0.62, sz: 0.62 } : null);
      else if (t === "rug") add(G.rug, items, (it, i) => RUGS[i % RUGS.length], undefined, null, false);
      else if (t === "ltbl") add(G.rtbl, items, null, FCOL.ltbl);
      else if (t === "psit" || t === "pst" || t === "psofa") {
        const geo = t === "pst" ? G.stand : G.sit;
        const xf = t === "psofa" ? (it) => ({ dz: -0.28, dy: 0.15 }) : null;
        add(geo.shirt, items, (it) => pick(SHIRTS, it[8], 1), undefined, xf);
        add(geo.pants, items, (it) => pick(PANTS, it[8], 2), undefined, xf);
        add(geo.skin, items, (it) => pick(SKINS, it[8], 3), undefined, xf);
        add(geo.dark, items, (it) => pick(HAIRS, it[8], 4), undefined, xf);
      }
      else if (G[t]) add(G[t], items, null, FCOL[t]);
    });
  });
  LAYER_GROUPS["Ground floor"].push("GF_Furniture");
  LAYER_GROUPS["First floor"].push("FF_Furniture");
  LAYER_GROUPS["Second floor"].push("SF_Furniture");
  LAYER_GROUPS["Furniture & people"] = ["GF_Furniture", "FF_Furniture", "SF_Furniture"];
}
