// ================================================================ MOBILE & TOUCH (v4.0)
// Bottom sheet for the controls on phones, a compact top bar with a menu, walk-mode touch buttons (run, floor up /
// down), double-tap to zoom in orbit views, snap-to-wall for the tape measure, stable resizing.
const MOB = { phone: false, sheet: "peek", mq: null, menu: [] };
function isPhoneLayout() { return matchMedia("(max-width: 820px), (max-height: 500px) and (pointer: coarse)").matches; }
function mobInit() {
  // header buttons: icon + long label (desktop) + short label (phones)
  const lab = (id, ic, long, short) => { const b = document.getElementById(id); if (!b) return;
    b.innerHTML = `<span class="ic" aria-hidden="true">${ic}</span><span class="lbl"> ${long}</span>${short ? `<span class="sl"> ${short}</span>` : ""}`; b.setAttribute("aria-label", long); };
  lab("mapBtn", "🗺", "Building map", ""); lab("walkBtn", "🚶", "Walk inside", "Walk"); lab("archBtn", "📐", "Architect view", ""); lab("flyBtn", "✈", "Fly", "");
  const css = document.createElement("style");
  css.textContent = `.sl{display:none} @media (max-width:820px),(max-height:500px) and (pointer:coarse){ .sl{display:inline} } .phoneOnly{display:none!important}
    @media (max-width:820px),(max-height:500px) and (pointer:coarse){ .phoneOnly{display:flex!important} }`;
  document.head.appendChild(css);
  // "more" menu (all widths): features that do not need a permanent button
  const hud = document.getElementById("hud"), walkBtn = document.getElementById("walkBtn");
  const more = document.createElement("button"); more.id = "moreBtn"; more.setAttribute("aria-label", "More"); more.setAttribute("aria-haspopup", "true"); more.setAttribute("aria-expanded", "false");
  more.innerHTML = `<span aria-hidden="true">☰</span>`; hud.appendChild(more);
  const menu = document.createElement("div"); menu.id = "topMenu"; menu.setAttribute("role", "menu"); document.body.appendChild(menu);
  more.onclick = (e) => { e.stopPropagation(); const o = !menu.classList.contains("open"); menu.classList.toggle("open", o); more.setAttribute("aria-expanded", String(o)); if (o) menuRender(); };
  addEventListener("pointerdown", (e) => { if (menu.classList.contains("open") && !menu.contains(e.target) && e.target !== more && !more.contains(e.target)) { menu.classList.remove("open"); more.setAttribute("aria-expanded", "false"); } }, true);
  menuAdd({ id: "mArch", icon: "📐", label: () => ARCH.on ? "Leave architect view" : "Architect view", phoneOnly: true, hidden: () => W8.on, run: () => setMode(ARCH.on ? "material" : "arch") });
  menuAdd({ id: "mFly", icon: "✈", label: "Fly over and through", phoneOnly: true, hidden: () => W8.on, run: () => startFlyThrough() });
  // bottom sheet: wrap the panel content, add a handle
  const panel = document.getElementById("panel");
  const body = document.createElement("div"); body.className = "sheetBody";
  while (panel.firstChild) body.appendChild(panel.firstChild);
  const h = document.createElement("div"); h.id = "sheetHandle"; h.setAttribute("role", "button"); h.setAttribute("tabindex", "0"); h.setAttribute("aria-label", "Show or hide the controls");
  h.innerHTML = `<i></i><span>Views · Light · Quality</span>`;
  panel.appendChild(h); panel.appendChild(body);
  sheetGestures(panel, h);
  MOB.mq = matchMedia("(max-width: 820px), (max-height: 500px) and (pointer: coarse)");
  const apply = () => mobLayout(MOB.mq.matches); MOB.mq.addEventListener ? MOB.mq.addEventListener("change", apply) : MOB.mq.addListener(apply); apply();
  walkTouchButtons();
  // walk mode on phones: a menu button in the walk bar; architect / night / tour move into the menu
  const wt = document.querySelector("#walkTop .wgroup");
  if (wt) { const wm = document.createElement("button"); wm.className = "wbtn"; wm.id = "walkMore"; wm.setAttribute("aria-label", "More"); wm.innerHTML = "☰";
    wm.onclick = (e) => { e.stopPropagation(); const o = !menu.classList.contains("open"); menu.classList.toggle("open", o); if (o) menuRender(); };
    wt.appendChild(wm); }
  const wl = (id, ic, t) => { const b = document.getElementById(id); if (b) { b.innerHTML = `${ic}<span class="wlbl"> ${t}</span>`; b.setAttribute("aria-label", t); } };
  wl("walkExit", "✕", "Exit walk"); const mb = document.querySelector("#walkTop .openMap"); if (mb) { mb.innerHTML = `🗺<span class="wlbl"> Map</span>`; mb.setAttribute("aria-label", "Building map"); }
  menuAdd({ id: "mWArch", icon: "📐", label: "Architect view", group: "walk", phoneOnly: true, hidden: () => !W8.on, run: () => document.getElementById("walkArch").click() });
  menuAdd({ id: "mWDay", icon: "☾", label: () => (document.getElementById("walkDay") || {}).textContent || "Day / night", group: "walk", phoneOnly: true, hidden: () => !W8.on, run: () => document.getElementById("walkDay").click() });
  menuAdd({ id: "mWTour", icon: "★", label: "Guided tour", group: "walk", phoneOnly: true, hidden: () => !W8.on, run: () => document.getElementById("walkTour").click() });
  // the menu closes when the view changes
  const close = () => { menu.classList.remove("open"); more.setAttribute("aria-expanded", "false"); };
  new MutationObserver(close).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  orbitDoubleTap();
  // keyboard hint texts that are built in code get a touch version
  const fh = window.showFlyHint;
}
function menuAdd(item) { MOB.menu = MOB.menu.filter(m => m.id !== item.id); MOB.menu.push(item); menuRender(); }
function menuRender() {
  const menu = document.getElementById("topMenu"); if (!menu) return;
  const lang = (typeof L10N !== "undefined" && L10N.ur) ? "ur" : "en";
  menu.innerHTML = "";
  let lastGroup = null;
  MOB.menu.forEach(m => {
    if (m.hidden && m.hidden()) return;
    if (lastGroup !== null && m.group !== lastGroup) menu.appendChild(document.createElement("hr"));
    lastGroup = m.group;
    const b = document.createElement("button"); b.setAttribute("role", "menuitem"); b.id = m.id;
    if (m.phoneOnly) b.classList.add("phoneOnly");
    const label = typeof m.label === "function" ? m.label() : m.label;
    b.innerHTML = `<span class="mi" aria-hidden="true">${m.icon || ""}</span><span>${label}</span>`;
    b.onclick = () => { menu.classList.remove("open"); document.getElementById("moreBtn").setAttribute("aria-expanded", "false"); m.run(); };
    menu.appendChild(b);
  });
}
function mobLayout(phone) {
  MOB.phone = phone; document.body.classList.toggle("phoneUI", phone);
  const panel = document.getElementById("panel"), tb = document.getElementById("timebar"), body = panel.querySelector(".sheetBody");
  if (phone) { if (tb && tb.parentElement !== body) body.insertBefore(tb, body.firstChild); sheetSet(MOB.sheet || "peek"); }
  else { if (tb && tb.parentElement === body) document.getElementById("app").appendChild(tb); panel.classList.remove("half", "full"); panel.style.transform = ""; }
  invalidate(800);
}
function sheetSet(state) {
  const panel = document.getElementById("panel"); MOB.sheet = state;
  panel.classList.toggle("half", state === "half"); panel.classList.toggle("full", state === "full"); panel.style.transform = "";
  const h = document.getElementById("sheetHandle"); if (h) h.setAttribute("aria-expanded", String(state !== "peek"));
}
function sheetGestures(panel, handle) {
  let y0 = 0, t0 = 0, start = 0, drag = false, moved = false;
  const H = () => panel.getBoundingClientRect().height, peek = () => 62;
  const posOf = (s) => s === "full" ? 0 : s === "half" ? H() * 0.46 : H() - peek();
  const down = (e) => { if (!MOB.phone) return; drag = true; moved = false; y0 = e.clientY; t0 = performance.now(); start = posOf(MOB.sheet); panel.classList.add("dragging"); handle.setPointerCapture && handle.setPointerCapture(e.pointerId); };
  const move = (e) => { if (!drag) return; const dy = e.clientY - y0; if (Math.abs(dy) > 4) moved = true;
    const y = Math.min(H() - peek(), Math.max(0, start + dy)); panel.style.transform = `translateY(${y}px)`; };
  const up = (e) => { if (!drag) return; drag = false; panel.classList.remove("dragging");
    if (!moved) { sheetSet(MOB.sheet === "peek" ? "half" : "peek"); return; }
    const dy = e.clientY - y0, v = dy / Math.max(1, performance.now() - t0), y = Math.min(H() - peek(), Math.max(0, start + dy));
    let s; if (v < -0.5) s = MOB.sheet === "peek" ? "half" : "full"; else if (v > 0.5) s = MOB.sheet === "full" ? "half" : "peek";
    else { const c = [["full", 0], ["half", H() * 0.46], ["peek", H() - peek()]]; s = c.sort((a, b) => Math.abs(a[1] - y) - Math.abs(b[1] - y))[0][0]; }
    sheetSet(s); };
  handle.addEventListener("pointerdown", down); handle.addEventListener("pointermove", move); handle.addEventListener("pointerup", up); handle.addEventListener("pointercancel", up);
  handle.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sheetSet(MOB.sheet === "peek" ? "half" : MOB.sheet === "half" ? "full" : "peek"); } });
  // pick a view or a mode on a phone: fold the sheet so the model is visible
  panel.addEventListener("click", (e) => { if (MOB.phone && e.target.closest("#views button, #modes button")) setTimeout(() => sheetSet("peek"), 120); });
}
// walk mode on touch screens: run toggle and floor up / down next to the joystick
function walkTouchButtons() {
  const css = document.createElement("style");
  css.textContent = `#walkTouch{display:none;position:fixed;right:calc(12px + env(safe-area-inset-right,0px));bottom:calc(154px + env(safe-area-inset-bottom,0px));z-index:7;flex-direction:column;gap:8px}
    #walkTouch .wbtn{width:56px;height:52px;padding:0;font-size:13px;line-height:1.1;display:flex;flex-direction:column;align-items:center;justify-content:center}
    #walkTouch .wbtn b{font-size:17px}
    @media (pointer:coarse){ body.walking:not(.flying) #walkTouch{display:flex} }
    body.walking.tour #walkTouch{display:none!important}`;
  document.head.appendChild(css);
  const w = document.createElement("div"); w.id = "walkTouch";
  w.innerHTML = `<button class="wbtn" id="wtUp" aria-label="Go up one floor"><b>▲</b>Floor</button><button class="wbtn" id="wtDn" aria-label="Go down one floor"><b>▼</b>Floor</button><button class="wbtn" id="wtRun" aria-label="Run" aria-pressed="false"><b>🏃</b>Run</button>`;
  document.getElementById("walkUI").appendChild(w);
  const floorStep = (d) => { const fi = FLOORS.indexOf(W8.floor), t = FLOORS[fi + d]; if (!t) { perfToast(d > 0 ? "This is the top floor." : "This is the ground floor.", 1800); return; }
    // the nearest stair that serves both floors
    let best = null; WD.stairs.forEach(st => { if (!st.f.includes(W8.floor) || !st.f.includes(t)) return; const p = st.p[W8.floor]; const dd = Math.hypot(p[0] - W8.x, p[1] - W8.y); if (!best || dd < best.d) best = { st, d: dd }; });
    if (!best) { perfToast("No stair here goes there.", 1800); return; }
    goFloor(t, best.st); perfToast(`${best.st.n} → ${FLOOR_NAME[t]}`, 1800); };
  document.getElementById("wtUp").onclick = () => floorStep(1);
  document.getElementById("wtDn").onclick = () => floorStep(-1);
  const run = document.getElementById("wtRun");
  run.onclick = () => { const on = !W8.keys.ShiftLeft; W8.keys.ShiftLeft = on; run.classList.toggle("on", on); run.setAttribute("aria-pressed", String(on)); };
}
// orbit views: double-tap (touch) or double-click (mouse) zooms towards the point
function orbitDoubleTap() {
  const cv = renderer.domElement; let lastT = 0, lx = 0, ly = 0, anim = null;
  const zoomAt = (cx, cy) => {
    if (W8.on) return;
    const r = cv.getBoundingClientRect(), ndc = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    const rc = new THREE.Raycaster(); rc.setFromCamera(ndc, camera);
    const vis = (o) => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
    const hits = rc.intersectObjects(root.children, true).filter(h => vis(h.object) && !(h.object.material && h.object.material.transparent));
    const p = hits.length ? hits[0].point : controls.target.clone().add(rc.ray.direction.clone().multiplyScalar(20));
    const t0 = controls.target.clone(), c0 = camera.position.clone(), t1 = p.clone(), off = c0.clone().sub(t0);
    const c1 = t1.clone().add(off.multiplyScalar(0.5)); const T0 = performance.now();
    cancelAnimationFrame(anim);
    const step = () => { const k = Math.min(1, (performance.now() - T0) / 450), e = 1 - Math.pow(1 - k, 3);
      controls.target.lerpVectors(t0, t1, e); camera.position.lerpVectors(c0, c1, e); controls.update(); invalidate(300);
      if (k < 1) anim = requestAnimationFrame(step); };
    step();
  };
  cv.addEventListener("pointerup", (e) => {
    if (e.pointerType !== "touch" || W8.on || (typeof ARCH !== "undefined" && ARCH.measure)) return;
    const now = performance.now();
    if (now - lastT < 320 && Math.hypot(e.clientX - lx, e.clientY - ly) < 30) { zoomAt(e.clientX, e.clientY); lastT = 0; return; }
    lastT = now; lx = e.clientX; ly = e.clientY;
  });
  cv.addEventListener("dblclick", (e) => { if (!W8.on && !(typeof ARCH !== "undefined" && ARCH.measure)) zoomAt(e.clientX, e.clientY); });
}
// tape measure: snap a floor point to the nearest wall face (or corner) of the current floor
function snapToWall(p, floor) {
  const CG = window.CLEAN_GEOM || {}, tol = matchMedia("(pointer: coarse)").matches ? 1.2 : 0.6;
  const boxes = [].concat(CG[floor + "_External_Walls"] || [], CG[floor + "_Internal_Walls"] || []);
  let bx = null, by = null, dx = tol, dy = tol;
  boxes.forEach(b => {
    if (p.z < b[2] - 0.5 || p.z > b[5] + 0.5) return;
    const inY = p.y > b[1] - tol && p.y < b[4] + tol, inX = p.x > b[0] - tol && p.x < b[3] + tol;
    if (inY) for (const x of [b[0], b[3]]) { const d = Math.abs(p.x - x); if (d < dx) { dx = d; bx = x; } }
    if (inX) for (const y of [b[1], b[4]]) { const d = Math.abs(p.y - y); if (d < dy) { dy = d; by = y; } }
  });
  let snapped = false;
  if (bx !== null) { p.x = bx; snapped = true; }
  if (by !== null) { p.y = by; snapped = true; }
  return snapped;
}
