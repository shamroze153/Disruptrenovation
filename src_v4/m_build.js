// ---------------------------------------------------------------- placement: items -> instanced parts
PDEF.rug = (v = 0) => { const K = new Kit(); K.box(1.94, 3.9, 0.02, 0, 0, 0.012, 0);
  return { g: K.build(), pal: [PL.white], extras: [{ g: quadGeoAt(1.92, 3.88, 0, 0, 0.026, Math.PI, Math.PI / 2), m: texMat("rug" + v, rugDraw(v), 256, 440, 0.95) }], cast: false }; };
PDEF.pmat = () => { const K = new Kit(); K.box(6, 6, 0.04, 0, 0, 0.02, 0);
  return { g: K.build(), pal: [PL.white], cast: false, extras: [{ g: quadGeoAt(5.98, 5.98, 0, 0, 0.045, Math.PI, Math.PI / 2), m: texMat("pmat", (g, w, h) => {
    const c = ["#e2574c", "#f2c230", "#3fa7d6", "#59c173", "#9b6fd0", "#f58a34"]; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = c[(i * 4 + j * 3) % 6]; g.fillRect(i * 64, j * 64, 64, 64); }
    g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke(); } }, 256, 256, 0.9) }] }; };
const PARTS = new Map();
function emit(fl, key, m, tints, make) {
  let p = PARTS.get(key);
  if (!p) { p = { make, inst: {} }; PARTS.set(key, p); }
  (p.inst[fl] = p.inst[fl] || []).push([m, tints]);
}
const baseM = (it) => M4(it[1], it[2], it[3], it[4]);
const subM = (M, x, y, z, rz = 0, sx = 1, sy = 1, sz = 1, rx = 0) => M.clone().multiply(M4(x, y, z, rz, sx, sy, sz, rx));
const TNT = {
  chair: [0x2a2c30, 0x3b4a5c, 0x2b2d31, 0x5a6470, 0x1f3f5f, 0x4a4f55, 0x2a2c30],
  div: [0x5f7f86, 0x8a9aa3, 0xb0a48a, 0x6a7d5c, 0xd28a3a, 0x9aa0a6, 0x5f7f86],
  sofa: [0x5a6e7e, 0x7a5c48, 0x3f5a50, 0x8a8f96, 0xb07a4a, 0x2f3f5a, 0x6e2a35],
  top: [0xefebe3, 0xe6dccb, 0xc9a878, 0xefebe3],
  pot: [0x3b3b3b, 0xe8e4dc, 0x7a5c48, 0x2f3f4a, 0xc9c1b4],
  leaf: [0x3f6b2e, 0x4b7a34, 0x2f5a2a, 0x557f3a, 0x3a6a3a],
  shell: [0xf1efe8, 0x2f2f30, 0xd9b12a, 0x3f7f86, 0xc0463a, 0xf1efe8],
  meet: [0x3b4a5c, 0x2b2d31, 0x6e2a35, 0x5a6470, 0x2f5a50],
  leather: [0x1e1c1b, 0x3a2418, 0x1e1c1b],
  kid: [0xe07a4a, 0x3fa7d6, 0x59c173, 0xf2c230],
};
const zoneSeed = (it) => Math.floor(it[1] / 14) * 31 + Math.floor(it[2] / 14) * 17;
const ONE = (key, tint) => (fl, it) => emit(fl, key, M4(it[1], it[2], it[3], it[4], it[5] > 0 ? 1 : 1), tint ? [pickS(TNT[tint], it[8], 1)] : null, () => PDEF[key]());
const PLACE = {
  desk(fl, it) { const M = baseM(it), w = it[5], d = it[6] || 2.0, top = pickS(TNT.top, zoneSeed(it), 3);
    emit(fl, "deskTop", subM(M, 0, 0, 0, 0, w, d / 2), [top], () => PDEF.deskTop());
    for (const sd of [-1, 1]) emit(fl, "deskLeg", subM(M, sd * (w / 2 - 0.07), 0, 0, 0, 1, d / 2), null, () => PDEF.deskLeg());
    emit(fl, "deskPanel", subM(M, 0, 0, 0, 0, w * 0.96, 1), null, () => PDEF.deskPanel());
    if (QUAL.trim < 2) emit(fl, "kbd", subM(M, (rnd01(it[8]) - 0.5) * 0.4, 0.32, 2.45, (rnd01(it[8] * 2) - 0.5) * 0.2), null, () => PDEF.kbd()); },
  mon(fl, it) { const M = baseM(it), v = it[8] % 4, key = "monitor" + v;
    if (rnd01(it[8] * 0.37) < 0.33) { for (const sd of [-1, 1]) emit(fl, key, subM(M, sd * 0.93, -0.4 + 0.12, 0, -sd * 0.28), null, () => PDEF.monitor(v)); }
    else emit(fl, key, subM(M, 0, -0.45, 0), null, () => PDEF.monitor(v)); },
  divider(fl, it) { emit(fl, "divider", subM(baseM(it), 0, 0, 0, 0, it[5] || 3.4), [pickS(TNT.div, zoneSeed(it), 2)], () => PDEF.divider()); },
  chair: ONE("chair", "chair"), mchair: ONE("mchair", "meet"), uchair: ONE("uchair", "shell"), dchair: ONE("uchair", "shell"),
  lchair: ONE("lchair", "leather"), echair: ONE("lchair", "leather"), stool: ONE("stool", "leather"), kchair: ONE("kchair", "kid"),
  tbl(fl, it) { const M = baseM(it), w = it[5], d = it[6], board = it[8] === 1 && w > 8;
    emit(fl, board ? "tblTopB" : "tblTop", subM(M, 0, 0, 0, 0, w, d), board ? null : [pickS([0xc9a878, 0xefebe3, 0xb89468], zoneSeed(it), 4)], () => PDEF.tblTop(board ? 1 : 0));
    if (board) { for (const sd of [-1, 1]) emit(fl, "tblPed", subM(M, sd * (w / 2 - 1.6), 0, 0, 0, 1, Math.min(1, d * 0.55 / 1.6)), null, () => PDEF.tblPed()); }
    else { const xs = [-(w / 2 - 0.25), w / 2 - 0.25]; if (w > 9) xs.push(0);
      for (const x of xs) for (const y of [-(d / 2 - 0.25), d / 2 - 0.25]) emit(fl, "tblLeg", subM(M, x, y, 0), null, () => PDEF.tblLeg()); } },
  rtbl(fl, it) { const M = baseM(it), D = it[5]; emit(fl, "rtblTop", subM(M, 0, 0, 0, 0, D, D), [pickS([0xefebe3, 0xc9a878, 0x3a3d42], zoneSeed(it), 5)], () => PDEF.rtblTop()); emit(fl, "pedestal", M, null, () => PDEF.pedestal()); },
  cafe(fl, it) { const M = baseM(it), w = it[5], d = it[6]; emit(fl, "tblTop", subM(M, 0, 0, 0, 0, w, d), [0xefebe3], () => PDEF.tblTop(0));
    if (w > 3.2 || d > 3.2) { for (const sd of [-1, 1]) emit(fl, "pedestal", subM(M, sd * (Math.max(w, d) / 2 - 0.9) * (w >= d ? 1 : 0), sd * (Math.max(w, d) / 2 - 0.9) * (w >= d ? 0 : 1), 0), null, () => PDEF.pedestal()); }
    else emit(fl, "pedestal", M, null, () => PDEF.pedestal()); },
  tv: ONE("tv"), credenza: ONE("credenza"), fcab: ONE("fcab"), printer: ONE("printer"), bshelf: ONE("bshelf"), shelf: ONE("shelf"),
  mug(fl, it) { emit(fl, "mug", baseM(it), null, () => PDEF.mug()); }, papers: ONE("papers"),
  plant(fl, it) { const s = it[7] || 1; emit(fl, "plant", M4(it[1], it[2], it[3], it[4], s, s, s), [pickS(TNT.leaf, it[8], 1), pickS(TNT.pot, it[8], 2)], () => PDEF.plant()); },
  dplant(fl, it) { emit(fl, "dplant", baseM(it), [pickS(TNT.leaf, it[8], 1)], () => PDEF.dplant()); },
  planter(fl, it) { const M = baseM(it), w = it[5] || 2.4, d = it[6] || 3.4; emit(fl, "planterBox", subM(M, 0, 0, 0, 0, w, d), null, () => PDEF.planterBox());
    const n = Math.max(1, Math.round(Math.max(w, d) / 2.2)); for (let i = 0; i < n; i++) { const t = (i + 0.5) / n - 0.5; emit(fl, "shrub", subM(M, w >= d ? t * w : 0, w >= d ? 0 : t * d, 0, i * 1.3, Math.min(w, d) / 1.6, Math.min(w, d) / 1.6, 1), [pickS(TNT.leaf, it[8] + i, 1)], () => PDEF.shrub()); } },
  sofa(fl, it) { const L = Math.max(3, Math.round(it[5] || 6)); emit(fl, "sofa" + L, baseM(it), [pickS(TNT.sofa, zoneSeed(it), 1)], () => PDEF.sofa(L)); },
  arm: ONE("arm", "sofa"), ctbl: ONE("ctbl"), gbench: ONE("gbench"), bbag: ONE("bbag", "sofa"),
  bench(fl, it) { const L = Math.max(2, Math.round(it[5] || 6)); emit(fl, "bench" + L, baseM(it), [pickS(TNT.sofa, it[8], 1)], () => PDEF.bench(L)); },
  barc: ONE("barc"), kitchen: ONE("kitchen"), fridge: ONE("fridge"), wdisp: ONE("wdisp"), coffee: ONE("coffee"), vend: ONE("vend"), teac: ONE("teac"),
  wc: ONE("wc"), urinal: ONE("urinal"), basin: ONE("basin"), cpart: ONE("cpart"), shower: ONE("shower"), locker: ONE("locker"), msink: ONE("msink"), wudu: ONE("wudu"), shoes: ONE("shoes"),
  rug(fl, it) { const v = it[8] % 4; emit(fl, "rug" + v, baseM(it), null, () => PDEF.rug(v)); },
  rack: ONE("rack"), acunit: ONE("acunit"), ups: ONE("ups"), batt: ONE("batt"), vwall: ONE("vwall"), cdesk: ONE("cdesk"), wbench: ONE("wbench"), drum: ONE("drum"), trolley: ONE("trolley"), panel: ONE("panel"), pump: ONE("pump"),
  gen(fl, it) { emit(fl, "gen", baseM(it), [0xd4cfbf], () => PDEF.gen()); },
  tread: ONE("tread"), bike: ONE("bike"), multigym: ONE("multigym"), dbrack: ONE("dbrack"), wbenchg: ONE("wbenchg"), mirror: ONE("mirror"), pool: ONE("pool"), pp: ONE("pp"), fooz: ONE("fooz"),
  rdesk(fl, it) { const L = Math.max(4, Math.round(it[5] || 9)); emit(fl, "rdesk" + L, baseM(it), null, () => PDEF.rdesk(L)); },
  gdesk: ONE("gdesk"), bed: ONE("bed"), mcab: ONE("mcab"), crib: ONE("crib"), toys: ONE("toys"), pmat: ONE("pmat"), ltbl: ONE("ltbl"),
};
function placePerson(fl, it) {
  let pose = it[0].slice(2); if (!POSES[pose]) pose = "stand";
  if (pose === "meet" && rnd01(it[8] * 0.73) < 0.4) pose = "meet2";
  let vk = pickVariant(it[8], pose);
  if (QUAL.trim >= 2) vk = { m_shirtS: "m_shirt", m_beard: "m_shirt", f_bun: "f_kameez" }[vk] || vk;     // Low: fewer outfit variants = fewer draw calls
  const s = (PVAR[vk].sex === "f" ? 0.97 : 1.0) * (0.95 + 0.08 * rnd01(it[8] * 0.91));
  emit(fl, "P:" + pose + ":" + vk, M4(it[1], it[2], it[3], it[4], s, s, s), personTints(vk, it[8]), () => ({ g: personGeo(pose, vk), pal: P_PAL, nt: 6 }));
}
// v4: small props dropped below High (Medium: mugs, papers; Low: also keyboards, desk plants)
const TRIM_TYPES = [[], ["mug", "papers"], ["mug", "papers", "dplant"]];
function furnGroups() {
  const fg = {};
  ["GF", "FF", "SF"].forEach(k => { let g = groups[k + "_Furniture"];
    if (!g) { g = new THREE.Group(); g.name = k + "_Furniture"; root.add(g); groups[g.name] = g; }
    fg[k] = g; });
  ["Ground floor", "First floor", "Second floor"].forEach((n, i) => { const k = ["GF", "FF", "SF"][i] + "_Furniture"; if (!LAYER_GROUPS[n].includes(k)) LAYER_GROUPS[n].push(k); });
  LAYER_GROUPS["Furniture & people"] = ["GF_Furniture", "FF_Furniture", "SF_Furniture"];
  return fg;
}
async function buildFurniture(onProgress) {
  const unknown = new Set(), fg = furnGroups(), skip = new Set(TRIM_TYPES[QUAL.trim] || []);
  PARTS.clear(); GCACHE.clear();
  ["GF", "FF", "SF"].forEach(k => (FURN[k] || []).forEach(it => {
    if (skip.has(it[0])) return;
    try {
      if (it[0].startsWith("p_")) placePerson(k, it);
      else if (PLACE[it[0]]) PLACE[it[0]](k, it);
      else unknown.add(it[0]);
    } catch (e) { console.warn("furniture item failed", it[0], e); }
  }));
  if (unknown.size) console.warn("furniture types without a model:", [...unknown].join(", "));
  let tris = 0, draws = 0, done = 0, t0 = performance.now();
  const total = PARTS.size;
  for (const [key, p] of PARTS) {
    if (performance.now() - t0 > 24) { onProgress && onProgress(done / total); await new Promise(r => setTimeout(r, 0)); t0 = performance.now(); }
    done++;
    let def;
    try { def = p.def || (p.def = p.make()); } catch (e) { console.warn("part failed", key, e); continue; }
    if (!def || !def.g) continue;
    const mat = def.mat || (def.mat = kitMat(def.pal, def.nt || 0, def.opts || {}));
    Object.entries(p.inst).forEach(([k, list]) => {
      const n = list.length, geo = new THREE.BufferGeometry();
      ["position", "normal", "slot"].forEach(a => geo.setAttribute(a, def.g.getAttribute(a)));
      for (let t = 0; t < (def.nt || 0); t++) {
        const arr = new Float32Array(n * 3);
        list.forEach(([m, tints], i) => { const c = new THREE.Color(tints && tints[t] !== undefined ? tints[t] : 0xb0b0b0); arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; });
        geo.setAttribute("iT" + t, new THREE.InstancedBufferAttribute(arr, 3));
      }
      const im = new THREE.InstancedMesh(geo, mat, n);
      list.forEach(([m], i) => im.setMatrixAt(i, m)); im.instanceMatrix.needsUpdate = true;
      im.castShadow = def.cast === true || /^(gen|plant|shelf|bshelf|rack|locker|vend|fridge|pool|tread|sofa|multigym|shrub|planterBox)/.test(key);
      im.receiveShadow = true; im.computeBoundingSphere();
      im.userData.fixed = true; im.userData.furniture = true; im.name = key;
      fg[k].add(im); tris += n * def.g.attributes.position.count / 3; draws++;
      (def.extras || []).forEach(ex => {
        const im2 = new THREE.InstancedMesh(ex.g, ex.m, n);
        list.forEach(([m], i) => im2.setMatrixAt(i, m)); im2.instanceMatrix.needsUpdate = true;
        im2.castShadow = false; im2.receiveShadow = !ex.m.isMeshBasicMaterial; im2.computeBoundingSphere();
        im2.userData.fixed = true; im2.userData.furniture = true; im2.name = key + ":x"; fg[k].add(im2); draws++;
      });
    });
  }
  onProgress && onProgress(1);
  window.__furnStats = { parts: PARTS.size, draws, tris: Math.round(tris), det: QUAL.det, trim: QUAL.trim };
}
// quality change: throw the furniture away and build it again at the new detail
async function rebuildFurniture(onProgress) {
  const keep = {};
  ["GF", "FF", "SF"].forEach(k => { const g = groups[k + "_Furniture"]; if (!g) return; keep[k] = g.visible;
    [...g.children].forEach(o => { g.remove(o); if (o.geometry) o.geometry.dispose(); }); });
  PARTS.forEach(p => { if (p.def && p.def.mat) p.def.mat.dispose(); });
  await buildFurniture(onProgress);
  ["GF", "FF", "SF"].forEach(k => { if (groups[k + "_Furniture"] && k in keep) groups[k + "_Furniture"].visible = keep[k]; });
  if (ARCH.on) archSetCut(ARCH.cut);
}

