// ================================================================ WALKTHROUGH
const WD = window.WALK_DATA;
const FLOORS = ["GF", "FF", "SF"];
const FLOOR_NAME = { GF: "Ground floor", FF: "First floor", SF: "Second floor" };
const FLOOR_SHORT = { GF: "G", FF: "1", SF: "2" };
const EYE = 5.25, RADIUS = 0.85, WALK_SPEED = 4.6, RUN_SPEED = 9.5;
const KIND_COL = { work: "#cfdcea", meet: "#e5d6ee", wet: "#cfe8e6", service: "#e3ddd2", welfare: "#f0e0c8",
  circ: "#ecebe6", public: "#f3d9c9", outdoor: "#d6e4c8" };
const grid = {};
FLOORS.forEach(k => {
  const rle = WD.floors[k].rle, a = new Uint8Array(WD.W * WD.H);
  let p = 0; for (let i = 0; i < rle.length; i += 2) { a.fill(rle[i], p, p + rle[i + 1]); p += rle[i + 1]; }
  grid[k] = a;
});
function cell(k, x, y) {
  const c = Math.floor(x / WD.C), r = Math.floor(y / WD.C);
  if (c < 0 || r < 0 || c >= WD.W || r >= WD.H) return 0;
  return grid[k][r * WD.W + c];
}
const isWalk = (k, x, y) => (cell(k, x, y) & 128) !== 0;
const roomAt = (k, x, y) => cell(k, x, y) & 63;
function fflAt(k, x, y) {
  if (k === "GF") {
    if (x > 76.1 && x < 99.1 && y > 52 && y < 80.3) return 0.5;
    if (!(cell(k, x, y) & 64)) return 0.0;
    return x < 60 ? 2.0 : 1.0;
  }
  if (k === "FF") return (x < 32 && y > 92) ? 16 + 11 / 12 : (x < 55 ? 13 + 11 / 12 : 12 + 5 / 12);
  return x < 55 ? 25.75 : 23 + 10 / 12;
}
function canStand(k, x, y) {
  const r = RADIUS, d = r * 0.7071;
  return isWalk(k, x, y) && isWalk(k, x + r, y) && isWalk(k, x - r, y) && isWalk(k, x, y + r) && isWalk(k, x, y - r)
    && isWalk(k, x + d, y + d) && isWalk(k, x - d, y + d) && isWalk(k, x + d, y - d) && isWalk(k, x - d, y - d);
}

const W8 = { on: false, floor: "GF", x: 86, y: 2.6, z: 0, yaw: 0, pitch: 0, room: -1, keys: {}, joy: { x: 0, y: 0 },
  bob: 0, tour: -1, tourAuto: false, tourTimer: 0, busy: false, prev: null };
let floorGroups = {}, signGroups = {}, minimapImg = {}, walkBuilt = false;

function buildWalkScene() {
  if (walkBuilt) return; walkBuilt = true;
  // porcelain floor tile: 4 x 4 tiles of 2'-0" per texture repeat
  const tc = document.createElement("canvas"); tc.width = tc.height = 512;
  const g = tc.getContext("2d"); const rnd = (s) => { const x = Math.sin(s * 91.7) * 43758.5; return x - Math.floor(x); };
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const v = 214 + Math.floor(rnd(i * 7 + j * 3 + 1) * 10);
    g.fillStyle = `rgb(${v},${v - 5},${v - 14})`; g.fillRect(i * 128, j * 128, 128, 128);
    for (let n = 0; n < 90; n++) {
      const a = rnd(i * 131 + j * 17 + n) * 128, b = rnd(n * 5.3 + i + j * 9) * 128;
      g.fillStyle = `rgba(120,110,95,${0.03 + rnd(n + 0.5) * 0.05})`;
      g.fillRect(i * 128 + a, j * 128 + b, 2 + rnd(n) * 6, 1 + rnd(n * 2) * 3);
    }
  }
  g.strokeStyle = "rgba(150,140,125,0.9)"; g.lineWidth = 2;
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 512); g.stroke(); g.beginPath(); g.moveTo(0, i * 128); g.lineTo(512, i * 128); g.stroke(); }
  const tile = new THREE.CanvasTexture(tc);
  tile.colorSpace = THREE.SRGBColorSpace; tile.wrapS = tile.wrapT = THREE.RepeatWrapping;
  tile.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const PW = WD.W * WD.C, PH = WD.H * WD.C;
  tile.repeat.set(PW / 8, PH / 8);

  FLOORS.forEach(k => {
    const grp = new THREE.Group(); grp.visible = false; scene.add(grp); floorGroups[k] = grp;
    const levels = {};
    for (let r = 0; r < WD.H; r++) for (let c = 0; c < WD.W; c++) {
      const v = grid[k][r * WD.W + c]; if (!(v & 64) || !(v & 128)) continue;
      const z = fflAt(k, (c + 0.5) * WD.C, (r + 0.5) * WD.C); if (k === "GF" && z < 0.9) continue;
      const key = z.toFixed(3); (levels[key] = levels[key] || []).push(r * WD.W + c);
    }
    Object.entries(levels).forEach(([z, cells]) => {
      const data = new Uint8Array(WD.W * WD.H * 4);
      cells.forEach(i => { data[i * 4 + 1] = 255; data[i * 4 + 3] = 255; });
      const mask = new THREE.DataTexture(data, WD.W, WD.H, THREE.RGBAFormat);
      mask.magFilter = THREE.LinearFilter; mask.needsUpdate = true;
      const m = new THREE.MeshStandardMaterial({ map: tile, alphaMap: mask, alphaTest: 0.5, roughness: 0.32, metalness: 0,
        envMapIntensity: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      m.userData.baseEnv = 0.9; envMats.push(m);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), m);
      pl.position.set(PW / 2, PH / 2, +z + 0.02); pl.receiveShadow = true; grp.add(pl);
    });
    // room signs, readable from inside the room, hidden by walls
    const sg = new THREE.Group(); sg.visible = false; scene.add(sg); signGroups[k] = sg;
    WD.floors[k].rooms.forEach(rm => {
      if (rm.k === "outdoor" && k === "GF" && /Compound/.test(rm.n)) return;
      const s = makeSign(rm.n, rm.d);
      s.position.set(rm.x, rm.y, fflAt(k, rm.x, rm.y) + (rm.k === "outdoor" ? 6.4 : 7.6)); sg.add(s);
    });
    minimapImg[k] = drawMinimapBase(k);
  });
}

function makeSign(title, sub) {
  const c = document.createElement("canvas"), g = c.getContext("2d");
  const f1 = "600 46px ui-sans-serif, Helvetica, Arial, sans-serif", f2 = "400 30px ui-sans-serif, Helvetica, Arial, sans-serif";
  g.font = f1; const w1 = g.measureText(title).width; g.font = f2; const w2 = sub ? g.measureText(sub).width : 0;
  const W = Math.ceil(Math.max(w1, w2)) + 48, H = sub ? 116 : 76;
  c.width = W; c.height = H;
  const x = c.getContext("2d");
  x.fillStyle = "rgba(24,32,40,0.82)"; x.beginPath(); x.roundRect ? x.roundRect(0, 0, W, H, 14) : x.rect(0, 0, W, H); x.fill();
  x.fillStyle = "#f4f1ea"; x.font = f1; x.textBaseline = "top"; x.fillText(title, 24, 14);
  if (sub) { x.fillStyle = "#b9c6d2"; x.font = f2; x.fillText(sub, 24, 70); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: true, fog: false, toneMapped: false }));
  const s = 0.0105; sp.scale.set(W * s, H * s, 1); return sp;
}

function drawMinimapBase(k) {
  const c = document.createElement("canvas"); c.width = WD.W; c.height = WD.H;
  const g = c.getContext("2d"), img = g.createImageData(WD.W, WD.H), rooms = WD.floors[k].rooms;
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const cols = rooms.map(r => hex(KIND_COL[r.k] || "#e8e8e8"));
  for (let r = 0; r < WD.H; r++) for (let cc = 0; cc < WD.W; cc++) {
    const v = grid[k][r * WD.W + cc], o = ((WD.H - 1 - r) * WD.W + cc) * 4;
    let col;
    if (v & 128) col = (v & 63) ? cols[(v & 63) - 1] : [236, 235, 230];
    else if (v & 64) col = [58, 64, 72];
    else col = k === "GF" ? [58, 64, 72] : [0, 0, 0];
    img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2];
    img.data[o + 3] = (!(v & 128) && !(v & 64) && k !== "GF") ? 0 : 255;
  }
  g.putImageData(img, 0, 0); return c;
}

function drawMinimap() {
  const cv = document.getElementById("minimap"); if (!cv) return;
  const g = cv.getContext("2d"), s = cv.width / WD.W;
  g.clearRect(0, 0, cv.width, cv.height);
  g.imageSmoothingEnabled = false; g.drawImage(minimapImg[W8.floor], 0, 0, cv.width, cv.height);
  // current room outline glow
  const px = W8.x / WD.C * s, py = (WD.H - W8.y / WD.C) * s;
  WD.stairs.forEach(st => {
    if (!st.f.includes(W8.floor)) return;
    const [x0, x1, y0, y1] = st.r;
    g.fillStyle = "rgba(47,93,124,0.85)";
    g.fillRect(x0 / WD.C * s, (WD.H - y1 / WD.C) * s, (x1 - x0) / WD.C * s, (y1 - y0) / WD.C * s);
    g.fillStyle = "#fff"; g.font = `${Math.round(11 * devicePixelRatio)}px sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("⇅", ((x0 + x1) / 2) / WD.C * s, (WD.H - (y0 + y1) / 2 / WD.C) * s);
  });
  g.save(); g.translate(px, py); g.rotate(W8.yaw);
  g.fillStyle = "rgba(217,87,40,0.22)"; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 34 * devicePixelRatio, -Math.PI / 2 - 0.6, -Math.PI / 2 + 0.6); g.closePath(); g.fill();
  g.fillStyle = "#d95728"; g.strokeStyle = "#fff"; g.lineWidth = 2 * devicePixelRatio;
  g.beginPath(); const u = 6 * devicePixelRatio; g.moveTo(0, -u * 1.5); g.lineTo(u, u); g.lineTo(0, u * 0.4); g.lineTo(-u, u); g.closePath(); g.fill(); g.stroke();
  g.restore();
}

// ---------------------------------------------------------------- enter / exit
function enterWalk(at) {
  buildWalkScene();
  if (W8.on) return;
  W8.on = true;
  W8.prev = { pos: camera.position.clone(), tgt: controls.target.clone(), fov: camera.fov, mode, preset: light.preset, hour: light.hour, lamps: light.lampsManual, path: light.path };
  stopPlay(); if (light.path) { light.path = false; document.getElementById("sunpath").checked = false; }
  if (mode !== "material") setMode("material");
  if (light.preset === "studio") { light.preset = "afternoon"; light.hour = presetHour("afternoon"); }
  light.lampsManual = true; applyLight();
  controls.enabled = false;
  camera.fov = 70; camera.near = 0.25; camera.updateProjectionMatrix();
  Object.entries(groups).forEach(([k, g]) => { g.visible = true; if (/_Slab$/.test(k)) g.traverse(o => { if (o.isMesh) o.material.color.set(0xe9e6df); }); });
  setLabels(false);
  document.body.classList.add("walking");
  FLOORS.forEach(k => floorGroups[k].visible = true);
  const p = at || { f: "GF", x: 86, y: 2.6, yaw: 0, pitch: 0 };
  placeAt(p.f, p.x, p.y, p.yaw, p.pitch || 0);
  showHint(true);
}
function exitWalk() {
  if (!W8.on) return;
  endTour(); W8.on = false; controls.enabled = true;
  document.body.classList.remove("walking");
  FLOORS.forEach(k => { floorGroups[k].visible = false; signGroups[k].visible = false; });
  camera.near = 1; const P = W8.prev;
  mode = null; setMode(P.mode);
  light.lampsManual = P.lamps; applyLight();
  camera.fov = P.fov; camera.updateProjectionMatrix();
  camera.position.copy(P.pos); controls.target.copy(P.tgt); controls.update();
}
function placeAt(f, x, y, yaw, pitch) {
  W8.floor = f; W8.x = x; W8.y = y; W8.yaw = yaw; W8.pitch = pitch || 0;
  W8.z = fflAt(f, x, y); W8.room = -1;
  FLOORS.forEach(k => signGroups[k].visible = (k === f));
  const fi = FLOORS.indexOf(f);
  lampGroup.children.forEach(l => { l.visible = l.userData.fl === fi; });
  document.querySelectorAll("#floorTabs button").forEach(b => b.classList.toggle("on", b.dataset.f === f));
  updateRoom(true);
}
function fadeTo(fn) {
  if (W8.busy) return; W8.busy = true;
  const fd = document.getElementById("fade"); fd.classList.add("on");
  setTimeout(() => { fn(); fd.classList.remove("on"); setTimeout(() => W8.busy = false, 350); }, 380);
}
function goFloor(f, viaStair) {
  const st = viaStair || WD.stairs[0];
  const p = st.p[f]; if (!p) return;
  fadeTo(() => placeAt(f, p[0], p[1], p[2], 0));
}

// ---------------------------------------------------------------- per-frame
function updateRoom(force) {
  const id = roomAt(W8.floor, W8.x, W8.y);
  if (id === W8.room && !force) return;
  W8.room = id;
  const rm = id ? WD.floors[W8.floor].rooms[id - 1] : null;
  const card = document.getElementById("roomCard");
  document.getElementById("roomName").textContent = rm ? rm.n : (W8.floor === "GF" && fflAt("GF", W8.x, W8.y) === 0 ? "Outside, in the compound" : "Passage");
  const lvl = fflAt(W8.floor, W8.x, W8.y);
  const ft = Math.floor(lvl + 1e-6), inch = Math.round((lvl - ft) * 12);
  document.getElementById("roomSub").textContent =
    [FLOOR_NAME[W8.floor], rm && rm.d ? rm.d : null, `floor +${ft}'-${inch}"`].filter(Boolean).join("  ·  ");
  card.classList.remove("pop"); void card.offsetWidth; card.classList.add("pop");
}
function nearStair() {
  for (const st of WD.stairs) {
    if (!st.f.includes(W8.floor)) continue;
    const [x0, x1, y0, y1] = st.r;
    const dx = Math.max(x0 - W8.x, 0, W8.x - x1), dy = Math.max(y0 - W8.y, 0, W8.y - y1);
    if (Math.hypot(dx, dy) < 4.2) return st;
  }
  return null;
}
let shownStair = null;
function updateStairPrompt() {
  const st = W8.tour >= 0 ? null : nearStair();
  if (st === shownStair) return; shownStair = st;
  const box = document.getElementById("stairPrompt");
  if (!st) { box.classList.remove("show"); return; }
  const i = st.f.indexOf(W8.floor), up = st.f[i + 1], dn = st.f[i - 1];
  box.innerHTML = `<span>${st.n}</span>` +
    (up ? `<button data-f="${up}">▲ ${FLOOR_NAME[up]}</button>` : "") +
    (dn ? `<button data-f="${dn}">▼ ${FLOOR_NAME[dn]}</button>` : "");
  box.querySelectorAll("button").forEach(b => b.onclick = () => goFloor(b.dataset.f, st));
  box.classList.add("show");
}
function walkStep(dt) {
  if (W8.tour < 0 && !W8.busy) {
    const K = W8.keys; let f = 0, s = 0;
    if (K.KeyW || K.ArrowUp) f += 1; if (K.KeyS || K.ArrowDown) f -= 1;
    if (K.KeyD) s += 1; if (K.KeyA) s -= 1;
    if (K.ArrowLeft) W8.yaw -= 1.9 * dt; if (K.ArrowRight) W8.yaw += 1.9 * dt;
    f += -W8.joy.y; s += W8.joy.x;
    const mag = Math.hypot(f, s);
    if (mag > 0.05) {
      if (mag > 1) { f /= mag; s /= mag; }
      const sp = (K.ShiftLeft || K.ShiftRight ? RUN_SPEED : WALK_SPEED) * dt;
      const sy = Math.sin(W8.yaw), cy = Math.cos(W8.yaw);
      const dx = (sy * f + cy * s) * sp, dy = (cy * f - sy * s) * sp;
      const k = W8.floor;
      if (canStand(k, W8.x + dx, W8.y + dy)) { W8.x += dx; W8.y += dy; }
      else if (canStand(k, W8.x + dx, W8.y)) W8.x += dx;
      else if (canStand(k, W8.x, W8.y + dy)) W8.y += dy;
      W8.bob += dt * (K.ShiftLeft || K.ShiftRight ? 12 : 8) * Math.min(mag, 1);
      if (!hintHidden) showHint(false);
    }
  }
  const tz = fflAt(W8.floor, W8.x, W8.y);
  W8.z += (tz - W8.z) * Math.min(1, dt * 9);
  const bob = Math.sin(W8.bob) * 0.06;
  camera.position.set(W8.x, W8.y, W8.z + EYE + bob);
  const cp = Math.cos(W8.pitch);
  camera.lookAt(W8.x + Math.sin(W8.yaw) * cp, W8.y + Math.cos(W8.yaw) * cp, W8.z + EYE + bob + Math.sin(W8.pitch));
  updateRoom(false); updateStairPrompt(); drawMinimap();
  if (W8.tour >= 0 && W8.tourAuto) { W8.tourTimer += dt; if (W8.tourTimer > 9) { W8.tourTimer = 0; tourGo(W8.tour + 1); } }
}

// ---------------------------------------------------------------- guided tour
function tourGo(i) {
  const T = WD.tour; if (i >= T.length) { endTour(); return; } if (i < 0) i = 0;
  W8.tour = i; W8.tourTimer = 0; const s = T[i];
  document.getElementById("tourStep").textContent = `${i + 1} / ${T.length}`;
  document.getElementById("tourTitle").textContent = s.t;
  document.getElementById("tourText").textContent = s.c;
  document.getElementById("tourCard").classList.add("show");
  fadeTo(() => placeAt(s.f, s.x, s.y, s.yaw, s.pitch));
}
function startTour() { if (!W8.on) enterWalk(); W8.tourAuto = false; syncAuto(); tourGo(0); }
function endTour() { W8.tour = -1; W8.tourAuto = false; syncAuto(); const c = document.getElementById("tourCard"); if (c) c.classList.remove("show"); }
function syncAuto() { const b = document.getElementById("tourAuto"); if (b) { b.textContent = W8.tourAuto ? "❚❚ Auto" : "▶ Auto"; b.classList.toggle("on", W8.tourAuto); } }

// ---------------------------------------------------------------- input
let hintHidden = false;
function showHint(on) { hintHidden = !on; const h = document.getElementById("walkHint"); if (h) h.classList.toggle("show", on); }
function bindWalkInput() {
  addEventListener("keydown", (e) => {
    if (!W8.on) return;
    if (["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","ShiftLeft","ShiftRight"].includes(e.code)) {
      W8.keys[e.code] = true; e.preventDefault();
      if (W8.tour >= 0 && !e.code.startsWith("Shift")) endTour();
    }
    if (e.code === "Escape") exitWalk();
    if (e.code === "PageUp" || e.code === "PageDown") {
      const st = nearStair(); if (st) { const i = st.f.indexOf(W8.floor) + (e.code === "PageUp" ? 1 : -1); if (st.f[i]) goFloor(st.f[i], st); }
    }
  });
  addEventListener("keyup", (e) => { W8.keys[e.code] = false; });
  addEventListener("blur", () => { W8.keys = {}; });
  const cv = renderer.domElement;
  let look = null;
  cv.addEventListener("pointerdown", (e) => {
    if (!W8.on) return;
    look = { id: e.pointerId, x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener("pointermove", (e) => {
    if (!W8.on || !look || e.pointerId !== look.id) return;
    const k = e.pointerType === "touch" ? 0.006 : 0.0042;
    W8.yaw += (e.clientX - look.x) * k; W8.pitch = clamp(W8.pitch - (e.clientY - look.y) * k, -1.25, 1.25);
    look.x = e.clientX; look.y = e.clientY;
    if (W8.tour >= 0) W8.tourAuto = false, syncAuto();
  });
  const endLook = (e) => { if (look && e.pointerId === look.id) look = null; };
  cv.addEventListener("pointerup", endLook); cv.addEventListener("pointercancel", endLook);
  // joystick
  const joy = document.getElementById("joy"), knob = joy.querySelector("i");
  let jid = null, jc = null;
  joy.addEventListener("pointerdown", (e) => { jid = e.pointerId; joy.setPointerCapture(jid); const r = joy.getBoundingClientRect(); jc = { x: r.left + r.width / 2, y: r.top + r.height / 2, R: r.width / 2 }; moveJ(e); if (W8.tour >= 0) endTour(); });
  const moveJ = (e) => {
    if (e.pointerId !== jid) return;
    let dx = (e.clientX - jc.x) / jc.R, dy = (e.clientY - jc.y) / jc.R; const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
    W8.joy.x = dx; W8.joy.y = dy; knob.style.transform = `translate(${dx * jc.R * 0.6}px, ${dy * jc.R * 0.6}px)`;
    if (!hintHidden) showHint(false);
  };
  joy.addEventListener("pointermove", moveJ);
  const endJ = (e) => { if (e.pointerId !== jid) return; jid = null; W8.joy.x = W8.joy.y = 0; knob.style.transform = ""; };
  joy.addEventListener("pointerup", endJ); joy.addEventListener("pointercancel", endJ);
  // minimap click to jump
  document.getElementById("minimap").addEventListener("click", (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * WD.W * WD.C, y = (1 - (e.clientY - r.top) / r.height) * WD.H * WD.C;
    let best = null, bd = 1e9;
    for (let dy = -8; dy <= 8; dy += 0.5) for (let dx = -8; dx <= 8; dx += 0.5) {
      const d = dx * dx + dy * dy; if (d < bd && canStand(W8.floor, x + dx, y + dy)) { bd = d; best = [x + dx, y + dy]; }
    }
    if (best) { endTour(); fadeTo(() => placeAt(W8.floor, best[0], best[1], W8.yaw, 0)); }
  });
  document.querySelectorAll("#floorTabs button").forEach(b => b.onclick = () => { endTour(); goFloor(b.dataset.f); });
  document.getElementById("walkExit").onclick = exitWalk;
  document.getElementById("walkTour").onclick = startTour;
  document.getElementById("tourPrev").onclick = () => { W8.tourAuto = false; syncAuto(); tourGo(W8.tour - 1); };
  document.getElementById("tourNext").onclick = () => { W8.tourAuto = false; syncAuto(); tourGo(W8.tour + 1); };
  document.getElementById("tourAuto").onclick = () => { W8.tourAuto = !W8.tourAuto; W8.tourTimer = 0; syncAuto(); };
  document.getElementById("tourEnd").onclick = endTour;
  document.getElementById("walkDay").onclick = () => {
    const night = solar(light.doy, light.hour).alt < 0;
    light.preset = night ? "afternoon" : "night"; light.hour = presetHour(light.preset);
    document.getElementById("clock").value = light.hour; applyLight(); syncDayBtn();
  };
  syncDayBtn();
}
function syncDayBtn() { const b = document.getElementById("walkDay"); if (b) b.textContent = solar(light.doy, light.hour).alt < 0 ? "☀ Day" : "☾ Night"; }
