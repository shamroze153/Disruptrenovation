(function () {
const LEVELS = [
  ["Road datum", "±0'-0\""], ["Ground FFL", "+1'-0\""], ["West ground FFL", "+2'-0\""],
  ["First FFL", "+12'-5\""], ["West first FFL", "+13'-11\" / +16'-11\""],
  ["Second FFL", "+23'-10\""], ["West second FFL", "+25'-9\""],
  ["Roof slab", "+35'-3\""], ["Parapet", "+39'-3\""]
];
const LABELS = [
  ["Courtyard", 87.6, 66, 8], ["Reception", 85, 37, 8], ["Entrance foyer", 86, 14, 6],
  ["Guard", 85, 4, 4], ["Gym", 111, 118, 7], ["Generator", 142, 122, 7],
  ["Reading room", 110, 71, 7], ["Meeting room", 110, 52, 7], ["Board room", 124, 29, 7],
  ["Day care", 42, 104, 8], ["Main stair", 89, 99, 9], ["Workshop", 131, 59, 7],
  ["Procurement store", 131, 46, 7], ["Lawn", 115, 17, 3], ["Workstations", 33, 55, 8],
  ["Shower and changing", 121, 105, 7],
  ["Workstations", 33, 55, 19.5], ["Open workstations", 110, 110, 19.5],
  ["Meeting rooms", 22, 112, 24], ["Server room", 133, 100, 19.5],
  ["Rooftop cafeteria", 124, 45, 31], ["Masjid", 96, 24, 31],
  ["Recreational area", 112, 84, 31], ["Workstations", 33, 60, 33]
];
const LAYER_GROUPS = {
  "Ground floor":   ["GF_Slab", "GF_External_Walls", "GF_Glazing", "GF_Internal_Walls", "GF_Stairs"],
  "First floor":    ["FF_Slab", "FF_External_Walls", "FF_Glazing", "FF_Internal_Walls", "FF_Stairs"],
  "Second floor":   ["SF_Slab", "SF_External_Walls", "SF_Glazing", "SF_Internal_Walls", "SF_Stairs"],
  "Roofs & parapets": ["Roof_Level_12-5_Slab","Roof_Level_12-5_Parapet","Roof_Level_23-10_Slab",
                       "Roof_Level_23-10_Parapet","Roof_Level_35-3_Slab","Roof_Level_35-3_Parapet",
                       "Roof_Corrugated_Sheet"],
  "Courtyard":      ["Courtyard_Paving", "Courtyard_Glazing"],
  "Site & ground":  ["Site_Boundary_Wall", "Ground_Apron"]
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
  "Courtyard_Paving":0xb8b2a6, "Courtyard_Glazing":0x8fb6cc
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
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
  sun.shadow.mapSize.set(big ? 2048 : 1024, big ? 2048 : 1024);
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

  lampGroup = new THREE.Group(); scene.add(lampGroup);
  LAMP_Z.forEach((z, fl) => LAMP_XY.forEach(([x, y]) => {
    const p = new THREE.PointLight(0xffcf96, LAMP_I, 28, 2); p.position.set(x, y, z);
    p.userData = { z0: z, fl }; lampGroup.add(p);
  }));
  const court = new THREE.PointLight(0xffc88a, LAMP_I * 0.9, 24, 2); court.position.set(87.6, 66, 7);
  court.userData = { z0: 7, fl: 0 }; lampGroup.add(court);
  const recep = new THREE.PointLight(0xffd6a2, LAMP_I * 0.8, 22, 2); recep.position.set(85, 37, 16);
  recep.userData = { z0: 16, fl: 0 }; lampGroup.add(recep);
  lampGroup.visible = false;

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

  new GLTFLoader().parse(base64ToArrayBuffer(window.MODEL_B64), "", (gltf) => {
    const meshes = [];
    gltf.scene.traverse((o) => { if (o.isMesh) meshes.push(o); });
    // The low-roof parapets (+12'-5" and +23'-10") were traced from roof-zone edges and are not drawn
    // on the plans or elevations; only the +39'-3" parapet is stated. Remove them.
    for (let i = meshes.length - 1; i >= 0; i--) {
      const nm = (meshes[i].name || (meshes[i].parent && meshes[i].parent.name) || "");
      if (/^Roof_Level_(12-5|23-10)_Parapet/.test(nm)) { meshes[i].parent && meshes[i].parent.remove(meshes[i]); meshes.splice(i, 1); }
    }
    // Spiral stair at the south-east corner removed at the client's request
    meshes.forEach((o) => {
      const nm = (o.name || (o.parent && o.parent.name) || "");
      if (!/_Stairs/.test(nm) || !o.geometry.index) return;
      const P = o.geometry.attributes.position, I = o.geometry.index.array, keep = [];
      for (let t = 0; t < I.length; t += 3) {
        const cx = (P.getX(I[t]) + P.getX(I[t + 1]) + P.getX(I[t + 2])) / 3, cy = (P.getY(I[t]) + P.getY(I[t + 1]) + P.getY(I[t + 2])) / 3;
        if (Math.hypot(cx - 143.5, cy - 18.5) > 4.6) keep.push(I[t], I[t + 1], I[t + 2]);
      }
      o.geometry.setIndex(keep);
    });
    // Straightened geometry: plate outlines, external and internal walls, top roof re-derived without the 6" raster stepping
    const CG = window.CLEAN_GEOM || {};
    meshes.forEach((o) => {
      const nm = (o.name || (o.parent && o.parent.name) || "").replace(/\.\d+$/, "");
      const list = CG[nm]; if (!list) return;
      const n = list.length, P = new Float32Array(n * 36 * 3), N = new Float32Array(n * 36 * 3);
      const tmpl = new THREE.BoxGeometry(1, 1, 1).toNonIndexed(), tp = tmpl.attributes.position.array, tn = tmpl.attributes.normal.array;
      list.forEach((b, i) => {
        const sx = b[3] - b[0], sy = b[4] - b[1], sz = b[5] - b[2], cx = (b[0] + b[3]) / 2, cy = (b[1] + b[4]) / 2, cz = (b[2] + b[5]) / 2;
        for (let v = 0; v < 36; v++) {
          const o3 = (i * 36 + v) * 3;
          P[o3] = tp[v * 3] * sx + cx; P[o3 + 1] = tp[v * 3 + 1] * sy + cy; P[o3 + 2] = tp[v * 3 + 2] * sz + cz;
          N[o3] = tn[v * 3]; N[o3 + 1] = tn[v * 3 + 1]; N[o3 + 2] = tn[v * 3 + 2];
        }
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.BufferAttribute(N, 3));
      o.geometry.dispose(); o.geometry = g;
    });
    // Correction: A-301 gives the reception as double height (22'-1") and the courtyard as open to sky,
    // but the archived GLB caps both with the +12'-5" roof. Drop those boxes; close the reception at +23'-1".
    const VOIDS = [[74.3, 95.8, 26.1, 48.5], [75.6, 99.6, 51.5, 80.8]];
    meshes.forEach((o) => {
      const nm = (o.name || (o.parent && o.parent.name) || "");
      if (!/^Roof_Level_12-5_(Slab|Parapet)/.test(nm) || !o.geometry.index) return;
      const P = o.geometry.attributes.position, I = o.geometry.index.array, keep = [];
      const drop = new Set();
      for (let b = 0; b * 8 < P.count; b++) {
        let cx = 0, cy = 0; for (let v = 0; v < 8; v++) { cx += P.getX(b * 8 + v); cy += P.getY(b * 8 + v); }
        cx /= 8; cy /= 8;
        if (VOIDS.some(([x0, x1, y0, y1]) => cx > x0 && cx < x1 && cy > y0 && cy < y1)) drop.add(b);
      }
      for (let t = 0; t < I.length; t += 3) if (!drop.has(Math.floor(I[t] / 8))) keep.push(I[t], I[t + 1], I[t + 2]);
      o.geometry.setIndex(keep);
    });
    const recCap = new THREE.Mesh(new THREE.BoxGeometry(20.5, 21.4, 0.75));
    recCap.position.set(85.05, 37.3, 23 + 1 / 12 + 0.375); recCap.name = "Roof_Level_23-10_Slab";
    const capHolder = new THREE.Group(); capHolder.name = "Roof_Level_23-10_Slab"; capHolder.add(recCap);
    meshes.push(recCap);
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
    buildFurniture();
    buildFrames(); buildLandscape(); buildEntrancePin();
    buildWalkScene();
    buildUI();
    bindWalkInput();
    bindMap();
    document.getElementById("walkBtn").onclick = () => enterWalk();
    document.getElementById("walkBtn2").onclick = () => enterWalk();
    buildRoomLabels();
    setLabels(false);
    setView("front34");
    buildSunPath();
    setPreset("afternoon");
    document.getElementById("loading").style.display = "none";
    window.__ready = true;
  }, (e) => console.error(e));

  addEventListener("resize", resize); resize(); requestAnimationFrame(animate);
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
  sun.castShadow = light.shadows && sun.intensity > 0.03;

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
  sunStudy:   { name: "Sun study", pos: [-330, -420, 330], tgt: [CX, CY, 30], fov: 34 }
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
  mode = m;
  const white = (m === "white" || m === "expl");
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
   ["axoWide", "Exploded axo"], ["sunStudy", "Sun study"]].forEach(([k, t]) => {
    const b = el("button", "", t); b.dataset.k = k;
    b.onclick = () => { setView(k); if (k === "sunStudy" && !light.path) { light.path = true; document.getElementById("sunpath").checked = true; applyLight(); } };
    vs.appendChild(b);
  });
  const ms = document.getElementById("modes");
  [["material", "Materials"], ["white", "White model"], ["cutGF", "Ground cutaway"],
   ["cutFF", "First cutaway"], ["cutSF", "Second cutaway"], ["expl", "Exploded"]].forEach(([m, t]) => {
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
  const w = innerWidth, h = innerHeight;
  camera.aspect = w / h; camera.updateProjectionMatrix();
  renderer.setSize(w, h); labelRenderer.setSize(w, h);
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
  if (W8.on) { walkStep(dt); navStep(dt); } else { controls.update(); updateCompass(); }
  PANEL_U.value = W8.on ? (light.lampsOn ? 1.35 : 0.9) : 0.35;
  if (entrancePin) entrancePin.visible = !W8.on && !/cut|expl/.test(mode);
  sky.position.copy(camera.position);
  renderer.render(scene, camera); labelRenderer.render(scene, camera);
}

// ================================================================ REALISM LAYER
const PANEL_U = { value: 0.3 };
const LV = "0.0,0.5,1.0,2.0,12.4167,13.9167,16.9167,23.8333,25.75,35.25";
function enhanceMaterial(mat, kind) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uPanel = PANEL_U;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWPos; varying vec3 vWN;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);");
    let frag = sh.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vWPos; varying vec3 vWN; uniform float uPanel;
float rh(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(rh(i), rh(i + vec3(1,0,0)), f.x), mix(rh(i + vec3(0,1,0)), rh(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(rh(i + vec3(0,0,1)), rh(i + vec3(1,0,1)), f.x), mix(rh(i + vec3(0,1,1)), rh(i + vec3(1,1,1)), f.x), f.y), f.z); }
float aboveFloor(float z){ float lv[10] = float[10](${LV}); float b = -100.0;
  for (int i = 0; i < 10; i++) { if (lv[i] <= z + 0.02) b = max(b, lv[i]); } return z - b; }`);
    let body = `{ float n = vn(vWPos * 1.6) * 0.55 + vn(vWPos * 7.0) * 0.45; diffuseColor.rgb *= 0.95 + 0.08 * n; `;
    if (kind === "wall") body += `if (abs(vWN.z) < 0.5) { float h = aboveFloor(vWPos.z);
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
  mat.customProgramCacheKey = () => "enh-" + kind + (mat.transparent ? "t" : "");
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
  for (let i = 0; i < WD.W * WD.H; i++) { const v = grid.GF[i]; if (!(v & 64) && lawnIds.has(v & 63)) { data[i * 4 + 1] = 255; data[i * 4 + 3] = 255; any = true; } }
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
  tree.position.set(87.6, 66.15, 0.5);
  (groups["Courtyard_Paving"] || root).add(tree);
}

// room labels for the cutaways: every named room, per floor
function buildRoomLabels() {
  labelObjs.forEach(o => root.remove(o)); labelObjs.length = 0;
  FLOORS.forEach(k => {
    const areas = new Map();
    for (let i = 0; i < WD.W * WD.H; i++) { const v = grid[k][i]; if (v & 63) areas.set(v & 63, (areas.get(v & 63) || 0) + 1); }
    WD.floors[k].rooms.forEach((rm, i) => {
      const a = (areas.get(i + 1) || 0) * WD.C * WD.C;
      if (rm.k === "circ" || /Compound|Open to sky/.test(rm.n) || a < 70) return;
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
  entrancePin.center.set(0.5, 0.05); entrancePin.scale.set(36 * 0.5, 15 * 0.5, 1); entrancePin.position.set(86, 1.5, 14); entrancePin.renderOrder = 1000;
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
  requestAnimationFrame(drawMap);
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
  if (window.ResizeObserver) new ResizeObserver(() => { if (!document.getElementById("dirMap").hidden) drawMap(); }).observe(document.querySelector(".dm-body"));
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

// ================================================================ FURNITURE & PEOPLE (illustrative)
const FURN = window.FURNITURE || {};
function mat4(x, y, z, sx = 1, sy = 1, sz = 1, rz = 0, rx = 0) {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz, "ZXY"));
  return m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz));
}
function merge(parts) {
  const pos = [], nor = [];
  parts.forEach(([geo, m]) => {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(m);
    pos.push(g.attributes.position.array); nor.push(g.attributes.normal.array);
  });
  const n = pos.reduce((a, b) => a + b.length, 0), P = new Float32Array(n), N = new Float32Array(n);
  let o = 0; pos.forEach((a, i) => { P.set(a, o); N.set(nor[i], o); o += a.length; });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.BufferAttribute(N, 3));
  return g;
}
const BX = (w, d, h) => new THREE.BoxGeometry(w, d, h);
const CYL = (rt, rb, h, s = 14) => new THREE.CylinderGeometry(rt, rb, h, s).rotateX(Math.PI / 2);
const SPH = (r, a = 14, b = 10, t = Math.PI) => new THREE.SphereGeometry(r, a, b, 0, Math.PI * 2, 0, t).rotateX(Math.PI / 2);

function personGeoms(pose) {
  // facing +Y, origin on the floor. pose: "sit" (seat top 1.65 ft) or "stand"
  const S = { shirt: [], pants: [], skin: [], dark: [] };
  if (pose === "stand") {
    [-0.26, 0.26].forEach(x => {
      S.pants.push([BX(0.46, 0.5, 2.75), mat4(x, 0, 1.55)]);
      S.dark.push([BX(0.46, 0.85, 0.28), mat4(x, 0.12, 0.14)]);
      S.shirt.push([BX(0.3, 0.32, 2.05), mat4(x * 2.85, -0.02, 3.72, 1, 1, 1, 0, 0.05)]);
      S.skin.push([BX(0.26, 0.3, 0.36), mat4(x * 2.85, 0.02, 2.55)]);
    });
    S.shirt.push([CYL(0.6, 0.5, 2.1, 16), mat4(0, 0, 3.95, 1, 0.62, 1)]);
    S.skin.push([CYL(0.17, 0.17, 0.35, 10), mat4(0, 0, 5.15)]);
    S.skin.push([SPH(0.42), mat4(0, 0.02, 5.62, 0.9, 1, 1.12)]);
    S.dark.push([SPH(0.45, 14, 8, Math.PI * 0.55), mat4(0, -0.05, 5.68, 0.92, 1.03, 1.05)]);
  } else {
    [-0.28, 0.28].forEach(x => {
      S.pants.push([BX(0.5, 1.7, 0.46), mat4(x, 0.35, 1.9)]);
      S.pants.push([BX(0.44, 0.46, 1.72), mat4(x, 1.08, 0.9)]);
      S.dark.push([BX(0.46, 0.8, 0.28), mat4(x, 1.25, 0.14)]);
      S.shirt.push([BX(0.3, 0.3, 1.15), mat4(x * 2.55, -0.18, 3.2)]);
      S.shirt.push([BX(0.3, 1.2, 0.28), mat4(x * 2.25, 0.4, 2.62)]);
      S.skin.push([BX(0.26, 0.36, 0.2), mat4(x * 2.0, 1.12, 2.62)]);
    });
    S.shirt.push([CYL(0.6, 0.52, 2.0, 16), mat4(-0, -0.22, 3.1, 1, 0.62, 1, 0, -0.06)]);
    S.skin.push([CYL(0.17, 0.17, 0.35, 10), mat4(0, -0.2, 4.2)]);
    S.skin.push([SPH(0.42), mat4(0, -0.14, 4.66, 0.9, 1, 1.12)]);
    S.dark.push([SPH(0.45, 14, 8, Math.PI * 0.55), mat4(0, -0.2, 4.72, 0.92, 1.03, 1.05)]);
  }
  return Object.fromEntries(Object.entries(S).map(([k, v]) => [k, merge(v)]));
}

const FGEO = {};
function furnitureGeoms() {
  if (FGEO.desk) return FGEO;
  FGEO.desk = merge([[BX(5, 2.5, 0.12), mat4(0, 0, 2.44)]]);
  FGEO.deskFrame = merge([[BX(0.1, 2.3, 2.38), mat4(-2.4, 0, 1.19)], [BX(0.1, 2.3, 2.38), mat4(2.4, 0, 1.19)], [BX(4.7, 0.06, 1.5), mat4(0, 1.15, 1.6)]]);
  FGEO.mon = merge([[BX(1.9, 0.08, 1.12), mat4(0, 0.75, 3.35)], [BX(0.12, 0.12, 0.55), mat4(0, 0.8, 2.75)], [BX(0.6, 0.4, 0.04), mat4(0, 0.8, 2.52)], [BX(1.4, 0.45, 0.05), mat4(0, -0.35, 2.53)]]);
  FGEO.chair = merge([[BX(1.6, 1.55, 0.28), mat4(0, 0.05, 1.5)], [BX(1.55, 0.22, 1.75), mat4(0, -0.78, 2.5, 1, 1, 1, 0, -0.1)],
    [CYL(0.1, 0.1, 1.2, 8), mat4(0, 0, 0.8)], [BX(1.9, 0.14, 0.12), mat4(0, 0, 0.12)], [BX(0.14, 1.9, 0.12), mat4(0, 0, 0.12)]]);
  FGEO.tbl = merge([[BX(1, 1, 0.05), mat4(0, 0, 0.975)], [BX(0.02, 0.62, 0.95), mat4(-0.36, 0, 0.475)], [BX(0.02, 0.62, 0.95), mat4(0.36, 0, 0.475)]]);
  FGEO.rtbl = merge([[CYL(0.5, 0.5, 0.05, 28), mat4(0, 0, 0.975)], [CYL(0.05, 0.05, 0.95, 10), mat4(0, 0, 0.475)], [CYL(0.22, 0.24, 0.03, 20), mat4(0, 0, 0.015)]]);
  FGEO.sofa = merge([[BX(1, 2.6, 1.35), mat4(0, 0.1, 0.675)], [BX(1, 0.6, 1.4), mat4(0, -1.0, 2.0)], [BX(0.035, 2.8, 1.95), mat4(-0.49, 0, 0.98)], [BX(0.035, 2.8, 1.95), mat4(0.49, 0, 0.98)]]);
  FGEO.ctbl = merge([[BX(3, 2, 0.1), mat4(0, 0, 1.25)], [BX(2.6, 1.6, 0.08), mat4(0, 0, 0.4)], [BX(0.12, 0.12, 1.2), mat4(-1.35, -0.85, 0.6)], [BX(0.12, 0.12, 1.2), mat4(1.35, -0.85, 0.6)], [BX(0.12, 0.12, 1.2), mat4(-1.35, 0.85, 0.6)], [BX(0.12, 0.12, 1.2), mat4(1.35, 0.85, 0.6)]]);
  FGEO.counter = merge([[BX(1, 2.3, 3.4), mat4(0, 0, 1.7)], [BX(1.02, 2.7, 0.12), mat4(0, -0.1, 3.46)]]);
  FGEO.rack = merge([[BX(2, 3.4, 7), mat4(0, 0, 3.5)]]);
  FGEO.rug = merge([[BX(2.3, 4.0, 0.04), mat4(0, 0, 0.02)]]);
  FGEO.tread = merge([[BX(2.6, 6, 0.55), mat4(0, 0, 0.3)], [BX(0.12, 0.12, 3.6), mat4(-1.1, 2.6, 2.1)], [BX(0.12, 0.12, 3.6), mat4(1.1, 2.6, 2.1)], [BX(2.4, 0.5, 0.8), mat4(0, 2.7, 3.9, 1, 1, 1, 0, 0.4)]]);
  FGEO.pp = merge([[BX(5, 9, 0.12), mat4(0, 0, 2.5)], [BX(5.4, 0.04, 0.5), mat4(0, 0, 2.8)], [BX(4, 0.2, 2.4), mat4(0, -2.5, 1.2)], [BX(4, 0.2, 2.4), mat4(0, 2.5, 1.2)]]);
  FGEO.bed = merge([[BX(3, 6.5, 1.9), mat4(0, 0, 0.95)], [BX(2.4, 1.2, 0.4), mat4(0, 2.4, 2.1)]]);
  FGEO.gen = merge([[BX(10, 4.5, 5.2), mat4(0, 0, 2.9)], [BX(10.6, 5, 0.5), mat4(0, 0, 0.25)]]);
  FGEO.sit = personGeoms("sit"); FGEO.stand = personGeoms("stand");
  return FGEO;
}
const SHIRTS = [0xf2f2ee, 0xa9c4e0, 0x2d3e5c, 0x8a8f96, 0x7a2f3a, 0x6b7048, 0x2a2a2c, 0xd8a3a8, 0xcdb99a, 0x3f7f86, 0xe6e1d3, 0x5d7fa8];
const PANTS = [0x23262b, 0x2f3a4d, 0x5b5f66, 0x8b7a5e, 0x3a3a3a, 0x1f2a3a];
const SKINS = [0x8d5a3c, 0xa56d4b, 0xb97d57, 0xc68e68, 0x7a4b31, 0xd2a07c];
const HAIRS = [0x1a1512, 0x2a1d15, 0x3b2a1e, 0x101010, 0x4a4a4a];
const RUGS = [0x8c2f2f, 0x2f6b4f, 0x2f4f8c, 0x7a5a2a];
const FCOL = { desk: 0xcdb38f, deskFrame: 0x6b6f75, mon: 0x1c1f23, chair: 0x2c3035, tbl: 0x8a6a4a, rtbl: 0xefece5, ltbl: 0xf0c96a,
  sofa: 0x5a6e7e, ctbl: 0x8a6a4a, counter: 0xe8e2d6, rack: 0x202428, tread: 0x3a3e44, pp: 0x1f5f8b, bed: 0xf0f0ee, gen: 0xd8b13a };

function buildFurniture() {
  const G = furnitureGeoms();
  ["GF", "FF", "SF"].forEach(k => {
    const list = FURN[k] || []; if (!list.length) return;
    const name = k + "_Furniture", grp = new THREE.Group(); grp.name = name; root.add(grp); groups[name] = grp;
    const byType = {};
    list.forEach(it => (byType[it[0]] = byType[it[0]] || []).push(it));
    const add = (geo, items, colFn, matCol, xf, shadow = true) => {
      const m = new THREE.MeshStandardMaterial({ color: matCol === undefined ? 0xffffff : matCol, roughness: 0.72, metalness: 0 });
      m.userData.baseEnv = 0.8; m.envMapIntensity = 0.8; envMats.push(m);
      const im = new THREE.InstancedMesh(geo, m, items.length);
      items.forEach((it, i) => {
        const [t, x, y, z, yaw, sx, sy, sz, c] = it;
        const e = (xf && xf(it)) || {};
        im.setMatrixAt(i, mat4(x + (e.dx || 0), y + (e.dy || 0), z + (e.dz || 0), e.sx || sx, e.sy || sy, e.sz || sz, yaw));
        if (colFn) im.setColorAt(i, new THREE.Color(colFn(it, i)));
      });
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.castShadow = shadow; im.receiveShadow = true;
      im.userData.baseColor = m.color.clone(); im.userData.furniture = true;
      grp.add(im);
    };
    const pick = (arr, c, salt) => arr[Math.abs(Math.floor(c * 7919 + salt * 104729)) % arr.length];
    Object.entries(byType).forEach(([t, items]) => {
      if (t === "desk") { add(G.desk, items, null, FCOL.desk); add(G.deskFrame, items, null, FCOL.deskFrame); }
      else if (t === "chair" || t === "kchair") add(G.chair, items, null, t === "kchair" ? 0xe07a4a : FCOL.chair, it => t === "kchair" ? { sx: 0.62, sy: 0.62, sz: 0.62 } : null);
      else if (t === "rug") add(G.rug, items, (it, i) => RUGS[i % RUGS.length], undefined, null, false);
      else if (t === "ltbl") add(G.rtbl, items, null, FCOL.ltbl);
      else if (t === "psit" || t === "pst" || t === "psofa") {
        const geo = t === "pst" ? G.stand : G.sit;
        const xf = t === "psofa" ? (it) => ({ dz: -0.28, dy: 0.15 }) : null;
        add(geo.shirt, items, (it) => pick(SHIRTS, it[8], 1), undefined, xf);
        add(geo.pants, items, (it) => pick(PANTS, it[8], 2), undefined, xf);
        add(geo.skin, items, (it) => pick(SKINS, it[8], 3), undefined, xf);
        add(geo.dark, items, (it) => pick(HAIRS, it[8], 4), undefined, xf);
      }
      else if (G[t]) add(G[t], items, null, FCOL[t]);
    });
  });
  LAYER_GROUPS["Ground floor"].push("GF_Furniture");
  LAYER_GROUPS["First floor"].push("FF_Furniture");
  LAYER_GROUPS["Second floor"].push("SF_Furniture");
  LAYER_GROUPS["Furniture & people"] = ["GF_Furniture", "FF_Furniture", "SF_Furniture"];
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
    if (v & 128) col = (v & 63) ? cols[(v & 63) - 1] : [236, 235, 230];
    else if ((v & 63) && (v & 64)) { const b = cols[(v & 63) - 1]; col = [b[0] * 0.62, b[1] * 0.62, b[2] * 0.62]; }
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
  if (NAV.path && NAV.pathFloor === W8.floor) {
    g.strokeStyle = "#ff6a2b"; g.lineWidth = 2.5 * devicePixelRatio; g.beginPath();
    NAV.path.forEach(([x, y], i) => { const a = x / WD.C * s, b = (WD.H - y / WD.C) * s; i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.stroke();
  }
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
  for (let i = 2; i >= 1; i--) { const k = FLOORS[i]; if ((cell(k, x, y) & 64) && fflAt(k, x, y) <= z + 0.6) return k; }
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
        const f2 = FLY_SPEED / (K.ShiftLeft || K.ShiftRight ? WALK_SPEED : RUN_SPEED);
        W8.x = clamp(W8.x + dx * f2, -40, 190); W8.y = clamp(W8.y + dy * f2, -40, 170);
      } else if (!canStand(k, W8.x, W8.y)) { W8.x += dx; W8.y += dy; }   // stuck inside something: let the walker out
      else if (canStand(k, W8.x + dx, W8.y + dy)) { W8.x += dx; W8.y += dy; }
      else if (canStand(k, W8.x + dx, W8.y)) W8.x += dx;
      else if (canStand(k, W8.x, W8.y + dy)) W8.y += dy;
      W8.bob += dt * (K.ShiftLeft || K.ShiftRight ? 12 : 8) * Math.min(mag, 1);
      if (!hintHidden) showHint(false);
    }
  }
  if (W8.fly) {
    const K = W8.keys, up = (K.Space || W8.upBtn ? 1 : 0) - (K.KeyC || K.ControlLeft || W8.dnBtn ? 1 : 0);
    W8.z = clamp(W8.z + up * FLY_SPEED * 0.7 * dt, -0.5, 70);
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
    if (e.code === "Space" || e.code === "KeyC" || e.code === "ControlLeft") {
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

window.__api = { setView, setMode, setLabels, setPreset, groups: () => groups,
  setTime: (h, doy) => { if (doy) { light.doy = doy; buildSunPath(); paintTrack(); } light.hour = h; light.preset = "custom"; applyLight(); },
  setPath: (on) => { light.path = on; applyLight(); },
  enterWalk, exitWalk, tourGo, startTour, walkState: () => ({ ...W8, keys: undefined }),
  walkTo: (f, x, y, yaw, pitch) => placeAt(f, x, y, yaw || 0, pitch || 0),
  press: (code, on) => { W8.keys[code] = on; },
  canStand: (f, x, y) => canStand(f, x, y), setRoute, openMap, closeMap, selectRoom, navState: () => ({ path: NAV.path, target: NAV.target }), setFly: (on) => setFly(on), cellAt: (f, x, y) => cell(f, x, y),
  setLamps: (on) => { light.lampsManual = on; applyLight(); },
  hideUI: (on) => { ["hud","panel","readout","timebar"].forEach(id => { const e=document.getElementById(id); if(e) e.style.display = on ? "none" : ""; }); },
  shot: () => { renderer.render(scene, camera); return true; } };
init();
})();
