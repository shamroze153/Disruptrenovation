// ================================================================ PERFORMANCE (v4.0)
// Quality levels, dynamic resolution, render-on-demand, baked sun shadows, a fixed pool of interior lights,
// floor culling in walk mode, frame stats. Tuned for a mid-range phone (Medium / Low) and a laptop (High).
const QPRESET = {
  high:   { det: 1.0, prDesk: 2.0, prPhone: 1.5, shadows: true,  shadowSize: 2048, soft: true,  lamps: 6, trim: 0, peopleOrbit: true,  adjFloors: true },
  medium: { det: 0.6, prDesk: 1.5, prPhone: 1.5, shadows: true,  shadowSize: 1024, soft: false, lamps: 2, trim: 1, peopleOrbit: true,  adjFloors: false },
  low:    { det: 0.4, prDesk: 1.0, prPhone: 1.25, shadows: false, shadowSize: 1024, soft: false, lamps: 0, trim: 2, peopleOrbit: false, adjFloors: false },
};
const QUAL = (() => {
  const url = new URLSearchParams(location.search);
  let pick = (url.get("q") || "").toLowerCase();
  try { if (!pick) pick = localStorage.getItem("d141.q") || ""; } catch (e) {}
  if (!(pick in QPRESET) && pick !== "auto") pick = "auto";
  const coarse = matchMedia("(pointer: coarse)").matches, minSide = Math.min(screen.width, screen.height);
  const mobileUA = /Android|iPhone|iPod|Mobile/i.test(navigator.userAgent), ipad = /iPad/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
  const phone = (coarse || mobileUA) && minSide < 600 && !ipad, tablet = !phone && (ipad || (coarse && minSide >= 600));
  const mem = navigator.deviceMemory || (phone ? 4 : 8), cores = navigator.hardwareConcurrency || 4;
  const autoLevel = phone ? (mem >= 8 && cores >= 8 ? "medium" : "low") : tablet ? "medium" : (mem <= 4 || cores <= 4 ? "medium" : "high");
  const Q = { pick, device: phone ? "phone" : tablet ? "tablet" : "desktop", autoLevel, mem, cores };
  Q.level = pick === "auto" ? autoLevel : pick;
  Object.assign(Q, QPRESET[Q.level]);
  Q.aa = Q.level === "high" || (Q.device === "desktop" && Q.level === "medium");     // antialias is fixed when the context is made
  Q.target = Q.device === "desktop" ? 60 : 30;
  Q.prMax = Q.device === "desktop" ? Q.prDesk : Q.prPhone;
  return Q;
})();
const DR = { scale: 1, min: 0.55, frames: [], lastAdj: 0, lastEval: 0 };
const RG = { dirtyUntil: 0, lastRender: 0, lastBeat: 0, camSig: "", hidden: document.hidden, renders: 0, fpsShown: 0, frameMs: 0 };
const SH = { sig: "", last: 0 };
const LP = { lights: [] };
function basePR() { return Math.min(devicePixelRatio || 1, QUAL.prMax); }
function applyPR() { if (renderer) renderer.setPixelRatio(basePR() * DR.scale); }
function invalidate(ms = 600) { RG.dirtyUntil = Math.max(RG.dirtyUntil, performance.now() + ms); }
function perfBindEvents() {
  document.addEventListener("visibilitychange", () => { RG.hidden = document.hidden; if (!RG.hidden) invalidate(1500); });
  ["pointerdown", "pointerup", "wheel", "keydown", "keyup", "touchstart", "touchend", "input", "change", "click"].forEach(ev =>
    addEventListener(ev, () => invalidate(1500), { capture: true, passive: true }));
  addEventListener("pointermove", () => invalidate(500), { capture: true, passive: true });
  addEventListener("resize", () => invalidate(1500));
  if (window.visualViewport) visualViewport.addEventListener("resize", () => invalidate(1500));
}
// renderer settings that follow the level (the context itself is made once)
function applyQualityToRenderer() {
  applyPR();
  renderer.shadowMap.enabled = QUAL.shadows;
  renderer.shadowMap.type = QUAL.soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  if (sun) {
    if (sun.shadow.mapSize.x !== QUAL.shadowSize) { sun.shadow.mapSize.set(QUAL.shadowSize, QUAL.shadowSize); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
    sun.castShadow = light.shadows !== false && QUAL.shadows;
  }
  lampPoolInit(QUAL.lamps);
  scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.needsUpdate = true); });
  SH.sig = ""; invalidate(2000);
}
async function setQuality(pick) {
  const was = { det: QUAL.det, trim: QUAL.trim, aa: QUAL.aa };
  QUAL.pick = pick; QUAL.level = pick === "auto" ? QUAL.autoLevel : pick;
  Object.assign(QUAL, QPRESET[QUAL.level]);
  QUAL.prMax = QUAL.device === "desktop" ? QUAL.prDesk : QUAL.prPhone;
  const aaWant = QUAL.level === "high" || (QUAL.device === "desktop" && QUAL.level === "medium");
  try { localStorage.setItem("d141.q", pick); } catch (e) {}
  DR.scale = 1; applyQualityToRenderer(); qualUI();
  if (was.det !== QUAL.det || was.trim !== QUAL.trim) { perfToast("Rebuilding furniture and people…"); await rebuildFurniture(p => perfToast(`Rebuilding furniture and people… ${Math.round(p * 100)}%`)); perfToast(""); }
  if (aaWant !== was.aa) perfToast(aaWant ? "Smoother edges (anti-aliasing) turn on the next time the viewer is opened." : "Anti-aliasing stays on until the viewer is opened again.", 5000);
  invalidate(2000);
}
// dynamic resolution: keep the frame rate at the target by lowering the render scale, then raising it again
function drSample(now, dt) {
  DR.frames.push([now, dt]); while (DR.frames.length && now - DR.frames[0][0] > 1500) DR.frames.shift();
  if (now - DR.lastEval < 1000 || DR.frames.length < 8) return;
  DR.lastEval = now;
  const span = (DR.frames[DR.frames.length - 1][0] - DR.frames[0][0]) / 1000, fps = (DR.frames.length - 1) / Math.max(span, 1e-3);
  if (fps < QUAL.target * 0.85 && DR.scale > DR.min) { DR.scale = Math.max(DR.min, DR.scale * 0.87); DR.lastAdj = now; applyPR(); }
  else if (fps > QUAL.target * 1.15 && DR.scale < 1 && now - DR.lastAdj > 2500) { DR.scale = Math.min(1, DR.scale * 1.07); DR.lastAdj = now; applyPR(); }
}
// interior lights: the level's fixed number of point lights follows the nearest lamps, so moving between floors or
// switching the lamps never changes the light count (a change would recompile every shader: the old "hang")
function lampPoolInit(n) {
  LP.lights.forEach(l => scene.remove(l)); LP.lights = [];
  for (let i = 0; i < n; i++) { const p = new THREE.PointLight(0xffcf96, 0, 28, 2); p.userData.pool = true; scene.add(p); LP.lights.push(p); }
}
function lampPoolUpdate() {
  if (!LP.lights.length) return;
  const on = lampGroup.visible, c = camera.position;
  const cand = on ? lampGroup.children.filter(l => l.visible).sort((a, b) => a.position.distanceToSquared(c) - b.position.distanceToSquared(c)) : [];
  LP.lights.forEach((p, i) => { const s = cand[i];
    if (s) { p.position.copy(s.position); p.color.copy(s.color); p.intensity = s.intensity; p.distance = s.distance; p.decay = s.decay; } else p.intensity = 0; });
}
// the sun's shadow map is drawn only when something that casts a shadow changes (time of day, a floor shown or hidden)
function shadowSig() {
  let s = `${sun.position.x.toFixed(1)},${sun.position.y.toFixed(1)},${sun.position.z.toFixed(1)},${sun.castShadow},${renderer.shadowMap.enabled},${mode}`;
  for (const k in groups) { const g = groups[k]; s += g.visible ? "1" : "0"; s += g.position.z | 0; s += g.children.length; }
  return s;
}
function shadowCheck(now) {
  const s = shadowSig(); if (s === SH.sig) return;
  if (light.playing && now - SH.last < 120) return;          // time-lapse: at most ~8 shadow updates a second
  SH.sig = s; SH.last = now; renderer.shadowMap.needsUpdate = true;
}
// what is drawn this frame: in walk mode only the current floor's furniture and people (plus the floors next to it on High)
const _cull = [];
function cullBegin() {
  _cull.length = 0;
  const hide = (o) => { if (o.visible) { o.visible = false; _cull.push(o); } };
  if (W8.on && !(W8.fly && W8.z > 38)) {
    const fi = FLOORS.indexOf(W8.floor);
    FLOORS.forEach((k, i) => { const g = groups[k + "_Furniture"]; if (g && !(i === fi || (QUAL.adjFloors && Math.abs(i - fi) === 1))) hide(g); });
  } else if (!QUAL.peopleOrbit && !ARCH.on && mode === "material") {
    FLOORS.forEach(k => { const g = groups[k + "_Furniture"]; if (g) g.children.forEach(o => { if (o.name && o.name.startsWith("P:")) hide(o); }); });
  }
  if (typeof wayCull === "function") wayCull(hide);
  if (typeof solarCullHide === "function") solarCullHide(hide);
}
function cullEnd() { _cull.forEach(o => o.visible = true); _cull.length = 0; }
// called from animate(): decides whether this frame needs drawing at all
function perfShouldRender(now) {
  if (RG.hidden) return false;
  const c = camera, sig = c.position.x.toFixed(3) + c.position.y.toFixed(3) + c.position.z.toFixed(3) + c.quaternion.x.toFixed(4) + c.quaternion.y.toFixed(4) + c.quaternion.z.toFixed(4) + c.fov;
  const moved = sig !== RG.camSig;
  if (moved || now < RG.dirtyUntil || light.playing) {
    if (!moved && !light.playing && now - RG.lastRender < 1000 / 30) return false;     // settling / idle: at most 30 fps
    RG.camSig = sig; return true;
  }
  if (now - RG.lastBeat > 1000) { RG.lastBeat = now; return true; }                       // 1 fps heartbeat when nothing happens
  return false;
}
function perfRendered(now) {
  const dt = RG.lastRender ? now - RG.lastRender : 16; RG.lastRender = now; RG.renders++;
  RG.frameMs = RG.frameMs * 0.9 + dt * 0.1;
  if (now < RG.dirtyUntil || light.playing) drSample(now, dt);
}
// ---- UI: quality buttons, stats overlay, toast
function perfToast(msg, ms) {
  let t = document.getElementById("perfToast");
  if (!t) { t = document.createElement("div"); t.id = "perfToast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.textContent = msg; t.classList.toggle("show", !!msg);
  clearTimeout(t._h); if (msg && ms) t._h = setTimeout(() => t.classList.remove("show"), ms);
}
function qualUI() {
  document.querySelectorAll("#qualBtns button").forEach(b => b.classList.toggle("on", b.dataset.q === QUAL.pick));
  const n = document.getElementById("qualNote");
  if (n) n.textContent = (QUAL.pick === "auto" ? `Auto chose ${QUAL.level} for this ${QUAL.device}. ` : "") + ({ high: "Full detail, soft shadows.", medium: "Lighter models, sharp shadows.", low: "Lightest: no shadows, fewer props." }[QUAL.level]);
}
function perfBuildUI() {
  const css = document.createElement("style");
  css.textContent = `#qualBtns{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
#qualBtns button{font:inherit;font-size:12.5px;padding:7px 4px;border-radius:8px;border:1px solid var(--line);background:transparent;color:var(--ink);cursor:pointer;min-height:36px}
#qualBtns button.on{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
#qualNote{font-size:11.5px;color:var(--muted);margin:5px 0 2px;line-height:1.35}
#perfHud{position:fixed;left:50%;top:calc(8px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:30;font:600 11px/1.3 ui-monospace,Menlo,Consolas,monospace;
  background:rgba(20,26,32,.8);color:#e8f0d8;border-radius:6px;padding:4px 8px;pointer-events:none;white-space:pre}
#perfToast{position:fixed;left:50%;bottom:calc(90px + env(safe-area-inset-bottom,0px));transform:translate(-50%,10px);z-index:40;background:rgba(20,26,32,.9);color:#f4f1ea;
  font-size:13px;padding:9px 14px;border-radius:10px;opacity:0;pointer-events:none;transition:.25s;max-width:calc(100vw - 32px);text-align:center}
#perfToast.show{opacity:1;transform:translate(-50%,0)}
#loadBar{width:min(260px,70vw);height:6px;border-radius:3px;background:rgba(0,0,0,.12);overflow:hidden;margin:12px auto 0}
#loadBar i{display:block;height:100%;width:0;background:#d95728;transition:width .2s}
#loadPill{position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:30;background:rgba(20,26,32,.82);color:#f4f1ea;
  font-size:12.5px;padding:7px 12px;border-radius:999px;display:flex;gap:8px;align-items:center;pointer-events:none}
#loadPill b{display:inline-block;width:80px;height:5px;border-radius:3px;background:rgba(255,255,255,.2);overflow:hidden}
#loadPill b i{display:block;height:100%;width:0;background:#f3a26b}
#loadPill[hidden]{display:none}`;
  document.head.appendChild(css);
  const panel = document.getElementById("panel");
  if (panel) {
    const sec = document.createElement("section"); sec.id = "qualSec";
    sec.innerHTML = `<h2>Quality</h2><div id="qualBtns" role="group" aria-label="Rendering quality">
      <button data-q="auto">Auto</button><button data-q="high">High</button><button data-q="medium">Medium</button><button data-q="low">Low</button></div>
      <div id="qualNote"></div><label class="row"><input type="checkbox" id="perfStats"><span>Show frame rate and draw calls</span></label>`;
    const first = panel.querySelector("section"); panel.insertBefore(sec, first ? first.nextSibling : null);
    sec.querySelectorAll("#qualBtns button").forEach(b => b.onclick = () => setQuality(b.dataset.q));
    const st = sec.querySelector("#perfStats"); st.checked = PERF_STATS.on; st.onchange = () => { PERF_STATS.on = st.checked; try { localStorage.setItem("d141.stats", st.checked ? "1" : ""); } catch (e) {} };
  }
  qualUI();
}
const PERF_STATS = { on: (() => { try { return new URLSearchParams(location.search).get("stats") === "1" || localStorage.getItem("d141.stats") === "1"; } catch (e) { return false; } })(), t: 0, n: 0 };
function perfHud(now) {
  if (!PERF_STATS.on) { const h = document.getElementById("perfHud"); if (h) h.remove(); return; }
  PERF_STATS.n++;
  if (now - PERF_STATS.t < 500) return;
  let h = document.getElementById("perfHud"); if (!h) { h = document.createElement("div"); h.id = "perfHud"; document.body.appendChild(h); }
  const fps = PERF_STATS.n * 1000 / (now - PERF_STATS.t); PERF_STATS.t = now; PERF_STATS.n = 0;
  const i = renderer.info.render;
  h.textContent = `${fps.toFixed(0)} fps · ${i.calls} draws · ${(i.triangles / 1000).toFixed(0)}k tris · ${QUAL.level} · res ${(basePR() * DR.scale).toFixed(2)}x`;
}
function loadProgress(p, text) {
  const b = document.querySelector("#loadBar i"); if (b) b.style.width = Math.round(p * 100) + "%";
  const t = document.getElementById("loadText"); if (t && text) t.textContent = text;
}
function furnProgress(p) {
  let el = document.getElementById("loadPill");
  if (!el) { el = document.createElement("div"); el.id = "loadPill"; el.innerHTML = `<span>Furniture & people</span><b><i></i></b>`; document.body.appendChild(el); }
  el.hidden = p >= 1; el.querySelector("i").style.width = Math.round(p * 100) + "%"; invalidate(300);
}
