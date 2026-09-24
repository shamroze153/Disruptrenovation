// ================================================================ REALISM LAYER
const PANEL_U = { value: 0.3 };
const LV = "0.0,0.5,1.0,2.0,12.4167,13.9167,16.9167,23.8333,25.75,35.25";
function enhanceMaterial(mat, kind) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uPanel = PANEL_U;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWPos; varying vec3 vWN;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);");
    let frag = sh.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vWPos; varying vec3 vWN; uniform float uPanel;
float rh(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(rh(i), rh(i + vec3(1,0,0)), f.x), mix(rh(i + vec3(0,1,0)), rh(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(rh(i + vec3(0,0,1)), rh(i + vec3(1,0,1)), f.x), mix(rh(i + vec3(0,1,1)), rh(i + vec3(1,1,1)), f.x), f.y), f.z); }
float aboveFloor(float z){ float lv[10] = float[10](${LV}); float b = -100.0;
  for (int i = 0; i < 10; i++) { if (lv[i] <= z + 0.02) b = max(b, lv[i]); } return z - b; }`);
    let body = `{ float n = vn(vWPos * 1.6) * 0.55 + vn(vWPos * 7.0) * 0.45; diffuseColor.rgb *= 0.95 + 0.08 * n; `;
    if (kind === "wall") body += `if (abs(vWN.z) < 0.5) { float h = aboveFloor(vWPos.z);
      diffuseColor.rgb *= mix(0.66, 1.0, smoothstep(0.0, 2.2, h));
      if (h < 0.33) diffuseColor.rgb *= 0.58; } `;
    if (kind === "slab") body += `if (vWN.z < -0.5) { vec2 g = abs(fract(vWPos.xy / 2.0 + 0.5) - 0.5) * 2.0;
      diffuseColor.rgb *= mix(1.0, 0.78, step(0.965, max(g.x, g.y))); } `;
    body += "}";
    frag = frag.replace("#include <color_fragment>", "#include <color_fragment>\n" + body);
    if (kind === "slab") frag = frag.replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
  if (vWN.z < -0.5) { vec2 t = floor(vWPos.xy / 2.0); vec2 f = fract(vWPos.xy / 2.0);
    if (mod(t.x, 3.0) == 1.0 && mod(t.y, 3.0) == 1.0 && f.x > 0.1 && f.x < 0.9 && f.y > 0.1 && f.y < 0.9)
      totalEmissiveRadiance += vec3(1.0, 0.96, 0.88) * uPanel; }`);
    sh.fragmentShader = frag;
  };
  mat.customProgramCacheKey = () => "enh-" + kind + (mat.transparent ? "t" : "");
  mat.needsUpdate = true;
}

function boxesOf(geo) {
  const P = geo.attributes.position, per = geo.index ? 8 : 36, out = [];
  for (let b = 0; b * per < P.count; b++) {
    let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
    for (let v = b * per; v < (b + 1) * per; v++) {
      const x = P.getX(v), y = P.getY(v), z = P.getZ(v);
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); z0 = Math.min(z0, z); x1 = Math.max(x1, x); y1 = Math.max(y1, y); z1 = Math.max(z1, z);
    }
    out.push([x0, y0, z0, x1, y1, z1]);
  }
  return out;
}
function boxesToGeometry(list) {
  const tmpl = new THREE.BoxGeometry(1, 1, 1).toNonIndexed(), tp = tmpl.attributes.position.array, tn = tmpl.attributes.normal.array;
  const P = new Float32Array(list.length * 108), N = new Float32Array(list.length * 108);
  list.forEach((b, i) => {
    const sx = b[3] - b[0], sy = b[4] - b[1], sz = b[5] - b[2], cx = (b[0] + b[3]) / 2, cy = (b[1] + b[4]) / 2, cz = (b[2] + b[5]) / 2;
    for (let v = 0; v < 36; v++) { const o = i * 108 + v * 3;
      P[o] = tp[v * 3] * sx + cx; P[o + 1] = tp[v * 3 + 1] * sy + cy; P[o + 2] = tp[v * 3 + 2] * sz + cz;
      N[o] = tn[v * 3]; N[o + 1] = tn[v * 3 + 1]; N[o + 2] = tn[v * 3 + 2]; }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.BufferAttribute(N, 3));
  return g;
}

function buildFrames() {
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x3e4349, metalness: 0.45, roughness: 0.38 });
  frameMat.userData.baseEnv = 1.0; envMats.push(frameMat);
  ["GF_Glazing", "FF_Glazing", "SF_Glazing", "Courtyard_Glazing"].forEach(nm => {
    const grp = groups[nm]; if (!grp) return;
    const members = [];
    grp.traverse(o => {
      if (!o.isMesh || o.userData.fixed) return;
      boxesOf(o.geometry).forEach(([x0, y0, z0, x1, y1, z1]) => {
        const alongX = (x1 - x0) >= (y1 - y0), L = alongX ? x1 - x0 : y1 - y0, Hh = z1 - z0;
        if (L < 0.8 || Hh < 0.8) return;
        const w = 0.17, t = (alongX ? y1 - y0 : x1 - x0) + 0.12, c = alongX ? (y0 + y1) / 2 : (x0 + x1) / 2, a0 = alongX ? x0 : y0;
        const mk = (u0, u1, v0, v1) => members.push(alongX ? [a0 + u0, c - t / 2, z0 + v0, a0 + u1, c + t / 2, z0 + v1]
                                                             : [c - t / 2, a0 + u0, z0 + v0, c + t / 2, a0 + u1, z0 + v1]);
        mk(0, L, 0, w); mk(0, L, Hh - w, Hh); mk(0, w, 0, Hh); mk(L - w, L, 0, Hh);
        const nm_ = Math.max(0, Math.round(L / (Hh > 12 ? 5 : 4)) - 1);
        for (let i = 1; i <= nm_; i++) { const u = L * i / (nm_ + 1); mk(u - w / 2, u + w / 2, 0, Hh); }
        if (Hh > 9) { const nt = Math.floor(Hh / (Hh > 20 ? 11.42 : 5.5)); for (let i = 1; i <= nt; i++) { const v = Hh * i / (nt + 1); mk(0, L, v - w / 2, v + w / 2); } }
      });
    });
    if (!members.length) return;
    const m = new THREE.Mesh(boxesToGeometry(members), frameMat);
    m.castShadow = true; m.receiveShadow = true; m.userData.fixed = true; m.userData.baseColor = frameMat.color.clone();
    grp.add(m);
  });
}

function grassTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d");
  g.fillStyle = "#5b7d3a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * 256, y = Math.random() * 256, s = Math.random();
    g.fillStyle = `rgba(${60 + s * 60 | 0},${95 + s * 70 | 0},${35 + s * 30 | 0},${0.35 + Math.random() * 0.4})`;
    g.fillRect(x, y, 1 + Math.random() * 2, 2 + Math.random() * 4);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function buildLandscape() {
  const rooms = WD.floors.GF.rooms, lawnIds = new Set();
  rooms.forEach((r, i) => { if (/lawn/i.test(r.n)) lawnIds.add(i + 1); });
  const data = new Uint8Array(WD.W * WD.H * 4); let any = false;
  for (let i = 0; i < WD.W * WD.H; i++) { const v = grid.GF[i]; if (!(v & 64) && lawnIds.has(v & 63)) { data[i * 4 + 1] = 255; data[i * 4 + 3] = 255; any = true; } }
  if (any) {
    const mask = new THREE.DataTexture(data, WD.W, WD.H, THREE.RGBAFormat); mask.magFilter = THREE.LinearFilter; mask.needsUpdate = true;
    const tex = grassTexture(), PW = WD.W * WD.C, PH = WD.H * WD.C; tex.repeat.set(PW / 7, PH / 7);
    const m = new THREE.MeshStandardMaterial({ map: tex, alphaMap: mask, alphaTest: 0.5, roughness: 1, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    m.userData.baseEnv = 0.5; envMats.push(m);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), m); pl.position.set(PW / 2, PH / 2, 0.08); pl.receiveShadow = true;
    pl.userData.fixed = true; (groups["Site_Boundary_Wall"] ? root : root).add(pl);
    groups.__grass = pl;
  }
  // courtyard tree in the circular planter drawn on A-111
  const tree = new THREE.Group(); tree.userData.fixed = true;
  const concrete = new THREE.MeshStandardMaterial({ color: 0xb9b4aa, roughness: 0.9 });
  const soil = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 1 });
  const bark = new THREE.MeshStandardMaterial({ color: 0x5b4632, roughness: 0.95 });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x4d7a36, roughness: 0.85, flatShading: true });
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 1.5, 40, 1, true).rotateX(Math.PI / 2), concrete); ring.position.z = 1.25; tree.add(ring);
  const top = new THREE.Mesh(new THREE.RingGeometry(3.6, 4.05, 40), concrete); top.position.z = 2.0; tree.add(top);
  const dirt = new THREE.Mesh(new THREE.CircleGeometry(3.7, 40), soil); dirt.position.z = 1.8; tree.add(dirt);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.75, 14, 12).rotateX(Math.PI / 2), bark); trunk.position.z = 8.5; tree.add(trunk);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 9; i++) {
    const r = 3 + rnd() * 2.6, a = rnd() * Math.PI * 2, d = i === 0 ? 0 : 2 + rnd() * 3.5;
    const f = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), leaf);
    f.position.set(Math.cos(a) * d, Math.sin(a) * d, 16 + rnd() * 7 + (i === 0 ? 3 : 0)); f.scale.z = 0.8;
    f.castShadow = true; tree.add(f);
  }
  tree.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.userData.fixed = true; o.userData.baseColor = o.material.color.clone(); } });
  tree.position.set(87.6, 66.15, 0.5);
  (groups["Courtyard_Paving"] || root).add(tree);
}

// room labels for the cutaways: every named room, per floor
function buildRoomLabels() {
  labelObjs.forEach(o => root.remove(o)); labelObjs.length = 0;
  FLOORS.forEach(k => {
    const areas = new Map();
    for (let i = 0; i < WD.W * WD.H; i++) { const v = grid[k][i]; if (v & 63) areas.set(v & 63, (areas.get(v & 63) || 0) + 1); }
    WD.floors[k].rooms.forEach((rm, i) => {
      const a = (areas.get(i + 1) || 0) * WD.C * WD.C;
      if (rm.k === "circ" || /Compound|Open to sky/.test(rm.n) || a < 70) return;
      const o = makeLabel(rm.n.replace(/ \(.*\)/, ""), 0.036);
      o.position.set(rm.x, rm.y, fflAt(k, rm.x, rm.y) + 7); root.add(o); labelObjs.push(o);
    });
  });
}

// entrance pin and a compass for the orbit views
let entrancePin = null;
function buildEntrancePin() {
  const c = document.createElement("canvas"); c.width = 360; c.height = 150; const g = c.getContext("2d");
  g.fillStyle = "#d95728"; g.beginPath(); g.roundRect ? g.roundRect(0, 0, 360, 96, 18) : g.rect(0, 0, 360, 96); g.fill();
  g.beginPath(); g.moveTo(160, 96); g.lineTo(200, 96); g.lineTo(180, 140); g.fill();
  g.fillStyle = "#fff"; g.font = "700 46px ui-sans-serif, Helvetica, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("Main entrance", 180, 50);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  entrancePin = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, fog: false, toneMapped: false }));
  entrancePin.center.set(0.5, 0.05); entrancePin.scale.set(36 * 0.5, 15 * 0.5, 1); entrancePin.position.set(86, 1.5, 14); entrancePin.renderOrder = 1000;
  scene.add(entrancePin);
}
function updateCompass() {
  const n = document.getElementById("compassN"); if (!n) return;
  const d = new THREE.Vector3(); camera.getWorldDirection(d);
  const az = Math.atan2(d.x, d.y);
  n.style.transform = `rotate(${-az}rad)`;
}
