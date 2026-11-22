// Core heist simulation engine: movement, cover stealth, rotary lock breach, vents, trail, payout.

import { buildPerimeterWalls, getVault, getVaultCount } from './vaults.js';
import { collectOpaqueSegments, findAdjacentCover, propagateAcousticAlert } from './lighting.js';
import { createCameras, createGuards, setGuardBark, stepSecurity } from './guards.js';
import { activateGadget, createGadgetLoadout, stepGadgets } from './gadgets.js';

export function createEngine(vaultIndex = 0) {
  const state = {
    vaultIndex: 0,
    vaultCount: getVaultCount(),
    status: 'PLAYING',
    time: 0,
    elapsed: 0,
    alarm: 0,
    peakAlarm: 0,
    caughtGrace: 0,
    caughtReason: '',
    spottedBy: null,
    lastSeen: null,
    lootSecured: false,
    collectedValue: 0,
    toolSpent: 0,
    activeGadgetId: 'emp',
    ventCooldown: 0,
    flashBanner: null,
    summary: null,
    pointer: { x: 640, y: 360, active: false },
    trail: [],
    noiseRings: [],
    empPulses: [],
    decoys: [],
    smokes: [],
    tapArcs: [],
    particles: [],
    vault: null,
    walls: [],
    props: [],
    vents: [],
    relays: [],
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
  state.caughtGrace = 0;
  state.caughtReason = '';
  state.spottedBy = null;
  state.lastSeen = null;
  state.lootSecured = false;
  state.collectedValue = 0;
  state.toolSpent = 0;
  state.activeGadgetId = 'emp';
  state.ventCooldown = 0;
  state.flashBanner = null;
  state.summary = null;
  state.noiseRings = [];
  state.empPulses = [];
  state.decoys = [];
  state.smokes = [];
  state.tapArcs = [];
  state.particles = [];
  state.nearPrompt = null;

  state.walls = [...buildPerimeterWalls(), ...v.walls];
  state.props = v.props;
  state.vents = v.vents;
  state.relays = v.relays.map((r) => ({ ...r, hacked: false, progress: 0, hackTime: 0.75 }));
  state.lasers = v.lasers.map((l) => ({ ...l, disabled: false, empTimer: 0 }));
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
    radius: 16,
    angle: v.spawn.angle ?? 0,
    crouched: false,
    sprinting: false,
    inCover: false,
    coverProp: null,
    stepTimer: 0,
    stride: 0,
    speed: 0,
  };

  state.trail = [{ x: v.spawn.x, y: v.spawn.y, crouched: false, ventJump: false, secured: false }];
  stepSecurity(state, 0.001, state.opaqueSegments, state.solidRects, null);
}

export function spawnParticles(state, x, y, color, count = 12, speed = 115) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + (state.time * 1.9 + i) * 0.41;
    const sp = speed * (0.45 + ((i * 37) % 10) / 14);
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0.44 + ((i * 19) % 10) * 0.03,
      maxLife: 0.72,
      size: 2.4 + (i % 3) * 0.9,
      color,
    });
  }
}

function resolvePlayerCollisions(player, solidRects) {
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

export function recordTrailPoint(state, force = false, ventJump = false) {
  const { player, trail } = state;
  const last = trail[trail.length - 1];
  if (force || !last || Math.hypot(player.x - last.x, player.y - last.y) >= 14) {
    trail.push({
      x: Math.round(player.x),
      y: Math.round(player.y),
      crouched: player.crouched,
      ventJump,
      secured: state.lootSecured,
    });
  }
}

export function buildHeistSummary(state) {
  const primaryVal = state.vault.loot.value;
  const grossLoot = state.collectedValue;
  const toolCost = state.toolSpent;
  const ghostBonus = state.peakAlarm < 30 ? 60000 : state.peakAlarm < 60 ? 25000 : 0;
  const speedBonus = state.elapsed <= state.vault.parTime ? 40000 : 0;
  const netPayout = Math.max(0, grossLoot - toolCost + ghostBonus + speedBonus);

  const medals = [
    { label: 'GHOST', earned: state.peakAlarm < 35, detail: `PEAK ${Math.round(state.peakAlarm)}%` },
    { label: toolCost === 0 ? 'ZERO COST' : 'CLEAN OPS', earned: toolCost <= 40000, detail: toolCost === 0 ? '$0 FEE' : `-$${Math.round(toolCost / 1000)}K` },
    { label: 'CLOCKWORK', earned: state.elapsed <= state.vault.parTime, detail: `${state.elapsed.toFixed(1)}s` },
  ];

  let rank = 'C';
  if (netPayout >= primaryVal && state.peakAlarm < 40) rank = 'S';
  else if (netPayout >= primaryVal * 0.85) rank = 'A';
  else if (netPayout >= primaryVal * 0.68) rank = 'B';

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
    rankTitle: rank === 'S' ? 'GHOST S' : rank === 'A' ? 'MASTER A' : rank === 'B' ? 'AGENT B' : 'ESCAPED C',
    medals,
  };
}

export function triggerInteract(state, audio) {
  if (state.status !== 'PLAYING') return false;
  const { player } = state;

  if (state.ventCooldown <= 0) {
    for (const v of state.vents) {
      if (Math.hypot(player.x - v.x, player.y - v.y) <= 48) {
        const dest = state.vents.find((o) => o.id === v.pairId);
        if (dest) {
          recordTrailPoint(state, true, false);
          spawnParticles(state, v.x, v.y, '#4cefe0', 10, 95);
          player.x = dest.x;
          player.y = dest.y;
          state.ventCooldown = 0.7;
          recordTrailPoint(state, true, true);
          spawnParticles(state, dest.x, dest.y, '#4cefe0', 12, 110);
          state.flashBanner = { text: `VENT BYPASS → ${dest.label}`, color: '#4cefe0', timer: 1.5 };
          audio?.playVent();
          return true;
        }
      }
    }
  }

  for (const r of state.relays) {
    if (!r.hacked && Math.hypot(player.x - r.x, player.y - r.y) <= 60) {
      r.hacked = true;
      r.progress = r.hackTime;
      for (const lid of r.targetLaserIds) {
        const laser = state.lasers.find((l) => l.id === lid);
        if (laser) laser.disabled = true;
      }
      spawnParticles(state, r.x, r.y, '#3cf0a2', 16, 125);
      state.flashBanner = { text: 'RELAY OVERRIDDEN · LASER GATE CUT', color: '#3cf0a2', timer: 1.7 };
      audio?.playTap();
      return true;
    }
  }
  return false;
}

export function applyGadgetKey(state, gadgetId, audio) {
  const ok = activateGadget(state, gadgetId, state.solidRects, audio);
  if (ok) {
    const col = gadgetId === 'emp' ? '#38ebff' : gadgetId === 'decoy' ? '#f8cb58' : gadgetId === 'smoke' ? '#a8e2f5' : '#3cf0a2';
    spawnParticles(state, state.player.x, state.player.y, col, 16, 135);
  }
  return ok;
}

export function stepEngine(state, input, dt, audio) {
  const clampedDt = Math.min(dt, 0.05);
  state.time += clampedDt;

  if (state.flashBanner) {
    state.flashBanner.timer -= clampedDt;
    if (state.flashBanner.timer <= 0) state.flashBanner = null;
  }

  if (state.status !== 'PLAYING') {
    stepGadgets(state, clampedDt * 0.4);
    return;
  }

  state.elapsed += clampedDt;
  if (state.ventCooldown > 0) state.ventCooldown = Math.max(0, state.ventCooldown - clampedDt);

  const { player } = state;
  let mx = 0;
  let my = 0;
  if (input.up) my -= 1;
  if (input.down) my += 1;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;

  const moving = mx !== 0 || my !== 0;
  player.crouched = Boolean(input.crouch);
  player.sprinting = Boolean(input.sprint) && moving && !player.crouched;

  const moveSpeed = player.crouched ? 108 : player.sprinting ? 236 : 162;
  if (moving) {
    const len = Math.hypot(mx, my);
    mx /= len;
    my /= len;
    const px = player.x;
    const py = player.y;
    player.x += mx * moveSpeed * clampedDt;
    player.y += my * moveSpeed * clampedDt;
    player.angle = Math.atan2(my, mx);
    player.speed = moveSpeed;
    resolvePlayerCollisions(player, state.solidRects);
    player.stride += Math.hypot(player.x - px, player.y - py) * 0.14;
    recordTrailPoint(state, false, false);

    player.stepTimer -= clampedDt;
    if (player.stepTimer <= 0) {
      if (player.sprinting) {
        player.stepTimer = 0.34;
        state.noiseRings.push({ x: player.x, y: player.y, r: 12, maxR: 162, alpha: 0.78, loud: true });
        const heard = propagateAcousticAlert(player.x, player.y, 162, state.guards);
        for (const h of heard) {
          if (h.guard.state === 'PATROL') {
            h.guard.state = 'SUSPICIOUS';
            h.guard.investigatePos = { x: player.x, y: player.y };
            h.guard.alertTimer = 2.8;
            setGuardBark(h.guard, 'Footsteps nearby!', 2.0);
          }
        }
        audio?.playFootstep(true);
      } else if (!player.crouched) {
        player.stepTimer = 0.46;
        state.noiseRings.push({ x: player.x, y: player.y, r: 10, maxR: 56, alpha: 0.35, loud: false });
        audio?.playFootstep(false);
      } else {
        player.stepTimer = 0.6;
      }
    }
  } else {
    player.speed = 0;
    if (state.pointer.active) {
      player.angle = Math.atan2(state.pointer.y - player.y, state.pointer.x - player.x);
    }
  }

  const cover = findAdjacentCover(player.x, player.y, state.props, state.smokes);
  player.inCover = cover.inCover;
  player.coverProp = cover.prop;

  // Step acoustic rings & particles
  for (let i = state.noiseRings.length - 1; i >= 0; i--) {
    const n = state.noiseRings[i];
    n.r += clampedDt * (n.loud ? 275 : 125);
    n.alpha -= clampedDt * (n.loud ? 1.15 : 0.95);
    if (n.alpha <= 0 || n.r >= n.maxR) state.noiseRings.splice(i, 1);
  }
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * clampedDt;
    p.y += p.vy * clampedDt;
    p.vx *= 0.93;
    p.vy *= 0.93;
    p.life -= clampedDt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }

  stepGadgets(state, clampedDt);

  // Interactive rotary lock breach & proximity hints
  state.nearPrompt = null;
  if (!state.loot.taken && Math.hypot(player.x - state.loot.x, player.y - state.loot.y) <= 64) {
    const boost = input.interact ? 1.55 : 1.0;
    const prev = state.loot.progress;
    state.loot.progress = Math.min(state.loot.crackTime, state.loot.progress + clampedDt * boost);
    state.nearPrompt = { x: state.loot.x, y: state.loot.y - 48, text: `BREACHING LOCK ${Math.round((state.loot.progress / state.loot.crackTime) * 100)}%` };
    if (Math.floor(state.loot.progress * 7) !== Math.floor(prev * 7)) {
      audio?.playTumblerClick();
      spawnParticles(state, state.loot.x, state.loot.y, '#ffe078', 4, 80);
    }
    if (state.loot.progress >= state.loot.crackTime) {
      state.loot.taken = true;
      state.lootSecured = true;
      state.collectedValue += state.loot.value;
      recordTrailPoint(state, true, false);
      spawnParticles(state, state.loot.x, state.loot.y, '#ffd85e', 24, 155);
      state.flashBanner = {
        text: `${state.loot.name} SECURED ($${Math.round(state.loot.value / 1000)}K) · REACH EXIT LIFT!`,
        color: '#ffe06e',
        timer: 2.5,
      };
      audio?.playLootSecured();
    }
  } else if (!state.loot.taken && state.loot.progress > 0) {
    state.loot.progress = Math.max(0, state.loot.progress - clampedDt * 0.35);
  }

  for (const b of state.bonuses) {
    if (!b.taken && Math.hypot(player.x - b.x, player.y - b.y) <= 48) {
      b.progress = Math.min(b.crackTime, b.progress + clampedDt * (input.interact ? 1.5 : 1.0));
      state.nearPrompt = { x: b.x, y: b.y - 36, text: `TAKING ${b.name}` };
      if (b.progress >= b.crackTime) {
        b.taken = true;
        state.collectedValue += b.value;
        spawnParticles(state, b.x, b.y, '#ffe06e', 14, 110);
        state.flashBanner = { text: `BONUS ${b.name} +$${Math.round(b.value / 1000)}K`, color: '#ffe06e', timer: 1.7 };
        audio?.playLootSecured();
      }
    }
  }

  if (!state.nearPrompt) {
    for (const v of state.vents) {
      if (Math.hypot(player.x - v.x, player.y - v.y) <= 48) {
        state.nearPrompt = { x: v.x, y: v.y - 34, text: '[E] ENTER VENT' };
        break;
      }
    }
  }
  if (!state.nearPrompt) {
    for (const r of state.relays) {
      if (!r.hacked && Math.hypot(player.x - r.x, player.y - r.y) <= 60) {
        state.nearPrompt = { x: r.x, y: r.y - 28, text: '[E] CUT LASER RELAY' };
        break;
      }
    }
  }

  stepSecurity(state, clampedDt, state.opaqueSegments, state.solidRects, audio);

  if (state.status === 'PLAYING' && state.lootSecured) {
    if (Math.hypot(player.x - state.exit.x, player.y - state.exit.y) <= state.exit.radius + 14) {
      recordTrailPoint(state, true, false);
      state.status = 'EXTRACTED';
      state.summary = buildHeistSummary(state);
      audio?.playGetawayFanfare();
    }
  }
}
