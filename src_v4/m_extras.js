// ================================================================ EXTRAS (v4.0): floor switcher, share link + QR, PWA,
// accessibility (contrast, text size, labels, keyboard), Urdu / English, PNG export
const X = { uiz: 1, hc: false };
// ---------------------------------------------------------------- Urdu / English
const I18N = {
  "Where to?": "کہاں جانا ہے؟", "Emergency exit": "ایمرجنسی راستہ", "Building map": "عمارت کا نقشہ", "Architect view": "آرکیٹیکٹ منظر", "Fly": "پرواز",
  "Walk inside": "اندر چلیں", "Walk": "چلیں", "Controls": "کنٹرولز", "Views · Light · Quality": "مناظر · روشنی · معیار", "Walk inside the building": "عمارت کے اندر چلیں",
  "Light": "روشنی", "Sunrise": "طلوعِ آفتاب", "Morning": "صبح", "Noon": "دوپہر", "Afternoon": "سہ پہر", "Golden hour": "سنہری وقت", "Dusk": "شام", "Night": "رات", "Studio": "اسٹوڈیو",
  "Interior lights": "اندرونی روشنیاں", "Shadows": "سائے", "Sun path & compass": "سورج کا راستہ اور قطب نما", "Rooftop solar": "چھت پر سولر",
  "Show the 135 kWp concept": "135 kWp سولر تصور دکھائیں", "Solar view": "سولر منظر", "Walk under the panels": "پینلز کے نیچے چلیں",
  "Quality": "معیار", "Auto": "خودکار", "High": "اعلیٰ", "Medium": "درمیانہ", "Low": "کم", "Show frame rate and draw calls": "فریم ریٹ اور ڈرا کالز دکھائیں",
  "Views": "مناظر", "Front elevation": "سامنے کا رخ", "Front 3/4": "سامنے سے ترچھا", "Rear 3/4": "پیچھے سے ترچھا", "Left side": "بایاں رخ", "Right side": "دایاں رخ",
  "Aerial 3/4": "فضائی منظر", "Eye level": "آنکھ کی سطح", "Axonometric": "ایگزونومیٹرک", "Exploded axo": "کھلا منظر", "Sun study": "دھوپ کا مطالعہ", "Plan (top)": "نقشہ (اوپر سے)", "Plan 3/4": "ترچھا نقشہ",
  "Mode": "انداز", "Materials": "مواد", "White model": "سفید ماڈل", "Ground cutaway": "گراؤنڈ فلور کٹ", "First cutaway": "فرسٹ فلور کٹ", "Second cutaway": "سیکنڈ فلور کٹ", "Exploded": "کھلا ہوا", "Architect": "آرکیٹیکٹ",
  "Layers": "تہیں", "Ground floor": "گراؤنڈ فلور", "First floor": "فرسٹ فلور", "Second floor": "سیکنڈ فلور", "Roofs & parapets": "چھتیں اور پیرا پٹ", "Courtyard": "صحن", "Site & ground": "سائٹ اور زمین",
  "Furniture & people": "فرنیچر اور لوگ", "Levels": "سطحیں", "Exit walk": "باہر نکلیں", "Map": "نقشہ", "Guided tour": "رہنما دورہ", "Night mode": "رات", "Show me the way": "راستہ دکھاؤ", "Take me there": "وہاں لے چلو",
  "Floor": "منزل", "Accessibility & language": "رسائی اور زبان", "High contrast": "زیادہ کنٹراسٹ", "Text size": "متن کا سائز", "Share this view": "یہ منظر شیئر کریں", "Save image (PNG)": "تصویر محفوظ کریں",
  "Drawing": "ڈرائنگ", "Room tags": "کمروں کے نام", "Measure": "پیمائش", "Plan cut": "پلان کٹ", "Ground": "گراؤنڈ", "First": "فرسٹ", "Second": "سیکنڈ", "Full": "مکمل", "Fly-through": "اوپر سے پرواز",
  "Furniture": "فرنیچر", "People": "لوگ", "Roof": "چھت", "Close": "بند کریں", "Copy link": "لنک کاپی کریں", "Share…": "شیئر…", "Rooftop solar concept": "چھت پر سولر کا تصور",
  "Shading view": "سائے کا منظر", "Off": "بند", "Run": "دوڑیں", "Fly over and through": "اوپر سے اور اندر سے پرواز", "Leave architect view": "آرکیٹیکٹ منظر بند کریں",
};
function i18nWalk(root) {
  const ur = L10N.ur, W = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
  while ((n = W.nextNode())) {
    const p = n.parentElement; if (!p || p.closest("#labels,script,style,.atag,#qrSheet,#solInfoBody,#dmMore,#wpList,#credit,#dmCredit,.solTag,#timebar .tb-meta,#sunTxt,#riseTxt,#perfHud,#roomCard,#wayBar,#waySteps")) continue;
    if (n.__key === undefined || (n.textContent !== n.__shown)) {
      const m = /^(\s*[^A-Za-z؀-ۿ]*)([\s\S]*?)(\s*)$/.exec(n.textContent); const key = m && m[2];
      const en = key && I18N[key] ? key : key && Object.keys(I18N).find(k => I18N[k] === key);
      if (!en) { n.__key = null; n.__shown = n.textContent; continue; }
      n.__key = en; n.__pre = m[1]; n.__post = m[3];
    }
    if (!n.__key) continue;
    const t = n.__pre + (ur ? I18N[n.__key] : n.__key) + n.__post; if (n.textContent !== t) n.textContent = t; n.__shown = t;
  }
}
const I18N_ROOTS = ["#hud", "#panel", "#walkTop", "#walkTouch", "#mapBox", "#dirMap .dm-head", "#dirMap .dm-foot", "#archBar", "#topMenu", "#floorSw", "#solInfo .sh", "#solCtl", "#tourBtns", "#shareDlg"];
let _i18nBusy = false;
function i18nApply() {
  if (_i18nBusy) return; _i18nBusy = true;
  I18N_ROOTS.forEach(s => document.querySelectorAll(s).forEach(i18nWalk));
  _i18nBusy = false;
}
function setLang(ur) {
  L10N.ur = !!ur; document.documentElement.lang = ur ? "ur" : "en"; document.body.classList.toggle("ur", !!ur);
  try { localStorage.setItem("d141.lang", ur ? "ur" : "en"); } catch (e) {}
  i18nApply(); if (typeof menuRender === "function") menuRender();
  if (typeof wayViewBtnLabel === "function") wayViewBtnLabel();
  if (typeof WAY !== "undefined" && WAY.route) { wayStepsList(); wayBarUpdate(true); }
  if (typeof solarInfo === "function") { solarInfo(); if (SOL.built) shadeUpdate(); }
  const b = document.getElementById("xLang"); if (b) b.textContent = ur ? "English" : "اردو";
  invalidate(300);
}
// ---------------------------------------------------------------- floor switcher (always visible)
function floorSwState() {
  if (W8.on) return (typeof SOL !== "undefined" && SOL.roofWalk) ? "R" : W8.floor;
  if (!document.getElementById("dirMap").hidden) return DM.floor;
  if (ARCH.on) return { GF: "GF", FF: "FF", SF: "SF" }[ARCH.eff] || "R";
  return { cutGF: "GF", cutFF: "FF", cutSF: "SF" }[mode] || "R";
}
function floorSwGo(f) {
  if (!document.getElementById("dirMap").hidden && f !== "R") { DM.floor = f; DM.hover = null; syncMapTabs(); drawMap(); }
  else if (W8.on) {
    if (f === "R") { if (typeof solarRoofWalk === "function" && typeof SOLAR_D !== "undefined" && SOLAR_D) solarRoofWalk(true); }
    else {
      if (SOL && SOL.roofWalk) solarRoofWalk(false);
      if (f !== W8.floor) { let best = null; WD.stairs.forEach(st => { if (!st.f.includes(f) || !st.f.includes(W8.floor)) return; const p = st.p[W8.floor]; const d = Math.hypot(p[0] - W8.x, p[1] - W8.y); if (!best || d < best.d) best = { st, d }; });
        if (best) goFloor(f, best.st); }
    }
  } else if (ARCH.on) archSetCut(f === "R" ? "all" : f);
  else { setMode(f === "R" ? "material" : "cut" + f); if (f === "R" && typeof SOL !== "undefined" && SOL.on) invalidate(600); }
  floorSwSync(); invalidate(900);
}
function floorSwSync() { const s = floorSwState(); const rt = document.querySelector('#floorTabs button[data-f="R"]'); if (rt) { rt.classList.toggle("on", s === "R"); if (s === "R") document.querySelectorAll("#floorTabs button:not([data-f=R])").forEach(b => b.classList.remove("on")); else document.querySelectorAll("#floorTabs button:not([data-f=R])").forEach(b => b.classList.toggle("on", W8.on && b.dataset.f === W8.floor)); } document.querySelectorAll("#floorSw button").forEach(b => { const on = b.dataset.f === s; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); }); }
// ---------------------------------------------------------------- share link with the camera, floor, room, sun, solar, language
function shareBase() { let saved = ""; try { saved = localStorage.getItem("d141.qrbase") || ""; } catch (e) {} const here = location.href.split("?")[0].split("#")[0]; return /^file:/.test(here) && saved ? saved : here; }
function shareURL() {
  const q = new URLSearchParams(), f1 = (v) => (+v).toFixed(1);
  if (W8.on) {
    q.set("walk", [W8.floor, f1(W8.x), f1(W8.y), (+W8.yaw).toFixed(2), (+W8.pitch).toFixed(2)].join(","));
    if (typeof SOL !== "undefined" && SOL.roofWalk) q.set("roof", "1");
    if (typeof WAY !== "undefined" && WAY.view && WAY.view !== "eye") q.set("wview", WAY.view);
  } else {
    q.set("cam", [camera.position.x, camera.position.y, camera.position.z, controls.target.x, controls.target.y, controls.target.z].map(f1).join(","));
    q.set("fov", Math.round(camera.fov)); if (mode && mode !== "material") q.set("mode", mode);
  }
  const map = !document.getElementById("dirMap").hidden;
  if (map && DM.sel && DM.sel.id) q.set("room", DM.sel.f + "." + DM.sel.id);
  else if (W8.on && W8.room > 0) q.set("room", W8.floor + "." + W8.room);
  if (typeof WAY !== "undefined" && WAY.route && WAY.dest && WAY.dest.id) { const r = wayIndex().rooms.find(r => r.f === WAY.dest.f && r.id === WAY.dest.id); if (r) q.set("to", r.slug); }
  if (typeof SOL !== "undefined" && SOL.on) q.set("solar", "1");
  q.set("sun", light.doy + "," + (+light.hour).toFixed(2));
  if (L10N.ur) q.set("lang", "ur");
  return shareBase() + "?" + q.toString();
}
function shareOpen() {
  const url = shareURL(); let d = document.getElementById("shareDlg");
  if (!d) { d = document.createElement("div"); d.id = "shareDlg"; d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true"); d.setAttribute("aria-labelledby", "sdT"); document.body.appendChild(d);
    d.addEventListener("click", (e) => { if (e.target === d) d.hidden = true; }); }
  let svg = ""; try { const qr = __qrmod(0, "M"); qr.addData(url); qr.make(); svg = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); } catch (e) { svg = ""; }
  d.innerHTML = `<div class="sd"><div class="sdh"><b id="sdT">🔗 ${tr("Share this view", "یہ منظر شیئر کریں")}</b><button id="sdX" aria-label="${tr("Close", "بند کریں")}">✕</button></div>
    <p>${tr("The link opens the viewer with this camera, floor, room, time of day and layers.", "یہ لنک اسی کیمرے، منزل، کمرے اور وقت کے ساتھ کھلے گا۔")}</p>
    <input id="sdUrl" readonly value="${url.replace(/"/g, "&quot;")}" aria-label="Link">
    <div class="sdb"><button id="sdCopy" class="primary">${tr("Copy link", "لنک کاپی کریں")}</button>${navigator.share ? `<button id="sdShare">${tr("Share…", "شیئر…")}</button>` : ""}<button id="sdPng">📷 ${tr("Save image (PNG)", "تصویر محفوظ کریں")}</button></div>
    ${/^file:/.test(url) ? `<p class="sdw">${tr("This copy is opened from a file, so the link and QR code only work on this computer. Publish the viewer (see HANDOFF) and set its address on the QR sheet.", "یہ فائل سے کھلا ہے، لنک صرف اسی کمپیوٹر پر چلے گا۔")}</p>` : ""}
    <div class="sdq">${svg}</div></div>`;
  d.hidden = false;
  document.getElementById("sdX").onclick = () => d.hidden = true;
  document.getElementById("sdCopy").onclick = async () => { const i = document.getElementById("sdUrl"); try { await navigator.clipboard.writeText(url); } catch (e) { i.select(); try { document.execCommand("copy"); } catch (e2) {} } perfToast(tr("Link copied.", "لنک کاپی ہو گیا۔"), 1800); };
  const sh = document.getElementById("sdShare"); if (sh) sh.onclick = () => navigator.share({ title: "Disrupt 141-C", url }).catch(() => {});
  document.getElementById("sdPng").onclick = () => savePNG();
  setTimeout(() => document.getElementById("sdCopy").focus(), 30);
}
function extrasApplyState(q) {
  if (q.get("lang") === "ur") setLang(true);
  if (q.get("sun")) { const [d, h] = q.get("sun").split(",").map(Number);
    if (d > 0 && d < 367) { light.doy = d; const mo = document.getElementById("month"); if (mo && [...mo.options].some(o => +o.value === d)) mo.value = d; }
    if (isFinite(h) && h >= 0 && h < 24) { light.hour = h; light.preset = "custom"; const c = document.getElementById("clock"); if (c) c.value = h; }
    try { buildSunPath(); paintTrack(); } catch (e) {} applyLight(); }
  if (q.get("mode") && ["white", "cutGF", "cutFF", "cutSF", "expl", "arch", "material"].includes(q.get("mode"))) setMode(q.get("mode"));
  const cam = (q.get("cam") || "").split(",").map(Number);
  if (cam.length === 6 && cam.every(isFinite)) { camera.position.set(cam[0], cam[1], cam[2]); controls.target.set(cam[3], cam[4], cam[5]); const fv = +q.get("fov"); if (fv > 5 && fv < 100) camera.fov = fv; camera.updateProjectionMatrix(); controls.update(); document.getElementById("viewName").textContent = tr("Shared view", "شیئر شدہ منظر"); }
  if (q.get("solar") === "1" && typeof solarSet === "function") { if (cam.length === 6) solarSet(true); else if (!q.get("walk")) solarView(); else solarSet(true); }
  const w = (q.get("walk") || "").split(",");
  if (w.length >= 3 && FLOORS.includes(w[0])) {
    const [f, x, y, yaw, pitch] = [w[0], +w[1], +w[2], +(w[3] || 0), +(w[4] || 0)];
    if (q.get("roof") === "1" && typeof solarRoofWalk === "function") { solarRoofWalk(true); W8.x = x; W8.y = y; W8.yaw = yaw; W8.pitch = pitch; }
    else { enterWalk({ f, x, y, yaw, pitch }); if (["bird", "plan"].includes(q.get("wview"))) waySetView(q.get("wview")); }
  }
  const rm = (q.get("room") || "").split(".");
  if (rm.length === 2 && FLOORS.includes(rm[0]) && +rm[1] > 0 && WD.floors[rm[0]].rooms[+rm[1] - 1] && !W8.on) { openMap(rm[0]); selectRoom(rm[0], +rm[1]); }
}
// ---------------------------------------------------------------- PNG export (rendered frame + a credit strip)
function savePNG() {
  window.__cap = () => {
    try {
      const src = renderer.domElement, W = src.width, H = src.height, bar = Math.round(Math.max(28, H * 0.035));
      const c = document.createElement("canvas"); c.width = W; c.height = H + bar; const g = c.getContext("2d");
      g.drawImage(src, 0, 0); g.fillStyle = "#14181c"; g.fillRect(0, H, W, bar);
      g.fillStyle = "#f2efe8"; g.font = `${Math.round(bar * 0.45)}px system-ui, sans-serif`; g.textBaseline = "middle";
      const view = (document.getElementById("viewName") || {}).textContent || "";
      g.fillText(`Disrupt 141-C · ${W8.on ? floorName(W8.floor) : view} · ${new Date().toISOString().slice(0, 10)}`, bar * 0.4, H + bar / 2);
      const cr = "Made by Engr. Shamroze Nasir"; g.textAlign = "right"; g.fillText(cr, W - bar * 0.4, H + bar / 2);
      const url = c.toDataURL("image/png"); window.__lastPNG = url.length;
      const a = document.createElement("a"); a.href = url; a.download = `Disrupt_141C_${(W8.on ? W8.floor + "_walk" : view.replace(/[^A-Za-z0-9]+/g, "_")) || "view"}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      perfToast(tr("Image saved.", "تصویر محفوظ ہو گئی۔"), 1800);
    } catch (e) { perfToast(tr("Could not save the image.", "تصویر محفوظ نہیں ہو سکی۔"), 2500); }
  };
  invalidate(200);
}
// ---------------------------------------------------------------- PWA (only when served over http / https)
function pwaInit() {
  if (!/^https?:/.test(location.protocol)) return;
  const l = document.createElement("link"); l.rel = "manifest"; l.href = "manifest.webmanifest"; document.head.appendChild(l);
  const ai = document.createElement("link"); ai.rel = "apple-touch-icon"; ai.href = "icons/apple-touch-icon.png"; document.head.appendChild(ai);
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
}
// ---------------------------------------------------------------- accessibility
function a11yNames() {
  const names = { dmZin: "Zoom in", dmZout: "Zoom out", dmZfit: "Fit the plan", dmClose: "Close the building map", play: "Play the day", flyUp: "Fly up", flyDn: "Fly down",
    compass: "Compass", panelToggle: "Show or hide the controls", routeCancel: "Cancel route", sheetHandle: "Controls", walkMore: "More walk options" };
  Object.entries(names).forEach(([id, t]) => { const e = document.getElementById(id); if (e && !e.getAttribute("aria-label")) e.setAttribute("aria-label", t); });
  document.querySelectorAll("button").forEach(b => { if (b.getAttribute("aria-label")) return; const t = (b.textContent || "").trim(); if (!/[A-Za-z؀-ۿ]/.test(t)) b.setAttribute("aria-label", b.title || b.dataset.f || b.dataset.v || "button"); });
  const cv = document.querySelector("#stage canvas"); if (cv) { cv.setAttribute("role", "img"); cv.setAttribute("aria-label", "3D view of the Disrupt 141-C building. Use the controls to change the view, walk inside or open the building map."); }
}
function setUIZoom(z) { X.uiz = Math.max(0.85, Math.min(1.4, Math.round(z * 100) / 100)); document.documentElement.style.setProperty("--uiz", X.uiz); try { localStorage.setItem("d141.uiz", X.uiz); } catch (e) {} const l = document.getElementById("xZoomLab"); if (l) l.textContent = Math.round(X.uiz * 100) + "%"; }
function setHC(on) { X.hc = !!on; document.body.classList.toggle("hc", X.hc); try { localStorage.setItem("d141.hc", X.hc ? "1" : ""); } catch (e) {} const b = document.getElementById("xHC"); if (b) { b.classList.toggle("on", X.hc); b.setAttribute("aria-pressed", String(X.hc)); } invalidate(300); }
function extrasBuildUI() {
  const css = document.createElement("style");
  css.textContent = `
:root{--uiz:1}
#hud,#panel .sheetBody,#panel>section,#timebar,#walkTop,#mapBox,#wayBar,#waySteps,#wayArrive,#wayPanel .wp,#topMenu,.dm-head,.dm-foot,#dmCard,#solInfo,#archBar,#tourCard,#floorSw,#shareDlg .sd,#stairPrompt,#walkHint,#routeBar,#walkTouch,#flyBtns,#credit{zoom:var(--uiz)}
:focus-visible{outline:3px solid #ffbf00!important;outline-offset:2px}
#hud button{white-space:nowrap}
@media (min-width:821px) and (max-width:1500px){ #hud .brand p{display:none} #archBtn .lbl,#flyBtn .lbl{display:none} }
@media (min-width:821px) and (max-width:1100px){ #mapBtn .lbl,#sosBtn .lbl{display:none} }
body.ur{--urfont:"Noto Nastaliq Urdu","Jameel Noori Nastaleeq","Urdu Typesetting","Noto Naskh Arabic","Segoe UI",system-ui,sans-serif}
body.ur #hud,body.ur #panel,body.ur #walkTop,body.ur #topMenu,body.ur #wayBar,body.ur #waySteps,body.ur #wayPanel,body.ur #solInfo,body.ur #floorSw,body.ur .dm-head,body.ur .dm-foot{font-family:var(--urfont);line-height:1.55}
#floorSw{position:fixed;right:calc(14px + env(safe-area-inset-right,0px));top:50%;transform:translateY(-50%);z-index:8;display:flex;flex-direction:column;gap:4px;padding:5px;border-radius:12px;
  background:var(--panel);border:1px solid var(--line);box-shadow:0 6px 20px rgba(0,0,0,.14);backdrop-filter:blur(10px)}
#floorSw button{font:inherit;font-size:14px;font-weight:650;min-width:44px;min-height:44px;border-radius:9px;border:1px solid transparent;background:transparent;color:var(--ink);cursor:pointer}
#floorSw button.on{background:#1e6fd9;color:#fff}
#floorSw span{font-size:11px;color:var(--muted);text-align:center;padding-top:2px}
body.walking #floorSw{background:rgba(20,26,32,.74);border-color:rgba(255,255,255,.16)} body.walking #floorSw button{color:#f2efe8} body.walking #floorSw button.on{background:#d95728} body.walking #floorSw span{color:#b9c6d2}
body:has(#solInfo:not([hidden])) #floorSw{right:calc(430px + env(safe-area-inset-right,0px))}
#shareDlg{position:fixed;inset:0;z-index:45;background:rgba(15,20,25,.4);display:flex;align-items:center;justify-content:center;padding:14px}
#shareDlg[hidden]{display:none}
#shareDlg .sd{width:min(460px,100%);max-height:calc(100dvh - 28px);overflow:auto;background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:16px;padding:12px 16px 16px;box-shadow:0 18px 50px rgba(0,0,0,.3)}
#shareDlg .sdh{display:flex;align-items:center} #shareDlg .sdh b{flex:1;font-size:17px} #shareDlg .sdh button{min-width:44px;min-height:44px;border:0;background:transparent;font-size:20px;color:var(--ink);cursor:pointer}
#shareDlg p{font-size:14px;margin:6px 0 10px}
#sdUrl{width:100%;box-sizing:border-box;font:inherit;font-size:14px;padding:11px;border-radius:10px;border:1px solid var(--line);min-height:44px;background:#fff;color:#1b1f23}
#shareDlg .sdb{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0} #shareDlg .sdb button{flex:1;min-width:120px;font:inherit;font-size:15px;font-weight:600;min-height:46px;border-radius:10px;border:1px solid var(--line);background:#fff;color:#1b1f23;cursor:pointer}
#shareDlg .sdb button.primary{background:#1e6fd9;color:#fff;border-color:#1e6fd9}
#shareDlg .sdw{background:#fff4e5;padding:9px 11px;border-radius:9px}
#shareDlg .sdq{display:flex;justify-content:center;background:#fff;border-radius:10px;padding:8px} #shareDlg .sdq svg{width:210px;height:210px}
#xSec .grid button.on{background:var(--accent);color:var(--accent-ink)}
#xSec .zr{display:flex;align-items:center;gap:6px;margin:6px 0} #xSec .zr span{min-width:52px;text-align:center;font-size:14px}
#xSec .zr button{font:inherit;min-width:44px;min-height:40px;border-radius:9px;border:1px solid var(--line);background:transparent;color:var(--ink);cursor:pointer;font-size:14px}
/* high contrast */
body.hc{--panel:#ffffff;--ink:#000000;--muted:#1a1a1a;--line:#000000;--accent:#003f8a;--accent-ink:#ffffff}
body.hc #hud button,body.hc #panel button,body.hc #topMenu button,body.hc #floorSw button,body.hc .wayViewBtn,body.hc #wayBar button,body.hc #solCtl button{border:2px solid #000!important}
body.hc .wbtn,body.hc #floorTabs button{background:#000!important;color:#fff!important;border:2px solid #fff!important}
body.hc .wbtn.on,body.hc #floorSw button.on{background:#ffbf00!important;color:#000!important}
body.hc #roomCard,body.hc #mapBox,body.hc .solTag,body.hc #perfToast{background:#000!important;color:#fff!important}
body.hc #roomSub{color:#fff!important}
body.hc #wayBar,body.hc #waySteps{border:3px solid #000!important}
body.hc .rl,body.hc .rtag{background:#000!important;color:#fff!important}
@media (max-width:820px),(max-height:500px) and (pointer:coarse){
  #floorSw{top:auto;bottom:calc(var(--peek,62px) + 60px + env(safe-area-inset-bottom,0px));transform:none;right:calc(8px + env(safe-area-inset-right,0px));padding:4px;gap:2px}
  body.walking #floorSw{display:none}
  body.walking.wayOn #floorSw{top:calc(250px + env(safe-area-inset-top,0px))}
  body:has(#solInfo:not([hidden])) #floorSw{right:calc(8px + env(safe-area-inset-right,0px));bottom:calc(52dvh + var(--peek,62px) + 16px)}
  body.arch:not(.walking) #floorSw{bottom:calc(76px + env(safe-area-inset-bottom,0px))}
  #floorSw span{display:none}
}
@media (max-height:500px) and (pointer:coarse) and (orientation:landscape){
  #floorSw{top:calc(64px + env(safe-area-inset-top,0px));bottom:auto;left:calc(8px + env(safe-area-inset-left,0px));right:auto;transform:none}
  body:has(#solInfo:not([hidden])) #floorSw{right:auto;bottom:auto}
  body.walking #floorSw{top:calc(64px + env(safe-area-inset-top,0px));bottom:auto}
  body.walking.wayOn #floorSw{display:none}
}`;
  document.head.appendChild(css);
  // floor switcher
  const fs = document.createElement("div"); fs.id = "floorSw"; fs.setAttribute("role", "group"); fs.setAttribute("aria-label", "Floor");
  fs.innerHTML = `<span>${tr("Floor", "منزل")}</span>` + [["R", "R", "Roof"], ["SF", "2", "Second floor"], ["FF", "1", "First floor"], ["GF", "G", "Ground floor"]]
    .map(([f, t, n]) => `<button data-f="${f}" aria-label="${n}" title="${n}">${t}</button>`).join("");
  document.body.appendChild(fs);
  fs.querySelectorAll("button").forEach(b => b.onclick = () => floorSwGo(b.dataset.f));
  // walk mode on phones: the minimap's floor tabs are the always-visible switcher, so they get a Roof tab too
  const ft = document.getElementById("floorTabs");
  if (ft && typeof SOLAR_D !== "undefined" && SOLAR_D) { const r = document.createElement("button"); r.dataset.f = "R"; r.textContent = "R"; r.setAttribute("aria-label", "Roof, under the solar array"); r.title = "Roof";
    r.addEventListener("click", (e) => { e.stopPropagation(); floorSwGo("R"); }); ft.insertBefore(r, ft.querySelector("button")); }
  setInterval(floorSwSync, 600);
  // panel section: accessibility & language
  const panel = document.getElementById("panel"), q = document.getElementById("qualSec");
  if (panel) {
    const sec = document.createElement("section"); sec.id = "xSec";
    sec.innerHTML = `<h2>${tr("Accessibility & language", "رسائی اور زبان")}</h2>
      <div class="grid"><button id="xLang" lang="ur">${L10N.ur ? "English" : "اردو"}</button><button id="xHC" aria-pressed="false">◐ ${tr("High contrast", "زیادہ کنٹراسٹ")}</button>
      <button id="xShare">🔗 ${tr("Share this view", "یہ منظر شیئر کریں")}</button><button id="xPng">📷 ${tr("Save image (PNG)", "تصویر محفوظ کریں")}</button></div>
      <div class="zr"><span style="min-width:auto">${tr("Text size", "متن کا سائز")}</span><button id="xZm" aria-label="Smaller text">A−</button><span id="xZoomLab">100%</span><button id="xZp" aria-label="Larger text">A+</button></div>`;
    if (q) q.parentNode.insertBefore(sec, q.nextSibling); else panel.appendChild(sec);
    document.getElementById("xLang").onclick = () => setLang(!L10N.ur);
    document.getElementById("xHC").onclick = () => setHC(!X.hc);
    document.getElementById("xShare").onclick = shareOpen;
    document.getElementById("xPng").onclick = savePNG;
    document.getElementById("xZm").onclick = () => setUIZoom(X.uiz - 0.1);
    document.getElementById("xZp").onclick = () => setUIZoom(X.uiz + 0.1);
  }
  if (typeof menuAdd === "function") {
    menuAdd({ id: "mShare", icon: "🔗", label: () => tr("Share this view", "یہ منظر شیئر کریں"), group: "share", run: shareOpen });
    menuAdd({ id: "mPng", icon: "📷", label: () => tr("Save image (PNG)", "تصویر محفوظ کریں"), group: "share", run: savePNG });
    menuAdd({ id: "mLang", icon: "🌐", label: () => L10N.ur ? "English" : "اردو (Urdu)", group: "a11y", run: () => setLang(!L10N.ur) });
    menuAdd({ id: "mHC", icon: "◐", label: () => tr(X.hc ? "Normal contrast" : "High contrast", X.hc ? "عام کنٹراسٹ" : "زیادہ کنٹراسٹ"), group: "a11y", run: () => setHC(!X.hc) });
    menuAdd({ id: "mZp", icon: "A+", label: () => tr("Larger text", "بڑا متن") + ` (${Math.round(X.uiz * 100)}%)`, group: "a11y", run: () => setUIZoom(X.uiz + 0.1) });
    menuAdd({ id: "mZm", icon: "A−", label: () => tr("Smaller text", "چھوٹا متن"), group: "a11y", run: () => setUIZoom(X.uiz - 0.1) });
  }
  // keyboard: Escape closes the top dialog
  addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const sd = document.getElementById("shareDlg"); if (sd && !sd.hidden) { sd.hidden = true; return; }
    const qs = document.getElementById("qrSheet"); if (qs) { qs.remove(); return; }
    const wp = document.getElementById("wayPanel"); if (wp && !wp.hidden) { wayClose(); return; }
    const tm = document.getElementById("topMenu"); if (tm && tm.classList.contains("open")) { tm.classList.remove("open"); return; }
  });
  // saved preferences
  try { const z = +localStorage.getItem("d141.uiz"); if (z) setUIZoom(z); if (localStorage.getItem("d141.hc") === "1") setHC(true);
    const lg = localStorage.getItem("d141.lang"); if (lg === "ur" && !new URLSearchParams(location.search).get("lang")) setLang(true); } catch (e) {}
  a11yNames(); pwaInit(); floorSwSync();
  // re-apply Urdu where the UI rewrites its own text (menus, walk bar, map head)
  const mo = new MutationObserver(() => { if (L10N.ur) { clearTimeout(mo.t); mo.t = setTimeout(i18nApply, 60); } });
  I18N_ROOTS.forEach(s => document.querySelectorAll(s).forEach(r => mo.observe(r, { childList: true, subtree: true, characterData: true })));
}
window.__x = { cam: () => [camera.position.x, camera.position.y, camera.position.z, controls.target.x, controls.target.y, controls.target.z, camera.fov].map(v => +v.toFixed(1)), X, setLang, setHC, setUIZoom, shareURL, shareOpen, savePNG, floorSwGo, floorSwState };
