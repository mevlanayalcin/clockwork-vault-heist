// Clockwork Vault Heist — entry point, fixed-step game loop, keyboard/mouse input, and vault flow.

import { WORLD_H, WORLD_W } from './blueprints.js';
import { castVisionCone } from './visibility.js';
import { CAUGHT_GRACE_SECONDS, setGuardBark } from './security.js';
import { TOOL_DEFS } from './tools.js';
import {
  applyToolKey,
  buildHeistSummary,
  createSimulation,
  loadVault,
  stepSimulation,
  triggerInteract,
} from './simulation.js';
import { createRenderer } from './render.js';
import { createAudioEngine } from './audio.js';

export function bootGame() {
  const canvas = document.getElementById('stage');
  const renderer = createRenderer(canvas);
  const audio = createAudioEngine();
  const params = new URLSearchParams(window.location.search);
  const startVault = Math.max(0, Number(params.get('vault') || 0) | 0);
  const shotMode = params.get('shot');

  const state = createSimulation(startVault);
  const input = { up: false, down: false, left: false, right: false, crouch: false, sprint: false, interact: false };
  let crouchToggled = false;
  let frozen = false;

  if (shotMode) {
    frozen = applyShowcaseShot(state, shotMode);
  }

  function syncDomTelemetry() {
    canvas.dataset.status = state.status;
    canvas.dataset.vault = String(state.vaultIndex);
    canvas.dataset.x = String(Math.round(state.player.x));
    canvas.dataset.y = String(Math.round(state.player.y));
    canvas.dataset.loot = state.lootSecured ? '1' : '0';
    canvas.dataset.alarm = String(Math.round(state.alarm));
    canvas.dataset.grace = state.caughtGrace.toFixed(2);
    canvas.dataset.toolsSpent = String(state.toolSpent);
    canvas.dataset.trailLen = String(state.trail.length);
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
    if (code === 'KeyC' && !e.repeat) {
      crouchToggled = !crouchToggled;
      input.crouch = crouchToggled;
    }
    if (code === 'KeyE') {
      input.interact = true;
      if (!e.repeat) triggerInteract(state, audio);
    }

    if (!e.repeat) {
      if (code === 'Digit1') applyToolKey(state, 'emp', audio);
      if (code === 'Digit2') applyToolKey(state, 'decoy', audio);
      if (code === 'Digit3') applyToolKey(state, 'smoke', audio);
      if (code === 'Digit4') applyToolKey(state, 'tap', audio);
      if (code === 'KeyR') {
        frozen = false;
        crouchToggled = false;
        input.crouch = false;
        loadVault(state, state.vaultIndex);
      }
      if (code === 'KeyN' && state.status === 'EXTRACTED') {
        frozen = false;
        crouchToggled = false;
        input.crouch = false;
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
    if (code === 'Space' || code === 'ControlLeft' || code === 'ControlRight') input.crouch = crouchToggled;
    if (code === 'KeyE') input.interact = false;
  }

  function onPointerMove(e) {
    const pt = renderer.screenToWorld(e.clientX, e.clientY);
    state.pointer.x = Math.max(0, Math.min(WORLD_W, pt.x));
    state.pointer.y = Math.max(0, Math.min(WORLD_H, pt.y));
    state.pointer.active = true;
  }

  function onPointerDown(e) {
    audio.unlock();
    const pt = renderer.screenToWorld(e.clientX, e.clientY);
    state.pointer.x = pt.x;
    state.pointer.y = pt.y;
    state.pointer.active = true;

    // Click on bottom-left tool belt cards
    if (pt.y >= 650 && pt.y <= 708 && pt.x >= 16 && pt.x <= 720) {
      const idx = Math.floor((pt.x - 16) / 176);
      if (idx >= 0 && idx < TOOL_DEFS.length) {
        applyToolKey(state, TOOL_DEFS[idx].id, audio);
        return;
      }
    }

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
  window.addEventListener('resize', () => renderer.resize());
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.focus();

  let lastTs = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
    lastTs = now;
    if (!frozen) {
      stepSimulation(state, input, dt, audio);
      if (state.status === 'PLAYING') audio.tickTension(state.alarm, dt);
    }
    syncDomTelemetry();
    renderer.render(state, audio.isMuted());
    requestAnimationFrame(frame);
  }

  syncDomTelemetry();
  renderer.render(state, audio.isMuted());
  requestAnimationFrame(frame);
}

function recomputeAllCones(state) {
  for (const g of state.guards) {
    g.conePoly = castVisionCone(g.x, g.y, g.angle, g.halfFov, g.range, state.opaqueSegments, state.smokes);
  }
  for (const cam of state.cameras) {
    cam.conePoly =
      cam.offlineTimer > 0
        ? []
        : castVisionCone(cam.x, cam.y, cam.angle, cam.halfFov, cam.range, state.opaqueSegments, state.smokes);
  }
}

function applyShowcaseShot(state, shot) {
  loadVault(state, 0);

  if (shot === 'infiltration') {
    state.time = 11.4;
    state.elapsed = 11.4;
    state.alarm = 22;
    state.peakAlarm = 22;
    state.player.x = 404;
    state.player.y = 568;
    state.player.angle = -0.32;
    state.player.crouched = true;
    state.player.inCover = true;
    state.trail = [
      { x: 112, y: 564, crouched: false, ventJump: false, secured: false },
      { x: 196, y: 518, crouched: true, ventJump: false, secured: false },
      { x: 320, y: 568, crouched: true, ventJump: false, secured: false },
      { x: 404, y: 568, crouched: true, ventJump: false, secured: false },
    ];
    state.guards[0].x = 404;
    state.guards[0].y = 330;
    state.guards[0].angle = 1.56;
    setGuardBark(state.guards[0], 'West gallery clear', 6);
    state.guards[1].x = 768;
    state.guards[1].y = 196;
    state.guards[1].angle = 2.65;
    setGuardBark(state.guards[1], 'East corridor clear', 6);
    state.guards[2].x = 772;
    state.guards[2].y = 548;
    state.guards[2].angle = -2.75;
    state.guards[2].barkTimer = 0;
    state.cameras[0].angle = 2.52;
    state.cameras[1].angle = 3.55;
    recomputeAllCones(state);
    return true;
  }

  if (shot === 'breach') {
    state.time = 24.8;
    state.elapsed = 24.8;
    state.alarm = 64;
    state.peakAlarm = 64;
    state.loot.taken = true;
    state.loot.progress = state.loot.crackTime;
    state.lootSecured = true;
    state.collectedValue = state.loot.value;
    state.player.x = 808;
    state.player.y = 352;
    state.player.angle = -0.18;
    state.player.crouched = false;
    state.trail = [
      { x: 112, y: 564, crouched: false, ventJump: false, secured: false },
      { x: 248, y: 492, crouched: true, ventJump: false, secured: false },
      { x: 422, y: 486, crouched: true, ventJump: false, secured: false },
      { x: 560, y: 356, crouched: true, ventJump: false, secured: false },
      { x: 640, y: 355, crouched: false, ventJump: false, secured: true },
      { x: 808, y: 352, crouched: false, ventJump: false, secured: true },
    ];
    // Fire real EMP + Decoy cost accounting
    state.tools[0].remaining = 1;
    state.tools[0].used = 1;
    state.tools[1].remaining = 1;
    state.tools[1].used = 1;
    state.toolSpent = 65000;
    state.activeToolId = 'emp';
    state.empPulses.push({ x: 808, y: 352, radius: 176, maxRadius: 225, timer: 0.72, maxTimer: 1.35 });
    state.cameras[0].offlineTimer = 4.1;
    state.lasers[0].empTimer = 4.1;
    state.decoys.push({ x: 638, y: 486, lureRadius: 265, timer: 4.4, maxTimer: 6.5, pulsePhase: 1.9 });
    state.guards[0].x = 468;
    state.guards[0].y = 398;
    state.guards[0].angle = 0.42;
    state.guards[0].state = 'SUSPICIOUS';
    state.guards[0].barkTimer = 0;
    state.guards[1].x = 760;
    state.guards[1].y = 196;
    state.guards[1].angle = 0.42;
    state.guards[1].state = 'SUSPICIOUS';
    setGuardBark(state.guards[1], 'Camera feed dropped!', 6);
    state.guards[2].x = 750;
    state.guards[2].y = 542;
    state.guards[2].angle = -2.66;
    state.guards[2].state = 'DISTRACTED';
    setGuardBark(state.guards[2], "What's ticking?", 6);
    state.cameras[1].angle = 3.22;
    recomputeAllCones(state);
    return true;
  }

  if (shot === 'caught') {
    state.time = 19.2;
    state.elapsed = 19.2;
    state.alarm = 76;
    state.peakAlarm = 76;
    state.player.x = 552;
    state.player.y = 224;
    state.player.angle = 2.92;
    state.player.crouched = false;
    state.caughtGrace = CAUGHT_GRACE_SECONDS - 0.7;
    state.spottedBy = { kind: 'guard', x: 712, y: 224, label: 'SENTRY HALE' };
    state.lastSeen = { x: 454, y: 266, timer: 4.5 };
    state.tools[2].remaining = 1;
    state.tools[2].used = 1;
    state.toolSpent = 30000;
    state.activeToolId = 'smoke';
    state.smokes.push({ x: 760, y: 374, radius: 92, timer: 5.2, maxTimer: 7.0, alpha: 0.94 });
    state.guards[0].x = 398;
    state.guards[0].y = 354;
    state.guards[0].angle = -0.82;
    state.guards[0].state = 'SEARCH';
    state.guards[0].barkTimer = 0;
    state.guards[1].x = 712;
    state.guards[1].y = 224;
    state.guards[1].angle = Math.PI;
    state.guards[1].state = 'ALERT';
    setGuardBark(state.guards[1], 'Intruder spotted!', 6);
    state.guards[2].x = 782;
    state.guards[2].y = 516;
    state.guards[2].angle = -1.78;
    state.guards[2].state = 'SEARCH';
    setGuardBark(state.guards[2], 'Smoke! Blind in sector!', 6);
    state.cameras[0].angle = 2.48;
    state.cameras[1].angle = 3.55;
    recomputeAllCones(state);
    return true;
  }

  if (shot === 'getaway') {
    state.time = 29.4;
    state.elapsed = 29.4;
    state.alarm = 16;
    state.peakAlarm = 18;
    state.loot.taken = true;
    state.lootSecured = true;
    state.collectedValue = state.loot.value;
    state.player.x = state.exit.x;
    state.player.y = state.exit.y;
    state.trail = [
      { x: 112, y: 564, crouched: false, ventJump: false, secured: false },
      { x: 124, y: 420, crouched: true, ventJump: false, secured: false },
      { x: 124, y: 140, crouched: true, ventJump: false, secured: false },
      { x: 988, y: 142, crouched: true, ventJump: true, secured: false },
      { x: 874, y: 196, crouched: true, ventJump: false, secured: false },
      { x: 640, y: 204, crouched: true, ventJump: false, secured: false },
      { x: 640, y: 355, crouched: false, ventJump: false, secured: true },
      { x: 640, y: 196, crouched: true, ventJump: false, secured: true },
      { x: 932, y: 356, crouched: false, ventJump: false, secured: true },
      { x: 1152, y: 146, crouched: false, ventJump: false, secured: true },
    ];
    state.status = 'EXTRACTED';
    state.summary = buildHeistSummary(state);
    recomputeAllCones(state);
    return true;
  }

  return false;
}

bootGame();
