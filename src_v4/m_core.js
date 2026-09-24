// ================================================================ FURNITURE, EQUIPMENT & PEOPLE (v3.2)
// Seating traced from the furniture plans A-401/402/403; everything else laid out per department.
// All models are procedural (no external assets): smooth rounded geometry, one "kit" material per part
// with per-slot colour / roughness / metalness and procedural wood, fabric, metal and skin detail.
const FURN = window.FURNITURE || {};
const KIT = { white: { value: 0 } };
function rnd01(seed) { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function pickS(arr, seed, salt) { return arr[Math.floor(rnd01(seed * 1.37 + salt * 17.13) * arr.length) % arr.length]; }
const _kq = new THREE.Quaternion(), _ke = new THREE.Euler(), _kv = new THREE.Vector3(), _ks = new THREE.Vector3();
function M4(x = 0, y = 0, z = 0, rz = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0) {
  _ke.set(rx, ry, rz, "ZXY"); _kq.setFromEuler(_ke);
  return new THREE.Matrix4().compose(_kv.set(x, y, z), _kq, _ks.set(sx, sy, sz));
}
// v4: tessellation follows the quality level (QUAL.det: High 1.0, Medium 0.6, Low 0.4)
const SEG = (n, lo = 5) => Math.max(lo, Math.round(n * ((typeof QUAL !== "undefined" && QUAL.det) || 1)));
const LATHE = (pts, seg = 12, ...r) => new THREE.LatheGeometry(pts, SEG(seg, 5), ...r);
const TORUS = (R, r, rs = 12, ts = 48, arc) => new THREE.TorusGeometry(R, r, SEG(rs, 3), SEG(ts, 6), arc);
const SPHERE = (r, ws = 32, hs = 16, ...rest) => new THREE.SphereGeometry(r, SEG(ws, 5), SEG(hs, 3), ...rest);
const CYLINDER = (rt, rb, h, rs = 32, hs = 1, ...rest) => new THREE.CylinderGeometry(rt, rb, h, SEG(rs, 5), hs, ...rest);
const TUBE = (curve, ts = 64, r, rs = 8, closed) => new THREE.TubeGeometry(curve, SEG(ts, 4), r, SEG(rs, 3), closed);
const GCACHE = new Map();
function cacheG(key, fn) { if (!GCACHE.has(key)) GCACHE.set(key, fn()); return GCACHE.get(key); }
const BOXG = (w, d, h) => cacheG(`b${w},${d},${h}`, () => new THREE.BoxGeometry(w, d, h));
function RBOXG(w, d, h, r, s = 2) {
  if (typeof QUAL !== "undefined" && QUAL.det < 0.8) s = Math.max(1, Math.round(s * 0.5));
  return cacheG(`rb${w},${d},${h},${r},${s}`, () => {
    r = Math.max(0.001, Math.min(r, w / 2 - 1e-4, d / 2 - 1e-4, h / 2 - 1e-4));
    const half = [w / 2, d / 2, h / 2], inner = [w / 2 - r, d / 2 - r, h / 2 - r], P = [], N = [];
    const lin = (a) => { const L = [-a]; for (let k = 1; k <= s; k++) L.push(-a + r * k / s); for (let k = s; k >= 1; k--) L.push(a - r * k / s); L.push(a); return L; };
    const vert = (p) => {
      const q = [Math.max(-inner[0], Math.min(inner[0], p[0])), Math.max(-inner[1], Math.min(inner[1], p[1])), Math.max(-inner[2], Math.min(inner[2], p[2]))];
      let n = [p[0] - q[0], p[1] - q[1], p[2] - q[2]]; const L = Math.hypot(n[0], n[1], n[2]) || 1; n = [n[0] / L, n[1] / L, n[2] / L];
      return [[q[0] + n[0] * r, q[1] + n[1] * r, q[2] + n[2] * r], n];
    };
    for (const [ax, sg] of [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]]) {
      const u = (ax + 1) % 3, v = (ax + 2) % 3, U = lin(half[u]), V = lin(half[v]);
      const at = (i, j) => { const p = [0, 0, 0]; p[ax] = sg * half[ax]; p[u] = U[i]; p[v] = V[j]; return vert(p); };
      for (let i = 0; i < U.length - 1; i++) for (let j = 0; j < V.length - 1; j++) {
        const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d_ = at(i, j + 1);
        const tri = sg > 0 ? [a, b, c, a, c, d_] : [a, c, b, a, d_, c];
        tri.forEach(([p, n]) => { P.push(p[0], p[1], p[2]); N.push(n[0], n[1], n[2]); });
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
    return g;
  });
}
const CYLG = (rt, rb, h, seg = 16, open = false) => cacheG(`c${rt},${rb},${h},${seg},${open}`, () => CYLINDER(rt, rb, h, seg, 1, open).rotateX(Math.PI / 2));
const SPHG = (seg = 16, rings = 10, t0 = 0, tl = Math.PI, p0 = 0, pl = Math.PI * 2) =>
  cacheG(`s${seg},${rings},${t0},${tl},${p0},${pl}`, () => SPHERE(1, seg, rings, p0, pl, t0, tl).rotateX(Math.PI / 2));
const TORG = (R, r, rs = 8, ts = 24, arc = Math.PI * 2) => cacheG(`t${R},${r},${rs},${ts},${arc}`, () => TORUS(R, r, rs, ts, arc));

class Kit {
  constructor() { this.P = []; this.N = []; this.S = []; }
  push(geo, m, slot) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (m) g.applyMatrix4(m);
    if (!g.attributes.normal) g.computeVertexNormals();
    this.P.push(g.attributes.position.array); this.N.push(g.attributes.normal.array); this.S.push([slot, g.attributes.position.count]);
    return this;
  }
  box(w, d, h, x, y, z, s, rz = 0, rx = 0, ry = 0) { return this.push(BOXG(w, d, h), M4(x, y, z, rz, 1, 1, 1, rx, ry), s); }
  rbox(w, d, h, r, x, y, z, s, rz = 0, rx = 0, ry = 0, seg = 2) { return this.push(RBOXG(w, d, h, r, seg), M4(x, y, z, rz, 1, 1, 1, rx, ry), s); }
  cyl(rt, rb, h, x, y, z, s, seg = 16, rx = 0, ry = 0, rz = 0, open = false) { return this.push(CYLG(rt, rb, h, seg, open), M4(x, y, z, rz, 1, 1, 1, rx, ry), s); }
  sph(r, x, y, z, s, sx = 1, sy = 1, sz = 1, seg = 16, rings = 10) { return this.push(SPHG(seg, rings), M4(x, y, z, 0, r * sx, r * sy, r * sz), s); }
  sphP(r, x, y, z, s, sx, sy, sz, t0, tl, rx = 0, ry = 0, rz = 0, seg = 18, rings = 10, p0 = 0, pl = Math.PI * 2) {
    return this.push(SPHG(seg, rings, t0, tl, p0, pl), M4(x, y, z, rz, r * sx, r * sy, r * sz, rx, ry), s);
  }
  tor(R, r, x, y, z, s, rx = 0, ry = 0, rz = 0, arc = Math.PI * 2, rs = 8, ts = 24) { return this.push(TORG(R, r, rs, ts, arc), M4(x, y, z, rz, 1, 1, 1, rx, ry), s); }
  lathe(prof, x, y, z, s, seg = 20, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
    const g = LATHE(prof.map(p => new THREE.Vector2(p[0], p[1])), seg).rotateX(Math.PI / 2);
    return this.push(g, M4(x, y, z, rz, sx, sy, sz, rx, ry), s);
  }
  tube(pts, r, s, rs = 8, ts = 0, closed = false) {
    const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])), closed, "catmullrom", 0.2);
    return this.push(TUBE(curve, ts || Math.max(8, pts.length * 6), r, rs, closed), null, s);
  }
  limb(a, b, ra, rb, s, seg = 10, cs = 3) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), D = B.clone().sub(A), L = Math.max(D.length(), 1e-4);
    const prof = [];
    for (let i = 0; i <= cs; i++) { const t = -Math.PI / 2 + Math.PI / 2 * i / cs; prof.push(new THREE.Vector2(Math.max(ra * Math.cos(t), 1e-4), ra * Math.sin(t))); }
    for (let i = 0; i <= cs; i++) { const t = Math.PI / 2 * i / cs; prof.push(new THREE.Vector2(Math.max(rb * Math.cos(t), 1e-4), L + rb * Math.sin(t))); }
    prof[0].x = 0; prof[prof.length - 1].x = 0;
    const g = LATHE(prof, seg);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), D.normalize());
    return this.push(g, new THREE.Matrix4().compose(A, q, new THREE.Vector3(1, 1, 1)), s);
  }
  // ellipsoid-ish blob oriented along a direction (hands, feet)
  blobDir(c, dir, up, w, l, h, s, seg = 12) {
    const Y = new THREE.Vector3(...dir).normalize(), Zt = new THREE.Vector3(...up);
    const X = new THREE.Vector3().crossVectors(Y, Zt).normalize(); if (X.lengthSq() < 1e-6) X.set(1, 0, 0);
    const Z = new THREE.Vector3().crossVectors(X, Y).normalize();
    const m = new THREE.Matrix4().makeBasis(X.multiplyScalar(w), Y.multiplyScalar(l), Z.multiplyScalar(h)).setPosition(c[0], c[1], c[2]);
    const g = SPHG(seg, 8).clone(); g.applyMatrix4(m); g.computeVertexNormals();
    return this.push(g, null, s);
  }
  build() {
    const n = this.P.reduce((a, b) => a + b.length, 0), P = new Float32Array(n), N = new Float32Array(n), S = new Float32Array(n / 3);
    let o = 0, v = 0;
    this.P.forEach((a, i) => { P.set(a, o); N.set(this.N[i], o); o += a.length; const [s, c] = this.S[i]; S.fill(s, v, v + c); v += c; });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.BufferAttribute(N, 3));
    g.setAttribute("slot", new THREE.BufferAttribute(S, 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}

// kinds: 0 paint 1 wood 2 fabric 3 brushed metal 4 plastic 5 rubber 6 leather 7 felt 8 ceramic 9 skin 10 hair 11 gloss
const KMAX = 16;
const KIT_GLSL = `
#ifdef KIT_LITE
vec3 kitPat(float k, vec3 p) { return vec3(1.0); }
float kitRgh(float k, vec3 p) { return 1.0; }
#else
float kh(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float kn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(kh(i), kh(i + vec3(1,0,0)), f.x), mix(kh(i + vec3(0,1,0)), kh(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(kh(i + vec3(0,0,1)), kh(i + vec3(1,0,1)), f.x), mix(kh(i + vec3(0,1,1)), kh(i + vec3(1,1,1)), f.x), f.y), f.z); }
vec3 kitPat(float k, vec3 p) {
  if (k < 0.5) return vec3(0.97 + 0.05 * kn(p * 3.0));
  if (k < 1.5) { float g = kn(vec3(p.x * 0.7, p.y * 11.0, p.z * 11.0)) * 3.0 + p.x * 0.5; float s = 0.5 + 0.5 * sin(g * 15.7);
                 return vec3(0.82 + 0.2 * s) * (0.93 + 0.12 * kn(p * vec3(1.2, 4.0, 4.0))); }
  if (k < 2.5) { float w = 0.5 + 0.5 * sin(p.x * 240.0) * sin((p.y + p.z) * 240.0); return vec3(0.9 + 0.08 * w) * (0.92 + 0.12 * kn(p * 5.0)); }
  if (k < 3.5) return vec3(0.9 + 0.1 * kn(vec3(p.x * 70.0, p.y * 2.0, p.z * 2.0)));
  if (k < 4.5) return vec3(0.98 + 0.03 * kn(p * 9.0));
  if (k < 5.5) return vec3(0.94 + 0.06 * kn(p * 30.0));
  if (k < 6.5) return vec3(0.88 + 0.12 * kn(p * 26.0));
  if (k < 7.5) return vec3(0.93 + 0.07 * kn(p * 45.0));
  if (k < 8.5) return vec3(1.0);
  if (k < 9.5) return vec3(0.95 + 0.06 * kn(p * 7.0)) * vec3(1.0, 0.985, 0.975);
  if (k < 10.5) return vec3(0.72 + 0.35 * kn(vec3(p.x * 95.0, p.y * 95.0, p.z * 14.0)));
  return vec3(1.0);
}
float kitRgh(float k, vec3 p) {
  if (k > 0.5 && k < 1.5) return 0.85 + 0.3 * kn(p * 3.0);
  if (k > 2.5 && k < 3.5) return 0.75 + 0.5 * kn(vec3(p.x * 90.0, p.y, p.z));
  if (k > 9.5 && k < 10.5) return 0.8 + 0.4 * kn(vec3(p.x * 95.0, p.y * 95.0, p.z * 14.0));
  return 0.92 + 0.16 * kn(p * 5.0);
}
#endif`;
function kitMat(pal, nt = 0, opts = {}) {
  const cols = [], mats = [];
  for (let i = 0; i < KMAX; i++) {
    const p = pal[Math.min(i, pal.length - 1)] || [0xcccccc, 0.8, 0, 0];
    cols.push(new THREE.Color(p[0])); mats.push(new THREE.Vector4(p[1], p[2], p[3], p[4] === undefined ? -1 : p[4]));
  }
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0, side: opts.side || THREE.FrontSide });
  m.envMapIntensity = 0.85; m.userData.baseEnv = 0.85; envMats.push(m);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uKC = { value: cols }; sh.uniforms.uKM = { value: mats }; sh.uniforms.uWhite = KIT.white;
    let tsel = "";
    for (let i = 0; i < nt; i++) tsel += `if (ti == ${i}) vKC = iT${i};\n`;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>
attribute float slot; ${Array.from({ length: nt }, (_, i) => `attribute vec3 iT${i};`).join(" ")}
uniform vec3 uKC[${KMAX}]; uniform vec4 uKM[${KMAX}];
varying vec3 vKC; varying vec4 vKM; varying vec3 vKO;`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
int si = int(slot + 0.5); vKC = uKC[si]; vKM = uKM[si]; vKO = position;
#ifdef USE_INSTANCING
vKO += instanceMatrix[3].xyz * 0.37;
#endif
int ti = int(vKM.w + 0.5);
if (vKM.w > -0.5) { ${tsel} }`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
${QUAL.level === "low" ? "#define KIT_LITE" : ""}
uniform float uWhite; varying vec3 vKC; varying vec4 vKM; varying vec3 vKO;
${KIT_GLSL}`)
      .replace("#include <color_fragment>", `#include <color_fragment>
diffuseColor.rgb = mix(vKC * kitPat(vKM.z, vKO), vec3(0.9), uWhite);`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
roughnessFactor = clamp(vKM.x * kitRgh(vKM.z, vKO), 0.03, 1.0);`)
      .replace("#include <metalnessmap_fragment>", `#include <metalnessmap_fragment>
metalnessFactor = vKM.y;`);
  };
  m.customProgramCacheKey = () => "kit" + nt + (opts.side || 0) + (QUAL.level === "low" ? "L" : "");
  return m;
}
// shared special materials
const KSPEC = {};
function glassMatK() {
  if (!KSPEC.glass) { KSPEC.glass = new THREE.MeshStandardMaterial({ color: 0xcfe3ea, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
    KSPEC.glass.userData.baseEnv = 1.4; KSPEC.glass.envMapIntensity = 1.4; envMats.push(KSPEC.glass); }
  return KSPEC.glass;
}
function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function screenMat(key, draw, w = 512, h = 288, bright = 0.92) {
  if (!KSPEC[key]) KSPEC[key] = new THREE.MeshBasicMaterial({ map: canvasTex(w, h, draw), color: new THREE.Color(bright, bright, bright) });
  return KSPEC[key];
}
function texMat(key, draw, w = 256, h = 256, rough = 0.85, opts = {}) {
  if (!KSPEC[key]) { KSPEC[key] = new THREE.MeshStandardMaterial(Object.assign({ map: canvasTex(w, h, draw), roughness: rough, metalness: 0 }, opts));
    KSPEC[key].userData.baseEnv = 0.6; KSPEC[key].envMapIntensity = 0.6; envMats.push(KSPEC[key]); }
  return KSPEC[key];
}
// a plane quad in the local XZ plane facing +Y (for screens, decals); w wide, h tall, centre at (x, y, z)
function quadG(w, h) { return cacheG(`q${w},${h}`, () => new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2).rotateY(Math.PI)); }   // faces +Y, texture upright
function quadGeoAt(w, h, x, y, z, rz = 0, rx = 0) { const g = quadG(w, h).clone(); g.applyMatrix4(M4(x, y, z, rz, 1, 1, 1, rx)); return g; }
