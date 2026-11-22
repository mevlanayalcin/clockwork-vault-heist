// Dynamic Three.js 3D FX: EMP domes & lightning, brass decoys, volumetric smoke clouds, trail ribbon.

import * as THREE from '../vendor/three.module.min.js';
import { to3D, WORLD_SCALE } from './materials3d.js';

export function createFxLayer3D() {
  const group = new THREE.Group();
  const sphereGeo = new THREE.SphereGeometry(1, 14, 12);
  const ringGeo = new THREE.RingGeometry(0.92, 1.0, 32);
  const domeGeo = new THREE.SphereGeometry(1, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const sparkGeo = new THREE.OctahedronGeometry(0.14);

  function clearGroup() {
    while (group.children.length > 0) {
      const child = group.children.pop();
      if (child.userData.disposeGeo && child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    }
  }

  function sync(state) {
    clearGroup();

    // 1. Footstep acoustic rings
    for (const n of state.noiseRings) {
      const r = n.r * WORLD_SCALE;
      const mat = new THREE.MeshBasicMaterial({
        color: n.loud ? 0xffa64a : 0x72dcff,
        transparent: true,
        opacity: Math.max(0, n.alpha * 0.7),
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const m = new THREE.Mesh(ringGeo, mat);
      const p = to3D(n.x, n.y, 0.08);
      m.position.copy(p);
      m.rotation.x = -Math.PI * 0.5;
      m.scale.set(r, r, 1);
      group.add(m);
    }

    // 2. 3D EMP Shockwave Domes + crackling 3D branching lightning arcs!
    for (const e of state.empPulses) {
      const a = Math.max(0, e.timer / e.maxTimer);
      const r = e.radius * WORLD_SCALE;
      const p = to3D(e.x, e.y, 0.06);

      // Vivid electric-cyan energy dome (stays saturated cyan even over warm walnut floor!)
      const dome = new THREE.Mesh(
        domeGeo,
        new THREE.MeshBasicMaterial({
          color: 0x00c8ff,
          transparent: true,
          opacity: 0.24 * a,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      dome.position.copy(p);
      dome.scale.set(r, Math.min(4.6, r * 0.56), r);
      group.add(dome);

      // Electric cyan glow light illuminating nearby furniture
      const empLight = new THREE.PointLight(0x28e4ff, 4.5 * a, r * 2.2, 1.4);
      empLight.position.set(p.x, 2.2, p.z);
      group.add(empLight);

      // Bright glowing floor shockwave ring
      const shock = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({
          color: 0x3ef0ff,
          transparent: true,
          opacity: 0.96 * a,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      shock.position.set(p.x, 0.1, p.z);
      shock.rotation.x = -Math.PI * 0.5;
      shock.scale.set(r, r, 1);
      group.add(shock);

      // Inner dashed shock ring
      const shock2 = shock.clone();
      shock2.material = shock.material.clone();
      shock2.material.opacity = 0.55 * a;
      shock2.scale.set(r * 0.72, r * 0.72, 1);
      group.add(shock2);

      // Jagged 3D lightning bolts arcing from thief onto disabled CCTV & Laser Gates!
      for (const tgt of e.targets || []) {
        const tp = to3D(tgt.x, tgt.y, 1.55);
        addLightning3D(group, new THREE.Vector3(p.x, 1.3, p.z), tp, 0x9efaff, a, state.time);
        addLightning3D(group, new THREE.Vector3(p.x, 1.2, p.z), tp, 0x38dcff, a * 0.7, state.time + 2.1);
      }
    }

    // 3. 3D Spinning Brass Clockwork Decoys + Golden Floor Sound Waves
    for (const d of state.decoys) {
      const p = to3D(d.x, d.y, 0.32);
      const gear = new THREE.Mesh(
        new THREE.TorusGeometry(0.42, 0.12, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0xffd85e, emissive: 0xffb224, emissiveIntensity: 0.9, metalness: 0.85, roughness: 0.2 }),
      );
      gear.userData.disposeGeo = true;
      gear.position.copy(p);
      gear.rotation.x = Math.PI * 0.5;
      gear.rotation.z = state.time * 4.0;
      group.add(gear);

      const r1 = (20 + ((d.pulsePhase * 32) % 86)) * WORLD_SCALE;
      const r2 = (20 + (((d.pulsePhase + 1.5) * 32) % 86)) * WORLD_SCALE;
      for (const rr of [r1, r2]) {
        const al = Math.max(0, 1 - rr / (106 * WORLD_SCALE)) * 0.85;
        const wave = new THREE.Mesh(
          ringGeo,
          new THREE.MeshBasicMaterial({ color: 0xffd962, transparent: true, opacity: al, side: THREE.DoubleSide, depthWrite: false }),
        );
        wave.position.set(p.x, 0.08, p.z);
        wave.rotation.x = -Math.PI * 0.5;
        wave.scale.set(rr, rr, 1);
        group.add(wave);
      }
    }

    // 4. 3D Volumetric Billowing Smoke Clouds (visually occluding guard/CCTV cones!)
    for (const s of state.smokes) {
      const p = to3D(s.x, s.y, 0);
      const rad = s.radius * WORLD_SCALE;
      const puffs = [
        [0, 1.15, 0, 0.68, 0xc2d8e4, 0.72],
        [-0.42, 0.95, -0.26, 0.56, 0x7b9fb4, 0.68],
        [0.44, 0.98, -0.2, 0.54, 0x90b4c8, 0.68],
        [-0.34, 1.05, 0.36, 0.56, 0x6f94a8, 0.66],
        [0.36, 0.92, 0.34, 0.58, 0x88adc2, 0.68],
        [0.05, 1.85, -0.08, 0.52, 0xd8ecf5, 0.62],
        [-0.22, 1.55, 0.16, 0.48, 0xa8c6d6, 0.64],
      ];
      for (const [ox, oy, oz, sc, hex, op] of puffs) {
        const drift = Math.sin(state.time * 1.4 + ox * 7) * 0.14;
        const m = new THREE.Mesh(
          sphereGeo,
          new THREE.MeshStandardMaterial({
            color: hex,
            emissive: 0x264454,
            emissiveIntensity: 0.35,
            roughness: 0.92,
            transparent: true,
            opacity: op * s.alpha,
            depthWrite: false,
          }),
        );
        m.position.set(p.x + ox * rad + drift, oy, p.z + oz * rad - drift * 0.5);
        m.scale.set(rad * sc, rad * sc * 0.72, rad * sc);
        group.add(m);
      }
      // Subtle dashed floor footprint ring showing exact smoke occlusion radius
      const foot = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({ color: 0xbef0ff, transparent: true, opacity: 0.55 * s.alpha, side: THREE.DoubleSide, depthWrite: false }),
      );
      foot.position.set(p.x, 0.08, p.z);
      foot.rotation.x = -Math.PI * 0.5;
      foot.scale.set(rad * 0.88, rad * 0.88, 1);
      group.add(foot);
    }

    // 5. Circuit Tap electric beams
    for (const arc of state.tapArcs) {
      const a = arc.timer / arc.maxTimer;
      addLightning3D(group, to3D(arc.x1, arc.y1, 1.3), to3D(arc.x2, arc.y2, 1.1), 0x48ffb8, a, state.time);
    }

    // 6. LAST SEEN crimson floor marker
    if (state.lastSeen) {
      const lp = to3D(state.lastSeen.x, state.lastSeen.y, 0.08);
      const m = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({ color: 0xff5a72, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }),
      );
      m.position.copy(lp);
      m.rotation.x = -Math.PI * 0.5;
      m.scale.set(0.75, 0.75, 1);
      group.add(m);
    }

    // 7. 3D Spark Particles
    for (const pt of state.particles) {
      const al = Math.max(0, pt.life / pt.maxLife);
      const m = new THREE.Mesh(
        sparkGeo,
        new THREE.MeshBasicMaterial({ color: pt.color, transparent: true, opacity: al }),
      );
      const p3 = to3D(pt.x, pt.y, 0.7 + al * 1.1);
      m.position.copy(p3);
      group.add(m);
    }

    // 8. Glowing 3D Getaway Route Ribbon (vivid cyan -> dashed vent -> molten gold on EXTRACTED!)
    if (state.trail && state.trail.length >= 2) {
      const hi = state.status === 'EXTRACTED';
      for (let i = 1; i < state.trail.length; i++) {
        const a = state.trail[i - 1];
        const b = state.trail[i];
        const p1 = to3D(a.x, a.y, hi ? 0.32 : 0.12);
        const p2 = to3D(b.x, b.y, hi ? 0.32 : 0.12);
        const dist = p1.distanceTo(p2);
        if (dist < 0.05) continue;

        if (b.ventJump) {
          const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
          const line = new THREE.Line(
            geo,
            new THREE.LineDashedMaterial({ color: 0x48ffe8, dashSize: 0.75, gapSize: 0.5, transparent: true, opacity: hi ? 0.95 : 0.35 }),
          );
          line.computeLineDistances();
          line.userData.disposeGeo = true;
          group.add(line);
        } else {
          const w = hi ? 0.26 : 0.1;
          const col = b.secured ? 0xffe062 : 0x44eeff;
          const seg = new THREE.Mesh(
            new THREE.BoxGeometry(dist + 0.06, hi ? 0.1 : 0.04, w),
            new THREE.MeshBasicMaterial({
              color: col,
              transparent: true,
              opacity: hi ? 0.92 : 0.3,
              blending: hi ? THREE.AdditiveBlending : THREE.NormalBlending,
              depthWrite: false,
            }),
          );
          seg.userData.disposeGeo = true;
          seg.position.copy(p1).lerp(p2, 0.5);
          seg.rotation.y = -Math.atan2(p2.z - p1.z, p2.x - p1.x);
          group.add(seg);
        }
      }
    }
  }

  return { group, sync };
}

function addLightning3D(parent, p1, p2, hex, alpha, time) {
  const pts = [];
  const steps = 8;
  const dir = p2.clone().sub(p1);
  const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const pt = p1.clone().lerp(p2, t);
    if (i > 0 && i < steps) {
      const jitter = Math.sin(time * 28 + i * 4.1) * 0.55;
      const lift = Math.sin(t * Math.PI) * 0.85 + Math.cos(time * 21 + i * 2.7) * 0.28;
      pt.addScaledVector(perp, jitter);
      pt.y += lift;
    }
    pts.push(pt);
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const line = new THREE.Line(
    geo,
    new THREE.LineBasicMaterial({ color: hex, transparent: true, opacity: Math.min(1, alpha * 1.15) }),
  );
  line.userData.disposeGeo = true;
  parent.add(line);
}
