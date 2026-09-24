// ================================================================ WAYFINDING (v4.0)
// "Where to?" search over departments and rooms, routes from the main gate / a tapped point / where you stand, over
// the stairs, a glowing animated route, turn-by-turn directions (English / Urdu), a bird's-eye follow camera with the
// floors above hidden, auto-walk ("take me there"), the minimap, deep links (?to=board-room) and the emergency route.
const L10N = { ur: false };
const tr = (en, ur) => (L10N.ur && ur ? ur : en);
const FLOOR_UR = { GF: "گراؤنڈ فلور", FF: "فرسٹ فلور", SF: "سیکنڈ فلور" };
const STAIR_UR = { "Main stair": "مین سیڑھی", "West stair": "ویسٹ سیڑھی", "Service stair": "سروس سیڑھی" };
const floorName = (f) => tr(FLOOR_NAME[f], FLOOR_UR[f]);
const stairName = (n) => tr(n, STAIR_UR[n]);
const WAY = { dest: null, start: null, route: null, steps: null, view: "bird", auto: null, sos: false, rib: [], pin: null, avatar: null, t: 0, progress: 0, cur: 0,
  camPos: new THREE.Vector3(), camTgt: new THREE.Vector3(), camInit: false, speed: 1, arrived: false };
const DEPTS = [
  { key: "reception", en: "Reception", ur: "استقبالیہ", re: /^Reception area|^Entrance foyer/ },
  { key: "main-gate", en: "Main gate & guard post", ur: "مین گیٹ", re: /^Main gate/ },
  { key: "admin", en: "Admin offices", ur: "ایڈمن آفس", re: /^Admin office|^Admin check/ },
  { key: "procurement", en: "Procurement", ur: "پروکیورمنٹ", re: /^Procurement/ },
  { key: "board-room", en: "Board room", ur: "بورڈ روم", re: /^Board room/ },
  { key: "meeting-rooms", en: "Meeting rooms & huddles", ur: "میٹنگ روم", re: /^Meeting room|^Visitor|^Huddle|^Room$|^Room marked|^4S booth/ },
  { key: "work-stations", en: "Work stations", ur: "ورک اسٹیشن", re: /^Work ?stations?|^Workstation/ },
  { key: "reading-room", en: "Reading room", ur: "ریڈنگ روم", re: /^Reading room/ },
  { key: "gym", en: "Gym", ur: "جم", re: /^Gym$|^Gym store/ },
  { key: "day-care", en: "Day care", ur: "ڈے کیئر", re: /^Day care/ },
  { key: "medical-assist", en: "Medical assist", ur: "طبی امداد", re: /^Medical assist/ },
  { key: "prayer", en: "Masjid & prayer areas", ur: "مسجد اور نماز", re: /^Masjid|prayer area|^Ablution|^Shoe rack/ },
  { key: "cafeteria", en: "Rooftop cafeteria", ur: "کیفے ٹیریا", re: /cafeteria/i },
  { key: "refreshment", en: "Refreshment & dining", ur: "ریفریشمنٹ", re: /^Refreshment|dining/i },
  { key: "recreation", en: "Recreation, gaming & sitting", ur: "تفریح", re: /^Recreational|^Gaming|^Sitting/ },
  { key: "server-room", en: "Server room", ur: "سرور روم", re: /^Server room/ },
  { key: "it-room", en: "IT room", ur: "آئی ٹی روم", re: /^IT room/ },
  { key: "cctv-room", en: "CCTV room", ur: "سی سی ٹی وی روم", re: /^CCTV/ },
  { key: "ups-room", en: "UPS room", ur: "یو پی ایس روم", re: /^UPS/ },
  { key: "workshop", en: "Workshop", ur: "ورکشاپ", re: /^Workshop/ },
  { key: "generator", en: "Generator room & gen store", ur: "جنریٹر روم", re: /^Generator|^Gen store/ },
  { key: "washrooms", en: "Washrooms", ur: "واش روم", re: /toilet|bath room|^Executive bath|washroom|^Open handwash|^Shower/i },
  { key: "stores", en: "Stores", ur: "اسٹور", re: /store room|^Store$|^Janitorial|^Water pumps/i },
];
const slug = (s) => s.toLowerCase().replace(/\(.*?\)/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
let WAYIDX = null;
function wayIndex() {
  if (WAYIDX) return WAYIDX;
  const rooms = [], seen = {};
  FLOORS.forEach(f => WD.floors[f].rooms.forEach((rm, i) => {
    if (/Compound|Open strip|Open to sky|^\d|passage|corridor/i.test(rm.n) && !/^Main gate/.test(rm.n)) return;
    let s = slug(rm.n); if (seen[s]) s += "-" + f.toLowerCase(); if (seen[s]) s += "-" + (i + 1); seen[s] = 1;
    rooms.push({ f, id: i + 1, n: rm.n, d: rm.d, k: rm.k, x: rm.x, y: rm.y, slug: s, depts: [] });
  }));
  const depts = DEPTS.map(d => ({ ...d, rooms: rooms.filter(r => d.re.test(r.n)) })).filter(d => d.rooms.length);
  depts.forEach(d => d.rooms.forEach(r => r.depts.push(d.key)));
  return WAYIDX = { rooms, depts };
}
const dimOf = (d) => (d || "").split(" · ")[0].replace(/ \(.*$/, "");
function gatePoint() { return { f: "GF", x: 91.04, y: 1.8, name: tr("Main gate", "مین گیٹ") }; }
function hereName(f, x, y) { const id = roomAt(f, x, y); return id ? WD.floors[f].rooms[id - 1].n : tr("where you are", "آپ کی جگہ"); }
// ---------------------------------------------------------------- routing over floors and stairs
function legPath(k, a, b, room) {
  const s = nearestStand(k, a[0], a[1]), t = nearestStand(k, b[0], b[1], room);
  if (s < 0 || t < 0) return null;
  const r = astar(k, s, t), pts = toPoints(k, r.cells);
  if (pts.length === 1) pts.push(pts[0].slice());
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { f: k, pts, cum, len: cum[cum.length - 1], partial: r.partial };
}
function planRoute(start, dest) {
  if (start.f === dest.f) { const L = legPath(start.f, [start.x, start.y], [dest.x, dest.y], dest.id); return L ? { legs: [L], stairs: [], len: L.len } : null; }
  let best = null;
  WD.stairs.forEach(st => {
    if (!st.f.includes(start.f) || !st.f.includes(dest.f)) return;
    const a = legPath(start.f, [start.x, start.y], st.p[start.f]), b = legPath(dest.f, st.p[dest.f], [dest.x, dest.y], dest.id);
    if (!a || !b) return;
    const c = a.len + b.len + (a.partial ? 400 : 0) + (b.partial ? 400 : 0) + Math.abs(FLOORS.indexOf(dest.f) - FLOORS.indexOf(start.f)) * 14;
    if (!best || c < best.c) best = { c, legs: [a, b], stairs: [{ st, from: start.f, to: dest.f }] };
  });
  return best ? { legs: best.legs, stairs: best.stairs, len: best.legs[0].len + best.legs[1].len } : null;
}
// turn-by-turn directions
const ftTxt = (d) => { const v = Math.max(5, Math.round(d / 5) * 5); return tr(`${v} ft`, `${v} فٹ`); };
const compass8 = (h) => { const i = Math.round(((h % 360) + 360) % 360 / 45) % 8; return tr(["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"][i], ["شمال", "شمال مشرق", "مشرق", "جنوب مشرق", "جنوب", "جنوب مغرب", "مغرب", "شمال مغرب"][i]); };
function turnWord(diff) {
  const a = Math.abs(diff), right = diff > 0;
  if (a > 140) return tr("turn around", "پیچھے مڑیں");
  if (a < 55) return right ? tr("bear right", "ہلکا سا دائیں مڑیں") : tr("bear left", "ہلکا سا بائیں مڑیں");
  return right ? tr("turn right", "دائیں مڑیں") : tr("turn left", "بائیں مڑیں");
}
const hdg = (a, b) => Math.atan2(b[0] - a[0], b[1] - a[1]) * 180 / Math.PI;
const ndiff = (d) => ((d + 540) % 360) - 180;
// Douglas-Peucker on the route polyline, so small wiggles around furniture do not become "bear right" steps
function simplifyIdx(P, eps) {
  const keep = new Uint8Array(P.length); keep[0] = keep[P.length - 1] = 1;
  const rec = (a, b) => { let md = 0, mi = -1; const [ax, ay] = P[a], [bx, by] = P[b], dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((P[i][0] - ax) * dy - (P[i][1] - ay) * dx) / l; if (d > md) { md = d; mi = i; } }
    if (md > eps) { keep[mi] = 1; rec(a, mi); rec(mi, b); } };
  if (P.length > 2) rec(0, P.length - 1);
  const out = []; keep.forEach((k, i) => k && out.push(i)); return out;
}
function buildSteps(route, start, destName) {
  const steps = []; let base = 0;
  route.legs.forEach((L, li) => {
    const K = simplifyIdx(L.pts, 3.2), P = K.map(i => L.pts[i]), C = K.map(i => L.cum[i]);
    let head = null, acc = 0;
    for (let i = 0; i < P.length - 1; i++) {
      const len = C[i + 1] - C[i]; if (len < 0.3) continue;
      const h = hdg(P[i], P[i + 1]);
      if (head === null) {
        const txt = li === 0 ? tr(`Start at ${start.name}. Head ${compass8(h)}.`, `${start.name} سے شروع کریں، ${compass8(h)} کی طرف چلیں۔`)
          : tr(`${floorName(L.f)}: leave the stair and head ${compass8(h)}.`, `${floorName(L.f)}: سیڑھی سے نکل کر ${compass8(h)} کی طرف چلیں۔`);
        steps.push({ f: L.f, at: base + C[i], x: P[i][0], y: P[i][1], txt, kind: li ? "floor" : "start" }); head = h; acc = len; continue;
      }
      const d = ndiff(h - head);
      if (Math.abs(d) < 30 || len < 4) { acc += len; if (len >= 4) head = h; continue; }
      steps.push({ f: L.f, at: base + C[i], x: P[i][0], y: P[i][1], txt: tr(`Go straight ${ftTxt(acc)}, then ${turnWord(d)}.`, `سیدھا ${ftTxt(acc)} چلیں، پھر ${turnWord(d)}۔`), kind: d > 0 ? "right" : "left" });
      head = h; acc = len;
    }
    const end = P[P.length - 1];
    if (li < route.legs.length - 1) {
      const s = route.stairs[li], up = FLOORS.indexOf(s.to) > FLOORS.indexOf(s.from);
      steps.push({ f: L.f, at: base + L.len, x: end[0], y: end[1], kind: "stair", stair: s,
        txt: tr(`Go straight ${ftTxt(acc)} to the ${s.st.n}. Take it ${up ? "up" : "down"} to the ${FLOOR_NAME[s.to].toLowerCase()}.`,
                `سیدھا ${ftTxt(acc)} ${stairName(s.st.n)} تک چلیں، پھر ${up ? "اوپر" : "نیچے"} ${floorName(s.to)} پر جائیں۔`) });
    } else {
      const d = WAY.dest, side = d && P.length > 1 ? ndiff(hdg(P[P.length - 2], [d.x, d.y]) - hdg(P[P.length - 2], end)) : 0;
      const where = Math.abs(side) < 30 ? tr("ahead of you", "آپ کے سامنے") : side > 0 ? tr("on your right", "آپ کے دائیں") : tr("on your left", "آپ کے بائیں");
      steps.push({ f: L.f, at: base + L.len, x: end[0], y: end[1], kind: "arrive", txt: tr(`Go straight ${ftTxt(acc)}. ${destName} is ${where}.`, `سیدھا ${ftTxt(acc)} چلیں۔ ${destName} ${where} ہے۔`) });
    }
    base += L.len;
  });
  return steps;
}
// ---------------------------------------------------------------- 3D: glowing chevron ribbon, destination pin, avatar
let WAYTEX = null;
function wayTex() {
  if (WAYTEX) return WAYTEX;
  const c = document.createElement("canvas"); c.width = 64; c.height = 64; const g = c.getContext("2d");
  const grd = g.createLinearGradient(0, 0, 64, 0); grd.addColorStop(0, "rgba(255,255,255,0.35)"); grd.addColorStop(0.5, "rgba(255,255,255,0.75)"); grd.addColorStop(1, "rgba(255,255,255,0.35)");
  g.fillStyle = grd; g.fillRect(4, 0, 56, 64);
  g.fillStyle = "#fff"; g.beginPath(); g.moveTo(32, 8); g.lineTo(56, 34); g.lineTo(46, 34); g.lineTo(32, 20); g.lineTo(18, 34); g.lineTo(8, 34); g.closePath(); g.fill();
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return WAYTEX = t;
}
function ribbonGeo(L, w) {
  const P = [], U = [], hw = w / 2, z = (x, y) => fflAt(L.f, x, y) + 0.28;
  for (let i = 0; i < L.pts.length - 1; i++) {
    const [ax, ay] = L.pts[i], [bx, by] = L.pts[i + 1], len = L.cum[i + 1] - L.cum[i]; if (len < 0.05) continue;
    const nx = -(by - ay) / len * hw, ny = (bx - ax) / len * hw, v0 = L.cum[i] / 2.2, v1 = L.cum[i + 1] / 2.2;
    const a1 = [ax + nx, ay + ny], a2 = [ax - nx, ay - ny], b1 = [bx + nx, by + ny], b2 = [bx - nx, by - ny];
    P.push(a2[0], a2[1], z(ax, ay), b2[0], b2[1], z(bx, by), b1[0], b1[1], z(bx, by), a2[0], a2[1], z(ax, ay), b1[0], b1[1], z(bx, by), a1[0], a1[1], z(ax, ay));
    U.push(1, v0, 1, v1, 0, v1, 1, v0, 0, v1, 0, v0);
    // round the joint with a small fan so turns do not show gaps
    if (i < L.pts.length - 2) { const seg = 6; for (let k = 0; k < seg; k++) { const t0 = k / seg * Math.PI * 2, t1 = (k + 1) / seg * Math.PI * 2;
      P.push(bx, by, z(bx, by) + 0.002, bx + Math.cos(t0) * hw, by + Math.sin(t0) * hw, z(bx, by) + 0.002, bx + Math.cos(t1) * hw, by + Math.sin(t1) * hw, z(bx, by) + 0.002);
      U.push(0.5, v1, 0.5, v1, 0.5, v1); } }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2));
  g.computeBoundingSphere(); return g;
}
function wayClear3D() { WAY.rib.forEach(m => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); }); WAY.rib = []; if (WAY.pin) WAY.pin.visible = false; }
function wayBuild3D() {
  wayClear3D(); if (!WAY.route) return;
  const col = WAY.sos ? 0xff2d2d : 0xff7a1a, tex = wayTex();
  WAY.route.legs.forEach(L => {
    const m = new THREE.Mesh(ribbonGeo(L, 1.25), new THREE.MeshBasicMaterial({ map: tex, color: col, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false, fog: false,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, side: THREE.DoubleSide }));
    m.renderOrder = 6; m.userData.floor = L.f; m.frustumCulled = false; scene.add(m); WAY.rib.push(m);
    // x-ray copy: the part of the route hidden behind walls still shows faintly from above
    const x = new THREE.Mesh(m.geometry, new THREE.MeshBasicMaterial({ map: tex, color: col, transparent: true, opacity: 0.3, depthTest: false, depthWrite: false, toneMapped: false, fog: false, side: THREE.DoubleSide }));
    x.renderOrder = 5; x.userData.floor = L.f; x.userData.xray = true; x.frustumCulled = false; scene.add(x); WAY.rib.push(x);
  });
  if (!WAY.pin) {
    const c = document.createElement("canvas"); c.width = 128; c.height = 180; const g = c.getContext("2d");
    g.fillStyle = "#ff6a2b"; g.beginPath(); g.arc(64, 60, 52, Math.PI, 0); g.lineTo(64, 176); g.closePath(); g.fill();
    g.fillStyle = "#fff"; g.beginPath(); g.arc(64, 60, 22, 0, Math.PI * 2); g.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    WAY.pin = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, toneMapped: false, fog: false }));
    WAY.pin.center.set(0.5, 0); WAY.pin.renderOrder = 1001; scene.add(WAY.pin);
  }
  WAY.pin.material.color.set(WAY.sos ? 0xff3030 : 0xffffff);
  const last = WAY.route.legs[WAY.route.legs.length - 1], e = last.pts[last.pts.length - 1];
  WAY.pin.userData = { f: last.f, x: e[0], y: e[1] };
  WAY.pin.position.set(e[0], e[1], fflAt(last.f, e[0], e[1]) + 3.4);
}
function wayAvatar() {
  if (WAY.avatar) return WAY.avatar;
  const G = new THREE.Group(); G.name = "WayAvatar";
  try {
    const vk = "m_shirt", g0 = personGeo("walk", vk), geo = new THREE.BufferGeometry();
    ["position", "normal", "slot"].forEach(a => geo.setAttribute(a, g0.getAttribute(a)));
    const tints = personTints(vk, 7.3); tints[1] = 0x1e6fd9;          // blue shirt: the visitor
    for (let t = 0; t < 6; t++) { const c = new THREE.Color(tints[t]); geo.setAttribute("iT" + t, new THREE.InstancedBufferAttribute(new Float32Array([c.r, c.g, c.b]), 3)); }
    const im = new THREE.InstancedMesh(geo, kitMat(P_PAL, 6), 1); im.setMatrixAt(0, new THREE.Matrix4()); im.instanceMatrix.needsUpdate = true; im.castShadow = false; G.add(im);
  } catch (e) { const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 3, 4, 10), new THREE.MeshStandardMaterial({ color: 0x1e6fd9 })); b.rotation.x = Math.PI / 2; b.position.z = 2.5; G.add(b); }
  // the ring and the heading arrow draw on top, so you can always see where you are, even behind a wall
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.5, 2.1, 36), new THREE.MeshBasicMaterial({ color: 0x1e6fd9, transparent: true, opacity: 0.85, depthTest: false, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  ring.position.z = 0.3; ring.renderOrder = 1002; G.add(ring); G.userData.ring = ring;
  const arr = new THREE.Shape(); arr.moveTo(0, 3.6); arr.lineTo(1.1, 2.2); arr.lineTo(-1.1, 2.2); arr.closePath();
  const head = new THREE.Mesh(new THREE.ShapeGeometry(arr), new THREE.MeshBasicMaterial({ color: 0x1e6fd9, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  head.position.z = 0.32; head.renderOrder = 1002; G.add(head);
  G.visible = false; scene.add(G); return WAY.avatar = G;
}
// ---------------------------------------------------------------- camera: eye / bird's-eye / plan
function waySetView(v) {
  WAY.view = v; WAY.camInit = false;
  if (v !== "eye" && W8.fly) setFly(false);
  document.querySelectorAll(".wayViewBtn").forEach(b => b.classList.toggle("on", b.dataset.v === v));
  if (v === "eye") { camera.up.set(0, 0, 1); camera.fov = 70; camera.updateProjectionMatrix(); }
  try { localStorage.setItem("d141.view", v); } catch (e) {}
  wayViewBtnLabel(); invalidate(1500);
}
// floors above the walker are hidden in the bird's-eye and plan views (called from cullBegin)
function wayCull(hide) {
  if (!W8.on || WAY.view === "eye" || W8.fly) return;
  const fi = FLOORS.indexOf(W8.floor);
  for (const k in groups) {
    const m = /^(GF|FF|SF)_/.exec(k); let above = false;
    if (m) above = FLOORS.indexOf(m[1]) > fi;
    else if (/^Roof_Level_12-5/.test(k)) above = fi < 1;
    else if (/^Roof_Level_23-10/.test(k)) above = fi < 2;
    else if (/^Roof|^Courtyard_Glazing/.test(k)) above = true;
    if (above) hide(groups[k]);
  }
  FLOORS.forEach((k, i) => { if (i > fi) { if (floorGroups[k]) hide(floorGroups[k]); if (signGroups[k]) hide(signGroups[k]); } });
  if (typeof ARCH !== "undefined" && ARCH.group && ARCH.on) FLOORS.forEach((k, i) => { if (i > fi) { if (ARCH.under3[k]) hide(ARCH.under3[k]); if (ARCH.cols3[k]) hide(ARCH.cols3[k]); } });
}
const _occRC = new THREE.Raycaster(), _occList = {};
function wayOccluded(x, y, z, P) {
  const f = W8.floor, L = _occList[f] || (_occList[f] = [f + "_External_Walls", f + "_Internal_Walls"].concat(f === "GF" ? ["Guard_Post", "Site_Boundary_Wall"] : []).map(k => groups[k]).filter(Boolean));
  const o = new THREE.Vector3(x, y, z + 4.5), d = P.clone().sub(o), len = d.length(); d.normalize();
  _occRC.set(o, d); _occRC.far = len; _occRC.near = 0.5;
  return _occRC.intersectObjects(L, true).length > 0;
}
function wayCamera(dt) {
  const av = wayAvatar(), show = W8.on && WAY.view !== "eye" && !W8.fly;
  av.visible = show;
  if (!show) { if (camera.up.z !== 1) camera.up.set(0, 0, 1); return; }
  const x = W8.x, y = W8.y, z = W8.z, fx = Math.sin(W8.yaw), fy = Math.cos(W8.yaw);
  av.position.set(x, y, z); av.rotation.z = -W8.yaw;
  const r = av.userData.ring; const s = 1 + 0.12 * Math.sin(performance.now() / 260); r.scale.set(s, s, 1);
  let P, T;
  if (WAY.view === "plan") { camera.up.set(0, 1, 0); P = new THREE.Vector3(x + fx * 9, y + fy * 9, z + 78); T = new THREE.Vector3(x + fx * 9, y + fy * 9, z); camera.fov = 48; }
  else {
    // bird's-eye: 30 ft up and 21 ft behind; when a wall would hide the walker from there, the camera tilts to look
    // down more steeply (6 ft behind, 36 ft up) instead of clipping into the wall
    const now = performance.now();
    if (now - (WAY.occT || 0) > 150) { WAY.occT = now; WAY.occ = wayOccluded(x, y, z, new THREE.Vector3(x - fx * 21, y - fy * 21, z + 30)) ? 1 : 0; }
    WAY.tilt = (WAY.tilt || 0) + ((WAY.occ || 0) - (WAY.tilt || 0)) * Math.min(1, dt * 2.5);
    const back = 21 - 15 * WAY.tilt, up = 30 + 6 * WAY.tilt;
    camera.up.set(0, 0, 1); P = new THREE.Vector3(x - fx * back, y - fy * back, z + up); T = new THREE.Vector3(x + fx * 10, y + fy * 10, z + 1); camera.fov = 55; }
  if (!WAY.camInit) { WAY.camPos.copy(P); WAY.camTgt.copy(T); WAY.camInit = true; }
  const k = 1 - Math.exp(-dt * 5); WAY.camPos.lerp(P, k); WAY.camTgt.lerp(T, k);
  camera.position.copy(WAY.camPos); camera.lookAt(WAY.camTgt); camera.updateProjectionMatrix();
}
// ---------------------------------------------------------------- starting a route
function wayResolve(q) {
  const I = wayIndex(); q = (q || "").toLowerCase();
  const d = I.depts.find(d => d.key === q); if (d) return { dept: d };
  const r = I.rooms.find(r => r.slug === q) || I.rooms.find(r => r.slug.startsWith(q)); if (r) return { room: r };
  return null;
}
function wayNearestOf(rooms, start) {
  let best = null;
  rooms.forEach(r => { const d = Math.hypot(r.x - start.x, r.y - start.y) + Math.abs(FLOORS.indexOf(r.f) - FLOORS.indexOf(start.f)) * 60; if (!best || d < best.d) best = { r, d }; });
  return best && best.r;
}
function wayStartPoint() {
  if (WAY.start && WAY.start.kind === "pick") return WAY.start;
  if (W8.on && WAY.start && WAY.start.kind === "here") return { f: W8.floor, x: W8.x, y: W8.y, name: hereName(W8.floor, W8.x, W8.y), kind: "here" };
  if (W8.on && !(WAY.start && WAY.start.kind === "gate")) return { f: W8.floor, x: W8.x, y: W8.y, name: hereName(W8.floor, W8.x, W8.y), kind: "here" };
  return { ...gatePoint(), kind: "gate" };
}
function wayGo(target, opts = {}) {
  // target: {f, id, n, x, y} (a room) or {dept}
  const start = opts.start || wayStartPoint();
  let room = target.room || target;
  if (target.dept) room = wayNearestOf(target.dept.rooms, start);
  if (!room) return false;
  WAY.sos = !!opts.sos;
  WAY.dest = { f: room.f, id: room.id, x: room.x, y: room.y, n: room.n, d: room.d };
  const route = planRoute(start, WAY.dest);
  if (!route) { perfToast(tr("No route found.", "راستہ نہیں ملا۔"), 2500); return false; }
  WAY.route = route; WAY.startPt = start; WAY.arrived = false; WAY.cur = 0; WAY.progress = 0;
  WAY.steps = buildSteps(route, start, WAY.sos ? tr("The exit", "ایگزٹ") : room.n);
  // into the walk at the start of the route, looking along it
  const L0 = route.legs[0], a = L0.pts[0], b = L0.pts[Math.min(1, L0.pts.length - 1)];
  const yaw = Math.atan2(b[0] - a[0], b[1] - a[1]) || 0;
  const place = () => { placeAt(L0.f, a[0], a[1], yaw, -0.05); WAY.camInit = false; };
  if (!W8.on) enterWalk({ f: L0.f, x: a[0], y: a[1], yaw, pitch: -0.05 });
  else if (start.kind !== "here") fadeTo(place);
  if (W8.tour >= 0) endTour();
  NAV.target = null; document.getElementById("routeBar").classList.remove("show");
  if (!opts.keepView) waySetView(opts.view || (() => { try { return localStorage.getItem("d141.view") || "bird"; } catch (e) { return "bird"; } })());
  wayBuild3D(); wayBarShow(); WAY.auto = null;
  if (opts.auto) setTimeout(() => wayAutoStart(), 900);
  invalidate(3000);
  return true;
}
function wayEnd() {
  WAY.route = null; WAY.steps = null; WAY.dest = null; WAY.auto = null; WAY.sos = false; wayClear3D(); NAV.path = null;
  document.getElementById("wayBar").classList.remove("show"); document.getElementById("waySteps").hidden = true; document.getElementById("wayArrive").hidden = true;
  document.body.classList.remove("wayOn", "waySos"); invalidate(800);
}
// ---------------------------------------------------------------- auto walk
function wayAutoStart() { if (!WAY.route) return; const g = wayLegAt(WAY.progress); WAY.auto = { leg: g.leg, s: g.s, paused: false, fade: 0 }; wayBarUpdate(true); }
function wayLegAt(s) { const L = WAY.route.legs; let base = 0; for (let i = 0; i < L.length; i++) { if (s <= base + L[i].len || i === L.length - 1) return { leg: i, s: Math.max(0, s - base) }; base += L[i].len; } return { leg: 0, s: 0 }; }
function wayPointAt(L, s) {
  s = Math.max(0, Math.min(L.len, s)); let i = 1; while (i < L.cum.length - 1 && L.cum[i] < s) i++;
  const a = L.pts[i - 1], b = L.pts[i], seg = (L.cum[i] - L.cum[i - 1]) || 1, t = (s - L.cum[i - 1]) / seg;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[0] - a[0], b[1] - a[1])];
}
function wayAutoStep(dt) {
  const A = WAY.auto; if (!A || A.paused || !W8.on) return;
  if (A.fade > 0) { A.fade -= dt; return; }
  // the walker takes over: any movement input pauses the auto walk
  const K = W8.keys; if (K.KeyW || K.KeyS || K.KeyA || K.KeyD || K.ArrowUp || K.ArrowDown || Math.hypot(W8.joy.x, W8.joy.y) > 0.2) { A.paused = true; wayBarUpdate(true); return; }
  const L = WAY.route.legs[A.leg];
  if (W8.floor !== L.f) { A.paused = true; wayBarUpdate(true); return; }
  A.s += dt * 4.8 * WAY.speed;
  if (A.s >= L.len) {
    if (A.leg < WAY.route.legs.length - 1) {
      const N = WAY.route.legs[A.leg + 1], p = N.pts[0], q = N.pts[Math.min(1, N.pts.length - 1)];
      A.leg++; A.s = 0; A.fade = 0.9;
      fadeTo(() => { placeAt(N.f, p[0], p[1], Math.atan2(q[0] - p[0], q[1] - p[1]) || W8.yaw, -0.05); WAY.camInit = false; });
      return;
    }
    A.s = L.len; WAY.auto = null; wayArrive(); return;
  }
  const [x, y, h] = wayPointAt(L, A.s + 0.01);
  W8.x = x; W8.y = y;
  W8.yaw += ndiff((h - W8.yaw) * 180 / Math.PI) * Math.PI / 180 * Math.min(1, dt * 6);
}
// ---------------------------------------------------------------- progress, bar, arrival
function wayProgress() {
  const R = WAY.route; if (!R || !W8.on) return;
  let best = null, base = 0;
  R.legs.forEach((L, li) => {
    if (L.f === W8.floor) for (let i = 0; i < L.pts.length - 1; i++) {
      const [ax, ay] = L.pts[i], [bx, by] = L.pts[i + 1], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((W8.x - ax) * dx + (W8.y - ay) * dy) / l2)), px = ax + dx * t, py = ay + dy * t;
      const d = Math.hypot(W8.x - px, W8.y - py), s = base + L.cum[i] + t * Math.sqrt(l2);
      if (!best || d < best.d - 0.01 || (Math.abs(d - best.d) < 0.01 && s > best.s)) best = { d, s, leg: li };
    }
    base += L.len;
  });
  if (!best) return;
  WAY.progress = WAY.auto ? (R.legs.slice(0, WAY.auto.leg).reduce((a, L) => a + L.len, 0) + WAY.auto.s) : best.s;
  WAY.off = best.d;
  let cur = WAY.steps.findIndex(s => s.at > WAY.progress + 1.5); if (cur < 0) cur = WAY.steps.length - 1;
  WAY.cur = cur;
  const left = R.len - WAY.progress;
  const inRoom = WAY.dest && W8.floor === WAY.dest.f && roomAt(W8.floor, W8.x, W8.y) === WAY.dest.id;
  if (!WAY.arrived && (left < 3.5 || inRoom) && W8.floor === R.legs[R.legs.length - 1].f) wayArrive();
}
function wayArrive() {
  if (WAY.arrived) return; WAY.arrived = true; WAY.auto = null;
  const d = WAY.dest, box = document.getElementById("wayArrive");
  box.innerHTML = `<div><b>${WAY.sos ? tr("You are at the exit", "آپ ایگزٹ پر ہیں") : "✓ " + tr("You have arrived", "آپ پہنچ گئے")}</b>
    <span>${d ? d.n : ""}</span><i>${d ? [floorName(d.f), dimOf(d.d)].filter(Boolean).join(" · ") : ""}</i></div><button id="wayArriveOk" class="primary">${tr("Done", "ٹھیک ہے")}</button>`;
  box.hidden = false; document.getElementById("wayArriveOk").onclick = () => { wayEnd(); };
  wayBarUpdate(true);
}
function wayBarShow() {
  const b = document.getElementById("wayBar"); b.classList.add("show"); document.body.classList.add("wayOn"); document.body.classList.toggle("waySos", WAY.sos);
  document.getElementById("wayArrive").hidden = true; wayStepsList(); wayBarUpdate(true);
}
// the directions list sits just below the route bar (or above it when the bar is at the bottom)
function wayStepsPlace() {
  const St = document.getElementById("waySteps"), B = document.getElementById("wayBar"); if (St.hidden) return;
  St.style.top = St.style.bottom = St.style.maxHeight = "";
  const r = B.getBoundingClientRect(), sr = St.getBoundingClientRect(), H = innerHeight;
  if (sr.left >= r.right - 1 || sr.right <= r.left + 1) return;             // side by side (phone in landscape)
  if (r.top > H / 2) { St.style.top = "auto"; St.style.bottom = (H - r.top + 8) + "px"; St.style.maxHeight = Math.max(160, r.top - 90) + "px"; }
  else { St.style.bottom = "auto"; St.style.top = (r.bottom + 8) + "px"; St.style.maxHeight = Math.max(160, H - r.bottom - 30) + "px"; }
}
function wayStepsList() {
  const el = document.getElementById("waySteps"); if (!WAY.steps) return;
  el.innerHTML = `<b>${WAY.sos ? tr("Way out", "باہر کا راستہ") : tr("Directions", "راستہ")} · ${WAY.startPt ? WAY.startPt.name : ""} → ${WAY.dest ? WAY.dest.n : ""}</b>` +
    WAY.steps.map((s, i) => `<button data-i="${i}" class="${i === WAY.cur ? "cur" : ""}"><em>${{ start: "●", left: "↰", right: "↱", stair: "⇅", floor: "↥", arrive: "⚑" }[s.kind] || "•"}</em><span>${s.txt}</span></button>`).join("");
  el.querySelectorAll("button").forEach(b => b.onclick = () => { const s = WAY.steps[+b.dataset.i]; if (s.f !== W8.floor) return; W8.x = s.x; W8.y = s.y; if (WAY.auto) { const g = wayLegAt(s.at); WAY.auto.leg = g.leg; WAY.auto.s = g.s; } invalidate(800); });
}
let _wbLast = 0, _wbKey = "";
function wayBarUpdate(force) {
  if (!WAY.route) return;
  const now = performance.now(); if (!force && now - _wbLast < 250) return; _wbLast = now;
  const s = WAY.steps[WAY.cur] || WAY.steps[WAY.steps.length - 1], left = Math.max(0, WAY.route.len - WAY.progress), toNext = Math.max(0, s.at - WAY.progress);
  const fl = WAY.route.stairs.length ? WAY.route.stairs.map(x => `${stairName(x.st.n)} → ${floorName(x.to)}`).join(", ") : floorName(WAY.route.legs[0].f);
  const auto = WAY.auto && !WAY.auto.paused;
  const key = [WAY.cur, Math.round(left / 5), Math.round(toNext / 5), auto, WAY.speed, WAY.view, WAY.arrived, L10N.ur, WAY.off > 12].join("|");
  if (key === _wbKey && !force) return; _wbKey = key;
  document.getElementById("wayIcon").textContent = WAY.arrived ? "✓" : { start: "●", left: "↰", right: "↱", stair: "⇅", floor: "↥", arrive: "⚑" }[s.kind] || "➜";
  document.getElementById("wayText").innerHTML = WAY.arrived ? tr("Arrived", "پہنچ گئے") : (WAY.off > 12 ? tr("Walk back to the line to follow the route.", "راستے کی لکیر پر واپس آئیں۔") + " " : "") + s.txt;
  document.getElementById("wayMeta").textContent = WAY.arrived ? "" : `${tr("To the next step", "اگلے قدم تک")} ${ftTxt(toNext)} · ${tr("left", "باقی")} ${ftTxt(left)} · ${fl}`;
  const play = document.getElementById("wayPlay"); play.textContent = auto ? "❚❚" : "▶"; play.setAttribute("aria-label", auto ? tr("Pause", "روکیں") : tr("Take me there", "وہاں لے چلو"));
  document.getElementById("waySpeed").textContent = `${WAY.speed}×`;
  const el = document.getElementById("waySteps"); if (!el.hidden) { el.querySelectorAll("button").forEach((b, i) => b.classList.toggle("cur", i === WAY.cur)); wayStepsPlace(); }
}
// called every frame from animate()
function wayFrame(dt, t) {
  if (!WAY.route && !(W8.on && WAY.view !== "eye")) { if (WAY.avatar) WAY.avatar.visible = false; return; }
  if (WAY.route) {
    wayAutoStep(dt); wayProgress();
    WAYTEX && (WAYTEX.offset.y -= dt * 1.4);
    WAY.rib.forEach(m => m.visible = (!W8.on || m.userData.floor === W8.floor) && !(m.userData.xray && (WAY.view === "eye" || W8.fly)));
    if (WAY.pin) WAY.pin.visible = !WAY.arrived && (!W8.on || WAY.pin.userData.f === W8.floor), WAY.pin.scale.set(2.6, 3.7, 1);
    const L = WAY.route.legs.find(L => L.f === W8.floor); NAV.path = L ? L.pts : null; NAV.pathFloor = W8.floor;
    wayBarUpdate(false); invalidate(120);
  }
  if (W8.on) wayCamera(dt);
}
// ---------------------------------------------------------------- emergency: nearest exit
function wayExits() {
  const out = [];
  FLOORS.forEach(f => (WD.floors[f].notes || []).forEach(n => { if (n.t === "exit") out.push({ f, x: n.x, y: n.y, n: `${n.n} (${floorName(f)})`, id: 0 }); }));
  FLOORS.forEach(f => WD.floors[f].rooms.forEach((r, i) => { if (/^Fire exit/.test(r.n)) out.push({ f, x: r.x, y: r.y, n: `${r.n} (${floorName(f)})`, id: i + 1 }); }));
  out.push({ f: "GF", x: 91.04, y: 2.2, n: tr("Main gate", "مین گیٹ"), id: 0 });
  return out;
}
function wayEmergency(start) {
  start = start || (W8.on ? { f: W8.floor, x: W8.x, y: W8.y, name: hereName(W8.floor, W8.x, W8.y), kind: "here" } : null);
  if (!start) { perfToast(tr("Tap where you are on the map.", "نقشے پر اپنی جگہ پر ٹیپ کریں۔"), 3500); wayPickOnMap((p) => wayEmergency(p), true); return; }
  let best = null;
  wayExits().filter(e => e.f === start.f || e.f === "GF").forEach(e => { const r = planRoute(start, { ...e, id: e.id || undefined }); if (!r) return; const partial = r.legs.some(L => L.partial);
    const c = r.len + (partial ? 1000 : 0); if (!best || c < best.c) best = { c, e }; });
  if (!best) { perfToast(tr("No way out found.", "باہر کا راستہ نہیں ملا۔"), 3000); return; }
  wayGo({ f: best.e.f, id: best.e.id, x: best.e.x, y: best.e.y, n: best.e.n, d: "" }, { start, sos: true, view: "bird" });
  perfToast("🚨 " + tr(`Nearest way out: ${best.e.n}`, `قریب ترین راستہ: ${best.e.n}`), 4000);
}
// ---------------------------------------------------------------- pick a start point on the building map
function wayPickOnMap(cb, sos) {
  openMap(W8.on ? W8.floor : "GF"); DM.pickCb = (f, x, y) => { DM.pickCb = null; closeMap(); cb({ f, x, y, name: hereName(f, x, y), kind: "pick" }); };
  document.getElementById("dirMap").classList.add("picking"); document.getElementById("dmPickNote").textContent = sos ? tr("Tap where you are now", "جہاں آپ ہیں وہاں ٹیپ کریں") : tr("Tap your starting point", "شروع کی جگہ پر ٹیپ کریں");
}
// ---------------------------------------------------------------- deep links: ?to=board-room&from=gate&view=bird&go=1
function applyDeepLink() {
  const q = new URLSearchParams(location.search);
  if (typeof extrasApplyState === "function") extrasApplyState(q);
  // ?sos=1&from=<room or department>: the way out from there (the QR posted in that room); without from, tap where you are
  if (q.get("sos") === "1") { const s = q.get("from") && wayResolve(q.get("from").toLowerCase());
    if (s && (s.room || s.dept)) { const r = s.room || s.dept.rooms[0]; wayEmergency({ f: r.f, x: r.x, y: r.y, name: r.n, kind: "pick" }); }
    else wayEmergency(); return; }
  const to = q.get("to"); if (!to) return;
  const hit = wayResolve(to); if (!hit) { perfToast(tr(`No room called “${to}”.`, `“${to}” نام کا کمرہ نہیں ملا۔`), 3500); return; }
  const from = (q.get("from") || "gate").toLowerCase();
  let start = { ...gatePoint(), kind: "gate" };
  if (from !== "gate") { const s = wayResolve(from); if (s && (s.room || s.dept)) { const r = s.room || s.dept.rooms[0]; start = { f: r.f, x: r.x, y: r.y, name: r.n, kind: "pick" }; } }
  const view = ["eye", "bird", "plan"].includes(q.get("view")) ? q.get("view") : "bird";
  wayGo(hit.dept ? { dept: hit.dept } : hit.room, { start, view, auto: q.get("go") === "1" });
}
// ---------------------------------------------------------------- UI
function wayBuildUI() {
  const css = document.createElement("style");
  css.textContent = `
#whereBtn,#sosBtn{pointer-events:auto;border-radius:10px;padding:11px 14px;font:inherit;font-size:14px;font-weight:650;cursor:pointer;margin-right:8px}
#whereBtn{background:#1e6fd9;color:#fff;border:0;box-shadow:0 4px 14px rgba(30,111,217,.3)}
#sosBtn{background:#fff;color:#c62828;border:1.5px solid #e53935}
#wayPanel{position:fixed;inset:0;z-index:25;background:rgba(15,20,25,.35);display:flex;align-items:flex-start;justify-content:center;padding:calc(56px + env(safe-area-inset-top,0px)) 12px 12px}
#wayPanel[hidden]{display:none}
#wayPanel .wp{width:min(560px,100%);max-height:calc(100dvh - 80px);display:flex;flex-direction:column;background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:16px;box-shadow:0 18px 50px rgba(0,0,0,.28);backdrop-filter:blur(14px);overflow:hidden}
.wp-head{display:flex;align-items:center;gap:8px;padding:14px 14px 8px}
.wp-head h2{margin:0;font-size:18px;flex:1;text-transform:none;letter-spacing:0;color:var(--ink)}
.wp-head button{font-size:20px;border:0;background:transparent;color:var(--ink);cursor:pointer;min-width:44px;min-height:44px}
#wpSearch{margin:0 14px;font:inherit;font-size:16px;padding:12px 14px;border-radius:11px;border:1px solid var(--line);background:#fff;color:#1b1f23;min-height:46px}
#wpFrom{display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:10px 14px 4px;font-size:14px;color:var(--muted)}
#wpFrom button{font:inherit;font-size:14px;padding:8px 12px;min-height:44px;border-radius:999px;border:1px solid var(--line);background:transparent;color:var(--ink);cursor:pointer}
#wpFrom button.on{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
#wpList{overflow-y:auto;padding:6px 8px 14px;overscroll-behavior:contain}
#wpList h3{font-size:14px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:10px 8px 4px}
#wpList button{display:flex;flex-wrap:wrap;gap:2px 10px;align-items:center;width:100%;text-align:left;font:inherit;font-size:15px;padding:10px 10px;min-height:48px;border:0;border-radius:10px;background:transparent;color:var(--ink);cursor:pointer}
#wpList button:hover,#wpList button:focus-visible{background:rgba(47,93,124,.1)}
#wpList .nm{flex:1 1 auto;min-width:52%}
#wpList .fl{margin-left:auto;font-size:14px;color:var(--muted)}
#wpList .ur{font-size:15px;color:var(--muted)}
#wpDest{padding:10px 14px 14px;border-top:1px solid var(--line)}
#wpDest[hidden]{display:none}
#wpDest b{display:block;font-size:17px} #wpDest span{display:block;font-size:14px;color:var(--muted);margin:2px 0 10px}
#wpDest .row2{display:flex;gap:8px;flex-wrap:wrap}
#wpDest .row2 button{flex:1;min-width:140px;font:inherit;font-size:15px;font-weight:650;padding:12px;min-height:48px;border-radius:11px;cursor:pointer;border:1px solid var(--line);background:#fff;color:#1b1f23}
#wpDest .row2 button.primary{background:#1e6fd9;color:#fff;border-color:#1e6fd9}
#wpDest .views{display:flex;gap:6px;margin-top:10px;font-size:14px;align-items:center;color:var(--muted);flex-wrap:wrap}
.wayViewBtn{font:inherit;font-size:14px;padding:8px 11px;min-height:44px;border-radius:9px;border:1px solid var(--line);background:transparent;color:var(--ink);cursor:pointer}
.wayViewBtn.on{background:#1e6fd9;color:#fff;border-color:#1e6fd9}
#wayBar{position:fixed;left:50%;top:calc(66px + env(safe-area-inset-top,0px));transform:translate(-50%,-8px);z-index:8;width:min(640px,calc(100vw - 24px));
  background:#fff;color:#1b1f23;border:2px solid #ff7a1a;border-radius:14px;box-shadow:0 8px 26px rgba(0,0,0,.22);opacity:0;pointer-events:none;transition:.25s}
body.waySos #wayBar{border-color:#e53935}
#wayBar.show{opacity:1;pointer-events:auto;transform:translate(-50%,0)}
#wayBar .wb1{display:flex;gap:10px;align-items:center;padding:10px 12px 4px}
#wayIcon{flex:none;width:38px;height:38px;border-radius:50%;background:#ff7a1a;color:#fff;display:grid;place-items:center;font-size:20px;font-weight:700}
body.waySos #wayIcon{background:#e53935}
#wayText{font-size:15.5px;font-weight:600;line-height:1.35}
#wayMeta{font-size:14px;color:#5b6670;padding:0 12px 6px 60px}
#wayViewCycle{display:none}
#wayBar .wb2{display:flex;gap:6px;padding:4px 10px 10px;flex-wrap:wrap}
#wayBar .wb2 button{font:inherit;font-size:14px;min-height:44px;min-width:44px;padding:8px 11px;border-radius:9px;border:1px solid rgba(27,31,35,.18);background:#fff;color:#1b1f23;cursor:pointer}
#wayBar .wb2 button.primary{background:#1e6fd9;color:#fff;border-color:#1e6fd9}
#wayBar .wb2 .sp{flex:1}
#waySteps{position:fixed;left:50%;transform:translateX(-50%);top:calc(196px + env(safe-area-inset-top,0px));z-index:8;width:min(640px,calc(100vw - 24px));max-height:40dvh;overflow:auto;
  background:#fff;color:#1b1f23;border-radius:12px;box-shadow:0 8px 26px rgba(0,0,0,.2);padding:8px}
#waySteps[hidden]{display:none}
#waySteps>b{display:block;font-size:14px;color:#5b6670;padding:4px 6px 6px}
#waySteps button{display:flex;gap:10px;width:100%;text-align:left;font:inherit;font-size:14.5px;padding:9px 8px;min-height:44px;border:0;border-radius:8px;background:transparent;color:#1b1f23;cursor:pointer}
#waySteps button.cur{background:#fff1e6;font-weight:600} body.waySos #waySteps button.cur{background:#fdecea}
#waySteps em{font-style:normal;flex:none;width:22px;text-align:center;color:#ff7a1a}
#wayArrive{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:9;display:flex;gap:12px;align-items:center;
  background:#fff;color:#1b1f23;border:2px solid #1e6fd9;border-radius:14px;padding:12px 12px 12px 16px;box-shadow:0 10px 30px rgba(0,0,0,.25);max-width:calc(100vw - 24px)}
#wayArrive[hidden]{display:none}
#wayArrive div{display:flex;flex-direction:column} #wayArrive b{font-size:16px} #wayArrive span{font-size:15px} #wayArrive i{font-style:normal;font-size:13.5px;color:#5b6670}
#wayArrive button{font:inherit;font-size:15px;font-weight:650;min-height:46px;padding:10px 16px;border-radius:10px;border:0;background:#1e6fd9;color:#fff;cursor:pointer}
body.wayOn #routeBar{display:none!important}
@media (min-width:821px) and (pointer:fine), (min-width:821px) and (min-height:501px){
  #wayBar{top:auto;bottom:calc(16px + env(safe-area-inset-bottom,0px));transform:translate(-50%,8px);width:min(600px,calc(100vw - 600px))}
  #waySteps{top:auto;bottom:calc(190px + env(safe-area-inset-bottom,0px));width:min(600px,calc(100vw - 600px))}
  #wayArrive{bottom:calc(200px + env(safe-area-inset-bottom,0px))}
  body.wayOn #stairPrompt{bottom:calc(196px + env(safe-area-inset-bottom,0px))}
  body.wayOn #roomCard{display:none}
  body.wayOn #mapBox{bottom:calc(16px + env(safe-area-inset-bottom,0px))}
}
@media (min-width:821px) and (max-width:1100px){ #wayBar,#waySteps{width:min(560px,calc(100vw - 330px));left:auto;right:16px;transform:none!important} }
@media (min-width:821px) and (max-width:1500px){ #roomCard{top:calc(64px + env(safe-area-inset-top,0px))} #walkHint{top:calc(134px + env(safe-area-inset-top,0px))} #walkLeft .wlbl{display:none} }
@media (min-width:1501px){ #roomCard{max-width:min(560px,calc(100vw - 1000px))} }
@media (max-width:820px),(max-height:500px) and (pointer:coarse){ #walkView{display:none!important} #walkLeft{justify-content:flex-start;flex-wrap:nowrap} }
body.wayOn #walkHint{display:none!important}
#dirMap.picking .dm-body{outline:3px solid #1e6fd9;outline-offset:-3px}
#dmPickNote{display:none;position:absolute;left:50%;top:12px;transform:translateX(-50%);z-index:3;background:#1e6fd9;color:#fff;font-size:15px;font-weight:600;padding:10px 16px;border-radius:999px;box-shadow:0 6px 18px rgba(0,0,0,.2)}
#dirMap.picking #dmPickNote{display:block}
@media (max-width:820px),(max-height:500px) and (pointer:coarse){
  #whereBtn .lbl,#sosBtn .lbl{display:none}
  #wayBar{top:calc(60px + env(safe-area-inset-top,0px))}
  #wayBar .wayViewBtn{display:none} #wayViewCycle{display:inline-block}
  #wayBar .wb1{padding:8px 10px 2px} #wayIcon{width:34px;height:34px;font-size:18px} #wayText{font-size:15px}
  #wayMeta{padding:0 10px 4px 54px} #wayBar .wb2{padding:2px 8px 8px;flex-wrap:nowrap}
  #waySteps{top:calc(190px + env(safe-area-inset-top,0px))}
  body.wayOn #roomCard{display:none}
  #wayArrive{bottom:calc(170px + env(safe-area-inset-bottom,0px))}
}
@media (max-width:380px){ #mapBtn{display:none!important} }
@media (max-height:500px) and (pointer:coarse) and (orientation:landscape){
  #wayBar{left:calc(8px + env(safe-area-inset-left,0px));right:auto;transform:none;width:min(360px,50vw);top:calc(58px + env(safe-area-inset-top,0px))}
  #wayBar.show{transform:none}
  #wayMeta{padding-left:12px}
  #waySteps{left:auto;right:calc(8px + env(safe-area-inset-right,0px));transform:none;width:min(360px,44vw);top:calc(58px + env(safe-area-inset-top,0px));max-height:calc(100dvh - 190px)}
  #wayText{font-size:14.5px} #wayMeta{display:none}
}`;
  document.head.appendChild(css);
  // header buttons
  const hud = document.getElementById("hud"), mapBtn = document.getElementById("mapBtn");
  const wb = document.createElement("button"); wb.id = "whereBtn"; wb.innerHTML = `<span aria-hidden="true">🔍</span><span class="lbl"> ${tr("Where to?", "کہاں جانا ہے؟")}</span>`; wb.setAttribute("aria-label", "Where to? Find a department or room");
  const sb = document.createElement("button"); sb.id = "sosBtn"; sb.innerHTML = `<span aria-hidden="true">🚨</span><span class="lbl"> ${tr("Emergency exit", "ایمرجنسی")}</span>`; sb.setAttribute("aria-label", "Emergency: route to the nearest exit");
  hud.insertBefore(wb, mapBtn); hud.insertBefore(sb, mapBtn);
  wb.onclick = () => wayOpen(); sb.onclick = () => wayEmergency();
  // walk bar buttons
  const wt = document.querySelector("#walkTop .wgroup");
  if (wt) { const a = document.createElement("button"); a.className = "wbtn"; a.id = "walkWhere"; a.innerHTML = `🔍<span class="wlbl"> ${tr("Where to?", "کہاں جانا ہے؟")}</span>`; a.setAttribute("aria-label", "Where to?"); a.onclick = () => wayOpen();
    const s = document.createElement("button"); s.className = "wbtn"; s.id = "walkSos"; s.innerHTML = `🚨<span class="wlbl"> ${tr("Exit", "ایگزٹ")}</span>`; s.setAttribute("aria-label", "Emergency exit route"); s.onclick = () => wayEmergency();
    const v = document.createElement("button"); v.className = "wbtn"; v.id = "walkView"; v.setAttribute("aria-label", "Change the view: eye, bird's-eye, plan");
    v.onclick = () => waySetView({ eye: "bird", bird: "plan", plan: "eye" }[WAY.view]);
    const top = document.getElementById("walkTop"), ex = document.getElementById("walkExit"), lg = document.createElement("div"); lg.className = "wgroup"; lg.id = "walkLeft";
    top.insertBefore(lg, top.firstChild); lg.append(ex, a, s, v); }
  // the panel
  const P = document.createElement("div"); P.id = "wayPanel"; P.hidden = true; P.setAttribute("role", "dialog"); P.setAttribute("aria-modal", "true"); P.setAttribute("aria-labelledby", "wpTitle");
  P.innerHTML = `<div class="wp"><div class="wp-head"><h2 id="wpTitle"></h2><button id="wpClose" aria-label="Close">✕</button></div>
    <input id="wpSearch" type="search" autocomplete="off" aria-label="Search">
    <div id="wpFrom"></div><div id="wpList" role="listbox"></div><div id="wpDest" hidden></div></div>`;
  document.body.appendChild(P);
  P.addEventListener("click", (e) => { if (e.target === P) wayClose(); });
  document.getElementById("wpClose").onclick = wayClose;
  document.getElementById("wpSearch").addEventListener("input", wayList);
  // the route bar
  const B = document.createElement("div"); B.id = "wayBar"; B.setAttribute("role", "status"); B.setAttribute("aria-live", "polite");
  B.innerHTML = `<div class="wb1"><span id="wayIcon">➜</span><span id="wayText"></span></div><div id="wayMeta"></div>
    <div class="wb2"><button id="wayPlay" class="primary">▶</button><button id="waySpeed" aria-label="Walking speed">1×</button>
    <button id="wayViewCycle" aria-label="Change the view"></button><button class="wayViewBtn" data-v="eye" aria-label="Eye level">👁</button><button class="wayViewBtn" data-v="bird" aria-label="Bird's-eye">🦅</button><button class="wayViewBtn" data-v="plan" aria-label="Plan from above">⊞</button>
    <span class="sp"></span><button id="wayList" aria-label="All directions">≡</button><button id="wayEnd" aria-label="End the route">✕</button></div>`;
  document.body.appendChild(B);
  const St = document.createElement("div"); St.id = "waySteps"; St.hidden = true; document.body.appendChild(St);
  const Ar = document.createElement("div"); Ar.id = "wayArrive"; Ar.hidden = true; Ar.setAttribute("role", "dialog"); document.body.appendChild(Ar);
  document.getElementById("wayPlay").onclick = () => { if (!WAY.route) return; if (WAY.arrived) return; if (!WAY.auto) wayAutoStart(); else { WAY.auto.paused = !WAY.auto.paused; if (!WAY.auto.paused) { const g = wayLegAt(WAY.progress); WAY.auto.leg = g.leg; WAY.auto.s = g.s; } } wayBarUpdate(true); };
  document.getElementById("waySpeed").onclick = () => { WAY.speed = { 1: 1.5, 1.5: 2, 2: 3, 3: 0.5, 0.5: 1 }[WAY.speed] || 1; wayBarUpdate(true); };
  document.getElementById("wayList").onclick = () => { St.hidden = !St.hidden; wayStepsList(); wayStepsPlace(); };
  document.getElementById("wayEnd").onclick = wayEnd;
  addEventListener("resize", () => setTimeout(wayStepsPlace, 60));
  B.querySelectorAll(".wayViewBtn").forEach(b => b.onclick = () => waySetView(b.dataset.v));
  document.getElementById("wayViewCycle").onclick = () => waySetView({ eye: "bird", bird: "plan", plan: "eye" }[WAY.view]);
  // map: pick mode note, and the room card buttons use the new routes
  const mb = document.querySelector("#dirMap .dm-body"); if (mb) { const n = document.createElement("div"); n.id = "dmPickNote"; mb.appendChild(n); }
  document.getElementById("dmRoute").onclick = () => { const s = DM.sel; if (!s || !s.id) return; closeMap(); const r = WD.floors[s.f].rooms[s.id - 1]; wayGo({ f: s.f, id: s.id, n: r.n, x: r.x, y: r.y, d: r.d }); };
  document.getElementById("dmWalk").onclick = () => { const s = DM.sel; if (!s || !s.id) return; closeMap(); const r = WD.floors[s.f].rooms[s.id - 1]; wayGo({ f: s.f, id: s.id, n: r.n, x: r.x, y: r.y, d: r.d }, { auto: true }); };
  // minimap: tap opens the building map
  const mm = document.getElementById("minimap"); if (mm) { const nm = mm.cloneNode(true); mm.parentNode.replaceChild(nm, mm); nm.addEventListener("click", () => openMap(W8.floor)); nm.setAttribute("aria-label", "Floor map. Tap to open the building map."); }
  menuAdd({ id: "mWhere", icon: "🔍", label: () => tr("Where to? Find a room", "کہاں جانا ہے؟"), group: "way", run: () => wayOpen() });
  menuAdd({ id: "mSos", icon: "🚨", label: () => tr("Emergency: nearest exit", "ایمرجنسی: قریب ترین راستہ"), group: "way", run: () => wayEmergency() });
  menuAdd({ id: "mMap", icon: "🗺", label: () => tr("Building map", "عمارت کا نقشہ"), group: "way", phoneOnly: true, hidden: () => W8.on, run: () => openMap() });
  menuAdd({ id: "mView", icon: "🦅", label: () => tr("View: ", "منظر: ") + { eye: tr("eye level", "آنکھ سے"), bird: tr("bird's-eye", "اوپر سے"), plan: tr("plan", "نقشہ") }[WAY.view] + " → " + { eye: tr("bird's-eye", "اوپر سے"), bird: tr("plan", "نقشہ"), plan: tr("eye level", "آنکھ سے") }[WAY.view],
    group: "walk", phoneOnly: true, hidden: () => !W8.on, run: () => waySetView({ eye: "bird", bird: "plan", plan: "eye" }[WAY.view]) });
  menuAdd({ id: "mQR", icon: "▦", label: () => tr("QR codes for every department", "ہر شعبے کا کیو آر کوڈ"), group: "share", run: () => wayQRSheet() });
  wayViewBtnLabel();
}
function wayViewBtnLabel() { const c = document.getElementById("wayViewCycle"); if (c) c.textContent = { eye: "👁", bird: "🦅", plan: "⊞" }[WAY.view];
  const v = document.getElementById("walkView"); if (v) v.innerHTML = { eye: "👁", bird: "🦅", plan: "⊞" }[WAY.view] + `<span class="wlbl"> ${{ eye: tr("Eye level", "آنکھ سے"), bird: tr("Bird's-eye", "اوپر سے"), plan: tr("Plan", "نقشہ") }[WAY.view]}</span>`; }
function wayOpen() {
  const P = document.getElementById("wayPanel"); P.hidden = false;
  document.getElementById("wpTitle").textContent = tr("Where do you want to go?", "آپ کہاں جانا چاہتے ہیں؟");
  const s = document.getElementById("wpSearch"); s.placeholder = tr("Department, room or size… e.g. CCTV, board room, 13'-0\"", "شعبہ، کمرہ یا سائز تلاش کریں…"); s.value = "";
  if (!WAY.start) WAY.start = W8.on ? { kind: "here" } : { kind: "gate" };
  wayFromUI(); wayList(); document.getElementById("wpDest").hidden = true;
  setTimeout(() => { if (!matchMedia("(pointer: coarse)").matches) s.focus(); }, 50);
}
function wayClose() { document.getElementById("wayPanel").hidden = true; }
function wayFromUI() {
  const el = document.getElementById("wpFrom"), st = WAY.start || { kind: "gate" };
  el.innerHTML = `<span>${tr("From", "کہاں سے")}:</span><button data-k="gate" class="${st.kind === "gate" ? "on" : ""}">🚪 ${tr("Main gate", "مین گیٹ")}</button>` +
    (W8.on ? `<button data-k="here" class="${st.kind === "here" ? "on" : ""}">📍 ${tr("Where I am", "جہاں میں ہوں")}</button>` : "") +
    `<button data-k="pick" class="${st.kind === "pick" ? "on" : ""}">👆 ${st.kind === "pick" ? st.name : tr("Tap on the map", "نقشے پر ٹیپ کریں")}</button>`;
  el.querySelectorAll("button").forEach(b => b.onclick = () => {
    if (b.dataset.k === "pick") { wayClose(); wayPickOnMap((p) => { WAY.start = p; wayOpen(); }); return; }
    WAY.start = { kind: b.dataset.k }; wayFromUI(); });
}
function wayList() {
  const I = wayIndex(), q = document.getElementById("wpSearch").value.trim().toLowerCase(), el = document.getElementById("wpList");
  const fl = (f) => `<span class="fl">${floorName(f)}</span>`;
  let html = "";
  if (!q) {
    html += `<h3>${tr("Departments", "شعبے")}</h3>` + I.depts.map(d => {
      const floors = [...new Set(d.rooms.map(r => r.f))].map(floorName).join(" · ");
      return `<button data-d="${d.key}"><span class="nm">${L10N.ur ? d.ur : d.en}${L10N.ur ? "" : ` <span class="ur" lang="ur">${d.ur}</span>`}</span><span class="fl">${floors}${d.rooms.length > 1 ? ` · ${d.rooms.length}` : ""}</span></button>`; }).join("");
  } else {
    const dm = I.depts.filter(d => d.en.toLowerCase().includes(q) || d.ur.includes(q) || d.key.includes(q));
    const rm = I.rooms.filter(r => r.n.toLowerCase().includes(q) || (r.d || "").toLowerCase().includes(q) || r.slug.includes(q)).slice(0, 60);
    if (dm.length) html += `<h3>${tr("Departments", "شعبے")}</h3>` + dm.map(d => `<button data-d="${d.key}"><span class="nm">${L10N.ur ? d.ur : d.en}</span><span class="fl">${d.rooms.length} ${tr("rooms", "کمرے")}</span></button>`).join("");
    if (rm.length) html += `<h3>${tr("Rooms", "کمرے")}</h3>` + rm.map(r => `<button data-r="${r.f}:${r.id}"><span class="nm">${r.n}<br><span class="ur">${dimOf(r.d)}</span></span>${fl(r.f)}</button>`).join("");
    if (!dm.length && !rm.length) html = `<p style="padding:10px;color:var(--muted)">${tr("Nothing found.", "کچھ نہیں ملا۔")}</p>`;
  }
  el.innerHTML = html;
  el.querySelectorAll("button[data-d]").forEach(b => b.onclick = () => { const d = I.depts.find(x => x.key === b.dataset.d);
    if (d.rooms.length === 1) wayDestCard(d.rooms[0], d);
    else { document.getElementById("wpSearch").value = ""; el.innerHTML = `<h3>${L10N.ur ? d.ur : d.en}</h3>` + `<button data-near="1"><span>⚑ ${tr("Nearest one", "سب سے قریب")}</span></button>` +
      d.rooms.map(r => `<button data-r="${r.f}:${r.id}"><span class="nm">${r.n}<br><span class="ur">${dimOf(r.d)}</span></span>${fl(r.f)}</button>`).join("");
      el.querySelector("[data-near]").onclick = () => wayDestCard(null, d); bindRooms(); } });
  const bindRooms = () => el.querySelectorAll("button[data-r]").forEach(b => b.onclick = () => { const [f, id] = b.dataset.r.split(":"); wayDestCard(I.rooms.find(r => r.f === f && r.id === +id)); });
  bindRooms();
}
function wayDestCard(room, dept) {
  const el = document.getElementById("wpDest"); el.hidden = false;
  const title = room ? room.n : `${tr("Nearest", "قریب ترین")} ${L10N.ur ? dept.ur : dept.en}`;
  const sub = room ? [floorName(room.f), dimOf(room.d)].filter(Boolean).join(" · ") : [...new Set(dept.rooms.map(r => floorName(r.f)))].join(" · ");
  el.innerHTML = `<b>${title}</b><span>${sub}</span><div class="row2"><button id="wpShow">➜ ${tr("Show the route", "راستہ دکھاؤ")}</button><button id="wpTake" class="primary">🚶 ${tr("Take me there", "وہاں لے چلو")}</button></div>
    <div class="views">${tr("View", "منظر")}: <button class="wayViewBtn" data-v="eye">👁 ${tr("Eye level", "آنکھ سے")}</button><button class="wayViewBtn" data-v="bird">🦅 ${tr("Bird's-eye", "اوپر سے")}</button><button class="wayViewBtn" data-v="plan">⊞ ${tr("Plan", "نقشہ")}</button></div>`;
  el.querySelectorAll(".wayViewBtn").forEach(b => { b.classList.toggle("on", b.dataset.v === WAY.view); b.onclick = () => { WAY.view = b.dataset.v; el.querySelectorAll(".wayViewBtn").forEach(x => x.classList.toggle("on", x === b)); try { localStorage.setItem("d141.view", WAY.view); } catch (e) {} }; });
  const go = (auto) => { const st = WAY.start && WAY.start.kind === "pick" ? WAY.start : null; wayClose();
    const start = st || (WAY.start && WAY.start.kind === "gate" ? { ...gatePoint(), kind: "gate" } : undefined);
    wayGo(room || { dept }, { start, auto, view: WAY.view }); };
  document.getElementById("wpShow").onclick = () => go(false);
  document.getElementById("wpTake").onclick = () => go(true);
  el.scrollIntoView({ block: "nearest" });
}
// printable QR sheet: one code per department, pointing at this viewer's own address with ?to=
function wayQRSheet(baseIn) {
  let saved = ""; try { saved = localStorage.getItem("d141.qrbase") || ""; } catch (e) {}
  const I = wayIndex(), base = (baseIn || saved || location.href.split("?")[0].split("#")[0]).trim();
  const qr = (txt) => { try { const q = __qrmod(0, "M"); q.addData(txt); q.make(); return q.createSvgTag({ cellSize: 3, margin: 2, scalable: true }); } catch (e) { return ""; } };
  const w = document.createElement("div"); w.id = "qrSheet";
  w.innerHTML = `<style>#qrSheet{position:fixed;inset:0;z-index:40;background:#fff;color:#111;overflow:auto;padding:18px}#qrSheet h2{margin:0 0 4px;font-size:20px;text-transform:none;letter-spacing:0;color:#111}
    #qrSheet .qg{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;margin-top:12px}#qrSheet .qc{border:1px solid #ddd;border-radius:10px;padding:10px;text-align:center;break-inside:avoid}
    #qrSheet .qc svg{width:150px;height:150px}#qrSheet .qc b{display:block;font-size:14px}#qrSheet .qc span{font-size:14px;color:#555}#qrSheet .qc code{display:block;font-size:10px;word-break:break-all;color:#777}
    #qrSheet .bar{display:flex;gap:8px;position:sticky;top:0;background:#fff;padding-bottom:8px}#qrSheet .bar button{font:inherit;font-size:15px;padding:10px 14px;min-height:44px;border-radius:9px;border:1px solid #ccc;background:#fff;cursor:pointer}
    @media print{#qrSheet .bar{display:none}}</style>
    <div class="bar"><button id="qrPrint">🖨 ${tr("Print", "پرنٹ")}</button><button id="qrClose">✕ ${tr("Close", "بند کریں")}</button>
      <input id="qrBase" aria-label="${tr("Web address the codes point to", "ویب ایڈریس")}" value="${base.replace(/"/g, "&quot;")}" style="flex:1;min-width:0;font:inherit;font-size:15px;padding:9px 11px;min-height:44px;border:1px solid #ccc;border-radius:9px">
      <button id="qrApply">${tr("Update codes", "کوڈ بنائیں")}</button></div>
    ${/^file:/.test(base) ? `<p style="margin:0 0 10px;padding:10px 12px;background:#fff4e5;border-radius:9px;font-size:14px">${tr("This copy is opened from a file, so phones cannot open these codes. Type the address where the viewer is published (for example https://your-site/Disrupt_141C_viewer_v4.0.html) and press “Update codes”.", "یہ فائل سے کھلا ہے۔ جہاں ویور شائع ہے وہ ایڈریس لکھ کر “کوڈ بنائیں” دبائیں۔")}</p>` : ""}
    <h2>Disrupt 141-C — ${tr("scan to get directions from the main gate", "مین گیٹ سے راستے کے لیے اسکین کریں")}</h2>
    <p style="margin:0;color:#555;font-size:14px">${base}</p>
    <div class="qg">${I.depts.map(d => { const u = `${base}?to=${d.key}`; return `<div class="qc">${qr(u)}<b>${d.en}</b><span lang="ur">${d.ur}</span><code>?to=${d.key}</code></div>`; }).join("")}
    <div class="qc">${qr(base + "?sos=1")}<b>Emergency exit</b><span lang="ur">ایمرجنسی راستہ</span><code>?sos=1</code></div></div>
    <h2 style="margin-top:22px">${tr("Emergency — post one inside each department", "ایمرجنسی — ہر شعبے کے اندر لگائیں")}</h2>
    <p style="margin:0;color:#555;font-size:14px">${tr("Scanning shows the red route from that room to the nearest way out.", "اسکین کرنے پر اس کمرے سے قریب ترین راستہ سرخ لکیر میں دکھائی دے گا۔")}</p>
    <div class="qg">${I.depts.filter(d => d.key !== "main-gate").map(d => { const u = `${base}?sos=1&from=${d.key}`; return `<div class="qc" style="border-color:#e53935">${qr(u)}<b style="color:#c62828">🚨 ${d.en}</b><span lang="ur">${d.ur}</span><code>?sos=1&amp;from=${d.key}</code></div>`; }).join("")}</div>`;
  document.body.appendChild(w);
  document.getElementById("qrPrint").onclick = () => print();
  document.getElementById("qrClose").onclick = () => w.remove();
  document.getElementById("qrApply").onclick = () => { const v = document.getElementById("qrBase").value.trim().split("?")[0]; try { localStorage.setItem("d141.qrbase", v); } catch (e) {} w.remove(); wayQRSheet(v); };
}
// test / automation hook
window.__way = { WAY, L10N, tick: (dt) => { wayAutoStep(dt); wayProgress(); return [W8.floor, +W8.x.toFixed(1), +W8.y.toFixed(1), WAY.auto && WAY.auto.leg, WAY.arrived, !!W8.busy]; },
  probe: (f, x, y) => { const rc = new THREE.Raycaster(new THREE.Vector3(x, y, fflAt(f, x, y) + 6), new THREE.Vector3(0, 0, -1), 0, 12); rc.camera = camera;
    return rc.intersectObjects(scene.children, true).filter(h => h.object.visible && !/Way/.test(h.object.name)).slice(0, 3).map(h => [+(h.point.z - fflAt(f, x, y)).toFixed(2), h.object.name || h.object.parent && h.object.parent.name]); }, go: (q, o) => { const h = wayResolve(q); return h ? wayGo(h.dept ? { dept: h.dept } : h.room, o || {}) : false; }, wayGo, wayIndex, wayEnd, wayEmergency, waySetView,
  wayResolve, wayOpen, wayClose, wayQRSheet, wayAutoStart, planRoute, wayExits, steps: () => WAY.steps && WAY.steps.map(s => s.txt), deepLink: applyDeepLink };
