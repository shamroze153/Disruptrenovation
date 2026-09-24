import os
ROOT="/home/claude/proj/DISRUPT_141C_COMPLETE_v2"
src=os.path.join(ROOT,"04_model","viewer_standalone_v1_original.html")
s=open(src,encoding="utf-8").read()
parts=s.split("<script>")
head_body=parts[0]; model=parts[1]; three=parts[2]
import base64
_b=base64.b64encode(open("/home/claude/work/v4v/model/Disrupt_141C_v4_shell.glb","rb").read()).decode()
assert model.startswith('window.MODEL_B64="')
model='window.MODEL_B64="'+_b+'";</script>'+model[model.index('";</script>')+len('";</script>'):]
V3="/home/claude/work/v4v"
app=open(os.path.join(V3,"src","viewer_app.js"),encoding="utf-8").read()
cleang=open(os.path.join(V3,"data","clean_geom.json"),encoding="utf-8").read()
furn=open(os.path.join(V3,"data","furniture.json"),encoding="utf-8").read()
walkdata=open(os.path.join(V3,"data","walkdata.json"),encoding="utf-8").read()
archdata=open(os.path.join(V3,"data","arch_data.json"),encoding="utf-8").read()
import json as _json
archunder=_json.load(open(os.path.join(V3,"data","arch_under_webp.json"),encoding="utf-8"))

css_add = r"""
#loading{flex-direction:column}
.ldbox{display:flex;flex-direction:column;align-items:center}
.ldrow{display:flex;gap:12px;align-items:center}
#panel{max-height:calc(100vh - 190px)}
.field{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted);margin:10px 0 4px}
.toggles{margin-top:8px}
#timebar{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));
  width:min(540px, calc(100vw - 320px));display:flex;gap:12px;align-items:center;
  background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:10px 14px;
  backdrop-filter:blur(10px);z-index:4}
#play{flex:none;width:38px;height:38px;border-radius:50%;border:1px solid var(--line);
  background:var(--accent);color:var(--accent-ink);font-size:13px;cursor:pointer;line-height:1}
#play:focus-visible,#clock:focus-visible,#month:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.tb-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.tb-meta{display:flex;justify-content:space-between;gap:10px;font-size:12px;color:var(--muted);
  font-variant-numeric:tabular-nums;flex-wrap:wrap}
#clockTxt{color:var(--ink);font-weight:650;font-size:14px;min-width:3.2em}
#clock{-webkit-appearance:none;appearance:none;width:100%;height:10px;border-radius:6px;margin:0;
  background:var(--track, linear-gradient(90deg,#0a1020,#e9dcc6,#0a1020));border:1px solid var(--line);cursor:pointer}
#clock::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;
  background:#fff;border:2px solid #1b1f23;box-shadow:0 1px 4px rgba(0,0,0,.35)}
#clock::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:#fff;border:2px solid #1b1f23}
#month{font:inherit;font-size:12px;color:var(--ink);background:transparent;border:1px solid var(--line);
  border-radius:7px;padding:3px 6px;max-width:100%}
#month option{color:#1b1f23}
#walkBtn{pointer-events:auto;margin-left:auto;background:#d95728;color:#fff;border:0;border-radius:10px;
  padding:11px 16px;font:inherit;font-size:14px;font-weight:650;cursor:pointer;box-shadow:0 4px 14px rgba(217,87,40,.35)}
#walkBtn:hover{filter:brightness(1.06)}
#walkBtn2{width:100%;margin-bottom:14px;background:#d95728;color:#fff;border:0;border-radius:9px;padding:10px;
  font:inherit;font-size:13px;font-weight:650;cursor:pointer}
#walkUI{display:none}
body.walking #hud,body.walking #panel,body.walking #timebar,body.walking #readout{display:none!important}
body.walking #walkUI{display:block}
body.walking #stage canvas{cursor:grab;touch-action:none}
.wbtn{font:inherit;font-size:13px;background:rgba(20,26,32,.72);color:#f2efe8;border:1px solid rgba(255,255,255,.16);
  border-radius:10px;padding:9px 13px;cursor:pointer;backdrop-filter:blur(8px)}
.wbtn:hover{background:rgba(20,26,32,.88)}
.wbtn.on{background:#d95728;border-color:#d95728}
#walkTop{position:fixed;top:calc(14px + env(safe-area-inset-top,0px));left:14px;right:14px;display:flex;
  justify-content:space-between;align-items:flex-start;gap:10px;z-index:6;pointer-events:none}
#walkTop>*{pointer-events:auto}
.wgroup{display:flex;gap:8px}
#roomCard{position:fixed;top:calc(14px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);
  text-align:center;background:rgba(20,26,32,.74);color:#f4f1ea;border-radius:14px;padding:10px 20px 11px;
  backdrop-filter:blur(8px);z-index:6;max-width:min(560px,calc(100vw - 330px));pointer-events:none}
#roomName{font-size:20px;font-weight:650;letter-spacing:-.01em;line-height:1.2}
#roomSub{font-size:12.5px;color:#b9c6d2;margin-top:3px;font-variant-numeric:tabular-nums}
#roomCard.pop{animation:pop .45s ease}
@keyframes pop{0%{opacity:.35;transform:translate(-50%,-6px)}100%{opacity:1;transform:translate(-50%,0)}}
#mapBox{position:fixed;left:14px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:6;
  background:rgba(20,26,32,.74);border-radius:12px;padding:8px;backdrop-filter:blur(8px)}
#floorTabs{display:flex;gap:5px;margin-bottom:6px;align-items:center}
#floorTabs span{color:#b9c6d2;font-size:11.5px;margin-right:auto}
#floorTabs button{font:inherit;font-size:12px;min-width:30px;padding:4px 8px;border-radius:7px;border:1px solid rgba(255,255,255,.2);
  background:transparent;color:#f2efe8;cursor:pointer}
#floorTabs button.on{background:#f2efe8;color:#141a20}
#minimap{display:block;width:250px;height:auto;aspect-ratio:303/265;border-radius:6px;cursor:crosshair;background:#3a4048}
#stairPrompt{position:fixed;left:50%;bottom:calc(120px + env(safe-area-inset-bottom,0px));transform:translate(-50%,10px);
  display:flex;gap:8px;align-items:center;background:rgba(20,26,32,.82);color:#f4f1ea;border-radius:12px;padding:8px 10px 8px 16px;
  z-index:7;opacity:0;pointer-events:none;transition:.25s;backdrop-filter:blur(8px)}
#stairPrompt.show{opacity:1;pointer-events:auto;transform:translate(-50%,0)}
#stairPrompt span{font-size:13px;margin-right:4px}
#stairPrompt button{font:inherit;font-size:13px;font-weight:600;background:#2f5d7c;color:#fff;border:0;border-radius:8px;padding:8px 12px;cursor:pointer}
#walkHint{position:fixed;left:50%;top:calc(84px + env(safe-area-inset-top,0px));transform:translateX(-50%);max-width:min(640px,calc(100vw - 28px));text-align:center;line-height:1.5;
  background:rgba(20,26,32,.74);color:#e9e6df;font-size:13px;border-radius:10px;padding:9px 14px;z-index:6;
  opacity:0;transition:opacity .6s;pointer-events:none}
#walkHint.show{opacity:1}
#walkHint b{color:#fff}
#joy{display:none;position:fixed;right:22px;bottom:calc(26px + env(safe-area-inset-bottom,0px));width:124px;height:124px;
  border-radius:50%;background:rgba(20,26,32,.38);border:2px solid rgba(255,255,255,.35);z-index:7;touch-action:none}
#joy i{position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:50%;
  background:rgba(255,255,255,.85);box-shadow:0 2px 8px rgba(0,0,0,.3)}
#tourCard{position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom,0px));transform:translate(-50%,16px);
  width:min(620px,calc(100vw - 320px));background:rgba(248,246,241,.96);color:#1b1f23;border-radius:14px;padding:14px 16px 12px;
  z-index:8;opacity:0;pointer-events:none;transition:.3s;box-shadow:0 10px 30px rgba(0,0,0,.3)}
#tourCard.show{opacity:1;pointer-events:auto;transform:translate(-50%,0)}
#tourHead{display:flex;align-items:baseline;gap:10px}
#tourStep{font-size:12px;color:#5b6670;font-variant-numeric:tabular-nums}
#tourTitle{font-size:17px;font-weight:650}
#tourText{font-size:14px;line-height:1.5;margin:6px 0 10px;color:#2a3036}
#tourBtns{display:flex;gap:8px}
#tourBtns button{font:inherit;font-size:13px;border-radius:8px;padding:7px 12px;cursor:pointer;border:1px solid rgba(27,31,35,.18);background:#fff;color:#1b1f23}
#tourBtns button.primary{background:#2f5d7c;color:#fff;border-color:#2f5d7c}
#tourBtns button.on{background:#d95728;color:#fff;border-color:#d95728}
#tourBtns .sp{flex:1}
#flyBtns{display:none;position:fixed;right:22px;bottom:calc(170px + env(safe-area-inset-bottom,0px));flex-direction:column;gap:8px;z-index:7}
#flyBtns .wbtn{width:52px;height:52px;font-size:18px;padding:0}
body.flying #flyBtns{display:flex}
@media (pointer:fine){ body.flying #flyBtns{display:none} }
#mapBtn{pointer-events:auto;background:#fff;color:#1b1f23;border:1px solid var(--line);border-radius:10px;padding:11px 14px;font:inherit;font-size:14px;font-weight:600;cursor:pointer;margin-left:auto;margin-right:8px}
#walkBtn{margin-left:0!important}
#routeBar{position:fixed;left:50%;top:calc(84px + env(safe-area-inset-top,0px));transform:translate(-50%,-8px);display:flex;gap:10px;align-items:center;
  background:#fff6ef;color:#1b1f23;border:2px solid #ff6a2b;border-radius:12px;padding:9px 10px 9px 16px;max-width:min(640px,calc(100vw - 28px));
  font-size:14px;line-height:1.4;z-index:7;opacity:0;pointer-events:none;transition:.25s;box-shadow:0 6px 20px rgba(0,0,0,.2)}
#routeBar.show{opacity:1;pointer-events:auto;transform:translate(-50%,0)}
#routeBar button{flex:none;border:0;background:transparent;font-size:16px;cursor:pointer;color:#5b6670;padding:4px 6px}
body.walking #routeBar.show ~ * #walkHint{display:none}
#compass{position:fixed;right:16px;top:calc(78px + env(safe-area-inset-top,0px));width:46px;height:46px;border-radius:50%;background:var(--panel);
  border:1px solid var(--line);z-index:3;display:grid;place-items:center;pointer-events:none}
#compassN{display:flex;flex-direction:column;align-items:center;transition:transform .1s linear}
#compassN b{font-size:11px;color:#d95728;line-height:1}
#compassN i{width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:14px solid #d95728;margin-top:1px}
body.walking #compass{display:none}
#credit{position:fixed;left:16px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:4;pointer-events:none;
  font:600 12px/1.2 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.02em;color:#1b1f23;
  background:rgba(255,255,255,.82);border:1px solid rgba(27,31,35,.12);border-radius:8px;padding:5px 9px;backdrop-filter:blur(6px)}
#credit b{font-weight:700}
body.walking #credit{left:auto;right:16px;background:rgba(20,26,32,.62);color:#f2efe8;border-color:rgba(255,255,255,.16)}
body.arch:not(.walking) #credit{bottom:calc(12px + env(safe-area-inset-bottom,0px))}
@media (max-width:820px){ #credit{font-size:10.5px;padding:4px 7px;bottom:calc(8px + env(safe-area-inset-bottom,0px))} body:not(.walking) #credit{left:auto;right:10px} }
body:not(.walking):not(.arch) #readout{bottom:calc(48px + env(safe-area-inset-bottom,0px))!important}
#dmCredit{margin-left:auto;font-size:12px;font-weight:600;color:#3a424a;white-space:nowrap}
#dirMap{position:fixed;inset:0;z-index:20;background:#f6f4ef;display:flex;flex-direction:column;color:#1b1f23}
#dirMap[hidden]{display:none}
.dm-head{display:flex;gap:10px;align-items:center;padding:calc(12px + env(safe-area-inset-top,0px)) 16px 10px;border-bottom:1px solid rgba(27,31,35,.1);flex-wrap:wrap}
.dm-head h2{font-size:17px;margin:0 8px 0 0}
#dmTabs{display:flex;gap:4px;background:#e9e6df;border-radius:10px;padding:3px}
#dmTabs button{font:inherit;font-size:13px;border:0;background:transparent;padding:7px 12px;border-radius:8px;cursor:pointer;color:#1b1f23}
#dmTabs button.on{background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.15);font-weight:600}
#dmSearch{flex:1;min-width:160px;font:inherit;font-size:14px;padding:8px 12px;border-radius:9px;border:1px solid rgba(27,31,35,.2);background:#fff;color:#1b1f23}
#dmClose{font-size:18px;border:0;background:transparent;cursor:pointer;padding:6px 10px;color:#1b1f23}
.dm-body{flex:1;min-height:0;position:relative}
#dmCanvas{position:absolute;inset:0;cursor:pointer;touch-action:none}
#dmUnderL{display:flex;gap:5px;align-items:center;font-size:13px;cursor:pointer;white-space:nowrap}
#dmZoom{position:absolute;right:12px;top:12px;display:flex;flex-direction:column;align-items:center;gap:4px;background:rgba(255,255,255,.92);border:1px solid rgba(27,31,35,.15);border-radius:10px;padding:5px;box-shadow:0 1px 4px rgba(0,0,0,.08)}
#dmZoom button{width:34px;height:32px;font:inherit;font-size:18px;border:1px solid rgba(27,31,35,.15);border-radius:7px;background:#fff;cursor:pointer;color:#1b1f23}
#dmZoom span{font-size:10.5px;color:#5b6670;font-variant-numeric:tabular-nums}
#dmMore{position:absolute;left:12px;top:56px;max-width:min(262px,42vw);max-height:calc(100% - 96px);overflow:auto;background:rgba(255,255,255,.95);border:1px solid rgba(27,31,35,.15);border-radius:10px;padding:8px 10px;font-size:12px;box-shadow:0 1px 4px rgba(0,0,0,.08)}
#dmMore b{display:flex;justify-content:space-between;gap:6px;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#5b6670;margin-bottom:4px;cursor:pointer}
#dmMore b em{font-style:normal}
#dmMore.min button{display:none} #dmMore.min b{margin:0}
#dmMore button{display:flex;gap:6px;align-items:baseline;width:100%;text-align:left;font:inherit;font-size:12px;border:0;background:transparent;padding:3px 2px;cursor:pointer;color:#1b1f23;border-radius:5px}
#dmMore button:hover{background:#f1efe9}
#dmMore i{font-style:normal;flex:none;min-width:18px;height:18px;border-radius:9px;background:#1f3b57;color:#fff;font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center}
#dmMore span{color:#5b6670;font-size:11px}
@media (max-width:820px){ #dmMore{max-height:34%;max-width:62vw;top:auto;bottom:12px} }
.dm-foot{display:flex;gap:14px;align-items:center;justify-content:space-between;padding:10px 16px calc(12px + env(safe-area-inset-bottom,0px));border-top:1px solid rgba(27,31,35,.1);flex-wrap:wrap}
#dmLegend{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12px;color:#3a424a}
#dmLegend span{display:flex;align-items:center;gap:6px}
#dmLegend i{width:14px;height:14px;border-radius:3px;border:1px solid rgba(0,0,0,.15)}
#dmCard{display:flex;align-items:center;gap:10px;background:#fff;border:2px solid #d95728;border-radius:12px;padding:8px 10px 8px 14px}
#dmCard[hidden]{display:none}
#dmCard div{display:flex;flex-direction:column;margin-right:6px}
#dmCard b{font-size:15px}#dmCard span{font-size:12px;color:#5b6670}
#dmCard button{font:inherit;font-size:13px;border-radius:8px;padding:8px 12px;cursor:pointer;border:1px solid rgba(27,31,35,.18);background:#fff;color:#1b1f23}
#dmCard button.primary{background:#d95728;color:#fff;border-color:#d95728;font-weight:600}
@media (max-width:820px){ #mapBtn{padding:10px 10px;font-size:13px} #compass{top:calc(126px + env(safe-area-inset-top,0px))} .dm-foot{flex-direction:column;align-items:stretch} #dmCard{flex-wrap:wrap} }
#fade{position:fixed;inset:0;background:#0d1114;opacity:0;pointer-events:none;transition:opacity .35s;z-index:9}
#fade.on{opacity:1}
body.walking.tour #walkHint,body.walking.tour #mapBox{display:none}
@media (pointer:coarse){ #joy{display:block} .kb{display:none} }
@media (pointer:fine){ .touch{display:none} }
@media (max-width:1260px) and (min-width:821px){ #roomCard{top:calc(64px + env(safe-area-inset-top,0px))} #walkHint{top:calc(134px + env(safe-area-inset-top,0px))} }
@media (max-width:820px){
  #roomCard{top:calc(62px + env(safe-area-inset-top,0px));max-width:calc(100vw - 28px)}
  #roomName{font-size:17px}
  #minimap{width:150px}
  #tourCard{width:auto;left:12px;right:12px;transform:translateY(16px)}
  #tourCard.show{transform:none}
  #stairPrompt{bottom:calc(170px + env(safe-area-inset-bottom,0px))}
  #walkBtn{padding:10px 12px;font-size:13px}
  .wbtn{padding:8px 10px}
}
@media (max-width:820px){
  #timebar{left:16px;right:16px;width:auto}
  #readout{display:none}
  #panel{bottom:calc(142px + env(safe-area-inset-bottom,0px));max-height:calc(100vh - 230px)}
}
"""
css_add += "\n" + open(os.path.join("/home/claude/work/v4v","src","v4.css"),encoding="utf-8").read()
i=head_body.index("</style>")
head_body=head_body[:i]+css_add+head_body[i:]

light_sec = """    <section>
      <h2>Light</h2>
      <div class="grid" id="presets"></div>
      <div class="toggles">
        <label class="row"><input type="checkbox" id="lamps"><span>Interior lights</span></label>
        <label class="row"><input type="checkbox" id="shadows" checked><span>Shadows</span></label>
        <label class="row"><input type="checkbox" id="sunpath"><span>Sun path &amp; compass</span></label>
      </div>
    </section>
    <section>
      <h2>Views</h2>"""
assert head_body.count("""    <section>
      <h2>Views</h2>""")==1
head_body=head_body.replace("""    <section>
      <h2>Views</h2>""", light_sec)

timebar = """  <div id="timebar">
    <button id="play" aria-label="Play the day">▶</button>
    <div class="tb-main">
      <div class="tb-meta"><span id="clockTxt">16:00</span><span id="sunTxt"></span>
        <select id="month" aria-label="Date"></select></div>
      <input type="range" id="clock" min="0" max="24" step="0.0833" value="16" aria-label="Time of day">
      <div class="tb-meta"><span id="riseTxt"></span><span>Karachi 24.86° N</span></div>
    </div>
  </div>
  <div id="loading">"""
walkui = """  <div id="walkUI">
    <div id="walkTop">
      <button class="wbtn" id="walkExit">✕ Exit walk</button>
      <div class="wgroup"><button class="wbtn openMap">🗺 Map</button><button class="wbtn" id="walkFly">✈ Fly</button><button class="wbtn" id="walkDay">☾ Night</button><button class="wbtn" id="walkTour">★ Guided tour</button></div>
    </div>
    <div id="roomCard"><div id="roomName">—</div><div id="roomSub"></div></div>
    <div id="mapBox">
      <div id="floorTabs"><span>Floor</span><button data-f="GF">G</button><button data-f="FF">1</button><button data-f="SF">2</button></div>
      <canvas id="minimap" width="606" height="520" aria-label="Floor map. Click to jump there."></canvas>
    </div>
    <div id="stairPrompt"></div>
    <div id="walkHint"><span class="kb"><b>W A S D</b> walk · <b>drag</b> or <b>double-click</b> for mouse-look · <b>Space</b> jump · <b>F</b> fly through walls · <b>M</b> or click the small map: building map · <b>Shift</b> run</span><span class="touch"><b>Joystick</b> to walk · <b>drag</b> to look · <b>✈ Fly</b> to pass through walls · tap the small map for the building map</span></div>
    <div id="joy" aria-label="Movement joystick"><i></i></div>
    <div id="flyBtns"><button class="wbtn" id="flyUp" aria-label="Fly up">▲</button><button class="wbtn" id="flyDn" aria-label="Fly down">▼</button></div>
    <div id="tourCard" role="dialog" aria-live="polite">
      <div id="tourHead"><span id="tourStep"></span><span id="tourTitle"></span></div>
      <div id="tourText"></div>
      <div id="tourBtns"><button id="tourPrev">‹ Back</button><button id="tourNext" class="primary">Next ›</button><button id="tourAuto">▶ Auto</button><span class="sp"></span><button id="tourEnd">Walk freely</button></div>
    </div>
    <div id="routeBar"><span id="routeText"></span><button id="routeCancel" aria-label="Cancel route">✕</button></div>
    <div id="fade"></div>
  </div>
  <div id="compass" aria-hidden="true"><div id="compassN"><b>N</b><i></i></div></div>
  <div id="credit">Made by <b>Engr. Shamroze Nasir</b></div>
  <div id="dirMap" hidden>
    <div class="dm-head">
      <h2>Building map</h2>
      <div id="dmTabs"><button data-f="GF">Ground</button><button data-f="FF">First</button><button data-f="SF">Second</button></div>
      <label id="dmUnderL"><input type="checkbox" id="dmUnder"> Drawing</label>
      <input id="dmSearch" list="dmList" placeholder="Find a room or a size… e.g. CCTV room, 13'-0&quot;" autocomplete="off"><datalist id="dmList"></datalist>
      <button id="dmClose" aria-label="Close map">✕</button>
    </div>
    <div class="dm-body"><canvas id="dmCanvas"></canvas>
      <div id="dmZoom"><button id="dmZin" aria-label="Zoom in">+</button><span id="dmZoomLevel">100%</span><button id="dmZout" aria-label="Zoom out">−</button><button id="dmZfit" aria-label="Fit the plan">⤢</button></div>
      <div id="dmMore" hidden></div></div>
    <div class="dm-foot"><div id="dmLegend"><span><i style="background:#a9c6e8"></i>Work areas</span><span><i style="background:#cfb3e6"></i>Meeting rooms</span><span><i style="background:#f3c98f"></i>Staff welfare & prayer</span><span><i style="background:#9fd8d0"></i>Toilets & washrooms</span><span><i style="background:#d9cfbf"></i>Service & plant</span><span><i style="background:#f2ad8d"></i>Entrance & reception</span><span><i style="background:#2f5d7c"></i>Stairs</span><span><i style="background:#b9d99a"></i>Outdoor</span></div>
      <span id="dmCredit">Made by Engr. Shamroze Nasir</span>
      <div id="dmCard" hidden><div><b id="dmName"></b><span id="dmInfo"></span></div>
        <button id="dmRoute" class="primary">➜ Show me the way</button><button id="dmWalk">🚶 Take me there</button></div>
    </div>
  </div>
  <div id="loading">"""
head_body=head_body.replace('  <div id="loading">', walkui, 1)
assert head_body.count('  <div id="loading">')==1
head_body=head_body.replace('  <div id="loading">', timebar)
head_body=head_body.replace('<div id="loading"><div class="spin"></div><span>Loading model…</span></div>','<div id="loading"><div class="ldbox"><div class="ldrow"><div class="spin"></div><span id="loadText">Loading the Disrupt 141-C viewer…</span></div><div id="loadBar"><i style="width:8%"></i></div></div></div>')

# v4: data as non-executed blocks, read on demand (large JS string literals were slowing the page parse)
def _blk(i, t, body): return f'<script type="{t}" id="{i}">' + body.replace("</", "<\\/") + '</script>\n'
_m=model[len('window.MODEL_B64="'):model.index('";</script>')]
DATA=(_blk("d-model","text/plain",_m)+_blk("d-walk","application/json",walkdata)+_blk("d-furn","application/json",furn)
      +_blk("d-cg","application/json",cleang)+_blk("d-arch","application/json",archdata)
      +"".join(_blk("d-under-"+k,"text/plain",v) for k,v in archunder.items())
      +_blk("d-solar","application/json",open("/home/claude/work/v4v/data/solar_design.json").read()))
SHIM=("<script>(function(){var T=function(i){var e=document.getElementById(i);return e?e.textContent:null;},J=function(i){var t=T(i);return t?JSON.parse(t):null;};"
      "Object.defineProperty(window,'MODEL_B64',{get:function(){return T('d-model');}});"
      "window.WALK_DATA=J('d-walk');window.FURNITURE=J('d-furn');window.CLEAN_GEOM=J('d-cg');window.ARCH_DATA=J('d-arch');window.SOLAR=J('d-solar');"
      "var U={};['GF','FF','SF'].forEach(function(k){Object.defineProperty(U,k,{enumerable:true,get:function(){return T('d-under-'+k);}});});window.ARCH_UNDER=U;})();</script>\n")
import re
m=re.search(r'<p class="note">.*?</p>', head_body, re.S)
note=('<p class="note">Horizontal geometry rasterised from the dimension and ceiling plans at a calibrated '
 '1&quot;&nbsp;=&nbsp;12&#8242;&#8209;0&quot;. First and second floor sheets registered to the ground floor on shared columns (RMS 0.2 ft). Every floor level from the LEV tags on the plans. Site wall height and finishes are assumptions.<br><br>'
 'Seating, WCs and basins are traced from the furniture plans A-401 / A-402 / A-403; other equipment is laid out by department. Sun positions are computed for Karachi, with the entrance assumed to face south (no north point in the set). '
 'Interior lighting is illustrative only; the drawings contain no lighting layout.</p>')
head_body=head_body[:m.start()]+note+head_body[m.end():]
hb='<button id="panelToggle"'
assert head_body.count(hb)==1
head_body=head_body.replace(hb,'<button id="mapBtn" class="openMap">🗺 Building map</button><button id="walkBtn">🚶 Walk inside</button>\n    '+hb)
ps='<aside id="panel">'
assert head_body.count(ps)==1
head_body=head_body.replace(ps, ps+'\n    <button id="walkBtn2">🚶 Walk inside the building</button>')
head_body=head_body.replace('<title>Disrupt 141-C Model</title>','<title>Disrupt 141-C — 3D viewer v4.0</title>')
assert '<title>' in head_body[:40]
i=head_body.index("</style>")+len("</style>")
out=('<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
     '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
     +'<meta name="theme-color" content="#2f5d7c">\n<meta name="description" content="Disrupt 141-C: 3D building viewer, wayfinding and rooftop solar concept. Made by Engr. Shamroze Nasir.">\n'
     +'<link rel="icon" type="image/png" href="data:image/png;base64,'+open('/home/claude/v4/pwa/favicon64.b64').read().strip()+'">\n'
     +head_body[:i]+'\n</head>\n<body>\n'+head_body[i:]
     +DATA+SHIM+"<script>"+three+"<script>"+app+"</script>\n</body>\n</html>\n")
os.makedirs("/home/claude/work/out",exist_ok=True); open("/home/claude/work/out/viewer_v4.html","w",encoding="utf-8").write(out); print(len(out))
print(len(out)/1e6,"MB")
