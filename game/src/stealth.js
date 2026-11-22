// Core heist stealth simulation: movement, acoustics, fair detection/caught cause, loot, payout.

import { buildPerimeterWalls, getVault, getVaultCount } from './vaults.js';
import { collectOpaqueSegments, findShadowCover } from './raycast.js';
import { alertGuardsBySound, createGuards, recomputeGuardCones, stepGuards } from './patrols.js';
import { createCameras, createLasers, recomputeCameraCones, stepCamerasAndLasers } from './cameras.js';
import { createGadgetLoadout, stepGadgets, triggerGadget } from './gadgets.js';

export const CAUGHT_GRACE_SEC = 1.2;

export function getAlarmStatus(alarm, status) {
  if (status === 'EXTRACTED') return { code: 'ESCAPED', color: '#42e89d' };
  if (status === 'CAUGHT' || alarm >= 100) return { code: 'COMPROMISED', color: '#ff3b52' };
  if (alarm >= 65) return { code: 'HUNTING', color: '#ff5248' };
  if (alarm >= 30) return { code: 'SUSPICIOUS', color: '#f5a638' };
  return { code: 'UNSEEN', color: '#46e2b4' };
}

export function createHeistState(vaultIndex = 0) {
  const state = {
    vaultIndex: 0,
    vaultCount: getVaultCount(),
    completedVaults: new Set(),
    status: 'PLAYING',
    time: 0,
    elapsed: 0,
    alarm: 0,
    peakAlarm: 0,
    exposure: 0,
    noiseLevel: 0,
    spottedBy: null,
    caughtSpotter: null,
    caughtCause: '',
    lastSeen: null,
    lootSecured: false,
    collectedValue: 0,
    toolSpent: 0,
    activeGadgetId: 'decoy',
    ventCooldown: 0,
    flashBanner: null,
    summary: null,
    pointer: { x: 492, y: 354, active: false },
    trail: [],
    noiseRings: [],
    empPulses: [],
    decoys: [],
    smokes: [],
    loopArcs: [],
    particles: [],
    vault: null,
    walls: [],
    alcoves: [],
    props: [],
    vents: [],
    breakers: [],
    lasers: [],
    loot: null,
    bonuses: [],
    exit: null,
    guards: [],
    cameras: [],
    gadgets: [],
    player: null,
    solidRects: [],
    opaqueSegments: [],
    nearPrompt: null,
  };
  loadVault(state, vaultIndex);
  return state;
}

export function loadVault(state, vaultIndex) {
  const v = getVault(vaultIndex);
  state.vaultIndex = v.index;
  state.vault = v;
  state.status = 'PLAYING';
  state.time = 0;
  state.elapsed = 0;
  state.alarm = 0;
  state.peakAlarm = 0;
  state.exposure = 0;
  state.noiseLevel = 0;
  state.spottedBy = null;
  state.caughtSpotter = null;
  state.caughtCause = '';
  state.lastSeen = null;
  state.lootSecured = false;
  state.collectedValue = 0;
  state.toolSpent = 0;
  state.activeGadgetId = 'decoy';
  state.ventCooldown = 0;
  state.flashBanner = null;
  state.summary = null;
  state.noiseRings = [];
  state.empPulses = [];
  state.decoys = [];
  state.smokes = [];
  state.loopArcs = [];
  state.particles = [];
  state.nearPrompt = null;

  state.walls = [...buildPerimeterWalls(), ...v.walls];
  state.alcoves = v.alcoves || [];
  state.props = v.props;
  state.vents = v.vents;
  state.breakers = v.breakers.map((b) => ({ ...b, cut: false }));
  state.lasers = createLasers(v.lasers);
  state.loot = { ...v.loot, progress: 0, taken: false };
  state.bonuses = v.bonuses.map((b) => ({ ...b, progress: 0, taken: false }));
  state.exit = { ...v.exit };
  state.guards = createGuards(v.guards);
  state.cameras = createCameras(v.cameras);
  state.gadgets = createGadgetLoadout();
  state.solidRects = [...state.walls, ...state.props];
  state.opaqueSegments = collectOpaqueSegments(state.walls, state.props);

  state.player = {
    x: v.spawn.x,
    y: v.spawn.y,
    radius: 14,
    angle: v.spawn.angle ?? 0,
    crouched: false,
    inCover: false,
    coverProp: null,
    stepTimer: 0,
    stride: 0,
    speed: 0,
    soundRadius: 0,
  };
  state.trail = [{ x: v.spawn.x, y: v.spawn.y, crouched: false, ventJump: false, secured: false }];
  recomputeAllVision(state);
}

export function recomputeAllVision(state) {
  recomputeCameraCones(state.cameras, state.opaqueSegments, state.smokes);
  recomputeGuardCones(state.guards, state.opaqueSegments, state.smokes);
}

export function spawnParticles(state, x, y, color, count = 12, speed = 105) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + (state.time * 1.9 + i) * 0.43;
    const sp = speed * (0.45 + ((i * 37) % 10) / 14);
    state.particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.42 + ((i * 19) % 10) * 0.03, maxLife: 0.72, size: 2.2 + (i % 3) * 0.8, color,
    });
  }
}

function resolveCollision(player, solidRects) {
  for (const r of solidRects) {
    const cx = Math.max(r.x, Math.min(player.x, r.x + r.w));
    const cy = Math.max(r.y, Math.min(player.y, r.y + r.h));
    const dx = player.x - cx;
    const dy = player.y - cy;
    const dSq = dx * dx + dy * dy;
    if (dSq < player.radius * player.radius) {
      const d = Math.sqrt(dSq) || 0.001;
      const push = player.radius - d;
      player.x += (dx / d) * push;
      player.y += (dy / d) * push;
    }
  }
}

export function recordTrail(state, force = false, ventJump = false) {
  const { player, trail } = state;
  const last = trail[trail.length - 1];
  if (force || !last || Math.hypot(player.x - last.x, player.y - last.y) >= 12) {
    trail.push({
      x: Math.round(player.x),
      y: Math.round(player.y),
      crouched: player.crouched,
      ventJump,
      secured: state.lootSecured,
    });
  }
}

export function buildSummary(state) {
  const baseVal = state.vault.loot.value;
  const grossLoot = state.collectedValue;
  const toolCost = state.toolSpent;
  const ghostBonus = state.peakAlarm < 30 ? 60000 : state.peakAlarm < 60 ? 25000 : 0;
  const speedBonus = state.elapsed <= state.vault.parTime ? 40000 : 0;
  const netPayout = Math.max(0, grossLoot - toolCost + ghostBonus + speedBonus);
  let rank = 'C';
  if (netPayout >= baseVal && state.peakAlarm < 38) rank = 'S';
  else if (netPayout >= baseVal * 0.85) rank = 'A';
  else if (netPayout >= baseVal * 0.68) rank = 'B';

  return {
    title: state.vault.title,
    lootName: state.vault.loot.name,
    grossLoot,
    toolCost,
    ghostBonus,
    speedBonus,
    netPayout,
    peakAlarm: Math.round(state.peakAlarm),
    elapsed: state.elapsed,
    rank,
    medals: [
      { label: 'GHOST', earned: state.peakAlarm < 35, detail: `PEAK ${Math.round(state.peakAlarm)}%` },
      { label: toolCost === 0 ? 'ZERO FEE' : 'CLEAN OPS', earned: toolCost <= 40000, detail: toolCost === 0 ? '$0' : `-$${Math.round(toolCost / 1000)}K` },
      { label: 'CLOCKWORK', earned: state.elapsed <= state.vault.parTime, detail: `${state.elapsed.toFixed(1)}s` },
    ],
  };
}

export function triggerInteract(state, audio) {
  if (state.status !== 'PLAYING') return false;
  const { player } = state;

  if (state.ventCooldown <= 0) {
    for (const v of state.vents) {
      if (Math.hypot(player.x - v.x, player.y - v.y) <= 44) {
        const dest = state.vents.find((o) => o.id === v.pairId);
        if (dest) {
          recordTrail(state, true, false);
          spawnParticles(state, v.x, v.y, '#58e8dc', 10, 90);
          player.x = dest.x;
          player.y = dest.y;
          state.ventCooldown = 0.65;
          recordTrail(state, true, true);
          spawnParticles(state, dest.x, dest.y, '#58e8dc', 12, 100);
          state.flashBanner = { text: 'VENT DUCT TRAVERSED — FLANKING ROUTE OPEN', color: '#58e8dc', timer: 1.5 };
          audio?.playVent();
          return true;
        }
      }
    }
  }

  for (const b of state.breakers) {
    if (!b.cut && Math.hypot(player.x - b.x, player.y - b.y) <= 56) {
      b.cut = true;
      for (const lid of b.targetLaserIds) {
        const laser = state.lasers.find((l) => l.id === lid);
        if (laser) laser.disabled = true;
      }
      spawnParticles(state, b.x, b.y, '#42e89d', 14, 115);
      state.flashBanner = { text: 'BREAKER CUT — LASER GATE DISABLED', color: '#42e89d', timer: 1.6 };
      audio?.playTap();
      return true;
    }
  }
  return false;
}

export function applyGadget(state, gadgetId, audio) {
  const ok = triggerGadget(state, gadgetId, state.solidRects, audio);
  if (ok) {
    const col = gadgetId === 'emp' ? '#38d8f5' : gadgetId === 'decoy' ? '#f2c14e' : gadgetId === 'smoke' ? '#b0d8e8' : '#42e098';
    spawnParticles(state, state.player.x, state.player.y, col, 14, 125);
  }
  return ok;
}

export function stepHeist(state, input, dt, audio) {
  const d = Math.min(dt, 0.05);
  state.time += d;

  if (state.flashBanner) {
    state.flashBanner.timer -= d;
    if (state.flashBanner.timer <= 0) state.flashBanner = null;
  }

  if (state.status !== 'PLAYING') {
    stepGadgets(state, d * 0.35);
    return;
  }

  state.elapsed += d;
  if (state.ventCooldown > 0) state.ventCooldown = Math.max(0, state.ventCooldown - d);

  const { player } = state;
  let mx = 0;
  let my = 0;
  if (input.up) my -= 1;
  if (input.down) my += 1;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  const moving = mx !== 0 || my !== 0;

  player.crouched = Boolean(input.crouch || input.cover);
  const speed = player.crouched ? 102 : 162;

  if (moving) {
    const len = Math.hypot(mx, my);
    mx /= len;
    my /= len;
    const px = player.x;
    const py = player.y;
    player.x += mx * speed * d;
    player.y += my * speed * d;
    player.angle = Math.atan2(my, mx);
    player.speed = speed;
    resolveCollision(player, state.solidRects);
    player.stride += Math.hypot(player.x - px, player.y - py) * 0.14;
    recordTrail(state, false, false);

    player.soundRadius = player.crouched ? 0 : 72;
    state.noiseLevel = player.crouched ? Math.max(0, state.noiseLevel - d * 90) : Math.min(68, state.noiseLevel + d * 120);

    player.stepTimer -= d;
    if (player.stepTimer <= 0) {
      if (!player.crouched) {
        player.stepTimer = 0.42;
        state.noiseRings.push({ x: player.x, y: player.y, r: 10, maxR: 72, alpha: 0.46 });
        alertGuardsBySound(state.guards, player.x, player.y, 72);
        audio?.playFootstep(false);
      } else {
        player.stepTimer = 0.58;
      }
    }
  } else {
    player.speed = 0;
    player.soundRadius = 0;
    state.noiseLevel = Math.max(0, state.noiseLevel - d * 110);
    if (state.pointer.active) {
      player.angle = Math.atan2(state.pointer.y - player.y, state.pointer.x - player.x);
    }
  }

  const cov = findShadowCover(player.x, player.y, state.alcoves, state.props, state.smokes);
  player.inCover = cov.inCover;
  player.coverProp = cov.prop;

  for (let i = state.noiseRings.length - 1; i >= 0; i--) {
    const n = state.noiseRings[i];
    n.r += d * 135;
    n.alpha -= d * 0.95;
    if (n.alpha <= 0 || n.r >= n.maxR) state.noiseRings.splice(i, 1);
  }
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * d;
    p.y += p.vy * d;
    p.vx *= 0.93;
    p.vy *= 0.93;
    p.life -= d;
    if (p.life <= 0) state.particles.splice(i, 1);
  }

  stepGadgets(state, d);

  // Interactive proximity prompts & vault cracking
  state.nearPrompt = null;
  if (!state.loot.taken && Math.hypot(player.x - state.loot.x, player.y - state.loot.y) <= 58) {
    const boost = input.interact ? 1.55 : 1.0;
    const prev = state.loot.progress;
    state.loot.progress = Math.min(state.loot.crackTime, state.loot.progress + d * boost);
    state.nearPrompt = { x: state.loot.x, y: state.loot.y - 44, text: `CRACKING VAULT ${Math.round((state.loot.progress / state.loot.crackTime) * 100)}%` };
    if (Math.floor(state.loot.progress * 7) !== Math.floor(prev * 7)) {
      audio?.playTumblerClick();
      spawnParticles(state, state.loot.x, state.loot.y, '#ffe078', 4, 75);
    }
    if (state.loot.progress >= state.loot.crackTime) {
      state.loot.taken = true;
      state.lootSecured = true;
      state.collectedValue += state.loot.value;
      recordTrail(state, true, false);
      spawnParticles(state, state.loot.x, state.loot.y, '#ffd85e', 24, 145);
      state.flashBanner = { text: `${state.loot.name} SECURED · REACH EXTRACTION LIFT!`, color: '#ffe06e', timer: 2.5 };
      audio?.playLootSecured();
    }
  } else if (!state.loot.taken && state.loot.progress > 0) {
    state.loot.progress = Math.max(0, state.loot.progress - d * 0.35);
  }

  for (const b of state.bonuses) {
    if (!b.taken && Math.hypot(player.x - b.x, player.y - b.y) <= 44) {
      b.progress = Math.min(b.crackTime, b.progress + d * (input.interact ? 1.5 : 1.0));
      state.nearPrompt = { x: b.x, y: b.y - 32, text: `TAKING ${b.name}` };
      if (b.progress >= b.crackTime) {
        b.taken = true;
        state.collectedValue += b.value;
        spawnParticles(state, b.x, b.y, '#ffe06e', 14, 105);
        audio?.playLootSecured();
      }
    }
  }

  if (!state.nearPrompt) {
    for (const v of state.vents) {
      if (Math.hypot(player.x - v.x, player.y - v.y) <= 44) {
        state.nearPrompt = { x: v.x, y: v.y - 30, text: '[E] ENTER VENT DUCT' };
        break;
      }
    }
  }
  if (!state.nearPrompt) {
    for (const b of state.breakers) {
      if (!b.cut && Math.hypot(player.x - b.x, player.y - b.y) <= 56) {
        state.nearPrompt = { x: b.x, y: b.y - 26, text: '[E] CUT LASER BREAKER' };
        break;
      }
    }
  }

  // Security & fair detection
  const camSpot = stepCamerasAndLasers(state, d, state.opaqueSegments, audio);
  const guardSpot = stepGuards(state, d, state.opaqueSegments, state.solidRects, audio);
  const spotter = guardSpot || camSpot;

  if (spotter) {
    state.spottedBy = spotter;
    state.exposure = Math.min(1, state.exposure + d / CAUGHT_GRACE_SEC);
    if (state.exposure >= 1 || state.alarm >= 100) {
      state.status = 'CAUGHT';
      state.alarm = 100;
      state.exposure = 1;
      state.caughtSpotter = spotter;
      state.caughtCause = spotter.reason;
      audio?.playCaughtFail();
    }
  } else {
    state.spottedBy = null;
    state.exposure = Math.max(0, state.exposure - d * 1.25);
    if (state.alarm > 0 && state.alarm < 98) {
      state.alarm = Math.max(0, state.alarm - d * (state.lootSecured ? 1.5 : 2.8));
    }
  }

  state.peakAlarm = Math.max(state.peakAlarm, state.alarm);
  if (state.lastSeen) {
    state.lastSeen.timer -= d;
    if (state.lastSeen.timer <= 0) state.lastSeen = null;
  }

  if (state.status === 'PLAYING' && state.lootSecured) {
    if (Math.hypot(player.x - state.exit.x, player.y - state.exit.y) <= state.exit.radius + 14) {
      recordTrail(state, true, false);
      state.status = 'EXTRACTED';
      state.completedVaults.add(state.vaultIndex);
      state.summary = buildSummary(state);
      audio?.playGetawayFanfare();
    }
  }
}
