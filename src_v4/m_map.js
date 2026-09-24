// ---------------------------------------------------------------- building map (v3.3, v3.4)
// Every named room gets a label: tried at the drawing's label position, then at the room's inner point, font
// shrinking to 9 px; a room that still does not fit gets a numbered marker and is listed beside the map.
// Zoom (wheel, pinch, + / -) and pan (drag). The registered drawing (A-111 / A-112 / A-113) can be laid under
// the colours. Notes from the drawings (CB booths, 4S / 6S, exits, voids, counters) are shown when they fit.
DM.z = 1; DM.cx = null; DM.cy = null; DM.under = false; DM.uimg = {}; DM.hits = []; DM.more = [];
// the list panel starts folded on narrower screens so it does not sit on the plan (one click opens it)
DM.moreMin = innerWidth < 1300;
const NOTE_STYLE = { exit: ["italic 600", "#c0392b"], void: ["italic 500", "#4a5560"], booth: ["600", "#44505b"],
  mark: ["italic 500", "#5b6670"], landing: ["600", "#1b1f23"], room: ["600", "#1b1f23"], passage: ["italic 500", "#4a5560"] };
function mapPW() { return WD.W * WD.C; } function mapPH() { return WD.H * WD.C; }
function mapXY(x, y) { return [DM.ox + x * DM.s, DM.oy + (mapPH() - y) * DM.s]; }
function mapFT(sx, sy) { return [(sx - DM.ox) / DM.s, mapPH() - (sy - DM.oy) / DM.s]; }
function mapView(box) {
  const PW = mapPW(), PH = mapPH();
  const base = Math.min((box.width - 24) / PW, (box.height - 24) / PH);
  DM.base = base; DM.s = base * DM.z;
  if (DM.cx == null) { DM.cx = PW / 2; DM.cy = PH / 2; }
  // keep some of the plan on screen
  const hx = box.width / 2 / DM.s, hy = box.height / 2 / DM.s;
  DM.cx = DM.z <= 1.001 ? PW / 2 : Math.min(Math.max(DM.cx, Math.min(hx, PW / 2) - 10), Math.max(PW - hx, PW / 2) + 10);
  DM.cy = DM.z <= 1.001 ? PH / 2 : Math.min(Math.max(DM.cy, Math.min(hy, PH / 2) - 10), Math.max(PH - hy, PH / 2) + 10);
  DM.ox = box.width / 2 - DM.cx * DM.s; DM.oy = box.height / 2 - (PH - DM.cy) * DM.s;
}
function mapUnder(k) {
  if (!ARCH_UNDER[k]) return null;
  if (!DM.uimg[k]) { const im = new Image(); im.onload = () => { if (!document.getElementById("dirMap").hidden) drawMap(); }; im.src = ARCH_UNDER[k]; DM.uimg[k] = im; }
  return DM.uimg[k].complete && DM.uimg[k].naturalWidth ? DM.uimg[k] : null;
}
function shortDim(d) { return (d || "").split(" · ")[0].replace(/ \(.*$/, ""); }
function drawMap() {
  const cv = document.getElementById("dmCanvas"), box = cv.parentElement.getBoundingClientRect(), dpr = Math.min(devicePixelRatio, 2);
  cv.width = box.width * dpr; cv.height = box.height * dpr; cv.style.width = box.width + "px"; cv.style.height = box.height + "px";
  const g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, box.width, box.height);
  mapView(box);
  const PW = mapPW(), PH = mapPH(), k = DM.floor, rooms = WD.floors[k].rooms, notes = WD.floors[k].notes || [];
  g.imageSmoothingEnabled = false; g.drawImage(mapBase(k), DM.ox, DM.oy, PW * DM.s, PH * DM.s);
  const U = DM.under ? mapUnder(k) : null;
  if (U) {
    const F = ARCH_DATA.frame, [ux, uy] = mapXY(F.x0, F.y1);
    g.save(); g.imageSmoothingEnabled = true; g.globalCompositeOperation = "multiply"; g.globalAlpha = 0.95;
    g.drawImage(U, ux, uy, (F.x1 - F.x0) * DM.s, (F.y1 - F.y0) * DM.s); g.restore();
  }
  const cs = DM.s * WD.C;
  // highlight hover / selection
  [DM.hover, DM.sel].forEach((id, j) => {
    if (!id || (j === 0 && DM.sel && DM.sel.f === k && DM.sel.id === id)) return;
    const rid = typeof id === "object" ? (id.f === k ? id.id : 0) : id; if (!rid) return;
    g.fillStyle = j ? "rgba(217,87,40,0.5)" : "rgba(47,93,124,0.26)";
    for (let r = 0; r < WD.H; r++) for (let c = 0; c < WD.W; c++) { const v = grid[k][r * WD.W + c]; if ((v & 255) === rid && !(v & 1024) && (v & 768)) 
      g.fillRect(DM.ox + c * cs, DM.oy + (WD.H - 1 - r) * cs, cs + 0.5, cs + 0.5); }
  });
  // stairs
  WD.stairs.forEach(st => {
    if (!st.f.includes(k)) return; const [x0, x1, y0, y1] = st.r; const [a, b] = mapXY(x0, y1);
    g.fillStyle = U ? "rgba(47,93,124,0.55)" : "#2f5d7c"; g.fillRect(a, b, (x1 - x0) * DM.s, (y1 - y0) * DM.s);
    g.fillStyle = "#fff"; g.font = "600 11px ui-sans-serif, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    const [cx, cy] = mapXY((x0 + x1) / 2, (y0 + y1) / 2); g.fillText("⇅", cx, cy - 6); g.fillText("Stairs", cx, cy + 7);
  });
  // ---- labels
  const placed = [], W = box.width, H = box.height, hits = DM.hits = [], more = DM.more = [];
  // keep labels out from under the overlays (the list panel as it was last drawn, the zoom buttons)
  [document.getElementById("dmMore"), document.getElementById("dmZoom")].forEach(el => { if (el && !el.hidden) {
    const q = el.getBoundingClientRect(), c0 = cv.getBoundingClientRect(); if (q.width) placed.push([q.left - c0.left - 4, q.top - c0.top - 4, q.width + 8, q.height + 8]); } });
  placed.push([4, 4, 40, 44], [4, H - 26, 110, 24]);        // north arrow and scale bar
  DM.nOverlay = placed.length;
  const free = (r) => r[0] >= 2 && r[1] >= 2 && r[0] + r[2] <= W - 2 && r[1] + r[3] <= H - 2 &&
    !placed.some(p => !(r[0] > p[0] + p[2] || r[0] + r[2] < p[0] || r[1] > p[1] + p[3] || r[1] + r[3] < p[1]));
  const zs = Math.min(1.35, Math.max(0.85, DM.s / 5.2));
  const pri = (rm) => rm.k === "circ" ? 2 : /Compound|Open strip|Open to sky/.test(rm.n) ? 1 : 0;
  const order = rooms.map((r, i) => [r, i + 1, r.a != null ? r.a : roomArea(k, i + 1)]).filter(([r]) => !/Compound/.test(r.n))
    .sort((a, b) => pri(a[0]) - pri(b[0]) || b[2] - a[2]);
  const text = (name, sub, x, y, fs, col, weight) => {
    g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = 3; g.strokeStyle = "rgba(255,255,255,0.9)";
    g.font = `${weight || 600} ${fs}px ui-sans-serif, system-ui, sans-serif`;
    const dy = sub ? -fs * 0.45 : 0;
    g.strokeText(name, x, y + dy); g.fillStyle = col || "#1b1f23"; g.fillText(name, x, y + dy);
    if (sub) { const f2 = Math.max(8.5, fs * 0.78); g.font = `500 ${f2}px ui-sans-serif, system-ui, sans-serif`;
      g.strokeText(sub, x, y + fs * 0.62); g.fillStyle = "#3d4750"; g.fillText(sub, x, y + fs * 0.62); }
  };
  const tryPlace = (name, sub, pts, fsMax, fsMin, weight) => {
    for (let fs = fsMax; fs >= fsMin - 0.01; fs -= 1) {
      for (const [px, py] of pts) {
        const [x, y] = mapXY(px, py);
        for (const withSub of (sub ? [true, false] : [false])) {
          g.font = `${weight || 600} ${fs}px ui-sans-serif, system-ui, sans-serif`;
          let w = g.measureText(name).width, h = fs + 4;
          if (withSub) { g.font = `500 ${Math.max(8.5, fs * 0.78)}px ui-sans-serif, system-ui, sans-serif`; w = Math.max(w, g.measureText(sub).width); h = fs * 2.05 + 4; }
          const r = [x - w / 2 - 3, y - h / 2, w + 6, h];
          if (free(r)) { placed.push(r); return { x, y, fs, sub: withSub ? sub : null, r }; }
        }
      }
    }
    return null;
  };
  const onScreen = (px, py) => { const [x, y] = mapXY(px, py); return x > 4 && y > 4 && x < W - 4 && y < H - 4; };
  // v3.4: markers never sit on a label. Pass 1 places every label it can; pass 2 finds each left-over room a free
  // spot for its number (inside the room first, then close by with a leader line); pass 3 the drawing notes.
  const failed = [];
  order.forEach(([rm, id, a]) => {
    const name = rm.n.replace(" (double height)", "").replace(" (open to sky)", "");
    const pts = [[rm.x, rm.y]]; if (rm.p) pts.push([rm.p[0], rm.p[1]]);
    if (!pts.some(p => onScreen(p[0], p[1]))) return;
    const fsMax = Math.round(Math.max(10, Math.min(15, 8 + Math.sqrt(Math.max(a, 1)) * 0.28)) * zs);
    const sub = DM.z >= 1.6 && rm.k !== "circ" ? shortDim(rm.d) : null;
    const circ = rm.k === "circ";
    const got = tryPlace(name, sub, pts, circ ? Math.min(fsMax, 12) : fsMax, circ ? 10 : 9, circ ? "italic 500" : 600);
    if (got) { text(name, got.sub, got.x, got.y, got.fs, circ ? "#4a5560" : "#1b1f23", circ ? "italic 500" : 600); hits.push([got.r, { f: k, id }]); return; }
    if (!circ) failed.push({ f: k, id, n: name, d: shortDim(rm.d), pts, inRoom: (x, y) => roomAt(k, x, y) === id });
  });
  const marker = (m) => {
    // candidate centres: the anchor and the inner point, then rings of 12 around them, 11 to 66 px out
    const cands = [];
    m.pts.forEach(([px, py]) => { const [x, y] = mapXY(px, py); cands.push([x, y, 0, x, y]);
      for (let rr = 11; rr <= 66; rr += 11) for (let j = 0; j < 12; j++) { const t = j / 12 * Math.PI * 2; cands.push([x + Math.cos(t) * rr, y + Math.sin(t) * rr, rr, x, y]); } });
    cands.sort((p, q) => p[2] - q[2]);
    const box = (c) => [c[0] - 9, c[1] - 9, 18, 18];
    let hit = cands.find(c => free(box(c)) && m.inRoom(...mapFT(c[0], c[1])));
    if (!hit) hit = cands.find(c => free(box(c)));
    if (!hit) return null;
    return hit;
  };
  failed.forEach(m => {
    more.push({ f: m.f, id: m.id, n: m.n, d: m.d }); const num = more.length;
    const c = marker(m); if (!c) return;                       // no free spot: listed only, never drawn over a label
    const [x, y, rr, ax, ay] = c;
    if (rr > 0 && !m.inRoom(...mapFT(x, y))) { g.save(); g.strokeStyle = "rgba(31,59,87,0.75)"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(ax, ay); g.lineTo(x, y); g.stroke();
      g.fillStyle = "#1f3b57"; g.beginPath(); g.arc(ax, ay, 2.4, 0, Math.PI * 2); g.fill(); g.restore(); }
    g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.fillStyle = "#1f3b57"; g.fill(); g.lineWidth = 1.5; g.strokeStyle = "#fff"; g.stroke();
    g.fillStyle = "#fff"; g.font = "700 9.5px ui-sans-serif, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(num), x, y + 0.5);
    const r = [x - 9, y - 9, 18, 18]; placed.push(r); hits.push([r, { f: m.f, id: m.id }]);
  });
  // notes from the drawings, smallest priority; rooms-like notes (a landing, a solid store) get a marker if needed
  notes.forEach((nt, i) => {
    if (!onScreen(nt.x, nt.y)) return;
    const [wt, col] = NOTE_STYLE[nt.t] || NOTE_STYLE.mark;
    const big = nt.t === "landing" || nt.t === "room";
    const fs0 = Math.round((big ? 12 : nt.t === "void" ? 12 : 10.5) * zs);
    const sub = big && DM.z >= 1.6 ? shortDim(nt.d) : null;
    const got = tryPlace(nt.n, sub, [[nt.x, nt.y]], fs0, big ? 9 : 9, wt);
    if (got) { text(nt.n, got.sub, got.x, got.y, got.fs, col, wt); hits.push([got.r, { f: k, note: i }]); return; }
    if (!big) return;
    more.push({ f: k, note: i, n: nt.n, d: shortDim(nt.d) }); const num = more.length;
    const c = marker({ pts: [[nt.x, nt.y]], inRoom: () => true }); if (!c) return;
    const [x, y] = c;
    g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.fillStyle = "#1f3b57"; g.fill(); g.lineWidth = 1.5; g.strokeStyle = "#fff"; g.stroke();
    g.fillStyle = "#fff"; g.font = "700 9.5px ui-sans-serif, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(num), x, y + 0.5);
    const r = [x - 9, y - 9, 18, 18]; placed.push(r); hits.push([r, { f: k, note: i }]);
  });
  DM.placedCheck = placed.slice();          // test hook: every label / marker rectangle drawn this frame
  // selected note: ring
  if (DM.sel && DM.sel.f === k && DM.sel.note != null) {
    const nt = notes[DM.sel.note]; if (nt) { const [x, y] = mapXY(nt.x, nt.y);
      g.beginPath(); g.arc(x, y, 14, 0, Math.PI * 2); g.lineWidth = 3; g.strokeStyle = "#d95728"; g.stroke(); }
  }
  if (k === "GF") {
    const [x, y] = mapXY(91.04, 1.04);
    g.fillStyle = "#d95728"; g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x - 8, y + 10); g.lineTo(x + 8, y + 10); g.closePath(); g.fill();
    g.font = "700 12px ui-sans-serif, system-ui, sans-serif"; g.textAlign = "center"; g.fillText("Main entrance", x, y + 22);
  }
  if (W8.on && W8.floor === k) {
    const [x, y] = mapXY(W8.x, W8.y);
    g.save(); g.translate(x, y); g.rotate(W8.yaw);
    g.fillStyle = "rgba(217,87,40,0.25)"; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 30, -Math.PI / 2 - 0.6, -Math.PI / 2 + 0.6); g.fill();
    g.fillStyle = "#d95728"; g.strokeStyle = "#fff"; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 7, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
    g.font = "700 12px ui-sans-serif, system-ui, sans-serif"; g.fillStyle = "#d95728"; g.textAlign = "center"; g.fillText("You are here", x, y - 16);
  }
  if (NAV.path && NAV.pathFloor === k) {
    g.strokeStyle = "#d95728"; g.lineWidth = 3; g.setLineDash([6, 5]); g.beginPath();
    NAV.path.forEach(([px, py], i) => { const [a, b] = mapXY(px, py); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.stroke(); g.setLineDash([]);
  }
  // north + scale (fixed to the canvas corner)
  g.fillStyle = "#1b1f23"; g.font = "700 13px ui-sans-serif, system-ui, sans-serif"; g.textAlign = "center";
  g.fillText("N", 22, 18); g.beginPath(); g.moveTo(22, 24); g.lineTo(16, 40); g.lineTo(28, 40); g.closePath(); g.fill();
  const step = DM.s * 10 < 40 ? 20 : DM.s * 10 > 140 ? 5 : 10, sb = step * DM.s;
  g.fillRect(12, H - 16, sb, 4); g.textAlign = "left"; g.font = "600 11px ui-sans-serif, system-ui, sans-serif";
  g.fillText(`${step} ft`, 16 + sb, H - 13);
  // list of rooms that only got a number
  const mb = document.getElementById("dmMore");
  if (mb) {
    if (!more.length) mb.hidden = true;
    else { mb.hidden = false;
      mb.classList.toggle("min", !!DM.moreMin);
      mb.innerHTML = `<b title="Show / hide the list">Zoom in to read these (${more.length}) <em>${DM.moreMin ? "▸" : "▾"}</em></b>` + more.map((m, i) => `<button data-i="${i}"><i>${i + 1}</i>${m.n}${m.d ? ` <span>${m.d}</span>` : ""}</button>`).join("");
      mb.querySelector("b").onclick = () => { DM.moreMin = !DM.moreMin; drawMap(); };
      mb.querySelectorAll("button").forEach(b => b.onclick = () => { const m = more[+b.dataset.i]; m.note != null ? selectNote(m.f, m.note, true) : selectRoom(m.f, m.id, true); }); }
  }
  const zl = document.getElementById("dmZoomLevel"); if (zl) zl.textContent = `${Math.round(DM.z * 100)}%`;
}
function mapHit(ev) {
  const r = ev.currentTarget.getBoundingClientRect(), sx = ev.clientX - r.left, sy = ev.clientY - r.top;
  for (let i = DM.hits.length - 1; i >= 0; i--) { const [q, t] = DM.hits[i]; if (sx >= q[0] && sx <= q[0] + q[2] && sy >= q[1] && sy <= q[1] + q[3]) return t; }
  const [x, y] = mapFT(sx, sy);
  let id = roomAt(DM.floor, x, y);
  if (!id) { for (let d = 0.5; d <= 2 && !id; d += 0.5) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) { id = id || roomAt(DM.floor, x + dx, y + dy); } }
  return id ? { f: DM.floor, id } : null;
}
function roomAtMap(ev) { const h = mapHit(ev); return h && h.id ? h.id : 0; }
function mapFocus(x, y, zmin) { DM.cx = x; DM.cy = y; if (zmin) DM.z = Math.max(DM.z, zmin); }
function selectRoom(f, id, focus) {
  DM.floor = f; DM.sel = { f, id }; syncMapTabs();
  const rm = WD.floors[f].rooms[id - 1];
  if (focus) mapFocus(rm.x, rm.y, (rm.a || roomArea(f, id)) < 160 ? 3 : 2);
  document.getElementById("dmName").textContent = rm.n;
  document.getElementById("dmInfo").textContent = [FLOOR_NAME[f], rm.d].filter(Boolean).join(" · ");
  document.getElementById("dmCard").hidden = false;
  drawMap(); requestAnimationFrame(drawMap);
}
function noteRoom(f, nt) {
  let id = roomAt(f, nt.x, nt.y);
  if (!id) { let best = 1e9; WD.floors[f].rooms.forEach((rm, i) => { const d = Math.hypot(rm.x - nt.x, rm.y - nt.y); if (d < best && rm.k !== "outdoor") { best = d; id = i + 1; } }); }
  return id;
}
function selectNote(f, i, focus) {
  const nt = WD.floors[f].notes[i]; const id = noteRoom(f, nt);
  DM.floor = f; DM.sel = { f, id, note: i }; syncMapTabs();
  if (focus) mapFocus(nt.x, nt.y, 3);
  const inRm = id ? WD.floors[f].rooms[id - 1].n : null;
  document.getElementById("dmName").textContent = nt.n;
  document.getElementById("dmInfo").textContent = [FLOOR_NAME[f], nt.d, inRm && inRm !== nt.n ? `in / next to ${inRm}` : null].filter(Boolean).join(" · ");
  document.getElementById("dmCard").hidden = false;
  drawMap(); requestAnimationFrame(drawMap);
}
function mapZoom(f, sx, sy) {
  const cv = document.getElementById("dmCanvas"), box = cv.getBoundingClientRect();
  if (sx == null) { sx = box.width / 2; sy = box.height / 2; }
  const [fx, fy] = mapFT(sx, sy);
  DM.z = Math.min(8, Math.max(1, DM.z * f));
  mapView(box);
  // keep the point under the pointer where it was
  const [nx, ny] = mapFT(sx, sy); DM.cx += fx - nx; DM.cy += fy - ny;
  drawMap();
}
function bindMap() {
  const cv = document.getElementById("dmCanvas");
  // zoom / pan / pinch
  const ptrs = new Map(); let drag = null, moved = false, pinch = null;
  cv.addEventListener("wheel", (e) => { e.preventDefault(); const r = cv.getBoundingClientRect(); mapZoom(Math.exp(-e.deltaY * 0.0016), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  cv.addEventListener("pointerdown", (e) => { ptrs.set(e.pointerId, [e.clientX, e.clientY]); cv.setPointerCapture(e.pointerId); moved = false;
    if (ptrs.size === 1) drag = { x: e.clientX, y: e.clientY, cx: DM.cx, cy: DM.cy };
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: DM.z }; drag = null; } });
  cv.addEventListener("pointermove", (e) => {
    if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); const r = cv.getBoundingClientRect();
      mapZoom((pinch.z * d / pinch.d) / DM.z, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top); moved = true; return; }
    if (drag && ptrs.size === 1) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.hypot(dx, dy) > 4) moved = true;
      if (moved && DM.z > 1.001) { DM.cx = drag.cx - dx / DM.s; DM.cy = drag.cy + dy / DM.s; cv.style.cursor = "grabbing"; drawMap(); return; } }
    const h = mapHit(e), id = h && h.note == null ? h.id : null;
    if (id !== DM.hover) { DM.hover = id; drawMap(); }
    cv.title = h ? (h.note != null ? WD.floors[DM.floor].notes[h.note].n : WD.floors[DM.floor].rooms[h.id - 1].n) : "";
  });
  const up = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) { cv.style.cursor = "";
      if (!moved && drag) { if (DM.pickCb) { const r = cv.getBoundingClientRect(), [fx, fy] = mapFT(e.clientX - r.left, e.clientY - r.top); DM.pickCb(DM.floor, fx, fy); }
        else { const h = mapHit(e); if (h) h.note != null ? selectNote(h.f, h.note) : selectRoom(h.f, h.id); } } drag = null; } };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  cv.addEventListener("pointerleave", () => { if (DM.hover) { DM.hover = null; drawMap(); } });
  document.getElementById("dmZin").onclick = () => mapZoom(1.5);
  document.getElementById("dmZout").onclick = () => mapZoom(1 / 1.5);
  document.getElementById("dmZfit").onclick = () => { DM.z = 1; DM.cx = DM.cy = null; drawMap(); };
  const ud = document.getElementById("dmUnder"); if (ud) ud.onchange = () => { DM.under = ud.checked; drawMap(); };
  document.querySelectorAll("#dmTabs button").forEach(b => b.onclick = () => { DM.floor = b.dataset.f; DM.hover = null; syncMapTabs(); drawMap(); });
  document.getElementById("dmClose").onclick = closeMap;
  document.querySelectorAll(".openMap").forEach(b => b.onclick = () => openMap());
  addEventListener("resize", () => { if (!document.getElementById("dirMap").hidden) drawMap(); });
  if (window.ResizeObserver) new ResizeObserver(() => { if (!document.getElementById("dirMap").hidden) drawMap(); }).observe(document.querySelector(".dm-body"));
  addEventListener("keydown", (e) => { if (e.code === "KeyM" && W8.on && document.activeElement.tagName !== "INPUT") { const h = document.getElementById("dirMap").hidden; h ? openMap() : closeMap(); } });
  // search: every room with its drawn size, and the notes from the drawings
  const dl = document.getElementById("dmList"), seen = new Set(), index = DM.index = [];
  FLOORS.forEach(f => {
    WD.floors[f].rooms.forEach((rm, i) => {
      if (/Compound/.test(rm.n)) return;
      const sz = shortDim(rm.d);
      let label = `${rm.n}${sz && /\d'/.test(sz) ? " · " + sz : ""} — ${FLOOR_NAME[f]}`; if (seen.has(label)) label += ` (${Math.round(rm.x)}, ${Math.round(rm.y)})`; seen.add(label);
      index.push([label, f, i + 1, null]); const o = document.createElement("option"); o.value = label; dl.appendChild(o);
    });
    (WD.floors[f].notes || []).forEach((nt, i) => {
      if (nt.t === "booth" && /^CB$/.test(nt.n)) { if (seen.has("CB|" + f)) return; seen.add("CB|" + f); }
      const sz = shortDim(nt.d);
      let label = `${nt.n}${sz && /\d'/.test(sz) ? " · " + sz : ""} — ${FLOOR_NAME[f]} (drawing note)`; if (seen.has(label)) label += ` (${Math.round(nt.x)}, ${Math.round(nt.y)})`; seen.add(label);
      index.push([label, f, null, i]); const o = document.createElement("option"); o.value = label; dl.appendChild(o);
    });
  });
  const inp = document.getElementById("dmSearch");
  const find = (q) => { q = q.toLowerCase().trim(); if (!q) return null;
    return index.find(r => r[0] === inp.value) || index.find(r => r[0].toLowerCase().startsWith(q)) || index.find(r => r[0].toLowerCase().includes(q)); };
  inp.addEventListener("change", () => { const hit = find(inp.value); if (hit) { hit[3] != null ? selectNote(hit[1], hit[3], true) : selectRoom(hit[1], hit[2], true); inp.blur(); } });
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { const hit = find(inp.value); if (hit) { hit[3] != null ? selectNote(hit[1], hit[3], true) : selectRoom(hit[1], hit[2], true); inp.blur(); } } });
  document.getElementById("dmWalk").onclick = () => { const s = DM.sel; if (!s || !s.id) return; closeMap(); walkToRoom(s.f, s.id); };
  document.getElementById("dmRoute").onclick = () => { const s = DM.sel; if (!s || !s.id) return; closeMap(); if (!W8.on) enterWalk(); setRoute(s.f, s.id); };
  document.getElementById("routeCancel").onclick = clearRoute;
}
