// Player movement, stealth cover, vault cracking, vent traversal, trail capture, and heist payout.

import { buildPerimeterWalls, getVaultBlueprint, getVaultCount } from './blueprints.js';
import { collectOpaqueSegments, isPointInCoverZone, propagateAcousticAlert } from './visibility.js';
import { createCameras, createGuards, setGuardBark, stepSecurity } from './security.js';
import { createToolLoadout, stepTools, triggerTool } from './tools.js';

export function createSimulation(vaultIndex = 0) {
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
    activeToolId: 'emp',
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
    blueprint: null,
    walls: [],
    plinths: [],
    alcoves: [],
    vents: [],
    relays: [],
    lasers: [],
    loot: null,
    bonuses: [],
    exit: null,
    guards: [],
    cameras: [],
    tools: [],
    player: null,
    solidRects: [],
    opaqueSegments: [],
    nearPrompt: null,
  };
  loadVault(state, vaultIndex);
  return state;
}

export function loadVault(state, vaultIndex) {
  const bp = getVaultBlueprint(vaultIndex);
  state.vaultIndex = bp.index;
  state.blueprint = bp;
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
  state.activeToolId = 'emp';
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

  const perim = buildPerimeterWalls();
  state.walls = [...perim, ...bp.walls];
  state.plinths = bp.plinths;
  state.alcoves = bp.alcoves;
  state.vents = bp.vents;
  state.relays = bp.relays.map((r) => ({ ...r, hacked: false, progress: 0 }));
  state.lasers = bp.lasers.map((l) => ({ ...l, disabled: false, empTimer: 0 }));
  state.loot = { ...bp.loot, progress: 0, taken: false };
  state.bonuses = bp.bonuses.map((b) => ({ ...b, progress: 0, taken: false }));
  state.exit = { ...bp.exit };
  state.guards = createGuards(bp.guards);
  state.cameras = createCameras(bp.cameras);
  state.tools = createToolLoadout();
  state.solidRects = [...state.walls, ...state.plinths];
  state.opaqueSegments = collectOpaqueSegments(state.walls, state.plinths);

  state.player = {
    x: bp.spawn.x,
    y: bp.spawn.y,
    radius: 13,
    angle: bp.spawn.angle ?? 0,
    crouched: false,
    sprinting: false,
    inCover: false,
    coverKind: null,
    stepTimer: 0,
    speed: 0,
  };

  state.trail = [{ x: bp.spawn.x, y: bp.spawn.y, crouched: false, ventJump: false, secured: false }];

  // Prime initial cones on frame 0 so screenshot/initial render has full geometry immediately
  stepSecurity(state, 0.001, state.opaqueSegments, state.solidRects, null);
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
  const primaryVal = state.blueprint.loot.value;
  const grossLoot = state.collectedValue;
  const toolCost = state.toolSpent;
  const ghostBonus = state.peakAlarm < 30 ? 60000 : state.peakAlarm < 60 ? 25000 : 0;
  const speedBonus = state.elapsed <= state.blueprint.parTime ? 40000 : 0;
  const netPayout = Math.max(0, grossLoot - toolCost + ghostBonus + speedBonus);

  const medals = [
    { label: 'GHOST', earned: state.peakAlarm < 35, detail: `PEAK ${Math.round(state.peakAlarm)}%` },
    { label: toolCost === 0 ? 'ZERO TOOLS' : 'CLEAN OPS', earned: toolCost <= 40000, detail: toolCost === 0 ? '$0 FEE' : `-$${Math.round(toolCost / 1000)}K` },
    { label: 'CLOCKWORK', earned: state.elapsed <= state.blueprint.parTime, detail: `${state.elapsed.toFixed(1)}s` },
  ];

  let rank = 'C';
  if (netPayout >= primaryVal && state.peakAlarm < 40) rank = 'S';
  else if (netPayout >= primaryVal * 0.85) rank = 'A';
  else if (netPayout >= primaryVal * 0.68) rank = 'B';

  return {
    title: state.blueprint.title,
    lootName: state.blueprint.loot.name,
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

export function spawnParticles(state, x, y, color, count = 12, speed = 110) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + (state.time * 1.7 + i) * 0.37;
    const sp = speed * (0.45 + ((i * 37) % 10) / 15);
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0.42 + ((i * 19) % 10) * 0.03,
      maxLife: 0.7,
      size: 2.2 + (i % 3) * 0.9,
      color,
    });
  }
}

export function triggerInteract(state, audio) {
  if (state.status !== 'PLAYING') return false;
  const { player } = state;

  // 1. Vent bypass traversal
  if (state.ventCooldown <= 0) {
    for (const v of state.vents) {
      if (Math.hypot(player.x - v.x, player.y - v.y) <= 44) {
        const dest = state.vents.find((o) => o.id === v.pairId);
        if (dest) {
          recordTrailPoint(state, true, false);
          spawnParticles(state, v.x, v.y, '#3ef0de', 10, 90);
          player.x = dest.x;
          player.y = dest.y;
          state.ventCooldown = 0.7;
          recordTrailPoint(state, true, true);
          spawnParticles(state, dest.x, dest.y, '#3ef0de', 12, 105);
          state.flashBanner = { text: `VENT DUCT BYPASS → ${dest.label}`, color: '#3ae0d0', timer: 1.5 };
          audio?.playVent();
          return true;
        }
      }
    }
  }

  // 2. Relay laser override
  for (const r of state.relays) {
    if (!r.hacked && Math.hypot(player.x - r.x, player.y - r.y) <= 56) {
      r.hacked = true;
      r.progress = 1;
      for (const lid of r.targetLaserIds) {
        const laser = state.lasers.find((l) => l.id === lid);
        if (laser) laser.disabled = true;
      }
      spawnParticles(state, r.x, r.y, '#38e59d', 14, 115);
      state.flashBanner = { text: `${r.label} OVERRIDDEN · LASER GATE CUT`, color: '#38e59d', timer: 1.8 };
      audio?.playTap();
      return true;
    }
  }

  return false;
}

export function applyToolKey(state, toolId, audio) {
  const ok = triggerTool(state, toolId, state.solidRects, audio);
  if (ok) {
    const col = toolId === 'emp' ? '#38e8ff' : toolId === 'decoy' ? '#ffd55c' : toolId === 'smoke' ? '#93d4e8' : '#38e59d';
    spawnParticles(state, state.player.x, state.player.y, col, 14, 130);
  }
  return ok;
}

export function stepSimulation(state, input, dt, audio) {
  const clampedDt = Math.min(dt, 0.05);
  state.time += clampedDt;

  if (state.flashBanner) {
    state.flashBanner.timer -= clampedDt;
    if (state.flashBanner.timer <= 0) state.flashBanner = null;
  }

  if (state.status !== 'PLAYING') {
    stepTools(state, clampedDt * 0.4);
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

  const moveSpeed = player.crouched ? 104 : player.sprinting ? 228 : 156;
  if (moving) {
    const len = Math.hypot(mx, my);
    mx /= len;
    my /= len;
    player.x += mx * moveSpeed * clampedDt;
    player.y += my * moveSpeed * clampedDt;
    player.angle = Math.atan2(my, mx);
    player.speed = moveSpeed;
    resolvePlayerCollisions(player, state.solidRects);
    recordTrailPoint(state, false, false);

    // Footstep acoustics
    player.stepTimer -= clampedDt;
    if (player.stepTimer <= 0) {
      if (player.sprinting) {
        player.stepTimer = 0.34;
        state.noiseRings.push({ x: player.x, y: player.y, r: 10, maxR: 158, alpha: 0.78, loud: true });
        const heard = propagateAcousticAlert(player.x, player.y, 158, state.guards);
        for (const h of heard) {
          if (h.guard.state === 'PATROL') {
            h.guard.state = 'SUSPICIOUS';
            h.guard.investigatePos = { x: player.x, y: player.y };
            h.guard.alertTimer = 2.8;
            setGuardBark(h.guard, 'Footsteps nearby!', 2.2);
          }
        }
        audio?.playFootstep(true);
      } else if (!player.crouched) {
        player.stepTimer = 0.46;
        state.noiseRings.push({ x: player.x, y: player.y, r: 8, maxR: 58, alpha: 0.38, loud: false });
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

  // Cover-zone detection
  const cover = isPointInCoverZone(player.x, player.y, state.plinths, state.alcoves, state.smokes);
  player.inCover = cover.inCover;
  player.coverKind = cover.kind;

  // Update acoustic rings & particles
  for (let i = state.noiseRings.length - 1; i >= 0; i--) {
    const n = state.noiseRings[i];
    n.r += clampedDt * (n.loud ? 270 : 120);
    n.alpha -= clampedDt * (n.loud ? 1.15 : 0.95);
    if (n.alpha <= 0 || n.r >= n.maxR) state.noiseRings.splice(i, 1);
  }
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * clampedDt;
    p.y += p.vy * clampedDt;
    p.vx *= 0.94;
    p.vy *= 0.94;
    p.life -= clampedDt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }

  // Update active tools (EMP, Decoy, Smoke, Tap)
  stepTools(state, clampedDt);

  // Interactive proximity prompts + loot cracking
  state.nearPrompt = null;

  // Primary vault loot crack (auto-progress when within 56px, faster when holding E)
  if (!state.loot.taken && Math.hypot(player.x - state.loot.x, player.y - state.loot.y) <= 56) {
    const boost = input.interact ? 1.55 : 1.0;
    state.loot.progress = Math.min(state.loot.crackTime, state.loot.progress + clampedDt * boost);
    state.nearPrompt = { x: state.loot.x, y: state.loot.y - 42, text: `CRACKING VAULT ${Math.round((state.loot.progress / state.loot.crackTime) * 100)}%` };
    if (Math.floor(state.loot.progress * 5) !== Math.floor((state.loot.progress - clampedDt * boost) * 5)) {
      audio?.playTumblerClick();
    }
    if (state.loot.progress >= state.loot.crackTime) {
      state.loot.taken = true;
      state.lootSecured = true;
      state.collectedValue += state.loot.value;
      recordTrailPoint(state, true, false);
      spawnParticles(state, state.loot.x, state.loot.y, '#ffd85e', 20, 145);
      state.flashBanner = {
        text: `${state.loot.name} SECURED ($${Math.round(state.loot.value / 1000)}K) · REACH EXIT LIFT!`,
        color: '#ffd54f',
        timer: 2.6,
      };
      audio?.playLootSecured();
    }
  } else if (!state.loot.taken && state.loot.progress > 0) {
    state.loot.progress = Math.max(0, state.loot.progress - clampedDt * 0.25);
  }

  // Optional bonus loot stash
  for (const b of state.bonuses) {
    if (!b.taken && Math.hypot(player.x - b.x, player.y - b.y) <= 44) {
      b.progress = Math.min(b.crackTime, b.progress + clampedDt * (input.interact ? 1.5 : 1.0));
      state.nearPrompt = { x: b.x, y: b.y - 34, text: `TAKING ${b.name}` };
      if (b.progress >= b.crackTime) {
        b.taken = true;
        state.collectedValue += b.value;
        state.flashBanner = { text: `BONUS ${b.name} +$${Math.round(b.value / 1000)}K`, color: '#ffd54f', timer: 1.8 };
        audio?.playLootSecured();
      }
    }
  }

  // Proximity hints for Vents and Relays
  if (!state.nearPrompt) {
    for (const v of state.vents) {
      if (Math.hypot(player.x - v.x, player.y - v.y) <= 46) {
        state.nearPrompt = { x: v.x, y: v.y - 30, text: '[E] ENTER VENT DUCT' };
        break;
      }
    }
  }
  if (!state.nearPrompt) {
    for (const r of state.relays) {
      if (!r.hacked && Math.hypot(player.x - r.x, player.y - r.y) <= 56) {
        state.nearPrompt = { x: r.x, y: r.y - 26, text: '[E] CUT LASER RELAY' };
        break;
      }
    }
  }

  // Security step (guards, cameras, lasers, alarm, 1.2s fair caught grace)
  stepSecurity(state, clampedDt, state.opaqueSegments, state.solidRects, audio);

  // Extraction check
  if (state.status === 'PLAYING' && state.lootSecured) {
    const distExit = Math.hypot(player.x - state.exit.x, player.y - state.exit.y);
    if (distExit <= state.exit.radius + 12) {
      recordTrailPoint(state, true, false);
      state.status = 'EXTRACTED';
      state.summary = buildHeistSummary(state);
      audio?.playGetawayFanfare();
    }
  }
}
