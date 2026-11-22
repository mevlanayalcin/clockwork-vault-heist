// Gilded Clockwork v4 — entry point, fixed-step loop, input binding, 5-vault flow, showcase hooks.

import { MAP, SCREEN_H, SCREEN_W } from './vaults.js';
import { findShadowCover } from './raycast.js';
import { setGuardBark } from './patrols.js';
import { GADGET_DEFS } from './gadgets.js';
import {
  applyGadget,
  buildSummary,
  createHeistState,
  loadVault,
  recomputeAllVision,
  spawnParticles,
  stepHeist,
  triggerInteract,
} from './stealth.js';
import { createRenderer } from './renderer.js';
import { hitTestToolBelt } from './hud.js';
import { createAudioEngine } from './audio.js';

export function bootGame() {
  const canvas = document.getElementById('stage');
  const renderer = createRenderer(canvas);
  const audio = createAudioEngine();
  const params = new URLSearchParams(window.location.search);
  const startVault = Math.max(0, Number(params.get('vault') || 0) | 0);
  const shotMode = params.get('shot');

  const state = createHeistState(startVault);
  const input = { up: false, down: false, left: false, right: false, crouch: false, cover: false, interact: false };
  let frozen = false;

  if (shotMode) {
    frozen = applyShowcaseShot(state, shotMode);
  }

  function syncTelemetry() {
    canvas.dataset.status = state.status;
    canvas.dataset.vault = String(state.vaultIndex);
    canvas.dataset.x = String(Math.round(state.player.x));
    canvas.dataset.y = String(Math.round(state.player.y));
    canvas.dataset.loot = state.lootSecured ? '1' : '0';
    canvas.dataset.alarm = String(Math.round(state.alarm));
    canvas.dataset.exposure = state.exposure.toFixed(2);
    canvas.dataset.toolsSpent = String(state.toolSpent);
    canvas.dataset.trailLen = String(state.trail.length);
  }

  function onKeyDown(e) {
    audio.unlock();
    const c = e.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(c)) e.preventDefault();

    if (c === 'KeyW' || c === 'ArrowUp') input.up = true;
    if (c === 'KeyS' || c === 'ArrowDown') input.down = true;
    if (c === 'KeyA' || c === 'ArrowLeft') input.left = true;
    if (c === 'KeyD' || c === 'ArrowRight') input.right = true;
    if (c === 'ShiftLeft' || c === 'ShiftRight') input.crouch = true;
    if (c === 'Space' || c === 'ControlLeft' || c === 'ControlRight') input.cover = true;
    if (c === 'KeyE') {
      input.interact = true;
      if (!e.repeat) triggerInteract(state, audio);
    }

    if (!e.repeat) {
      if (c === 'Digit1') applyGadget(state, 'decoy', audio);
      if (c === 'Digit2') applyGadget(state, 'emp', audio);
      if (c === 'Digit3') applyGadget(state, 'smoke', audio);
      if (c === 'Digit4') applyGadget(state, 'camloop', audio);
      if (c === 'KeyR') {
        frozen = false;
        loadVault(state, state.vaultIndex);
      }
      if (c === 'KeyN' && state.status === 'EXTRACTED') {
        frozen = false;
        loadVault(state, (state.vaultIndex + 1) % state.vaultCount);
      }
      if (c === 'KeyM') audio.toggleMute();
      if (c === 'BracketRight') loadVault(state, (state.vaultIndex + 1) % state.vaultCount);
    }
  }

  function onKeyUp(e) {
    const c = e.code;
    if (c === 'KeyW' || c === 'ArrowUp') input.up = false;
    if (c === 'KeyS' || c === 'ArrowDown') input.down = false;
    if (c === 'KeyA' || c === 'ArrowLeft') input.left = false;
    if (c === 'KeyD' || c === 'ArrowRight') input.right = false;
    if (c === 'ShiftLeft' || c === 'ShiftRight') input.crouch = false;
    if (c === 'Space' || c === 'ControlLeft' || c === 'ControlRight') input.cover = false;
    if (c === 'KeyE') input.interact = false;
  }

  function onPointerMove(e) {
    const pt = renderer.screenToLogical(e.clientX, e.clientY);
    state.pointer.x = Math.max(0, Math.min(SCREEN_W, pt.x));
    state.pointer.y = Math.max(0, Math.min(SCREEN_H, pt.y));
    state.pointer.active = true;
  }

  function onPointerDown(e) {
    audio.unlock();
    const pt = renderer.screenToLogical(e.clientX, e.clientY);
    state.pointer.x = pt.x;
    state.pointer.y = pt.y;
    state.pointer.active = true;

    const idx = hitTestToolBelt(pt.x, pt.y);
    if (idx >= 0 && idx < GADGET_DEFS.length) {
      applyGadget(state, GADGET_DEFS[idx].id, audio);
      return;
    }

    if (state.status === 'CAUGHT' && pt.x < MAP.w) {
      frozen = false;
      loadVault(state, state.vaultIndex);
      return;
    }
    if (state.status === 'EXTRACTED' && pt.x < MAP.w) {
      frozen = false;
      loadVault(state, (state.vaultIndex + 1) % state.vaultCount);
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
      stepHeist(state, input, dt, audio);
      if (state.status === 'PLAYING') audio.tickTension(state.alarm, dt);
    }
    syncTelemetry();
    renderer.render(state, audio.isMuted());
    requestAnimationFrame(frame);
  }

  syncTelemetry();
  renderer.render(state, audio.isMuted());
  requestAnimationFrame(frame);
}

function applyShowcaseShot(state, shot) {
  if (shot === 'infiltration') {
    // Shot 1: Vault 1 — Live infiltration with thief in cover, 3 routes, numbered patrols, cameras, laser+breaker, loot, alarm 12%
    loadVault(state, 0);
    state.time = 11.4;
    state.elapsed = 11.4;
    state.alarm = 12;
    state.peakAlarm = 12;
    state.noiseLevel = 8;
    state.player.x = 316;
    state.player.y = 582;
    state.player.angle = -0.35;
    state.player.crouched = true;
    const cov = findShadowCover(state.player.x, state.player.y, state.alcoves, state.props, state.smokes);
    state.player.inCover = cov.inCover;
    state.player.coverProp = cov.prop;
    state.trail = [
      { x: 64, y: 586, crouched: false, ventJump: false, secured: false },
      { x: 160, y: 544, crouched: true, ventJump: false, secured: false },
      { x: 256, y: 584, crouched: true, ventJump: false, secured: false },
      { x: 316, y: 582, crouched: true, ventJump: false, secured: false },
    ];
    state.guards[0].x = 316;
    state.guards[0].y = 334;
    state.guards[0].angle = 1.56;
    state.guards[1].x = 610;
    state.guards[1].y = 186;
    state.guards[1].angle = 2.66;
    setGuardBark(state.guards[1], 'Sanctum perimeter clear', 6);
    state.guards[2].x = 618;
    state.guards[2].y = 556;
    state.guards[2].angle = -2.74;
    state.cameras[0].angle = 2.52;
    state.cameras[1].angle = 3.5;
    recomputeAllVision(state);
    return true;
  }

  if (shot === 'near-miss') {
    // Shot 2: Vault 2 — High-tension near-miss: guard ? INVESTIGATING 58% decoy, EMP-stunned camera, sweeping lantern inches from thief!
    loadVault(state, 1);
    state.completedVaults.add(0);
    state.time = 21.8;
    state.elapsed = 21.8;
    state.alarm = 48;
    state.peakAlarm = 48;
    state.exposure = 0;
    state.noiseLevel = 10;
    state.player.x = 492;
    state.player.y = 394;
    state.player.angle = -0.15;
    state.player.crouched = true;
    const cov = findShadowCover(state.player.x, state.player.y, state.alcoves, state.props, state.smokes);
    state.player.inCover = cov.inCover;
    state.player.coverProp = cov.prop;

    // Gadget spend: Decoy (-$25K) + EMP (-$40K)
    state.gadgets[0].remaining = 1;
    state.gadgets[0].used = 1;
    state.gadgets[1].remaining = 1;
    state.gadgets[1].used = 1;
    state.toolSpent = 65000;
    state.activeGadgetId = 'decoy';
    state.breakers[0].cut = true;
    state.lasers[0].disabled = true;

    // Tossed Clockwork Decoy luring BRIGGS (? INVESTIGATING 58%)
    state.decoys.push({ x: 396, y: 542, lureRadius: 245, timer: 4.5, maxTimer: 6.5, phase: 1.6 });
    // EMP shockwave stunning CAM-03 + East Laser!
    state.cameras[2].empTimer = 4.1;
    state.lasers[1].empTimer = 4.1;
    state.empPulses.push({
      x: 618,
      y: 344,
      radius: 158,
      maxRadius: 215,
      timer: 0.85,
      maxTimer: 1.4,
      targets: [
        { x: state.cameras[2].x, y: state.cameras[2].y },
        { x: 743, y: 354 },
      ],
    });
    spawnParticles(state, 618, 344, '#46e8ff', 10, 95);

    // Guard MOSS clear of loot banner; COLE's sweeping lantern grazes INCHES above crouched thief behind glass case!
    state.guards[0].x = 618;
    state.guards[0].y = 198;
    state.guards[0].angle = 0.52;
    state.guards[0].state = 'SEARCHING';
    state.guards[0].suspicion = 0.34;
    setGuardBark(state.guards[0], 'Power surge east!', 6);

    state.guards[1].x = 342;
    state.guards[1].y = 338;
    state.guards[1].angle = 0.04;
    state.guards[1].state = 'INVESTIGATING';
    state.guards[1].suspicion = 0.42;

    state.guards[2].x = 534;
    state.guards[2].y = 532;
    state.guards[2].angle = 3.06;
    state.guards[2].state = 'INVESTIGATING';
    state.guards[2].suspicion = 0.58;
    setGuardBark(state.guards[2], "What's ticking?", 6);

    state.guards[3].x = 856;
    state.guards[3].y = 528;
    state.guards[3].angle = -2.35;
    state.cameras[0].angle = 1.98;
    state.cameras[1].angle = -1.96;
    state.trail = [
      { x: 68, y: 354, crouched: false, ventJump: false, secured: false },
      { x: 180, y: 102, crouched: true, ventJump: false, secured: false },
      { x: 356, y: 354, crouched: true, ventJump: false, secured: false },
      { x: 492, y: 392, crouched: true, ventJump: false, secured: false },
    ];
    recomputeAllVision(state);
    return true;
  }

  if (shot === 'caught-fair') {
    // Shot 3: Vault 3 — FAIR CAUGHT / BUSTED MOMENT! Alarm 100% COMPROMISED + crimson sightline from spotting guard to thief!
    loadVault(state, 2);
    state.completedVaults.add(0);
    state.completedVaults.add(1);
    state.time = 19.6;
    state.elapsed = 19.6;
    state.alarm = 100;
    state.peakAlarm = 100;
    state.exposure = 1.0;
    state.noiseLevel = 54;
    state.status = 'CAUGHT';
    state.player.x = 456;
    state.player.y = 266;
    state.player.angle = 2.75;
    state.player.crouched = false;
    state.player.inCover = false;
    state.caughtSpotter = { kind: 'guard', x: 586, y: 244, label: 'WARDEN MARLOW' };
    state.caughtCause = "SPOTTED IN OPEN LIGHT BY WARDEN MARLOW — CROSSED GUARD CONE OUTSIDE COVER";
    state.lastSeen = { x: 318, y: 282, timer: 4.5 };

    state.guards[0].x = 586;
    state.guards[0].y = 244;
    state.guards[0].angle = Math.atan2(266 - 244, 456 - 586);
    state.guards[0].state = 'ALERT';
    state.guards[0].suspicion = 1.0;
    setGuardBark(state.guards[0], 'Intruder — freeze!', 6);

    state.guards[1].x = 278;
    state.guards[1].y = 434;
    state.guards[1].angle = -0.78;
    state.guards[1].state = 'INVESTIGATING';
    state.guards[1].suspicion = 0.64;

    state.guards[2].x = 568;
    state.guards[2].y = 468;
    state.guards[2].angle = -2.05;
    state.guards[2].state = 'ALERT';
    state.guards[2].suspicion = 0.92;
    setGuardBark(state.guards[2], 'Lock down vault!', 6);

    state.guards[3].x = 840;
    state.guards[3].y = 248;
    state.guards[3].angle = 2.45;
    state.cameras[0].angle = Math.atan2(266 - 210, 456 - 364);
    state.cameras[0].seeingPlayer = true;
    state.cameras[0].alertLevel = 1.0;
    state.cameras[1].angle = -2.35;
    state.cameras[2].angle = 2.95;
    state.trail = [
      { x: 72, y: 126, crouched: false, ventJump: false, secured: false },
      { x: 256, y: 168, crouched: true, ventJump: false, secured: false },
      { x: 356, y: 266, crouched: false, ventJump: false, secured: false },
      { x: 456, y: 266, crouched: false, ventJump: false, secured: false },
    ];
    recomputeAllVision(state);
    return true;
  }

  if (shot === 'getaway') {
    loadVault(state, 3);
    state.completedVaults.add(0);
    state.completedVaults.add(1);
    state.completedVaults.add(2);
    state.completedVaults.add(3);
    state.time = 18.4;
    state.elapsed = 18.4;
    state.alarm = 22;
    state.peakAlarm = 26;
    state.loot.taken = true;
    state.lootSecured = true;
    state.collectedValue = state.loot.value;
    state.toolSpent = 30000;
    state.gadgets[2].remaining = 1;
    state.gadgets[2].used = 1;
    state.smokes.push({ x: 836, y: 404, radius: 88, timer: 5.2, maxTimer: 7.0, alpha: 0.92 });
    state.guards[3].x = 874;
    state.guards[3].y = 262;
    state.guards[3].angle = 1.62;
    state.guards[3].state = 'SEARCHING';
    setGuardBark(state.guards[3], 'Crown is gone!', 6);
    state.player.x = state.exit.x;
    state.player.y = state.exit.y;
    state.status = 'EXTRACTED';
    state.summary = buildSummary(state);
    recomputeAllVision(state);
    return true;
  }
  return false;
}

bootGame();
