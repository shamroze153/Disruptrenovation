// ================================================================ DIRECTORY MAP + WAYFINDING
const LEGEND = [["work", "Work areas"], ["meet", "Meeting rooms"], ["welfare", "Staff welfare & prayer"], ["wet", "Toilets & washrooms"],
  ["service", "Service & plant"], ["public", "Entrance & reception"], ["circ", "Passages"], ["outdoor", "Outdoor & lawns"]];
const MAP_COL = { work: "#a9c6e8", meet: "#cfb3e6", welfare: "#f3c98f", wet: "#9fd8d0", service: "#d9cfbf", public: "#f2ad8d", circ: "#f1efe9", outdoor: "#b9d99a" };
const DM = { floor: "GF", sel: null, hover: null, img: {}, areas: {}, s: 1, ox: 0, oy: 0 };
const standCache = {};
function roomArea(k, id) {
  if (!DM.areas[k]) { const m = new Map(); for (let i = 0; i < WD.W * WD.H; i++) { const v = grid[k][i]; if (v & 63) m.set(v & 63, (m.get(v & 63) || 0) + 1); } DM.areas[k] = m; }
  return (DM.areas[k].get(id) || 0) * WD.C * WD.C;
}
function mapBase(k) {
  if (DM.img[k]) return DM.img[k];
  const c = document.createElement("canvas"); c.width = WD.W; c.height = WD.H;
  const g = c.getContext("2d"), im = g.createImageData(WD.W, WD.H), rooms = WD.floors[k].rooms;
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  for (let r = 0; r < WD.H; r++) for (let cc = 0; cc < WD.W; cc++) {
    const v = grid[k][r * WD.W + cc], o = ((WD.H - 1 - r) * WD.W + cc) * 4; let col = null, a = 255;
    const id = v & 63;
    if (v & 128) col = id ? hex(MAP_COL[rooms[id - 1].k] || "#eeeeee") : ((v & 64) ? [241, 239, 233] : (k === "GF" ? [226, 224, 218] : null));
    else if (id && (v & 64)) { const b = hex(MAP_COL[rooms[id - 1].k] || "#eeeeee"); col = [b[0] * 0.8, b[1] * 0.8, b[2] * 0.8]; }
    else if (v & 64) col = [44, 48, 54];
    else col = k === "GF" ? [44, 48, 54] : null;
    if (!col) { a = 0; col = [0, 0, 0]; }
    im.data[o] = col[0]; im.data[o + 1] = col[1]; im.data[o + 2] = col[2]; im.data[o + 3] = a;
  }
  g.putImageData(im, 0, 0); DM.img[k] = c; return c;
}
function openMap(floor) {
  const el = document.getElementById("dirMap"); el.hidden = false;
  DM.floor = floor || (W8.on ? W8.floor : DM.floor);
  if (W8.lock && document.exitPointerLock) document.exitPointerLock();
  syncMapTabs(); drawMap();
}
function closeMap() { document.getElementById("dirMap").hidden = true; }
function syncMapTabs() { document.querySelectorAll("#dmTabs button").forEach(b => b.classList.toggle("on", b.dataset.f === DM.floor)); }
function mapXY(x, y) { return [DM.ox + x * DM.s, DM.oy + (WD.H * WD.C - y) * DM.s]; }
function drawMap() {
  const cv = document.getElementById("dmCanvas"), box = cv.parentElement.getBoundingClientRect(), dpr = Math.min(devicePixelRatio, 2);
  cv.width = box.width * dpr; cv.height = box.height * dpr; cv.style.width = box.width + "px"; cv.style.height = box.height + "px";
  const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, box.width, box.height);
  const PW = WD.W * WD.C, PH = WD.H * WD.C;
  DM.s = Math.min((box.width - 24) / PW, (box.height - 24) / PH); DM.ox = (box.width - PW * DM.s) / 2; DM.oy = (box.height - PH * DM.s) / 2;
  g.imageSmoothingEnabled = false; g.drawImage(mapBase(DM.floor), DM.ox, DM.oy, PW * DM.s, PH * DM.s);
  const k = DM.floor, rooms = WD.floors[k].rooms;
  // highlight
  [DM.hover, DM.sel].forEach((id, j) => {
    if (!id || (j === 0 && DM.sel && DM.sel.f === k && DM.sel.id === id)) return;
    const rid = typeof id === "object" ? (id.f === k ? id.id : 0) : id; if (!rid) return;
    g.fillStyle = j ? "rgba(217,87,40,0.55)" : "rgba(47,93,124,0.28)";
    const cs = DM.s * WD.C;
    for (let r = 0; r < WD.H; r++) for (let c = 0; c < WD.W; c++) if ((grid[k][r * WD.W + c] & 63) === rid && (grid[k][r * WD.W + c] & 128))
      g.fillRect(DM.ox + c * cs, DM.oy + (WD.H - 1 - r) * cs, cs + 0.5, cs + 0.5);
  });
  // stairs
  WD.stairs.forEach(st => {
    if (!st.f.includes(k)) return; const [x0, x1, y0, y1] = st.r; const [a, b] = mapXY(x0, y1);
    g.fillStyle = "#2f5d7c"; g.fillRect(a, b, (x1 - x0) * DM.s, (y1 - y0) * DM.s);
    g.fillStyle = "#fff"; g.font = "600 11px ui-sans-serif, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    const [cx, cy] = mapXY((x0 + x1) / 2, (y0 + y1) / 2); g.fillText("⇅", cx, cy - 6); g.fillText("Stairs", cx, cy + 7);
  });
  // labels, biggest rooms first, skipping overlaps
  const placed = [];
  const order = rooms.map((r, i) => [r, i + 1, roomArea(k, i + 1)]).filter(([r, , a]) => a > 25 && !/Compound/.test(r.n)).sort((a, b) => b[2] - a[2]);
  order.forEach(([rm, id, a]) => {
    const fs = Math.max(10, Math.min(15, 8 + Math.sqrt(a) * 0.28)) * Math.min(1.25, Math.max(0.8, DM.s / 5));
    g.font = `600 ${fs}px ui-sans-serif, system-ui, sans-serif`;
    let name = rm.n.replace(" (double height)", "").replace(" (open to sky)", "");
    if (rm.k === "circ" && a < 200) return;
    const w = g.measureText(name).width, [x, y] = mapXY(rm.x, rm.y);
    const rect = [x - w / 2 - 3, y - fs / 2 - 2, w + 6, fs + 4];
    if (placed.some(p => !(rect[0] > p[0] + p[2] || rect[0] + rect[2] < p[0] || rect[1] > p[1] + p[3] || rect[1] + rect[3] < p[1]))) return;
    placed.push(rect);
    g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = 3; g.strokeStyle = "rgba(255,255,255,0.85)";
    g.strokeText(name, x, y); g.fillStyle = "#1b1f23"; g.fillText(name, x, y);
  });
  if (k === "GF") {
    const [x, y] = mapXY(86, 1.5);
    g.fillStyle = "#d95728"; g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x - 8, y + 10); g.lineTo(x + 8, y + 10); g.closePath(); g.fill();
    g.font = "700 12px ui-sans-serif, system-ui, sans-serif"; g.fillText("Main entrance", x, y + 22);
  }
  if (W8.on && W8.floor === k) {
    const [x, y] = mapXY(W8.x, W8.y);
    g.save(); g.translate(x, y); g.rotate(W8.yaw);
    g.fillStyle = "rgba(217,87,40,0.25)"; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 30, -Math.PI / 2 - 0.6, -Math.PI / 2 + 0.6); g.fill();
    g.fillStyle = "#d95728"; g.strokeStyle = "#fff"; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 7, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
    g.font = "700 12px ui-sans-serif, system-ui, sans-serif"; g.fillStyle = "#d95728"; g.fillText("You are here", x, y - 16);
  }
  if (NAV.path && NAV.pathFloor === k) {
    g.strokeStyle = "#d95728"; g.lineWidth = 3; g.setLineDash([6, 5]); g.beginPath();
    NAV.path.forEach(([px, py], i) => { const [a, b] = mapXY(px, py); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.stroke(); g.setLineDash([]);
  }
  // north + scale
  g.fillStyle = "#1b1f23"; g.font = "700 13px ui-sans-serif, system-ui, sans-serif"; g.textAlign = "center";
  g.fillText("N", DM.ox + 16, DM.oy + 14); g.beginPath(); g.moveTo(DM.ox + 16, DM.oy + 20); g.lineTo(DM.ox + 10, DM.oy + 36); g.lineTo(DM.ox + 22, DM.oy + 36); g.closePath(); g.fill();
  const sb = 20 * DM.s; g.fillRect(DM.ox + 6, DM.oy + PH * DM.s - 14, sb, 4); g.textAlign = "left"; g.font = "600 11px ui-sans-serif, system-ui, sans-serif";
  g.fillText("20 ft", DM.ox + 10 + sb, DM.oy + PH * DM.s - 11);
}
function roomAtMap(ev) {
  const r = ev.currentTarget.getBoundingClientRect();
  const x = (ev.clientX - r.left - DM.ox) / DM.s, y = WD.H * WD.C - (ev.clientY - r.top - DM.oy) / DM.s;
  let id = roomAt(DM.floor, x, y);
  if (!id) { for (let d = 0.5; d <= 2 && !id; d += 0.5) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) { id = id || roomAt(DM.floor, x + dx, y + dy); } }
  return id;
}
function selectRoom(f, id) {
  DM.floor = f; DM.sel = { f, id }; syncMapTabs(); drawMap();
  const rm = WD.floors[f].rooms[id - 1];
  document.getElementById("dmName").textContent = rm.n;
  document.getElementById("dmInfo").textContent = [FLOOR_NAME[f], rm.d].filter(Boolean).join(" · ");
  document.getElementById("dmCard").hidden = false;
}
function bindMap() {
  const cv = document.getElementById("dmCanvas");
  cv.addEventListener("pointermove", (e) => { const id = roomAtMap(e); if (id !== DM.hover) { DM.hover = id; drawMap();
    cv.title = id ? WD.floors[DM.floor].rooms[id - 1].n : ""; } });
  cv.addEventListener("click", (e) => { const id = roomAtMap(e); if (id) selectRoom(DM.floor, id); });
  document.querySelectorAll("#dmTabs button").forEach(b => b.onclick = () => { DM.floor = b.dataset.f; DM.hover = null; syncMapTabs(); drawMap(); });
  document.getElementById("dmClose").onclick = closeMap;
  document.querySelectorAll(".openMap").forEach(b => b.onclick = () => openMap());
  addEventListener("resize", () => { if (!document.getElementById("dirMap").hidden) drawMap(); });
  addEventListener("keydown", (e) => { if (e.code === "KeyM" && W8.on && document.activeElement.tagName !== "INPUT") { const h = document.getElementById("dirMap").hidden; h ? openMap() : closeMap(); } });
  // search
  const dl = document.getElementById("dmList"), seen = new Set(), index = [];
  FLOORS.forEach(f => WD.floors[f].rooms.forEach((rm, i) => {
    if (/Compound/.test(rm.n)) return;
    let label = `${rm.n} — ${FLOOR_NAME[f]}`; if (seen.has(label)) label += ` (${Math.round(rm.x)}, ${Math.round(rm.y)})`; seen.add(label);
    index.push([label, f, i + 1]); const o = document.createElement("option"); o.value = label; dl.appendChild(o);
  }));
  const inp = document.getElementById("dmSearch");
  inp.addEventListener("change", () => { const hit = index.find(r => r[0] === inp.value) || index.find(r => r[0].toLowerCase().startsWith(inp.value.toLowerCase()));
    if (hit) { selectRoom(hit[1], hit[2]); inp.blur(); } });
  document.getElementById("dmWalk").onclick = () => { const s = DM.sel; if (!s) return; closeMap(); walkToRoom(s.f, s.id); };
  document.getElementById("dmRoute").onclick = () => { const s = DM.sel; if (!s) return; closeMap(); if (!W8.on) enterWalk(); setRoute(s.f, s.id); };
  document.getElementById("routeCancel").onclick = clearRoute;
}

// ---------------------------------------------------------------- routing
function standGrid(k) {
  if (standCache[k]) return standCache[k];
  const S = new Uint8Array(WD.W * WD.H);
  for (let r = 0; r < WD.H; r++) for (let c = 0; c < WD.W; c++) S[r * WD.W + c] = canStand(k, (c + 0.5) * WD.C, (r + 0.5) * WD.C) ? 1 : 0;
  return standCache[k] = S;
}
function nearestStand(k, x, y, room) {
  const S = standGrid(k), c0 = Math.floor(x / WD.C), r0 = Math.floor(y / WD.C);
  for (let d = 0; d < 40; d++) for (let dr = -d; dr <= d; dr++) for (let dc = -d; dc <= d; dc++) {
    if (Math.max(Math.abs(dr), Math.abs(dc)) !== d) continue;
    const r = r0 + dr, c = c0 + dc; if (r < 0 || c < 0 || r >= WD.H || c >= WD.W) continue;
    const i = r * WD.W + c; if (S[i] && (!room || (grid[k][i] & 63) === room)) return i;
  }
  return room ? nearestStand(k, x, y) : -1;
}
function astar(k, s, t) {
  const S = standGrid(k), Wd = WD.W, N = Wd * WD.H, g = new Float32Array(N).fill(1e9), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const tx = t % Wd, ty = (t / Wd) | 0, h = (i) => { const dx = Math.abs(i % Wd - tx), dy = Math.abs(((i / Wd) | 0) - ty); return (dx + dy) + (1.4142 - 2) * Math.min(dx, dy); };
  const heap = [], push = (f, i) => { heap.push([f, i]); let n = heap.length - 1; while (n) { const p = (n - 1) >> 1; if (heap[p][0] <= heap[n][0]) break; [heap[p], heap[n]] = [heap[n], heap[p]]; n = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let n = 0; for (;;) { let l = 2 * n + 1, r = l + 1, m = n;
    if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === n) break; [heap[m], heap[n]] = [heap[n], heap[m]]; n = m; } } return top; };
  g[s] = 0; push(h(s), s); let best = s, bh = h(s);
  const nb = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]];
  while (heap.length) {
    const [, i] = pop(); if (closed[i]) continue; closed[i] = 1;
    const hi = h(i); if (hi < bh) { bh = hi; best = i; }
    if (i === t) break;
    const x = i % Wd, y = (i / Wd) | 0;
    for (const [dx, dy, w] of nb) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= Wd || ny >= WD.H) continue;
      const j = ny * Wd + nx; if (!S[j] || closed[j]) continue;
      if (dx && dy && !(S[y * Wd + nx] && S[ny * Wd + x])) continue;
      const ng = g[i] + w; if (ng < g[j]) { g[j] = ng; came[j] = i; push(ng + h(j), j); }
    }
  }
  const end = closed[t] ? t : best, cells = []; for (let i = end; i !== -1; i = came[i]) cells.push(i);
  cells.reverse();
  return { cells, partial: end !== t, len: g[end] * WD.C };
}
function losClear(k, a, b) {
  const S = standGrid(k), d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(d / 0.25);
  for (let i = 1; i < n; i++) { const x = a[0] + (b[0] - a[0]) * i / n, y = a[1] + (b[1] - a[1]) * i / n;
    if (!S[Math.floor(y / WD.C) * WD.W + Math.floor(x / WD.C)]) return false; }
  return true;
}
function toPoints(k, cells) {
  const pts = cells.map(i => [(i % WD.W + 0.5) * WD.C, (((i / WD.W) | 0) + 0.5) * WD.C]);
  if (pts.length < 3) return pts;
  const out = [pts[0]]; let a = 0;
  while (a < pts.length - 1) { let b = pts.length - 1; while (b > a + 1 && !losClear(k, pts[a], pts[b])) b--; out.push(pts[b]); a = b; }
  return out;
}
const NAV = { target: null, path: null, pathFloor: null, stair: null, t: 0, arrived: 0, mesh: null, pin: null };
function setRoute(f, id) {
  const rm = WD.floors[f].rooms[id - 1];
  NAV.target = { f, id, name: rm.n, x: rm.x, y: rm.y }; NAV.stair = null; NAV.arrived = 0; NAV.t = 0;
  document.getElementById("routeBar").classList.add("show");
  if (W8.tour >= 0) endTour();
  computeRoute();
}
function clearRoute() {
  NAV.target = null; NAV.path = null; document.getElementById("routeBar").classList.remove("show");
  if (NAV.mesh) NAV.mesh.visible = false; if (NAV.pin) NAV.pin.visible = false;
}
function legTo(k, x, y, room) {
  const s = nearestStand(k, W8.x, W8.y), t = nearestStand(k, x, y, room);
  if (s < 0 || t < 0) return null;
  const r = astar(k, s, t); r.pts = toPoints(k, r.cells); return r;
}
function computeRoute() {
  const T = NAV.target; if (!T || !W8.on) return;
  let msg, leg;
  if (W8.floor === T.f) {
    leg = legTo(T.f, T.x, T.y, T.id);
    const inRoom = roomAt(W8.floor, W8.x, W8.y) === T.id;
    if (inRoom || (leg && leg.len < 4 && !leg.partial)) {
      if (!NAV.arrived) NAV.arrived = performance.now();
      msg = `✓ You have arrived: <b>${T.name}</b>`; leg = null;
    } else if (leg && leg.partial) msg = `➜ <b>${T.name}</b> — the drawings show no door into this room. Walk to the end of the line, then press <b>✈ Fly</b> to go in.`;
    else msg = `➜ <b>${T.name}</b> · about ${Math.max(5, Math.round((leg ? leg.len : 0) / 5) * 5)} ft ahead`;
  } else {
    if (!NAV.stair || !NAV.stair.f.includes(W8.floor) || !NAV.stair.f.includes(T.f)) {
      let best = null;
      WD.stairs.forEach(st => { if (!st.f.includes(W8.floor) || !st.f.includes(T.f)) return;
        const a = legTo(W8.floor, st.p[W8.floor][0], st.p[W8.floor][1]); if (!a || a.partial) return;
        const cost = a.len + Math.hypot(st.p[T.f][0] - T.x, st.p[T.f][1] - T.y);
        if (!best || cost < best.c) best = { st, c: cost }; });
      NAV.stair = best ? best.st : WD.stairs[0];
    }
    const st = NAV.stair, p = st.p[W8.floor];
    leg = legTo(W8.floor, p[0], p[1]);
    const up = FLOORS.indexOf(T.f) > FLOORS.indexOf(W8.floor);
    msg = `➜ <b>${T.name}</b> is on the ${FLOOR_NAME[T.f].toLowerCase()}. Follow the arrows to the <b>${st.n}</b>, then press <b>${up ? "▲" : "▼"} ${FLOOR_NAME[T.f]}</b>.`;
  }
  document.getElementById("routeText").innerHTML = msg;
  NAV.path = leg && leg.pts.length > 1 ? leg.pts : null; NAV.pathFloor = W8.floor;
  NAV.dest = W8.floor === T.f ? [T.x, T.y] : (NAV.stair ? NAV.stair.p[W8.floor].slice(0, 2) : null);
}
function ensureNavMeshes() {
  if (NAV.mesh) return;
  const shape = new THREE.Shape(); shape.moveTo(0, 0.55); shape.lineTo(0.5, -0.15); shape.lineTo(0.22, -0.15); shape.lineTo(0, 0.2); shape.lineTo(-0.22, -0.15); shape.lineTo(-0.5, -0.15); shape.closePath();
  const geo = new THREE.ShapeGeometry(shape);
  NAV.mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xff6a2b, toneMapped: false, fog: false, transparent: true, opacity: 0.95, side: THREE.DoubleSide }), 400);
  NAV.mesh.frustumCulled = false; NAV.mesh.renderOrder = 5; scene.add(NAV.mesh);
  const c = document.createElement("canvas"); c.width = 128; c.height = 180; const g = c.getContext("2d");
  g.fillStyle = "#ff6a2b"; g.beginPath(); g.arc(64, 60, 52, Math.PI, 0); g.lineTo(64, 176); g.closePath(); g.fill();
  g.fillStyle = "#fff"; g.beginPath(); g.arc(64, 60, 22, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  NAV.pin = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, toneMapped: false, fog: false }));
  NAV.pin.center.set(0.5, 0); NAV.pin.scale.set(2.2, 3.1, 1); NAV.pin.renderOrder = 1001; scene.add(NAV.pin);
}
function navStep(dt) {
  if (!NAV.target || !W8.on) { if (NAV.mesh) { NAV.mesh.visible = false; NAV.pin.visible = false; } return; }
  ensureNavMeshes();
  NAV.t += dt; NAV.recalc = (NAV.recalc || 0) + dt;
  if (NAV.recalc > 0.45 || NAV.pathFloor !== W8.floor) { NAV.recalc = 0; computeRoute(); }
  if (NAV.arrived && performance.now() - NAV.arrived > 4500) { clearRoute(); return; }
  const m = NAV.mesh, P = NAV.path; let n = 0;
  if (P) {
    const step = 1.6, off = (NAV.t * 2.4) % step, q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), M = new THREE.Matrix4();
    const segs = []; let tot = 0;
    for (let i = 0; i < P.length - 1; i++) { const L = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]); segs.push([P[i], P[i + 1], tot, L]); tot += L; }
    let si = 0;
    for (let dist = 1.4 + (step - off); dist < tot - 0.8 && n < 400; dist += step) {
      while (si < segs.length - 1 && dist > segs[si][2] + segs[si][3]) si++;
      const [[ax, ay], [bx, by], s0, L] = segs[si], t = L ? (dist - s0) / L : 0;
      const x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
      q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.atan2(bx - ax, by - ay));
      M.compose(new THREE.Vector3(x, y, fflAt(W8.floor, x, y) + 0.09), q, s); m.setMatrixAt(n++, M);
    }
  }
  m.count = n; m.instanceMatrix.needsUpdate = true; m.visible = n > 0;
  if (NAV.dest && !NAV.arrived) { NAV.pin.visible = true; NAV.pin.position.set(NAV.dest[0], NAV.dest[1], fflAt(W8.floor, NAV.dest[0], NAV.dest[1]) + 3.2); }
  else NAV.pin.visible = false;
}
function walkToRoom(f, id) {
  const rm = WD.floors[f].rooms[id - 1];
  const go = () => { const i = nearestStand(f, rm.x, rm.y, id); const x = (i % WD.W + 0.5) * WD.C, y = (((i / WD.W) | 0) + 0.5) * WD.C;
    fadeTo(() => placeAt(f, x, y, Math.atan2(rm.x - x, rm.y - y) || W8.yaw, 0)); };
  if (!W8.on) { enterWalk(); setTimeout(go, 50); } else go();
}
