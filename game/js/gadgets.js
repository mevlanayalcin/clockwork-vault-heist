// Costly limited-charge heist gadgets: EMP Pulse, Clockwork Decoy, Smoke Canister, Circuit Tap.

import { ARENA } from './vaults.js';
import { setGuardBark } from './guards.js';

export const GADGET_DEFS = [
  { id: 'emp', key: '1', name: 'EMP', label: 'EMP PULSE', cost: 40000, charges: 2, color: '#38ebff', radius: 245 },
  { id: 'decoy', key: '2', name: 'DECOY', label: 'CLOCKWORK DECOY', cost: 25000, charges: 2, color: '#f8cb58', radius: 280 },
  { id: 'smoke', key: '3', name: 'SMOKE', label: 'SMOKE CANISTER', cost: 30000, charges: 2, color: '#9cd2e6', radius: 98 },
  { id: 'tap', key: '4', name: 'TAP', label: 'CIRCUIT TAP', cost: 20000, charges: 2, color: '#3cf0a2', radius: 235 },
];

export function createGadgetLoadout() {
  return GADGET_DEFS.map((t) => ({ ...t, remaining: t.charges, used: 0 }));
}

function clampToClearFloor(x, y, solidRects) {
  let cx = Math.max(ARENA.x + 30, Math.min(ARENA.x + ARENA.w - 30, x));
  let cy = Math.max(ARENA.y + 30, Math.min(ARENA.y + ARENA.h - 30, y));
  for (const r of solidRects) {
    if (cx >= r.x - 12 && cx <= r.x + r.w + 12 && cy >= r.y - 12 && cy <= r.y + r.h + 12) {
      const dL = Math.abs(cx - (r.x - 14));
      const dR = Math.abs(cx - (r.x + r.w + 14));
      const dT = Math.abs(cy - (r.y - 14));
      const dB = Math.abs(cy - (r.y + r.h + 14));
      const m = Math.min(dL, dR, dT, dB);
      if (m === dL) cx = r.x - 14;
      else if (m === dR) cx = r.x + r.w + 14;
      else if (m === dT) cy = r.y - 14;
      else cy = r.y + r.h + 14;
    }
  }
  return { x: cx, y: cy };
}

function aimTarget(state, maxDist, solidRects) {
  const { player, pointer } = state;
  let tx;
  let ty;
  if (pointer.active) {
    const dx = pointer.x - player.x;
    const dy = pointer.y - player.y;
    const dist = Math.hypot(dx, dy);
    const d = Math.min(maxDist, Math.max(60, dist));
    tx = player.x + (dist > 1 ? (dx / dist) * d : Math.cos(player.angle) * d);
    ty = player.y + (dist > 1 ? (dy / dist) * d : Math.sin(player.angle) * d);
  } else {
    tx = player.x + Math.cos(player.angle) * Math.min(maxDist, 148);
    ty = player.y + Math.sin(player.angle) * Math.min(maxDist, 148);
  }
  return clampToClearFloor(tx, ty, solidRects);
}

export function activateGadget(state, gadgetId, solidRects, audio) {
  if (state.status !== 'PLAYING') return false;
  const g = state.gadgets.find((t) => t.id === gadgetId);
  if (!g || g.remaining <= 0) {
    state.flashBanner = { text: `${g ? g.name : 'GADGET'} DEPLETED`, color: '#ff7060', timer: 1.0 };
    return false;
  }

  g.remaining -= 1;
  g.used += 1;
  state.toolSpent += g.cost;
  state.activeGadgetId = g.id;
  const { player } = state;

  if (g.id === 'emp') {
    const targets = [];
    for (const cam of state.cameras) {
      if (Math.hypot(cam.x - player.x, cam.y - player.y) <= g.radius + 45) {
        cam.offlineTimer = 5.5;
        cam.seeingPlayer = false;
        targets.push({ x: cam.x, y: cam.y });
      }
    }
    for (const laser of state.lasers) {
      const mx = (laser.x1 + laser.x2) * 0.5;
      const my = (laser.y1 + laser.y2) * 0.5;
      if (Math.hypot(mx - player.x, my - player.y) <= g.radius + 60) {
        laser.empTimer = 5.5;
        targets.push({ x: mx, y: my });
      }
    }
    state.empPulses.push({
      x: player.x,
      y: player.y,
      radius: 22,
      maxRadius: g.radius,
      timer: 1.4,
      maxTimer: 1.4,
      targets,
    });
    for (const guard of state.guards) {
      if (Math.hypot(guard.x - player.x, guard.y - player.y) <= g.radius + 75) {
        setGuardBark(guard, 'Grid outage!', 2.6);
      }
    }
    state.flashBanner = {
      text: targets.length > 0 ? `EMP PULSE · ${targets.length} NODE${targets.length > 1 ? 'S' : ''} OFFLINE (-$40K)` : 'EMP DISCHARGED (-$40K)',
      color: '#46ecff',
      timer: 1.7,
    };
    audio?.playEmp();
    return true;
  }

  if (g.id === 'decoy') {
    const pos = aimTarget(state, 230, solidRects);
    state.decoys.push({
      x: pos.x,
      y: pos.y,
      lureRadius: g.radius,
      timer: 6.5,
      maxTimer: 6.5,
      pulsePhase: 0,
    });
    for (const guard of state.guards) {
      if (Math.hypot(guard.x - pos.x, guard.y - pos.y) <= g.radius && guard.state !== 'ALERT') {
        guard.state = 'DISTRACTED';
        guard.investigatePos = { x: pos.x, y: pos.y };
        guard.alertTimer = 4.4;
        setGuardBark(guard, "What's ticking?", 3.0);
      }
    }
    state.flashBanner = { text: 'CLOCKWORK DECOY · LURING PATROL (-$25K)', color: '#f8cb58', timer: 1.6 };
    audio?.playDecoy();
    return true;
  }

  if (g.id === 'smoke') {
    const panicDrop = state.caughtGrace > 0.05 || !state.pointer.active;
    const pos = panicDrop ? { x: player.x, y: player.y } : aimTarget(state, 185, solidRects);
    state.smokes.push({
      x: pos.x,
      y: pos.y,
      radius: g.radius,
      timer: 7.0,
      maxTimer: 7.0,
      alpha: 0.96,
    });
    const broke = state.caughtGrace > 0.05;
    state.caughtGrace = 0;
    state.spottedBy = null;
    for (const guard of state.guards) {
      if (Math.hypot(guard.x - pos.x, guard.y - pos.y) <= 280) {
        if (guard.state === 'ALERT') guard.state = 'SEARCH';
        setGuardBark(guard, 'Blind in smoke!', 2.6);
      }
    }
    state.flashBanner = {
      text: broke ? 'SMOKE BREAK · LOCK-ON SEVERED (-$30K)' : 'SMOKE SCREEN DEPLOYED (-$30K)',
      color: '#a8e2f5',
      timer: 1.7,
    };
    audio?.playSmoke();
    return true;
  }

  if (g.id === 'tap') {
    let tapped = false;
    for (const relay of state.relays) {
      if (!relay.hacked && Math.hypot(relay.x - player.x, relay.y - player.y) <= g.radius) {
        relay.hacked = true;
        relay.progress = 1;
        for (const lid of relay.targetLaserIds) {
          const laser = state.lasers.find((l) => l.id === lid);
          if (laser) laser.disabled = true;
        }
        state.tapArcs.push({ x1: player.x, y1: player.y, x2: relay.x, y2: relay.y, timer: 1.0, maxTimer: 1.0 });
        tapped = true;
        break;
      }
    }
    if (!tapped && !state.lootSecured && Math.hypot(state.loot.x - player.x, state.loot.y - player.y) <= 145) {
      state.loot.progress = state.loot.crackTime;
      state.loot.taken = true;
      state.lootSecured = true;
      state.collectedValue += state.loot.value;
      state.tapArcs.push({ x1: player.x, y1: player.y, x2: state.loot.x, y2: state.loot.y, timer: 1.0, maxTimer: 1.0 });
      tapped = true;
      audio?.playLootSecured();
    }
    state.alarm = Math.max(0, state.alarm - 18);
    state.flashBanner = {
      text: tapped ? 'CIRCUIT TAP · OVERRIDE & ALARM -18% (-$20K)' : 'CIRCUIT TAP · ALARM -18% (-$20K)',
      color: '#3cf0a2',
      timer: 1.7,
    };
    audio?.playTap();
    return true;
  }

  return false;
}

export function stepGadgets(state, dt) {
  for (let i = state.empPulses.length - 1; i >= 0; i--) {
    const p = state.empPulses[i];
    p.timer -= dt;
    const prog = 1 - Math.max(0, p.timer) / p.maxTimer;
    p.radius = 24 + (p.maxRadius - 24) * Math.min(1, prog * 1.45);
    if (p.timer <= 0) state.empPulses.splice(i, 1);
  }
  for (let i = state.decoys.length - 1; i >= 0; i--) {
    const d = state.decoys[i];
    d.timer -= dt;
    d.pulsePhase += dt * 4.2;
    if (d.timer <= 0) state.decoys.splice(i, 1);
  }
  for (let i = state.smokes.length - 1; i >= 0; i--) {
    const s = state.smokes[i];
    s.timer -= dt;
    s.alpha = s.timer < 1.3 ? Math.max(0, (s.timer / 1.3) * 0.96) : 0.96;
    if (s.timer <= 0) state.smokes.splice(i, 1);
  }
  for (let i = state.tapArcs.length - 1; i >= 0; i--) {
    state.tapArcs[i].timer -= dt;
    if (state.tapArcs[i].timer <= 0) state.tapArcs.splice(i, 1);
  }
}
