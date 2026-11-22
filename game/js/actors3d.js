// Multi-part Three.js 3D museum architecture, furniture, articulated actors, and wall-clipped cones.

import * as THREE from '../vendor/three.module.min.js';
import { ARENA } from './vaults.js';
import { get3DTheme, getBeamAlphaTexture, getFloorMaterials, getWallTexture, to3D, WORLD_SCALE } from './materials3d.js';

export function buildVaultSceneObjects(state) {
  const vault = state.vault;
  const spec = get3DTheme(vault.theme);
  const root = new THREE.Group();

  // Shared PBR materials
  const brassMat = new THREE.MeshStandardMaterial({ color: spec.trimHex, metalness: 0.82, roughness: 0.24 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x161f2e, metalness: 0.65, roughness: 0.35 });
  const wallTex = getWallTexture();
  const wallMat = new THREE.MeshStandardMaterial({
    color: spec.wallHex,
    map: wallTex,
    roughness: 0.42,
    metalness: 0.18,
  });
  const wallTopMat = new THREE.MeshStandardMaterial({ color: spec.wallTopHex, roughness: 0.35, metalness: 0.25 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xbceeff,
    transparent: true,
    opacity: 0.28,
    roughness: 0.08,
    metalness: 0.1,
    depthWrite: false,
  });

  // 1. Sub-floor base & textured glossy floor slab
  const floorW = ARENA.w * WORLD_SCALE;
  const floorD = ARENA.h * WORLD_SCALE;
  const floorCenter = to3D(ARENA.x + ARENA.w * 0.5, ARENA.y + ARENA.h * 0.5, 0);

  // Dark museum exterior apron extending past walls
  const apron = new THREE.Mesh(
    new THREE.PlaneGeometry(140, 90),
    new THREE.MeshStandardMaterial({ color: spec.bg, roughness: 0.9, metalness: 0.05 }),
  );
  apron.rotation.x = -Math.PI * 0.5;
  apron.position.set(0, -0.55, 0);
  root.add(apron);

  const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(floorW, floorD), getFloorMaterials(vault));
  floorMesh.rotation.x = -Math.PI * 0.5;
  floorMesh.position.set(floorCenter.x, 0, floorCenter.z);
  floorMesh.receiveShadow = true;
  floorMesh.userData.keepMaterial = true;
  root.add(floorMesh);

  // Animated giant 3D clockwork gears turning beneath the sapphire glass floor in Vault 4
  const underCogs = [];
  if (vault.theme === 'spire') {
    const cogSpecs = [
      { x: 400, y: 358, r: 5.8, teeth: 18, speed: 0.18, col: 0x6ab4f0 },
      { x: 696, y: 358, r: 7.0, teeth: 22, speed: -0.14, col: 0xdfb45a },
      { x: 1096, y: 358, r: 6.2, teeth: 20, speed: 0.16, col: 0x7ad6ff },
    ];
    for (const cs of cogSpecs) {
      const grp = buildClockworkCog3D(cs.r, cs.teeth, cs.col);
      const pos = to3D(cs.x, cs.y, -0.34);
      grp.position.copy(pos);
      grp.userData.speed = cs.speed;
      root.add(grp);
      underCogs.push(grp);
    }
  }

  // Silky gradient-faded 3D volumetric skylight shafts in Vault 2 (zero hard cylinder edges!)
  const beamAlpha = getBeamAlphaTexture();
  if (vault.theme === 'conservatory') {
    const shaftMat = new THREE.MeshBasicMaterial({
      color: 0xc8ffe0,
      alphaMap: beamAlpha,
      transparent: true,
      opacity: 0.11,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    for (const sx of [320, 630, 910]) {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 4.8, 12.5, 16, 1, true), shaftMat);
      const p = to3D(sx, 360, 4.4);
      shaft.position.copy(p);
      shaft.rotation.z = -0.3;
      shaft.rotation.x = 0.12;
      root.add(shaft);
    }
  }

  // 2. 3D Architectural Walls (low front cutaway curb on South perimeter for crystal-clear 3/4 view!)
  const southThreshold = ARENA.y + ARENA.h - ARENA.wall - 2;
  for (const w of state.walls) {
    const isSouthPerim = w.perimeter && w.y >= southThreshold;
    const h = isSouthPerim ? 0.58 : w.perimeter ? 3.05 : 2.05;
    const bw = w.w * WORLD_SCALE;
    const bd = w.h * WORLD_SCALE;
    const p = to3D(w.x + w.w * 0.5, w.y + w.h * 0.5, h * 0.5);

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(bw, h, bd), wallMat);
    mesh.position.copy(p);
    mesh.castShadow = !isSouthPerim;
    mesh.receiveShadow = true;
    root.add(mesh);

    // Gilded Art-Deco cornice cap
    const cap = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.08, 0.14, bd + 0.08), brassMat);
    cap.position.set(p.x, h + 0.05, p.z);
    cap.castShadow = !isSouthPerim;
    root.add(cap);

    const innerCap = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.1, bw - 0.16), 0.06, Math.max(0.1, bd - 0.16)), wallTopMat);
    innerCap.position.set(p.x, h + 0.12, p.z);
    root.add(innerCap);
  }

  // Warm Art-Deco wall sconces along the North museum wall
  const sconceMat = new THREE.MeshStandardMaterial({ color: 0xffe8a6, emissive: 0xffc65c, emissiveIntensity: 1.6 });
  for (const sx of [210, 480, 790, 1080]) {
    const sp = to3D(sx, ARENA.y + ARENA.wall + 4, 2.05);
    const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.1, 0.55, 8), sconceMat);
    bulb.position.copy(sp);
    root.add(bulb);
  }

  // 3. 3D Luxury Museum & Vault Props (Display Cases, Fluted Columns, Botanical Planters, Desks, Plinths)
  const spinningRelics = [];
  const propMap = new Map();
  for (const prop of state.props) {
    const built = buildProp3D(prop, brassMat, glassMat, wallTopMat);
    root.add(built.group);
    propMap.set(prop, built);
    if (built.relic) spinningRelics.push(built.relic);
  }

  // 4. Floor-embedded 3D Power Conduits (Relay -> Laser) + 3D Relay Switchboards + 3D Vents
  const relayNodes = [];
  for (const r of state.relays) {
    const built = buildRelayAndConduit3D(r, brassMat, darkMetalMat);
    root.add(built.group);
    relayNodes.push({ data: r, ...built });
  }

  const ventNodes = [];
  const drawnPairs = new Set();
  for (const v of state.vents) {
    const built = buildVent3D(v, brassMat, darkMetalMat);
    root.add(built);
    ventNodes.push(v);

    const key = [v.id, v.pairId].sort().join(':');
    if (!drawnPairs.has(key)) {
      drawnPairs.add(key);
      const o = state.vents.find((x) => x.id === v.pairId);
      if (o) {
        const ductY = v.y < 300 ? ARENA.y + 26 : ARENA.y + ARENA.h - 26;
        const pts = [to3D(v.x, v.y, 0.05), to3D(v.x, ductY, 0.05), to3D(o.x, ductY, 0.05), to3D(o.x, o.y, 0.05)];
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const line = new THREE.Line(
          geo,
          new THREE.LineDashedMaterial({ color: 0x4aece0, dashSize: 0.7, gapSize: 0.55, transparent: true, opacity: 0.45 }),
        );
        line.computeLineDistances();
        root.add(line);
      }
    }
  }

  // 5. 3D Crimson Laser Gates
  const laserNodes = [];
  for (const l of state.lasers) {
    const built = buildLaserGate3D(l, brassMat);
    root.add(built.group);
    laserNodes.push({ data: l, ...built });
  }

  // 6. 3D Centerpiece Vault Loot Pedestal + Overhead Museum Spotlight Shaft + Bonus Relics
  const loot3D = buildVaultLoot3D(state.loot, brassMat, glassMat, spec.lootSpot);
  root.add(loot3D.group);

  const bonusNodes = [];
  for (const b of state.bonuses) {
    const built = buildBonusRelic3D(b, brassMat);
    root.add(built.group);
    bonusNodes.push({ data: b, ...built });
  }

  // 7. 3D Extraction Lift Platform
  const exit3D = buildExitLift3D(state.exit, brassMat);
  root.add(exit3D.group);

  // 8. 3D Wall-Mounted CCTV Cameras + Wall-Clipped Volumetric Cyan Cones
  const cameraNodes = [];
  for (const cam of state.cameras) {
    const built = buildCamera3D(cam, brassMat, darkMetalMat);
    root.add(built.group);
    root.add(built.cone.group);
    cameraNodes.push({ data: cam, ...built });
  }

  // 9. Articulated 3D Uniformed Guards + Wall-Clipped Volumetric Flashlight Cones
  const guardNodes = [];
  for (const g of state.guards) {
    const built = buildGuard3D(spec.guardCoat, brassMat);
    root.add(built.group);
    root.add(built.cone.group);
    guardNodes.push({ data: g, ...built });
  }

  // 10. Articulated 3D Trenchcoat & Fedora Thief + Dynamic Cover Ring
  const thief3D = buildThief3D(brassMat);
  root.add(thief3D.group);
  root.add(thief3D.coverRing);

  return {
    root,
    underCogs,
    spinningRelics,
    propMap,
    relayNodes,
    laserNodes,
    loot3D,
    bonusNodes,
    exit3D,
    cameraNodes,
    guardNodes,
    thief3D,
  };
}

function buildClockworkCog3D(r, teeth, hex) {
  const grp = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: hex,
    emissive: hex,
    emissiveIntensity: 0.28,
    metalness: 0.85,
    roughness: 0.25,
  });
  const outer = new THREE.Mesh(new THREE.TorusGeometry(r, 0.26, 8, 36), mat);
  outer.rotation.x = Math.PI * 0.5;
  grp.add(outer);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(r * 0.54, 0.22, 8, 28), mat);
  inner.rotation.x = Math.PI * 0.5;
  grp.add(inner);

  const toothGeo = new THREE.BoxGeometry(0.42, 0.28, 0.72);
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const t = new THREE.Mesh(toothGeo, mat);
    t.position.set(Math.cos(a) * (r + 0.34), 0, Math.sin(a) * (r + 0.34));
    t.rotation.y = -a + Math.PI * 0.5;
    grp.add(t);
  }
  const spokeGeo = new THREE.BoxGeometry(r * 2, 0.2, 0.26);
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(spokeGeo, mat);
    s.rotation.y = (i / 3) * Math.PI;
    grp.add(s);
  }
  return grp;
}

function buildProp3D(p, brassMat, glassMat, stoneMat) {
  const grp = new THREE.Group();
  const bw = p.w * WORLD_SCALE;
  const bd = p.h * WORLD_SCALE;
  const pos = to3D(p.x + p.w * 0.5, p.y + p.h * 0.5, 0);
  grp.position.set(pos.x, 0, pos.z);
  let relic = null;

  if (p.kind === 'column') {
    const r = Math.min(bw, bd) * 0.48;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.15, r * 1.22, 0.28, 12), stoneMat);
    base.position.y = 0.14;
    base.castShadow = true;
    grp.add(base);

    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.92, r * 0.98, 2.35, 12),
      new THREE.MeshStandardMaterial({ color: 0xbac4d6, roughness: 0.32, metalness: 0.15 }),
    );
    shaft.position.y = 1.4;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    grp.add(shaft);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.18, r * 0.95, 0.28, 12), brassMat);
    cap.position.y = 2.66;
    cap.castShadow = true;
    grp.add(cap);
  } else if (p.kind === 'planter') {
    const trough = new THREE.Mesh(
      new THREE.BoxGeometry(bw, 0.85, bd),
      new THREE.MeshStandardMaterial({ color: 0x264e3f, roughness: 0.4, metalness: 0.18 }),
    );
    trough.position.y = 0.42;
    trough.castShadow = true;
    trough.receiveShadow = true;
    grp.add(trough);

    const rim = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.1, 0.1, bd + 0.1), brassMat);
    rim.position.y = 0.86;
    grp.add(rim);

    const leafMat1 = new THREE.MeshStandardMaterial({ color: 0x2cb472, roughness: 0.5 });
    const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x1b8a54, roughness: 0.55 });
    const blossomMat = new THREE.MeshStandardMaterial({ color: 0xffe074, emissive: 0xc29224, emissiveIntensity: 0.45 });
    const centers = bw > bd ? [[-bw * 0.24, 0], [bw * 0.24, 0]] : [[0, -bd * 0.24], [0, bd * 0.24]];
    for (const [cx, cz] of centers) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const frond = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.95, 5), i % 2 === 0 ? leafMat1 : leafMat2);
        frond.position.set(cx + Math.cos(a) * 0.34, 1.12, cz + Math.sin(a) * 0.34);
        frond.rotation.z = -Math.cos(a) * 0.72;
        frond.rotation.x = Math.sin(a) * 0.72;
        frond.castShadow = true;
        grp.add(frond);
      }
      const flower = new THREE.Mesh(new THREE.OctahedronGeometry(0.18), blossomMat);
      flower.position.set(cx, 1.32, cz);
      grp.add(flower);
    }
  } else if (p.kind === 'desk') {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c271b, roughness: 0.36, metalness: 0.12 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(bw, 1.0, bd), woodMat);
    body.position.y = 0.5;
    body.castShadow = true;
    body.receiveShadow = true;
    grp.add(body);

    const trim = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.08, 0.08, bd + 0.08), brassMat);
    trim.position.y = 1.02;
    grp.add(trim);

    const blotter = new THREE.Mesh(
      new THREE.BoxGeometry(bw * 0.48, 0.04, bd * 0.68),
      new THREE.MeshStandardMaterial({ color: 0x16563c, roughness: 0.8 }),
    );
    blotter.position.set(-bw * 0.16, 1.08, 0);
    grp.add(blotter);

    // Banker lamp + glowing emerald glass shade
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 0.42, 8), brassMat);
    stem.position.set(bw * 0.28, 1.24, -bd * 0.1);
    grp.add(stem);
    const shade = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.22, 0.28),
      new THREE.MeshStandardMaterial({ color: 0x3ef09e, emissive: 0x22c87a, emissiveIntensity: 0.9 }),
    );
    shade.position.set(bw * 0.28, 1.48, -bd * 0.1);
    grp.add(shade);

    // Stacked gleaming gold bars
    for (let i = 0; i < 3; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.16), brassMat);
      bar.position.set(bw * 0.08, 1.12 + (i === 2 ? 0.12 : 0), i === 1 ? 0.2 : 0.02);
      grp.add(bar);
    }
  } else if (p.kind === 'plinth') {
    const ped = new THREE.Mesh(
      new THREE.BoxGeometry(bw, 1.1, bd),
      new THREE.MeshStandardMaterial({ color: 0x2e1a32, roughness: 0.5, metalness: 0.15 }),
    );
    ped.position.y = 0.55;
    ped.castShadow = true;
    ped.receiveShadow = true;
    grp.add(ped);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.08, 0.1, bd + 0.08), brassMat);
    cap.position.y = 1.12;
    grp.add(cap);

    // Rotating bronze astrolabe sculpture
    relic = new THREE.Group();
    relic.position.y = 1.72;
    const r1 = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.05, 8, 24), brassMat);
    const r2 = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.045, 8, 24), brassMat);
    r2.rotation.x = Math.PI * 0.35;
    r2.rotation.y = 0.6;
    relic.add(r1, r2);
    grp.add(relic);
  } else {
    // Mahogany & Glass Museum Display Case with illuminated 3D artifact inside!
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c2619, roughness: 0.35, metalness: 0.14 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.92, bd), woodMat);
    base.position.y = 0.46;
    base.castShadow = true;
    base.receiveShadow = true;
    grp.add(base);

    const rim = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.08, 0.1, bd + 0.08), brassMat);
    rim.position.y = 0.95;
    grp.add(rim);

    // Glass vitrine hood
    const hood = new THREE.Mesh(new THREE.BoxGeometry(bw - 0.16, 0.82, bd - 0.16), glassMat);
    hood.position.y = 1.4;
    grp.add(hood);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(bw - 0.15, 0.82, bd - 0.15)),
      new THREE.LineBasicMaterial({ color: 0xefd088, transparent: true, opacity: 0.65 }),
    );
    edges.position.y = 1.4;
    grp.add(edges);

    // Illuminated artifact rotating inside case
    const artCol = p.artifact === 'gem' ? 0x52ffe6 : p.artifact === 'scroll' ? 0xffe4a0 : 0xffd862;
    const artMat = new THREE.MeshStandardMaterial({
      color: artCol,
      emissive: artCol,
      emissiveIntensity: 0.72,
      metalness: 0.6,
      roughness: 0.2,
    });
    relic = new THREE.Mesh(
      p.artifact === 'scroll' ? new THREE.CylinderGeometry(0.14, 0.14, 0.9, 10) : new THREE.OctahedronGeometry(0.32),
      artMat,
    );
    if (p.artifact === 'scroll') relic.rotation.z = Math.PI * 0.5;
    relic.position.y = 1.38;
    grp.add(relic);
  }

  // Dynamic highlight frame shown ONLY when thief hugs this cover piece
  const coverHighlight = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(bw + 0.45, 0.06, bd + 0.45)),
    new THREE.LineBasicMaterial({ color: 0x48ffe8, transparent: true, opacity: 0.85 }),
  );
  coverHighlight.position.y = 0.06;
  coverHighlight.visible = false;
  grp.add(coverHighlight);

  return { group: grp, relic, coverHighlight };
}

function buildRelayAndConduit3D(r, brassMat, darkMetalMat) {
  const grp = new THREE.Group();
  const pos = to3D(r.x, r.y, 0);

  const box = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.3, 0.7), darkMetalMat);
  box.position.set(pos.x, 0.65, pos.z);
  box.castShadow = true;
  grp.add(box);

  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.12, 0.8), brassMat);
  frame.position.set(pos.x, 1.32, pos.z);
  grp.add(frame);

  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xff405c, emissive: 0xff2c4e, emissiveIntensity: 1.8 });
  const bulb1 = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), bulbMat);
  bulb1.position.set(pos.x - 0.26, 1.44, pos.z);
  const bulb2 = bulb1.clone();
  bulb2.position.set(pos.x + 0.26, 1.44, pos.z);
  grp.add(bulb1, bulb2);

  // Glowing 3D floor-embedded power conduit tubes visibly linking Relay -> Laser Gate!
  const conduitMat = new THREE.MeshStandardMaterial({
    color: 0xff5268,
    emissive: 0xff3654,
    emissiveIntensity: 1.4,
    roughness: 0.25,
  });
  const pts = r.conduit || [];
  for (let i = 1; i < pts.length; i++) {
    const a = to3D(pts[i - 1][0], pts[i - 1][1], 0.05);
    const b = to3D(pts[i][0], pts[i][1], 0.05);
    const len = a.distanceTo(b);
    const seg = new THREE.Mesh(new THREE.BoxGeometry(len + 0.12, 0.08, 0.16), conduitMat);
    seg.position.copy(a).lerp(b, 0.5);
    seg.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
    grp.add(seg);
  }

  return { group: grp, bulbMat, conduitMat };
}

function buildVent3D(v, brassMat, darkMetalMat) {
  const grp = new THREE.Group();
  const pos = to3D(v.x, v.y, 0.04);
  grp.position.copy(pos);

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.08, 1.45), darkMetalMat);
  grp.add(base);
  const frame = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.5, 0.1, 1.5)),
    new THREE.LineBasicMaterial({ color: 0x4ef6e8 }),
  );
  grp.add(frame);
  for (let i = -2; i <= 2; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.1, 0.08), brassMat);
    slat.position.z = i * 0.24;
    grp.add(slat);
  }
  return grp;
}

function buildLaserGate3D(l, brassMat) {
  const grp = new THREE.Group();
  const a = to3D(l.x1, l.y1, 0);
  const b = to3D(l.x2, l.y2, 0);
  const len = a.distanceTo(b);
  const mid = a.clone().lerp(b, 0.5);
  const yaw = -Math.atan2(b.z - a.z, b.x - a.x);

  // Twin brass laser emitter pylons
  for (const pt of [a, b]) {
    const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 2.0, 10), brassMat);
    pylon.position.set(pt.x, 1.0, pt.z);
    pylon.castShadow = true;
    grp.add(pylon);
  }

  // Triple crackling 3D horizontal crimson laser beams + glowing core sheet
  const beams = new THREE.Group();
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xff2848 });
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xff3054,
    transparent: true,
    opacity: 0.24,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  for (const bh of [0.48, 1.05, 1.62]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, len, 8), beamMat);
    rod.position.set(mid.x, bh, mid.z);
    rod.rotation.z = Math.PI * 0.5;
    rod.rotation.y = yaw;
    beams.add(rod);
  }
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(len, 1.45), glowMat);
  sheet.position.set(mid.x, 1.05, mid.z);
  sheet.rotation.y = yaw;
  beams.add(sheet);
  grp.add(beams);

  return { group: grp, beams, glowMat };
}

function buildVaultLoot3D(loot, brassMat, glassMat, spotHex) {
  const grp = new THREE.Group();
  const pos = to3D(loot.x, loot.y, 0);
  grp.position.set(pos.x, 0, pos.z);

  // Stepped gilded octagonal sanctuary pedestal
  const step1 = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.75, 0.35, 8), new THREE.MeshStandardMaterial({ color: 0x1a1522, roughness: 0.3 }));
  step1.position.y = 0.17;
  step1.receiveShadow = true;
  grp.add(step1);

  const step2 = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 0.72, 8), brassMat);
  step2.position.y = 0.68;
  step2.castShadow = true;
  grp.add(step2);

  // Rotating glass vitrine & holographic rings
  const vitrine = new THREE.Group();
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 1.65, 8), glassMat);
  hood.position.y = 1.88;
  vitrine.add(hood);

  const ring1 = new THREE.Mesh(
    new THREE.TorusGeometry(1.38, 0.045, 8, 36),
    new THREE.MeshBasicMaterial({ color: 0xffe06e, transparent: true, opacity: 0.85 }),
  );
  ring1.rotation.x = Math.PI * 0.5;
  ring1.position.y = 1.25;
  const ring2 = new THREE.Mesh(
    new THREE.TorusGeometry(1.18, 0.035, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0x76ecff, transparent: true, opacity: 0.65 }),
  );
  ring2.rotation.x = Math.PI * 0.36;
  ring2.position.y = 1.88;
  vitrine.add(ring1, ring2);

  // Centerpiece 3D artifact mesh
  const relic = new THREE.Group();
  relic.position.y = 1.88;
  const goldGlow = new THREE.MeshStandardMaterial({ color: 0xffe070, emissive: 0xffb224, emissiveIntensity: 0.9, metalness: 0.8, roughness: 0.16 });

  if (loot.kind === 'crown') {
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.56),
      new THREE.MeshStandardMaterial({ color: 0x36ff9f, emissive: 0x12c872, emissiveIntensity: 0.95, metalness: 0.3, roughness: 0.1 }),
    );
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.09, 8, 20), goldGlow);
    band.rotation.x = Math.PI * 0.5;
    relic.add(gem, band);
  } else if (loot.kind === 'scepter') {
    const ruby = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.52),
      new THREE.MeshStandardMaterial({ color: 0xff365e, emissive: 0xd8123c, emissiveIntensity: 1.0, metalness: 0.25, roughness: 0.1 }),
    );
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.07, 8, 24), goldGlow);
    relic.add(ruby, halo);
  } else if (loot.kind === 'orrery') {
    const sun = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), goldGlow);
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.045, 8, 28), new THREE.MeshBasicMaterial({ color: 0x7ceeff }));
    orbit.rotation.x = Math.PI * 0.42;
    const planet = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), new THREE.MeshStandardMaterial({ color: 0x62e8ff, emissive: 0x34c6ff, emissiveIntensity: 1.0 }));
    planet.position.set(0.84, 0, 0);
    relic.add(sun, orbit, planet);
  } else {
    // Astral Chronometer
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.55), goldGlow);
    const dial = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.07, 8, 24), goldGlow);
    dial.rotation.x = Math.PI * 0.25;
    relic.add(core, dial);
  }
  vitrine.add(relic);

  // Silky gradient-faded overhead museum spotlight shaft!
  const shaft = new THREE.Mesh(
    new THREE.ConeGeometry(2.6, 9.8, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color: spotHex,
      alphaMap: getBeamAlphaTexture(),
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  shaft.position.y = 4.9;
  vitrine.add(shaft);

  const light = new THREE.PointLight(spotHex, 3.6, 14, 1.5);
  light.position.y = 3.2;
  vitrine.add(light);

  grp.add(vitrine);

  // Rotary lock-breach progress ring on floor
  const breachRing = new THREE.Mesh(
    new THREE.RingGeometry(1.75, 2.02, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
  );
  breachRing.rotation.x = -Math.PI * 0.5;
  breachRing.position.y = 0.08;
  breachRing.visible = false;
  grp.add(breachRing);

  return { group: grp, vitrine, relic, ring1, ring2, breachRing };
}

function buildBonusRelic3D(b, brassMat) {
  const grp = new THREE.Group();
  const pos = to3D(b.x, b.y, 0);
  grp.position.set(pos.x, 0, pos.z);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.55, 8), brassMat);
  ped.position.y = 0.28;
  grp.add(ped);
  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.36),
    new THREE.MeshStandardMaterial({ color: 0xffe06e, emissive: 0xffb82c, emissiveIntensity: 0.95 }),
  );
  gem.position.y = 0.95;
  grp.add(gem);
  return { group: grp, gem };
}

function buildExitLift3D(ex, brassMat) {
  const grp = new THREE.Group();
  const pos = to3D(ex.x, ex.y, 0);
  grp.position.set(pos.x, 0, pos.z);

  const padMat = new THREE.MeshStandardMaterial({ color: 0x103628, emissive: 0x168056, emissiveIntensity: 0.6, roughness: 0.3 });
  const pad = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 2.1), padMat);
  pad.position.y = 0.08;
  grp.add(pad);

  const border = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.12, 2.25), brassMat);
  border.position.y = 0.04;
  grp.add(border);

  // Silky gradient-faded emerald extraction beacon column
  const beaconMat = new THREE.MeshBasicMaterial({
    color: 0x36ff9e,
    alphaMap: getBeamAlphaTexture(),
    transparent: true,
    opacity: 0.26,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.3, 4.8, 18, 1, true), beaconMat);
  beacon.position.y = 2.4;
  grp.add(beacon);

  const light = new THREE.PointLight(0x36ff9e, 1.4, 10, 1.5);
  light.position.y = 2.2;
  grp.add(light);

  return { group: grp, padMat, beaconMat, beacon, light };
}

function buildCamera3D(cam, brassMat, darkMetalMat) {
  const grp = new THREE.Group();
  const pos = to3D(cam.x, cam.y, 2.25);
  grp.position.copy(pos);

  const head = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.48, 0.56), darkMetalMat);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.1, 0.6), brassMat);
  trim.position.y = 0.25;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.45, 10), darkMetalMat);
  barrel.rotation.z = Math.PI * 0.5;
  barrel.position.x = 0.56;
  const ledMat = new THREE.MeshBasicMaterial({ color: 0xff3452 });
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), ledMat);
  led.position.set(0.76, 0.04, 0);
  head.add(body, trim, barrel, led);
  grp.add(head);

  const cone = createVolumetricCone3D(0x38e4ff, 0.34, 2.1);
  return { group: grp, head, ledMat, cone };
}

function buildGuard3D(coatHex, brassMat) {
  const grp = new THREE.Group();
  const coatMat = new THREE.MeshStandardMaterial({ color: coatHex, roughness: 0.48, metalness: 0.18 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x111826, roughness: 0.5 });

  // Legs
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.14, 0.72, 8), darkMat);
  legL.position.set(0, 0.36, -0.22);
  legL.castShadow = true;
  const legR = legL.clone();
  legR.position.z = 0.22;

  // Broad-shouldered uniformed torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.56, 1.02, 10), coatMat);
  torso.position.y = 1.15;
  torso.scale.set(0.76, 1, 1.24);
  torso.castShadow = true;

  // Gilded brass shoulder epaulets
  const epL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.34), brassMat);
  epL.position.set(0, 1.62, -0.58);
  const epR = epL.clone();
  epR.position.z = 0.58;

  // Extended right flashlight arm + brass flashlight barrel + glowing lens
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.2, 0.2), coatMat);
  armR.position.set(0.45, 1.32, 0.46);
  const torch = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.44, 8), brassMat);
  torch.rotation.z = Math.PI * 0.5;
  torch.position.set(0.86, 1.32, 0.46);
  const lensMat = new THREE.MeshBasicMaterial({ color: 0xfff0a8 });
  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), lensMat);
  lens.position.set(1.08, 1.32, 0.46);

  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.2, 0.2), coatMat);
  armL.position.set(0.16, 1.22, -0.52);

  // Peaked officer cap + brass crest
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), new THREE.MeshStandardMaterial({ color: 0xe6c4a4, roughness: 0.6 }));
  head.position.y = 1.88;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.34, 0.22, 12), darkMat);
  cap.position.y = 2.08;
  cap.castShadow = true;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.48), darkMat);
  visor.position.set(0.26, 1.98, 0);
  const badge = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), brassMat);
  badge.position.set(0.35, 2.08, 0);

  grp.add(legL, legR, torso, epL, epR, armR, armL, torch, lens, head, cap, visor, badge);
  grp.scale.setScalar(1.18);

  const cone = createVolumetricCone3D(0xffbe48, 0.38, 1.48);
  return { group: grp, coatMat, lensMat, legL, legR, baseCoat: coatHex, cone };
}

function buildThief3D(brassMat) {
  const grp = new THREE.Group();
  const coatMat = new THREE.MeshStandardMaterial({ color: 0x162b4a, emissive: 0x0b1a30, emissiveIntensity: 0.35, roughness: 0.38, metalness: 0.22 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xf8f0d8, roughness: 0.3 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.45 });

  const body = new THREE.Group();

  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.68, 8), darkMat);
  legL.position.set(0, 0.34, -0.2);
  const legR = legL.clone();
  legR.position.z = 0.2;

  // Tailored flaring trenchcoat torso
  const coat = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.24, 10), coatMat);
  coat.position.y = 1.02;
  coat.scale.set(0.84, 1, 1.12);
  coat.castShadow = true;

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.07, 8, 16), trimMat);
  collar.rotation.x = Math.PI * 0.5;
  collar.position.y = 1.62;

  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.18), coatMat);
  armL.position.set(0.24, 1.28, -0.46);
  const armR = armL.clone();
  armR.position.z = 0.46;

  // Iconic wide-brim Art-Deco fedora + gold hatband + glowing cyan night-visor goggles!
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), darkMat);
  head.position.y = 1.84;
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.62, 0.07, 16), darkMat);
  brim.position.y = 1.98;
  brim.castShadow = true;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.3, 14), darkMat);
  crown.position.y = 2.14;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.08, 14), brassMat);
  band.position.y = 2.04;

  const goggleMat = new THREE.MeshBasicMaterial({ color: 0x5cf5ff });
  const gogL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), goggleMat);
  gogL.position.set(0.32, 1.84, -0.14);
  const gogR = gogL.clone();
  gogR.position.z = 0.14;

  // Golden loot briefcase carried visibly once loot is stolen!
  const lootCase = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.38, 0.24),
    new THREE.MeshStandardMaterial({ color: 0xffdc64, emissive: 0xffb424, emissiveIntensity: 0.75, metalness: 0.8, roughness: 0.2 }),
  );
  lootCase.position.set(-0.26, 1.12, 0.56);
  lootCase.visible = false;

  body.add(legL, legR, coat, collar, armL, armR, head, brim, crown, band, gogL, gogR, lootCase);
  body.scale.setScalar(1.18);
  grp.add(body);

  // Subtle contrast rim light on thief so silhouette pops effortlessly
  const thiefLight = new THREE.PointLight(0x68f0ff, 2.1, 7.5, 1.6);
  thiefLight.position.y = 2.3;
  grp.add(thiefLight);

  // Subtle floor ring when in stealth cover
  const coverRing = new THREE.Mesh(
    new THREE.RingGeometry(0.86, 1.04, 28),
    new THREE.MeshBasicMaterial({ color: 0x48ffe8, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
  );
  coverRing.rotation.x = -Math.PI * 0.5;
  coverRing.position.y = 0.06;

  return { group: grp, body, legL, legR, lootCase, coverRing };
}

export function createVolumetricCone3D(hexColor, baseOpacity, originY) {
  const group = new THREE.Group();

  const floorGeo = new THREE.BufferGeometry();
  const floorMat = new THREE.MeshBasicMaterial({
    color: hexColor,
    transparent: true,
    opacity: baseOpacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);

  const canopyGeo = new THREE.BufferGeometry();
  const canopyMat = new THREE.MeshBasicMaterial({
    color: hexColor,
    transparent: true,
    opacity: baseOpacity * 0.44,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const canopyMesh = new THREE.Mesh(canopyGeo, canopyMat);

  const rimGeo = new THREE.BufferGeometry();
  const rimMat = new THREE.LineBasicMaterial({ color: hexColor, transparent: true, opacity: 0.88 });
  const rimLine = new THREE.LineLoop(rimGeo, rimMat);

  group.add(floorMesh, canopyMesh, rimLine);
  return { group, floorMesh, canopyMesh, rimLine, floorMat, canopyMat, rimMat, originY };
}

export function updateVolumetricCone3D(cone, poly, hexColor, opacity) {
  if (!poly || poly.length < 3) {
    cone.group.visible = false;
    return;
  }
  cone.group.visible = true;
  cone.floorMat.color.setHex(hexColor);
  cone.floorMat.opacity = opacity;
  cone.canopyMat.color.setHex(hexColor);
  cone.canopyMat.opacity = opacity * 0.46;
  cone.rimMat.color.setHex(hexColor);

  const n = poly.length;
  const o = to3D(poly[0].x, poly[0].y, 0.05);
  const floorPos = new Float32Array((n - 2) * 9);
  const canopyPos = new Float32Array((n - 2) * 9);
  const rimPos = new Float32Array(n * 3);

  rimPos[0] = o.x;
  rimPos[1] = 0.08;
  rimPos[2] = o.z;

  for (let i = 1; i < n; i++) {
    const p = to3D(poly[i].x, poly[i].y, 0.05);
    rimPos[i * 3] = p.x;
    rimPos[i * 3 + 1] = 0.08;
    rimPos[i * 3 + 2] = p.z;
  }

  for (let i = 1; i < n - 1; i++) {
    const p1 = to3D(poly[i].x, poly[i].y, 0.05);
    const p2 = to3D(poly[i + 1].x, poly[i + 1].y, 0.05);
    const idx = (i - 1) * 9;

    floorPos[idx] = o.x;
    floorPos[idx + 1] = 0.05;
    floorPos[idx + 2] = o.z;
    floorPos[idx + 3] = p1.x;
    floorPos[idx + 4] = 0.05;
    floorPos[idx + 5] = p1.z;
    floorPos[idx + 6] = p2.x;
    floorPos[idx + 7] = 0.05;
    floorPos[idx + 8] = p2.z;

    canopyPos[idx] = o.x;
    canopyPos[idx + 1] = cone.originY;
    canopyPos[idx + 2] = o.z;
    canopyPos[idx + 3] = p1.x;
    canopyPos[idx + 4] = 0.18;
    canopyPos[idx + 5] = p1.z;
    canopyPos[idx + 6] = p2.x;
    canopyPos[idx + 7] = 0.18;
    canopyPos[idx + 8] = p2.z;
  }

  cone.floorMesh.geometry.dispose();
  cone.floorMesh.geometry = new THREE.BufferGeometry();
  cone.floorMesh.geometry.setAttribute('position', new THREE.BufferAttribute(floorPos, 3));

  cone.canopyMesh.geometry.dispose();
  cone.canopyMesh.geometry = new THREE.BufferGeometry();
  cone.canopyMesh.geometry.setAttribute('position', new THREE.BufferAttribute(canopyPos, 3));

  cone.rimLine.geometry.dispose();
  cone.rimLine.geometry = new THREE.BufferGeometry();
  cone.rimLine.geometry.setAttribute('position', new THREE.BufferAttribute(rimPos, 3));
}
