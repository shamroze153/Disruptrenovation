(function () {
const LEVELS = [
  ["Road datum", "±0'-0\""], ["Ground FFL", "+1'-0\""], ["West ground FFL", "+2'-0\""],
  ["First FFL", "+12'-5\""], ["West first FFL", "+13'-3\" / +13'-11\" / +16'-11\""],
  ["Second FFL", "+23'-10\""], ["West second FFL", "+25'-9\""],
  ["Roof slab", "+35'-3\""], ["Parapet", "+39'-3\""]
];
const LABELS = [
  ["Courtyard", 86.1, 65.8, 8], ["Reception", 86.0, 39.7, 8], ["Entrance foyer", 87.5, 13.1, 6],
  ["Guard", 83.2, 4.2, 4], ["Gym", 108.1, 118.0, 7], ["Generator", 138.1, 121.0, 7],
  ["Reading room", 109.1, 80.8, 7], ["Meeting room", 111.1, 61.8, 7], ["Board room", 117.1, 39.7, 7],
  ["Day care", 57.0, 96.9, 8], ["Main stair", 89.0, 99.9, 9], ["Workshop", 126.1, 67.8, 7],
  ["Procurement store", 127.1, 54.7, 7], ["Lawn", 112.1, 17.6, 3], ["Workstations", 45.0, 42.7, 8],
  ["Shower and changing", 120.1, 100.9, 7],
  ["Workstations", 35.0, 66.8, 19.5], ["Work stations (36 persons)", 93.0, 117.0, 19.5],
  ["Meeting rooms", 22.0, 111.9, 24], ["Server room", 130.1, 98.9, 19.5],
  ["Rooftop cafeteria", 117.1, 54.7, 31], ["Masjid", 84.5, 37.7, 31],
  ["Recreational area", 110.1, 85.8, 31], ["Workstations", 27.0, 70.8, 33]
];
const LAYER_GROUPS = {
  "Ground floor":   ["GF_Slab", "GF_External_Walls", "GF_Glazing", "GF_Internal_Walls", "GF_Stairs", "GF_Columns"],
  "First floor":    ["FF_Slab", "FF_External_Walls", "FF_Glazing", "FF_Internal_Walls", "FF_Stairs"],
  "Second floor":   ["SF_Slab", "SF_External_Walls", "SF_Glazing", "SF_Internal_Walls", "SF_Stairs"],
  "Roofs & parapets": ["Roof_Level_12-5_Slab","Roof_Level_23-10_Slab",
                       "Roof_Level_35-3_Slab","Roof_Level_35-3_Parapet",
                       "Roof_Corrugated_Sheet"],
  "Courtyard":      ["Courtyard_Paving", "Courtyard_Glazing"],
  "Site & ground":  ["Site_Boundary_Wall", "Ground_Apron", "Guard_Post"]
};
const PALETTE = {
  "Site_Boundary_Wall":0xc3bdb0, "Ground_Apron":0xb5b1a8,
  "GF_Slab":0xb0aca4, "FF_Slab":0xb0aca4, "SF_Slab":0xb0aca4,
  "GF_External_Walls":0xdedacf, "FF_External_Walls":0xdedacf, "SF_External_Walls":0xdedacf,
  "GF_Internal_Walls":0xe8e4da, "FF_Internal_Walls":0xe8e4da, "SF_Internal_Walls":0xe8e4da,
  "GF_Glazing":0x8fb6cc, "FF_Glazing":0x8fb6cc, "SF_Glazing":0x8fb6cc,
  "Roof_Level_12-5_Slab":0xa9a59c, "Roof_Level_23-10_Slab":0xa9a59c, "Roof_Level_35-3_Slab":0xa9a59c,
  "Roof_Level_12-5_Parapet":0xd8d3c8, "Roof_Level_23-10_Parapet":0xd8d3c8, "Roof_Level_35-3_Parapet":0xd8d3c8,
  "Roof_Corrugated_Sheet":0x9a9c99, "GF_Stairs":0xc6c2b8, "FF_Stairs":0xc6c2b8, "SF_Stairs":0xc6c2b8,
  "Courtyard_Paving":0xb8b2a6, "Courtyard_Glazing":0x8fb6cc, "GF_Columns":0xcfcac0, "Guard_Post":0xdedacf
};
const CX = 75, CY = 65;                     // plan centre, feet

// ---------------------------------------------------------------- site + sun
// Karachi. Orientation is the report's assumption 10: entrance on the south edge, +Y = north.
const SITE = { lat: 24.86, lon: 67.01, tz: 5 };
const MONTHS = [["21 Jan",21],["21 Feb",52],["21 Mar · equinox",80],["21 Apr",111],["21 May",141],
  ["21 Jun · summer solstice",172],["21 Jul",202],["21 Aug",233],["21 Sep · equinox",264],
  ["21 Oct",294],["21 Nov",325],["21 Dec · winter solstice",355]];
const R2D = 180 / Math.PI, D2R = Math.PI / 180;

function solar(doy, hour) {
  const g = 2 * Math.PI / 365 * (doy - 1 + (hour - 12) / 24);
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g)
           - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const d = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g)
          + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const tst = hour * 60 + eq + 4 * SITE.lon - 60 * SITE.tz;
  const ha = (tst / 4 - 180) * D2R, lat = SITE.lat * D2R;
  const cz = Math.sin(lat) * Math.sin(d) + Math.cos(lat) * Math.cos(d) * Math.cos(ha);
  const alt = Math.asin(Math.max(-1, Math.min(1, cz))) * R2D;
  const az = (Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(lat) - Math.tan(d) * Math.cos(lat)) * R2D + 540) % 360;
  return { alt, az };
}
function sunVec(alt, az) {
  return new THREE.Vector3(Math.cos(alt * D2R) * Math.sin(az * D2R),
                           Math.cos(alt * D2R) * Math.cos(az * D2R), Math.sin(alt * D2R));
}
function findHour(doy, target, rising) {
  let lo = rising ? 3 : 12.8, hi = rising ? 12.2 : 22;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2, a = solar(doy, m).alt;
    if (rising ? a < target : a > target) lo = m; else hi = m;
  }
  return (lo + hi) / 2;
}
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const hhmm = (h) => { h = ((h % 24) + 24) % 24; let H = Math.floor(h), M = Math.round((h - H) * 60); if (M === 60) { H = (H + 1) % 24; M = 0; } return String(H).padStart(2, "0") + ":" + String(M).padStart(2, "0"); };
const compass = (az) => ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"][Math.round(az / 22.5) % 16];

// Atmosphere keyed to sun altitude. Daytime horizon is a warm dusty haze, as over Karachi.
// alt, sun colour, sun I, sky top, horizon, hemi sky, hemi ground, hemi I, exposure
const KEYS = [
  [-18, 0x000000, 0.0, 0x03060c, 0x0a1020, 0x1a2744, 0x08080b, 0.40, 1.10],
  [ -8, 0x000000, 0.0, 0x07102a, 0x1d2442, 0x2c4068, 0x101118, 0.8, 1.06],
  [ -3, 0x000000, 0.0, 0x1a3268, 0x8a5a60, 0x5f72a8, 0x2c2a30, 1.4, 1.04],
  [  0, 0xff6a2a, 0.3, 0x2c4a86, 0xe0885a, 0x8594bb, 0x4a3a30, 1.1, 0.98],
  [  4, 0xff9448, 1.6, 0x416aa6, 0xf2a66a, 0xa7b6d6, 0x6d5a45, 0.88, 0.97],
  [ 10, 0xffbd78, 2.5, 0x5985c0, 0xf0c69a, 0xc3d3ec, 0x857560, 0.95, 1.00],
  [ 22, 0xffe0b6, 3.1, 0x5a90d0, 0xe6d6bd, 0xd5e4fb, 0x8f8574, 1.05, 1.00],
  [ 45, 0xfff2e0, 3.4, 0x4f8ad0, 0xdcdcd6, 0xdcecff, 0x918a7b, 1.15, 0.93],
  [ 90, 0xfff7ee, 3.5, 0x4a88d2, 0xdfe2e4, 0xdcecff, 0x918a7b, 1.2, 0.92]
].map(k => ({ alt: k[0], sun: new THREE.Color(k[1]), sunI: k[2], top: new THREE.Color(k[3]),
  hor: new THREE.Color(k[4]), hSky: new THREE.Color(k[5]), hGnd: new THREE.Color(k[6]), hI: k[7], exp: k[8] }));

function sampleKeys(alt) {
  const a = clamp(alt, KEYS[0].alt, KEYS[KEYS.length - 1].alt);
  let i = 0; while (i < KEYS.length - 2 && a > KEYS[i + 1].alt) i++;
  const A = KEYS[i], B = KEYS[i + 1], t = (a - A.alt) / (B.alt - A.alt);
  const c = (k) => new THREE.Color().lerpColors(A[k], B[k], t);
  const n = (k) => A[k] + (B[k] - A[k]) * t;
  return { sun: c("sun"), sunI: n("sunI"), top: c("top"), hor: c("hor"), hSky: c("hSky"), hGnd: c("hGnd"), hI: n("hI"), exp: n("exp") };
}

// Interior light positions: kept well inside the floor plates. Illustrative, not a lighting layout.
const LAMP_XY = [[35, 40], [35, 95], [58, 66], [115, 38], [115, 96], [122, 66]];
const LAMP_Z  = [9.5, 20.9, 32.2];
const LAMP_I  = 360;

let scene, camera, renderer, controls, labelRenderer, root;
let sun, hemi, fill, ground, sky, skyMat, fogObj, pathGroup, sunMarker, lampGroup;
const groups = {}, labelObjs = [], envMats = [], glassMats = [];
let mode = "material", exploded = false;
const today = new Date();
const light = {
  doy: MONTHS[today.getMonth()][1], hour: 16.0, preset: "afternoon",
  lampsManual: null, shadows: true, path: false, playing: false, lampsOn: false
};

function el(t, c, h) { const e = document.createElement(t); if (c) e.className = c; if (h !== undefined) e.innerHTML = h; return e; }

function init() {
  THREE.Object3D.DEFAULT_UP = new THREE.Vector3(0, 0, 1);
  const stage = document.getElementById("stage");
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdfe4e8);

  camera = new THREE.PerspectiveCamera(32, 1, 1, 6000);
  camera.up.set(0, 0, 1);
  renderer = new THREE.WebGLRenderer({ antialias: QUAL.aa, preserveDrawingBuffer: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(basePR());
  renderer.shadowMap.enabled = QUAL.shadows;
  renderer.shadowMap.type = QUAL.soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;            // v4: baked, redrawn only when the sun or the shown floors change
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);

  labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.style.position = "absolute";
  labelRenderer.domElement.style.top = "0";
  labelRenderer.domElement.style.pointerEvents = "none";
  document.getElementById("labels").appendChild(labelRenderer.domElement);

  const pmrem = new THREE.PMREMGenerator(renderer);
  try { scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; } catch (e) { console.log("env skipped", e.message); }

  hemi = new THREE.HemisphereLight(0xdcecff, 0x9a9384, 1.4);
  scene.add(hemi);
  sun = new THREE.DirectionalLight(0xfff3e0, 2.6);
  sun.castShadow = true;
  const big = innerWidth > 820;
  sun.shadow.mapSize.set(QUAL.shadowSize, QUAL.shadowSize);
  const d = 170;
  Object.assign(sun.shadow.camera, { left: -d, right: d, top: d, bottom: -d, near: 1, far: 1000 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.35;
  sun.target.position.set(CX, CY, 0);
  scene.add(sun); scene.add(sun.target);
  fill = new THREE.DirectionalLight(0xcfe0ff, 0.45);
  fill.position.set(220, 160, 120); scene.add(fill);

  ground = new THREE.Mesh(
    new THREE.PlaneGeometry(9000, 9000),
    new THREE.MeshStandardMaterial({ color: 0xaca494, roughness: 1 }));
  ground.position.z = -0.8; ground.receiveShadow = true; scene.add(ground);
  ground.material.userData.baseEnv = 0.3; envMats.push(ground.material);

  buildSky();
  fogObj = new THREE.Fog(0xdfe4e8, 750, 3200);

  lampGroup = new THREE.Group();          // v4: lamp positions only; lampPoolUpdate() lights the nearest ones
  LAMP_Z.forEach((z, fl) => LAMP_XY.forEach(([x, y]) => {
    const p = new THREE.PointLight(0xffcf96, LAMP_I, 28, 2); p.position.set(x, y, z);
    p.userData = { z0: z, fl }; lampGroup.add(p);
  }));
  const court = new THREE.PointLight(0xffc88a, LAMP_I * 0.9, 24, 2); court.position.set(87.6, 66, 7);
  court.userData = { z0: 7, fl: 0 }; lampGroup.add(court);
  const recep = new THREE.PointLight(0xffd6a2, LAMP_I * 0.8, 22, 2); recep.position.set(85, 37, 16);
  recep.userData = { z0: 16, fl: 0 }; lampGroup.add(recep);
  lampGroup.visible = false;
  lampPoolInit(QUAL.lamps);

  pathGroup = new THREE.Group(); pathGroup.visible = false; scene.add(pathGroup);
  sunMarker = new THREE.Mesh(new THREE.SphereGeometry(5, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0xffd98a, toneMapped: false, fog: false }));
  scene.add(sunMarker); sunMarker.visible = false;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.07;
  controls.target.set(CX, CY, 16);
  controls.maxPolarAngle = Math.PI * 0.499;
  controls.maxDistance = 1400;

  root = new THREE.Group();
  scene.add(root);

  loadProgress(0.25, "Reading the model…");
  new GLTFLoader().parse(base64ToArrayBuffer(window.MODEL_B64), "", (gltf) => {
    const meshes = [];
    gltf.scene.traverse((o) => { if (o.isMesh) meshes.push(o); });
    // Straightened geometry: plate outlines, external and internal walls, top roof re-derived without the 6" raster stepping
    const CG = window.CLEAN_GEOM || {};
    meshes.forEach((o) => {
      const nm = (o.name || (o.parent && o.parent.name) || "").replace(/\.\d+$/, "");
      const list = CG[nm]; if (!list) return;
      const n = list.length, P = new Float32Array(n * 36 * 3), N = new Float32Array(n * 36 * 3), ZB = new Float32Array(n * 36);
      const tmpl = new THREE.BoxGeometry(1, 1, 1).toNonIndexed(), tp = tmpl.attributes.position.array, tn = tmpl.attributes.normal.array;
      list.forEach((b, i) => {
        const sx = b[3] - b[0], sy = b[4] - b[1], sz = b[5] - b[2], cx = (b[0] + b[3]) / 2, cy = (b[1] + b[4]) / 2, cz = (b[2] + b[5]) / 2;
        for (let v = 0; v < 36; v++) {
          const o3 = (i * 36 + v) * 3;
          P[o3] = tp[v * 3] * sx + cx; P[o3 + 1] = tp[v * 3 + 1] * sy + cy; P[o3 + 2] = tp[v * 3 + 2] * sz + cz;
          N[o3] = tn[v * 3]; N[o3 + 1] = tn[v * 3 + 1]; N[o3 + 2] = tn[v * 3 + 2]; ZB[i * 36 + v] = b[2];
        }
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.BufferAttribute(N, 3));
      g.setAttribute("zbase", new THREE.BufferAttribute(ZB, 1));   // skirting / floor-contact shading measured from each wall's own base
      o.geometry.dispose(); o.geometry = g;
    });
    meshes.forEach((o) => {
      o.castShadow = o.receiveShadow = true;
      if (!o.geometry.attributes.normal) {
        o.geometry = o.geometry.toNonIndexed();
        o.geometry.computeVertexNormals();
      }
      const pname = o.parent && o.parent.name ? o.parent.name : "";
      const name = (o.name || pname || "part").replace(/\.\d+$/, "");
      o.userData.key = name;
      const c = new THREE.Color(PALETTE[name] !== undefined ? PALETTE[name] : 0xd6d2c8);
      const glassy = /Glazing/.test(name);
      o.material = new THREE.MeshStandardMaterial({
        color: glassy ? 0x9fc3d6 : c,
        roughness: glassy ? 0.08 : 0.82,
        metalness: 0.0,
        transparent: glassy, opacity: glassy ? 0.45 : 1,
        envMapIntensity: glassy ? 1.6 : 0.8,
        emissive: glassy ? 0xffc47e : 0x000000, emissiveIntensity: 0,
        side: THREE.DoubleSide
      });
      if (glassy) o.castShadow = false;
      o.material.userData.baseEnv = o.material.envMapIntensity;
      envMats.push(o.material);
      if (glassy) glassMats.push(o.material);
      o.userData.baseColor = o.material.color.clone();
      if (/Walls|Parapet|Boundary/.test(name)) enhanceMaterial(o.material, "wall");
      else if (/_Slab$/.test(name)) enhanceMaterial(o.material, "slab");
      if (!groups[name]) { groups[name] = new THREE.Group(); groups[name].name = name; root.add(groups[name]); }
      groups[name].add(o);
    });
    loadProgress(0.55, "Building the shell…");
    furnGroups();
    buildFrames(); buildLandscape(); buildEntrancePin();
    buildUI();
    perfBuildUI();
    archInitButtons();
    mobInit();
    wayBuildUI();
    solarBuildUI();
    extrasBuildUI();
    bindWalkInput();
    bindMap();
    document.getElementById("walkBtn").onclick = () => enterWalk();
    document.getElementById("walkBtn2").onclick = () => enterWalk();
    setLabels(false);
    setView("front34");
    buildSunPath();
    setPreset("afternoon");
    // first view: the building shell. Furniture, people, the walk floors and labels follow without blocking.
    invalidate(3000);
    requestAnimationFrame(() => requestAnimationFrame(async () => {
      document.getElementById("loading").style.display = "none";
      window.__firstFrame = true; window.__tFirst = performance.now();
      furnProgress(0);
      await buildFurniture(furnProgress);
      furnProgress(1);
      if (renderer.compileAsync && renderer.extensions.has("KHR_parallel_shader_compile")) { try { await renderer.compileAsync(scene, camera); } catch (e) {} }
      await new Promise(r => setTimeout(r, 0));
      buildWalkScene();
      buildRoomLabels(); setLabels(mode && /cut/.test(mode) ? { cutGF: 0, cutFF: 1, cutSF: 2 }[mode] : false);
      if (ARCH.on) archSetCut(ARCH.cut);
      SH.sig = ""; invalidate(2000);
      window.__tReady = performance.now(); window.__ready = true;
      if (typeof applyDeepLink === "function") applyDeepLink();
    }));
  }, (e) => console.error(e));

  addEventListener("resize", resize); resize(); perfBindEvents(); requestAnimationFrame(animate);
  if (window.visualViewport) visualViewport.addEventListener("resize", resize);
}

function base64ToArrayBuffer(b64) {
  const bin = atob(b64), len = bin.length, bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

// ---------------------------------------------------------------- sky dome
function buildSky() {
  skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, toneMapped: true, fog: false,
    uniforms: {
      top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, below: { value: new THREE.Color() },
      sunDir: { value: new THREE.Vector3(0, 0, 1) }, sunCol: { value: new THREE.Color() },
      sunVis: { value: 1 }, stars: { value: 0 }
    },
    vertexShader: `varying vec3 vDir;
      void main(){ vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: `uniform vec3 top, horizon, below, sunDir, sunCol; uniform float sunVis, stars; varying vec3 vDir;
      float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      void main(){
        vec3 d = normalize(vDir); float y = d.z;
        vec3 c = y > 0.0 ? mix(horizon, top, pow(clamp(y, 0.0, 1.0), 0.32)) : mix(horizon, below, clamp(-y * 5.0, 0.0, 1.0));
        float s = max(dot(d, sunDir), 0.0);
        c += sunCol * sunVis * (pow(s, 1400.0) * 14.0 + pow(s, 60.0) * 0.45 + pow(s, 6.0) * 0.18 * (1.0 - clamp(y * 2.0, 0.0, 1.0)));
        if (stars > 0.001 && y > 0.03) {
          vec3 q = floor(d * 900.0); float r = h3(q);
          c += vec3(0.85, 0.9, 1.0) * step(0.9990, r) * stars * (0.35 + 0.65 * h3(q + 7.1)) * smoothstep(0.03, 0.35, y);
        }
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), skyMat);
  sky.frustumCulled = false; sky.renderOrder = -10;
  scene.add(sky);
}

// ---------------------------------------------------------------- sun-path diagram
function buildSunPath() {
  pathGroup.clear();
  const R = 215, c = new THREE.Vector3(CX, CY, 0);
  const arc = (doy, color, opacity) => {
    const rise = findHour(doy, -0.83, true), set = findHour(doy, -0.83, false), pts = [];
    for (let i = 0; i <= 160; i++) {
      const h = rise + (set - rise) * i / 160, s = solar(doy, h);
      pts.push(sunVec(Math.max(s.alt, 0), s.az).multiplyScalar(R).add(c));
    }
    const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity, toneMapped: false, fog: false }));
    pathGroup.add(ln);
    return { rise, set };
  };
  [[172, "Jun 21"], [355, "Dec 21"]].forEach(([doy, t]) => {
    if (doy === light.doy) return;
    arc(doy, 0x9aa7b4, 0.55);
    const s = solar(doy, 12.4), lb = makeLabel(t, 0.12);
    lb.position.copy(sunVec(s.alt, s.az).multiplyScalar(R).add(c)).add(new THREE.Vector3(0, 0, 12));
    pathGroup.add(lb);
  });
  const { rise, set } = arc(light.doy, 0xffa94d, 0.95);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xffa94d, toneMapped: false, fog: false });
  for (let h = Math.ceil(rise); h <= Math.floor(set); h++) {
    const s = solar(light.doy, h); if (s.alt < 2) continue;
    const p = sunVec(s.alt, s.az).multiplyScalar(R).add(c);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(1.8, 12, 8), dotMat); dot.position.copy(p); pathGroup.add(dot);
    if (h % 2 === 0) { const lb = makeLabel(h + ":00", 0.12); lb.position.copy(p).add(new THREE.Vector3(0, 0, 12)); pathGroup.add(lb); }
  }
  const ring = [];
  for (let i = 0; i <= 128; i++) { const a = i / 128 * Math.PI * 2; ring.push(new THREE.Vector3(CX + R * Math.sin(a), CY + R * Math.cos(a), 0.2)); }
  pathGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ring),
    new THREE.LineBasicMaterial({ color: 0x6b7784, transparent: true, opacity: 0.6, fog: false })));
  [["N", 0], ["E", 90], ["S", 180], ["W", 270]].forEach(([t, az]) => {
    const lb = makeLabel(t, 0.17);
    lb.position.set(CX + (R + 22) * Math.sin(az * D2R), CY + (R + 22) * Math.cos(az * D2R), 4);
    pathGroup.add(lb);
  });
  const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(CX, CY + R - 34, 0.3), 26, 0x2f5d7c, 9, 6);
  pathGroup.add(arrow);
  pathGroup.userData.rise = rise; pathGroup.userData.set = set;
}

// ---------------------------------------------------------------- lighting
function setEnv(f) { envMats.forEach(m => m.envMapIntensity = m.userData.baseEnv * f); }

function applyLight() {
  if (ARCH.on) { archLighting(); return; }
  const s = solar(light.doy, light.hour);
  const studio = light.preset === "studio";
  const night = smooth(3, -7, s.alt);
  const auto = studio ? false : s.alt < 4;
  const on = light.lampsManual === null ? auto : light.lampsManual;
  light.lampsOn = on;

  if (studio) {
    sky.visible = false; scene.fog = null; scene.background = new THREE.Color(0xdfe4e8);
    hemi.color.set(0xdcecff); hemi.groundColor.set(0x9a9384); hemi.intensity = 1.4;
    sun.color.set(0xfff3e0); sun.intensity = 2.6;
    sun.position.set(CX - 150, CY - 210, 300);
    fill.color.set(0xcfe0ff); fill.intensity = 0.45; fill.position.set(CX + 220, CY + 160, 120);
    renderer.toneMappingExposure = 1.0; setEnv(1);
  } else {
    const k = sampleKeys(s.alt);
    let dir, col, I;
    if (s.alt > -3) { dir = sunVec(Math.max(s.alt, 0.6), s.az); col = k.sun; I = k.sunI; }
    else { dir = sunVec(52, 145); col = new THREE.Color(0x9fb3ff); I = 0.5 * smooth(-3, -12, s.alt); }
    sun.position.set(CX, CY, 0).addScaledVector(dir, 480); sun.color.copy(col); sun.intensity = I;
    hemi.color.copy(k.hSky); hemi.groundColor.copy(k.hGnd); hemi.intensity = k.hI;
    const fdir = sunVec(25, (s.az + 180) % 360);
    fill.position.set(CX, CY, 0).addScaledVector(fdir, 300);
    fill.color.set(0xcfe0ff); fill.intensity = 0.4 * (1 - night);
    sky.visible = true; scene.background = null; scene.fog = fogObj;
    fogObj.color.copy(k.hor);
    const u = skyMat.uniforms;
    u.top.value.copy(k.top); u.horizon.value.copy(k.hor);
    u.below.value.copy(k.hor).multiplyScalar(0.6);
    u.sunDir.value.copy(sunVec(s.alt, s.az)); u.sunCol.value.copy(k.sun);
    u.sunVis.value = smooth(-4, 1, s.alt); u.stars.value = smooth(-8, -16, s.alt) * 0.9 + smooth(-5, -9, s.alt) * 0.4;
    renderer.toneMappingExposure = k.exp;
    setEnv(0.06 + 0.5 * (1 - night));
  }
  sun.castShadow = light.shadows && QUAL.shadows && sun.intensity > 0.03;

  const glow = on ? (0.12 + 0.88 * night) : 0;
  glassMats.forEach(m => { m.emissiveIntensity = 1.9 * glow; m.opacity = 0.45 + 0.25 * glow; });
  lampGroup.visible = on;
  lampGroup.children.forEach((l, i) => { l.intensity = (i >= 18 ? 0.85 : 1) * LAMP_I * (0.35 + 0.65 * night); });

  const showSun = light.path && !studio && s.alt > 0;
  sunMarker.visible = showSun;
  if (showSun) sunMarker.position.copy(sunVec(s.alt, s.az).multiplyScalar(215).add(new THREE.Vector3(CX, CY, 0)));
  pathGroup.visible = light.path;

  syncLightUI(s);
}

const PRESETS = [
  ["sunrise", "Sunrise"], ["morning", "Morning"], ["noon", "Noon"], ["afternoon", "Afternoon"],
  ["golden", "Golden hour"], ["dusk", "Dusk"], ["night", "Night"], ["studio", "Studio"]
];
function presetHour(p) {
  const rise = findHour(light.doy, -0.83, true), set = findHour(light.doy, -0.83, false);
  return { sunrise: rise + 0.2, morning: 9.5, noon: (rise + set) / 2, afternoon: 15.5,
           golden: findHour(light.doy, 6, false), dusk: set + 0.33, night: 21, studio: light.hour }[p];
}
function setPreset(p) {
  light.preset = p; light.lampsManual = null;
  light.hour = presetHour(p);
  document.getElementById("clock").value = light.hour;
  applyLight();
}

function syncLightUI(s) {
  document.querySelectorAll("#presets button").forEach(b => b.classList.toggle("on", b.dataset.p === light.preset));
  const lamps = document.getElementById("lamps"); if (lamps) lamps.checked = light.lampsOn;
  const t = document.getElementById("clockTxt"); if (!t) return;
  t.textContent = light.preset === "studio" ? "Studio light" : hhmm(light.hour);
  const st = document.getElementById("sunTxt");
  if (light.preset === "studio") st.textContent = "neutral, not time-based";
  else if (s.alt > 0) st.textContent = `Sun ${Math.round(s.alt)}° high · ${compass(s.az)} ${Math.round(s.az)}°`;
  else if (s.alt > -6) st.textContent = "Twilight · sun below horizon";
  else st.textContent = "Night";
  const rise = findHour(light.doy, -0.83, true), set = findHour(light.doy, -0.83, false);
  document.getElementById("riseTxt").textContent = `Sunrise ${hhmm(rise)} · Sunset ${hhmm(set)}`;
}

function paintTrack() {
  const stops = [];
  for (let h = 0; h <= 24; h += 0.5) {
    const s = solar(light.doy, h), k = sampleKeys(s.alt);
    const c = new THREE.Color().lerpColors(k.hor, k.top, 0.45);
    stops.push(`${c.getStyle()} ${(h / 24 * 100).toFixed(1)}%`);
  }
  document.getElementById("clock").style.setProperty("--track", `linear-gradient(90deg, ${stops.join(",")})`);
}

// ---------------------------------------------------------------- views + modes
const VIEWS = {
  frontOrtho: { name: "Front elevation", pos: [CX, -420, 20], tgt: [CX, CY, 19], fov: 12 },
  front34:    { name: "Front three-quarter", pos: [-95, -185, 78], tgt: [CX, CY, 16], fov: 32 },
  rear34:     { name: "Rear three-quarter", pos: [240, 300, 96], tgt: [CX, CY, 16], fov: 32 },
  left:       { name: "Left (west) side", pos: [-330, CY, 24], tgt: [CX, CY, 19], fov: 14 },
  right:      { name: "Right (east) side", pos: [470, CY, 24], tgt: [CX, CY, 19], fov: 14 },
  aerial:     { name: "High three-quarter aerial", pos: [-120, -160, 260], tgt: [CX, CY, 10], fov: 34 },
  eye:        { name: "Eye level at the entrance", pos: [86, -74, 5.6], tgt: [88, 40, 12], fov: 44 },
  axo:        { name: "Axonometric", pos: [-260, -260, 260], tgt: [CX, CY, 14], fov: 20 },
  axoWide:    { name: "Exploded axonometric", pos: [-380, -380, 400], tgt: [CX, CY, 60], fov: 22 },
  sunStudy:   { name: "Sun study", pos: [-330, -420, 330], tgt: [CX, CY, 30], fov: 34 },
  archAxo:    { name: "Architect view · plan cut", pos: [CX - 88, CY - 150, 205], tgt: [CX, CY + 4, 2], fov: 34 },
  planTop:    { name: "Plan (from above)", pos: [CX, CY - 0.5, 560], tgt: [CX, CY, 0], fov: 16 }
};

function setView(k) {
  const v = VIEWS[k]; if (!v) return;
  camera.fov = v.fov; camera.updateProjectionMatrix();
  camera.position.set(...v.pos);
  controls.target.set(...v.tgt); controls.update();
  document.getElementById("viewName").textContent = v.name;
  document.querySelectorAll("#views button").forEach(b => b.classList.toggle("on", b.dataset.k === k));
  if (groups["Site_Boundary_Wall"]) groups["Site_Boundary_Wall"].visible = (k === "aerial" || k === "axo" || k === "sunStudy");
}

function setMode(m) {
  if (m === "arch") {
    mode = "arch"; archOn();
    document.querySelectorAll("#modes button").forEach(b => b.classList.toggle("on", b.dataset.m === m));
    return;
  }
  if (ARCH.on) archOff();
  mode = m;
  const white = (m === "white" || m === "expl");
  KIT.white.value = white ? 1 : 0;
  Object.entries(groups).forEach(([k, g]) => {
    g.traverse(o => {
      if (!o.isMesh || o.userData.fixed) return;
      if (white) { o.material.color.set(/Glazing/.test(k) ? 0xc8d8e2 : 0xf2f1ee); o.material.roughness = 0.92; }
      else { o.material.color.copy(o.userData.baseColor); o.material.roughness = /Glazing/.test(k) ? 0.06 : 0.82; }
    });
  });
  exploded = (m === "expl");
  Object.values(LAYER_GROUPS).flat().forEach(k => { if (groups[k]) groups[k].position.z = 0; });
  if (exploded) {
    const off = { "First floor": 34, "Second floor": 68, "Roofs & parapets": 102 };
    Object.entries(off).forEach(([grp, dz]) => LAYER_GROUPS[grp].forEach(k => { if (groups[k]) groups[k].position.z = dz; }));
  }
  const floorsShown = { cutGF: 1, cutFF: 2 }[m] || 3;
  lampGroup.children.forEach((l) => {
    const fl = l.userData.fl;
    l.position.z = l.userData.z0 + (exploded ? [0, 34, 68][fl] : 0);
    l.visible = fl < floorsShown;
  });
  const cut = { cutGF: ["First floor", "Second floor", "Roofs & parapets"],
                cutFF: ["Second floor", "Roofs & parapets"], cutSF: ["Roofs & parapets"] };
  Object.values(LAYER_GROUPS).flat().forEach(k => { if (groups[k]) groups[k].visible = true; });
  if (cut[m]) cut[m].forEach(grp => LAYER_GROUPS[grp].forEach(k => { if (groups[k]) groups[k].visible = false; }));
  if (m === "cutGF" || m === "cutFF" || m === "cutSF") {
    Object.entries(groups).forEach(([k, g]) => g.traverse(o => {
      if (o.isMesh && !o.userData.fixed && !o.userData.furniture) { o.material.color.set(/Glazing/.test(k) ? 0xc8d8e2 : 0xf4f3f0); o.material.roughness = 0.92; }
    }));
  }
  setLabels(/cut/.test(m) ? { cutGF: 0, cutFF: 1, cutSF: 2 }[m] : false);
  if (walkBuilt) FLOORS.forEach(k => { floorGroups[k].visible = (m === "material" || /cut/.test(m)) && groups[k + "_Slab"].visible; });
  document.querySelectorAll("#modes button").forEach(b => b.classList.toggle("on", b.dataset.m === m));
  document.querySelectorAll("#layers input").forEach(i => { i.checked = LAYER_GROUPS[i.dataset.g].every(k => !groups[k] || groups[k].visible); });
}

function makeLabel(text, scale = 0.055) {
  const pad = 14, fs = 42;
  const c = document.createElement("canvas"), g = c.getContext("2d");
  g.font = `600 ${fs}px ui-sans-serif, Helvetica, Arial, sans-serif`;
  const w = Math.ceil(g.measureText(text).width) + pad * 2;
  c.width = w; c.height = fs + pad * 2;
  const g2 = c.getContext("2d");
  g2.fillStyle = "rgba(255,255,255,0.90)";
  g2.strokeStyle = "rgba(20,26,32,0.22)"; g2.lineWidth = 2;
  const r = 10, W = c.width, H = c.height;
  g2.beginPath();
  g2.moveTo(r, 0); g2.lineTo(W - r, 0); g2.quadraticCurveTo(W, 0, W, r);
  g2.lineTo(W, H - r); g2.quadraticCurveTo(W, H, W - r, H);
  g2.lineTo(r, H); g2.quadraticCurveTo(0, H, 0, H - r);
  g2.lineTo(0, r); g2.quadraticCurveTo(0, 0, r, 0); g2.closePath();
  g2.fill(); g2.stroke();
  g2.font = `600 ${fs}px ui-sans-serif, Helvetica, Arial, sans-serif`;
  g2.fillStyle = "#10161b"; g2.textBaseline = "middle"; g2.textAlign = "center";
  g2.fillText(text, W / 2, H / 2 + 1);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true, fog: false, toneMapped: false }));
  sp.scale.set(W * scale, H * scale, 1);
  sp.renderOrder = 999;
  return sp;
}

function setLabels(on) {
  // on: false, true, or a floor index (0 ground, 1 first, 2 second) to show only that floor's labels
  labelObjs.forEach(o => {
    const fl = o.position.z < 12 ? 0 : o.position.z < 26 ? 1 : 2;
    o.visible = on === true || (typeof on === "number" && on === fl);
  });
}

function buildUI() {
  const vs = document.getElementById("views");
  [["frontOrtho", "Front elevation"], ["front34", "Front 3/4"], ["rear34", "Rear 3/4"],
   ["left", "Left side"], ["right", "Right side"], ["aerial", "Aerial 3/4"],
   ["eye", "Eye level"], ["axo", "Axonometric"],
   ["axoWide", "Exploded axo"], ["sunStudy", "Sun study"], ["planTop", "Plan (top)"], ["archAxo", "Plan 3/4"]].forEach(([k, t]) => {
    const b = el("button", "", t); b.dataset.k = k;
    b.onclick = () => { setView(k); if (k === "sunStudy" && !light.path) { light.path = true; document.getElementById("sunpath").checked = true; applyLight(); } };
    vs.appendChild(b);
  });
  const ms = document.getElementById("modes");
  [["material", "Materials"], ["white", "White model"], ["cutGF", "Ground cutaway"],
   ["cutFF", "First cutaway"], ["cutSF", "Second cutaway"], ["expl", "Exploded"], ["arch", "📐 Architect"]].forEach(([m, t]) => {
    const b = el("button", "", t); b.dataset.m = m; b.onclick = () => setMode(m); ms.appendChild(b);
  });
  const ps = document.getElementById("presets");
  PRESETS.forEach(([p, t]) => { const b = el("button", "", t); b.dataset.p = p; b.onclick = () => { stopPlay(); setPreset(p); }; ps.appendChild(b); });

  const mo = document.getElementById("month");
  MONTHS.forEach(([t, doy]) => { const o = el("option", "", t); o.value = doy; mo.appendChild(o); });
  mo.value = light.doy;
  mo.onchange = () => {
    light.doy = +mo.value; buildSunPath(); paintTrack();
    if (!["morning", "afternoon", "night", "studio", "custom"].includes(light.preset)) { light.hour = presetHour(light.preset); document.getElementById("clock").value = light.hour; }
    applyLight();
  };

  const clk = document.getElementById("clock");
  clk.oninput = () => { stopPlay(); light.hour = +clk.value; light.preset = "custom"; applyLight(); };
  document.getElementById("play").onclick = () => light.playing ? stopPlay() : startPlay();
  document.getElementById("lamps").onchange = (e) => { light.lampsManual = e.target.checked; applyLight(); };
  document.getElementById("shadows").onchange = (e) => { light.shadows = e.target.checked; applyLight(); };
  document.getElementById("sunpath").onchange = (e) => { light.path = e.target.checked; applyLight(); };
  paintTrack();

  const ls = document.getElementById("layers");
  Object.keys(LAYER_GROUPS).forEach(g => {
    const row = el("label", "row");
    const i = document.createElement("input"); i.type = "checkbox"; i.checked = true; i.dataset.g = g;
    i.onchange = () => LAYER_GROUPS[g].forEach(k => { if (groups[k]) groups[k].visible = i.checked; });
    row.appendChild(i); row.appendChild(el("span", "", g)); ls.appendChild(row);
  });
  const tb = document.getElementById("levels");
  LEVELS.forEach(([a, b]) => { const r = el("tr"); r.appendChild(el("td", "", a)); r.appendChild(el("td", "num", b)); tb.appendChild(r); });
  document.getElementById("panelToggle").onclick = () => document.getElementById("panel").classList.toggle("open");
  setMode("material");
}

function startPlay() {
  light.playing = true; if (light.preset !== "custom") light.preset = "custom";
  const b = document.getElementById("play"); b.textContent = "❚❚"; b.setAttribute("aria-label", "Pause");
}
function stopPlay() {
  light.playing = false;
  const b = document.getElementById("play"); if (b) { b.textContent = "▶"; b.setAttribute("aria-label", "Play the day"); }
}

function resize() {
  const vv = window.visualViewport, w = Math.round(vv ? vv.width : innerWidth), h = Math.round(vv ? vv.height : innerHeight);
  if (w < 2 || h < 2) return;
  camera.aspect = w / h; camera.updateProjectionMatrix();
  renderer.setSize(w, h); labelRenderer.setSize(w, h); invalidate(800);
}
let last = 0;
function animate(t) {
  requestAnimationFrame(animate);
  const dt = last ? Math.min((t - last) / 1000, 0.1) : 0; last = t;
  if (light.playing) {
    light.hour = (light.hour + dt * 1.1) % 24;
    document.getElementById("clock").value = light.hour;
    applyLight();
  }
  if (W8.on) { walkStep(dt); navStep(dt); } else { if (controls.update()) invalidate(250); updateCompass(); }
  if (typeof wayFrame === "function") wayFrame(dt, t);
  if (typeof solarFrame === "function") solarFrame(dt);
  PANEL_U.value = W8.on ? (light.lampsOn ? 1.35 : 0.9) : 0.35;
  if (entrancePin) entrancePin.visible = !W8.on && !/cut|expl/.test(mode);
  if (!perfShouldRender(t)) return;
  sky.position.copy(camera.position);
  lampPoolUpdate();
  shadowCheck(t);
  cullBegin();
  if (ARCH.on) { archFrame(); archRender(); } else renderer.render(scene, camera);
  if (window.__cap) { const cb = window.__cap; window.__cap = null; cb(); }
  cullEnd();
  labelRenderer.render(scene, camera);
  perfRendered(t); perfHud(t);
}

// ================================================================ REALISM LAYER
const PANEL_U = { value: 0.3 };
const LV = "0.0,0.5,1.0,2.0,12.4167,13.25,13.9167,16.9167,23.8333,25.75,35.25";
function enhanceMaterial(mat, kind) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uPanel = PANEL_U;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWPos; varying vec3 vWN; attribute float zbase; varying float vZH;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal); vZH = transformed.z - zbase;");
    let frag = sh.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vWPos; varying vec3 vWN; uniform float uPanel; varying float vZH;
float rh(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(rh(i), rh(i + vec3(1,0,0)), f.x), mix(rh(i + vec3(0,1,0)), rh(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(rh(i + vec3(0,0,1)), rh(i + vec3(1,0,1)), f.x), mix(rh(i + vec3(0,1,1)), rh(i + vec3(1,1,1)), f.x), f.y), f.z); }
float aboveFloor(float z){ float lv[11] = float[11](${LV}); float b = -100.0;
  for (int i = 0; i < 11; i++) { if (lv[i] <= z + 0.02) b = max(b, lv[i]); } return z - b; }`);
    let body = QUAL.level === "low" ? `{ ` : `{ float n = vn(vWPos * 1.6) * 0.55 + vn(vWPos * 7.0) * 0.45; diffuseColor.rgb *= 0.95 + 0.08 * n; `;
    if (kind === "wall") body += `if (abs(vWN.z) < 0.5) { float h = vZH;
      diffuseColor.rgb *= mix(0.66, 1.0, smoothstep(0.0, 2.2, h));
      if (h < 0.33) diffuseColor.rgb *= 0.58; } `;
    if (kind === "slab") body += `if (vWN.z < -0.5) { vec2 g = abs(fract(vWPos.xy / 2.0 + 0.5) - 0.5) * 2.0;
      diffuseColor.rgb *= mix(1.0, 0.78, step(0.965, max(g.x, g.y))); } `;
    body += "}";
    frag = frag.replace("#include <color_fragment>", "#include <color_fragment>\n" + body);
    if (kind === "slab") frag = frag.replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
  if (vWN.z < -0.5) totalEmissiveRadiance += diffuseColor.rgb * 0.22 * uPanel;
  if (vWN.z < -0.5) { vec2 t = floor(vWPos.xy / 2.0); vec2 f = fract(vWPos.xy / 2.0);
    if (mod(t.x, 3.0) == 1.0 && mod(t.y, 3.0) == 1.0 && f.x > 0.1 && f.x < 0.9 && f.y > 0.1 && f.y < 0.9)
      totalEmissiveRadiance += vec3(1.0, 0.96, 0.88) * uPanel; }`);
    sh.fragmentShader = frag;
  };
  mat.customProgramCacheKey = () => "enh-" + kind + (mat.transparent ? "t" : "") + (QUAL.level === "low" ? "L" : "");
  mat.needsUpdate = true;
}

function boxesOf(geo) {
  const P = geo.attributes.position, per = geo.index ? 8 : 36, out = [];
  for (let b = 0; b * per < P.count; b++) {
    let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
    for (let v = b * per; v < (b + 1) * per; v++) {
      const x = P.getX(v), y = P.getY(v), z = P.getZ(v);
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); z0 = Math.min(z0, z); x1 = Math.max(x1, x); y1 = Math.max(y1, y); z1 = Math.max(z1, z);
    }
    out.push([x0, y0, z0, x1, y1, z1]);
  }
  return out;
}
function boxesToGeometry(list) {
  const tmpl = new THREE.BoxGeometry(1, 1, 1).toNonIndexed(), tp = tmpl.attributes.position.array, tn = tmpl.attributes.normal.array;
  const P = new Float32Array(list.length * 108), N = new Float32Array(list.length * 108);
  list.forEach((b, i) => {
    const sx = b[3] - b[0], sy = b[4] - b[1], sz = b[5] - b[2], cx = (b[0] + b[3]) / 2, cy = (b[1] + b[4]) / 2, cz = (b[2] + b[5]) / 2;
    for (let v = 0; v < 36; v++) { const o = i * 108 + v * 3;
      P[o] = tp[v * 3] * sx + cx; P[o + 1] = tp[v * 3 + 1] * sy + cy; P[o + 2] = tp[v * 3 + 2] * sz + cz;
      N[o] = tn[v * 3]; N[o + 1] = tn[v * 3 + 1]; N[o + 2] = tn[v * 3 + 2]; }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.BufferAttribute(N, 3));
  return g;
}

function buildFrames() {
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x3e4349, metalness: 0.45, roughness: 0.38 });
  frameMat.userData.baseEnv = 1.0; envMats.push(frameMat);
  ["GF_Glazing", "FF_Glazing", "SF_Glazing", "Courtyard_Glazing"].forEach(nm => {
    const grp = groups[nm]; if (!grp) return;
    const members = [];
    grp.traverse(o => {
      if (!o.isMesh || o.userData.fixed) return;
      boxesOf(o.geometry).forEach(([x0, y0, z0, x1, y1, z1]) => {
        const alongX = (x1 - x0) >= (y1 - y0), L = alongX ? x1 - x0 : y1 - y0, Hh = z1 - z0;
        if (L < 0.8 || Hh < 0.8) return;
        const w = 0.17, t = (alongX ? y1 - y0 : x1 - x0) + 0.12, c = alongX ? (y0 + y1) / 2 : (x0 + x1) / 2, a0 = alongX ? x0 : y0;
        const mk = (u0, u1, v0, v1) => members.push(alongX ? [a0 + u0, c - t / 2, z0 + v0, a0 + u1, c + t / 2, z0 + v1]
                                                             : [c - t / 2, a0 + u0, z0 + v0, c + t / 2, a0 + u1, z0 + v1]);
        mk(0, L, 0, w); mk(0, L, Hh - w, Hh); mk(0, w, 0, Hh); mk(L - w, L, 0, Hh);
        const nm_ = Math.max(0, Math.round(L / (Hh > 12 ? 5 : 4)) - 1);
        for (let i = 1; i <= nm_; i++) { const u = L * i / (nm_ + 1); mk(u - w / 2, u + w / 2, 0, Hh); }
        if (Hh > 9) { const nt = Math.floor(Hh / (Hh > 20 ? 11.42 : 5.5)); for (let i = 1; i <= nt; i++) { const v = Hh * i / (nt + 1); mk(0, L, v - w / 2, v + w / 2); } }
      });
    });
    if (!members.length) return;
    const m = new THREE.Mesh(boxesToGeometry(members), frameMat);
    m.castShadow = true; m.receiveShadow = true; m.userData.fixed = true; m.userData.baseColor = frameMat.color.clone();
    grp.add(m);
  });
}

function grassTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d");
  g.fillStyle = "#5b7d3a"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * 256, y = Math.random() * 256, s = Math.random();
    g.fillStyle = `rgba(${60 + s * 60 | 0},${95 + s * 70 | 0},${35 + s * 30 | 0},${0.35 + Math.random() * 0.4})`;
    g.fillRect(x, y, 1 + Math.random() * 2, 2 + Math.random() * 4);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function buildLandscape() {
  const rooms = WD.floors.GF.rooms, lawnIds = new Set();
  rooms.forEach((r, i) => { if (/lawn/i.test(r.n)) lawnIds.add(i + 1); });
  const data = new Uint8Array(WD.W * WD.H * 4); let any = false;
  for (let i = 0; i < WD.W * WD.H; i++) { const v = grid.GF[i]; if (!(v & 256) && lawnIds.has(v & 255)) { data[i * 4 + 1] = 255; data[i * 4 + 3] = 255; any = true; } }
  if (any) {
    const mask = new THREE.DataTexture(data, WD.W, WD.H, THREE.RGBAFormat); mask.magFilter = THREE.LinearFilter; mask.needsUpdate = true;
    const tex = grassTexture(), PW = WD.W * WD.C, PH = WD.H * WD.C; tex.repeat.set(PW / 7, PH / 7);
    const m = new THREE.MeshStandardMaterial({ map: tex, alphaMap: mask, alphaTest: 0.5, roughness: 1, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    m.userData.baseEnv = 0.5; envMats.push(m);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), m); pl.position.set(PW / 2, PH / 2, 0.08); pl.receiveShadow = true;
    pl.userData.fixed = true; (groups["Site_Boundary_Wall"] ? root : root).add(pl);
  }
  // courtyard tree in the circular planter drawn on A-111
  const tree = new THREE.Group(); tree.userData.fixed = true;
  const concrete = new THREE.MeshStandardMaterial({ color: 0xb9b4aa, roughness: 0.9 });
  const soil = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 1 });
  const bark = new THREE.MeshStandardMaterial({ color: 0x5b4632, roughness: 0.95 });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x4d7a36, roughness: 0.85, flatShading: true });
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 1.5, 40, 1, true).rotateX(Math.PI / 2), concrete); ring.position.z = 1.25; tree.add(ring);
  const top = new THREE.Mesh(new THREE.RingGeometry(3.6, 4.05, 40), concrete); top.position.z = 2.0; tree.add(top);
  const dirt = new THREE.Mesh(new THREE.CircleGeometry(3.7, 40), soil); dirt.position.z = 1.8; tree.add(dirt);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.75, 14, 12).rotateX(Math.PI / 2), bark); trunk.position.z = 8.5; tree.add(trunk);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 9; i++) {
    const r = 3 + rnd() * 2.6, a = rnd() * Math.PI * 2, d = i === 0 ? 0 : 2 + rnd() * 3.5;
    const f = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), leaf);
    f.position.set(Math.cos(a) * d, Math.sin(a) * d, 16 + rnd() * 7 + (i === 0 ? 3 : 0)); f.scale.z = 0.8;
    f.castShadow = true; tree.add(f);
  }
  tree.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.userData.fixed = true; o.userData.baseColor = o.material.color.clone(); } });
  tree.position.set(85.84, 65.87, 0.5);
  (groups["Courtyard_Paving"] || root).add(tree);
}

// room labels for the cutaways: every named room, per floor
function buildRoomLabels() {
  labelObjs.forEach(o => root.remove(o)); labelObjs.length = 0;
  FLOORS.forEach(k => {
    const areas = new Map();
    for (let i = 0; i < WD.W * WD.H; i++) { const v = grid[k][i]; if (v & 255) areas.set(v & 255, (areas.get(v & 255) || 0) + 1); }
    WD.floors[k].rooms.forEach((rm, i) => {
      const a = (areas.get(i + 1) || 0) * WD.C * WD.C;
      if (rm.k === "circ" || /Compound|Open to sky|Open strip/.test(rm.n) || a < 18) return;
      const o = makeLabel(rm.n.replace(/ \(.*\)/, ""), 0.036);
      o.position.set(rm.x, rm.y, fflAt(k, rm.x, rm.y) + 7); root.add(o); labelObjs.push(o);
    });
  });
}

// entrance pin and a compass for the orbit views
let entrancePin = null;
function buildEntrancePin() {
  const c = document.createElement("canvas"); c.width = 360; c.height = 150; const g = c.getContext("2d");
  g.fillStyle = "#d95728"; g.beginPath(); g.roundRect ? g.roundRect(0, 0, 360, 96, 18) : g.rect(0, 0, 360, 96); g.fill();
  g.beginPath(); g.moveTo(160, 96); g.lineTo(200, 96); g.lineTo(180, 140); g.fill();
  g.fillStyle = "#fff"; g.font = "700 46px ui-sans-serif, Helvetica, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("Main entrance", 180, 50);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  entrancePin = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, fog: false, toneMapped: false }));
  entrancePin.center.set(0.5, 0.05); entrancePin.scale.set(36 * 0.5, 15 * 0.5, 1); entrancePin.position.set(91.04, 4.55, 14); entrancePin.renderOrder = 1000;
  scene.add(entrancePin);
}
function updateCompass() {
  const n = document.getElementById("compassN"); if (!n) return;
  const d = new THREE.Vector3(); camera.getWorldDirection(d);
  const az = Math.atan2(d.x, d.y);
  n.style.transform = `rotate(${-az}rad)`;
}

// ================================================================ DIRECTORY MAP + WAYFINDING
const LEGEND = [["work", "Work areas"], ["meet", "Meeting rooms"], ["welfare", "Staff welfare & prayer"], ["wet", "Toilets & washrooms"],
  ["service", "Service & plant"], ["public", "Entrance & reception"], ["circ", "Passages"], ["outdoor", "Outdoor & lawns"]];
const MAP_COL = { work: "#a9c6e8", meet: "#cfb3e6", welfare: "#f3c98f", wet: "#9fd8d0", service: "#d9cfbf", public: "#f2ad8d", circ: "#f1efe9", outdoor: "#b9d99a" };
const DM = { floor: "GF", sel: null, hover: null, img: {}, areas: {}, s: 1, ox: 0, oy: 0 };
const standCache = {};
function roomArea(k, id) {
  if (!DM.areas[k]) { const m = new Map(); for (let i = 0; i < WD.W * WD.H; i++) { const v = grid[k][i]; if (v & 255) m.set(v & 255, (m.get(v & 255) || 0) + 1); } DM.areas[k] = m; }
  return (DM.areas[k].get(id) || 0) * WD.C * WD.C;
}
function mapBase(k) {
  if (DM.img[k]) return DM.img[k];
  const c = document.createElement("canvas"); c.width = WD.W; c.height = WD.H;
  const g = c.getContext("2d"), im = g.createImageData(WD.W, WD.H), rooms = WD.floors[k].rooms;
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  for (let r = 0; r < WD.H; r++) for (let cc = 0; cc < WD.W; cc++) {
    const v = grid[k][r * WD.W + cc], o = ((WD.H - 1 - r) * WD.W + cc) * 4; let col = null, a = 255;
    const id = v & 255;
    // v3.4: bit 1024 = wall / partition (drawn dark even inside a room's outline); furniture footprints keep the room colour, a shade darker
    if ((v & 1024) && (v & 256)) col = [44, 48, 54];
    else if (v & 512) col = id ? hex(MAP_COL[rooms[id - 1].k] || "#eeeeee") : ((v & 256) ? [241, 239, 233] : (k === "GF" ? [226, 224, 218] : null));
    else if (id && (v & 256 || rooms[id - 1].k === "outdoor")) { const b = hex(MAP_COL[rooms[id - 1].k] || "#eeeeee"); col = [b[0] * 0.9, b[1] * 0.9, b[2] * 0.9]; }
    else if (v & 256) col = [44, 48, 54];
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
function closeMap() { const el = document.getElementById("dirMap"); el.hidden = true; el.classList.remove("picking"); DM.pickCb = null; }
function syncMapTabs() { document.querySelectorAll("#dmTabs button").forEach(b => b.classList.toggle("on", b.dataset.f === DM.floor)); }
// @@MAP_BEGIN
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

// @@MAP_END

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
    const i = r * WD.W + c; if (S[i] && (!room || (grid[k][i] & 255) === room)) return i;
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

// ================================================================ FURNITURE, EQUIPMENT & PEOPLE (v3.2)
// Seating traced from the furniture plans A-401/402/403; everything else laid out per department.
// All models are procedural (no external assets): smooth rounded geometry, one "kit" material per part
// with per-slot colour / roughness / metalness and procedural wood, fabric, metal and skin detail.
const FURN = window.FURNITURE || {};
const KIT = { white: { value: 0 } };
function rnd01(seed) { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function pickS(arr, seed, salt) { return arr[Math.floor(rnd01(seed * 1.37 + salt * 17.13) * arr.length) % arr.length]; }
const _kq = new THREE.Quaternion(), _ke = new THREE.Euler(), _kv = new THREE.Vector3(), _ks = new THREE.Vector3();
function M4(x = 0, y = 0, z = 0, rz = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0) {
  _ke.set(rx, ry, rz, "ZXY"); _kq.setFromEuler(_ke);
  return new THREE.Matrix4().compose(_kv.set(x, y, z), _kq, _ks.set(sx, sy, sz));
}
// v4: tessellation follows the quality level (QUAL.det: High 1.0, Medium 0.6, Low 0.4)
const SEG = (n, lo = 5) => Math.max(lo, Math.round(n * ((typeof QUAL !== "undefined" && QUAL.det) || 1)));
const LATHE = (pts, seg = 12, ...r) => new THREE.LatheGeometry(pts, SEG(seg, 5), ...r);
const TORUS = (R, r, rs = 12, ts = 48, arc) => new THREE.TorusGeometry(R, r, SEG(rs, 3), SEG(ts, 6), arc);
const SPHERE = (r, ws = 32, hs = 16, ...rest) => new THREE.SphereGeometry(r, SEG(ws, 5), SEG(hs, 3), ...rest);
const CYLINDER = (rt, rb, h, rs = 32, hs = 1, ...rest) => new THREE.CylinderGeometry(rt, rb, h, SEG(rs, 5), hs, ...rest);
const TUBE = (curve, ts = 64, r, rs = 8, closed) => new THREE.TubeGeometry(curve, SEG(ts, 4), r, SEG(rs, 3), closed);
const GCACHE = new Map();
function cacheG(key, fn) { if (!GCACHE.has(key)) GCACHE.set(key, fn()); return GCACHE.get(key); }
const BOXG = (w, d, h) => cacheG(`b${w},${d},${h}`, () => new THREE.BoxGeometry(w, d, h));
function RBOXG(w, d, h, r, s = 2) {
  if (typeof QUAL !== "undefined" && QUAL.det < 0.8) s = Math.max(1, Math.round(s * 0.5));
  return cacheG(`rb${w},${d},${h},${r},${s}`, () => {
    r = Math.max(0.001, Math.min(r, w / 2 - 1e-4, d / 2 - 1e-4, h / 2 - 1e-4));
    const half = [w / 2, d / 2, h / 2], inner = [w / 2 - r, d / 2 - r, h / 2 - r], P = [], N = [];
    const lin = (a) => { const L = [-a]; for (let k = 1; k <= s; k++) L.push(-a + r * k / s); for (let k = s; k >= 1; k--) L.push(a - r * k / s); L.push(a); return L; };
    const vert = (p) => {
      const q = [Math.max(-inner[0], Math.min(inner[0], p[0])), Math.max(-inner[1], Math.min(inner[1], p[1])), Math.max(-inner[2], Math.min(inner[2], p[2]))];
      let n = [p[0] - q[0], p[1] - q[1], p[2] - q[2]]; const L = Math.hypot(n[0], n[1], n[2]) || 1; n = [n[0] / L, n[1] / L, n[2] / L];
      return [[q[0] + n[0] * r, q[1] + n[1] * r, q[2] + n[2] * r], n];
    };
    for (const [ax, sg] of [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]]) {
      const u = (ax + 1) % 3, v = (ax + 2) % 3, U = lin(half[u]), V = lin(half[v]);
      const at = (i, j) => { const p = [0, 0, 0]; p[ax] = sg * half[ax]; p[u] = U[i]; p[v] = V[j]; return vert(p); };
      for (let i = 0; i < U.length - 1; i++) for (let j = 0; j < V.length - 1; j++) {
        const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d_ = at(i, j + 1);
        const tri = sg > 0 ? [a, b, c, a, c, d_] : [a, c, b, a, d_, c];
        tri.forEach(([p, n]) => { P.push(p[0], p[1], p[2]); N.push(n[0], n[1], n[2]); });
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
    return g;
  });
}
const CYLG = (rt, rb, h, seg = 16, open = false) => cacheG(`c${rt},${rb},${h},${seg},${open}`, () => CYLINDER(rt, rb, h, seg, 1, open).rotateX(Math.PI / 2));
const SPHG = (seg = 16, rings = 10, t0 = 0, tl = Math.PI, p0 = 0, pl = Math.PI * 2) =>
  cacheG(`s${seg},${rings},${t0},${tl},${p0},${pl}`, () => SPHERE(1, seg, rings, p0, pl, t0, tl).rotateX(Math.PI / 2));
const TORG = (R, r, rs = 8, ts = 24, arc = Math.PI * 2) => cacheG(`t${R},${r},${rs},${ts},${arc}`, () => TORUS(R, r, rs, ts, arc));

class Kit {
  constructor() { this.P = []; this.N = []; this.S = []; }
  push(geo, m, slot) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (m) g.applyMatrix4(m);
    if (!g.attributes.normal) g.computeVertexNormals();
    this.P.push(g.attributes.position.array); this.N.push(g.attributes.normal.array); this.S.push([slot, g.attributes.position.count]);
    return this;
  }
  box(w, d, h, x, y, z, s, rz = 0, rx = 0, ry = 0) { return this.push(BOXG(w, d, h), M4(x, y, z, rz, 1, 1, 1, rx, ry), s); }
  rbox(w, d, h, r, x, y, z, s, rz = 0, rx = 0, ry = 0, seg = 2) { return this.push(RBOXG(w, d, h, r, seg), M4(x, y, z, rz, 1, 1, 1, rx, ry), s); }
  cyl(rt, rb, h, x, y, z, s, seg = 16, rx = 0, ry = 0, rz = 0, open = false) { return this.push(CYLG(rt, rb, h, seg, open), M4(x, y, z, rz, 1, 1, 1, rx, ry), s); }
  sph(r, x, y, z, s, sx = 1, sy = 1, sz = 1, seg = 16, rings = 10) { return this.push(SPHG(seg, rings), M4(x, y, z, 0, r * sx, r * sy, r * sz), s); }
  sphP(r, x, y, z, s, sx, sy, sz, t0, tl, rx = 0, ry = 0, rz = 0, seg = 18, rings = 10, p0 = 0, pl = Math.PI * 2) {
    return this.push(SPHG(seg, rings, t0, tl, p0, pl), M4(x, y, z, rz, r * sx, r * sy, r * sz, rx, ry), s);
  }
  tor(R, r, x, y, z, s, rx = 0, ry = 0, rz = 0, arc = Math.PI * 2, rs = 8, ts = 24) { return this.push(TORG(R, r, rs, ts, arc), M4(x, y, z, rz, 1, 1, 1, rx, ry), s); }
  lathe(prof, x, y, z, s, seg = 20, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
    const g = LATHE(prof.map(p => new THREE.Vector2(p[0], p[1])), seg).rotateX(Math.PI / 2);
    return this.push(g, M4(x, y, z, rz, sx, sy, sz, rx, ry), s);
  }
  tube(pts, r, s, rs = 8, ts = 0, closed = false) {
    const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])), closed, "catmullrom", 0.2);
    return this.push(TUBE(curve, ts || Math.max(8, pts.length * 6), r, rs, closed), null, s);
  }
  limb(a, b, ra, rb, s, seg = 10, cs = 3) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), D = B.clone().sub(A), L = Math.max(D.length(), 1e-4);
    const prof = [];
    for (let i = 0; i <= cs; i++) { const t = -Math.PI / 2 + Math.PI / 2 * i / cs; prof.push(new THREE.Vector2(Math.max(ra * Math.cos(t), 1e-4), ra * Math.sin(t))); }
    for (let i = 0; i <= cs; i++) { const t = Math.PI / 2 * i / cs; prof.push(new THREE.Vector2(Math.max(rb * Math.cos(t), 1e-4), L + rb * Math.sin(t))); }
    prof[0].x = 0; prof[prof.length - 1].x = 0;
    const g = LATHE(prof, seg);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), D.normalize());
    return this.push(g, new THREE.Matrix4().compose(A, q, new THREE.Vector3(1, 1, 1)), s);
  }
  // ellipsoid-ish blob oriented along a direction (hands, feet)
  blobDir(c, dir, up, w, l, h, s, seg = 12) {
    const Y = new THREE.Vector3(...dir).normalize(), Zt = new THREE.Vector3(...up);
    const X = new THREE.Vector3().crossVectors(Y, Zt).normalize(); if (X.lengthSq() < 1e-6) X.set(1, 0, 0);
    const Z = new THREE.Vector3().crossVectors(X, Y).normalize();
    const m = new THREE.Matrix4().makeBasis(X.multiplyScalar(w), Y.multiplyScalar(l), Z.multiplyScalar(h)).setPosition(c[0], c[1], c[2]);
    const g = SPHG(seg, 8).clone(); g.applyMatrix4(m); g.computeVertexNormals();
    return this.push(g, null, s);
  }
  build() {
    const n = this.P.reduce((a, b) => a + b.length, 0), P = new Float32Array(n), N = new Float32Array(n), S = new Float32Array(n / 3);
    let o = 0, v = 0;
    this.P.forEach((a, i) => { P.set(a, o); N.set(this.N[i], o); o += a.length; const [s, c] = this.S[i]; S.fill(s, v, v + c); v += c; });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.BufferAttribute(N, 3));
    g.setAttribute("slot", new THREE.BufferAttribute(S, 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}

// kinds: 0 paint 1 wood 2 fabric 3 brushed metal 4 plastic 5 rubber 6 leather 7 felt 8 ceramic 9 skin 10 hair 11 gloss
const KMAX = 16;
const KIT_GLSL = `
#ifdef KIT_LITE
vec3 kitPat(float k, vec3 p) { return vec3(1.0); }
float kitRgh(float k, vec3 p) { return 1.0; }
#else
float kh(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float kn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(kh(i), kh(i + vec3(1,0,0)), f.x), mix(kh(i + vec3(0,1,0)), kh(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(kh(i + vec3(0,0,1)), kh(i + vec3(1,0,1)), f.x), mix(kh(i + vec3(0,1,1)), kh(i + vec3(1,1,1)), f.x), f.y), f.z); }
vec3 kitPat(float k, vec3 p) {
  if (k < 0.5) return vec3(0.97 + 0.05 * kn(p * 3.0));
  if (k < 1.5) { float g = kn(vec3(p.x * 0.7, p.y * 11.0, p.z * 11.0)) * 3.0 + p.x * 0.5; float s = 0.5 + 0.5 * sin(g * 15.7);
                 return vec3(0.82 + 0.2 * s) * (0.93 + 0.12 * kn(p * vec3(1.2, 4.0, 4.0))); }
  if (k < 2.5) { float w = 0.5 + 0.5 * sin(p.x * 240.0) * sin((p.y + p.z) * 240.0); return vec3(0.9 + 0.08 * w) * (0.92 + 0.12 * kn(p * 5.0)); }
  if (k < 3.5) return vec3(0.9 + 0.1 * kn(vec3(p.x * 70.0, p.y * 2.0, p.z * 2.0)));
  if (k < 4.5) return vec3(0.98 + 0.03 * kn(p * 9.0));
  if (k < 5.5) return vec3(0.94 + 0.06 * kn(p * 30.0));
  if (k < 6.5) return vec3(0.88 + 0.12 * kn(p * 26.0));
  if (k < 7.5) return vec3(0.93 + 0.07 * kn(p * 45.0));
  if (k < 8.5) return vec3(1.0);
  if (k < 9.5) return vec3(0.95 + 0.06 * kn(p * 7.0)) * vec3(1.0, 0.985, 0.975);
  if (k < 10.5) return vec3(0.72 + 0.35 * kn(vec3(p.x * 95.0, p.y * 95.0, p.z * 14.0)));
  return vec3(1.0);
}
float kitRgh(float k, vec3 p) {
  if (k > 0.5 && k < 1.5) return 0.85 + 0.3 * kn(p * 3.0);
  if (k > 2.5 && k < 3.5) return 0.75 + 0.5 * kn(vec3(p.x * 90.0, p.y, p.z));
  if (k > 9.5 && k < 10.5) return 0.8 + 0.4 * kn(vec3(p.x * 95.0, p.y * 95.0, p.z * 14.0));
  return 0.92 + 0.16 * kn(p * 5.0);
}
#endif`;
function kitMat(pal, nt = 0, opts = {}) {
  const cols = [], mats = [];
  for (let i = 0; i < KMAX; i++) {
    const p = pal[Math.min(i, pal.length - 1)] || [0xcccccc, 0.8, 0, 0];
    cols.push(new THREE.Color(p[0])); mats.push(new THREE.Vector4(p[1], p[2], p[3], p[4] === undefined ? -1 : p[4]));
  }
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0, side: opts.side || THREE.FrontSide });
  m.envMapIntensity = 0.85; m.userData.baseEnv = 0.85; envMats.push(m);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uKC = { value: cols }; sh.uniforms.uKM = { value: mats }; sh.uniforms.uWhite = KIT.white;
    let tsel = "";
    for (let i = 0; i < nt; i++) tsel += `if (ti == ${i}) vKC = iT${i};\n`;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>
attribute float slot; ${Array.from({ length: nt }, (_, i) => `attribute vec3 iT${i};`).join(" ")}
uniform vec3 uKC[${KMAX}]; uniform vec4 uKM[${KMAX}];
varying vec3 vKC; varying vec4 vKM; varying vec3 vKO;`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
int si = int(slot + 0.5); vKC = uKC[si]; vKM = uKM[si]; vKO = position;
#ifdef USE_INSTANCING
vKO += instanceMatrix[3].xyz * 0.37;
#endif
int ti = int(vKM.w + 0.5);
if (vKM.w > -0.5) { ${tsel} }`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
${QUAL.level === "low" ? "#define KIT_LITE" : ""}
uniform float uWhite; varying vec3 vKC; varying vec4 vKM; varying vec3 vKO;
${KIT_GLSL}`)
      .replace("#include <color_fragment>", `#include <color_fragment>
diffuseColor.rgb = mix(vKC * kitPat(vKM.z, vKO), vec3(0.9), uWhite);`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
roughnessFactor = clamp(vKM.x * kitRgh(vKM.z, vKO), 0.03, 1.0);`)
      .replace("#include <metalnessmap_fragment>", `#include <metalnessmap_fragment>
metalnessFactor = vKM.y;`);
  };
  m.customProgramCacheKey = () => "kit" + nt + (opts.side || 0) + (QUAL.level === "low" ? "L" : "");
  return m;
}
// shared special materials
const KSPEC = {};
function glassMatK() {
  if (!KSPEC.glass) { KSPEC.glass = new THREE.MeshStandardMaterial({ color: 0xcfe3ea, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
    KSPEC.glass.userData.baseEnv = 1.4; KSPEC.glass.envMapIntensity = 1.4; envMats.push(KSPEC.glass); }
  return KSPEC.glass;
}
function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function screenMat(key, draw, w = 512, h = 288, bright = 0.92) {
  if (!KSPEC[key]) KSPEC[key] = new THREE.MeshBasicMaterial({ map: canvasTex(w, h, draw), color: new THREE.Color(bright, bright, bright) });
  return KSPEC[key];
}
function texMat(key, draw, w = 256, h = 256, rough = 0.85, opts = {}) {
  if (!KSPEC[key]) { KSPEC[key] = new THREE.MeshStandardMaterial(Object.assign({ map: canvasTex(w, h, draw), roughness: rough, metalness: 0 }, opts));
    KSPEC[key].userData.baseEnv = 0.6; KSPEC[key].envMapIntensity = 0.6; envMats.push(KSPEC[key]); }
  return KSPEC[key];
}
// a plane quad in the local XZ plane facing +Y (for screens, decals); w wide, h tall, centre at (x, y, z)
function quadG(w, h) { return cacheG(`q${w},${h}`, () => new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2).rotateY(Math.PI)); }   // faces +Y, texture upright
function quadGeoAt(w, h, x, y, z, rz = 0, rx = 0) { const g = quadG(w, h).clone(); g.applyMatrix4(M4(x, y, z, rz, 1, 1, 1, rx)); return g; }

// ---------------------------------------------------------------- people
// Posed with a small skeleton and 2-bone IK (hands and feet go to targets: keyboard, table, lap, floor).
// Slots: 0 skin 1 top 2 bottom 3 shoes 4 hair 5 accessory (dupatta / hijab / cap) 6 dark (eyes, brows, belt)
//        7 lips 8 white (sclera, cup, paper) 9 phone / black gloss 10 prop colour
const DEG = Math.PI / 180, V3 = THREE.Vector3;
const BODY = {
  m: { sh: 0.63, shZ: 1.56, hip: 0.3, neck: 1.8, uarm: 1.0, farm: 0.86, thigh: 1.38, shin: 1.32, ank: 0.24, depth: 0.6, head: 1.0,
       prof: [[0.001, -0.42], [0.3, -0.4], [0.46, -0.32], [0.56, -0.18], [0.59, -0.03], [0.57, 0.12], [0.52, 0.36], [0.5, 0.56], [0.53, 0.82], [0.58, 1.06],
              [0.61, 1.28], [0.6, 1.44], [0.54, 1.58], [0.4, 1.7], [0.24, 1.78], [0.17, 1.82], [0.001, 1.84]],
       ra: [0.165, 0.125], rf: [0.12, 0.078], rt: [0.27, 0.17], rs: [0.165, 0.098] },
  f: { sh: 0.55, shZ: 1.46, hip: 0.29, neck: 1.7, uarm: 0.93, farm: 0.8, thigh: 1.3, shin: 1.24, ank: 0.23, depth: 0.63, head: 0.95,
       prof: [[0.001, -0.4], [0.3, -0.38], [0.48, -0.3], [0.59, -0.16], [0.62, -0.02], [0.59, 0.14], [0.5, 0.36], [0.44, 0.56], [0.46, 0.78], [0.52, 1.0],
              [0.54, 1.18], [0.52, 1.34], [0.47, 1.47], [0.35, 1.59], [0.21, 1.68], [0.15, 1.72], [0.001, 1.74]],
       ra: [0.14, 0.105], rf: [0.1, 0.07], rt: [0.27, 0.16], rs: [0.155, 0.09] }
};
// pose targets in person space (origin on the floor under the seat / between the feet, facing +Y)
const POSES = {
  type:  B => ({ seat: 1.55, lean: 7, head: [-11, 0], lh: [-0.34, 1.26, 2.52], rh: [0.36, 1.3, 2.52], lf: [-0.36, 1.42, B.ank], rf: [0.38, 1.5, B.ank], palm: "down" }),
  meet:  B => ({ seat: 1.55, lean: 3, head: [2, -8], lh: [-0.5, 1.05, 2.5], rh: [0.42, 1.12, 2.52], lf: [-0.4, 1.45, B.ank], rf: [0.36, 1.35, B.ank], palm: "down" }),
  meet2: B => ({ seat: 1.55, lean: -4, head: [4, 14], lh: [-0.42, 0.95, 2.5], rh: [0.55, 0.85, 2.95], lf: [-0.5, 1.5, B.ank], rf: [0.3, 1.25, B.ank], palm: "down", rpalm: "in" }),
  eat:   B => ({ seat: 1.55, lean: 6, head: [-6, 0], lh: [-0.45, 1.05, 2.52], rh: [0.2, 0.62, 3.72], lf: [-0.36, 1.45, B.ank], rf: [0.36, 1.45, B.ank], palm: "down", rpalm: "in", prop: "cup" }),
  read:  B => ({ seat: 1.55, lean: 4, head: [-22, 0], lh: [-0.26, 1.02, 2.72], rh: [0.26, 1.02, 2.72], lf: [-0.36, 1.45, B.ank], rf: [0.36, 1.45, B.ank], palm: "in", prop: "book" }),
  relax: B => ({ seat: 1.38, lean: -14, head: [6, 10], lh: [-0.45, 0.95, 1.72], rh: [0.45, 0.9, 1.74], lf: [-0.45, 1.75, B.ank], rf: [0.42, 1.6, B.ank], palm: "down" }),
  guard_sit: B => ({ seat: 1.55, lean: 2, head: [-4, 0], lh: [-0.4, 1.15, 2.52], rh: [0.4, 1.15, 2.52], lf: [-0.36, 1.45, B.ank], rf: [0.36, 1.45, B.ank], palm: "down" }),
  stand: B => ({ lean: 0, head: [0, 0], lh: [-B.sh - 0.08, 0.05, 2.7], rh: [B.sh + 0.08, 0.05, 2.7], lf: [-0.34, 0.0, B.ank], rf: [0.34, 0.05, B.ank], palm: "side" }),
  talk:  B => ({ lean: 2, head: [0, -6], lh: [-B.sh - 0.06, 0.1, 2.72], rh: [0.46, 0.85, 3.65], lf: [-0.36, -0.05, B.ank], rf: [0.34, 0.2, B.ank], palm: "side", rpalm: "up" }),
  phone: B => ({ lean: 0, head: [-4, 12], lh: [-B.sh - 0.06, 0.1, 2.72], rh: [0.3, 0.06, 5.0], lf: [-0.34, 0.0, B.ank], rf: [0.36, 0.1, B.ank], palm: "side", rpalm: "in", prop: "phone" }),
  walk:  B => ({ lean: 3, head: [-3, 0], bend: 0.08, lh: [-B.sh - 0.05, 0.62, 2.78], rh: [B.sh + 0.05, -0.5, 2.8], lf: [-0.3, -0.85, B.ank + 0.12], rf: [0.3, 0.95, B.ank], palm: "side", lheel: 20 }),
  run:   B => ({ lean: 9, head: [2, 0], bend: 0.22, lh: [-B.sh, 0.85, 3.5], rh: [B.sh, -0.35, 3.1], lf: [-0.28, -1.2, B.ank + 0.55], rf: [0.28, 0.9, B.ank], palm: "in", lheel: 35 }),
  play:  B => ({ lean: 18, head: [12, 0], bend: 0.35, lh: [-0.5, 0.95, 3.2], rh: [0.62, 1.25, 3.25], lf: [-0.72, 0.2, B.ank], rf: [0.72, -0.1, B.ank], palm: "down", prop: "paddle" }),
  guard: B => ({ lean: 0, head: [0, 0], lh: [-0.08, 0.5, 2.62], rh: [0.1, 0.55, 2.66], lf: [-0.4, 0.0, B.ank], rf: [0.4, 0.0, B.ank], palm: "in" }),
  work:  B => ({ lean: 17, head: [-18, 0], bend: 0.06, lh: [-0.45, 1.25, 3.08], rh: [0.42, 1.3, 3.1], lf: [-0.38, 0.1, B.ank], rf: [0.38, -0.1, B.ank], palm: "down" }),
};
// clothing / appearance variants
const PVAR = {
  m_shirt:  { sex: "m", hair: "short", sleeve: "long" },
  m_shirtS: { sex: "m", hair: "short", sleeve: "short" },
  m_beard:  { sex: "m", hair: "short", sleeve: "long", beard: true },
  m_kurta:  { sex: "m", hair: "short", sleeve: "long", tunic: true, beard: true },
  f_kameez: { sex: "f", hair: "long", sleeve: "34", tunic: true, dupatta: true },
  f_hijab:  { sex: "f", hair: "hijab", sleeve: "long", tunic: true },
  f_bun:    { sex: "f", hair: "bun", sleeve: "34", tunic: true, dupatta: true },
  guard:    { sex: "m", hair: "short", sleeve: "short", cap: true },
};
function cutProf(prof, z0, z1) {
  const out = [];
  for (let i = 0; i < prof.length - 1; i++) {
    const [ra, za] = prof[i], [rb, zb] = prof[i + 1];
    if (za >= z0 && za <= z1) out.push([ra, za]);
    for (const zc of [z0, z1]) if ((za < zc && zb > zc)) { const t = (zc - za) / (zb - za); out.push([ra + (rb - ra) * t, zc]); }
  }
  const [rl, zl] = prof[prof.length - 1]; if (zl >= z0 && zl <= z1) out.push([rl, zl]);
  out.sort((a, b) => a[1] - b[1]);
  return out.map(p => [Math.max(p[0], 0.001), p[1]]);
}
function ik2(S, T, L1, L2, pole) {
  const D = T.clone().sub(S); let d = D.length(); const dn = D.divideScalar(d || 1);
  d = Math.min(Math.max(d, Math.abs(L1 - L2) + 0.02), (L1 + L2) * 0.998);
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(L1 * L1 - a * a, 0));
  const p = pole.clone().sub(dn.clone().multiplyScalar(pole.dot(dn))); if (p.lengthSq() < 1e-8) p.set(0, -1, 0); p.normalize();
  return [S.clone().addScaledVector(dn, a).addScaledVector(p, h), S.clone().addScaledVector(dn, d)];
}
function ribbon(K, pts, width, slot, upHint = [0, 0, 1], thick = 0.012) {
  const P = pts.map(p => new V3(...p)), pos = [], nor = [];
  const U = new V3(...upHint);
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1], t = b.clone().sub(a).normalize();
    let side = new V3().crossVectors(t, U); if (side.lengthSq() < 1e-6) side.set(1, 0, 0); side.normalize().multiplyScalar(width / 2);
    const n = new V3().crossVectors(side, t).normalize();
    const q = [a.clone().sub(side), a.clone().add(side), b.clone().add(side), b.clone().sub(side)];
    for (const sg of [1, -1]) {
      const off = n.clone().multiplyScalar(thick * sg);
      const tri = sg > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
      tri.forEach(j => { const v = q[j].clone().add(off); pos.push(v.x, v.y, v.z); nor.push(n.x * sg, n.y * sg, n.z * sg); });
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  K.push(g, null, slot);
}
function personGeo(pose, vk) {
  const V = PVAR[vk], B = BODY[V.sex], P = POSES[pose](B), K = new Kit();
  const seated = P.seat !== undefined;
  const pel = seated ? new V3(0, -0.14, P.seat + 0.3) : new V3(0, 0, B.thigh + B.shin + B.ank - (P.bend || 0.03));
  const lean = (P.lean || 0) * DEG;
  const TR = new THREE.Matrix4().makeRotationX(-lean), TM = TR.clone().setPosition(pel);
  const tp = (x, y, z) => new V3(x, y, z).applyMatrix4(TM);
  const up = new V3(0, 0, 1).applyMatrix4(TR);
  const S1 = 1, S2 = 2, SK = 0;
  // ---- torso
  const latheM = (prof, slot, sc = 1, seg = 13) => {
    const g = LATHE(prof.map(p => new THREE.Vector2(p[0] * sc, p[1])), seg).rotateX(Math.PI / 2);
    g.applyMatrix4(new THREE.Matrix4().makeScale(1, B.depth, 1)); g.applyMatrix4(TM); K.push(g, null, slot);
  };
  const beltZ = V.sex === "m" ? 0.22 : 0.3;
  if (V.tunic) {
    latheM(cutProf(B.prof, -0.42, 1.84), S1, 1.015);
  } else {
    latheM(cutProf(B.prof, -0.42, beltZ + 0.04), S2, 1.0);
    latheM(cutProf(B.prof, beltZ - 0.02, 1.84), S1, 1.02);
    // belt
    const bz = beltZ + 0.01, r = (B.prof.find(p => p[1] >= bz) || [0.52])[0] * 1.03;
    const g = TORUS(r * 1.02, 0.04, 4, 16); g.applyMatrix4(new THREE.Matrix4().makeScale(1, B.depth, 1)); g.applyMatrix4(M4(0, 0, bz)); g.applyMatrix4(TM); K.push(g, null, 6);
  }
  // collar
  { const g = TORUS(0.2, 0.035, 4, 14); g.applyMatrix4(new THREE.Matrix4().makeScale(1, 0.95, 1)); g.applyMatrix4(M4(0, 0.015, B.neck - 0.05)); g.applyMatrix4(TM); K.push(g, null, V.hair === "hijab" ? 5 : S1); }
  if (V.tunic && !seated) {
    const sk = [[0.73, -1.02], [0.72, -0.95], [0.68, -0.6], [0.63, -0.25], [0.6, 0.02]];   // increasing z, so the lathe faces outward
    const g = LATHE(sk.map(p => new THREE.Vector2(p[0], p[1])), 18).rotateX(Math.PI / 2);
    g.applyMatrix4(new THREE.Matrix4().makeScale(1, 0.72, 1)); g.applyMatrix4(new THREE.Matrix4().makeTranslation(pel.x, pel.y, pel.z));
    K.push(g, null, S1);
  }
  // ---- legs
  const kneePole = new V3(0, 1, 0.15);
  for (const sd of [-1, 1]) {
    const H = new V3(pel.x + sd * B.hip, pel.y + (seated ? 0.05 : 0), pel.z - 0.05);
    const T = new V3(...(sd < 0 ? P.lf : P.rf));
    const [Kn, A] = ik2(H, T, B.thigh, B.shin, kneePole.clone().add(new V3(sd * 0.12, 0, 0)));
    const loose = V.tunic ? 1.12 : 1.0;
    K.limb(H.toArray(), Kn.toArray(), B.rt[0] * loose, B.rt[1] * loose, (V.tunic && seated) ? S1 : S2, 10, 2);
    K.limb(Kn.toArray(), A.toArray(), B.rs[0] * loose, B.rs[1] * (V.tunic ? 1.2 : 1.0), S2, 10, 2);
    // shoe
    const heel = ((sd < 0 ? P.lheel : P.rheel) || 0) * DEG;
    const fwd = new V3(sd * 0.08, Math.cos(heel), -Math.sin(heel)).normalize();
    const sc = A.clone().addScaledVector(fwd, 0.22); sc.z = heel ? A.z - 0.02 : 0.15;
    K.blobDir(sc.toArray(), fwd.toArray(), [0, 0, 1], 0.165, 0.45, 0.15, 3, 9);
  }
  // ---- arms
  const handUp = (side, fdir) => {
    const mode = (side > 0 ? P.rpalm : P.lpalm) || P.palm || "down";
    if (mode === "down") return [0, 0, 1];
    if (mode === "up") return [0, 0, -1];
    if (mode === "in") return [-side, 0, 0];
    return [side, 0, 0];
  };
  for (const sd of [-1, 1]) {
    const S = tp(sd * B.sh, 0.0, B.shZ);
    const T = new V3(...(sd < 0 ? P.lh : P.rh));
    const pole = new V3(sd * 0.55, -0.7, -0.6);
    const [E, Wr] = ik2(S, T, B.uarm, B.farm, pole);
    const sleeveUp = S1;
    K.limb(S.toArray(), E.toArray(), B.ra[0], B.ra[1], sleeveUp, 10, 2);
    if (V.sleeve === "long") K.limb(E.toArray(), Wr.toArray(), B.rf[0] * 1.04, B.rf[1] * 1.1, S1, 8, 2);
    else if (V.sleeve === "34") {
      const mid = E.clone().lerp(Wr, 0.55);
      K.limb(E.toArray(), mid.toArray(), B.rf[0] * 1.05, (B.rf[0] + B.rf[1]) / 2 * 1.08, S1, 8, 2);
      K.limb(mid.toArray(), Wr.toArray(), (B.rf[0] + B.rf[1]) / 2, B.rf[1], SK, 8, 2);
    } else {
      const mid = E.clone().lerp(Wr, 0.12);
      K.limb(E.toArray(), mid.toArray(), B.rf[0] * 1.12, B.rf[0] * 1.08, S1, 8, 1);
      K.limb(E.toArray(), Wr.toArray(), B.rf[0], B.rf[1], SK, 8, 2);
    }
    // hand: palm + fingers + thumb
    const f = Wr.clone().sub(E).normalize(), hu = handUp(sd, f);
    const hc = Wr.clone().addScaledVector(f, 0.2);
    K.blobDir(hc.toArray(), f.toArray(), hu, 0.085 * (V.sex === "f" ? 0.9 : 1), 0.2, 0.065, SK, 7);
    K.blobDir(hc.clone().addScaledVector(f, 0.16).toArray(), f.toArray(), hu, 0.075 * (V.sex === "f" ? 0.9 : 1), 0.12, 0.045, SK, 6);   // fingers
    const hx = new V3().crossVectors(f, new V3(...hu)).normalize();
    const th = Wr.clone().addScaledVector(f, 0.12).addScaledVector(hx, -sd * 0.09).addScaledVector(new V3(...hu), -0.02);
    K.blobDir(th.toArray(), f.clone().addScaledVector(hx, -sd * 0.6).normalize().toArray(), hu, 0.035, 0.1, 0.035, SK, 6);
    // props
    if (P.prop === "phone" && sd > 0) K.blobDir(hc.clone().addScaledVector(f, 0.05).toArray(), f.toArray(), hu, 0.13, 0.25, 0.03, 9, 8);
    if (P.prop === "cup" && sd > 0) K.cyl(0.1, 0.085, 0.3, hc.x, hc.y + 0.05, hc.z + 0.06, 8, 14);
    if (P.prop === "paddle" && sd > 0) { const pc = hc.clone().addScaledVector(f, 0.4); K.push(CYLG(0.26, 0.26, 0.04, 20), M4(pc.x, pc.y, pc.z, 0, 1, 1, 1, Math.PI / 2 - 0.2), 10); }
  }
  if (P.prop === "book") { const bc = new V3(0, 1.05, 2.78); K.box(0.95, 0.07, 0.7, bc.x, bc.y, bc.z + 0.12, 10, 0, -0.55); K.box(0.9, 0.06, 0.66, bc.x, bc.y - 0.015, bc.z + 0.12, 8, 0, -0.55); }
  // ---- neck & head
  const hs = B.head;
  const nb = tp(0, 0.02, B.neck - 0.1), hp = (P.head || [0, 0]);
  const HR = new THREE.Matrix4().makeRotationZ(hp[1] * DEG).multiply(new THREE.Matrix4().makeRotationX(-(P.lean || 0) * DEG + hp[0] * DEG));
  const neckTop = nb.clone().add(new V3(0, 0.02, 0.24).applyMatrix4(HR));
  K.limb(nb.toArray(), neckTop.toArray(), 0.155 * hs, 0.145 * hs, SK, 10, 1);
  const HM = HR.clone().setPosition(neckTop.clone().add(new V3(0, 0.04, 0.3).applyMatrix4(HR)));
  const hpnt = (x, y, z) => new V3(x * hs, y * hs, z * hs).applyMatrix4(HM);
  const hsph = (r, x, y, z, s, sx, sy, sz, seg = 14, rings = 9) => {
    const g = SPHG(seg, rings).clone(); g.applyMatrix4(M4(x * hs, y * hs, z * hs, 0, r * sx * hs, r * sy * hs, r * sz * hs)); g.applyMatrix4(HM); K.push(g, null, s);
  };
  const hsphP = (r, x, y, z, s, sx, sy, sz, t0, tl, rx, rz = 0, p0 = 0, pl = Math.PI * 2) => {
    const g = SPHG(16, 9, t0, tl, p0, pl).clone(); g.applyMatrix4(M4(x * hs, y * hs, z * hs, rz, r * sx * hs, r * sy * hs, r * sz * hs, rx)); g.applyMatrix4(HM); K.push(g, null, s);
  };
  hsph(1, 0, -0.02, 0.04, SK, 0.25, 0.3, 0.33, 16, 11);              // cranium
  hsph(1, 0, 0.07, -0.13, SK, 0.19, 0.22, 0.2, 14, 8);               // jaw
  hsph(1, 0, 0.3, -0.02, SK, 0.036, 0.06, 0.075, 8, 6);              // nose
  hsph(1, 0.245, -0.02, 0.0, SK, 0.03, 0.075, 0.1, 8, 6);            // ears
  hsph(1, -0.245, -0.02, 0.0, SK, 0.03, 0.075, 0.1, 8, 6);
  for (const sd of [-1, 1]) {
    hsph(1, sd * 0.088, 0.25, 0.05, 8, 0.045, 0.02, 0.028, 8, 5);    // sclera
    hsph(1, sd * 0.088, 0.262, 0.05, 6, 0.022, 0.012, 0.024, 6, 4);  // iris
    const bg = BOXG(0.1 * hs, 0.02 * hs, 0.022 * hs).clone(); bg.applyMatrix4(M4(sd * 0.09 * hs, 0.262 * hs, 0.115 * hs, sd * 0.12)); bg.applyMatrix4(HM); K.push(bg, null, 4);
  }
  hsph(1, 0, 0.283, -0.14, 7, 0.07, 0.022, 0.02, 8, 4);              // lips
  // hair / hijab / cap
  if (V.hair === "hijab") {
    hsphP(1, 0, -0.02, 0.05, 5, 0.285, 0.335, 0.37, 0, 0.5 * Math.PI, 0.38);                               // crown, framing the forehead
    hsphP(1, 0, -0.02, 0.05, 5, 0.285, 0.335, 0.37, 0.5 * Math.PI, 0.46 * Math.PI, 0, 0, 1.8 * Math.PI, 1.4 * Math.PI);    // sides and back, face open
    const dr = [[0.64, -0.74], [0.62, -0.68], [0.52, -0.55], [0.36, -0.36], [0.27, -0.16], [0.24, 0.02], [0.2, 0.12]];
    const g = LATHE(dr.map(p => new THREE.Vector2(p[0] * hs, p[1] * hs)), 20).rotateX(Math.PI / 2);
    g.applyMatrix4(new THREE.Matrix4().makeScale(1, 0.8, 1)); g.applyMatrix4(M4(0, -0.04 * hs, -0.12 * hs)); g.applyMatrix4(HM); K.push(g, null, 5);
  } else {
    // short hair: a cap over the crown and back, tilted back so the forehead and temples stay clear
    hsphP(1, 0, -0.045, 0.065, 4, 0.258, 0.31, 0.335, 0, 0.44 * Math.PI, 0.62);
    hsphP(1, 0, -0.03, 0.02, 4, 0.262, 0.305, 0.3, 0.5 * Math.PI, 0.2 * Math.PI, 0, 0, 0.12 * Math.PI, 0.76 * Math.PI);   // back of the head / nape (phi 0.5 pi = back)
    if (V.hair === "long") { hsph(1, 0, -0.2, -0.28, 4, 0.25, 0.13, 0.42, 16, 10); hsphP(1, 0, -0.06, 0.02, 4, 0.27, 0.3, 0.35, 0.45 * Math.PI, 0.4 * Math.PI, 0, 0, 1.75 * Math.PI, 1.5 * Math.PI); }
    if (V.hair === "bun") hsph(1, 0, -0.33, 0.12, 4, 0.13, 0.12, 0.12, 12, 8);
    if (V.beard) { hsphP(1, 0, 0.075, -0.12, 4, 0.2, 0.225, 0.21, 0.58 * Math.PI, 0.42 * Math.PI, 0, 0, 1.1 * Math.PI, 0.8 * Math.PI);   // jaw line, front (phi 1.5 pi)
      hsph(1, 0, 0.268, -0.085, 4, 0.075, 0.02, 0.018, 8, 4); }     // moustache
    if (V.cap) { hsphP(1, 0, -0.02, 0.1, 5, 0.285, 0.33, 0.3, 0, 0.5 * Math.PI, -0.1); const vg = CYLG(0.2, 0.2, 0.02, 16).clone(); vg.applyMatrix4(M4(0, 0.26 * hs, 0.1 * hs, 0, 1.1 * hs, 0.7 * hs, 1, -0.2)); vg.applyMatrix4(HM); K.push(vg, null, 5); }
  }
  if (V.dupatta) {
    // shawl: a soft fold round the back of the neck and over both shoulders, ends hanging down the front
    const ring = TORUS(0.44, 0.05, 5, 22);
    ring.applyMatrix4(new THREE.Matrix4().makeScale(1.15, B.depth * 1.45, 0.55)); ring.applyMatrix4(M4(0, -0.04, B.shZ + 0.08, 0, 1, 1, 1, 0.3)); ring.applyMatrix4(TM); K.push(ring, null, 5);
    const panel = (a, b, w) => { const D = b.clone().sub(a), L = D.length(), mid = a.clone().add(b).multiplyScalar(0.5);
      const g = BOXG(w, 0.03, 1).clone(); g.applyMatrix4(new THREE.Matrix4().makeScale(1, 1, L + 0.04));
      const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 0, 1), D.normalize()); g.applyMatrix4(new THREE.Matrix4().compose(mid, q, new V3(1, 1, 1))); K.push(g, null, 5); };
    for (const sd of [-1, 1]) {
      const p0 = tp(sd * 0.3, 0.12, B.shZ + 0.1), p1 = tp(sd * 0.3, 0.39, B.shZ - 0.35), p2 = tp(sd * 0.31, 0.37, 0.75);
      const p3 = seated ? new V3(sd * 0.33, 0.6, P.seat + 0.55) : tp(sd * 0.32, 0.4, -0.35);
      panel(p0, p1, 0.3); panel(p1, p2, 0.32); panel(p2, p3, 0.33);
    }
  }
  return K.build();
}
const P_SKIN = [0x8d5a3c, 0xa0694a, 0xb27754, 0xc08864, 0x7b4b33, 0x9c6448, 0xc9956f, 0xae7652];
const P_SHIRT = [0xf2f2ee, 0xb8cde6, 0xe7c8c8, 0x2c3d5a, 0x8a8f96, 0x2a2a2c, 0x6b7048, 0x6e2a35, 0xd9c9a8, 0xa9c4e0, 0x42566e, 0xe8e4d8];
const P_TROUS = [0x2d3036, 0x26314a, 0xa8946b, 0x1c1c1e, 0x5b5f66, 0x3b4d6e, 0x4a4036];
const P_KAMEEZ = [0x7a2432, 0x1f6f6a, 0xc9a13a, 0xd98aa3, 0x9d8cc4, 0x1d6b4a, 0xefe6d2, 0xe9b38f, 0x2f3f70, 0xb04a2a, 0x5a2d5c];
const P_KURTA = [0xf0ede4, 0xd8d2c2, 0x8a8f96, 0x2f3a4a, 0x5c4a3a, 0xe8e4d8];
const P_SHALWAR = [0xf0ede4, 0xe8e2d4, 0x1c1c1e, 0x2c2f36];
const P_HAIR = [0x151210, 0x1d1713, 0x2a1f18, 0x100d0c, 0x3a2b20];
const P_HIJAB = [0x1a1a1c, 0x26314a, 0xc9b79a, 0x6b6f75, 0x6e2a35, 0x3f5a50];
const P_SHOE = [0x151515, 0x3a2418, 0x5a3a24, 0x1c1c1e, 0xe6e6e6];
function personTints(vk, seed) {
  const V = PVAR[vk];
  const skin = pickS(P_SKIN, seed, 1), hair = rnd01(seed * 3.1) < 0.12 && V.sex === "m" ? 0x7a7672 : pickS(P_HAIR, seed, 2);
  let top, bot, acc = 0x1a1a1c, shoe = pickS(P_SHOE, seed, 5);
  if (vk === "guard") { top = 0x9fb3c8; bot = 0x1f2632; acc = 0x1b2230; shoe = 0x111111; }
  else if (V.sex === "m") { top = V.tunic ? pickS(P_KURTA, seed, 3) : pickS(P_SHIRT, seed, 3); bot = V.tunic ? top : pickS(P_TROUS, seed, 4); }
  else { top = pickS(P_KAMEEZ, seed, 3); bot = pickS(P_SHALWAR, seed, 4); acc = V.hair === "hijab" ? pickS(P_HIJAB, seed, 6) : pickS(P_KAMEEZ, seed, 7); shoe = pickS([0x3a2418, 0x151515, 0x8a5a3a, 0xc8b8a0], seed, 5); }
  return [skin, top, bot, shoe, hair, acc];
}
function pickVariant(seed, pose) {
  if (pose === "guard" || pose === "guard_sit") return "guard";
  const r = rnd01(seed * 5.77);
  if (r < 0.26) return "m_shirt"; if (r < 0.42) return "m_shirtS"; if (r < 0.56) return "m_beard"; if (r < 0.64) return "m_kurta";
  if (r < 0.79) return "f_kameez"; if (r < 0.9) return "f_hijab"; return "f_bun";
}
const P_PAL = [[0xffffff, 0.62, 0, 9, 0], [0xffffff, 0.9, 0, 2, 1], [0xffffff, 0.92, 0, 2, 2], [0xffffff, 0.5, 0, 6, 3], [0xffffff, 0.75, 0, 10, 4],
  [0xffffff, 0.9, 0, 2, 5], [0x141414, 0.4, 0, 4], [0x8a4a45, 0.55, 0, 9], [0xf4f2ee, 0.35, 0, 8], [0x121416, 0.2, 0.2, 11], [0x2f5d9c, 0.5, 0, 4]];

// ---------------------------------------------------------------- catalogue of parts (local frame: floor origin, user side +Y)
const PL = {
  oak: [0xc9a878, 0.6, 0, 1], oakT: [0xc9a878, 0.6, 0, 1, 0], walnut: [0x6a4832, 0.5, 0, 1], lam: [0xefebe3, 0.45, 0, 0], lamT: [0xefebe3, 0.45, 0, 0, 0],
  graph: [0x3a3d42, 0.45, 0.35, 3], alu: [0xc2c6ca, 0.35, 0.55, 3], chrome: [0xe2e4e6, 0.18, 0.62, 3], blackP: [0x1c1d20, 0.45, 0, 4], darkP: [0x2a2c30, 0.5, 0, 4],
  fabT: [0x5a6470, 0.95, 0, 2, 0], mesh: [0x1f2125, 0.8, 0, 2], rubber: [0x141414, 0.9, 0, 5], cer: [0xf5f5f3, 0.12, 0, 8], steel: [0xc4c8cc, 0.34, 0.55, 3],
  scr: [0x0a0c0f, 0.08, 0.2, 11], leather: [0x1e1c1b, 0.42, 0, 6], leatherT: [0x1e1c1b, 0.42, 0, 6, 0], felt: [0x1d6b3a, 0.95, 0, 7], white: [0xf2f2ef, 0.5, 0, 0],
  grey: [0x8e9296, 0.6, 0.1, 0], paintT: [0x999999, 0.55, 0.05, 0, 0], card: [0xb58a57, 0.9, 0, 0], plantG: [0x3f6b2e, 0.7, 0, 0, 0], soil: [0x3a2a1c, 1, 0, 0],
  potT: [0x3b3b3b, 0.5, 0, 8, 1], red: [0xb3282d, 0.5, 0, 4], yellow: [0xd9b12a, 0.5, 0, 0], green: [0x2e7d4a, 0.5, 0, 0], blue: [0x2f5d9c, 0.5, 0, 4],
  genT: [0xd4cfbf, 0.5, 0.25, 0, 0], led: [0x40ff70, 0.4, 0, 0], ledR: [0xff4030, 0.4, 0, 0], bookT: [0x7a2432, 0.8, 0, 0, 0],
};
const PDEF = {};
const defP = (key, fn) => { PDEF[key] = fn; };
function stars(K, r, z, slot, casters = true, cs = 6) {
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5 + Math.PI / 2, cx = Math.cos(a), cy = Math.sin(a);
    K.push(BOXG(r, 0.15, 0.09), M4(cx * r / 2, cy * r / 2, z, a), slot);
    if (casters) K.cyl(0.075, 0.075, 0.07, cx * r * 0.95, cy * r * 0.95, 0.085, PL_IDX.rub, 8, 0, Math.PI / 2, a);
  }
}
const PL_IDX = { rub: 9 };
// -- office -----------------------------------------------------------------------------------------------
defP("deskTop", () => { const K = new Kit();
  K.rbox(1.0, 2.0, 0.1, 0.03, 0, 0, 2.4, 0); K.box(0.94, 0.28, 0.1, 0, -0.72, 2.22, 1); K.box(0.94, 0.03, 0.14, 0, -0.86, 2.2, 1);
  return { g: K.build(), pal: [PL.lamT, PL.graph], nt: 1 }; });
defP("deskLeg", () => { const K = new Kit();
  for (const y of [-0.82, 0.82]) K.box(0.09, 0.09, 2.32, 0, y, 1.19, 0);
  K.box(0.09, 1.78, 0.09, 0, 0, 0.06, 0); K.box(0.09, 1.78, 0.09, 0, 0, 2.3, 0);
  K.box(0.1, 0.1, 0.03, 0, -0.82, 0.015, 1); K.box(0.1, 0.1, 0.03, 0, 0.82, 0.015, 1);
  return { g: K.build(), pal: [PL.graph, PL.rubber] }; });
defP("deskPanel", () => { const K = new Kit(); K.box(0.97, 0.04, 1.05, 0, -0.9, 1.65, 0); return { g: K.build(), pal: [PL.graph] }; });
defP("kbd", () => { const K = new Kit();
  K.box(1.42, 0.46, 0.05, 0, 0, 0.025, 0); K.box(1.3, 0.36, 0.02, 0, 0.01, 0.055, 1);
  K.sph(0.1, 1.0, 0.06, 0.03, 0, 1, 1.7, 0.4, 8, 5);
  return { g: K.build(), pal: [PL.blackP, [0x33363b, 0.6, 0, 4]] }; });
function screenDraw(kind) {
  return (g, w, h) => {
    const bg = { 0: "#f4f6f8", 1: "#1e2330", 2: "#ffffff", 3: "#eef2f5" }[kind];
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = kind === 1 ? "#2b3142" : "#2f5d7c"; g.fillRect(0, 0, w, 22);
    if (kind === 0) { g.strokeStyle = "#c9d1d9"; for (let x = 40; x < w; x += 58) { g.beginPath(); g.moveTo(x, 22); g.lineTo(x, h); g.stroke(); }
      for (let y = 36; y < h; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.fillStyle = "#3d7a4d"; for (let i = 0; i < 40; i++) g.fillRect(44 + (i % 8) * 58, 40 + Math.floor(i / 8) * 16, 20 + (i * 37) % 30, 8); }
    if (kind === 1) { const cols = ["#7fb4ff", "#c792ea", "#f78c6c", "#c3e88d", "#89ddff", "#ffcb6b"];
      for (let y = 34; y < h - 8; y += 13) { let x = 20 + ((y * 7) % 60); const n = 2 + (y % 4); for (let i = 0; i < n; i++) { const L = 18 + ((x + y) * 13) % 70; g.fillStyle = cols[(x + y + i) % cols.length]; g.fillRect(x, y, L, 6); x += L + 8; } } }
    if (kind === 2) { g.fillStyle = "#e9edf1"; g.fillRect(0, 22, 140, h); for (let y = 30; y < h; y += 30) { g.fillStyle = "#c9d1d9"; g.fillRect(148, y + 22, w - 160, 1); g.fillStyle = "#333"; g.fillRect(156, y, 180, 7); g.fillStyle = "#888"; g.fillRect(156, y + 11, 260, 5); } }
    if (kind === 3) { const bars = [0.6, 0.8, 0.45, 0.9, 0.7, 0.55, 0.85]; bars.forEach((b, i) => { g.fillStyle = i % 2 ? "#2f5d7c" : "#79b4d8"; g.fillRect(40 + i * 40, h - 30 - b * (h - 90), 26, b * (h - 90)); });
      g.strokeStyle = "#d95728"; g.lineWidth = 3; g.beginPath(); for (let i = 0; i < 8; i++) g.lineTo(330 + i * 22, 180 - Math.sin(i) * 40 - i * 8); g.stroke(); }
  };
}
defP("monitor", (v = 0) => { const K = new Kit();
  K.rbox(1.82, 0.08, 1.12, 0.02, 0, 0, 3.34, 0, 0, 0, 0, 1); K.rbox(1.3, 0.14, 0.8, 0.06, 0, -0.08, 3.34, 0, 0, 0, 0, 1);
  K.box(0.16, 0.08, 0.6, 0, -0.16, 2.84, 1); K.box(0.72, 0.5, 0.03, 0, -0.1, 2.465, 1);
  const g = K.build(); const sg = quadGeoAt(1.74, 1.02, 0, 0.042, 3.35);
  return { g, pal: [PL.blackP, PL.graph], extras: [{ g: sg, m: screenMat("scr" + v, screenDraw(v)) }] }; });
defP("divider", () => { const K = new Kit();
  K.rbox(1.0, 0.1, 1.15, 0.03, 0, 0, 3.02, 0); K.box(1.0, 0.12, 0.04, 0, 0, 3.61, 1);
  return { g: K.build(), pal: [PL.fabT, PL.alu], nt: 1 }; });
defP("chair", () => { const K = new Kit();
  stars(K, 1.05, 0.22, 3); K.cyl(0.07, 0.07, 0.95, 0, 0, 0.75, 2, 10); K.cyl(0.1, 0.1, 0.35, 0, 0, 0.45, 3, 10);
  K.rbox(1.6, 1.55, 0.26, 0.11, 0, 0.05, 1.45, 0, 0, 0, 0, 2); K.box(0.9, 0.9, 0.08, 0, 0, 1.28, 3);
  K.box(0.18, 0.5, 0.12, 0, -0.75, 1.5, 3); K.box(0.14, 0.12, 1.1, 0, -0.85, 2.05, 3, 0, 0.12);
  // mesh back with frame
  K.rbox(1.46, 0.16, 1.6, 0.14, 0, -0.95, 2.8, 1, 0, 0.14, 0, 1); K.rbox(1.34, 0.1, 1.5, 0.12, 0, -0.9, 2.8, 4, 0, 0.14, 0, 1);
  K.rbox(0.9, 0.18, 0.32, 0.08, 0, -0.84, 2.32, 3, 0, 0.14, 0, 1);
  for (const sd of [-1, 1]) { K.box(0.1, 0.12, 0.72, sd * 0.78, -0.1, 1.83, 3); K.rbox(0.28, 0.9, 0.09, 0.04, sd * 0.78, 0.0, 2.2, 3, 0, 0, 0, 1); }
  return { g: K.build(), pal: [PL.fabT, PL.blackP, PL.chrome, PL.darkP, PL.mesh, 0, 0, 0, 0, PL.rubber], nt: 1 }; });
defP("mchair", () => { const K = new Kit();
  for (const sd of [-1, 1]) K.tube([[sd * 0.72, 0.8, 0.03], [sd * 0.72, -0.7, 0.03], [sd * 0.72, -0.78, 0.6], [sd * 0.72, -0.62, 1.45], [sd * 0.72, 0.45, 1.5], [sd * 0.72, 0.62, 2.25], [sd * 0.72, 0.05, 2.25]], 0.05, 1, 6, 28);
  K.rbox(1.45, 1.45, 0.22, 0.1, 0, 0.05, 1.52, 0); K.rbox(1.42, 0.2, 1.3, 0.1, 0, -0.72, 2.3, 0, 0, 0.18);
  return { g: K.build(), pal: [PL.fabT, PL.chrome], nt: 1 }; });
defP("uchair", () => { const K = new Kit();
  K.rbox(1.45, 1.4, 0.12, 0.06, 0, 0.05, 1.5, 0); K.rbox(1.5, 0.12, 0.95, 0.06, 0, -0.66, 2.0, 0, 0, 0.26);
  for (const sd of [-1, 1]) K.rbox(0.12, 1.35, 0.35, 0.06, sd * 0.7, 0.0, 1.62, 0, 0, 0.1, 0, 1);
  for (const [x, y] of [[-0.55, 0.5], [0.55, 0.5], [-0.55, -0.45], [0.55, -0.45]]) K.limb([x * 0.6, y * 0.6, 1.42], [x, y, 0.0], 0.05, 0.035, 1, 8, 2);
  K.tube([[-0.34, 0.3, 1.2], [0, 0.0, 1.05], [0.34, 0.3, 1.2]], 0.015, 2, 6, 12); K.tube([[-0.34, -0.27, 1.2], [0, 0.0, 1.05], [0.34, -0.27, 1.2]], 0.015, 2, 6, 12);
  return { g: K.build(), pal: [[0xf1efe8, 0.35, 0, 4, 0], PL.oak, PL.chrome], nt: 1 }; });
defP("lchair", () => { const K = new Kit();
  stars(K, 1.1, 0.22, 2); K.cyl(0.08, 0.08, 1.0, 0, 0, 0.78, 2, 12);
  K.rbox(1.7, 1.65, 0.34, 0.14, 0, 0.05, 1.5, 0, 0, 0, 0, 3); K.rbox(1.62, 0.36, 2.4, 0.16, 0, -0.95, 3.0, 0, 0, 0.12, 0, 3);
  K.rbox(1.3, 0.12, 0.6, 0.12, 0, -0.76, 3.6, 0, 0, 0.12); K.rbox(1.3, 0.12, 0.6, 0.12, 0, -0.84, 2.95, 0, 0, 0.12);
  for (const sd of [-1, 1]) { K.rbox(0.12, 0.16, 0.6, 0.04, sd * 0.86, -0.1, 1.9, 2); K.rbox(0.3, 1.0, 0.12, 0.05, sd * 0.86, -0.05, 2.25, 1); }
  return { g: K.build(), pal: [PL.leatherT, PL.blackP, PL.alu, 0, 0, 0, 0, 0, 0, PL.rubber], nt: 1 }; });
defP("stool", () => { const K = new Kit();
  K.cyl(0.8, 0.8, 0.05, 0, 0, 0.03, 1, 28); K.cyl(0.07, 0.07, 2.4, 0, 0, 1.25, 1, 12); K.tor(0.55, 0.03, 0, 0, 1.0, 1); K.cyl(0.65, 0.6, 0.22, 0, 0, 2.55, 0, 28);
  return { g: K.build(), pal: [PL.leatherT, PL.chrome], nt: 1 }; });
defP("tblTop", (v = 0) => { const K = new Kit(); K.rbox(1.0, 1.0, 0.1, 0.03, 0, 0, 2.4, 0); return { g: K.build(), pal: [v ? PL.walnut : PL.oakT], nt: v ? 0 : 1 }; });
defP("tblLeg", () => { const K = new Kit(); K.box(0.12, 0.12, 2.35, 0, 0, 1.18, 0); K.box(0.14, 0.14, 0.03, 0, 0, 0.015, 1); return { g: K.build(), pal: [PL.graph, PL.rubber] }; });
defP("tblPed", () => { const K = new Kit(); K.rbox(0.3, 1.6, 2.35, 0.04, 0, 0, 1.18, 0); K.rbox(0.5, 1.9, 0.08, 0.03, 0, 0, 0.04, 1); return { g: K.build(), pal: [PL.walnut, PL.graph] }; });
defP("rtblTop", () => { const K = new Kit(); K.cyl(0.5, 0.5, 0.08, 0, 0, 2.41, 0, 40); return { g: K.build(), pal: [PL.lamT], nt: 1 }; });
defP("pedestal", () => { const K = new Kit(); K.cyl(0.1, 0.1, 2.3, 0, 0, 1.2, 0, 14); K.cyl(0.8, 0.8, 0.06, 0, 0, 0.03, 0, 32); K.cyl(0.16, 0.16, 0.08, 0, 0, 2.33, 0, 16); return { g: K.build(), pal: [PL.graph] }; });
defP("tv", () => { const K = new Kit(); K.rbox(4.1, 0.14, 2.35, 0.02, 0, 0, 4.6, 0); K.box(1.2, 0.08, 0.6, 0, -0.1, 4.6, 1);
  return { g: K.build(), pal: [PL.blackP, PL.graph], extras: [{ g: quadGeoAt(4.0, 2.25, 0, 0.072, 4.6), m: screenMat("tvs", (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#1d3b53"); gr.addColorStop(1, "#2f5d7c"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = "#fff"; g.font = "bold 34px sans-serif"; g.fillText("Q3 Workplace Review", 40, 70); g.fillStyle = "#cfe0ee"; g.font = "20px sans-serif";
    ["Space utilisation 82%", "Energy savings 14%", "Service tickets closed 96%"].forEach((t, i) => g.fillText("• " + t, 50, 130 + i * 38));
    [0.5, 0.75, 0.62, 0.9].forEach((b, i) => { g.fillStyle = i % 2 ? "#79b4d8" : "#d95728"; g.fillRect(330 + i * 36, 250 - b * 140, 24, b * 140); }); }) }] }; });
defP("credenza", () => { const K = new Kit(); K.rbox(6, 1.6, 2.4, 0.04, 0, 0, 1.35, 0); for (let i = 0; i < 3; i++) K.box(1.9, 0.02, 2.1, -2 + i * 2, 0.8, 1.35, 1); K.box(5.8, 1.4, 0.15, 0, 0, 0.08, 2);
  return { g: K.build(), pal: [PL.walnut, [0x5c3e2b, 0.5, 0, 1], PL.blackP] }; });
defP("fcab", () => { const K = new Kit(); K.rbox(1.55, 2.0, 2.3, 0.03, 0, 0, 1.15, 0); for (let i = 0; i < 3; i++) { K.box(1.45, 0.02, 0.7, 0, 1.0, 0.45 + i * 0.75, 1); K.box(0.5, 0.06, 0.06, 0, 1.03, 0.7 + i * 0.75, 2); }
  return { g: K.build(), pal: [[0xd8d8d4, 0.5, 0.3, 0], [0xcfcfcb, 0.5, 0.3, 0], PL.chrome] }; });
defP("printer", () => { const K = new Kit(); K.rbox(2.0, 1.8, 2.3, 0.05, 0, 0, 1.15, 0); K.rbox(1.9, 1.7, 0.6, 0.05, 0, 0, 2.6, 1); K.box(1.2, 0.8, 0.2, 0.1, 0.1, 2.95, 0); K.box(0.4, 0.2, 0.25, 0.6, 0.85, 2.8, 2);
  return { g: K.build(), pal: [PL.white, [0x5b5f66, 0.5, 0, 4], PL.blackP] }; });
defP("bshelf", () => { const K = new Kit(); K.box(3.0, 1.2, 0.08, 0, 0, 0.04, 0); K.box(3.0, 1.2, 0.08, 0, 0, 6.46, 0); K.box(0.08, 1.2, 6.5, -1.46, 0, 3.25, 0); K.box(0.08, 1.2, 6.5, 1.46, 0, 3.25, 0); K.box(3.0, 0.05, 6.5, 0, -0.58, 3.25, 0);
  for (let s = 0; s < 5; s++) { const z = 0.1 + s * 1.28; K.box(2.9, 1.1, 0.06, 0, 0, z, 0);
    let x = -1.35; let i = s * 7; while (x < 1.3) { const w = 0.1 + ((i * 37) % 7) * 0.02, h = 0.75 + ((i * 53) % 5) * 0.06; K.box(w, 0.8, h, x + w / 2, 0.05, z + 0.03 + h / 2, 1 + (i % 4)); x += w + 0.01; i++; } }
  return { g: K.build(), pal: [PL.oak, [0x7a2432, 0.8, 0, 0], [0x2f3f70, 0.8, 0, 0], [0x1f6f6a, 0.8, 0, 0], [0xc9a13a, 0.8, 0, 0]] }; });
defP("shelf", () => { const K = new Kit(); for (const [x, y] of [[-1.95, -0.75], [1.95, -0.75], [-1.95, 0.75], [1.95, 0.75]]) K.box(0.08, 0.08, 6.2, x, y, 3.1, 0);
  for (let s = 0; s < 5; s++) { const z = 0.25 + s * 1.4; K.box(4.0, 1.6, 0.05, 0, 0, z, 0); let x = -1.7; let i = s * 3;
    while (x < 1.4) { const w = 0.8 + ((i * 29) % 4) * 0.2, h = 0.6 + ((i * 17) % 3) * 0.2; if ((i * 7) % 5 !== 0) K.box(w, 1.2, h, x + w / 2, 0.0, z + 0.03 + h / 2, 1); x += w + 0.15; i++; } }
  return { g: K.build(), pal: [PL.grey, PL.card] }; });
defP("mug", () => { const K = new Kit(); K.cyl(0.13, 0.12, 0.32, 0, 0, 2.61, 0, 14); K.tor(0.08, 0.02, 0.15, 0, 2.62, 0, Math.PI / 2, 0, 0); return { g: K.build(), pal: [[0xf2f0ea, 0.2, 0, 8]] }; });
defP("papers", () => { const K = new Kit(); K.box(0.7, 0.95, 0.04, 0, 0, 2.47, 0); K.box(0.7, 0.95, 0.02, 0.05, 0.03, 2.5, 0, 0.2); return { g: K.build(), pal: [PL.white] }; });
function foliage(K, n, R, H, seed, slot, leafL = 0.55, leafW = 0.2) {
  for (let i = 0; i < n; i++) {
    const a = i * 2.39996 + seed, t = (i + 0.5) / n, r = R * Math.sqrt(t), z = H * (0.35 + 0.65 * (1 - t) * 0.9 + 0.1 * rnd01(i + seed));
    const dir = [Math.cos(a), Math.sin(a), 0.35 + 0.5 * (1 - t)];
    K.blobDir([Math.cos(a) * r, Math.sin(a) * r, z], dir, [0, 0, 1], leafW, leafL, 0.03, slot, 6);
  }
}
defP("plant", () => { const K = new Kit();
  K.lathe([[0.001, 0], [0.55, 0], [0.62, 0.1], [0.72, 1.35], [0.66, 1.4], [0.001, 1.38]], 0, 0, 0, 0, 24); K.cyl(0.6, 0.6, 0.05, 0, 0, 1.32, 2, 20);
  for (let i = 0; i < 5; i++) { const a = i * 1.26; K.limb([0, 0, 1.3], [Math.cos(a) * 0.35, Math.sin(a) * 0.35, 2.8 + (i % 3) * 0.5], 0.03, 0.02, 3, 6, 1); }
  foliage(K, 46, 1.25, 4.4, 1.7, 1, 0.62, 0.22);
  return { g: K.build(), pal: [PL.potT, PL.plantG, PL.soil, [0x5b4a2f, 0.9, 0, 0]], nt: 2 }; });
PDEF.dplant = () => { const K = new Kit(); K.cyl(0.18, 0.14, 0.3, 0, 0, 2.6, 0, 14);
  for (let i = 0; i < 14; i++) { const a = i * 2.4; K.blobDir([Math.cos(a) * 0.1, Math.sin(a) * 0.1, 2.85 + (i % 4) * 0.06], [Math.cos(a), Math.sin(a), 0.8], [0, 0, 1], 0.06, 0.17, 0.02, 1, 8); }
  return { g: K.build(), pal: [PL.cer, PL.plantG], nt: 1 }; };
defP("planterBox", () => { const K = new Kit(); K.rbox(1.0, 1.0, 1.4, 0.04, 0, 0, 0.7, 0); K.box(0.94, 0.94, 0.05, 0, 0, 1.36, 2); return { g: K.build(), pal: [[0x6d6a64, 0.8, 0, 0], 0, PL.soil] }; });
defP("shrub", () => { const K = new Kit(); for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 0.25 * Math.sqrt(i); K.sph(0.42 - i * 0.015, Math.cos(a) * r, Math.sin(a) * r, 1.7 + (i % 3) * 0.12, 0, 1, 1, 0.8, 12, 8); } foliage(K, 30, 0.7, 2.3, 0.4, 0, 0.3, 0.14);
  return { g: K.build(), pal: [[0x3d6b2c, 0.8, 0, 0, 0]], nt: 1 }; });
// -- lounge ------------------------------------------------------------------------------------------------
function sofaKit(L, d = 2.9) { const K = new Kit(); const n = Math.max(1, Math.round((L - 1.0) / 2.1)), cw = (L - 1.0) / n;
  K.rbox(L - 0.9, d - 0.5, 0.7, 0.06, 0, 0.1, 0.65, 0); K.rbox(L - 0.2, 0.5, 2.2, 0.12, 0, -d / 2 + 0.25, 1.35, 0);
  for (const sd of [-1, 1]) K.rbox(0.45, d, 1.9, 0.14, sd * (L / 2 - 0.23), 0, 1.0, 0);
  for (let i = 0; i < n; i++) { const x = -L / 2 + 0.5 + cw * (i + 0.5); K.rbox(cw - 0.06, d - 0.75, 0.45, 0.14, x, 0.2, 1.22, 0); K.rbox(cw - 0.1, 0.5, 1.5, 0.2, x, -d / 2 + 0.72, 1.95, 0, 0, 0.18); }
  for (const [x, y] of [[-L / 2 + 0.3, -d / 2 + 0.3], [L / 2 - 0.3, -d / 2 + 0.3], [-L / 2 + 0.3, d / 2 - 0.3], [L / 2 - 0.3, d / 2 - 0.3]]) K.cyl(0.06, 0.05, 0.3, x, y, 0.15, 1, 8);
  return K; }
defP("sofa", (L = 6) => ({ g: sofaKit(L).build(), pal: [PL.fabT, PL.walnut], nt: 1 }));
defP("arm", () => ({ g: sofaKit(2.9, 2.7).build(), pal: [PL.fabT, PL.walnut], nt: 1 }));
defP("ctbl", () => { const K = new Kit(); K.rbox(3.2, 2.0, 0.1, 0.03, 0, 0, 1.3, 0); K.box(3.0, 1.8, 0.05, 0, 0, 0.45, 0); for (const [x, y] of [[-1.45, -0.85], [1.45, -0.85], [-1.45, 0.85], [1.45, 0.85]]) K.box(0.08, 0.08, 1.25, x, y, 0.63, 1);
  K.box(0.9, 0.6, 0.12, -0.6, 0.2, 1.41, 2); return { g: K.build(), pal: [PL.walnut, PL.graph, [0x7a2432, 0.7, 0, 0]] }; });
defP("bench", (L = 6) => { const K = new Kit(); K.rbox(L, 1.3, 0.35, 0.1, 0, 0, 1.4, 0); for (const x of [-L / 2 + 0.35, L / 2 - 0.35]) { K.box(0.1, 1.1, 1.2, x, 0, 0.62, 1); }
  return { g: K.build(), pal: [PL.fabT, PL.graph], nt: 1 }; });
defP("gbench", () => { const K = new Kit(); for (let i = 0; i < 5; i++) K.rbox(5, 0.24, 0.1, 0.03, 0, -0.55 + i * 0.28, 1.45, 0); for (let i = 0; i < 3; i++) K.rbox(5, 0.22, 0.1, 0.03, 0, -0.85, 1.8 + i * 0.3, 0, 0, -0.2);
  for (const x of [-2.2, 2.2]) { K.box(0.12, 1.5, 0.12, x, -0.05, 1.35, 1); K.box(0.12, 0.12, 1.4, x, 0.6, 0.7, 1); K.box(0.12, 0.12, 2.4, x, -0.75, 1.2, 1, 0, -0.1); }
  return { g: K.build(), pal: [PL.oak, PL.graph] }; });
defP("bbag", () => { const K = new Kit(); K.sph(1.2, 0, 0, 0.7, 0, 1, 1, 0.6, 22, 14); K.sph(0.9, 0, -0.5, 1.2, 0, 1, 0.6, 0.7, 18, 10); return { g: K.build(), pal: [PL.fabT], nt: 1 }; });
// -- kitchen / cafeteria -------------------------------------------------------------------------------------
defP("barc", () => { const K = new Kit(); K.rbox(8, 1.8, 3.4, 0.04, 0, -0.2, 1.7, 0); K.rbox(8.3, 2.3, 0.12, 0.04, 0, 0, 3.45, 1); K.box(8, 0.05, 0.25, 0, 0.72, 0.3, 2);
  for (let i = 0; i < 5; i++) K.box(0.05, 0.03, 3.0, -3.2 + i * 1.6, 0.71, 1.8, 2);
  return { g: K.build(), pal: [[0x3a3d42, 0.5, 0, 1], [0xe8e4dc, 0.25, 0, 0], PL.alu] }; });
defP("kitchen", () => { const K = new Kit(); K.rbox(6, 2.0, 2.9, 0.03, 0, 0, 1.45, 0); K.rbox(6.1, 2.1, 0.1, 0.02, 0, 0.02, 2.95, 1);
  for (let i = 0; i < 4; i++) { K.box(1.42, 0.02, 2.4, -2.2 + i * 1.47, 1.0, 1.4, 2); K.box(0.4, 0.05, 0.05, -2.2 + i * 1.47, 1.03, 2.4, 3); }
  K.rbox(1.6, 1.2, 0.3, 0.1, 1.2, 0.1, 2.9, 3); K.limb([1.2, -0.55, 3.0], [1.2, -0.55, 3.8], 0.05, 0.05, 3); K.limb([1.2, -0.55, 3.8], [1.2, -0.1, 3.7], 0.04, 0.03, 3);
  K.rbox(6, 1.2, 2.3, 0.03, 0, -0.4, 6.4, 0); for (let i = 0; i < 4; i++) K.box(1.42, 0.02, 2.1, -2.2 + i * 1.47, 0.21, 6.4, 2);
  K.rbox(1.2, 0.9, 0.9, 0.08, -1.8, -0.2, 3.5, 4);
  return { g: K.build(), pal: [PL.white, [0x3b3c3e, 0.3, 0, 0], [0xf4f3ef, 0.5, 0, 0], PL.steel, PL.graph] }; });
defP("fridge", () => { const K = new Kit(); K.rbox(2.6, 2.3, 6, 0.08, 0, 0, 3.0, 0); K.box(0.02, 0.03, 5.6, 0, 1.16, 3.0, 1); for (const sd of [-1, 1]) K.rbox(0.07, 0.12, 1.6, 0.03, sd * 0.2, 1.22, 3.6, 2);
  return { g: K.build(), pal: [PL.steel, PL.blackP, PL.chrome] }; });
defP("wdisp", () => { const K = new Kit(); K.rbox(1.05, 1.05, 3.1, 0.08, 0, 0, 1.55, 0); K.lathe([[0.001, 3.1], [0.35, 3.12], [0.45, 3.4], [0.45, 4.3], [0.2, 4.55], [0.1, 4.6], [0.001, 4.6]], 0, 0, 0, 1, 20);
  K.box(0.6, 0.1, 0.5, 0, 0.53, 2.2, 2); K.cyl(0.04, 0.04, 0.12, -0.15, 0.58, 2.1, 3, 8); K.cyl(0.04, 0.04, 0.12, 0.15, 0.58, 2.1, 4, 8);
  return { g: K.build(), pal: [PL.white, [0x9fc7e8, 0.1, 0, 11], PL.darkP, PL.blue, PL.red] }; });
defP("coffee", () => { const K = new Kit(); K.rbox(1.4, 1.8, 3.2, 0.04, 0, 0, 1.6, 0); K.rbox(1.5, 1.9, 0.08, 0.03, 0, 0, 3.24, 1); K.rbox(0.9, 1.1, 1.4, 0.08, 0, -0.2, 4.0, 2); K.box(0.5, 0.1, 0.3, 0, 0.36, 4.3, 3); K.cyl(0.1, 0.09, 0.26, 0, 0.25, 3.42, 4, 12);
  return { g: K.build(), pal: [PL.walnut, [0xe8e4dc, 0.3, 0, 0], PL.steel, PL.blackP, PL.cer] }; });
defP("vend", () => { const K = new Kit(); K.rbox(3.0, 2.6, 6.0, 0.06, 0, 0, 3.0, 0); K.box(0.7, 0.05, 1.8, 1.0, 1.31, 3.8, 1); K.box(1.6, 0.05, 0.5, -0.3, 1.31, 0.7, 1);
  return { g: K.build(), pal: [[0xb3282d, 0.4, 0.2, 0], PL.blackP], extras: [{ g: quadGeoAt(1.9, 4.6, -0.45, 1.32, 3.6), m: screenMat("vendF", (g, w, h) => {
    g.fillStyle = "#111"; g.fillRect(0, 0, w, h); const cols = ["#d63a2f", "#f2c230", "#2e7bd6", "#2bb673", "#e86fa3", "#f58a34"];
    for (let r = 0; r < 6; r++) { g.fillStyle = "#333"; g.fillRect(8, 30 + r * 70, w - 16, 4); for (let c = 0; c < 5; c++) { g.fillStyle = cols[(r * 2 + c) % 6]; g.fillRect(16 + c * 46, 30 + r * 70 - 44, 32, 44); g.fillStyle = "#fff"; g.fillRect(20 + c * 46, 30 + r * 70 - 30, 24, 6); } } }, 256, 480, 1.0) }] }; });
defP("teac", () => { const K = new Kit(); K.rbox(6, 2.0, 3.0, 0.04, 0, 0, 1.5, 0); K.rbox(6.1, 2.1, 0.1, 0.03, 0, 0, 3.05, 1); K.lathe([[0.001, 0], [0.45, 0], [0.5, 1.2], [0.3, 1.45], [0.001, 1.5]], -1.5, -0.2, 3.1, 2, 20);
  for (let i = 0; i < 6; i++) K.cyl(0.12, 0.1, 0.3, 0.6 + (i % 3) * 0.35, -0.2 + Math.floor(i / 3) * 0.4, 3.25, 3, 12);
  return { g: K.build(), pal: [PL.oak, [0xe8e4dc, 0.25, 0, 0], PL.steel, PL.cer] }; });
// -- wet areas ------------------------------------------------------------------------------------------------
defP("wc", () => { const K = new Kit();
  K.lathe([[0.001, 0], [0.42, 0.0], [0.5, 0.5], [0.62, 1.0], [0.66, 1.25], [0.6, 1.33], [0.001, 1.33]], 0, 0.35, 0, 0, 24, 0.85, 1.2, 1);
  K.rbox(1.25, 1.4, 0.08, 0.1, 0, 0.42, 1.38, 1); K.rbox(1.55, 0.65, 1.3, 0.1, 0, -0.62, 2.0, 0); K.rbox(1.6, 0.7, 0.1, 0.05, 0, -0.62, 2.7, 0);
  K.cyl(0.07, 0.07, 0.04, 0.35, -0.62, 2.77, 2, 12);
  return { g: K.build(), pal: [PL.cer, PL.white, PL.chrome] }; });
defP("urinal", () => { const K = new Kit(); K.lathe([[0.001, 0], [0.5, 0.05], [0.62, 0.6], [0.6, 1.8], [0.45, 2.1], [0.001, 2.12]], 0, -0.1, 1.7, 0, 22, 0.9, 0.6, 1); K.limb([0, -0.4, 3.9], [0, -0.4, 4.3], 0.05, 0.05, 1);
  return { g: K.build(), pal: [PL.cer, PL.chrome] }; });
defP("basin", () => { const K = new Kit(); K.rbox(2.2, 1.8, 0.14, 0.03, 0, -0.1, 2.7, 0); K.box(2.2, 0.05, 0.6, 0, 0.78, 2.35, 0);
  K.lathe([[0.3, 0.001], [0.62, 0.02], [0.75, 0.35], [0.78, 0.4], [0.001, 0.4]], 0, 0.0, 2.36, 1, 24, 1.0, 0.75, 1);
  K.limb([0, -0.72, 2.78], [0, -0.72, 3.3], 0.06, 0.05, 2); K.limb([0, -0.72, 3.3], [0, -0.35, 3.25], 0.045, 0.035, 2); K.box(0.25, 0.08, 0.05, 0, -0.72, 3.18, 2);
  K.box(2.1, 0.05, 2.6, 0, -0.97, 4.8, 3); K.box(2.2, 0.03, 2.7, 0, -0.99, 4.8, 4);
  return { g: K.build(), pal: [[0x3b3c3e, 0.25, 0, 0], PL.cer, PL.chrome, [0xc9d3d8, 0.12, 0.85, 11], PL.alu] }; });
defP("cpart", () => { const K = new Kit(); K.box(0.08, 1.0, 5.9, 0, 0, 3.3, 0); K.cyl(0.06, 0.06, 0.35, 0, 0.35, 0.18, 1, 10); K.cyl(0.06, 0.06, 0.35, 0, -0.35, 0.18, 1, 10);
  return { g: K.build(), pal: [[0x8a9aa3, 0.35, 0.1, 0], PL.chrome] }; });
defP("shower", () => { const K = new Kit(); K.rbox(3.1, 3.3, 0.2, 0.04, 0, 0, 0.1, 0); K.limb([0, -1.55, 6.3], [0, -1.1, 6.35], 0.04, 0.04, 1); K.cyl(0.25, 0.25, 0.06, 0, -1.05, 6.3, 1, 18); K.box(0.05, 0.05, 6.8, -1.55, 1.63, 3.4, 1); K.box(0.05, 0.05, 6.8, 1.55, 1.63, 3.4, 1);
  const G = new Kit(); G.box(3.1, 0.03, 6.6, 0, 1.63, 3.5, 0);
  return { g: K.build(), pal: [PL.cer, PL.chrome], extras: [{ g: G.build(), m: glassMatK() }] }; });
defP("locker", () => { const K = new Kit(); K.rbox(3.0, 1.55, 6.0, 0.03, 0, 0, 3.0, 0); for (let c = 0; c < 2; c++) for (let r = 0; r < 3; r++) { K.box(1.42, 0.02, 1.9, -0.74 + c * 1.48, 0.78, 0.95 + r * 2.0, 1); K.box(0.06, 0.05, 0.3, -0.2 + c * 1.48 - 0.4, 0.8, 1.2 + r * 2.0, 2); for (let v = 0; v < 4; v++) K.box(0.6, 0.02, 0.03, -0.74 + c * 1.48, 0.8, 1.6 + r * 2.0 + v * 0.08, 3); }
  return { g: K.build(), pal: [[0x7f8c95, 0.45, 0.4, 0], [0x8d9aa3, 0.4, 0.4, 0], PL.chrome, PL.darkP] }; });
defP("msink", () => { const K = new Kit(); K.rbox(2.0, 1.8, 1.0, 0.1, 0, 0, 0.5, 0); K.limb([0, -0.8, 1.0], [0, -0.8, 2.8], 0.05, 0.05, 1); K.limb([0, -0.8, 2.8], [0, -0.4, 2.7], 0.04, 0.03, 1); K.cyl(0.35, 0.3, 1.0, 0.8, 0.8, 0.5, 2, 14);
  return { g: K.build(), pal: [PL.cer, PL.chrome, PL.yellow] }; });
defP("wudu", () => { const K = new Kit(); K.rbox(2.6, 1.3, 1.1, 0.05, 0, -0.55, 0.55, 0); K.box(2.4, 0.9, 0.15, 0, -0.55, 1.12, 1); K.limb([0, -1.2, 2.7], [0, -0.85, 2.65], 0.04, 0.03, 2);
  K.cyl(0.4, 0.4, 0.1, 0, 0.55, 1.1, 3, 18); K.cyl(0.06, 0.06, 1.05, 0, 0.55, 0.53, 2, 10);
  return { g: K.build(), pal: [[0xd8d2c4, 0.4, 0, 8], [0x9aa0a4, 0.3, 0.2, 0], PL.chrome, [0x6a4832, 0.6, 0, 1]] }; });
defP("shoes", () => { const K = new Kit(); K.rbox(4.0, 1.2, 3.2, 0.03, 0, -0.05, 1.6, 0); for (let s = 0; s < 3; s++) { K.box(3.8, 1.1, 0.05, 0, 0.05, 0.3 + s * 1.0, 1); for (let i = 0; i < 6; i++) { const c = (s * 6 + i) % 3; K.rbox(0.28, 0.8, 0.25, 0.1, -1.6 + i * 0.64 - 0.15, 0.1, 0.45 + s * 1.0, 2 + c); K.rbox(0.28, 0.8, 0.25, 0.1, -1.6 + i * 0.64 + 0.15, 0.1, 0.45 + s * 1.0, 2 + c); } }
  return { g: K.build(), pal: [PL.oak, [0xb99e7a, 0.6, 0, 1], [0x151515, 0.5, 0, 6], [0x4a3021, 0.5, 0, 6], [0xe6e6e6, 0.6, 0, 5]] }; });
function rugDraw(v) { return (g, w, h) => {
  const base = ["#7a1f24", "#1f4f3a", "#1f356a", "#6a4a1f"][v], edge = ["#c9a13a", "#e8d8b0", "#c9a13a", "#e0c89a"][v];
  g.fillStyle = base; g.fillRect(0, 0, w, h); g.strokeStyle = edge; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20); g.lineWidth = 3; g.strokeRect(24, 24, w - 48, h - 48);
  g.beginPath(); g.moveTo(40, h - 60); g.lineTo(40, h * 0.35); g.quadraticCurveTo(w / 2, 20, w - 40, h * 0.35); g.lineTo(w - 40, h - 60); g.stroke();
  g.fillStyle = edge; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(w / 2, h * 0.45 + i * 38, 7, 0, Math.PI * 2); g.fill(); }
  for (let x = 30; x < w - 20; x += 22) { g.fillRect(x, h - 44, 10, 10); } }; }
// -- tech / plant rooms -----------------------------------------------------------------------------------------
defP("rack", () => { const K = new Kit(); K.rbox(2.0, 3.5, 7.0, 0.03, 0, 0, 3.5, 0); K.box(1.8, 0.04, 6.5, 0, 1.76, 3.5, 1);
  for (let u = 0; u < 12; u++) { const z = 0.8 + u * 0.46; K.box(1.6, 0.05, 0.3, 0, 1.73, z, 2); if (u % 2 === 0) K.box(0.05, 0.03, 0.05, -0.6, 1.79, z, 3); else K.box(0.05, 0.03, 0.05, -0.5, 1.79, z, 4); K.box(0.04, 0.03, 0.04, -0.7, 1.79, z, 3); }
  K.box(0.12, 0.08, 0.6, 0.85, 1.8, 3.6, 5);
  return { g: K.build(), pal: [[0x16181b, 0.5, 0.3, 0], [0x1d2024, 0.6, 0.4, 3], [0x2a2e33, 0.5, 0.3, 0], PL.led, [0x3fa9ff, 0.4, 0, 0], PL.chrome] }; });
defP("acunit", () => { const K = new Kit(); K.rbox(3.0, 2.2, 6.5, 0.04, 0, 0, 3.25, 0); for (let i = 0; i < 16; i++) K.box(2.6, 0.04, 0.05, 0, 1.11, 3.8 + i * 0.14, 1); K.box(0.6, 0.03, 0.35, 0.8, 1.11, 2.6, 2);
  return { g: K.build(), pal: [[0xe9e9e4, 0.5, 0.1, 0], [0x9aa0a4, 0.4, 0.3, 0], PL.scr] }; });
defP("ups", () => { const K = new Kit(); K.rbox(2.6, 2.7, 6.0, 0.05, 0, 0, 3.0, 0); K.box(2.2, 0.03, 5.4, 0, 1.36, 3.0, 1); K.box(0.8, 0.03, 0.5, 0, 1.38, 4.9, 2); K.box(0.08, 0.03, 0.08, -0.6, 1.39, 4.5, 3); K.box(0.08, 0.03, 0.08, -0.45, 1.39, 4.5, 4);
  return { g: K.build(), pal: [[0x2a2d31, 0.5, 0.2, 0], [0x33373c, 0.6, 0.3, 3], [0x7fd4ff, 0.2, 0, 11], PL.led, PL.ledR] }; });
defP("batt", () => { const K = new Kit(); for (const [x, y] of [[-1.95, -0.85], [1.95, -0.85], [-1.95, 0.85], [1.95, 0.85]]) K.box(0.1, 0.1, 5.0, x, y, 2.5, 0);
  for (let s = 0; s < 4; s++) { const z = 0.3 + s * 1.2; K.box(4.0, 1.8, 0.06, 0, 0, z, 0); for (let i = 0; i < 6; i++) { K.rbox(0.55, 1.4, 0.75, 0.03, -1.6 + i * 0.64, 0, z + 0.42, 1); K.cyl(0.05, 0.05, 0.06, -1.7 + i * 0.64, 0.4, z + 0.82, 2, 8); K.cyl(0.05, 0.05, 0.06, -1.5 + i * 0.64, 0.4, z + 0.82, 3, 8); } }
  return { g: K.build(), pal: [PL.grey, [0x2b2d30, 0.5, 0, 4], PL.red, PL.blackP] }; });
defP("vwall", () => { const K = new Kit(); K.box(7.6, 0.2, 4.4, 0, 0, 5.2, 0);
  const cams = screenMat("cctv", (g, w, h) => { g.fillStyle = "#050607"; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) { const x = 6 + c * (w / 3), y = 6 + r * (h / 2), cw = w / 3 - 12, ch = h / 2 - 12; const gr = g.createLinearGradient(x, y, x, y + ch);
      gr.addColorStop(0, ["#4a5560", "#5a5f52", "#3c4650"][c]); gr.addColorStop(1, "#1d2226"); g.fillStyle = gr; g.fillRect(x, y, cw, ch);
      g.fillStyle = "rgba(200,200,190,0.35)"; g.fillRect(x + cw * 0.1, y + ch * 0.55, cw * 0.8, ch * 0.08); g.fillRect(x + cw * (0.2 + 0.2 * c), y + ch * 0.25, cw * 0.1, ch * 0.3);
      g.fillStyle = "#fff"; g.font = "10px monospace"; g.fillText(`CAM ${r * 3 + c + 1}  2026-09-23 14:${10 + c}`, x + 4, y + 12); } }, 512, 256, 0.95);
  return { g: K.build(), pal: [PL.blackP], extras: [{ g: quadGeoAt(7.4, 4.2, 0, 0.11, 5.2), m: cams }] }; });
defP("cdesk", () => { const K = new Kit(); K.rbox(7.0, 2.6, 0.12, 0.04, 0, 0.3, 2.45, 0); K.rbox(7.0, 0.1, 2.3, 0.03, 0, -0.9, 1.25, 1); for (const x of [-3.3, 3.3]) K.box(0.1, 2.4, 2.35, x, 0.3, 1.2, 1);
  for (const x of [-1.9, 0, 1.9]) { K.rbox(1.82, 0.08, 1.12, 0.02, x, -0.4, 3.35, 2); K.rbox(0.16, 0.08, 0.6, 0.03, x, -0.46, 2.84, 3); }
  const S = new Kit(); for (const x of [-1.9, 0, 1.9]) S.push(quadG(1.74, 1.02), M4(x, -0.357, 3.36), 0);
  return { g: K.build(), pal: [PL.lam, PL.graph, PL.blackP, PL.graph], extras: [{ g: S.build(), m: screenMat("scr3", screenDraw(3)) }] }; });
defP("wbench", () => { const K = new Kit(); K.rbox(6, 2.4, 0.2, 0.03, 0, 0, 2.95, 0); for (const [x, y] of [[-2.8, -1.05], [2.8, -1.05], [-2.8, 1.05], [2.8, 1.05]]) K.box(0.14, 0.14, 2.9, x, y, 1.45, 1);
  K.box(5.8, 2.2, 0.08, 0, 0, 0.6, 1); K.box(6, 0.08, 3.0, 0, -1.2, 4.6, 2); for (let i = 0; i < 9; i++) K.box(0.08, 0.1, 0.6 + (i % 3) * 0.2, -2.4 + i * 0.6, -1.13, 4.8, 3);
  K.rbox(0.6, 0.5, 0.35, 0.05, 2.2, 0.8, 3.2, 4); K.rbox(1.6, 0.8, 0.5, 0.05, -1.8, 0.2, 3.3, 5);
  return { g: K.build(), pal: [[0x9a7a55, 0.7, 0, 1], PL.graph, [0xbfb49a, 0.8, 0, 0], PL.darkP, [0x3a6ea5, 0.5, 0.3, 0], PL.red] }; });
defP("drum", () => { const K = new Kit(); K.cyl(0.95, 0.95, 2.9, 0, 0, 1.45, 0, 24); for (const z of [0.9, 2.0]) K.tor(0.96, 0.04, 0, 0, z, 0); K.cyl(0.1, 0.1, 0.05, 0.4, 0, 2.92, 1, 10);
  return { g: K.build(), pal: [[0x2f5d9c, 0.5, 0.3, 0], PL.chrome] }; });
defP("trolley", () => { const K = new Kit(); K.rbox(3.0, 2.0, 0.12, 0.03, 0, 0, 0.55, 0); K.tube([[-1.4, -0.95, 0.6], [-1.4, -0.95, 3.2], [1.4, -0.95, 3.2], [1.4, -0.95, 0.6]], 0.05, 1, 8, 30);
  for (const [x, y] of [[-1.2, -0.8], [1.2, -0.8], [-1.2, 0.8], [1.2, 0.8]]) K.cyl(0.22, 0.22, 0.12, x, y, 0.22, 2, 14, 0, Math.PI / 2); K.rbox(2.0, 1.5, 1.0, 0.03, 0, 0.1, 1.1, 3);
  return { g: K.build(), pal: [PL.graph, PL.blue, PL.rubber, PL.card] }; });
defP("panel", () => { const K = new Kit(); K.rbox(3.0, 1.2, 7.0, 0.03, 0, 0, 3.5, 0); K.box(0.02, 0.02, 6.6, 0, 0.61, 3.6, 1); for (const x of [-0.25, 0.25]) K.rbox(0.08, 0.1, 0.5, 0.03, x, 0.64, 3.6, 2);
  for (let i = 0; i < 4; i++) K.cyl(0.07, 0.07, 0.05, -1.0 + i * 0.25, 0.62, 5.8, 3 + (i % 2), 10, Math.PI / 2); K.box(0.9, 0.03, 0.6, 0.8, 0.62, 5.6, 5);
  return { g: K.build(), pal: [[0xc7c9c4, 0.45, 0.3, 0], PL.darkP, PL.chrome, PL.led, PL.ledR, [0xd9b12a, 0.5, 0, 0]] }; });
defP("pump", () => { const K = new Kit(); K.rbox(2.2, 3.0, 0.3, 0.03, 0, 0, 0.15, 0); K.cyl(0.5, 0.5, 1.6, 0, -0.5, 0.95, 1, 22, Math.PI / 2); K.cyl(0.55, 0.55, 0.1, 0, 0.3, 0.95, 2, 22, Math.PI / 2);
  for (let i = 0; i < 10; i++) K.box(0.03, 1.4, 0.08, 0, -0.5, 0.95 + 0.52, 1, i * 0.62);
  K.lathe([[0.001, 0], [0.55, 0], [0.62, 0.35], [0.4, 0.55], [0.001, 0.55]], 0, 0.65, 0.95, 3, 22, 1, 1, 1, -Math.PI / 2);
  K.cyl(0.18, 0.18, 1.6, 0, 1.0, 1.7, 4, 14); K.cyl(0.18, 0.18, 1.2, 0, 1.6, 0.95, 4, 14, Math.PI / 2); K.cyl(0.26, 0.26, 0.08, 0, 1.0, 2.5, 2, 16);
  return { g: K.build(), pal: [PL.graph, [0x2f6fb0, 0.45, 0.2, 0], PL.steel, [0x2f6fb0, 0.45, 0.2, 0], [0x9aa0a4, 0.45, 0.6, 3]] }; });
// the diesel generating set drawn on A-111: 4'-8" x 8'-9" soundproof canopy on a base-frame fuel tank
defP("gen", () => { const K = new Kit(), W = 4.6, L = 8.7;
  K.rbox(W, L, 0.9, 0.05, 0, 0, 0.45, 1);                                  // base frame / fuel tank
  for (const y of [-3.6, 0, 3.6]) for (const x of [-W / 2 + 0.25, W / 2 - 0.25]) K.cyl(0.14, 0.14, 0.1, x, y, 0.05, 2, 10);
  K.rbox(W - 0.1, L - 0.1, 4.7, 0.12, 0, 0, 3.25, 0, 0, 0, 0, 3);           // canopy
  K.rbox(W + 0.02, L + 0.02, 0.08, 0.04, 0, 0, 5.62, 3);                     // roof lip
  for (const sd of [-1, 1]) {
    for (let d = 0; d < 2; d++) { const y = -2.0 + d * 3.1; K.rbox(0.05, 2.7, 3.7, 0.03, sd * (W / 2 + 0.005), y, 3.25, 4); K.rbox(0.08, 0.12, 0.45, 0.03, sd * (W / 2 + 0.04), y + 1.1, 3.4, 5);
      K.cyl(0.06, 0.06, 0.06, sd * (W / 2 + 0.03), y - 1.2, 4.9, 5, 8, 0, Math.PI / 2); K.cyl(0.06, 0.06, 0.06, sd * (W / 2 + 0.03), y - 1.2, 1.6, 5, 8, 0, Math.PI / 2); }
    for (let i = 0; i < 9; i++) K.box(0.08, 1.5, 0.07, sd * (W / 2 + 0.03), 3.3, 1.35 + i * 0.16, 6, 0, 0.5);    // intake louvres
    K.box(0.04, 1.5, 0.05, sd * (W / 2 + 0.06), 3.3, 1.2, 7); K.box(0.04, 0.05, 1.5, sd * (W / 2 + 0.06), 2.55, 2.0, 7); K.box(0.04, 0.05, 1.5, sd * (W / 2 + 0.06), 4.05, 2.0, 7);
    K.box(0.02, 1.2, 0.4, sd * (W / 2 + 0.03), -3.4, 2.1, 8);               // warning stripe
  }
  // radiator end: big discharge grille
  K.box(W - 0.8, 0.06, 3.6, 0, L / 2 + 0.01, 3.3, 7); for (let i = 0; i < 18; i++) K.box(W - 0.9, 0.12, 0.06, 0, L / 2 + 0.05, 1.7 + i * 0.19, 6, 0, -0.5);
  // control end: panel window with controller and e-stop
  K.box(1.8, 0.04, 1.4, -0.8, -L / 2 - 0.02, 4.0, 9); K.box(0.9, 0.03, 0.6, -0.8, -L / 2 - 0.05, 4.1, 10); K.cyl(0.14, 0.14, 0.12, 0.9, -L / 2 - 0.06, 4.1, 11, 14, Math.PI / 2); K.cyl(0.18, 0.18, 0.05, 0.9, -L / 2 - 0.03, 4.1, 8, 14, Math.PI / 2);
  // exhaust silencer on the roof and lifting eyes
  K.cyl(0.42, 0.42, 3.2, 0.9, -1.2, 6.15, 12, 20, 0, Math.PI / 2, Math.PI / 2); K.cyl(0.2, 0.2, 0.9, 0.9, 0.5, 6.55, 12, 14); K.cyl(0.24, 0.24, 0.05, 0.9, 0.5, 7.0, 12, 14, 0.5);
  for (const [x, y] of [[-W / 2 + 0.4, -L / 2 + 0.5], [W / 2 - 0.4, -L / 2 + 0.5], [-W / 2 + 0.4, L / 2 - 0.5], [W / 2 - 0.4, L / 2 - 0.5]]) K.tor(0.12, 0.035, x, y, 5.72, 5, Math.PI / 2);
  K.cyl(0.12, 0.12, 0.2, -1.4, 2.8, 0.95, 5, 12);                            // fuel filler
  const lab = canvasTex(256, 128, (g, w, h) => { g.fillStyle = "#f2f0ea"; g.fillRect(0, 0, w, h); g.fillStyle = "#1b1b1b"; g.font = "bold 28px sans-serif"; g.fillText("DIESEL GENERATOR", 14, 40);
    g.font = "20px sans-serif"; g.fillText("Standby  3-phase  50 Hz", 14, 74); g.fillStyle = "#d9b12a"; g.beginPath(); g.moveTo(200, 120); g.lineTo(228, 78); g.lineTo(252, 120); g.fill(); g.fillStyle = "#111"; g.font = "bold 26px sans-serif"; g.fillText("!", 222, 115); });
  const lm = new THREE.MeshStandardMaterial({ map: lab, roughness: 0.6 }); lm.userData.baseEnv = 0.5; envMats.push(lm);
  const LG = new Kit(); for (const sd of [-1, 1]) LG.push(quadG(1.6, 0.8), M4(sd * (W / 2 + 0.035), -0.4, 4.6, sd > 0 ? -Math.PI / 2 : Math.PI / 2), 0);
  const lcd = new Kit(); lcd.push(quadG(0.8, 0.5), M4(-0.8, -L / 2 - 0.07, 4.1, Math.PI), 0);
  return { g: K.build(), pal: [PL.genT, [0x2b2d30, 0.6, 0.3, 0], PL.rubber, [0xd4cfbf, 0.5, 0.25, 0, 0], [0xc9c4b4, 0.5, 0.25, 0, 0], PL.chrome, [0x2a2c2f, 0.6, 0.3, 0], [0x3a3c3f, 0.6, 0.3, 0],
    [0xd9b12a, 0.5, 0, 0], [0x0e1114, 0.1, 0.2, 11], [0x0e1114, 0.1, 0.2, 11], [0xc6232a, 0.4, 0, 4], [0x2e3032, 0.4, 0.7, 3]], nt: 1,
    extras: [{ g: LG.build(), m: lm }, { g: lcd.build(), m: screenMat("genlcd", (g, w, h) => { g.fillStyle = "#0a2a3a"; g.fillRect(0, 0, w, h); g.fillStyle = "#7fe0ff"; g.font = "bold 22px monospace"; g.fillText("READY  AUTO", 12, 34); g.font = "18px monospace"; g.fillText("400V 50.0Hz", 12, 64); g.fillText("FUEL 86%", 12, 92); }, 200, 110, 1.0) }] }; });
defP("pmat", () => ({ g: new Kit().push(quadG(6, 6), M4(0, 0, 0.03, 0, 1, 1, 1, -Math.PI / 2), 0).build(), pal: [PL.white], extras: [] }));
// -- gym / recreation --------------------------------------------------------------------------------------------
defP("tread", () => { const K = new Kit(); K.rbox(2.9, 6.4, 0.55, 0.08, 0, 0, 0.35, 0); K.box(1.9, 5.4, 0.04, 0, 0.2, 0.64, 1); for (const sd of [-1, 1]) { K.rbox(0.3, 6.2, 0.12, 0.05, sd * 1.2, 0, 0.65, 2);
    K.limb([sd * 1.1, 2.6, 0.6], [sd * 1.05, 2.95, 4.2], 0.09, 0.08, 0); K.limb([sd * 1.05, 2.95, 4.2], [sd * 1.0, 1.8, 3.9], 0.05, 0.05, 3); }
  K.rbox(2.4, 0.6, 1.0, 0.1, 0, 2.9, 4.4, 0, 0, 0.5);
  return { g: K.build(), pal: [PL.darkP, PL.rubber, PL.graph, PL.chrome], extras: [{ g: quadGeoAt(1.2, 0.6, 0, 2.62, 4.55, Math.PI, 0.5), m: screenMat("treadS", (g, w, h) => { g.fillStyle = "#06121a"; g.fillRect(0, 0, w, h); g.fillStyle = "#3fe0a0"; g.font = "bold 26px monospace"; g.fillText("8.5 km/h", 10, 34); g.font = "18px monospace"; g.fillText("12:48  142 kcal", 10, 70); }, 200, 100, 1) }] }; });
defP("bike", () => { const K = new Kit(); K.rbox(2.2, 0.35, 0.2, 0.08, 0, -1.6, 0.1, 0); K.rbox(1.8, 0.35, 0.2, 0.08, 0, 1.5, 0.1, 0); K.limb([0, -1.4, 0.25], [0, 0.4, 2.6], 0.12, 0.1, 0); K.limb([0, 1.4, 0.25], [0, 0.4, 1.4], 0.14, 0.12, 0);
  K.cyl(0.65, 0.65, 0.25, 0, 0.9, 1.1, 1, 24, 0, Math.PI / 2); K.limb([0, 0.4, 2.6], [0, 1.2, 3.8], 0.07, 0.06, 0); K.rbox(1.4, 0.2, 0.15, 0.06, 0, 1.25, 3.85, 1); K.rbox(0.8, 1.0, 0.2, 0.1, 0, -0.35, 3.2, 1); K.limb([0, -0.25, 2.2], [0, -0.35, 3.1], 0.06, 0.06, 2);
  return { g: K.build(), pal: [[0x2d3035, 0.4, 0.4, 0], PL.blackP, PL.chrome] }; });
defP("multigym", () => { const K = new Kit(); K.rbox(4.2, 4.2, 0.12, 0.03, 0, 0, 0.06, 0); for (const [x, y] of [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]]) K.box(0.25, 0.25, 7.0, x * 0.5 - 0.9, y * 0.4 - 1.0, 3.5, 1);
  K.box(0.9, 0.5, 2.6, -0.9, -1.8, 1.5, 2); for (let i = 0; i < 12; i++) K.box(0.85, 0.45, 0.16, -0.9, -1.8, 0.3 + i * 0.17, 3); K.rbox(1.4, 1.2, 0.3, 0.08, 0.6, 0.6, 1.6, 4); K.rbox(1.2, 0.3, 2.0, 0.1, 0.6, -0.1, 2.9, 4); K.limb([1.4, 1.5, 3.8], [0.6, 1.3, 4.8], 0.05, 0.05, 1);
  return { g: K.build(), pal: [PL.graph, [0xb3282d, 0.4, 0.3, 0], PL.chrome, PL.blackP, PL.leather] }; });
defP("dbrack", () => { const K = new Kit(); for (const x of [-2.7, 2.7]) K.box(0.15, 1.6, 2.6, x, 0, 1.3, 0); for (const z of [1.2, 2.2]) { K.box(5.6, 1.0, 0.1, 0, 0, z, 0, 0, 0.2);
    for (let i = 0; i < 8; i++) { const x = -2.35 + i * 0.67, r = 0.14 + i * 0.012; K.cyl(r, r, 0.14, x - 0.2, 0, z + 0.2, 1, 12, 0, Math.PI / 2); K.cyl(r, r, 0.14, x + 0.2, 0, z + 0.2, 1, 12, 0, Math.PI / 2); K.cyl(0.04, 0.04, 0.32, x, 0, z + 0.2, 2, 8, 0, Math.PI / 2); } }
  return { g: K.build(), pal: [PL.graph, PL.rubber, PL.chrome] }; });
defP("wbenchg", () => { const K = new Kit(); K.rbox(1.0, 4.4, 0.3, 0.1, 0, 0, 1.4, 0); K.box(0.2, 3.6, 0.2, 0, 0, 1.05, 1); for (const y of [-1.8, 1.8]) K.box(1.4, 0.2, 0.9, 0, y, 0.45, 1);
  return { g: K.build(), pal: [PL.leather, PL.graph] }; });
defP("mirror", () => { const K = new Kit(); K.box(8, 0.05, 5, 0, 0, 3.8, 0); K.box(8.1, 0.03, 5.1, 0, -0.03, 3.8, 1); return { g: K.build(), pal: [[0xc9d3d8, 0.12, 0.85, 11], PL.alu] }; });
defP("pool", () => { const K = new Kit(); K.rbox(4.7, 8.5, 0.5, 0.08, 0, 0, 2.55, 0); K.box(4.0, 7.8, 0.06, 0, 0, 2.82, 1); for (const sd of [-1, 1]) { K.rbox(0.3, 8.4, 0.2, 0.06, sd * 2.2, 0, 2.9, 0); K.rbox(4.6, 0.3, 0.2, 0.06, 0, sd * 4.1, 2.9, 0); }
  for (const [x, y] of [[-1.9, -3.9], [1.9, -3.9], [-1.9, 3.9], [1.9, 3.9], [-2.0, 0], [2.0, 0]]) K.cyl(0.18, 0.18, 0.06, x, y, 2.86, 2, 12);
  for (const [x, y] of [[-1.8, -3.6], [1.8, -3.6], [-1.8, 3.6], [1.8, 3.6]]) K.box(0.5, 0.5, 2.3, x, y, 1.15, 3);
  const cols = [3, 4, 5, 6, 7, 8]; for (let i = 0; i < 10; i++) { const r = Math.floor((Math.sqrt(8 * i + 1) - 1) / 2), c = i - r * (r + 1) / 2; K.sph(0.1, (c - r / 2) * 0.21, 1.8 + r * 0.19, 2.95, 5 + (i % 5), 1, 1, 1, 10, 6); }
  K.sph(0.1, 0, -2.2, 2.95, 10, 1, 1, 1, 10, 6); K.limb([-1.2, -3.0, 2.95], [0.6, 1.2, 3.0], 0.03, 0.02, 0);
  return { g: K.build(), pal: [[0x5a3a22, 0.45, 0, 1], PL.felt, PL.blackP, [0x4a2e1a, 0.5, 0, 1], 0, [0xc6232a, 0.2, 0, 11], [0xf2c230, 0.2, 0, 11], [0x2f5d9c, 0.2, 0, 11], [0x1a1a1a, 0.2, 0, 11], [0x2e7d4a, 0.2, 0, 11], [0xf4f2ee, 0.2, 0, 11]] }; });
defP("pp", () => { const K = new Kit(); K.rbox(5.0, 9.0, 0.1, 0.02, 0, 0, 2.5, 0); K.box(0.02, 8.95, 0.02, 0, 0, 2.56, 1); K.box(4.95, 0.02, 0.02, 0, 0, 2.56, 1);
  K.box(5.4, 0.03, 0.5, 0, 0, 2.8, 2); for (const [x, y] of [[-2.1, -3.8], [2.1, -3.8], [-2.1, 3.8], [2.1, 3.8]]) K.box(0.15, 0.15, 2.4, x, y, 1.2, 3); K.sph(0.07, 1.0, -1.5, 3.2, 1, 1, 1, 1, 8, 6);
  return { g: K.build(), pal: [[0x1f4f8c, 0.35, 0, 0], PL.white, [0x222222, 0.9, 0, 2], PL.graph] }; });
defP("fooz", () => { const K = new Kit(); K.rbox(5.0, 2.6, 1.0, 0.04, 0, 0, 2.7, 0); K.box(4.6, 2.2, 0.04, 0, 0, 3.0, 1); for (const [x, y] of [[-2.2, -1.0], [2.2, -1.0], [-2.2, 1.0], [2.2, 1.0]]) K.box(0.3, 0.3, 2.2, x, y, 1.1, 0);
  for (let i = 0; i < 8; i++) { const x = -2.0 + i * 0.57; K.cyl(0.03, 0.03, 3.4, x, 0, 3.25, 2, 8, Math.PI / 2); K.cyl(0.08, 0.08, 0.35, x, 1.75, 3.25, 3, 10, Math.PI / 2); for (let p = 0; p < 3; p++) K.rbox(0.12, 0.18, 0.4, 0.05, x, -0.7 + p * 0.7, 3.2, i % 2 ? 4 : 5); }
  return { g: K.build(), pal: [[0x5a3a22, 0.5, 0, 1], PL.felt, PL.chrome, PL.blackP, PL.red, PL.blue] }; });
// -- reception / security / welfare -----------------------------------------------------------------------------------
defP("rdesk", (L = 9) => { const K = new Kit(); K.rbox(L, 1.9, 2.4, 0.08, 0, 0.2, 1.2, 0); K.rbox(L + 0.2, 1.1, 0.12, 0.05, 0, -0.35, 3.45, 1); K.rbox(L, 0.3, 1.05, 0.05, 0, -0.75, 2.9, 0); K.rbox(L - 0.3, 2.2, 0.1, 0.04, 0, 0.3, 2.45, 1);
  K.box(L - 0.6, 0.04, 0.14, 0, -0.93, 1.6, 2);
  return { g: K.build(), pal: [[0xf1efe9, 0.4, 0, 0], [0x6a4832, 0.45, 0, 1], [0x2f5d7c, 0.4, 0, 0]] }; });
defP("gdesk", () => { const K = new Kit(); K.rbox(3.2, 1.8, 0.1, 0.03, 0, 0, 2.45, 0); K.rbox(3.1, 0.1, 2.3, 0.03, 0, -0.85, 1.2, 1); for (const x of [-1.5, 1.5]) K.box(0.1, 1.7, 2.35, x, 0, 1.2, 1); K.rbox(0.9, 0.6, 0.35, 0.05, 0.9, -0.3, 2.68, 2);
  return { g: K.build(), pal: [PL.lam, PL.graph, PL.blackP] }; });
defP("bed", () => { const K = new Kit(); K.rbox(2.7, 6.3, 0.4, 0.15, 0, 0, 2.3, 0); K.rbox(2.2, 0.9, 0.35, 0.15, 0, 2.5, 2.65, 1); K.box(2.4, 5.8, 0.12, 0, 0, 2.02, 2);
  for (const [x, y] of [[-1.1, -2.8], [1.1, -2.8], [-1.1, 2.8], [1.1, 2.8]]) K.box(0.12, 0.12, 2.0, x, y, 1.0, 2); K.box(2.5, 0.3, 1.3, 0, -3.1, 1.1, 3);
  return { g: K.build(), pal: [[0x2f7f86, 0.6, 0, 6], PL.white, PL.chrome, PL.white] }; });
defP("mcab", () => { const K = new Kit(); K.rbox(2.5, 1.4, 6.0, 0.03, 0, 0, 3.0, 0); for (let s = 0; s < 4; s++) K.box(2.3, 1.2, 0.04, 0, 0, 3.4 + s * 0.65, 1); K.box(0.8, 0.03, 0.8, 0, 0.71, 5.0, 2); K.box(0.25, 0.03, 0.8, 0, 0.715, 5.0, 3);
  for (let i = 0; i < 12; i++) K.rbox(0.25, 0.25, 0.4, 0.05, -1.0 + (i % 6) * 0.38, 0, 3.65 + Math.floor(i / 6) * 0.65, 4 + (i % 3));
  const G = new Kit(); G.box(2.3, 0.03, 2.8, 0, 0.7, 4.4, 0);
  return { g: K.build(), pal: [PL.white, PL.white, PL.white, PL.red, [0xe8d8b0, 0.5, 0, 0], [0x9fc7e8, 0.5, 0, 0], [0xf4f2ee, 0.5, 0, 0]], extras: [{ g: G.build(), m: glassMatK() }] }; });
defP("crib", () => { const K = new Kit(); K.rbox(2.4, 4.3, 0.3, 0.06, 0, 0, 1.3, 1); for (const sd of [-1, 1]) { K.box(2.4, 0.12, 0.12, 0, sd * 2.15, 3.2, 0); K.box(0.12, 4.3, 0.12, sd * 1.2, 0, 3.2, 0);
    for (let i = 0; i < 12; i++) K.box(0.06, 0.06, 1.9, sd * 1.2, -1.95 + i * 0.36, 2.25, 0); for (let i = 0; i < 6; i++) K.box(0.06, 0.06, 1.9, -1.0 + i * 0.4, sd * 2.15, 2.25, 0); }
  for (const [x, y] of [[-1.2, -2.15], [1.2, -2.15], [-1.2, 2.15], [1.2, 2.15]]) K.box(0.14, 0.14, 3.3, x, y, 1.65, 0);
  return { g: K.build(), pal: [[0xf3efe6, 0.5, 0, 1], [0xbfe3f0, 0.9, 0, 2]] }; });
defP("toys", () => { const K = new Kit(); K.rbox(4.0, 1.3, 2.6, 0.05, 0, 0, 1.3, 0); for (let i = 0; i < 6; i++) K.rbox(1.15, 1.1, 1.0, 0.05, -1.3 + (i % 3) * 1.3, 0.12, 0.62 + Math.floor(i / 3) * 1.2, 1 + (i % 4));
  for (let i = 0; i < 5; i++) K.box(0.35, 0.35, 0.35, -1.5 + i * 0.7, 0, 2.8, 1 + ((i + 1) % 4));
  return { g: K.build(), pal: [PL.white, PL.red, PL.yellow, PL.blue, PL.green] }; });
defP("ltbl", () => { const K = new Kit(); K.cyl(1.4, 1.4, 0.1, 0, 0, 1.7, 0, 32); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.78; K.box(0.12, 0.12, 1.65, Math.cos(a) * 1.0, Math.sin(a) * 1.0, 0.83, 1); }
  return { g: K.build(), pal: [[0xf0c96a, 0.5, 0, 0], PL.white] }; });
defP("kchair", () => { const K = new Kit(); K.rbox(0.95, 0.95, 0.1, 0.04, 0, 0, 0.95, 0); K.rbox(0.95, 0.1, 0.7, 0.04, 0, -0.45, 1.4, 0); for (const [x, y] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) K.cyl(0.04, 0.04, 0.9, x, y, 0.45, 1, 8);
  return { g: K.build(), pal: [[0xe07a4a, 0.5, 0, 4, 0], PL.white], nt: 1 }; });

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


// ================================================================ WALKTHROUGH
const WD = window.WALK_DATA;
const FLOORS = ["GF", "FF", "SF"];
const FLOOR_NAME = { GF: "Ground floor", FF: "First floor", SF: "Second floor" };
const FLOOR_SHORT = { GF: "G", FF: "1", SF: "2" };
const EYE = 5.25, RADIUS = 0.6, WALK_SPEED = 4.8, RUN_SPEED = 10, FLY_SPEED = 14;
const KIND_COL = { work: "#cfdcea", meet: "#e5d6ee", wet: "#cfe8e6", service: "#e3ddd2", welfare: "#f0e0c8",
  circ: "#ecebe6", public: "#f3d9c9", outdoor: "#d6e4c8" };
const grid = {};
FLOORS.forEach(k => {
  const rle = WD.floors[k].rle, a = new Uint16Array(WD.W * WD.H);
  let p = 0; for (let i = 0; i < rle.length; i += 2) { a.fill(rle[i], p, p + rle[i + 1]); p += rle[i + 1]; }
  grid[k] = a;
});
function cell(k, x, y) {
  const c = Math.floor(x / WD.C), r = Math.floor(y / WD.C);
  if (c < 0 || r < 0 || c >= WD.W || r >= WD.H) return 0;
  return grid[k][r * WD.W + c];
}
const isWalk = (k, x, y) => (cell(k, x, y) & 512) !== 0;
const roomAt = (k, x, y) => cell(k, x, y) & 255;
function fflAt(k, x, y) {
  // v3: every floor level from the LEV tags on A-111/112/113 (walkdata.levels, first match wins)
  const Z = WD.levels[k], c = WD.court;
  if (k === "GF") {
    if (x > c[0] && x < c[1] && y > c[2] && y < c[3]) return 0.5;
    if (!(cell(k, x, y) & 256)) return 0.0;
  }
  for (let i = 0; i < Z.length; i++) { const z = Z[i]; if (x >= z[0] && x < z[1] && y >= z[2] && y < z[3]) return z[4]; }
  return 0.0;
}
function canStand(k, x, y) {
  const r = RADIUS, d = r * 0.7071;
  return isWalk(k, x, y) && isWalk(k, x + r, y) && isWalk(k, x - r, y) && isWalk(k, x, y + r) && isWalk(k, x, y - r)
    && isWalk(k, x + d, y + d) && isWalk(k, x - d, y + d) && isWalk(k, x + d, y - d) && isWalk(k, x - d, y - d);
}

const W8 = { on: false, floor: "GF", x: 91.04, y: 1.04, z: 0, yaw: 0, pitch: 0, room: -1, keys: {}, joy: { x: 0, y: 0 },
  bob: 0, tour: -1, tourAuto: false, tourTimer: 0, busy: false, prev: null, fly: false, vz: 0, jump: 0, lock: false };
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
      const v = grid[k][r * WD.W + c]; if (!(v & 256) || !(v & 512)) continue;
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
      const s = makeSign(rm.n, rm.d); s.userData.rid = WD.floors[k].rooms.indexOf(rm) + 1;
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
    if ((v & 1024) && (v & 256)) col = [58, 64, 72];
    else if (v & 512) col = (v & 255) ? cols[(v & 255) - 1] : [236, 235, 230];
    else if ((v & 255) && (v & 256)) { const b = cols[(v & 255) - 1]; col = [b[0] * 0.62, b[1] * 0.62, b[2] * 0.62]; }
    else if (v & 256) col = [58, 64, 72];
    else col = k === "GF" ? [58, 64, 72] : [0, 0, 0];
    img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2];
    img.data[o + 3] = (!(v & 512) && !(v & 256) && k !== "GF") ? 0 : 255;
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
  const dpr = devicePixelRatio;
  if (NAV.path && NAV.pathFloor === W8.floor) {
    const sos = typeof WAY !== "undefined" && WAY.sos, line = () => { g.beginPath(); NAV.path.forEach(([x, y], i) => { const a = x / WD.C * s, b = (WD.H - y / WD.C) * s; i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.stroke(); };
    g.lineJoin = g.lineCap = "round";
    g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 5 * dpr; line();
    g.strokeStyle = sos ? "#e53935" : "#ff6a2b"; g.lineWidth = 2.8 * dpr; line();
    // destination flag at the end of the line on this floor
    const e = NAV.path[NAV.path.length - 1], ex = e[0] / WD.C * s, ey = (WD.H - e[1] / WD.C) * s;
    g.fillStyle = sos ? "#e53935" : "#ff6a2b"; g.strokeStyle = "#fff"; g.lineWidth = 1.5 * dpr; g.beginPath(); g.arc(ex, ey, 4.5 * dpr, 0, Math.PI * 2); g.fill(); g.stroke();
  }
  // you are here: blue dot with a heading cone
  g.save(); g.translate(px, py); g.rotate(W8.yaw);
  const cone = g.createRadialGradient(0, 0, 0, 0, 0, 36 * dpr); cone.addColorStop(0, "rgba(30,111,217,0.45)"); cone.addColorStop(1, "rgba(30,111,217,0)");
  g.fillStyle = cone; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 36 * dpr, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55); g.closePath(); g.fill();
  g.fillStyle = "rgba(30,111,217,0.18)"; g.beginPath(); g.arc(0, 0, 11 * dpr, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#1e6fd9"; g.strokeStyle = "#fff"; g.lineWidth = 2.2 * dpr; g.beginPath(); g.arc(0, 0, 5.5 * dpr, 0, Math.PI * 2); g.fill(); g.stroke();
  g.restore();
}

// ---------------------------------------------------------------- enter / exit
function enterWalk(at) {
  buildWalkScene();
  if (W8.on) return;
  W8.on = true;
  W8.prev = { pos: camera.position.clone(), tgt: controls.target.clone(), fov: camera.fov, mode, preset: light.preset, hour: light.hour, lamps: light.lampsManual, path: light.path };
  stopPlay(); if (light.path) { light.path = false; document.getElementById("sunpath").checked = false; }
  if (mode !== "material" && mode !== "arch") setMode("material");
  if (light.preset === "studio") { light.preset = "afternoon"; light.hour = presetHour("afternoon"); }
  light.lampsManual = true; applyLight();
  controls.enabled = false;
  camera.fov = 70; camera.near = 0.25; camera.updateProjectionMatrix();
  if (!ARCH.on) Object.entries(groups).forEach(([k, g]) => { g.visible = true; if (/_Slab$/.test(k)) g.traverse(o => { if (o.isMesh) o.material.color.set(0xe9e6df); }); });
  setLabels(false);
  document.body.classList.add("walking");
  FLOORS.forEach(k => floorGroups[k].visible = true);
  const p = at || { f: "GF", x: 91.04, y: 1.33, yaw: 0, pitch: 0 };
  placeAt(p.f, p.x, p.y, p.yaw, p.pitch || 0);
  showHint(true);
  if (ARCH.on) archSetCut("auto");
  const wa = document.getElementById("walkArch"); if (wa) wa.classList.toggle("on", ARCH.on);
}
function exitWalk() {
  if (!W8.on) return;
  clearRoute(); closeMap();
  if (W8.fly) setFly(false);
  if (document.pointerLockElement) document.exitPointerLock();
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
  if (W8.fly) setFly(false);
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
  const air = W8.fly && W8.z > 38;
  const id = air ? "air" + Math.round(W8.z / 5) : roomAt(W8.floor, W8.x, W8.y);
  if (id === W8.room && !force) return;
  W8.room = id;
  if (air) {
    document.getElementById("roomName").textContent = "Flying above the site";
    document.getElementById("roomSub").textContent = `altitude about ${Math.round(W8.z / 5) * 5} ft  ·  E / Space up · Q / C down · F to land`;
    return;
  }
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
  const st = (W8.tour >= 0 || W8.fly) ? null : nearStair();
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
function floorFor(x, y, z) {
  // highest storey whose floor is at or below the eye position and that has a slab here
  for (let i = 2; i >= 1; i--) { const k = FLOORS[i]; if ((cell(k, x, y) & 256) && fflAt(k, x, y) <= z + 0.6) return k; }
  return "GF";
}
function setFly(on) {
  W8.fly = on; W8.vz = 0;
  if (!on) {
    const f = floorFor(W8.x, W8.y, W8.z);
    if (f !== W8.floor) switchFloorQuiet(f);
    if (!canStand(W8.floor, W8.x, W8.y)) nudgeFree();
  }
  const b = document.getElementById("walkFly"); if (b) { b.classList.toggle("on", on); b.textContent = on ? "✈ Flying" : "✈ Fly"; }
  document.body.classList.toggle("flying", on);
}
function switchFloorQuiet(f) {
  W8.floor = f; W8.room = -1;
  FLOORS.forEach(k => signGroups[k].visible = (k === f));
  const fi = FLOORS.indexOf(f); lampGroup.children.forEach(l => { l.visible = l.userData.fl === fi; });
  document.querySelectorAll("#floorTabs button").forEach(b => b.classList.toggle("on", b.dataset.f === f));
}
function nudgeFree() {
  for (let r = 0.5; r < 12; r += 0.5) for (let a = 0; a < 16; a++) {
    const x = W8.x + Math.cos(a * Math.PI / 8) * r, y = W8.y + Math.sin(a * Math.PI / 8) * r;
    if (canStand(W8.floor, x, y)) { W8.x = x; W8.y = y; return; }
  }
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
      if (W8.fly) {
        const f2 = FLY_SPEED / (K.ShiftLeft || K.ShiftRight ? WALK_SPEED : RUN_SPEED) * (1 + Math.max(0, W8.z - 30) / 35);
        W8.x = clamp(W8.x + dx * f2, -160, 310); W8.y = clamp(W8.y + dy * f2, -160, 290);
      } else if (!canStand(k, W8.x, W8.y)) { W8.x += dx; W8.y += dy; }   // stuck inside something: let the walker out
      else if (canStand(k, W8.x + dx, W8.y + dy)) { W8.x += dx; W8.y += dy; }
      else if (canStand(k, W8.x + dx, W8.y)) W8.x += dx;
      else if (canStand(k, W8.x, W8.y + dy)) W8.y += dy;
      W8.bob += dt * (K.ShiftLeft || K.ShiftRight ? 12 : 8) * Math.min(mag, 1);
      if (!hintHidden) showHint(false);
    }
  }
  if (W8.fly) {
    const K = W8.keys, up = (K.Space || K.KeyE || W8.upBtn ? 1 : 0) - (K.KeyC || K.KeyQ || K.ControlLeft || W8.dnBtn ? 1 : 0);
    W8.z = clamp(W8.z + up * FLY_SPEED * 0.7 * dt * (K.ShiftLeft || K.ShiftRight ? 2.2 : 1) * (1 + Math.max(0, W8.z - 30) / 50), -0.5, 240);
    const f = floorFor(W8.x, W8.y, W8.z + EYE); if (f !== W8.floor) switchFloorQuiet(f);
  } else {
    const tz = fflAt(W8.floor, W8.x, W8.y);
    W8.z += (tz - W8.z) * Math.min(1, dt * 9);
    if (W8.jump > 0 || W8.vz !== 0) { W8.vz -= 32 * dt; W8.jump = Math.max(0, W8.jump + W8.vz * dt); if (W8.jump === 0) W8.vz = 0; }
  }
  const bob = W8.fly ? 0 : Math.sin(W8.bob) * 0.06 + W8.jump;
  camera.position.set(W8.x, W8.y, W8.z + EYE + bob);
  const cp = Math.cos(W8.pitch);
  camera.lookAt(W8.x + Math.sin(W8.yaw) * cp, W8.y + Math.cos(W8.yaw) * cp, W8.z + EYE + bob + Math.sin(W8.pitch));
  updateRoom(false); updateStairPrompt(); drawMinimap();
  const sg = signGroups[W8.floor];
  if (sg) sg.children.forEach((sp, i) => {
    const d = Math.hypot(sp.position.x - W8.x, sp.position.y - W8.y);
    sp.visible = d > 9 && sp.userData.rid !== W8.room;
  });
  if (W8.tour >= 0 && W8.tourAuto) { W8.tourTimer += dt; if (W8.tourTimer > 9) { W8.tourTimer = 0; tourGo(W8.tour + 1); } }
}

// ---------------------------------------------------------------- guided tour
function tourGo(i) {
  const T = WD.tour; if (i >= T.length) { endTour(); return; } if (i < 0) i = 0;
  W8.tour = i; W8.tourTimer = 0; const s = T[i];
  document.getElementById("tourStep").textContent = `${i + 1} / ${T.length}`;
  document.getElementById("tourTitle").textContent = s.t;
  document.getElementById("tourText").textContent = s.c;
  document.getElementById("tourCard").classList.add("show"); document.body.classList.add("tour");
  fadeTo(() => placeAt(s.f, s.x, s.y, s.yaw, s.pitch));
}
function startTour() { if (!W8.on) enterWalk(); W8.tourAuto = false; syncAuto(); tourGo(0); }
function endTour() { W8.tour = -1; W8.tourAuto = false; syncAuto(); const c = document.getElementById("tourCard"); if (c) c.classList.remove("show"); document.body.classList.remove("tour"); }
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
    if (e.code === "Escape" && !W8.lock) exitWalk();
    if (e.code === "KeyF") setFly(!W8.fly);
    if (e.code === "Space" || e.code === "KeyC" || e.code === "ControlLeft" || e.code === "KeyE" || e.code === "KeyQ") {
      W8.keys[e.code] = true; e.preventDefault();
      if (e.code === "Space" && !W8.fly && W8.jump === 0) { W8.vz = 9; W8.jump = 0.001; }
    }
    if (e.code === "PageUp" || e.code === "PageDown") {
      const st = nearStair(); if (st) { const i = st.f.indexOf(W8.floor) + (e.code === "PageUp" ? 1 : -1); if (st.f[i]) goFloor(st.f[i], st); }
    }
  });
  addEventListener("keyup", (e) => { W8.keys[e.code] = false; });
  addEventListener("blur", () => { W8.keys = {}; });
  const cv = renderer.domElement;
  let look = null;
  document.addEventListener("pointerlockchange", () => {
    W8.lock = document.pointerLockElement === cv;
    document.body.classList.toggle("locked", W8.lock);
  });
  document.addEventListener("mousemove", (e) => {
    if (!W8.on || !W8.lock) return;
    W8.yaw += e.movementX * 0.0026; W8.pitch = clamp(W8.pitch - e.movementY * 0.0026, -1.35, 1.35);
  });
  cv.addEventListener("dblclick", () => { if (W8.on && cv.requestPointerLock) { try { const p = cv.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (_) {} } });
  cv.addEventListener("pointerdown", (e) => {
    if (!W8.on || W8.lock) return;
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
  document.getElementById("walkFly").onclick = () => setFly(!W8.fly);
  const hold = (id, key) => { const b = document.getElementById(id);
    b.addEventListener("pointerdown", (e) => { W8[key] = true; b.setPointerCapture(e.pointerId); });
    ["pointerup", "pointercancel"].forEach(ev => b.addEventListener(ev, () => { W8[key] = false; })); };
  hold("flyUp", "upBtn"); hold("flyDn", "dnBtn");
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

// @@ARCH_BEGIN
// ================================================================ ARCHITECT VIEW (construction / drawing mode)
// The model drawn the way the drawings are: each floor carries its registered dimension plan (A-111 / A-112 /
// A-113), walls are coloured by the A-111 legend (existing = cyan hatch, proposed extension = grey hatch),
// columns by the legend (existing grey, proposed blue), a plan cut 4 ft above each floor shows the cut walls as
// hatched poché, every edge is outlined in black, room tags carry the stated size and level, hovering reads
// out coordinates and the room, and a tape measure reads feet and inches. Works in orbit, walk and fly.
const ARCH = { on: false, built: false, cut: "GF", labels: true, under: true, furn: true, people: false, measure: false,
  plane: new THREE.Plane(new THREE.Vector3(0, 0, -1), 1e5), group: null, tags: [], saved: null, eff: "GF",
  mats: {}, under3: {}, cols3: {}, pick: [], m: { pts: [], objs: [] }, frameN: 0 };
const ARCH_DATA = window.ARCH_DATA || { cls: {}, cols: {}, frame: { x0: 0, x1: 151.08, y0: -0.47, y1: 132.5 } };
const ARCH_UNDER = window.ARCH_UNDER || {};
const CUT_Z = { GF: 6.0, FF: 20.4, SF: 29.75 };
const FLOOR_IDX = { GF: 0, FF: 1, SF: 2, all: 3 };
const SHEET = { GF: "A-111", FF: "A-112", SF: "A-113" };

function fmtFt(v, sign) {
  const s = v < 0 ? "-" : (sign ? "+" : ""); v = Math.abs(v);
  let ft = Math.floor(v + 1e-9), inch = Math.round((v - ft) * 12);
  if (inch === 12) { ft += 1; inch = 0; }
  return `${s}${ft}'-${inch}"`;
}

// ---------------------------------------------------------------- materials
function archPatternGLSL() {
  return `
float hatchLine(vec2 p, float spacing, float w) { float d = abs(fract(p.x / spacing) - 0.5) * spacing; return 1.0 - smoothstep(w * 0.5, w * 0.5 + 0.02, d); }
vec3 archPoche(float cls, vec2 xy) {
  vec2 a = vec2(xy.x + xy.y, xy.x - xy.y) * 0.70710678;
  float h = max(hatchLine(a, 0.42, 0.06), hatchLine(a.yx, 0.42, 0.06));
  if (cls < 0.5) return mix(vec3(0.80, 0.79, 0.76), vec3(0.34, 0.33, 0.31), h);        // envelope / other
  if (cls < 1.5) return mix(vec3(0.93, 0.98, 1.0), vec3(0.12, 0.66, 0.86), h);          // existing wall (cyan hatch)
  return mix(vec3(0.97, 0.97, 0.96), vec3(0.42, 0.42, 0.42), h);                        // proposed extension (grey hatch)
}`;
}
function archWallMat() {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float acls; varying float vCls; varying vec3 vAW;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvCls = acls; vAW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vCls; varying vec3 vAW;" + archPatternGLSL())
      .replace("#include <color_fragment>", `#include <color_fragment>
vec3 face = vCls < 0.5 ? vec3(0.95, 0.94, 0.91) : (vCls < 1.5 ? vec3(0.86, 0.95, 0.98) : vec3(0.91, 0.90, 0.88));
diffuseColor.rgb = gl_FrontFacing ? face : archPoche(vCls, vAW.xy) * 0.25;`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
if (!gl_FrontFacing) totalEmissiveRadiance += archPoche(vCls, vAW.xy) * 0.78;`);
  };
  m.customProgramCacheKey = () => "archWall";
  return m;
}
function archPlainMat(hex, poche = 0x4a4a48) {
  const m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
  const pc = new THREE.Color(poche);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uPoche = { value: pc };
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uPoche;")
      .replace("#include <color_fragment>", "#include <color_fragment>\nif (!gl_FrontFacing) diffuseColor.rgb *= 0.2;")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\nif (!gl_FrontFacing) totalEmissiveRadiance += uPoche;");
  };
  m.customProgramCacheKey = () => "archPlain" + hex + "_" + poche;
  return m;
}

// ---------------------------------------------------------------- build (once)
ARCH.srcTex = {}; ARCH.texUsers = {};
function archBuild() {
  if (ARCH.built) return; ARCH.built = true;
  const G = ARCH.group = new THREE.Group(); G.name = "Architect"; G.visible = false; scene.add(G);
  ARCH.mats.wall = archWallMat();
  ARCH.mats.slab = archPlainMat(0xf7f6f2, 0x6a6966);
  ARCH.mats.stair = archPlainMat(0xfbfaf7, 0x5a5957);
  ARCH.mats.roof = archPlainMat(0xefeeea, 0x5a5957);
  ARCH.mats.col = archPlainMat(0x9a9a9a, 0x3c3c3c);
  ARCH.mats.glass = new THREE.MeshStandardMaterial({ color: 0xa9d6ea, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
  // wall class per vertex, aligned with CLEAN_GEOM box order (36 vertices per box)
  Object.entries(ARCH_DATA.cls || {}).forEach(([nm, cls]) => {
    const g = groups[nm]; if (!g) return;
    g.traverse(o => {
      if (!o.isMesh || o.userData.fixed || o.userData.furniture) return;
      const n = o.geometry.attributes.position.count, a = new Float32Array(n);
      for (let i = 0; i < cls.length && i * 36 < n; i++) a.fill(cls[i], i * 36, i * 36 + 36);
      o.geometry.setAttribute("acls", new THREE.BufferAttribute(a, 1));
    });
  });
  // plan underlays: one textured plane per floor level, masked to that level's floor area
  const F = ARCH_DATA.frame, FW = F.x1 - F.x0, FH = F.y1 - F.y0, PW = WD.W * WD.C, PH = WD.H * WD.C;
  const loader = new THREE.TextureLoader(), maxAniso = renderer.capabilities.getMaxAnisotropy();
  FLOORS.forEach(k => {
    const grp = new THREE.Group(); grp.name = "ArchUnder_" + k; G.add(grp); ARCH.under3[k] = grp;
    if (!ARCH_UNDER[k]) return;
    // v4: the drawing texture is shared by the masked floor planes and the ground sheet, and scaled down on phones
    // (High: full 2600 px, Medium 2048, Low 1536) so it does not fill the GPU memory
    const maxPx = QUAL.level === "high" ? 4096 : QUAL.level === "medium" ? 2048 : 1536;
    const src = ARCH.srcTex[k] || (ARCH.srcTex[k] = (() => { const t = new THREE.Texture(); const im = new Image();
      im.onload = () => { let img = im; const m = Math.max(im.width, im.height);
        if (m > maxPx) { const c = document.createElement("canvas"), f = maxPx / m; c.width = Math.round(im.width * f); c.height = Math.round(im.height * f);
          c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); img = c; }
        t.image = img; t.needsUpdate = true; (ARCH.texUsers[k] || []).forEach(u => { u.image = img; u.needsUpdate = true; }); invalidate(800); };
      im.src = ARCH_UNDER[k]; return t; })());
    const mk = (fit) => { const t = src.clone(); if (!src.image) t.version = 0; (ARCH.texUsers[k] = ARCH.texUsers[k] || []).push(t); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      if (fit) { t.repeat.set(PW / FW, PH / FH); t.offset.set((0 - F.x0) / FW, (0 - F.y0) / FH); }
      return t; };
    const tex = mk(true);
    const levels = {};
    for (let r = 0; r < WD.H; r++) for (let c = 0; c < WD.W; c++) {
      const x = (c + 0.5) * WD.C, y = (r + 0.5) * WD.C, v = grid[k][r * WD.W + c];
      let z;
      if (k === "GF") { z = fflAt("GF", x, y); if (z < 0.3) continue; }
      else { if (!(v & 256)) continue; z = fflAt(k, x, y); }
      const key = z.toFixed(3); (levels[key] = levels[key] || []).push(r * WD.W + c);
    }
    Object.entries(levels).forEach(([z, cells]) => {
      const data = new Uint8Array(WD.W * WD.H * 4);
      cells.forEach(i => { data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = data[i * 4 + 3] = 255; });
      const mask = new THREE.DataTexture(data, WD.W, WD.H, THREE.RGBAFormat); mask.magFilter = mask.minFilter = THREE.NearestFilter; mask.needsUpdate = true;
      const mat = new THREE.MeshStandardMaterial({ map: tex, alphaMap: mask, alphaTest: 0.5, roughness: 1, metalness: 0,
        emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.42, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), mat);
      pl.position.set(PW / 2, PH / 2, +z + 0.03); pl.receiveShadow = true; pl.userData.archFloor = k; grp.add(pl); ARCH.pick.push(pl);
    });
    if (k === "GF") {           // the whole ground-floor sheet on the ground: compound, gate, lawns, ramps
      const t2 = mk(false);
      const gm = new THREE.MeshStandardMaterial({ map: t2, roughness: 1, emissive: 0xffffff, emissiveMap: t2, emissiveIntensity: 0.42 });
      const gp = new THREE.Mesh(new THREE.PlaneGeometry(FW, FH), gm); gp.position.set(F.x0 + FW / 2, F.y0 + FH / 2, 0.02);
      gp.receiveShadow = true; gp.userData.archFloor = "GF"; grp.add(gp); ARCH.pick.push(gp);
    }
  });
  // drafting-table ground with a 1 ft / 10 ft grid
  const gc = document.createElement("canvas"); gc.width = gc.height = 512; const g2 = gc.getContext("2d");
  g2.fillStyle = "#f4f3ef"; g2.fillRect(0, 0, 512, 512);
  for (let i = 0; i <= 10; i++) { g2.strokeStyle = i % 10 ? "rgba(90,110,130,0.13)" : "rgba(70,90,110,0.34)"; g2.lineWidth = i % 10 ? 1 : 2.5;
    const p = i * 51.2; g2.beginPath(); g2.moveTo(p, 0); g2.lineTo(p, 512); g2.stroke(); g2.beginPath(); g2.moveTo(0, p); g2.lineTo(512, p); g2.stroke(); }
  const gt = new THREE.CanvasTexture(gc); gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(3000 / 10, 3000 / 10); gt.colorSpace = THREE.SRGBColorSpace; gt.anisotropy = maxAniso;
  const ground3 = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshStandardMaterial({ map: gt, roughness: 1, emissive: 0xffffff, emissiveMap: gt, emissiveIntensity: 0.35 }));
  ground3.position.set(0, 0, -0.05); ground3.receiveShadow = true; G.add(ground3); ARCH.ground = ground3;
  // columns drawn on the plans (A-111 legend: existing grey, proposed blue)
  FLOORS.forEach((k, fi) => {
    const grp = new THREE.Group(); grp.name = "ArchCols_" + k; G.add(grp); ARCH.cols3[k] = grp;
    const top = { GF: FLOOR_Z.FF - 0.75, FF: FLOOR_Z.SF - 0.75, SF: FLOOR_Z.ROOF - 0.5 }[k];
    [0, 1].forEach(kind => {
      const list = (ARCH_DATA.cols[k] || []).filter(c => c[4] === kind); if (!list.length) return;
      const mat = kind ? archPlainMat(0x2f86e8, 0x0b5fd6) : archPlainMat(0x8c8c8c, 0x777777);
      const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, list.length);
      list.forEach(([x, y, w, h], i) => { const z0 = fflAt(k, x, y) - 0.02; im.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(x, y, (z0 + top) / 2), new THREE.Quaternion(), new THREE.Vector3(w + 0.04, h + 0.04, top - z0))); });
      im.instanceMatrix.needsUpdate = true; im.castShadow = im.receiveShadow = true; im.userData.archCol = kind; grp.add(im); ARCH.pick.push(im);
    });
  });
  // room tags (v3.3: every room on the drawings plus the drawing notes; compact form when space is short)
  const mc = document.createElement("canvas").getContext("2d");
  const tw = (t, font, ls) => { mc.font = font; return mc.measureText(t).width + (ls || 0) * t.length; };
  const short = (d) => (d || "").replace(/ · LEV[^·]*/, "").split(" · ")[0].replace(/ \(.*$/, "");
  FLOORS.forEach(k => {
    WD.floors[k].rooms.forEach((rm, i) => {
      if (/Compound/.test(rm.n)) return;
      const d = document.createElement("div"); d.className = "atag atag-" + rm.k;
      const lv = fflAt(k, rm.x, rm.y), nm = rm.n.replace(/ \((double height|open to sky)\)/, ""), dim = short(rm.d);
      d.innerHTML = `<b>${nm}</b>${dim ? `<i>${dim}</i>` : ""}<u>FFL ${fmtFt(lv, true)}</u>`;
      const o = new CSS2DObject(d); o.position.set(rm.x, rm.y, lv + 0.4);
      const wn = tw(nm.toUpperCase(), "600 10.5px Helvetica, Arial, sans-serif", 0.32);
      o.userData = { floor: k, area: rm.a || 0, rid: i + 1, kind: rm.k, z: lv + 0.4, pri: rm.k === "circ" ? 2 : rm.k === "outdoor" ? 1 : 0,
        pts: [[rm.x, rm.y]].concat(rm.p ? [[rm.p[0], rm.p[1]]] : []),
        wf: Math.max(wn, dim ? tw(dim, "500 10px Helvetica, Arial, sans-serif") : 0, tw("FFL +00'-00\"", "500 9.5px Helvetica, Arial, sans-serif")) + 14,
        hf: dim ? 43 : 31, wc: wn + 14 };
      o.visible = false; G.add(o); ARCH.tags.push(o);
    });
    (WD.floors[k].notes || []).forEach(nt => {
      const d = document.createElement("div"); d.className = "atag atag-note atag-n-" + nt.t;
      const lv = fflAt(k, nt.x, nt.y), dim = (nt.t === "landing" || nt.t === "room" || nt.t === "void") ? short(nt.d) : "";
      d.innerHTML = `<b>${nt.n}</b>${dim ? `<i>${dim}</i>` : ""}`;
      const o = new CSS2DObject(d); o.position.set(nt.x, nt.y, lv + 0.4);
      const wn = tw(nt.n, "600 9.5px Helvetica, Arial, sans-serif");
      o.userData = { floor: k, area: 0, rid: 0, kind: "note", note: true, z: lv + 0.4, pri: nt.t === "landing" || nt.t === "room" ? 0.5 : 3, pts: [[nt.x, nt.y]],
        wf: Math.max(wn, dim ? tw(dim, "500 9px Helvetica, Arial, sans-serif") : 0) + 12, hf: dim ? 28 : 17, wc: wn + 12 };
      o.visible = false; G.add(o); ARCH.tags.push(o);
    });
  });
  ARCH.tags.sort((a, b) => a.userData.pri - b.userData.pri || b.userData.area - a.userData.area);
  // measuring
  ARCH.m.group = new THREE.Group(); ARCH.m.group.renderOrder = 1000; G.add(ARCH.m.group);
  archBuildPost();
  archBuildUI();
  // everything the pointer can land on
  Object.entries(groups).forEach(([k, g]) => { if (/Walls|Slab|Stairs|Columns|Guard_Post|Site_Boundary/.test(k)) g.traverse(o => { if (o.isMesh) ARCH.pick.push(o); }); });
}
const FLOOR_Z = { GF: 1.0, FF: 12 + 5 / 12, SF: 23 + 10 / 12, ROOF: 35.25 };

// ---------------------------------------------------------------- black linework (normal + depth edge pass)
function archBuildPost() {
  const nm = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
  nm.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace(/}\s*$/, "  gl_FragColor.a = gl_FrontFacing ? 1.0 : 0.5;\n}"); };
  nm.customProgramCacheKey = () => "archNormal";
  ARCH.nMat = nm;
  ARCH.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { tC: { value: null }, tN: { value: null }, tD: { value: null }, res: { value: new THREE.Vector2(1, 1) }, cn: { value: 1 }, cf: { value: 6000 }, px: { value: 1 }, ink: { value: 0.88 }, dbg: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: `#include <common>
#include <packing>
uniform sampler2D tC, tN, tD; uniform vec2 res; uniform float cn, cf, px, ink; uniform int dbg; varying vec2 vUv;
float ld(vec2 uv) { return -perspectiveDepthToViewZ(texture2D(tD, uv).x, cn, cf); }
void main() {
  vec4 c = texture2D(tC, vUv);
  vec2 o = px / res;
  vec4 n0 = texture2D(tN, vUv); float d0 = ld(vUv);
  vec2 D[4]; D[0] = vec2(o.x, 0.0); D[1] = vec2(-o.x, 0.0); D[2] = vec2(0.0, o.y); D[3] = vec2(0.0, -o.y);
  float e = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 n = texture2D(tN, vUv + D[i]);
    e = max(e, step(0.2, abs(n.a - n0.a)));
    if (n0.a > 0.1 && n.a > 0.1) e = max(e, smoothstep(0.22, 0.42, length(n.rgb - n0.rgb)));
  }
  if (n0.a > 0.1) {
    // raw depth is linear across a plane in screen space, so its Laplacian is ~0 on flat surfaces at any angle;
    // dividing by (1 - depth) turns a jump into a relative distance jump
    float r0 = texture2D(tD, vUv).x;
    float rl = texture2D(tD, vUv + D[1]).x, rr = texture2D(tD, vUv + D[0]).x, ru = texture2D(tD, vUv + D[2]).x, rd = texture2D(tD, vUv + D[3]).x;
    float lap = max(abs(rl + rr - 2.0 * r0), abs(ru + rd - 2.0 * r0)) / max(1.0 - r0, 1e-7);
    e = max(e, smoothstep(0.03, 0.08, lap));
  }
  gl_FragColor = vec4(mix(c.rgb, vec3(0.05, 0.06, 0.07), e * ink), 1.0);
  if (dbg == 1) gl_FragColor = vec4(c.rgb, 1.0);
  if (dbg == 2) gl_FragColor = vec4(n0.rgb * n0.a, 1.0);
  if (dbg == 3) gl_FragColor = vec4(vec3(1.0 - e), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`, depthTest: false, depthWrite: false }));
  ARCH.quad.frustumCulled = false;
  ARCH.qScene = new THREE.Scene(); ARCH.qScene.add(ARCH.quad);
  ARCH.qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
}
function archTargets() {
  const s = renderer.getDrawingBufferSize(new THREE.Vector2()), w = s.x, h = s.y;
  if (ARCH.rtC && ARCH.rtC.width === w && ARCH.rtC.height === h) return;
  if (ARCH.rtC) { ARCH.rtC.dispose(); ARCH.rtN.dispose(); }
  ARCH.rtC = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
  const dt = new THREE.DepthTexture(w, h); dt.type = THREE.UnsignedIntType;
  ARCH.rtN = new THREE.WebGLRenderTarget(w, h, { depthTexture: dt, depthBuffer: true });
  const u = ARCH.quad.material.uniforms; u.tC.value = ARCH.rtC.texture; u.tN.value = ARCH.rtN.texture; u.tD.value = dt; u.res.value.set(w, h);
  u.px.value = Math.max(1, renderer.getPixelRatio() * 0.8);
}
function archRender() {
  archTargets();
  const u = ARCH.quad.material.uniforms; u.cn.value = camera.near; u.cf.value = camera.far;
  renderer.setRenderTarget(ARCH.rtC); renderer.render(scene, camera);
  // normal pass: glass, tags and the tape measure stay out of it
  const bg = scene.background, hidden = [];
  scene.background = null; scene.overrideMaterial = ARCH.nMat;
  // (underlay sheets are cut out by an alpha mask that the override material cannot see: leave them to the slab below)
  scene.traverse(o => { if (o.visible && ((o.isMesh && o.material && (o.material.transparent || o.material.alphaTest > 0 || o.material.alphaMap)) || o.isLine || o.isSprite || o.isPoints)) { o.visible = false; hidden.push(o); } });
  const au = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false;
  const cc = renderer.getClearColor(new THREE.Color()), ca = renderer.getClearAlpha();
  renderer.setRenderTarget(ARCH.rtN); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, camera);
  renderer.setClearColor(cc, ca); renderer.shadowMap.autoUpdate = au;
  hidden.forEach(o => o.visible = true); scene.overrideMaterial = null; scene.background = bg;
  renderer.setRenderTarget(null); renderer.render(ARCH.qScene, ARCH.qCam);
}

// ---------------------------------------------------------------- switching on / off
function archLighting() {
  sky.visible = false; scene.fog = null; scene.background = new THREE.Color(0xf4f3ef);
  hemi.color.set(0xffffff); hemi.groundColor.set(0xdcd8d0); hemi.intensity = 1.35;
  sun.color.set(0xffffff); sun.intensity = 1.25; sun.position.set(CX - 140, CY + 110, 300);
  sun.castShadow = light.shadows !== false && QUAL.shadows;
  fill.color.set(0xffffff); fill.intensity = 0.3; fill.position.set(CX + 200, CY - 180, 160);
  lampGroup.visible = false; sunMarker.visible = false; pathGroup.visible = false;
  renderer.toneMapping = THREE.NoToneMapping; renderer.toneMappingExposure = 1.0;
  setEnv(0.35);
}
function archOn() {
  archBuild();
  const first = !ARCH.on;
  ARCH.on = true;
  if (first) {
    ARCH.saved = { mats: new Map(), vis: new Map(), root: [] };
    Object.entries(groups).forEach(([k, g]) => {
      ARCH.saved.vis.set(g, g.visible);
      if (/_Furniture$/.test(k)) return;
      let mat = null;
      if (/_Walls$|Guard_Post|Site_Boundary/.test(k)) mat = ARCH.mats.wall;
      else if (/^Roof/.test(k)) mat = ARCH.mats.roof;
      else if (/_Slab$/.test(k)) mat = ARCH.mats.slab;
      else if (/Glazing/.test(k)) mat = ARCH.mats.glass;
      else if (/_Stairs$/.test(k)) mat = ARCH.mats.stair;
      else if (/Columns/.test(k)) mat = ARCH.mats.col;
      g.traverse(o => { if (o.isMesh && !o.userData.fixed && !o.userData.furniture && mat) { ARCH.saved.mats.set(o, o.material); o.material = mat; } });
    });
    root.children.forEach(o => { if (!Object.values(groups).includes(o) && o.isMesh) { ARCH.saved.root.push([o, o.visible]); o.visible = false; } });
  }
  ["Ground_Apron", "Courtyard_Paving"].forEach(k => { if (groups[k]) groups[k].visible = false; });
  ground.visible = false; if (entrancePin) entrancePin.visible = false;
  ARCH.group.visible = true;
  KIT.white.value = 1;
  renderer.clippingPlanes = [ARCH.plane];
  archLighting();
  document.body.classList.add("arch");
  if (first && !W8.on) setView("archAxo");
  archSetCut(W8.on ? "auto" : ARCH.cut === "auto" ? "GF" : ARCH.cut);
  setLabels(false);
}
function archOff() {
  if (!ARCH.on) return;
  ARCH.on = false; ARCH.group.visible = false;
  ARCH.tags.forEach(o => o.visible = false);
  ARCH.saved.mats.forEach((m, o) => o.material = m);
  ARCH.saved.vis.forEach((v, g) => g.visible = v);
  ARCH.saved.root.forEach(([o, v]) => o.visible = v);
  Object.keys(groups).forEach(k => { if (/_Furniture$/.test(k)) groups[k].traverse(o => { if (o.isInstancedMesh) o.visible = true; }); });
  ground.visible = true; KIT.white.value = 0;
  renderer.clippingPlanes = []; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  document.body.classList.remove("arch");
  archMeasure(false); archClearMeasure();
  document.getElementById("archInfo").hidden = true;
  const vn = document.getElementById("viewName"); if (vn && /^Architect/.test(vn.textContent)) vn.textContent = "Three-quarter aerial";
  if (W8.on) FLOORS.forEach(k => { floorGroups[k].visible = true; signGroups[k].visible = (k === W8.floor); });
  applyLight();
}
function archEyeZ() { return W8.on ? W8.z + EYE : camera.position.z; }
function archFloorOfCamera() {
  const z = archEyeZ();
  if (z > FLOOR_Z.ROOF + 4) return "SF";
  return W8.on ? W8.floor : (z > FLOOR_Z.SF ? "SF" : z > FLOOR_Z.FF ? "FF" : "GF");
}
// walking (or flying low) with the cut on Auto: take the ceiling off just under the slab above instead of cutting at 6 ft,
// so the rooms read as rooms at eye level; above the roof the plan cut comes back
const CEIL_Z = { GF: 12 + 5 / 12 - 0.9, FF: 23 + 10 / 12 - 0.9, SF: 35.25 - 1.0 };
function archCeil() { return ARCH.cut === "auto" && W8.on && archEyeZ() < FLOOR_Z.ROOF + 4; }
function archKey() { return (ARCH.cut === "auto" ? archFloorOfCamera() : ARCH.cut) + (archCeil() ? "c" : ""); }
function archSetCut(c) {
  ARCH.cut = c;
  const f = c === "auto" ? archFloorOfCamera() : c;
  ARCH.eff = f;
  const fi = FLOOR_IDX[f];
  const ceil = archCeil(); ARCH.key = f + (ceil ? "c" : "");
  const cz = ceil ? CEIL_Z[f] : CUT_Z[f];
  ARCH.plane.constant = f === "all" ? 1e5 : cz;
  Object.entries(groups).forEach(([k, g]) => {
    const fl = /^GF_/.test(k) ? 0 : /^FF_/.test(k) ? 1 : /^SF_/.test(k) ? 2 : /^Roof/.test(k) ? 3 : -1;
    if (/^(Ground_Apron|Courtyard_Paving)$/.test(k)) { g.visible = false; return; }
    if (fl < 0) { g.visible = true; return; }
    g.visible = fl <= fi && (!/_Furniture$/.test(k) || ARCH.furn);
    if (/_Furniture$/.test(k)) g.traverse(o => { if (o.isInstancedMesh && o.name && o.name.startsWith("P:")) o.visible = ARCH.people; });
  });
  FLOORS.forEach((k, i) => { ARCH.under3[k].visible = ARCH.under && i <= fi; ARCH.cols3[k].visible = i <= fi; });
  document.querySelectorAll("#archCut button").forEach(b => b.classList.toggle("on", b.dataset.c === c));
  const note = document.getElementById("archCutNote");
  if (note) note.textContent = f === "all" ? "Whole building, no cut" : ceil ? `${FLOOR_NAME[f]} · ceiling off at ${fmtFt(cz, true)} · drawing ${SHEET[f]} on the floor`
    : `${FLOOR_NAME[f]} plan · cut at ${fmtFt(cz, true)} · drawing ${SHEET[f]}`;
  ARCH.frameN = 0;
}
function archFrame() {
  if (ARCH.cut === "auto" && archKey() !== ARCH.key) archSetCut("auto");
  if (W8.on) { FLOORS.forEach(k => { floorGroups[k].visible = false; signGroups[k].visible = false; }); lampGroup.visible = false; }
  if (entrancePin) entrancePin.visible = false;
  if ((ARCH.frameN++ % 8) === 0) archCullTags();
}
function archCullTags() {
  const f = ARCH.eff, show = ARCH.labels && f !== "all";
  const W = innerWidth, H = innerHeight, placed = [], v = new THREE.Vector3(), q = new THREE.Vector3();
  const hit = (r) => placed.some(p => !(r[0] > p[0] + p[2] || r[0] + r[2] < p[0] || r[1] > p[1] + p[3] || r[1] + r[3] < p[1]));
  ARCH.tags.forEach(o => {
    const u = o.userData; let ok = false;
    if (show && u.floor === f) {
      for (const compact of (u.note ? [false] : [false, true])) {
        for (const p of u.pts) {
          v.set(p[0], p[1], u.z).project(camera);
          if (v.z > 1 || v.z < -1 || Math.abs(v.x) > 1.02 || Math.abs(v.y) > 1.02) continue;
          if (W8.on && camera.position.distanceTo(q.set(p[0], p[1], u.z)) > 45) continue;
          const sx = (v.x + 1) / 2 * W, sy = (1 - v.y) / 2 * H, w = compact ? u.wc : u.wf, h = compact ? 18 : u.hf;
          const r = [sx - w / 2, sy - h / 2, w, h];
          if (!ARCH.allTags && hit(r)) continue;
          placed.push(r); o.position.set(p[0], p[1], u.z); o.element.classList.toggle("c", compact); ok = true; break;
        }
        if (ok) break;
      }
    }
    o.visible = ok;
  });
  const n = document.getElementById("archTagCount");
  if (n) { const tot = ARCH.tags.filter(o => o.userData.floor === f && !o.userData.note).length, vis = ARCH.tags.filter(o => o.visible && !o.userData.note).length;
    n.textContent = show ? `${vis} / ${tot} rooms tagged${vis < tot ? " · zoom in for the rest" : ""}` : ""; }
}

// ---------------------------------------------------------------- hover read-out and tape measure
const archRay = new THREE.Raycaster(), archNdc = new THREE.Vector2();
function archPick(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  archNdc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  archRay.setFromCamera(archNdc, camera);
  const vis = ARCH.pick.filter(o => { let p = o; while (p) { if (!p.visible) return false; p = p.parent; } return true; });
  const hits = archRay.intersectObjects(vis, false);
  const lim = ARCH.plane.constant + 0.01;
  // the floor sheets are whole rectangles cut out by an alpha mask: the ray must pass through the holes
  const solid = (h) => { const m = h.object.material, img = m && m.alphaMap && m.alphaMap.image; if (!img || !img.data || !h.uv) return true;
    const c = Math.min(img.width - 1, Math.floor(h.uv.x * img.width)), r = Math.min(img.height - 1, Math.floor(h.uv.y * img.height));
    return img.data[(r * img.width + c) * 4] > 127; };
  return hits.find(h => h.point.z <= lim && solid(h)) || null;
}
function archDescribe(p) {
  const f = ARCH.eff !== "all" ? ARCH.eff : floorFor(p.x, p.y, p.z + 0.2);
  const id = roomAt(f, p.x, p.y), rm = id ? WD.floors[f].rooms[id - 1] : null;
  const lv = fflAt(f, p.x, p.y);
  return { f, rm, lv, txt: `<b>${rm ? rm.n : (f === "GF" && lv === 0 ? "Compound (open ground)" : "Passage / wall")}</b>` +
    `<span>${FLOOR_NAME[f]}${rm && rm.d ? " · " + rm.d : ""} · FFL ${fmtFt(lv, true)}</span>` +
    `<span class="xy">X ${fmtFt(p.x)} · Y ${fmtFt(p.y)} · height ${fmtFt(p.z, true)}</span>` };
}
let archHoverT = 0;
function archPointerMove(ev) {
  if (!ARCH.on || (W8.on && !ARCH.measure) || document.pointerLockElement) return;
  const now = performance.now(); if (now - archHoverT < 70) return; archHoverT = now;
  const h = archPick(ev), box = document.getElementById("archInfo");
  if (!h) { box.hidden = true; return; }
  const d = archDescribe(h.point); box.hidden = false;
  box.innerHTML = d.txt + (ARCH.measure ? `<span class="hint">${ARCH.m.pts.length === 1 ? "Click the second point" : "Click the first point"} · hold Shift to keep it square</span>` : "");
}
let archDown = null;
function archPointerDown(ev) { archDown = [ev.clientX, ev.clientY]; }
function archPointerUp(ev) {
  if (!ARCH.on || !ARCH.measure || !archDown || document.pointerLockElement) return;
  if (Math.hypot(ev.clientX - archDown[0], ev.clientY - archDown[1]) > 5) return;      // it was an orbit drag
  const h = archPick(ev); if (!h) return;
  const p = h.point.clone(); p.x = Math.round(p.x * 24) / 24; p.y = Math.round(p.y * 24) / 24; p.z = Math.round(p.z * 24) / 24;
  // v4: a point on a floor snaps to the nearest wall face / corner (0.6 ft with a mouse, 1.2 ft with a finger)
  const nz = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld).z : 0;
  let snapped = false;
  if (nz > 0.7) { const f = ARCH.eff !== "all" ? ARCH.eff : floorFor(p.x, p.y, p.z + 0.2); snapped = snapToWall(p, f); }
  if (ev.pointerType === "touch") { const d = archDescribe(p), box = document.getElementById("archInfo"); box.hidden = false;
    box.innerHTML = d.txt + `<span class="hint">${ARCH.m.pts.length >= 1 && ARCH.m.pts.length < 2 ? "Tap the second point" : "Tap the first point"}${snapped ? " · snapped to the wall" : ""}</span>`; }
  if (ARCH.m.pts.length >= 2) archClearMeasure();
  if (ARCH.m.pts.length === 1 && ev.shiftKey) {
    const a = ARCH.m.pts[0], d = [Math.abs(p.x - a.x), Math.abs(p.y - a.y), Math.abs(p.z - a.z)], m = d.indexOf(Math.max(...d));
    if (m !== 0) p.x = a.x; if (m !== 1) p.y = a.y; if (m !== 2) p.z = a.z;
  }
  if (ARCH.m.pts.length === 0) ARCH.m.snapped = false;
  ARCH.m.snapped = ARCH.m.snapped || snapped;
  ARCH.m.pts.push(p);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), new THREE.MeshBasicMaterial({ color: 0xd95728, depthTest: false }));
  dot.position.copy(p); dot.renderOrder = 1001; ARCH.m.group.add(dot);
  if (ARCH.m.pts.length === 2) {
    const [a, b] = ARCH.m.pts;
    const len = a.distanceTo(b), mid = a.clone().add(b).multiplyScalar(0.5);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, Math.max(len, 0.01), 10), new THREE.MeshBasicMaterial({ color: 0xd95728, depthTest: false, transparent: true, opacity: 0.95 }));
    tube.position.copy(mid); tube.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    tube.renderOrder = 1000; ARCH.m.group.add(tube);
    const L = a.distanceTo(b), dx = Math.abs(b.x - a.x), dy = Math.abs(b.y - a.y), dz = Math.abs(b.z - a.z);
    const div = document.createElement("div"); div.className = "ameasure";
    div.innerHTML = `<b>${fmtFt(L)}</b>${ARCH.m.snapped ? `<span>snapped to wall</span>` : ""}<span>${[dx > 0.04 ? "E–W " + fmtFt(dx) : null, dy > 0.04 ? "N–S " + fmtFt(dy) : null, dz > 0.04 ? "up " + fmtFt(dz) : null].filter(Boolean).join(" · ")}</span>`;
    const o = new CSS2DObject(div); o.position.copy(a).add(b).multiplyScalar(0.5); ARCH.m.group.add(o); ARCH.m.label = o;
    const out = document.getElementById("archMeasureOut"); if (out) out.textContent = `Last: ${fmtFt(L)}`;
  }
}
function archClearMeasure() {
  if (!ARCH.m.group) return;
  [...ARCH.m.group.children].forEach(o => { ARCH.m.group.remove(o); if (o.element && o.element.remove) o.element.remove(); if (o.geometry) o.geometry.dispose(); });
  ARCH.m.pts = [];
}
function archMeasure(on) {
  ARCH.measure = on; document.body.classList.toggle("measuring", on);
  const b = document.getElementById("archMeasure"); if (b) b.classList.toggle("on", on);
  if (!on) archClearMeasure();
}

// ---------------------------------------------------------------- fly-through (drone camera, either style)
function startFlyThrough() {
  const wasArch = ARCH.on;
  // start south of the gate, above the road, looking at the front of the building
  if (!W8.on) enterWalk({ f: "GF", x: CX, y: -58, yaw: 0, pitch: -0.36 });
  else if (!W8.fly) { endTour(); clearRoute(); placeAt("GF", CX, -58, 0, -0.36); }
  setFly(true);
  W8.z = Math.max(W8.z, 48); W8.pitch = Math.min(W8.pitch, -0.3);
  if (wasArch || ARCH.on) archSetCut("auto");
  showFlyHint();
}
function showFlyHint() {
  const h = document.getElementById("walkHint"); if (!h) return;
  h.innerHTML = matchMedia("(pointer: coarse)").matches ? "<b>Flying</b> · <b>joystick</b> to move · <b>drag</b> to look · <b>▲ ▼</b> up and down · <b>✈ Flying</b> to land"
    : "<b>Flying</b> · <b>W A S D</b> move · <b>drag</b> to look · <b>E</b> / <b>Space</b> up · <b>Q</b> / <b>C</b> down · <b>Shift</b> fast · <b>F</b> land";
  h.classList.add("show"); setTimeout(() => h.classList.remove("show"), 6500);
}

// ---------------------------------------------------------------- UI
function archBuildUI() {
  const css = document.createElement("style");
  css.textContent = `
#archBar{position:fixed;left:calc(50% + 20px);bottom:calc(16px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:5;display:none;
  gap:10px;align-items:center;flex-wrap:wrap;justify-content:center;max-width:calc(100vw - 32px);background:var(--panel);border:1px solid var(--line);
  border-radius:12px;padding:8px 10px;backdrop-filter:blur(10px);font-size:12.5px;color:var(--ink)}
body.arch #archBar{display:flex} body.arch #timebar{display:none!important}
#archBar .grp{display:flex;gap:4px;align-items:center} #archBar .lab{color:var(--muted);margin-right:2px}
#archBar button{font:inherit;font-size:12.5px;padding:6px 9px;border-radius:7px;border:1px solid var(--line);background:transparent;color:var(--ink);cursor:pointer}
#archBar button.on{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
#archBar label{display:flex;gap:4px;align-items:center;cursor:pointer;white-space:nowrap}
#archCutNote{flex-basis:100%;text-align:center;color:var(--muted);font-size:11.5px;margin-top:-2px}
#archTagCount{flex-basis:100%;text-align:center;margin-top:-6px}
body.walking #archBar{left:auto;right:14px;bottom:auto;top:calc(76px + env(safe-area-inset-top,0px));transform:none;flex-direction:column;align-items:stretch;
  background:rgba(20,26,32,.74);color:#f2efe8;border-color:rgba(255,255,255,.16);max-width:230px}
body.walking #archBar button{color:#f2efe8;border-color:rgba(255,255,255,.22)} body.walking #archBar .lab,body.walking #archCutNote{color:#b9c6d2}
body.walking #archBar .grp{flex-wrap:wrap}
#archLegend{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:5;display:none;background:var(--panel);border:1px solid var(--line);
  border-radius:12px;padding:10px 12px;font-size:12px;color:var(--ink);backdrop-filter:blur(10px);max-width:250px}
body.arch:not(.walking) #archLegend{display:block} body.arch #readout{display:none!important}
#archLegend h4{margin:0 0 6px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
#archLegend .li{display:flex;gap:8px;align-items:center;margin:3px 0} #archLegend .sw{width:26px;height:12px;border:1px solid #333;flex:none}
#archLegend .src{margin-top:6px;color:var(--muted);font-size:11px;line-height:1.4}
#archInfo{position:fixed;right:16px;bottom:calc(262px + env(safe-area-inset-bottom,0px));z-index:6;background:rgba(20,26,32,.84);color:#f4f1ea;border-radius:10px;
  padding:8px 11px;font-size:12px;line-height:1.45;pointer-events:none;max-width:320px}
#archInfo b{display:block;font-size:13.5px} #archInfo span{display:block;color:#c9d4de} #archInfo .xy{font-variant-numeric:tabular-nums;color:#ffd7b8} #archInfo .hint{color:#9fb3c4}
.atag{font:600 10.5px ui-sans-serif,Helvetica,Arial,sans-serif;color:#111;background:rgba(255,255,255,.88);border:1px solid #222;padding:2px 5px 3px;
  text-align:center;line-height:1.25;white-space:nowrap;border-radius:2px;pointer-events:none;box-shadow:0 1px 2px rgba(0,0,0,.18)}
.atag b{display:block;text-transform:uppercase;letter-spacing:.03em;font-size:10.5px}
.atag i{display:block;font-style:normal;font-weight:500;font-size:10px;color:#333} .atag u{display:block;text-decoration:none;font-weight:500;font-size:9.5px;color:#c0392b}
.atag-circ{border-style:dashed} .atag-outdoor{background:rgba(233,245,225,.9)}
.atag.c i,.atag.c u{display:none} .atag.c{padding:1px 5px 2px}
.atag-note{background:rgba(255,255,255,.78);border:1px dotted #444;font-weight:600;box-shadow:none;padding:1px 4px}
.atag-note b{text-transform:none;letter-spacing:0;font-size:9.5px;font-style:italic} .atag-note i{font-size:9px}
.atag-n-passage{border-style:dashed} .atag-n-exit{border-color:#c0392b;color:#c0392b} .atag-n-exit b{color:#c0392b}
.atag-n-landing,.atag-n-room{border:1px solid #222;background:rgba(255,255,255,.88)} .atag-n-landing b,.atag-n-room b{font-style:normal;text-transform:uppercase;font-size:10px}
#archTagCount{color:var(--muted);font-size:11px}
.ameasure{z-index:2147483000!important;background:#d95728;color:#fff;border-radius:6px;padding:3px 7px;font:600 12px ui-sans-serif,system-ui,sans-serif;text-align:center;white-space:nowrap}
.ameasure span{display:block;font-weight:500;font-size:10.5px;opacity:.9}
body.measuring #stage canvas{cursor:crosshair}
@media (max-width:760px){#archLegend{display:none!important}#archInfo{bottom:auto;top:140px}}`;
  document.head.appendChild(css);
  const bar = document.createElement("div"); bar.id = "archBar";
  bar.innerHTML = `<div class="grp" id="archCut"><span class="lab">Plan cut</span>
      <button data-c="GF">Ground</button><button data-c="FF">First</button><button data-c="SF">Second</button><button data-c="all">Full</button><button data-c="auto" title="Cut at the floor you are on">Auto</button></div>
    <div class="grp"><label><input type="checkbox" id="archUnder" checked> Drawing</label><label><input type="checkbox" id="archTags" checked> Room tags</label><label><input type="checkbox" id="archAllTags"> All (overlap)</label>
      <label><input type="checkbox" id="archFurn" checked> Furniture</label><label><input type="checkbox" id="archPeople"> People</label></div>
    <div class="grp"><button id="archMeasure" title="Click two points to measure">📏 Measure</button><span id="archMeasureOut" class="lab"></span>
      <button id="archFly" title="Fly through the building">✈ Fly-through</button><button id="archExit">Exit</button></div>
    <div id="archCutNote"></div><div id="archTagCount"></div>`;
  document.body.appendChild(bar);
  const leg = document.createElement("div"); leg.id = "archLegend";
  const hatch = (fg, bg) => `background:repeating-linear-gradient(45deg,${fg} 0 1.5px,${bg} 1.5px 5px),repeating-linear-gradient(-45deg,${fg} 0 1.5px,transparent 1.5px 5px);background-blend-mode:multiply`;
  leg.innerHTML = `<h4>Legend (as A-111)</h4>
    <div class="li"><span class="sw" style="${hatch("#1fa8dc", "#eef9ff")}"></span>Existing wall</div>
    <div class="li"><span class="sw" style="${hatch("#6b6b6b", "#f7f7f5")}"></span>Proposed extension wall</div>
    <div class="li"><span class="sw" style="${hatch("#555", "#ccc9c2")}"></span>Envelope (not on the plan)</div>
    <div class="li"><span class="sw" style="background:#767676"></span>Existing column</div>
    <div class="li"><span class="sw" style="background:#1f7fe8"></span>Proposed column</div>
    <div class="li"><span class="sw" style="background:#bfe3f2;opacity:.8"></span>Glazing</div>
    <div class="src">Floors carry the registered drawings A-111 / A-112 / A-113 (red dashes on them are beam drops). Cut walls show their hatch from above. Hover for position and room; 📏 to measure.</div>`;
  document.body.appendChild(leg);
  const info = document.createElement("div"); info.id = "archInfo"; info.hidden = true; document.body.appendChild(info);
  bar.querySelectorAll("#archCut button").forEach(b => b.onclick = () => archSetCut(b.dataset.c));
  document.getElementById("archUnder").onchange = (e) => { ARCH.under = e.target.checked; archSetCut(ARCH.cut); };
  document.getElementById("archTags").onchange = (e) => { ARCH.labels = e.target.checked; archCullTags(); };
  document.getElementById("archAllTags").onchange = (e) => { ARCH.allTags = e.target.checked; archCullTags(); };
  document.getElementById("archFurn").onchange = (e) => { ARCH.furn = e.target.checked; archSetCut(ARCH.cut); };
  document.getElementById("archPeople").onchange = (e) => { ARCH.people = e.target.checked; archSetCut(ARCH.cut); };
  document.getElementById("archMeasure").onclick = () => archMeasure(!ARCH.measure);
  document.getElementById("archFly").onclick = () => startFlyThrough();
  document.getElementById("archExit").onclick = () => { if (W8.on) { W8.prev.mode = "material"; exitWalk(); } else setMode("material"); };
  const cv = renderer.domElement;
  cv.addEventListener("pointermove", archPointerMove);
  cv.addEventListener("pointerdown", archPointerDown);
  cv.addEventListener("pointerup", archPointerUp);
  addEventListener("keydown", (e) => { if (e.code === "Escape" && ARCH.measure) archClearMeasure(); });
}
function archInitButtons() {
  // header buttons: Architect view and Fly-through, next to "Building map" / "Walk inside"
  const wb = document.getElementById("walkBtn"); if (!wb) return;
  const css = document.createElement("style");
  css.textContent = `#archBtn,#flyBtn{pointer-events:auto;border:1px solid var(--line);border-radius:10px;padding:11px 14px;font:inherit;font-size:14px;font-weight:650;cursor:pointer;
  background:var(--panel);color:var(--ink);backdrop-filter:blur(10px)}
body.arch #archBtn{background:#1f3b57;color:#fff;border-color:#1f3b57}`;
  document.head.appendChild(css);
  const a = document.createElement("button"); a.id = "archBtn"; a.textContent = "📐 Architect view";
  a.onclick = () => setMode(ARCH.on ? "material" : "arch");
  const f = document.createElement("button"); f.id = "flyBtn"; f.textContent = "✈ Fly";
  f.onclick = () => startFlyThrough();
  wb.parentNode.insertBefore(a, wb); wb.parentNode.insertBefore(f, wb);
  // walk-mode top bar: architect toggle
  const wt = document.querySelector("#walkTop .wgroup:last-child") || document.getElementById("walkTop");
  if (wt) { const w = document.createElement("button"); w.className = "wbtn"; w.id = "walkArch"; w.textContent = "📐 Architect";
    w.onclick = () => { if (ARCH.on) { archOff(); mode = "material"; W8.prev.mode = "material"; } else { archOn(); mode = "arch"; W8.prev.mode = "arch"; } w.classList.toggle("on", ARCH.on); };
    wt.insertBefore(w, wt.firstChild); }
}

// @@ARCH_END
// @@PERF_BEGIN
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

// @@PERF_END

// @@MOBILE_BEGIN
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

// @@MOBILE_END

// @@QR_BEGIN
// QR code generator for the printable department sheet: qrcode-generator by Kazuhiko Arase (MIT licence), minified.
var __qrmod=(()=>{var or=(L,T)=>()=>(T||L((T={exports:{}}).exports,T),T.exports);var vr=or((W,V)=>{var $=function(){var L=function(x,w){var g=236,l=17,n=x,s=O[w],t=null,r=0,h=null,i=[],v={},_=function(a,f){r=n*4+17,t=function(e){for(var u=new Array(e),o=0;o<e;o+=1){u[o]=new Array(e);for(var d=0;d<e;d+=1)u[o][d]=null}return u}(r),B(0,0),B(r-7,0),B(0,r-7),E(),C(),m(a,f),n>=7&&N(a),h==null&&(h=ir(n,s,i)),U(h,f)},B=function(a,f){for(var e=-1;e<=7;e+=1)if(!(a+e<=-1||r<=a+e))for(var u=-1;u<=7;u+=1)f+u<=-1||r<=f+u||(0<=e&&e<=6&&(u==0||u==6)||0<=u&&u<=6&&(e==0||e==6)||2<=e&&e<=4&&2<=u&&u<=4?t[a+e][f+u]=!0:t[a+e][f+u]=!1)},y=function(){for(var a=0,f=0,e=0;e<8;e+=1){_(!0,e);var u=P.getLostPoint(v);(e==0||a>u)&&(a=u,f=e)}return f},C=function(){for(var a=8;a<r-8;a+=1)t[a][6]==null&&(t[a][6]=a%2==0);for(var f=8;f<r-8;f+=1)t[6][f]==null&&(t[6][f]=f%2==0)},E=function(){for(var a=P.getPatternPosition(n),f=0;f<a.length;f+=1)for(var e=0;e<a.length;e+=1){var u=a[f],o=a[e];if(t[u][o]==null)for(var d=-2;d<=2;d+=1)for(var c=-2;c<=2;c+=1)d==-2||d==2||c==-2||c==2||d==0&&c==0?t[u+d][o+c]=!0:t[u+d][o+c]=!1}},N=function(a){for(var f=P.getBCHTypeNumber(n),e=0;e<18;e+=1){var u=!a&&(f>>e&1)==1;t[Math.floor(e/3)][e%3+r-8-3]=u}for(var e=0;e<18;e+=1){var u=!a&&(f>>e&1)==1;t[e%3+r-8-3][Math.floor(e/3)]=u}},m=function(a,f){for(var e=s<<3|f,u=P.getBCHTypeInfo(e),o=0;o<15;o+=1){var d=!a&&(u>>o&1)==1;o<6?t[o][8]=d:o<8?t[o+1][8]=d:t[r-15+o][8]=d}for(var o=0;o<15;o+=1){var d=!a&&(u>>o&1)==1;o<8?t[8][r-o-1]=d:o<9?t[8][15-o-1+1]=d:t[8][15-o-1]=d}t[r-8][8]=!a},U=function(a,f){for(var e=-1,u=r-1,o=7,d=0,c=P.getMaskFunction(f),p=r-1;p>0;p-=2)for(p==6&&(p-=1);;){for(var b=0;b<2;b+=1)if(t[u][p-b]==null){var D=!1;d<a.length&&(D=(a[d]>>>o&1)==1);var A=c(u,p-b);A&&(D=!D),t[u][p-b]=D,o-=1,o==-1&&(d+=1,o=7)}if(u+=e,u<0||r<=u){u-=e,e=-e;break}}},H=function(a,f){for(var e=0,u=0,o=0,d=new Array(f.length),c=new Array(f.length),p=0;p<f.length;p+=1){var b=f[p].dataCount,D=f[p].totalCount-b;u=Math.max(u,b),o=Math.max(o,D),d[p]=new Array(b);for(var A=0;A<d[p].length;A+=1)d[p][A]=255&a.getBuffer()[A+e];e+=b;var R=P.getErrorCorrectPolynomial(D),I=K(d[p],R.getLength()-1),S=I.mod(R);c[p]=new Array(R.getLength()-1);for(var A=0;A<c[p].length;A+=1){var X=A+S.getLength()-c[p].length;c[p][A]=X>=0?S.getAt(X):0}}for(var Z=0,A=0;A<f.length;A+=1)Z+=f[A].totalCount;for(var J=new Array(Z),Q=0,A=0;A<u;A+=1)for(var p=0;p<f.length;p+=1)A<d[p].length&&(J[Q]=d[p][A],Q+=1);for(var A=0;A<o;A+=1)for(var p=0;p<f.length;p+=1)A<c[p].length&&(J[Q]=c[p][A],Q+=1);return J},ir=function(a,f,e){for(var u=Y.getRSBlocks(a,f),o=G(),d=0;d<e.length;d+=1){var c=e[d];o.put(c.getMode(),4),o.put(c.getLength(),P.getLengthInBits(c.getMode(),a)),c.write(o)}for(var p=0,d=0;d<u.length;d+=1)p+=u[d].dataCount;if(o.getLengthInBits()>p*8)throw"code length overflow. ("+o.getLengthInBits()+">"+p*8+")";for(o.getLengthInBits()+4<=p*8&&o.put(0,4);o.getLengthInBits()%8!=0;)o.putBit(!1);for(;!(o.getLengthInBits()>=p*8||(o.put(g,8),o.getLengthInBits()>=p*8));)o.put(l,8);return H(o,u)};v.addData=function(a,f){f=f||"Byte";var e=null;switch(f){case"Numeric":e=q(a);break;case"Alphanumeric":e=z(a);break;case"Byte":e=rr(a);break;case"Kanji":e=tr(a);break;default:throw"mode:"+f}i.push(e),h=null},v.isDark=function(a,f){if(a<0||r<=a||f<0||r<=f)throw a+","+f;return t[a][f]},v.getModuleCount=function(){return r},v.make=function(){if(n<1){for(var a=1;a<40;a++){for(var f=Y.getRSBlocks(a,s),e=G(),u=0;u<i.length;u++){var o=i[u];e.put(o.getMode(),4),e.put(o.getLength(),P.getLengthInBits(o.getMode(),a)),o.write(e)}for(var d=0,u=0;u<f.length;u++)d+=f[u].dataCount;if(e.getLengthInBits()<=d*8)break}n=a}_(!1,y())},v.createTableTag=function(a,f){a=a||2,f=typeof f>"u"?a*4:f;var e="";e+='<table style="',e+=" border-width: 0px; border-style: none;",e+=" border-collapse: collapse;",e+=" padding: 0px; margin: "+f+"px;",e+='">',e+="<tbody>";for(var u=0;u<v.getModuleCount();u+=1){e+="<tr>";for(var o=0;o<v.getModuleCount();o+=1)e+='<td style="',e+=" border-width: 0px; border-style: none;",e+=" border-collapse: collapse;",e+=" padding: 0px; margin: 0px;",e+=" width: "+a+"px;",e+=" height: "+a+"px;",e+=" background-color: ",e+=v.isDark(u,o)?"#000000":"#ffffff",e+=";",e+='"/>';e+="</tr>"}return e+="</tbody>",e+="</table>",e},v.createSvgTag=function(a,f,e,u){var o={};typeof arguments[0]=="object"&&(o=arguments[0],a=o.cellSize,f=o.margin,e=o.alt,u=o.title),a=a||2,f=typeof f>"u"?a*4:f,e=typeof e=="string"?{text:e}:e||{},e.text=e.text||null,e.id=e.text?e.id||"qrcode-description":null,u=typeof u=="string"?{text:u}:u||{},u.text=u.text||null,u.id=u.text?u.id||"qrcode-title":null;var d=v.getModuleCount()*a+f*2,c,p,b,D,A="",R;for(R="l"+a+",0 0,"+a+" -"+a+",0 0,-"+a+"z ",A+='<svg version="1.1" xmlns="http://www.w3.org/2000/svg"',A+=o.scalable?"":' width="'+d+'px" height="'+d+'px"',A+=' viewBox="0 0 '+d+" "+d+'" ',A+=' preserveAspectRatio="xMinYMin meet"',A+=u.text||e.text?' role="img" aria-labelledby="'+F([u.id,e.id].join(" ").trim())+'"':"",A+=">",A+=u.text?'<title id="'+F(u.id)+'">'+F(u.text)+"</title>":"",A+=e.text?'<description id="'+F(e.id)+'">'+F(e.text)+"</description>":"",A+='<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>',A+='<path d="',b=0;b<v.getModuleCount();b+=1)for(D=b*a+f,c=0;c<v.getModuleCount();c+=1)v.isDark(b,c)&&(p=c*a+f,A+="M"+p+","+D+R);return A+='" stroke="transparent" fill="black"/>',A+="</svg>",A},v.createDataURL=function(a,f){a=a||2,f=typeof f>"u"?a*4:f;var e=v.getModuleCount()*a+f*2,u=f,o=e-f;return fr(e,e,function(d,c){if(u<=d&&d<o&&u<=c&&c<o){var p=Math.floor((d-u)/a),b=Math.floor((c-u)/a);return v.isDark(b,p)?0:1}else return 1})},v.createImgTag=function(a,f,e){a=a||2,f=typeof f>"u"?a*4:f;var u=v.getModuleCount()*a+f*2,o="";return o+="<img",o+=' src="',o+=v.createDataURL(a,f),o+='"',o+=' width="',o+=u,o+='"',o+=' height="',o+=u,o+='"',e&&(o+=' alt="',o+=F(e),o+='"'),o+="/>",o};var F=function(a){for(var f="",e=0;e<a.length;e+=1){var u=a.charAt(e);switch(u){case"<":f+="&lt;";break;case">":f+="&gt;";break;case"&":f+="&amp;";break;case'"':f+="&quot;";break;default:f+=u;break}}return f},ur=function(a){var f=1;a=typeof a>"u"?f*2:a;var e=v.getModuleCount()*f+a*2,u=a,o=e-a,d,c,p,b,D,A={"\u2588\u2588":"\u2588","\u2588 ":"\u2580"," \u2588":"\u2584","  ":" "},R={"\u2588\u2588":"\u2580","\u2588 ":"\u2580"," \u2588":" ","  ":" "},I="";for(d=0;d<e;d+=2){for(p=Math.floor((d-u)/f),b=Math.floor((d+1-u)/f),c=0;c<e;c+=1)D="\u2588",u<=c&&c<o&&u<=d&&d<o&&v.isDark(p,Math.floor((c-u)/f))&&(D=" "),u<=c&&c<o&&u<=d+1&&d+1<o&&v.isDark(b,Math.floor((c-u)/f))?D+=" ":D+="\u2588",I+=a<1&&d+1>=o?R[D]:A[D];I+=`
`}return e%2&&a>0?I.substring(0,I.length-e-1)+Array(e+1).join("\u2580"):I.substring(0,I.length-1)};return v.createASCII=function(a,f){if(a=a||1,a<2)return ur(f);a-=1,f=typeof f>"u"?a*2:f;var e=v.getModuleCount()*a+f*2,u=f,o=e-f,d,c,p,b,D=Array(a+1).join("\u2588\u2588"),A=Array(a+1).join("  "),R="",I="";for(d=0;d<e;d+=1){for(p=Math.floor((d-u)/a),I="",c=0;c<e;c+=1)b=1,u<=c&&c<o&&u<=d&&d<o&&v.isDark(p,Math.floor((c-u)/a))&&(b=0),I+=b?D:A;for(p=0;p<a;p+=1)R+=I+`
`}return R.substring(0,R.length-1)},v.renderTo2dContext=function(a,f){f=f||2;for(var e=v.getModuleCount(),u=0;u<e;u++)for(var o=0;o<e;o++)a.fillStyle=v.isDark(u,o)?"black":"white",a.fillRect(u*f,o*f,f,f)},v};L.stringToBytesFuncs={default:function(x){for(var w=[],g=0;g<x.length;g+=1){var l=x.charCodeAt(g);w.push(l&255)}return w}},L.stringToBytes=L.stringToBytesFuncs.default,L.createStringToBytes=function(x,w){var g=function(){for(var n=nr(x),s=function(){var C=n.read();if(C==-1)throw"eof";return C},t=0,r={};;){var h=n.read();if(h==-1)break;var i=s(),v=s(),_=s(),B=String.fromCharCode(h<<8|i),y=v<<8|_;r[B]=y,t+=1}if(t!=w)throw t+" != "+w;return r}(),l=63;return function(n){for(var s=[],t=0;t<n.length;t+=1){var r=n.charCodeAt(t);if(r<128)s.push(r);else{var h=g[n.charAt(t)];typeof h=="number"?(h&255)==h?s.push(h):(s.push(h>>>8),s.push(h&255)):s.push(l)}}return s}};var T={MODE_NUMBER:1,MODE_ALPHA_NUM:2,MODE_8BIT_BYTE:4,MODE_KANJI:8},O={L:1,M:0,Q:3,H:2},k={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7},P=function(){var x=[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],w=1335,g=7973,l=21522,n={},s=function(t){for(var r=0;t!=0;)r+=1,t>>>=1;return r};return n.getBCHTypeInfo=function(t){for(var r=t<<10;s(r)-s(w)>=0;)r^=w<<s(r)-s(w);return(t<<10|r)^l},n.getBCHTypeNumber=function(t){for(var r=t<<12;s(r)-s(g)>=0;)r^=g<<s(r)-s(g);return t<<12|r},n.getPatternPosition=function(t){return x[t-1]},n.getMaskFunction=function(t){switch(t){case k.PATTERN000:return function(r,h){return(r+h)%2==0};case k.PATTERN001:return function(r,h){return r%2==0};case k.PATTERN010:return function(r,h){return h%3==0};case k.PATTERN011:return function(r,h){return(r+h)%3==0};case k.PATTERN100:return function(r,h){return(Math.floor(r/2)+Math.floor(h/3))%2==0};case k.PATTERN101:return function(r,h){return r*h%2+r*h%3==0};case k.PATTERN110:return function(r,h){return(r*h%2+r*h%3)%2==0};case k.PATTERN111:return function(r,h){return(r*h%3+(r+h)%2)%2==0};default:throw"bad maskPattern:"+t}},n.getErrorCorrectPolynomial=function(t){for(var r=K([1],0),h=0;h<t;h+=1)r=r.multiply(K([1,M.gexp(h)],0));return r},n.getLengthInBits=function(t,r){if(1<=r&&r<10)switch(t){case T.MODE_NUMBER:return 10;case T.MODE_ALPHA_NUM:return 9;case T.MODE_8BIT_BYTE:return 8;case T.MODE_KANJI:return 8;default:throw"mode:"+t}else if(r<27)switch(t){case T.MODE_NUMBER:return 12;case T.MODE_ALPHA_NUM:return 11;case T.MODE_8BIT_BYTE:return 16;case T.MODE_KANJI:return 10;default:throw"mode:"+t}else if(r<41)switch(t){case T.MODE_NUMBER:return 14;case T.MODE_ALPHA_NUM:return 13;case T.MODE_8BIT_BYTE:return 16;case T.MODE_KANJI:return 12;default:throw"mode:"+t}else throw"type:"+r},n.getLostPoint=function(t){for(var r=t.getModuleCount(),h=0,i=0;i<r;i+=1)for(var v=0;v<r;v+=1){for(var _=0,B=t.isDark(i,v),y=-1;y<=1;y+=1)if(!(i+y<0||r<=i+y))for(var C=-1;C<=1;C+=1)v+C<0||r<=v+C||y==0&&C==0||B==t.isDark(i+y,v+C)&&(_+=1);_>5&&(h+=3+_-5)}for(var i=0;i<r-1;i+=1)for(var v=0;v<r-1;v+=1){var E=0;t.isDark(i,v)&&(E+=1),t.isDark(i+1,v)&&(E+=1),t.isDark(i,v+1)&&(E+=1),t.isDark(i+1,v+1)&&(E+=1),(E==0||E==4)&&(h+=3)}for(var i=0;i<r;i+=1)for(var v=0;v<r-6;v+=1)t.isDark(i,v)&&!t.isDark(i,v+1)&&t.isDark(i,v+2)&&t.isDark(i,v+3)&&t.isDark(i,v+4)&&!t.isDark(i,v+5)&&t.isDark(i,v+6)&&(h+=40);for(var v=0;v<r;v+=1)for(var i=0;i<r-6;i+=1)t.isDark(i,v)&&!t.isDark(i+1,v)&&t.isDark(i+2,v)&&t.isDark(i+3,v)&&t.isDark(i+4,v)&&!t.isDark(i+5,v)&&t.isDark(i+6,v)&&(h+=40);for(var N=0,v=0;v<r;v+=1)for(var i=0;i<r;i+=1)t.isDark(i,v)&&(N+=1);var m=Math.abs(100*N/r/r-50)/5;return h+=m*10,h},n}(),M=function(){for(var x=new Array(256),w=new Array(256),g=0;g<8;g+=1)x[g]=1<<g;for(var g=8;g<256;g+=1)x[g]=x[g-4]^x[g-5]^x[g-6]^x[g-8];for(var g=0;g<255;g+=1)w[x[g]]=g;var l={};return l.glog=function(n){if(n<1)throw"glog("+n+")";return w[n]},l.gexp=function(n){for(;n<0;)n+=255;for(;n>=256;)n-=255;return x[n]},l}();function K(x,w){if(typeof x.length>"u")throw x.length+"/"+w;var g=function(){for(var n=0;n<x.length&&x[n]==0;)n+=1;for(var s=new Array(x.length-n+w),t=0;t<x.length-n;t+=1)s[t]=x[t+n];return s}(),l={};return l.getAt=function(n){return g[n]},l.getLength=function(){return g.length},l.multiply=function(n){for(var s=new Array(l.getLength()+n.getLength()-1),t=0;t<l.getLength();t+=1)for(var r=0;r<n.getLength();r+=1)s[t+r]^=M.gexp(M.glog(l.getAt(t))+M.glog(n.getAt(r)));return K(s,0)},l.mod=function(n){if(l.getLength()-n.getLength()<0)return l;for(var s=M.glog(l.getAt(0))-M.glog(n.getAt(0)),t=new Array(l.getLength()),r=0;r<l.getLength();r+=1)t[r]=l.getAt(r);for(var r=0;r<n.getLength();r+=1)t[r]^=M.gexp(M.glog(n.getAt(r))+s);return K(t,0).mod(n)},l}var Y=function(){var x=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12,7,37,13],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]],w=function(n,s){var t={};return t.totalCount=n,t.dataCount=s,t},g={},l=function(n,s){switch(s){case O.L:return x[(n-1)*4+0];case O.M:return x[(n-1)*4+1];case O.Q:return x[(n-1)*4+2];case O.H:return x[(n-1)*4+3];default:return}};return g.getRSBlocks=function(n,s){var t=l(n,s);if(typeof t>"u")throw"bad rs block @ typeNumber:"+n+"/errorCorrectionLevel:"+s;for(var r=t.length/3,h=[],i=0;i<r;i+=1)for(var v=t[i*3+0],_=t[i*3+1],B=t[i*3+2],y=0;y<v;y+=1)h.push(w(_,B));return h},g}(),G=function(){var x=[],w=0,g={};return g.getBuffer=function(){return x},g.getAt=function(l){var n=Math.floor(l/8);return(x[n]>>>7-l%8&1)==1},g.put=function(l,n){for(var s=0;s<n;s+=1)g.putBit((l>>>n-s-1&1)==1)},g.getLengthInBits=function(){return w},g.putBit=function(l){var n=Math.floor(w/8);x.length<=n&&x.push(0),l&&(x[n]|=128>>>w%8),w+=1},g},q=function(x){var w=T.MODE_NUMBER,g=x,l={};l.getMode=function(){return w},l.getLength=function(t){return g.length},l.write=function(t){for(var r=g,h=0;h+2<r.length;)t.put(n(r.substring(h,h+3)),10),h+=3;h<r.length&&(r.length-h==1?t.put(n(r.substring(h,h+1)),4):r.length-h==2&&t.put(n(r.substring(h,h+2)),7))};var n=function(t){for(var r=0,h=0;h<t.length;h+=1)r=r*10+s(t.charAt(h));return r},s=function(t){if("0"<=t&&t<="9")return t.charCodeAt(0)-48;throw"illegal char :"+t};return l},z=function(x){var w=T.MODE_ALPHA_NUM,g=x,l={};l.getMode=function(){return w},l.getLength=function(s){return g.length},l.write=function(s){for(var t=g,r=0;r+1<t.length;)s.put(n(t.charAt(r))*45+n(t.charAt(r+1)),11),r+=2;r<t.length&&s.put(n(t.charAt(r)),6)};var n=function(s){if("0"<=s&&s<="9")return s.charCodeAt(0)-48;if("A"<=s&&s<="Z")return s.charCodeAt(0)-65+10;switch(s){case" ":return 36;case"$":return 37;case"%":return 38;case"*":return 39;case"+":return 40;case"-":return 41;case".":return 42;case"/":return 43;case":":return 44;default:throw"illegal char :"+s}};return l},rr=function(x){var w=T.MODE_8BIT_BYTE,g=x,l=L.stringToBytes(x),n={};return n.getMode=function(){return w},n.getLength=function(s){return l.length},n.write=function(s){for(var t=0;t<l.length;t+=1)s.put(l[t],8)},n},tr=function(x){var w=T.MODE_KANJI,g=x,l=L.stringToBytesFuncs.SJIS;if(!l)throw"sjis not supported.";(function(t,r){var h=l(t);if(h.length!=2||(h[0]<<8|h[1])!=r)throw"sjis not supported."})("\u53CB",38726);var n=l(x),s={};return s.getMode=function(){return w},s.getLength=function(t){return~~(n.length/2)},s.write=function(t){for(var r=n,h=0;h+1<r.length;){var i=(255&r[h])<<8|255&r[h+1];if(33088<=i&&i<=40956)i-=33088;else if(57408<=i&&i<=60351)i-=49472;else throw"illegal char at "+(h+1)+"/"+i;i=(i>>>8&255)*192+(i&255),t.put(i,13),h+=2}if(h<r.length)throw"illegal char at "+(h+1)},s},j=function(){var x=[],w={};return w.writeByte=function(g){x.push(g&255)},w.writeShort=function(g){w.writeByte(g),w.writeByte(g>>>8)},w.writeBytes=function(g,l,n){l=l||0,n=n||g.length;for(var s=0;s<n;s+=1)w.writeByte(g[s+l])},w.writeString=function(g){for(var l=0;l<g.length;l+=1)w.writeByte(g.charCodeAt(l))},w.toByteArray=function(){return x},w.toString=function(){var g="";g+="[";for(var l=0;l<x.length;l+=1)l>0&&(g+=","),g+=x[l];return g+="]",g},w},er=function(){var x=0,w=0,g=0,l="",n={},s=function(r){l+=String.fromCharCode(t(r&63))},t=function(r){if(!(r<0)){if(r<26)return 65+r;if(r<52)return 97+(r-26);if(r<62)return 48+(r-52);if(r==62)return 43;if(r==63)return 47}throw"n:"+r};return n.writeByte=function(r){for(x=x<<8|r&255,w+=8,g+=1;w>=6;)s(x>>>w-6),w-=6},n.flush=function(){if(w>0&&(s(x<<6-w),x=0,w=0),g%3!=0)for(var r=3-g%3,h=0;h<r;h+=1)l+="="},n.toString=function(){return l},n},nr=function(x){var w=x,g=0,l=0,n=0,s={};s.read=function(){for(;n<8;){if(g>=w.length){if(n==0)return-1;throw"unexpected end of file./"+n}var r=w.charAt(g);if(g+=1,r=="=")return n=0,-1;if(r.match(/^\s$/))continue;l=l<<6|t(r.charCodeAt(0)),n+=6}var h=l>>>n-8&255;return n-=8,h};var t=function(r){if(65<=r&&r<=90)return r-65;if(97<=r&&r<=122)return r-97+26;if(48<=r&&r<=57)return r-48+52;if(r==43)return 62;if(r==47)return 63;throw"c:"+r};return s},ar=function(x,w){var g=x,l=w,n=new Array(x*w),s={};s.setPixel=function(i,v,_){n[v*g+i]=_},s.write=function(i){i.writeString("GIF87a"),i.writeShort(g),i.writeShort(l),i.writeByte(128),i.writeByte(0),i.writeByte(0),i.writeByte(0),i.writeByte(0),i.writeByte(0),i.writeByte(255),i.writeByte(255),i.writeByte(255),i.writeString(","),i.writeShort(0),i.writeShort(0),i.writeShort(g),i.writeShort(l),i.writeByte(0);var v=2,_=r(v);i.writeByte(v);for(var B=0;_.length-B>255;)i.writeByte(255),i.writeBytes(_,B,255),B+=255;i.writeByte(_.length-B),i.writeBytes(_,B,_.length-B),i.writeByte(0),i.writeString(";")};var t=function(i){var v=i,_=0,B=0,y={};return y.write=function(C,E){if(C>>>E)throw"length over";for(;_+E>=8;)v.writeByte(255&(C<<_|B)),E-=8-_,C>>>=8-_,B=0,_=0;B=C<<_|B,_=_+E},y.flush=function(){_>0&&v.writeByte(B)},y},r=function(i){for(var v=1<<i,_=(1<<i)+1,B=i+1,y=h(),C=0;C<v;C+=1)y.add(String.fromCharCode(C));y.add(String.fromCharCode(v)),y.add(String.fromCharCode(_));var E=j(),N=t(E);N.write(v,B);var m=0,U=String.fromCharCode(n[m]);for(m+=1;m<n.length;){var H=String.fromCharCode(n[m]);m+=1,y.contains(U+H)?U=U+H:(N.write(y.indexOf(U),B),y.size()<4095&&(y.size()==1<<B&&(B+=1),y.add(U+H)),U=H)}return N.write(y.indexOf(U),B),N.write(_,B),N.flush(),E.toByteArray()},h=function(){var i={},v=0,_={};return _.add=function(B){if(_.contains(B))throw"dup key:"+B;i[B]=v,v+=1},_.size=function(){return v},_.indexOf=function(B){return i[B]},_.contains=function(B){return typeof i[B]<"u"},_};return s},fr=function(x,w,g){for(var l=ar(x,w),n=0;n<w;n+=1)for(var s=0;s<x;s+=1)l.setPixel(s,n,g(s,n));var t=j();l.write(t);for(var r=er(),h=t.toByteArray(),i=0;i<h.length;i+=1)r.writeByte(h[i]);return r.flush(),"data:image/gif;base64,"+r};return L}();(function(){$.stringToBytesFuncs["UTF-8"]=function(L){function T(O){for(var k=[],P=0;P<O.length;P++){var M=O.charCodeAt(P);M<128?k.push(M):M<2048?k.push(192|M>>6,128|M&63):M<55296||M>=57344?k.push(224|M>>12,128|M>>6&63,128|M&63):(P++,M=65536+((M&1023)<<10|O.charCodeAt(P)&1023),k.push(240|M>>18,128|M>>12&63,128|M>>6&63,128|M&63))}return k}return T(L)}})();(function(L){typeof define=="function"&&define.amd?define([],L):typeof W=="object"&&(V.exports=L())})(function(){return $})});return vr();})();


// @@QR_END

// @@WAY_BEGIN
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

// @@WAY_END

// @@SOLAR_BEGIN
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

// @@SOLAR_END

// @@EXTRAS_BEGIN
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

// @@EXTRAS_END

window.__dmPlaced = () => (DM.placedCheck || []).slice(DM.nOverlay || 0); window.__dmMore = () => DM.more || []; window.__dmHits = () => (DM.hits || []).map(h => [h[0].map(Math.round), h[1]]); window.__dmZoomTo = (z) => { DM.z = z; drawMap(); };
window.__bench = (n = 5) => { const gl = renderer.getContext(), px = new Uint8Array(4); const ai = renderer.info.autoReset; renderer.info.autoReset = false; let calls = 0, tris = 0, t = 0;
  for (let k = 0; k < n + 1; k++) { renderer.info.reset(); const t0 = performance.now(); cullBegin(); lampPoolUpdate(); if (ARCH.on) { archFrame(); archRender(); } else renderer.render(scene, camera); cullEnd(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    if (k) { t += performance.now() - t0; calls = renderer.info.render.calls; tris = renderer.info.render.triangles; } }
  renderer.info.autoReset = ai; return { ms: t / n, calls, triangles: tris, level: QUAL.level, pr: renderer.getPixelRatio(), size: [renderer.domElement.width, renderer.domElement.height] }; };
window.__perf = () => { const i = renderer.info; let meshes = 0, inst = 0, instN = 0, tris = 0;
  scene.traverse(o => { if (o.isMesh) { meshes++; if (o.isInstancedMesh) { inst++; instN += o.count; } } });
  return { calls: i.render.calls, triangles: i.render.triangles, points: i.render.points, lines: i.render.lines, geometries: i.memory.geometries, textures: i.memory.textures,
    programs: (i.programs || []).length, meshes, instancedMeshes: inst, instances: instN, pixelRatio: renderer.getPixelRatio(), size: [renderer.domElement.width, renderer.domElement.height],
    shadowMap: sun.shadow.mapSize.x, shadows: renderer.shadowMap.enabled }; };
window.__api = { setView, setMode, setLabels, setPreset, groups: () => groups,
  setTime: (h, doy) => { if (doy) { light.doy = doy; buildSunPath(); paintTrack(); } light.hour = h; light.preset = "custom"; applyLight(); },
  setPath: (on) => { light.path = on; applyLight(); },
  enterWalk, exitWalk, tourGo, startTour, walkState: () => ({ ...W8, keys: undefined }),
  walkTo: (f, x, y, yaw, pitch) => placeAt(f, x, y, yaw || 0, pitch || 0),
  press: (code, on) => { W8.keys[code] = on; },
  canStand: (f, x, y) => canStand(f, x, y), setRoute, openMap, closeMap, selectRoom, navState: () => ({ path: NAV.path, target: NAV.target }), setFly: (on) => setFly(on), cellAt: (f, x, y) => cell(f, x, y),
  setLamps: (on) => { light.lampsManual = on; applyLight(); },
  hideUI: (on) => { ["hud","panel","readout","timebar"].forEach(id => { const e=document.getElementById(id); if(e) e.style.display = on ? "none" : ""; }); },
  shot: () => { renderer.render(scene, camera); return true; },
  cam: (c) => { if (W8.on) exitWalk(); camera.position.set(c[0], c[1], c[2]); controls.target.set(c[3], c[4], c[5]); if (c[6]) { camera.fov = c[6]; camera.updateProjectionMatrix(); } controls.update(); },
  furnStats: () => window.__furnStats,
  arch: (on) => setMode(on ? "arch" : "material"), archCut: (c) => archSetCut(c), fly: () => startFlyThrough(),
  archDbg: (k, v) => { ARCH.quad.material.uniforms[k].value = v; }, archHide: (n, v) => { const o = n === 'ground' ? ARCH.ground : scene.getObjectByName(n); if (o) o.visible = !v; return !!o; },
  archProbe: (x, y, z, dx, dy, dz) => { const rc = new THREE.Raycaster(new THREE.Vector3(x, y, z), new THREE.Vector3(dx || 0, dy || 0, dz === undefined ? 1 : dz).normalize(), 0, 400); rc.camera = camera;
    const vis = (o) => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
    return rc.intersectObjects(scene.children, true).filter(h => vis(h.object)).slice(0, 8).map(h => { let n = h.object.name, q = h.object; while (q && !/^(GF|FF|SF|Roof|Arch)/.test(q.name || "")) q = q.parent; return [n, q ? q.name : "?", h.object.material && h.object.material.type, +h.point.z.toFixed(2), +h.distance.toFixed(2)]; }); },
  project: (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; },
  archOpt: (o) => { Object.assign(ARCH, o); if (ARCH.on) archSetCut(ARCH.cut); }, archState: () => ({ on: ARCH.on, cut: ARCH.cut, eff: ARCH.eff, tags: ARCH.tags.filter(t => t.visible).length }),
  archMeasureAt: (a, b) => { archMeasure(true); [a, b].forEach(p => { ARCH.m.pts.length >= 2 && archClearMeasure(); }); } };
init();
})();
