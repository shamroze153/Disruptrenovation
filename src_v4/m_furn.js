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
