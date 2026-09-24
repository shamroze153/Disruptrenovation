// ================================================================ ARCHITECT VIEW (construction / drawing mode)
// The model drawn the way the drawings are: each floor carries its registered dimension plan (A-111 / A-112 /
// A-113), walls are coloured by the A-111 legend (existing = cyan hatch, proposed extension = grey hatch),
// columns by the legend (existing grey, proposed blue), a plan cut 4 ft above each floor shows the cut walls as
// hatched poché, every edge is outlined in black, room tags carry the stated size and level, hovering reads
// out coordinates and the room, and a tape measure reads feet and inches. Works in orbit, walk and fly.
const ARCH = { on: false, built: false, cut: "GF", labels: true, under: true, furn: true, people: false, measure: false,
  plane: new THREE.Plane(new THREE.Vector3(0, 0, -1), 1e5), group: null, tags: [], saved: null, eff: "GF",
  mats: {}, under3: {}, cols3: {}, pick: [], m: { pts: [], objs: [] }, frameN: 0 };
const ARCH_DATA = window.ARCH_DATA || { cls: {}, cols: {}, frame: { x0: 0, x1: 151.08, y0: -0.47, y1: 132.5 } };
const ARCH_UNDER = window.ARCH_UNDER || {};
const CUT_Z = { GF: 6.0, FF: 20.4, SF: 29.75 };
const FLOOR_IDX = { GF: 0, FF: 1, SF: 2, all: 3 };
const SHEET = { GF: "A-111", FF: "A-112", SF: "A-113" };

function fmtFt(v, sign) {
  const s = v < 0 ? "-" : (sign ? "+" : ""); v = Math.abs(v);
  let ft = Math.floor(v + 1e-9), inch = Math.round((v - ft) * 12);
  if (inch === 12) { ft += 1; inch = 0; }
  return `${s}${ft}'-${inch}"`;
}

// ---------------------------------------------------------------- materials
function archPatternGLSL() {
  return `
float hatchLine(vec2 p, float spacing, float w) { float d = abs(fract(p.x / spacing) - 0.5) * spacing; return 1.0 - smoothstep(w * 0.5, w * 0.5 + 0.02, d); }
vec3 archPoche(float cls, vec2 xy) {
  vec2 a = vec2(xy.x + xy.y, xy.x - xy.y) * 0.70710678;
  float h = max(hatchLine(a, 0.42, 0.06), hatchLine(a.yx, 0.42, 0.06));
  if (cls < 0.5) return mix(vec3(0.80, 0.79, 0.76), vec3(0.34, 0.33, 0.31), h);        // envelope / other
  if (cls < 1.5) return mix(vec3(0.93, 0.98, 1.0), vec3(0.12, 0.66, 0.86), h);          // existing wall (cyan hatch)
  return mix(vec3(0.97, 0.97, 0.96), vec3(0.42, 0.42, 0.42), h);                        // proposed extension (grey hatch)
}`;
}
function archWallMat() {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float acls; varying float vCls; varying vec3 vAW;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvCls = acls; vAW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vCls; varying vec3 vAW;" + archPatternGLSL())
      .replace("#include <color_fragment>", `#include <color_fragment>
vec3 face = vCls < 0.5 ? vec3(0.95, 0.94, 0.91) : (vCls < 1.5 ? vec3(0.86, 0.95, 0.98) : vec3(0.91, 0.90, 0.88));
diffuseColor.rgb = gl_FrontFacing ? face : archPoche(vCls, vAW.xy) * 0.25;`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
if (!gl_FrontFacing) totalEmissiveRadiance += archPoche(vCls, vAW.xy) * 0.78;`);
  };
  m.customProgramCacheKey = () => "archWall";
  return m;
}
function archPlainMat(hex, poche = 0x4a4a48) {
  const m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
  const pc = new THREE.Color(poche);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uPoche = { value: pc };
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uPoche;")
      .replace("#include <color_fragment>", "#include <color_fragment>\nif (!gl_FrontFacing) diffuseColor.rgb *= 0.2;")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\nif (!gl_FrontFacing) totalEmissiveRadiance += uPoche;");
  };
  m.customProgramCacheKey = () => "archPlain" + hex + "_" + poche;
  return m;
}

// ---------------------------------------------------------------- build (once)
ARCH.srcTex = {}; ARCH.texUsers = {};
function archBuild() {
  if (ARCH.built) return; ARCH.built = true;
  const G = ARCH.group = new THREE.Group(); G.name = "Architect"; G.visible = false; scene.add(G);
  ARCH.mats.wall = archWallMat();
  ARCH.mats.slab = archPlainMat(0xf7f6f2, 0x6a6966);
  ARCH.mats.stair = archPlainMat(0xfbfaf7, 0x5a5957);
  ARCH.mats.roof = archPlainMat(0xefeeea, 0x5a5957);
  ARCH.mats.col = archPlainMat(0x9a9a9a, 0x3c3c3c);
  ARCH.mats.glass = new THREE.MeshStandardMaterial({ color: 0xa9d6ea, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
  // wall class per vertex, aligned with CLEAN_GEOM box order (36 vertices per box)
  Object.entries(ARCH_DATA.cls || {}).forEach(([nm, cls]) => {
    const g = groups[nm]; if (!g) return;
    g.traverse(o => {
      if (!o.isMesh || o.userData.fixed || o.userData.furniture) return;
      const n = o.geometry.attributes.position.count, a = new Float32Array(n);
      for (let i = 0; i < cls.length && i * 36 < n; i++) a.fill(cls[i], i * 36, i * 36 + 36);
      o.geometry.setAttribute("acls", new THREE.BufferAttribute(a, 1));
    });
  });
  // plan underlays: one textured plane per floor level, masked to that level's floor area
  const F = ARCH_DATA.frame, FW = F.x1 - F.x0, FH = F.y1 - F.y0, PW = WD.W * WD.C, PH = WD.H * WD.C;
  const loader = new THREE.TextureLoader(), maxAniso = renderer.capabilities.getMaxAnisotropy();
  FLOORS.forEach(k => {
    const grp = new THREE.Group(); grp.name = "ArchUnder_" + k; G.add(grp); ARCH.under3[k] = grp;
    if (!ARCH_UNDER[k]) return;
    // v4: the drawing texture is shared by the masked floor planes and the ground sheet, and scaled down on phones
    // (High: full 2600 px, Medium 2048, Low 1536) so it does not fill the GPU memory
    const maxPx = QUAL.level === "high" ? 4096 : QUAL.level === "medium" ? 2048 : 1536;
    const src = ARCH.srcTex[k] || (ARCH.srcTex[k] = (() => { const t = new THREE.Texture(); const im = new Image();
      im.onload = () => { let img = im; const m = Math.max(im.width, im.height);
        if (m > maxPx) { const c = document.createElement("canvas"), f = maxPx / m; c.width = Math.round(im.width * f); c.height = Math.round(im.height * f);
          c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); img = c; }
        t.image = img; t.needsUpdate = true; (ARCH.texUsers[k] || []).forEach(u => { u.image = img; u.needsUpdate = true; }); invalidate(800); };
      im.src = ARCH_UNDER[k]; return t; })());
    const mk = (fit) => { const t = src.clone(); if (!src.image) t.version = 0; (ARCH.texUsers[k] = ARCH.texUsers[k] || []).push(t); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      if (fit) { t.repeat.set(PW / FW, PH / FH); t.offset.set((0 - F.x0) / FW, (0 - F.y0) / FH); }
      return t; };
    const tex = mk(true);
    const levels = {};
    for (let r = 0; r < WD.H; r++) for (let c = 0; c < WD.W; c++) {
      const x = (c + 0.5) * WD.C, y = (r + 0.5) * WD.C, v = grid[k][r * WD.W + c];
      let z;
      if (k === "GF") { z = fflAt("GF", x, y); if (z < 0.3) continue; }
      else { if (!(v & 256)) continue; z = fflAt(k, x, y); }
      const key = z.toFixed(3); (levels[key] = levels[key] || []).push(r * WD.W + c);
    }
    Object.entries(levels).forEach(([z, cells]) => {
      const data = new Uint8Array(WD.W * WD.H * 4);
      cells.forEach(i => { data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = data[i * 4 + 3] = 255; });
      const mask = new THREE.DataTexture(data, WD.W, WD.H, THREE.RGBAFormat); mask.magFilter = mask.minFilter = THREE.NearestFilter; mask.needsUpdate = true;
      const mat = new THREE.MeshStandardMaterial({ map: tex, alphaMap: mask, alphaTest: 0.5, roughness: 1, metalness: 0,
        emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.42, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), mat);
      pl.position.set(PW / 2, PH / 2, +z + 0.03); pl.receiveShadow = true; pl.userData.archFloor = k; grp.add(pl); ARCH.pick.push(pl);
    });
    if (k === "GF") {           // the whole ground-floor sheet on the ground: compound, gate, lawns, ramps
      const t2 = mk(false);
      const gm = new THREE.MeshStandardMaterial({ map: t2, roughness: 1, emissive: 0xffffff, emissiveMap: t2, emissiveIntensity: 0.42 });
      const gp = new THREE.Mesh(new THREE.PlaneGeometry(FW, FH), gm); gp.position.set(F.x0 + FW / 2, F.y0 + FH / 2, 0.02);
      gp.receiveShadow = true; gp.userData.archFloor = "GF"; grp.add(gp); ARCH.pick.push(gp);
    }
  });
  // drafting-table ground with a 1 ft / 10 ft grid
  const gc = document.createElement("canvas"); gc.width = gc.height = 512; const g2 = gc.getContext("2d");
  g2.fillStyle = "#f4f3ef"; g2.fillRect(0, 0, 512, 512);
  for (let i = 0; i <= 10; i++) { g2.strokeStyle = i % 10 ? "rgba(90,110,130,0.13)" : "rgba(70,90,110,0.34)"; g2.lineWidth = i % 10 ? 1 : 2.5;
    const p = i * 51.2; g2.beginPath(); g2.moveTo(p, 0); g2.lineTo(p, 512); g2.stroke(); g2.beginPath(); g2.moveTo(0, p); g2.lineTo(512, p); g2.stroke(); }
  const gt = new THREE.CanvasTexture(gc); gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(3000 / 10, 3000 / 10); gt.colorSpace = THREE.SRGBColorSpace; gt.anisotropy = maxAniso;
  const ground3 = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshStandardMaterial({ map: gt, roughness: 1, emissive: 0xffffff, emissiveMap: gt, emissiveIntensity: 0.35 }));
  ground3.position.set(0, 0, -0.05); ground3.receiveShadow = true; G.add(ground3); ARCH.ground = ground3;
  // columns drawn on the plans (A-111 legend: existing grey, proposed blue)
  FLOORS.forEach((k, fi) => {
    const grp = new THREE.Group(); grp.name = "ArchCols_" + k; G.add(grp); ARCH.cols3[k] = grp;
    const top = { GF: FLOOR_Z.FF - 0.75, FF: FLOOR_Z.SF - 0.75, SF: FLOOR_Z.ROOF - 0.5 }[k];
    [0, 1].forEach(kind => {
      const list = (ARCH_DATA.cols[k] || []).filter(c => c[4] === kind); if (!list.length) return;
      const mat = kind ? archPlainMat(0x2f86e8, 0x0b5fd6) : archPlainMat(0x8c8c8c, 0x777777);
      const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, list.length);
      list.forEach(([x, y, w, h], i) => { const z0 = fflAt(k, x, y) - 0.02; im.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(x, y, (z0 + top) / 2), new THREE.Quaternion(), new THREE.Vector3(w + 0.04, h + 0.04, top - z0))); });
      im.instanceMatrix.needsUpdate = true; im.castShadow = im.receiveShadow = true; im.userData.archCol = kind; grp.add(im); ARCH.pick.push(im);
    });
  });
  // room tags (v3.3: every room on the drawings plus the drawing notes; compact form when space is short)
  const mc = document.createElement("canvas").getContext("2d");
  const tw = (t, font, ls) => { mc.font = font; return mc.measureText(t).width + (ls || 0) * t.length; };
  const short = (d) => (d || "").replace(/ · LEV[^·]*/, "").split(" · ")[0].replace(/ \(.*$/, "");
  FLOORS.forEach(k => {
    WD.floors[k].rooms.forEach((rm, i) => {
      if (/Compound/.test(rm.n)) return;
      const d = document.createElement("div"); d.className = "atag atag-" + rm.k;
      const lv = fflAt(k, rm.x, rm.y), nm = rm.n.replace(/ \((double height|open to sky)\)/, ""), dim = short(rm.d);
      d.innerHTML = `<b>${nm}</b>${dim ? `<i>${dim}</i>` : ""}<u>FFL ${fmtFt(lv, true)}</u>`;
      const o = new CSS2DObject(d); o.position.set(rm.x, rm.y, lv + 0.4);
      const wn = tw(nm.toUpperCase(), "600 10.5px Helvetica, Arial, sans-serif", 0.32);
      o.userData = { floor: k, area: rm.a || 0, rid: i + 1, kind: rm.k, z: lv + 0.4, pri: rm.k === "circ" ? 2 : rm.k === "outdoor" ? 1 : 0,
        pts: [[rm.x, rm.y]].concat(rm.p ? [[rm.p[0], rm.p[1]]] : []),
        wf: Math.max(wn, dim ? tw(dim, "500 10px Helvetica, Arial, sans-serif") : 0, tw("FFL +00'-00\"", "500 9.5px Helvetica, Arial, sans-serif")) + 14,
        hf: dim ? 43 : 31, wc: wn + 14 };
      o.visible = false; G.add(o); ARCH.tags.push(o);
    });
    (WD.floors[k].notes || []).forEach(nt => {
      const d = document.createElement("div"); d.className = "atag atag-note atag-n-" + nt.t;
      const lv = fflAt(k, nt.x, nt.y), dim = (nt.t === "landing" || nt.t === "room" || nt.t === "void") ? short(nt.d) : "";
      d.innerHTML = `<b>${nt.n}</b>${dim ? `<i>${dim}</i>` : ""}`;
      const o = new CSS2DObject(d); o.position.set(nt.x, nt.y, lv + 0.4);
      const wn = tw(nt.n, "600 9.5px Helvetica, Arial, sans-serif");
      o.userData = { floor: k, area: 0, rid: 0, kind: "note", note: true, z: lv + 0.4, pri: nt.t === "landing" || nt.t === "room" ? 0.5 : 3, pts: [[nt.x, nt.y]],
        wf: Math.max(wn, dim ? tw(dim, "500 9px Helvetica, Arial, sans-serif") : 0) + 12, hf: dim ? 28 : 17, wc: wn + 12 };
      o.visible = false; G.add(o); ARCH.tags.push(o);
    });
  });
  ARCH.tags.sort((a, b) => a.userData.pri - b.userData.pri || b.userData.area - a.userData.area);
  // measuring
  ARCH.m.group = new THREE.Group(); ARCH.m.group.renderOrder = 1000; G.add(ARCH.m.group);
  archBuildPost();
  archBuildUI();
  // everything the pointer can land on
  Object.entries(groups).forEach(([k, g]) => { if (/Walls|Slab|Stairs|Columns|Guard_Post|Site_Boundary/.test(k)) g.traverse(o => { if (o.isMesh) ARCH.pick.push(o); }); });
}
const FLOOR_Z = { GF: 1.0, FF: 12 + 5 / 12, SF: 23 + 10 / 12, ROOF: 35.25 };

// ---------------------------------------------------------------- black linework (normal + depth edge pass)
function archBuildPost() {
  const nm = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
  nm.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace(/}\s*$/, "  gl_FragColor.a = gl_FrontFacing ? 1.0 : 0.5;\n}"); };
  nm.customProgramCacheKey = () => "archNormal";
  ARCH.nMat = nm;
  ARCH.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { tC: { value: null }, tN: { value: null }, tD: { value: null }, res: { value: new THREE.Vector2(1, 1) }, cn: { value: 1 }, cf: { value: 6000 }, px: { value: 1 }, ink: { value: 0.88 }, dbg: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: `#include <common>
#include <packing>
uniform sampler2D tC, tN, tD; uniform vec2 res; uniform float cn, cf, px, ink; uniform int dbg; varying vec2 vUv;
float ld(vec2 uv) { return -perspectiveDepthToViewZ(texture2D(tD, uv).x, cn, cf); }
void main() {
  vec4 c = texture2D(tC, vUv);
  vec2 o = px / res;
  vec4 n0 = texture2D(tN, vUv); float d0 = ld(vUv);
  vec2 D[4]; D[0] = vec2(o.x, 0.0); D[1] = vec2(-o.x, 0.0); D[2] = vec2(0.0, o.y); D[3] = vec2(0.0, -o.y);
  float e = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 n = texture2D(tN, vUv + D[i]);
    e = max(e, step(0.2, abs(n.a - n0.a)));
    if (n0.a > 0.1 && n.a > 0.1) e = max(e, smoothstep(0.22, 0.42, length(n.rgb - n0.rgb)));
  }
  if (n0.a > 0.1) {
    // raw depth is linear across a plane in screen space, so its Laplacian is ~0 on flat surfaces at any angle;
    // dividing by (1 - depth) turns a jump into a relative distance jump
    float r0 = texture2D(tD, vUv).x;
    float rl = texture2D(tD, vUv + D[1]).x, rr = texture2D(tD, vUv + D[0]).x, ru = texture2D(tD, vUv + D[2]).x, rd = texture2D(tD, vUv + D[3]).x;
    float lap = max(abs(rl + rr - 2.0 * r0), abs(ru + rd - 2.0 * r0)) / max(1.0 - r0, 1e-7);
    e = max(e, smoothstep(0.03, 0.08, lap));
  }
  gl_FragColor = vec4(mix(c.rgb, vec3(0.05, 0.06, 0.07), e * ink), 1.0);
  if (dbg == 1) gl_FragColor = vec4(c.rgb, 1.0);
  if (dbg == 2) gl_FragColor = vec4(n0.rgb * n0.a, 1.0);
  if (dbg == 3) gl_FragColor = vec4(vec3(1.0 - e), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`, depthTest: false, depthWrite: false }));
  ARCH.quad.frustumCulled = false;
  ARCH.qScene = new THREE.Scene(); ARCH.qScene.add(ARCH.quad);
  ARCH.qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
}
function archTargets() {
  const s = renderer.getDrawingBufferSize(new THREE.Vector2()), w = s.x, h = s.y;
  if (ARCH.rtC && ARCH.rtC.width === w && ARCH.rtC.height === h) return;
  if (ARCH.rtC) { ARCH.rtC.dispose(); ARCH.rtN.dispose(); }
  ARCH.rtC = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
  const dt = new THREE.DepthTexture(w, h); dt.type = THREE.UnsignedIntType;
  ARCH.rtN = new THREE.WebGLRenderTarget(w, h, { depthTexture: dt, depthBuffer: true });
  const u = ARCH.quad.material.uniforms; u.tC.value = ARCH.rtC.texture; u.tN.value = ARCH.rtN.texture; u.tD.value = dt; u.res.value.set(w, h);
  u.px.value = Math.max(1, renderer.getPixelRatio() * 0.8);
}
function archRender() {
  archTargets();
  const u = ARCH.quad.material.uniforms; u.cn.value = camera.near; u.cf.value = camera.far;
  renderer.setRenderTarget(ARCH.rtC); renderer.render(scene, camera);
  // normal pass: glass, tags and the tape measure stay out of it
  const bg = scene.background, hidden = [];
  scene.background = null; scene.overrideMaterial = ARCH.nMat;
  // (underlay sheets are cut out by an alpha mask that the override material cannot see: leave them to the slab below)
  scene.traverse(o => { if (o.visible && ((o.isMesh && o.material && (o.material.transparent || o.material.alphaTest > 0 || o.material.alphaMap)) || o.isLine || o.isSprite || o.isPoints)) { o.visible = false; hidden.push(o); } });
  const au = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false;
  const cc = renderer.getClearColor(new THREE.Color()), ca = renderer.getClearAlpha();
  renderer.setRenderTarget(ARCH.rtN); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, camera);
  renderer.setClearColor(cc, ca); renderer.shadowMap.autoUpdate = au;
  hidden.forEach(o => o.visible = true); scene.overrideMaterial = null; scene.background = bg;
  renderer.setRenderTarget(null); renderer.render(ARCH.qScene, ARCH.qCam);
}

// ---------------------------------------------------------------- switching on / off
function archLighting() {
  sky.visible = false; scene.fog = null; scene.background = new THREE.Color(0xf4f3ef);
  hemi.color.set(0xffffff); hemi.groundColor.set(0xdcd8d0); hemi.intensity = 1.35;
  sun.color.set(0xffffff); sun.intensity = 1.25; sun.position.set(CX - 140, CY + 110, 300);
  sun.castShadow = light.shadows !== false && QUAL.shadows;
  fill.color.set(0xffffff); fill.intensity = 0.3; fill.position.set(CX + 200, CY - 180, 160);
  lampGroup.visible = false; sunMarker.visible = false; pathGroup.visible = false;
  renderer.toneMapping = THREE.NoToneMapping; renderer.toneMappingExposure = 1.0;
  setEnv(0.35);
}
function archOn() {
  archBuild();
  const first = !ARCH.on;
  ARCH.on = true;
  if (first) {
    ARCH.saved = { mats: new Map(), vis: new Map(), root: [] };
    Object.entries(groups).forEach(([k, g]) => {
      ARCH.saved.vis.set(g, g.visible);
      if (/_Furniture$/.test(k)) return;
      let mat = null;
      if (/_Walls$|Guard_Post|Site_Boundary/.test(k)) mat = ARCH.mats.wall;
      else if (/^Roof/.test(k)) mat = ARCH.mats.roof;
      else if (/_Slab$/.test(k)) mat = ARCH.mats.slab;
      else if (/Glazing/.test(k)) mat = ARCH.mats.glass;
      else if (/_Stairs$/.test(k)) mat = ARCH.mats.stair;
      else if (/Columns/.test(k)) mat = ARCH.mats.col;
      g.traverse(o => { if (o.isMesh && !o.userData.fixed && !o.userData.furniture && mat) { ARCH.saved.mats.set(o, o.material); o.material = mat; } });
    });
    root.children.forEach(o => { if (!Object.values(groups).includes(o) && o.isMesh) { ARCH.saved.root.push([o, o.visible]); o.visible = false; } });
  }
  ["Ground_Apron", "Courtyard_Paving"].forEach(k => { if (groups[k]) groups[k].visible = false; });
  ground.visible = false; if (entrancePin) entrancePin.visible = false;
  ARCH.group.visible = true;
  KIT.white.value = 1;
  renderer.clippingPlanes = [ARCH.plane];
  archLighting();
  document.body.classList.add("arch");
  if (first && !W8.on) setView("archAxo");
  archSetCut(W8.on ? "auto" : ARCH.cut === "auto" ? "GF" : ARCH.cut);
  setLabels(false);
}
function archOff() {
  if (!ARCH.on) return;
  ARCH.on = false; ARCH.group.visible = false;
  ARCH.tags.forEach(o => o.visible = false);
  ARCH.saved.mats.forEach((m, o) => o.material = m);
  ARCH.saved.vis.forEach((v, g) => g.visible = v);
  ARCH.saved.root.forEach(([o, v]) => o.visible = v);
  Object.keys(groups).forEach(k => { if (/_Furniture$/.test(k)) groups[k].traverse(o => { if (o.isInstancedMesh) o.visible = true; }); });
  ground.visible = true; KIT.white.value = 0;
  renderer.clippingPlanes = []; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  document.body.classList.remove("arch");
  archMeasure(false); archClearMeasure();
  document.getElementById("archInfo").hidden = true;
  const vn = document.getElementById("viewName"); if (vn && /^Architect/.test(vn.textContent)) vn.textContent = "Three-quarter aerial";
  if (W8.on) FLOORS.forEach(k => { floorGroups[k].visible = true; signGroups[k].visible = (k === W8.floor); });
  applyLight();
}
function archEyeZ() { return W8.on ? W8.z + EYE : camera.position.z; }
function archFloorOfCamera() {
  const z = archEyeZ();
  if (z > FLOOR_Z.ROOF + 4) return "SF";
  return W8.on ? W8.floor : (z > FLOOR_Z.SF ? "SF" : z > FLOOR_Z.FF ? "FF" : "GF");
}
// walking (or flying low) with the cut on Auto: take the ceiling off just under the slab above instead of cutting at 6 ft,
// so the rooms read as rooms at eye level; above the roof the plan cut comes back
const CEIL_Z = { GF: 12 + 5 / 12 - 0.9, FF: 23 + 10 / 12 - 0.9, SF: 35.25 - 1.0 };
function archCeil() { return ARCH.cut === "auto" && W8.on && archEyeZ() < FLOOR_Z.ROOF + 4; }
function archKey() { return (ARCH.cut === "auto" ? archFloorOfCamera() : ARCH.cut) + (archCeil() ? "c" : ""); }
function archSetCut(c) {
  ARCH.cut = c;
  const f = c === "auto" ? archFloorOfCamera() : c;
  ARCH.eff = f;
  const fi = FLOOR_IDX[f];
  const ceil = archCeil(); ARCH.key = f + (ceil ? "c" : "");
  const cz = ceil ? CEIL_Z[f] : CUT_Z[f];
  ARCH.plane.constant = f === "all" ? 1e5 : cz;
  Object.entries(groups).forEach(([k, g]) => {
    const fl = /^GF_/.test(k) ? 0 : /^FF_/.test(k) ? 1 : /^SF_/.test(k) ? 2 : /^Roof/.test(k) ? 3 : -1;
    if (/^(Ground_Apron|Courtyard_Paving)$/.test(k)) { g.visible = false; return; }
    if (fl < 0) { g.visible = true; return; }
    g.visible = fl <= fi && (!/_Furniture$/.test(k) || ARCH.furn);
    if (/_Furniture$/.test(k)) g.traverse(o => { if (o.isInstancedMesh && o.name && o.name.startsWith("P:")) o.visible = ARCH.people; });
  });
  FLOORS.forEach((k, i) => { ARCH.under3[k].visible = ARCH.under && i <= fi; ARCH.cols3[k].visible = i <= fi; });
  document.querySelectorAll("#archCut button").forEach(b => b.classList.toggle("on", b.dataset.c === c));
  const note = document.getElementById("archCutNote");
  if (note) note.textContent = f === "all" ? "Whole building, no cut" : ceil ? `${FLOOR_NAME[f]} · ceiling off at ${fmtFt(cz, true)} · drawing ${SHEET[f]} on the floor`
    : `${FLOOR_NAME[f]} plan · cut at ${fmtFt(cz, true)} · drawing ${SHEET[f]}`;
  ARCH.frameN = 0;
}
function archFrame() {
  if (ARCH.cut === "auto" && archKey() !== ARCH.key) archSetCut("auto");
  if (W8.on) { FLOORS.forEach(k => { floorGroups[k].visible = false; signGroups[k].visible = false; }); lampGroup.visible = false; }
  if (entrancePin) entrancePin.visible = false;
  if ((ARCH.frameN++ % 8) === 0) archCullTags();
}
function archCullTags() {
  const f = ARCH.eff, show = ARCH.labels && f !== "all";
  const W = innerWidth, H = innerHeight, placed = [], v = new THREE.Vector3(), q = new THREE.Vector3();
  const hit = (r) => placed.some(p => !(r[0] > p[0] + p[2] || r[0] + r[2] < p[0] || r[1] > p[1] + p[3] || r[1] + r[3] < p[1]));
  ARCH.tags.forEach(o => {
    const u = o.userData; let ok = false;
    if (show && u.floor === f) {
      for (const compact of (u.note ? [false] : [false, true])) {
        for (const p of u.pts) {
          v.set(p[0], p[1], u.z).project(camera);
          if (v.z > 1 || v.z < -1 || Math.abs(v.x) > 1.02 || Math.abs(v.y) > 1.02) continue;
          if (W8.on && camera.position.distanceTo(q.set(p[0], p[1], u.z)) > 45) continue;
          const sx = (v.x + 1) / 2 * W, sy = (1 - v.y) / 2 * H, w = compact ? u.wc : u.wf, h = compact ? 18 : u.hf;
          const r = [sx - w / 2, sy - h / 2, w, h];
          if (!ARCH.allTags && hit(r)) continue;
          placed.push(r); o.position.set(p[0], p[1], u.z); o.element.classList.toggle("c", compact); ok = true; break;
        }
        if (ok) break;
      }
    }
    o.visible = ok;
  });
  const n = document.getElementById("archTagCount");
  if (n) { const tot = ARCH.tags.filter(o => o.userData.floor === f && !o.userData.note).length, vis = ARCH.tags.filter(o => o.visible && !o.userData.note).length;
    n.textContent = show ? `${vis} / ${tot} rooms tagged${vis < tot ? " · zoom in for the rest" : ""}` : ""; }
}

// ---------------------------------------------------------------- hover read-out and tape measure
const archRay = new THREE.Raycaster(), archNdc = new THREE.Vector2();
function archPick(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  archNdc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  archRay.setFromCamera(archNdc, camera);
  const vis = ARCH.pick.filter(o => { let p = o; while (p) { if (!p.visible) return false; p = p.parent; } return true; });
  const hits = archRay.intersectObjects(vis, false);
  const lim = ARCH.plane.constant + 0.01;
  // the floor sheets are whole rectangles cut out by an alpha mask: the ray must pass through the holes
  const solid = (h) => { const m = h.object.material, img = m && m.alphaMap && m.alphaMap.image; if (!img || !img.data || !h.uv) return true;
    const c = Math.min(img.width - 1, Math.floor(h.uv.x * img.width)), r = Math.min(img.height - 1, Math.floor(h.uv.y * img.height));
    return img.data[(r * img.width + c) * 4] > 127; };
  return hits.find(h => h.point.z <= lim && solid(h)) || null;
}
function archDescribe(p) {
  const f = ARCH.eff !== "all" ? ARCH.eff : floorFor(p.x, p.y, p.z + 0.2);
  const id = roomAt(f, p.x, p.y), rm = id ? WD.floors[f].rooms[id - 1] : null;
  const lv = fflAt(f, p.x, p.y);
  return { f, rm, lv, txt: `<b>${rm ? rm.n : (f === "GF" && lv === 0 ? "Compound (open ground)" : "Passage / wall")}</b>` +
    `<span>${FLOOR_NAME[f]}${rm && rm.d ? " · " + rm.d : ""} · FFL ${fmtFt(lv, true)}</span>` +
    `<span class="xy">X ${fmtFt(p.x)} · Y ${fmtFt(p.y)} · height ${fmtFt(p.z, true)}</span>` };
}
let archHoverT = 0;
function archPointerMove(ev) {
  if (!ARCH.on || (W8.on && !ARCH.measure) || document.pointerLockElement) return;
  const now = performance.now(); if (now - archHoverT < 70) return; archHoverT = now;
  const h = archPick(ev), box = document.getElementById("archInfo");
  if (!h) { box.hidden = true; return; }
  const d = archDescribe(h.point); box.hidden = false;
  box.innerHTML = d.txt + (ARCH.measure ? `<span class="hint">${ARCH.m.pts.length === 1 ? "Click the second point" : "Click the first point"} · hold Shift to keep it square</span>` : "");
}
let archDown = null;
function archPointerDown(ev) { archDown = [ev.clientX, ev.clientY]; }
function archPointerUp(ev) {
  if (!ARCH.on || !ARCH.measure || !archDown || document.pointerLockElement) return;
  if (Math.hypot(ev.clientX - archDown[0], ev.clientY - archDown[1]) > 5) return;      // it was an orbit drag
  const h = archPick(ev); if (!h) return;
  const p = h.point.clone(); p.x = Math.round(p.x * 24) / 24; p.y = Math.round(p.y * 24) / 24; p.z = Math.round(p.z * 24) / 24;
  // v4: a point on a floor snaps to the nearest wall face / corner (0.6 ft with a mouse, 1.2 ft with a finger)
  const nz = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld).z : 0;
  let snapped = false;
  if (nz > 0.7) { const f = ARCH.eff !== "all" ? ARCH.eff : floorFor(p.x, p.y, p.z + 0.2); snapped = snapToWall(p, f); }
  if (ev.pointerType === "touch") { const d = archDescribe(p), box = document.getElementById("archInfo"); box.hidden = false;
    box.innerHTML = d.txt + `<span class="hint">${ARCH.m.pts.length >= 1 && ARCH.m.pts.length < 2 ? "Tap the second point" : "Tap the first point"}${snapped ? " · snapped to the wall" : ""}</span>`; }
  if (ARCH.m.pts.length >= 2) archClearMeasure();
  if (ARCH.m.pts.length === 1 && ev.shiftKey) {
    const a = ARCH.m.pts[0], d = [Math.abs(p.x - a.x), Math.abs(p.y - a.y), Math.abs(p.z - a.z)], m = d.indexOf(Math.max(...d));
    if (m !== 0) p.x = a.x; if (m !== 1) p.y = a.y; if (m !== 2) p.z = a.z;
  }
  if (ARCH.m.pts.length === 0) ARCH.m.snapped = false;
  ARCH.m.snapped = ARCH.m.snapped || snapped;
  ARCH.m.pts.push(p);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), new THREE.MeshBasicMaterial({ color: 0xd95728, depthTest: false }));
  dot.position.copy(p); dot.renderOrder = 1001; ARCH.m.group.add(dot);
  if (ARCH.m.pts.length === 2) {
    const [a, b] = ARCH.m.pts;
    const len = a.distanceTo(b), mid = a.clone().add(b).multiplyScalar(0.5);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, Math.max(len, 0.01), 10), new THREE.MeshBasicMaterial({ color: 0xd95728, depthTest: false, transparent: true, opacity: 0.95 }));
    tube.position.copy(mid); tube.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    tube.renderOrder = 1000; ARCH.m.group.add(tube);
    const L = a.distanceTo(b), dx = Math.abs(b.x - a.x), dy = Math.abs(b.y - a.y), dz = Math.abs(b.z - a.z);
    const div = document.createElement("div"); div.className = "ameasure";
    div.innerHTML = `<b>${fmtFt(L)}</b>${ARCH.m.snapped ? `<span>snapped to wall</span>` : ""}<span>${[dx > 0.04 ? "E–W " + fmtFt(dx) : null, dy > 0.04 ? "N–S " + fmtFt(dy) : null, dz > 0.04 ? "up " + fmtFt(dz) : null].filter(Boolean).join(" · ")}</span>`;
    const o = new CSS2DObject(div); o.position.copy(a).add(b).multiplyScalar(0.5); ARCH.m.group.add(o); ARCH.m.label = o;
    const out = document.getElementById("archMeasureOut"); if (out) out.textContent = `Last: ${fmtFt(L)}`;
  }
}
function archClearMeasure() {
  if (!ARCH.m.group) return;
  [...ARCH.m.group.children].forEach(o => { ARCH.m.group.remove(o); if (o.element && o.element.remove) o.element.remove(); if (o.geometry) o.geometry.dispose(); });
  ARCH.m.pts = [];
}
function archMeasure(on) {
  ARCH.measure = on; document.body.classList.toggle("measuring", on);
  const b = document.getElementById("archMeasure"); if (b) b.classList.toggle("on", on);
  if (!on) archClearMeasure();
}

// ---------------------------------------------------------------- fly-through (drone camera, either style)
function startFlyThrough() {
  const wasArch = ARCH.on;
  // start south of the gate, above the road, looking at the front of the building
  if (!W8.on) enterWalk({ f: "GF", x: CX, y: -58, yaw: 0, pitch: -0.36 });
  else if (!W8.fly) { endTour(); clearRoute(); placeAt("GF", CX, -58, 0, -0.36); }
  setFly(true);
  W8.z = Math.max(W8.z, 48); W8.pitch = Math.min(W8.pitch, -0.3);
  if (wasArch || ARCH.on) archSetCut("auto");
  showFlyHint();
}
function showFlyHint() {
  const h = document.getElementById("walkHint"); if (!h) return;
  h.innerHTML = matchMedia("(pointer: coarse)").matches ? "<b>Flying</b> · <b>joystick</b> to move · <b>drag</b> to look · <b>▲ ▼</b> up and down · <b>✈ Flying</b> to land"
    : "<b>Flying</b> · <b>W A S D</b> move · <b>drag</b> to look · <b>E</b> / <b>Space</b> up · <b>Q</b> / <b>C</b> down · <b>Shift</b> fast · <b>F</b> land";
  h.classList.add("show"); setTimeout(() => h.classList.remove("show"), 6500);
}

// ---------------------------------------------------------------- UI
function archBuildUI() {
  const css = document.createElement("style");
  css.textContent = `
#archBar{position:fixed;left:calc(50% + 20px);bottom:calc(16px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:5;display:none;
  gap:10px;align-items:center;flex-wrap:wrap;justify-content:center;max-width:calc(100vw - 32px);background:var(--panel);border:1px solid var(--line);
  border-radius:12px;padding:8px 10px;backdrop-filter:blur(10px);font-size:12.5px;color:var(--ink)}
body.arch #archBar{display:flex} body.arch #timebar{display:none!important}
#archBar .grp{display:flex;gap:4px;align-items:center} #archBar .lab{color:var(--muted);margin-right:2px}
#archBar button{font:inherit;font-size:12.5px;padding:6px 9px;border-radius:7px;border:1px solid var(--line);background:transparent;color:var(--ink);cursor:pointer}
#archBar button.on{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
#archBar label{display:flex;gap:4px;align-items:center;cursor:pointer;white-space:nowrap}
#archCutNote{flex-basis:100%;text-align:center;color:var(--muted);font-size:11.5px;margin-top:-2px}
#archTagCount{flex-basis:100%;text-align:center;margin-top:-6px}
body.walking #archBar{left:auto;right:14px;bottom:auto;top:calc(76px + env(safe-area-inset-top,0px));transform:none;flex-direction:column;align-items:stretch;
  background:rgba(20,26,32,.74);color:#f2efe8;border-color:rgba(255,255,255,.16);max-width:230px}
body.walking #archBar button{color:#f2efe8;border-color:rgba(255,255,255,.22)} body.walking #archBar .lab,body.walking #archCutNote{color:#b9c6d2}
body.walking #archBar .grp{flex-wrap:wrap}
#archLegend{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:5;display:none;background:var(--panel);border:1px solid var(--line);
  border-radius:12px;padding:10px 12px;font-size:12px;color:var(--ink);backdrop-filter:blur(10px);max-width:250px}
body.arch:not(.walking) #archLegend{display:block} body.arch #readout{display:none!important}
#archLegend h4{margin:0 0 6px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
#archLegend .li{display:flex;gap:8px;align-items:center;margin:3px 0} #archLegend .sw{width:26px;height:12px;border:1px solid #333;flex:none}
#archLegend .src{margin-top:6px;color:var(--muted);font-size:11px;line-height:1.4}
#archInfo{position:fixed;right:16px;bottom:calc(262px + env(safe-area-inset-bottom,0px));z-index:6;background:rgba(20,26,32,.84);color:#f4f1ea;border-radius:10px;
  padding:8px 11px;font-size:12px;line-height:1.45;pointer-events:none;max-width:320px}
#archInfo b{display:block;font-size:13.5px} #archInfo span{display:block;color:#c9d4de} #archInfo .xy{font-variant-numeric:tabular-nums;color:#ffd7b8} #archInfo .hint{color:#9fb3c4}
.atag{font:600 10.5px ui-sans-serif,Helvetica,Arial,sans-serif;color:#111;background:rgba(255,255,255,.88);border:1px solid #222;padding:2px 5px 3px;
  text-align:center;line-height:1.25;white-space:nowrap;border-radius:2px;pointer-events:none;box-shadow:0 1px 2px rgba(0,0,0,.18)}
.atag b{display:block;text-transform:uppercase;letter-spacing:.03em;font-size:10.5px}
.atag i{display:block;font-style:normal;font-weight:500;font-size:10px;color:#333} .atag u{display:block;text-decoration:none;font-weight:500;font-size:9.5px;color:#c0392b}
.atag-circ{border-style:dashed} .atag-outdoor{background:rgba(233,245,225,.9)}
.atag.c i,.atag.c u{display:none} .atag.c{padding:1px 5px 2px}
.atag-note{background:rgba(255,255,255,.78);border:1px dotted #444;font-weight:600;box-shadow:none;padding:1px 4px}
.atag-note b{text-transform:none;letter-spacing:0;font-size:9.5px;font-style:italic} .atag-note i{font-size:9px}
.atag-n-passage{border-style:dashed} .atag-n-exit{border-color:#c0392b;color:#c0392b} .atag-n-exit b{color:#c0392b}
.atag-n-landing,.atag-n-room{border:1px solid #222;background:rgba(255,255,255,.88)} .atag-n-landing b,.atag-n-room b{font-style:normal;text-transform:uppercase;font-size:10px}
#archTagCount{color:var(--muted);font-size:11px}
.ameasure{z-index:2147483000!important;background:#d95728;color:#fff;border-radius:6px;padding:3px 7px;font:600 12px ui-sans-serif,system-ui,sans-serif;text-align:center;white-space:nowrap}
.ameasure span{display:block;font-weight:500;font-size:10.5px;opacity:.9}
body.measuring #stage canvas{cursor:crosshair}
@media (max-width:760px){#archLegend{display:none!important}#archInfo{bottom:auto;top:140px}}`;
  document.head.appendChild(css);
  const bar = document.createElement("div"); bar.id = "archBar";
  bar.innerHTML = `<div class="grp" id="archCut"><span class="lab">Plan cut</span>
      <button data-c="GF">Ground</button><button data-c="FF">First</button><button data-c="SF">Second</button><button data-c="all">Full</button><button data-c="auto" title="Cut at the floor you are on">Auto</button></div>
    <div class="grp"><label><input type="checkbox" id="archUnder" checked> Drawing</label><label><input type="checkbox" id="archTags" checked> Room tags</label><label><input type="checkbox" id="archAllTags"> All (overlap)</label>
      <label><input type="checkbox" id="archFurn" checked> Furniture</label><label><input type="checkbox" id="archPeople"> People</label></div>
    <div class="grp"><button id="archMeasure" title="Click two points to measure">📏 Measure</button><span id="archMeasureOut" class="lab"></span>
      <button id="archFly" title="Fly through the building">✈ Fly-through</button><button id="archExit">Exit</button></div>
    <div id="archCutNote"></div><div id="archTagCount"></div>`;
  document.body.appendChild(bar);
  const leg = document.createElement("div"); leg.id = "archLegend";
  const hatch = (fg, bg) => `background:repeating-linear-gradient(45deg,${fg} 0 1.5px,${bg} 1.5px 5px),repeating-linear-gradient(-45deg,${fg} 0 1.5px,transparent 1.5px 5px);background-blend-mode:multiply`;
  leg.innerHTML = `<h4>Legend (as A-111)</h4>
    <div class="li"><span class="sw" style="${hatch("#1fa8dc", "#eef9ff")}"></span>Existing wall</div>
    <div class="li"><span class="sw" style="${hatch("#6b6b6b", "#f7f7f5")}"></span>Proposed extension wall</div>
    <div class="li"><span class="sw" style="${hatch("#555", "#ccc9c2")}"></span>Envelope (not on the plan)</div>
    <div class="li"><span class="sw" style="background:#767676"></span>Existing column</div>
    <div class="li"><span class="sw" style="background:#1f7fe8"></span>Proposed column</div>
    <div class="li"><span class="sw" style="background:#bfe3f2;opacity:.8"></span>Glazing</div>
    <div class="src">Floors carry the registered drawings A-111 / A-112 / A-113 (red dashes on them are beam drops). Cut walls show their hatch from above. Hover for position and room; 📏 to measure.</div>`;
  document.body.appendChild(leg);
  const info = document.createElement("div"); info.id = "archInfo"; info.hidden = true; document.body.appendChild(info);
  bar.querySelectorAll("#archCut button").forEach(b => b.onclick = () => archSetCut(b.dataset.c));
  document.getElementById("archUnder").onchange = (e) => { ARCH.under = e.target.checked; archSetCut(ARCH.cut); };
  document.getElementById("archTags").onchange = (e) => { ARCH.labels = e.target.checked; archCullTags(); };
  document.getElementById("archAllTags").onchange = (e) => { ARCH.allTags = e.target.checked; archCullTags(); };
  document.getElementById("archFurn").onchange = (e) => { ARCH.furn = e.target.checked; archSetCut(ARCH.cut); };
  document.getElementById("archPeople").onchange = (e) => { ARCH.people = e.target.checked; archSetCut(ARCH.cut); };
  document.getElementById("archMeasure").onclick = () => archMeasure(!ARCH.measure);
  document.getElementById("archFly").onclick = () => startFlyThrough();
  document.getElementById("archExit").onclick = () => { if (W8.on) { W8.prev.mode = "material"; exitWalk(); } else setMode("material"); };
  const cv = renderer.domElement;
  cv.addEventListener("pointermove", archPointerMove);
  cv.addEventListener("pointerdown", archPointerDown);
  cv.addEventListener("pointerup", archPointerUp);
  addEventListener("keydown", (e) => { if (e.code === "Escape" && ARCH.measure) archClearMeasure(); });
}
function archInitButtons() {
  // header buttons: Architect view and Fly-through, next to "Building map" / "Walk inside"
  const wb = document.getElementById("walkBtn"); if (!wb) return;
  const css = document.createElement("style");
  css.textContent = `#archBtn,#flyBtn{pointer-events:auto;border:1px solid var(--line);border-radius:10px;padding:11px 14px;font:inherit;font-size:14px;font-weight:650;cursor:pointer;
  background:var(--panel);color:var(--ink);backdrop-filter:blur(10px)}
body.arch #archBtn{background:#1f3b57;color:#fff;border-color:#1f3b57}`;
  document.head.appendChild(css);
  const a = document.createElement("button"); a.id = "archBtn"; a.textContent = "📐 Architect view";
  a.onclick = () => setMode(ARCH.on ? "material" : "arch");
  const f = document.createElement("button"); f.id = "flyBtn"; f.textContent = "✈ Fly";
  f.onclick = () => startFlyThrough();
  wb.parentNode.insertBefore(a, wb); wb.parentNode.insertBefore(f, wb);
  // walk-mode top bar: architect toggle
  const wt = document.querySelector("#walkTop .wgroup:last-child") || document.getElementById("walkTop");
  if (wt) { const w = document.createElement("button"); w.className = "wbtn"; w.id = "walkArch"; w.textContent = "📐 Architect";
    w.onclick = () => { if (ARCH.on) { archOff(); mode = "material"; W8.prev.mode = "material"; } else { archOn(); mode = "arch"; W8.prev.mode = "arch"; } w.classList.toggle("on", ARCH.on); };
    wt.insertBefore(w, wt.firstChild); }
}
