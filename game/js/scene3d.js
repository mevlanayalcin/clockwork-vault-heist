// Three.js WebGL2 diorama renderer, elevated 3/4 & chase cameras, lighting rig, and 3D->2D projection.

import * as THREE from '../vendor/three.module.min.js';
import { WORLD_H, WORLD_W } from './vaults.js';
import { from3D, get3DTheme, to3D } from './materials3d.js';
import { buildVaultSceneObjects, updateVolumetricCone3D } from './actors3d.js';
import { createFxLayer3D } from './fx3d.js';

export function createScene3D(webglCanvas, hudCanvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas: webglCanvas,
    antialias: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.24;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(39, WORLD_W / WORLD_H, 0.5, 180);
  camera.position.set(0, 31.8, 25.0);
  camera.lookAt(0, -0.25, 0.35);

  const raycaster = new THREE.Raycaster();
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const ndc = new THREE.Vector2();
  const hitPt = new THREE.Vector3();
  const projVec = new THREE.Vector3();

  // Persistent lights updated per vault theme
  const hemiLight = new THREE.HemisphereLight(0xd6e6ff, 0x1a1e30, 0.98);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffe8c2, 1.65);
  dirLight.position.set(-18, 34, 16);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024);
  dirLight.shadow.camera.left = -28;
  dirLight.shadow.camera.right = 28;
  dirLight.shadow.camera.top = 18;
  dirLight.shadow.camera.bottom = -18;
  dirLight.shadow.camera.near = 6;
  dirLight.shadow.camera.far = 78;
  dirLight.shadow.bias = -0.0005;
  scene.add(dirLight);

  const rimLight = new THREE.DirectionalLight(0x58c4ff, 0.65);
  rimLight.position.set(22, 18, -18);
  scene.add(rimLight);

  const warmPoolL = new THREE.PointLight(0xffd280, 2.2, 34, 1.5);
  warmPoolL.position.set(-14, 9, 0);
  const warmPoolR = new THREE.PointLight(0x90e8ff, 1.8, 34, 1.5);
  warmPoolR.position.set(14, 9, 0);
  scene.add(warmPoolL, warmPoolR);

  const fx3D = createFxLayer3D();
  scene.add(fx3D.group);

  let builtVaultId = null;
  let builtObjs = null;
  let cameraMode = 'tactical'; // 'tactical' (elevated 3/4 diorama) | 'chase' (dramatic low-angle)
  const camTargetPos = new THREE.Vector3(0, 31.8, 25.0);
  const camTargetLook = new THREE.Vector3(0, -0.25, 0.35);
  const camCurLook = new THREE.Vector3(0, -0.25, 0.35);

  const hudCtx = hudCanvas.getContext('2d');
  let hudScale = 1;
  let hudOffX = 0;
  let hudOffY = 0;
  let cssW = WORLD_W;
  let cssH = WORLD_H;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cssW = window.innerWidth || WORLD_W;
    cssH = window.innerHeight || WORLD_H;
    renderer.setPixelRatio(dpr);
    renderer.setSize(cssW, cssH, false);
    camera.aspect = cssW / cssH;
    camera.updateProjectionMatrix();

    hudCanvas.width = Math.round(cssW * dpr);
    hudCanvas.height = Math.round(cssH * dpr);
    hudScale = Math.min(cssW / WORLD_W, cssH / WORLD_H);
    hudOffX = (cssW - WORLD_W * hudScale) * 0.5;
    hudOffY = (cssH - WORLD_H * hudScale) * 0.5;
  }

  function toggleCameraMode() {
    cameraMode = cameraMode === 'tactical' ? 'chase' : 'tactical';
    return cameraMode;
  }

  function getCameraMode() {
    return cameraMode;
  }

  function rebuildVaultIfNeeded(state) {
    if (builtVaultId === state.vault.id && builtObjs) return;
    if (builtObjs) {
      scene.remove(builtObjs.root);
      builtObjs.root.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material && !obj.userData.keepMaterial) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    }
    const spec = get3DTheme(state.vault.theme);
    scene.background = new THREE.Color(spec.bg);
    scene.fog = new THREE.FogExp2(spec.fog, 0.0085);
    hemiLight.color.setHex(spec.hemiSky);
    hemiLight.groundColor.setHex(spec.hemiGround);
    dirLight.color.setHex(spec.dirColor);
    dirLight.intensity = spec.dirInt;
    rimLight.color.setHex(spec.rimColor);

    builtObjs = buildVaultSceneObjects(state);
    scene.add(builtObjs.root);
    builtVaultId = state.vault.id;
  }

  function screenToHud(clientX, clientY) {
    const rect = hudCanvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - hudOffX) / hudScale,
      y: (clientY - rect.top - hudOffY) / hudScale,
    };
  }

  function screenToWorld(clientX, clientY) {
    const rect = webglCanvas.getBoundingClientRect();
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    if (raycaster.ray.intersectPlane(floorPlane, hitPt)) {
      return from3D(hitPt.x, hitPt.z);
    }
    return { x: 640, y: 358 };
  }

  function projectToHud(x, y, elev = 0) {
    const v = to3D(x, y, elev);
    projVec.copy(v).project(camera);
    const sx = (projVec.x * 0.5 + 0.5) * cssW;
    const sy = (-projVec.y * 0.5 + 0.5) * cssH;
    return {
      x: (sx - hudOffX) / hudScale,
      y: (sy - hudOffY) / hudScale,
      visible: projVec.z < 1,
    };
  }

  function syncAndRender(state, drawHudOverlay, audioMuted = false) {
    rebuildVaultIfNeeded(state);
    const objs = builtObjs;
    const t = state.time;

    // 1. Update camera (Tactical 3/4 diorama with subtle breathing sway, or Dramatic Chase Cam!)
    const p3 = to3D(state.player.x, state.player.y, 0);
    if (cameraMode === 'chase') {
      camTargetPos.set(p3.x * 0.65, 17.2, p3.z + 16.4);
      camTargetLook.set(p3.x * 0.88, 1.0, p3.z);
    } else {
      const followX = state.status === 'PLAYING' ? p3.x * 0.05 : 0;
      const followZ = state.status === 'PLAYING' ? p3.z * 0.03 : 0;
      camTargetPos.set(followX, 31.8, 25.0 + followZ);
      camTargetLook.set(followX * 0.4, -0.25, 0.35 + followZ * 0.4);
    }
    if (state.frozenShot) {
      camera.position.set(0, 31.8, 25.0);
      camCurLook.set(0, -0.25, 0.35);
    } else {
      camera.position.lerp(camTargetPos, 0.14);
      camCurLook.lerp(camTargetLook, 0.14);
    }
    camera.lookAt(camCurLook);
    camera.updateMatrixWorld();

    // 2. Animate Spire recessed clockwork gears & museum case relics
    for (const cog of objs.underCogs) cog.rotation.y = t * cog.userData.speed;
    for (const rel of objs.spinningRelics) {
      rel.rotation.y = t * 1.1;
      rel.position.y = 1.42 + Math.sin(t * 2.4 + rel.id) * 0.08;
    }

    // 3. Highlight active cover prop ONLY when thief hugs it
    for (const [prop, built] of objs.propMap.entries()) {
      built.coverHighlight.visible = state.player.inCover && state.player.coverProp === prop;
    }

    // 4. Sync Relays & Power Conduits
    for (const rn of objs.relayNodes) {
      const anyEmp = rn.data.targetLaserIds.some((id) => (state.lasers.find((l) => l.id === id)?.empTimer ?? 0) > 0);
      if (rn.data.hacked) {
        rn.bulbMat.color.setHex(0x3cf0a2);
        rn.bulbMat.emissive.setHex(0x28d688);
        rn.conduitMat.color.setHex(0x38e89e);
        rn.conduitMat.emissive.setHex(0x1cb874);
        rn.conduitMat.emissiveIntensity = 0.7;
      } else if (anyEmp) {
        rn.bulbMat.color.setHex(0x44ecff);
        rn.bulbMat.emissive.setHex(0x2cd8ff);
        rn.conduitMat.color.setHex(0x46ecff);
        rn.conduitMat.emissive.setHex(0x26c8f5);
        rn.conduitMat.emissiveIntensity = 1.6;
      } else {
        rn.bulbMat.color.setHex(0xff425c);
        rn.bulbMat.emissive.setHex(0xff2848);
        rn.conduitMat.color.setHex(0xff5268);
        rn.conduitMat.emissive.setHex(0xff3250);
        rn.conduitMat.emissiveIntensity = 1.2 + 0.5 * Math.sin(t * 7);
      }
    }

    // 5. Sync 3D Laser Gates
    for (const ln of objs.laserNodes) {
      const off = ln.data.disabled || ln.data.empTimer > 0;
      ln.beams.visible = !off;
      if (!off) ln.glowMat.opacity = 0.22 + 0.08 * Math.sin(t * 24);
    }

    // 6. Sync Centerpiece Vault Loot + Bonus Relics + Exit Lift
    objs.loot3D.vitrine.visible = !state.loot.taken;
    if (!state.loot.taken) {
      objs.loot3D.relic.rotation.y = t * 1.4;
      objs.loot3D.relic.position.y = 1.88 + Math.sin(t * 3.0) * 0.1;
      objs.loot3D.ring1.rotation.z = t * 0.9;
      objs.loot3D.ring2.rotation.z = -t * 1.3;
      objs.loot3D.breachRing.visible = state.loot.progress > 0;
      if (state.loot.progress > 0) {
        const s = 0.95 + (state.loot.progress / state.loot.crackTime) * 0.35;
        objs.loot3D.breachRing.scale.set(s, s, 1);
      }
    } else {
      objs.loot3D.breachRing.visible = false;
    }

    for (const bn of objs.bonusNodes) {
      bn.group.visible = !bn.data.taken;
      if (!bn.data.taken) bn.gem.rotation.y = t * 1.6;
    }

    const exitOpen = state.lootSecured;
    objs.exit3D.padMat.emissiveIntensity = exitOpen ? 1.4 + 0.5 * Math.sin(t * 6) : 0.45;
    objs.exit3D.beaconMat.opacity = exitOpen ? 0.34 + 0.1 * Math.sin(t * 5) : 0.1;
    objs.exit3D.light.intensity = exitOpen ? 3.8 : 1.1;

    // 7. Sync Wall CCTV Cameras + Wall-Clipped 3D Cyan Cones
    for (const cn of objs.cameraNodes) {
      const cam = cn.data;
      const off = cam.offlineTimer > 0;
      cn.head.rotation.y = -cam.angle;
      const blink = Math.floor(t * 3) % 2 === 0;
      cn.ledMat.color.setHex(off ? 0x46ecff : cam.seeingPlayer ? 0xff2244 : blink ? 0xff3c58 : 0x56ecff);
      const col = cam.seeingPlayer || cam.alertLevel > 0.35 ? 0xff3c58 : 0x38e4ff;
      updateVolumetricCone3D(cn.cone, off ? null : cam.conePoly, col, cam.seeingPlayer ? 0.46 : 0.32);
    }

    // 8. Sync Articulated 3D Guards + Wall-Clipped 3D Flashlight Cones
    for (const gn of objs.guardNodes) {
      const g = gn.data;
      const pos = to3D(g.x, g.y, 0);
      gn.group.position.copy(pos);
      gn.group.rotation.y = -g.angle;
      const swing = Math.sin(g.stride) * 0.25;
      gn.legL.position.x = swing;
      gn.legR.position.x = -swing;

      if (g.state === 'ALERT') {
        gn.coatMat.color.setHex(0xa81c32);
        gn.coatMat.emissive.setHex(0x6e0c1c);
        gn.coatMat.emissiveIntensity = 0.55;
        gn.lensMat.color.setHex(0xff5268);
        updateVolumetricCone3D(gn.cone, g.conePoly, 0xff3650, 0.48);
      } else if (g.state === 'SUSPICIOUS' || g.state === 'DISTRACTED' || g.state === 'SEARCH') {
        gn.coatMat.color.setHex(0xb45c1c);
        gn.coatMat.emissive.setHex(0x522608);
        gn.coatMat.emissiveIntensity = 0.35;
        gn.lensMat.color.setHex(0xffb858);
        updateVolumetricCone3D(gn.cone, g.conePoly, 0xff9232, 0.42);
      } else {
        gn.coatMat.color.setHex(gn.baseCoat);
        gn.coatMat.emissive.setHex(0x000000);
        gn.coatMat.emissiveIntensity = 0;
        gn.lensMat.color.setHex(0xfff0a8);
        updateVolumetricCone3D(gn.cone, g.conePoly, 0xffc652, 0.36);
      }
    }

    // 9. Sync Articulated 3D Thief
    const pl = state.player;
    objs.thief3D.group.position.copy(p3);
    objs.thief3D.group.rotation.y = -pl.angle;
    objs.thief3D.body.scale.y = pl.crouched ? 0.72 : 1.0;
    const pSwing = Math.sin(pl.stride) * 0.24;
    objs.thief3D.legL.position.x = pSwing;
    objs.thief3D.legR.position.x = -pSwing;
    objs.thief3D.lootCase.visible = state.lootSecured;
    objs.thief3D.coverRing.visible = pl.inCover;
    objs.thief3D.coverRing.position.set(p3.x, 0.07, p3.z);
    objs.thief3D.coverRing.material.opacity = pl.crouched ? 0.9 : 0.4;

    // 10. Sync 3D FX (EMP domes + lightning, decoys, volumetric smoke, getaway ribbon)
    fx3D.sync(state);

    // 11. Render WebGL2 3D Diorama
    renderer.render(scene, camera);

    // 12. Render crisp 2D HUD + 3D-projected tactical overlays
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    hudCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    hudCtx.clearRect(0, 0, cssW, cssH);
    hudCtx.save();
    hudCtx.translate(hudOffX, hudOffY);
    hudCtx.scale(hudScale, hudScale);
    drawHudOverlay(hudCtx, state, projectToHud, audioMuted, cameraMode);
    hudCtx.restore();
  }

  resize();
  return { resize, screenToWorld, screenToHud, projectToHud, toggleCameraMode, getCameraMode, syncAndRender };
}
