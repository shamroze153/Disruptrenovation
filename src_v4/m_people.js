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
