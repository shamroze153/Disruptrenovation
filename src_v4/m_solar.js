// ================================================================ ROOFTOP SOLAR (v4.0)
// The 15° south-facing array on an elevated HDG steel frame (8'-0" clear), from solar/design.py: modules as one
// InstancedMesh, steel as a few InstancedMeshes (one per section), catwalks, the assumed stair headroom, inverters,
// cable trays and the riser. A shading view projects the module shadows for any hour on 21 Dec / 21 Jun and marks any
// module that another table or the stair headroom would shade. "Walk under the panels" puts you on the roof.
const SOL = { on: false, built: false, group: null, opt: { C: true, W: true }, parts: {}, mods: null, shadeOn: false, shadeDoy: 355, shadeHour: 12.5,
  roofWalk: false, lastPos: null, deck: null };
const SOLAR_D = window.SOLAR || null;
const SOL_ZONES = "ABCDW";
function solMat(color, o = {}) { return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.55, metalness: 0.35 }, o)); }
function solCellTex() {
  // one module: dark blue cells, thin busbars, silver frame (portrait: 6 x 22 half cells)
  const c = document.createElement("canvas"); c.width = 128; c.height = 256; const g = c.getContext("2d");
  g.fillStyle = "#c9cdd2"; g.fillRect(0, 0, 128, 256);
  g.fillStyle = "#0f1f3a"; g.fillRect(4, 4, 120, 248);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 22; j++) {
    const x = 6 + i * 19.6, y = 6 + j * 11.1;
    g.fillStyle = (i + j) % 2 ? "#14305a" : "#122b52"; g.fillRect(x, y, 18.6, 10.1);
  }
  g.fillStyle = "rgba(200,210,225,0.35)"; for (let i = 0; i < 6; i++) g.fillRect(6 + i * 19.6 + 9, 5, 0.8, 246);
  g.fillStyle = "#c9cdd2"; g.fillRect(4, 127, 120, 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// geometry of a unit box whose +x is along the member, placed between a and b with a given section (w across, h up)
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _s = new THREE.Vector3();
function memberMatrix(a, b, w, h, out) {
  _v1.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const L = _v1.length() || 0.01; _v1.divideScalar(L);
  // basis: x along the member, y horizontal across it, z the remaining (up-ish)
  let yv = new THREE.Vector3(-_v1.y, _v1.x, 0); if (yv.lengthSq() < 1e-6) yv.set(0, 1, 0); yv.normalize();
  const zv = new THREE.Vector3().crossVectors(_v1, yv).normalize();
  out.makeBasis(_v1, yv, zv); out.scale(_s.set(L, w, h)); out.setPosition((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); return out;
}
const SOL_SEC = { primary: [0.33, 0.66, 0x9aa3ab], secondary: [0.21, 0.41, 0xa3abb3], rafter: [0.16, 0.33, 0xb0b7bd], post: [0.16, 0.16, 0xb0b7bd], purlin: [0.16, 0.33, 0xb9c0c6] };
function solarBuild() {
  if (SOL.built || !SOLAR_D) return; SOL.built = true;
  const D = SOLAR_D, G = new THREE.Group(); G.name = "RoofSolar"; SOL.group = G; scene.add(G);
  const cast = !!(QUAL && QUAL.shadows);
  // modules
  const md = D.mod, geo = new THREE.BoxGeometry(md.W, md.L, md.T);
  const tex = solCellTex(), mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.28, metalness: 0.15, color: 0xffffff, envMapIntensity: 0.9 });
  const n = D.m.length, im = new THREE.InstancedMesh(geo, mat, n); im.name = "SolarModules"; im.castShadow = cast; im.receiveShadow = false;
  const tilt = new THREE.Matrix4().makeRotationX(md.tilt * Math.PI / 180), rz = new THREE.Matrix4().makeRotationZ(Math.PI / 2), m = new THREE.Matrix4();
  D.m.forEach((r, i) => { m.identity(); m.multiply(tilt); if (r[3]) m.multiply(rz); m.setPosition(r[0], r[1], r[2] + md.T / 2); im.setMatrixAt(i, m); });
  im.instanceMatrix.needsUpdate = true; im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3); G.add(im); SOL.mods = im;
  // steel, one instanced mesh per section; columns separately (existing RCC below: grey, new: orange)
  const unit = new THREE.BoxGeometry(1, 1, 1), bySec = {};
  D.steel.forEach(s => (bySec[s[0]] = bySec[s[0]] || []).push(s));
  SOL.parts.steel = [];
  Object.entries(bySec).forEach(([k, list]) => {
    const [w, h, col] = SOL_SEC[k] || [0.2, 0.2, 0xaaaaaa];
    const mesh = new THREE.InstancedMesh(unit, solMat(col, { roughness: 0.5, metalness: 0.55 }), list.length); mesh.name = "SolarSteel_" + k; mesh.castShadow = cast;
    list.forEach((s, i) => mesh.setMatrixAt(i, memberMatrix([s[1], s[2], s[3]], [s[4], s[5], s[6]], w, h, _m4)));
    mesh.userData.zones = list.map(s => s[7]); G.add(mesh); SOL.parts.steel.push(mesh);
  });
  const cols = D.cols, cm = new THREE.InstancedMesh(unit, solMat(0xffffff, { roughness: 0.5, metalness: 0.5 }), cols.length); cm.name = "SolarColumns"; cm.castShadow = cast;
  cols.forEach((c, i) => { cm.setMatrixAt(i, memberMatrix([c[0], c[1], c[2]], [c[0], c[1], c[3] + 0.66], 0.49, 0.49, _m4)); cm.setColorAt(i, new THREE.Color(/^new/.test(c[5]) ? 0xff8a1f : 0x9aa3ab)); });
  cm.userData.zones = cols.map(c => c[4]); G.add(cm); SOL.parts.cols = cm;
  // base plates
  const bp = new THREE.InstancedMesh(unit, solMat(0x7c848b), cols.length);
  cols.forEach((c, i) => { _m4.makeScale(1.15, 1.15, 0.07); _m4.setPosition(c[0], c[1], c[2] + 0.035); bp.setMatrixAt(i, _m4); }); bp.userData.zones = cols.map(c => c[4]); G.add(bp); SOL.parts.bp = bp;
  // catwalks (grating)
  const gc = document.createElement("canvas"); gc.width = gc.height = 32; const gg = gc.getContext("2d"); gg.fillStyle = "#8d9399"; gg.fillRect(0, 0, 32, 32); gg.fillStyle = "#2b2f33";
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) gg.fillRect(i * 8 + 2, j * 8 + 1, 5, 6);
  const gt = new THREE.CanvasTexture(gc); gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(1, 1);
  const cw = D.catwalks, cwm = new THREE.InstancedMesh(unit, solMat(0xffffff, { map: gt, roughness: 0.7, metalness: 0.4 }), Math.max(1, cw.length));
  cw.forEach((c, i) => { _m4.makeScale(c[2] - c[0], c[3] - c[1], 0.12); _m4.setPosition((c[0] + c[2]) / 2, (c[1] + c[3]) / 2, c[4]); cwm.setMatrixAt(i, _m4); });
  cwm.count = cw.length; cwm.userData.zones = cw.map(c => c[5]); G.add(cwm); SOL.parts.cw = cwm;
  // handrails along the catwalks (both sides, 3'-6")
  const hr = new THREE.InstancedMesh(unit, solMat(0xd0a020, { roughness: 0.5 }), Math.max(1, cw.length * 2));
  cw.forEach((c, i) => [c[1] + 0.05, c[3] - 0.05].forEach((y, j) => { memberMatrix([c[0], y, c[4] + 3.5], [c[2], y, c[4] + 3.5], 0.1, 0.1, _m4); hr.setMatrixAt(i * 2 + j, _m4); }));
  hr.count = cw.length * 2; hr.userData.zones = cw.flatMap(c => [c[5], c[5]]); G.add(hr); SOL.parts.hr = hr;
  // the stair headroom (assumed) with its door, and the skylight
  const mb = D.mumty.b, mz = new THREE.Mesh(new THREE.BoxGeometry(mb[2] - mb[0], mb[3] - mb[1], D.mumty.z1 - D.mumty.z0), solMat(0xe9e5dc, { roughness: 0.85, metalness: 0 }));
  mz.position.set((mb[0] + mb[2]) / 2, (mb[1] + mb[3]) / 2, (D.mumty.z0 + D.mumty.z1) / 2); mz.castShadow = cast; mz.receiveShadow = true; G.add(mz);
  const dr = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 7), solMat(0x5a4636, { roughness: 0.7, metalness: 0 })); dr.position.set(92.3, mb[1] - 0.04, D.mumty.z0 + 3.5); G.add(dr);
  const sk = D.skylight, skm = new THREE.Mesh(new THREE.BoxGeometry(sk[2] - sk[0], sk[3] - sk[1], 0.6), new THREE.MeshStandardMaterial({ color: 0x9fd3ff, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.6 }));
  skm.position.set((sk[0] + sk[2]) / 2, (sk[1] + sk[3]) / 2, 35.25 + 0.3); G.add(skm);
  // equipment
  const eqMat = { inv: solMat(0xf2f2ee, { roughness: 0.4 }), dcdb: solMat(0xd9d9d0), acdb: solMat(0xd9d9d0), tap: solMat(0x1e88e5), la: solMat(0xb0b7bd), pit: solMat(0x546e7a) };
  SOL.labels = [];
  D.equip.forEach(e => {
    let o;
    if (e.k === "la") { o = new THREE.Group(); const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, e.h, 8), eqMat.la); mast.rotation.x = Math.PI / 2; mast.position.z = e.h / 2; o.add(mast);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.3, 10), solMat(0xd50000)); tip.rotation.x = Math.PI / 2; tip.position.z = e.h + 0.6; o.add(tip); }
    else { o = new THREE.Mesh(new THREE.BoxGeometry(e.w, e.d, e.h), eqMat[e.k] || eqMat.dcdb); o.position.z = e.h / 2;
      if (e.k === "inv") { const fins = new THREE.Mesh(new THREE.BoxGeometry(e.w * 0.9, 0.08, e.h * 0.3), solMat(0xe0701e)); fins.position.set(0, e.d / 2 + 0.03, e.h * 0.3); o.add(fins); } }
    const g = new THREE.Group(); g.add(o); g.position.set(e.x, e.y + (e.k === "inv" || e.k === "dcdb" || e.k === "acdb" ? e.d / 2 : 0), e.z - (e.k === "la" ? 0 : e.h / 2)); if (e.k === "la") g.position.z = e.z;
    G.add(g);
    if (e.txt && e.k !== "pit") { const d = document.createElement("div"); d.className = "solTag eq"; d.textContent = e.txt; const lo = new CSS2DObject(d); lo.position.set(e.x, e.y + 0.6, (e.k === "la" ? e.z + e.h + 1.5 : e.z + e.h / 2 + 1)); G.add(lo); SOL.labels.push(lo); }
  });
  // cable trays and the riser
  const trM = { dc: solMat(0x8d6e63, { roughness: 0.6 }), ac: solMat(0xc2185b, { roughness: 0.5 }) };
  D.trays.forEach(t => { for (let i = 1; i < t.pts.length; i++) { const a = [...t.pts[i - 1], t.z], b = [...t.pts[i], t.z];
    const mm = new THREE.Mesh(unit, trM[t.k]); memberMatrix(a, b, t.k === "ac" ? 0.35 : 0.5, 0.17, mm.matrix); mm.matrixAutoUpdate = false; G.add(mm); } });
  const R = D.riser.pts; for (let i = 1; i < R.length; i++) { const mm = new THREE.Mesh(unit, trM.ac); memberMatrix(R[i - 1], R[i], 0.5, 0.35, mm.matrix); mm.matrixAutoUpdate = false; G.add(mm); }
  // zone tags
  D.zones.forEach(z => { if (!z.modules) return; const ms = D.m.filter(r => SOL_ZONES[r[4]] === z.id); const cx = ms.reduce((a, r) => a + r[0], 0) / ms.length, cy = ms.reduce((a, r) => a + r[1], 0) / ms.length;
    const d = document.createElement("div"); d.className = "solTag zone" + (z.base ? "" : " opt"); d.textContent = `${z.base ? "" : "Option "}${z.id}: ${z.modules} × 645 Wp = ${z.kwp} kWp`;
    const lo = new CSS2DObject(d); lo.position.set(cx, cy, Math.max(...ms.map(r => r[2])) + 4); lo.userData.zone = z.id; G.add(lo); SOL.labels.push(lo); });
  // shadow overlay for the shading view
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 18), 3));
  SOL.shadow = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  SOL.shadow.frustumCulled = false; SOL.shadow.visible = false; SOL.shadow.renderOrder = 3; G.add(SOL.shadow);
  // the roof deck mask for walking under the array (0.5 ft cells) from the +35'-3" slab minus parapets and the headroom
  const cg = window.CLEAN_GEOM || {}; const C = 0.5, W = 310, H = 270, M = new Uint8Array(W * H);
  const fill = (b, v) => { for (let y = Math.max(0, Math.floor(b[1] / C)); y < Math.min(H, Math.ceil(b[4] / C)); y++) for (let x = Math.max(0, Math.floor(b[0] / C)); x < Math.min(W, Math.ceil(b[3] / C)); x++) M[y * W + x] = v; };
  (cg["Roof_Level_35-3_Slab"] || []).forEach(b => fill(b, 1)); (cg["Roof_Level_35-3_Parapet"] || []).forEach(b => fill(b, 0)); fill([mb[0], mb[1], 0, mb[2], mb[3]], 0);
  SOL.deck = { M, W, H, C };
  cols.forEach(c => fill([c[0] - 0.35, c[1] - 0.35, 0, c[0] + 0.35, c[1] + 0.35], 0));
  solarApplyOptions(); invalidate(1500);
}
function solarApplyOptions() {
  if (!SOL.built) return;
  const show = (z) => !(z === "C" && !SOL.opt.C) && !(z === "W" && !SOL.opt.W);
  // modules: hide by moving the instance far below (keeps one draw call)
  const D = SOLAR_D, m = new THREE.Matrix4(), tilt = new THREE.Matrix4().makeRotationX(D.mod.tilt * Math.PI / 180), rz = new THREE.Matrix4().makeRotationZ(Math.PI / 2);
  D.m.forEach((r, i) => { m.identity(); m.multiply(tilt); if (r[3]) m.multiply(rz); if (show(SOL_ZONES[r[4]])) m.setPosition(r[0], r[1], r[2] + D.mod.T / 2); else m.makeScale(0, 0, 0); SOL.mods.setMatrixAt(i, m); });
  SOL.mods.instanceMatrix.needsUpdate = true;
  const hideInst = (mesh) => { if (!mesh || !mesh.userData.zones) return; const orig = mesh.userData.orig || (mesh.userData.orig = Array.from({ length: mesh.count }, (_, i) => { const a = new THREE.Matrix4(); mesh.getMatrixAt(i, a); return a; }));
    mesh.userData.zones.forEach((z, i) => mesh.setMatrixAt(i, show(z) ? orig[i] : new THREE.Matrix4().makeScale(0, 0, 0))); mesh.instanceMatrix.needsUpdate = true; };
  SOL.parts.steel.forEach(hideInst); [SOL.parts.cols, SOL.parts.bp, SOL.parts.cw, SOL.parts.hr].forEach(hideInst);
  SOL.labels.forEach(l => { if (l.userData.zone) l.visible = show(l.userData.zone) && SOL.on; });
  shadeUpdate(); solarInfo(); invalidate(800);
}
// ---------------------------------------------------------------- shading view
function shadeUpdate() {
  if (!SOL.built) return;
  const D = SOLAR_D, s = solar(SOL.shadeDoy, SOL.shadeHour), up = s.alt > 1;
  SOL.shadow.visible = SOL.shadeOn && up;
  const sv = sunVec(Math.max(s.alt, 0.5), s.az), P = SOL.shadow.geometry.attributes.position.array, col = SOL.mods.instanceColor.array;
  const md = D.mod, c = Math.cos(md.tilt * Math.PI / 180), sn = Math.sin(md.tilt * Math.PI / 180);
  const show = (z) => !(z === "C" && !SOL.opt.C) && !(z === "W" && !SOL.opt.W);
  // tables as occluders (tilted rectangles) and the headroom as a box
  const T = D.tables.filter(t => show(t[0][0])).map(t => ({ id: t[0], o: [t[2], t[3], t[6]], u: [t[4] - t[2], 0, 0], v: [0, t[5] - t[3], t[7] - t[6]] }));
  const mb = D.mumty.b, box3 = [mb[0], mb[1], D.mumty.z0, mb[2], mb[3], D.mumty.z1];
  const hitsTable = (p, own) => T.some(t => { if (t.id === own) return false; const nx = t.u[1] * t.v[2] - t.u[2] * t.v[1], ny = t.u[2] * t.v[0] - t.u[0] * t.v[2], nz = t.u[0] * t.v[1] - t.u[1] * t.v[0];
    const den = nx * sv.x + ny * sv.y + nz * sv.z; if (Math.abs(den) < 1e-9) return false;
    const tt = ((t.o[0] - p[0]) * nx + (t.o[1] - p[1]) * ny + (t.o[2] - p[2]) * nz) / den; if (tt < 0.05) return false;
    const q = [p[0] + sv.x * tt - t.o[0], p[1] + sv.y * tt - t.o[1], p[2] + sv.z * tt - t.o[2]];
    const a = (q[0] * t.u[0]) / (t.u[0] * t.u[0]), b = (q[1] * t.v[1] + q[2] * t.v[2]) / (t.v[1] * t.v[1] + t.v[2] * t.v[2]); return a >= 0 && a <= 1 && b >= 0 && b <= 1; });
  const hitsBox = (p) => { let t0 = 0.05, t1 = 1e9; const d = [sv.x, sv.y, sv.z];
    for (let k = 0; k < 3; k++) { const inv = 1 / (Math.abs(d[k]) < 1e-9 ? 1e-9 : d[k]); let a = (box3[k] - p[k]) * inv, b = (box3[k + 3] - p[k]) * inv; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) return false; } return true; };
  let shaded = 0, shown = 0;
  const tabOf = {}; D.tables.forEach(t => tabOf[t[0]] = t);
  D.m.forEach((r, i) => {
    const z = SOL_ZONES[r[4]], vis = show(z); let sh = false;
    const along = r[3] ? md.L : md.W, across = r[3] ? md.W : md.L;
    // module corners in 3D
    const hx = along / 2, hy = across / 2 * c, hz = across / 2 * sn;
    const cs = [[r[0] - hx, r[1] - hy, r[2] - hz], [r[0] + hx, r[1] - hy, r[2] - hz], [r[0] + hx, r[1] + hy, r[2] + hz], [r[0] - hx, r[1] + hy, r[2] + hz]];
    if (vis && up && SOL.shadeOn) {
      const pts = [[r[0], r[1], r[2] + 0.05], ...cs.map(p => [p[0] * 0.94 + r[0] * 0.06, p[1] * 0.94 + r[1] * 0.06, p[2] * 0.94 + r[2] * 0.06 + 0.05])];
      const own = D.m[i] && D.tables.find(t => r[0] >= t[2] - 0.1 && r[0] <= t[4] + 0.1 && r[1] >= t[3] - 0.1 && r[1] <= t[5] + 0.1);
      sh = pts.some(p => hitsTable(p, own && own[0]) || hitsBox(p)); if (sh) shaded++; shown++;
    }
    col[i * 3] = sh ? 1.0 : 1; col[i * 3 + 1] = sh ? 0.35 : 1; col[i * 3 + 2] = sh ? 0.25 : 1;
    // shadow of the module on its roof (zone roof level)
    const roof = D.zones.find(q => q.id === z).roof, o = i * 18;
    const pr = cs.map(p => { const k = (p[2] - roof - 0.02) / sv.z; return [p[0] - sv.x * k, p[1] - sv.y * k, roof + 0.03]; });
    const tri = vis ? [pr[0], pr[1], pr[2], pr[0], pr[2], pr[3]] : Array(6).fill([0, 0, -99]);
    tri.forEach((p, j) => { P[o + j * 3] = p[0]; P[o + j * 3 + 1] = p[1]; P[o + j * 3 + 2] = p[2]; });
  });
  SOL.mods.instanceColor.needsUpdate = true; SOL.shadow.geometry.attributes.position.needsUpdate = true; SOL.shadow.geometry.computeBoundingSphere();
  SOL.shadeStat = { shaded, shown, alt: s.alt, az: s.az };
  const el = document.getElementById("solShadeStat");
  if (el) el.innerHTML = !SOL.shadeOn ? tr("Pick 21 Dec or 21 Jun to see the shadows and check every module.", "سائے دیکھنے کے لیے 21 دسمبر یا 21 جون منتخب کریں۔") : !up ? tr("The sun is below the horizon.", "سورج افق سے نیچے ہے۔") :
    `${tr("Sun", "سورج")} ${s.alt.toFixed(1)}° ${tr("high", "بلند")}, ${tr("azimuth", "سمت")} ${s.az.toFixed(0)}° · <b class="${shaded ? "bad" : "ok"}">${shaded ? `${shaded} ${tr("of", "میں سے")} ${shown} ${tr("modules shaded", "ماڈیول سائے میں")}` : tr(`no module shaded (${shown} checked)`, `کوئی ماڈیول سائے میں نہیں (${shown})`)}</b>`;
  invalidate(600);
}
function solarShadeView(on, doy, hour) {
  SOL.shadeOn = on; if (doy) SOL.shadeDoy = doy; if (hour != null) SOL.shadeHour = hour;
  if (on) {
    // the scene's sun follows the chosen date and hour, so the rendered shadows (High / Medium) match the overlay
    light.doy = SOL.shadeDoy; light.hour = SOL.shadeHour; light.preset = "custom"; stopPlay();
    const mo = document.getElementById("month"); if (mo) mo.value = light.doy; const ck = document.getElementById("clock"); if (ck) ck.value = light.hour;
    if (typeof buildSunPath === "function") buildSunPath(); if (typeof paintTrack === "function") paintTrack(); applyLight();
    if (renderer.shadowMap) renderer.shadowMap.needsUpdate = true;
  }
  document.querySelectorAll("#solShadeBtns button").forEach(b => b.classList.toggle("on", on && +b.dataset.doy === SOL.shadeDoy));
  const lab = document.getElementById("solHourLab"); if (lab) lab.textContent = solHourTxt(SOL.shadeHour);
  shadeUpdate();
}
function solHourTxt(h) { const hh = Math.floor(h), mm = Math.round((h - hh) * 60); const pkt = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")} PKT`;
  const st = h - 0.5; const sh = Math.floor(st), sm = Math.round((st - sh) * 60); return `${pkt} (≈ ${String(sh).padStart(2, "0")}:${String((sm + 60) % 60).padStart(2, "0")} ${tr("solar time", "شمسی وقت")})`; }
// ---------------------------------------------------------------- on / off, camera, walking under the array
function solarSet(on) {
  if (on && !SOLAR_D) return;
  if (on) solarBuild();
  SOL.on = on; if (SOL.group) SOL.group.visible = on;
  SOL.labels && SOL.labels.forEach(l => l.visible = on && (!l.userData.zone || !(l.userData.zone === "C" && !SOL.opt.C) && !(l.userData.zone === "W" && !SOL.opt.W)));
  document.body.classList.toggle("solarOn", on);
  const cb = document.getElementById("solOn"); if (cb) cb.checked = on;
  document.getElementById("solInfo").hidden = !on;
  if (on && !SOL.folded && typeof isPhoneLayout === "function" && isPhoneLayout()) { SOL.folded = true; const b = document.getElementById("solInfoBody"); b.hidden = true; document.getElementById("solMin").textContent = "▸"; }
  if (!on && SOL.shadeOn) solarShadeView(false);
  if (!on && SOL.roofWalk) solarRoofWalk(false);
  solarInfo(); invalidate(1200);
}
function solarView() {
  if (W8.on) exitWalk();
  if (ARCH.on) setMode("material");
  solarSet(true);
  camera.fov = 34; camera.updateProjectionMatrix(); camera.position.set(-40, -95, 175); controls.target.set(78, 78, 36); controls.update();
  document.getElementById("viewName").textContent = tr("Rooftop solar (aerial)", "چھت پر سولر");
  invalidate(1500);
}
function solarRoofWalk(on) {
  if (on) {
    solarSet(true);
    if (!W8.on) enterWalk({ f: "SF", x: 89.5, y: 118, yaw: Math.PI, pitch: 0.22 });
    setFly(true); W8.x = 89.5; W8.y = 118; W8.z = 35.25; W8.yaw = Math.PI; W8.pitch = 0.22; SOL.roofWalk = true; SOL.lastPos = [W8.x, W8.y];
    document.body.classList.add("roofwalk");
    if (typeof isPhoneLayout === "function" && isPhoneLayout()) { document.getElementById("solInfoBody").hidden = true; document.getElementById("solCtl").hidden = true; document.getElementById("solMin").textContent = "▸"; }
    perfToast(tr("On the roof, under the array (8'-0\" clear). Walk with W A S D or the joystick.", "چھت پر، پینلز کے نیچے۔ چلنے کے لیے جوائے اسٹک استعمال کریں۔"), 4200);
  } else {
    SOL.roofWalk = false; document.body.classList.remove("roofwalk");
    if (W8.on && W8.fly) { setFly(false); placeAt("SF", 82.75, 93.25, Math.PI, 0); }
  }
  invalidate(1200);
}
function solarFrame(dt) {
  if (!SOL.group) return;
  // follow the exploded view and hide with the roofs (cutaways, plan cuts, bird's-eye below the roof)
  SOL.group.position.z = (typeof exploded !== "undefined" && exploded) ? 102 : 0;
  if (SOL.roofWalk) {
    if (!W8.on || !W8.fly) { SOL.roofWalk = false; document.body.classList.remove("roofwalk"); return; }
    W8.z = 35.25;
    const d = SOL.deck, ok = (x, y) => { const cx = Math.floor(x / d.C), cy = Math.floor(y / d.C); return cx >= 0 && cy >= 0 && cx < d.W && cy < d.H && d.M[cy * d.W + cx] === 1; };
    if (!ok(W8.x, W8.y)) { const [px, py] = SOL.lastPos; if (ok(W8.x, py)) W8.y = py; else if (ok(px, W8.y)) W8.x = px; else { W8.x = px; W8.y = py; } }
    SOL.lastPos = [W8.x, W8.y];
  }
}
function solarCullHide(hide) {
  if (!SOL.group || !SOL.on) return;
  const r = groups["Roof_Level_35-3_Slab"]; if (r && !r.visible) hide(SOL.group);
}
// ---------------------------------------------------------------- the info panel
function solarInfo() {
  const el = document.getElementById("solInfoBody"); if (!el || !SOLAR_D) return;
  const D = SOLAR_D, c = D.counts, z = (id) => D.zones.find(q => q.id === id) || { modules: 0, kwp: 0 };
  const shown = D.zones.filter(q => q.base || SOL.opt[q.id]).reduce((a, q) => a + q.modules, 0);
  const kwp = (shown * D.mod.wp / 1000).toFixed(2), sy = D.yield_.sy, e = Math.round(shown * D.mod.wp / 1000 * sy / 1000 * 10) / 10;
  const inv = D.inv.map(i => `${i.id}: ${i.ac_kw} kW, ${i.modules} modules (${i.kwp} kWp), strings ${i.strings.join(" + ")}, DC/AC ${i.dc_ac}`).join("<br>");
  el.innerHTML = `
  <p class="solBig"><b>${shown}</b> × 645 Wp = <b>${kwp} kWp</b> ${tr("shown", "دکھایا گیا")}<br><span>${tr("Target 210 modules (135.45 kWp) does not fit.", "210 ماڈیول (135.45 kWp) چھت پر پورے نہیں آتے۔")} ${tr(`Rules met on the RCC grid: ${c.base} modules (${c.kwp_base} kWp); with options C + W: ${c.all} (${c.kwp_all} kWp).`, `آر سی سی گرڈ پر ${c.base} ماڈیول؛ آپشن C اور W کے ساتھ ${c.all}۔`)}</span></p>
  <table class="solT"><tr><th>${tr("Zone", "زون")}</th><th>${tr("Modules", "ماڈیول")}</th><th>kWp</th></tr>
   ${D.zones.filter(q => q.modules || q.id === "D").map(q => `<tr class="${q.base ? "" : "opt"}"><td>${q.base ? "" : tr("Option ", "آپشن ")}${q.id} · ${q.name.replace(/^Option [CW]: /, "")}</td><td>${q.modules}</td><td>${q.kwp}</td></tr>`).join("")}</table>
  <p><b>${tr("Orientation", "رخ")}:</b> ${tr("tilt 15°, azimuth 180° (true south; the set has no north point, so +Y = north is assumed)", "جھکاؤ 15°، رخ 180° (جنوب)")} · ${tr("roof coverage", "چھت کا حصہ")} ${Math.round(shown * D.mod.L * D.mod.W * Math.cos(15 * Math.PI / 180) / D.areas.deck * 100)} % ${tr(`of the ${D.areas.deck.toLocaleString()} sq ft deck`, "")}</p>
  <p><b>${tr("Layout", "ترتیب")}:</b> ${tr("15° tilt facing south, 8'-0\" clear under the steel, 1 m from every parapet, 2'-6\" catwalks between rows, nothing over the courtyard, the skylight or the stair door. Rows are spaced so that no module is shaded 09:00–15:00 solar time on 21 December (checked by ray casting: 0 %).", "15° جنوب رخ، اسٹیل کے نیچے 8 فٹ، پیرا پٹ سے 1 میٹر، قطاروں کے بیچ 2'-6\" راستہ؛ 21 دسمبر 9 تا 3 بجے کوئی سایہ نہیں۔")}</p>
  <p><b>${tr("Structure", "ڈھانچہ")}:</b> ${tr(`HDG SHS 150×150 columns only on existing RCC columns in zones A and B; ISMB 200 primary beams, ISMC 125 secondary beams, C 100 rafters and purlins. Options C and W need new columns (orange) located by the structural engineer; zone C sits over the asbestos-cement sheet roof, which must be removed by a licensed contractor first. Steel ≈ ${(D.kg_all / 1000).toFixed(1)} t for all zones (${(D.kg_base / 1000).toFixed(1)} t for A + B).`, "صرف موجودہ آر سی سی کالموں پر اسٹیل کالم (A، B)؛ آپشن C اور W کے لیے نئے کالم درکار ہیں۔")}</p>
  <p><b>${tr("Electrical", "برقی")}:</b> ${inv}<br>${tr(`String Voc at ${D.el.tmin} °C: ${D.el.voc1} V per module → max ${D.el.nmax} in series for 1100 V; used 17–20 (811–954 V). Vmp at ${D.el.tcell} °C cell ≥ 480 V (full-power MPPT). AC: ${D.el.ac_kw} kW, ${D.el.i_ac} A, 4C × 70 mm² Cu, ${D.el.l_ac} m, drop ${D.el.vd_ac} %.`, "")}</p>
  <p><b>${tr("Energy", "توانائی")}:</b> ${tr(`≈ ${sy} kWh/kWp per year (≈ ${D.yield_.sy_bif} with a 5 % bifacial gain) → ≈ ${e} MWh/yr for what is shown; the 135.45 kWp brief would give ≈ ${Math.round(135.45 * sy / 1000)} MWh/yr.`, `تقریباً ${sy} kWh/kWp سالانہ`)}</p>
  <details><summary>${tr("Bill of quantities (all zones)", "مقدار کی فہرست")}</summary><table class="solT">${D.boq_all.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join("")}${D.elec.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join("")}</table></details>
  <p class="solWarn">⚠ ${tr("Concept / visual design. Structural design (Karachi wind load, slab / beam / column capacity) and the electrical design must be verified by a certified structural and electrical engineer.", "یہ صرف تصوراتی ڈیزائن ہے۔ اسٹرکچرل (کراچی کی ہوا کا بوجھ، سلیب/بیم/کالم کی طاقت) اور برقی ڈیزائن کی تصدیق مستند انجینئر سے کروانا لازمی ہے۔")}</p>`;
}
function solarBuildUI() {
  if (!SOLAR_D) return;
  const css = document.createElement("style");
  css.textContent = `
#solInfo{position:fixed;right:16px;top:calc(76px + env(safe-area-inset-top,0px));z-index:7;width:min(400px,calc(100vw - 32px));max-height:calc(100dvh - 190px);overflow:auto;background:var(--panel);color:var(--ink);
  border:1px solid var(--line);border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.18);backdrop-filter:blur(12px);font-size:14px;line-height:1.45}
#solInfo[hidden]{display:none}
#solInfo .sh{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--line);position:sticky;top:0;background:var(--panel)}
#solInfo .sh b{flex:1;font-size:15px} #solInfo .sh button{min-width:44px;min-height:44px;border:0;background:transparent;font-size:18px;color:var(--ink);cursor:pointer}
#solInfoBody{padding:4px 14px 12px} #solInfoBody p{margin:8px 0}
.solBig{font-size:15px} .solBig span{font-size:14px;color:#b71c1c}
.solT{width:100%;border-collapse:collapse;font-size:13.5px;margin:6px 0} .solT td,.solT th{border-bottom:1px solid var(--line);padding:4px 4px;text-align:left;vertical-align:top} .solT td:not(:first-child),.solT th:not(:first-child){text-align:right;white-space:nowrap}
.solT tr.opt td{color:var(--muted)}
.solWarn{background:#fff4e5;color:#6d3b00;border-radius:9px;padding:9px 11px;font-size:14px}
#solCtl[hidden],#solInfoBody[hidden]{display:none!important}
#solCtl{display:flex;flex-direction:column;gap:6px;padding:8px 14px 12px;border-bottom:1px solid var(--line)}
#solCtl .r{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
#solCtl button{font:inherit;font-size:14px;padding:8px 11px;min-height:44px;min-width:44px;border-radius:9px;border:1px solid var(--line);background:transparent;color:var(--ink);cursor:pointer}
#solCtl button.on{background:#1e6fd9;color:#fff;border-color:#1e6fd9}
#solCtl input[type=range]{flex:1;min-width:150px;height:44px}
#solCtl label{display:inline-flex;gap:6px;align-items:center;min-height:44px;font-size:14px}
#solShadeStat{font-size:14px} #solShadeStat .bad{color:#c62828} #solShadeStat .ok{color:#2e7d32}
.solTag{background:rgba(20,26,32,.8);color:#fff;font-size:12px;padding:3px 7px;border-radius:6px;white-space:nowrap;pointer-events:none}
.solTag.zone{background:#1e6fd9;font-weight:600;font-size:13px} .solTag.zone.opt{background:#e08a00}
body:not(.solarOn) .solTag,body.walking:not(.roofwalk) .solTag,body:not(.roofwalk) .solTag.eq{display:none}
body.roofwalk #roomCard{display:none!important}
body.roofwalk .solTag.zone{display:none}
body.roofwalk #flyBtns{display:none!important}
#solSec .row{min-height:40px}
@media (max-width:820px),(max-height:500px) and (pointer:coarse){
  #solInfo{left:8px;right:8px;width:auto;top:auto;bottom:calc(var(--peek,62px) + 8px + env(safe-area-inset-bottom,0px));max-height:52dvh}
  body.walking #solInfo{bottom:calc(170px + env(safe-area-inset-bottom,0px));max-height:40dvh}
}
@media (max-height:500px) and (pointer:coarse) and (orientation:landscape){
  #solInfo,body.walking #solInfo{left:auto;right:calc(8px + env(safe-area-inset-right,0px));width:min(380px,46vw);top:calc(58px + env(safe-area-inset-top,0px));bottom:calc(8px + env(safe-area-inset-bottom,0px));max-height:none}
  .solTag{font-size:12px} .solTag.zone{font-size:13px}
}`;
  document.head.appendChild(css);
  // panel section
  const panel = document.getElementById("panel");
  if (panel) {
    const sec = document.createElement("section"); sec.id = "solSec";
    sec.innerHTML = `<h2>${tr("Rooftop solar", "چھت پر سولر")}</h2><label class="row"><input type="checkbox" id="solOn"><span>☀ ${tr("Show the 135 kWp concept", "سولر دکھائیں")}</span></label>
      <div class="grid"><button id="solViewBtn">${tr("Solar view", "سولر منظر")}</button><button id="solWalkBtn">${tr("Walk under the panels", "پینلز کے نیچے چلیں")}</button></div>`;
    const q = document.getElementById("qualSec"); if (q) q.parentNode.insertBefore(sec, q); else panel.appendChild(sec);
    document.getElementById("solOn").onchange = (e) => solarSet(e.target.checked);
    document.getElementById("solViewBtn").onclick = solarView;
    document.getElementById("solWalkBtn").onclick = () => solarRoofWalk(true);
  }
  // info card
  const box = document.createElement("div"); box.id = "solInfo"; box.hidden = true; box.setAttribute("role", "region"); box.setAttribute("aria-label", "Rooftop solar information");
  box.innerHTML = `<div class="sh"><b>☀ ${tr("Rooftop solar concept", "چھت پر سولر")}</b><button id="solMin" aria-label="Collapse">▾</button><button id="solClose" aria-label="Close">✕</button></div>
    <div id="solCtl"><div class="r"><label><input type="checkbox" id="solOptC" checked> ${tr("Option C (cafeteria canopy)", "آپشن C")}</label><label><input type="checkbox" id="solOptW" checked> ${tr("Option W (west block)", "آپشن W")}</label></div>
    <div class="r" id="solShadeBtns"><span>${tr("Shading view", "سائے کا منظر")}:</span><button data-doy="355">21 Dec</button><button data-doy="172">21 Jun</button><button id="solShadeOff">${tr("Off", "بند")}</button></div>
    <div class="r"><input type="range" id="solHour" min="7" max="18" step="0.25" value="12.5" aria-label="Hour of the day"><span id="solHourLab"></span></div>
    <div id="solShadeStat"></div><div class="r"><button id="solWalk2">🚶 ${tr("Walk under the panels", "پینلز کے نیچے چلیں")}</button><button id="solView2">🛰 ${tr("Solar view", "سولر منظر")}</button></div></div>
    <div id="solInfoBody"></div>`;
  document.body.appendChild(box);
  document.getElementById("solClose").onclick = () => solarSet(false);
  document.getElementById("solMin").onclick = () => { const b = document.getElementById("solInfoBody"), c = document.getElementById("solCtl"); const h = !b.hidden || c.hidden; b.hidden = h; c.hidden = false; if (!h) c.hidden = false; document.getElementById("solMin").textContent = h ? "▸" : "▾"; };
  document.getElementById("solOptC").onchange = (e) => { SOL.opt.C = e.target.checked; solarApplyOptions(); };
  document.getElementById("solOptW").onchange = (e) => { SOL.opt.W = e.target.checked; solarApplyOptions(); };
  document.querySelectorAll("#solShadeBtns button[data-doy]").forEach(b => b.onclick = () => solarShadeView(true, +b.dataset.doy));
  document.getElementById("solShadeOff").onclick = () => solarShadeView(false);
  const hr = document.getElementById("solHour"); hr.oninput = () => solarShadeView(SOL.shadeOn || true, SOL.shadeDoy, +hr.value);
  document.getElementById("solHourLab").textContent = solHourTxt(12.5);
  document.getElementById("solWalk2").onclick = () => solarRoofWalk(true);
  document.getElementById("solView2").onclick = solarView;
  if (typeof menuAdd === "function") {
    menuAdd({ id: "mSolar", icon: "☀", label: () => SOL.on ? tr("Hide rooftop solar", "سولر چھپائیں") : tr("Rooftop solar (135 kWp concept)", "چھت پر سولر"), group: "solar", run: () => SOL.on ? solarSet(false) : solarView() });
    menuAdd({ id: "mSolarWalk", icon: "🚶", label: () => tr("Walk under the solar panels", "پینلز کے نیچے چلیں"), group: "solar", run: () => solarRoofWalk(true) });
  }
}
window.__solar = { SOL, set: solarSet, view: solarView, walk: solarRoofWalk, shade: solarShadeView, opts: (c, w) => { SOL.opt.C = c; SOL.opt.W = w; solarApplyOptions(); }, stat: () => SOL.shadeStat };
