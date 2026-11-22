// Gilded Clockwork 3D — entry point, Three.js WebGL2 diorama loop, input binding, and 4-vault flow.

import { WORLD_H, WORLD_W } from './vaults.js';
import { findAdjacentCover } from './lighting.js';
import { CAUGHT_GRACE_SECONDS, recomputeSecurityCones, setGuardBark } from './guards.js';
import { GADGET_DEFS } from './gadgets.js';
import {
  applyGadgetKey,
  buildHeistSummary,
  createEngine,
  loadVault,
  spawnParticles,
  stepEngine,
  triggerInteract,
} from './engine.js';
import { createScene3D } from './scene3d.js';
import { drawHudOverlay, hitTestGadgetDock } from './hud.js';
import { createAudioEngine } from './audio.js';

export function bootGame() {
  const webglCanvas = document.getElementById('webgl');
  const hudCanvas = document.getElementById('stage');
  const scene3d = createScene3D(webglCanvas, hudCanvas);
  const audio = createAudioEngine();
  const params = new URLSearchParams(window.location.search);
  const startVault = Math.max(0, Number(params.get('vault') || 0) | 0);
  const shotMode = params.get('shot');

  const state = createEngine(startVault);
  const input = { up: false, down: false, left: false, right: false, crouch: false, sprint: false, interact: false };
  let frozen = false;

  if (shotMode) {
    frozen = applyShowcaseShot(state, shotMode);
    state.frozenShot = frozen;
  }

  function syncDomTelemetry() {
    hudCanvas.dataset.status = state.status;
    hudCanvas.dataset.vault = String(state.vaultIndex);
    hudCanvas.dataset.x = String(Math.round(state.player.x));
    hudCanvas.dataset.y = String(Math.round(state.player.y));
    hudCanvas.dataset.loot = state.lootSecured ? '1' : '0';
    hudCanvas.dataset.alarm = String(Math.round(state.alarm));
    hudCanvas.dataset.grace = state.caughtGrace.toFixed(2);
    hudCanvas.dataset.toolsSpent = String(state.toolSpent);
    hudCanvas.dataset.trailLen = String(state.trail.length);
    hudCanvas.dataset.cam = scene3d.getCameraMode();
  }

  function onKeyDown(e) {
    audio.unlock();
    const code = e.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) e.preventDefault();

    if (code === 'KeyW' || code === 'ArrowUp') input.up = true;
    if (code === 'KeyS' || code === 'ArrowDown') input.down = true;
    if (code === 'KeyA' || code === 'ArrowLeft') input.left = true;
    if (code === 'KeyD' || code === 'ArrowRight') input.right = true;
    if (code === 'ShiftLeft' || code === 'ShiftRight') input.sprint = true;
    if (code === 'Space' || code === 'ControlLeft' || code === 'ControlRight') input.crouch = true;
    if (code === 'KeyE') {
      input.interact = true;
      if (!e.repeat) triggerInteract(state, audio);
    }

    if (!e.repeat) {
      if (code === 'Digit1') applyGadgetKey(state, 'emp', audio);
      if (code === 'Digit2') applyGadgetKey(state, 'decoy', audio);
      if (code === 'Digit3') applyGadgetKey(state, 'smoke', audio);
      if (code === 'Digit4') applyGadgetKey(state, 'tap', audio);
      if (code === 'KeyC') {
        const mode = scene3d.toggleCameraMode();
        state.flashBanner = {
          text: mode === 'chase' ? 'CAMERA · DRAMATIC CHASE ANGLE' : 'CAMERA · ELEVATED 3/4 DIORAMA',
          color: '#7ceeff',
          timer: 1.4,
        };
      }
      if (code === 'KeyR') {
        frozen = false;
        state.frozenShot = false;
        loadVault(state, state.vaultIndex);
      }
      if (code === 'KeyN' && state.status === 'EXTRACTED') {
        frozen = false;
        state.frozenShot = false;
        loadVault(state, (state.vaultIndex + 1) % state.vaultCount);
      }
      if (code === 'KeyM') audio.toggleMute();
      if (code === 'BracketRight') loadVault(state, (state.vaultIndex + 1) % state.vaultCount);
    }
  }

  function onKeyUp(e) {
    const code = e.code;
    if (code === 'KeyW' || code === 'ArrowUp') input.up = false;
    if (code === 'KeyS' || code === 'ArrowDown') input.down = false;
    if (code === 'KeyA' || code === 'ArrowLeft') input.left = false;
    if (code === 'KeyD' || code === 'ArrowRight') input.right = false;
    if (code === 'ShiftLeft' || code === 'ShiftRight') input.sprint = false;
    if (code === 'Space' || code === 'ControlLeft' || code === 'ControlRight') input.crouch = false;
    if (code === 'KeyE') input.interact = false;
  }

  function onPointerMove(e) {
    const pt = scene3d.screenToWorld(e.clientX, e.clientY);
    state.pointer.x = Math.max(0, Math.min(WORLD_W, pt.x));
    state.pointer.y = Math.max(0, Math.min(WORLD_H, pt.y));
    state.pointer.active = true;
  }

  function onPointerDown(e) {
    audio.unlock();
    const hp = scene3d.screenToHud(e.clientX, e.clientY);
    const dockIdx = hitTestGadgetDock(hp.x, hp.y);
    if (dockIdx >= 0 && dockIdx < GADGET_DEFS.length) {
      applyGadgetKey(state, GADGET_DEFS[dockIdx].id, audio);
      return;
    }

    const pt = scene3d.screenToWorld(e.clientX, e.clientY);
    state.pointer.x = pt.x;
    state.pointer.y = pt.y;
    state.pointer.active = true;

    if (state.status === 'EXTRACTED') {
      loadVault(state, (state.vaultIndex + 1) % state.vaultCount);
      return;
    }
    if (state.status === 'CAUGHT') {
      loadVault(state, state.vaultIndex);
      return;
    }
    triggerInteract(state, audio);
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('resize', () => scene3d.resize());
  hudCanvas.addEventListener('pointermove', onPointerMove);
  hudCanvas.addEventListener('pointerdown', onPointerDown);
  hudCanvas.focus();

  let lastTs = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
    lastTs = now;
    if (!frozen) {
      stepEngine(state, input, dt, audio);
      if (state.status === 'PLAYING') audio.tickTension(state.alarm, dt);
    }
    syncDomTelemetry();
    scene3d.syncAndRender(state, drawHudOverlay, audio.isMuted());
    requestAnimationFrame(frame);
  }

  syncDomTelemetry();
  scene3d.syncAndRender(state, drawHudOverlay, audio.isMuted());
  requestAnimationFrame(frame);
}

function applyShowcaseShot(state, shot) {
  if (shot === 'infiltration') {
    // Vault 1: The Horology Atrium 3D
    loadVault(state, 0);
    state.time = 11.2;
    state.elapsed = 11.2;
    state.alarm = 18;
    state.peakAlarm = 18;
    state.player.x = 406;
    state.player.y = 594;
    state.player.angle = -0.36;
    state.player.crouched = true;
    const cov = findAdjacentCover(state.player.x, state.player.y, state.props, state.smokes);
    state.player.inCover = cov.inCover;
    state.player.coverProp = cov.prop;
    state.trail = [
      { x: 96, y: 582, crouched: false, ventJump: false, secured: false },
      { x: 214, y: 544, crouched: true, ventJump: false, secured: false },
      { x: 332, y: 594, crouched: true, ventJump: false, secured: false },
      { x: 406, y: 594, crouched: true, ventJump: false, secured: false },
    ];
    state.guards[0].x = 406;
    state.guards[0].y = 338;
    state.guards[0].angle = 1.56;
    state.guards[1].x = 776;
    state.guards[1].y = 196;
    state.guards[1].angle = 2.68;
    setGuardBark(state.guards[1], 'Sanctum clear', 6);
    state.guards[2].x = 776;
    state.guards[2].y = 562;
    state.guards[2].angle = -2.74;
    state.cameras[0].angle = 2.52;
    state.cameras[1].angle = 3.52;
    recomputeSecurityCones(state);
    return true;
  }

  if (shot === 'emerald-emp') {
    // Vault 2: The Emerald Conservatory 3D
    loadVault(state, 1);
    state.time = 23.6;
    state.elapsed = 23.6;
    state.alarm = 58;
    state.peakAlarm = 58;
    state.loot.taken = true;
    state.loot.progress = state.loot.crackTime;
    state.lootSecured = true;
    state.collectedValue = state.loot.value;
    state.player.x = 812;
    state.player.y = 358;
    state.player.angle = 0.04;
    state.player.crouched = false;
    state.gadgets[0].remaining = 1;
    state.gadgets[0].used = 1;
    state.gadgets[1].remaining = 1;
    state.gadgets[1].used = 1;
    state.toolSpent = 65000;
    state.activeGadgetId = 'emp';
    state.cameras[2].offlineTimer = 4.1;
    state.lasers[1].empTimer = 4.1;
    state.empPulses.push({
      x: 812,
      y: 358,
      radius: 178,
      maxRadius: 245,
      timer: 0.78,
      maxTimer: 1.4,
      targets: [
        { x: state.cameras[2].x, y: state.cameras[2].y },
        { x: 957, y: 358 },
      ],
    });
    spawnParticles(state, 812, 358, '#46ecff', 14, 140);
    state.decoys.push({ x: 528, y: 540, lureRadius: 280, timer: 4.6, maxTimer: 6.5, pulsePhase: 1.7 });
    state.guards[0].x = 742;
    state.guards[0].y = 168;
    state.guards[0].angle = 0.48;
    state.guards[0].state = 'SUSPICIOUS';
    setGuardBark(state.guards[0], 'Grid outage!', 6);
    state.guards[1].x = 420;
    state.guards[1].y = 390;
    state.guards[1].angle = 0.96;
    state.guards[1].state = 'DISTRACTED';
    state.guards[2].x = 696;
    state.guards[2].y = 532;
    state.guards[2].angle = 3.08;
    state.guards[2].state = 'DISTRACTED';
    setGuardBark(state.guards[2], "What's ticking?", 6);
    state.guards[3].x = 1094;
    state.guards[3].y = 528;
    state.guards[3].angle = -2.42;
    state.cameras[0].angle = 1.98;
    state.cameras[1].angle = -1.92;
    state.trail = [
      { x: 98, y: 358, crouched: false, ventJump: false, secured: false },
      { x: 236, y: 104, crouched: true, ventJump: false, secured: false },
      { x: 486, y: 168, crouched: true, ventJump: false, secured: false },
      { x: 640, y: 168, crouched: false, ventJump: false, secured: true },
      { x: 812, y: 358, crouched: false, ventJump: false, secured: true },
    ];
    state.relays[0].hacked = true;
    state.lasers[0].disabled = true;
    recomputeSecurityCones(state);
    return true;
  }

  if (shot === 'treasury-smoke') {
    // Vault 3: The Imperial Treasury 3D
    loadVault(state, 2);
    state.time = 19.8;
    state.elapsed = 19.8;
    state.alarm = 78;
    state.peakAlarm = 78;
    state.player.x = 582;
    state.player.y = 272;
    state.player.angle = 2.66;
    state.player.crouched = false;
    state.caughtGrace = CAUGHT_GRACE_SECONDS - 0.7;
    state.spottedBy = { kind: 'guard', x: 786, y: 256, label: 'WARDEN MARLOW' };
    state.lastSeen = { x: 406, y: 274, timer: 4.2 };
    state.gadgets[2].remaining = 1;
    state.gadgets[2].used = 1;
    state.toolSpent = 30000;
    state.activeGadgetId = 'smoke';
    state.smokes.push({ x: 814, y: 408, radius: 96, timer: 5.4, maxTimer: 7.0, alpha: 0.96 });
    state.guards[0].x = 786;
    state.guards[0].y = 256;
    state.guards[0].angle = 3.07;
    state.guards[0].state = 'ALERT';
    setGuardBark(state.guards[0], 'Intruder spotted!', 6);
    state.guards[1].x = 368;
    state.guards[1].y = 434;
    state.guards[1].angle = -0.86;
    state.guards[1].state = 'SEARCH';
    state.guards[2].x = 928;
    state.guards[2].y = 458;
    state.guards[2].angle = -2.72;
    state.guards[2].state = 'ALERT';
    setGuardBark(state.guards[2], 'Blind in smoke!', 6);
    state.guards[3].x = 1094;
    state.guards[3].y = 248;
    state.guards[3].angle = 2.35;
    state.cameras[0].angle = 0.72;
    state.cameras[1].angle = -2.18;
    state.cameras[2].angle = 2.95;
    recomputeSecurityCones(state);
    return true;
  }

  if (shot === 'getaway') {
    loadVault(state, 3);
    state.time = 17.2;
    state.elapsed = 17.2;
    state.alarm = 4;
    state.peakAlarm = 8;
    state.loot.taken = true;
    state.lootSecured = true;
    state.collectedValue = state.loot.value;
    state.player.x = state.exit.x;
    state.player.y = state.exit.y;
    state.trail = [
      { x: 98, y: 580, crouched: false, ventJump: false, secured: false },
      { x: 286, y: 466, crouched: true, ventJump: false, secured: false },
      { x: 294, y: 134, crouched: true, ventJump: false, secured: false },
      { x: 480, y: 128, crouched: true, ventJump: false, secured: false },
      { x: 992, y: 590, crouched: true, ventJump: true, secured: false },
      { x: 1112, y: 358, crouched: false, ventJump: false, secured: true },
      { x: 992, y: 590, crouched: false, ventJump: false, secured: true },
      { x: 480, y: 128, crouched: false, ventJump: true, secured: true },
      { x: 294, y: 246, crouched: false, ventJump: false, secured: true },
      { x: 102, y: 136, crouched: false, ventJump: false, secured: true },
    ];
    state.status = 'EXTRACTED';
    state.summary = buildHeistSummary(state);
    recomputeSecurityCones(state);
    return true;
  }
  return false;
}

bootGame();
