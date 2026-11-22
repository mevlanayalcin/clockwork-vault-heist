// Four costly tactical heist gadgets: Clockwork Decoy, EMP Pulse, Smoke Vial, Camera Loop.

import { MAP } from './vaults.js';
import { setGuardBark } from './patrols.js';

export const GADGET_DEFS = [
  { id: 'decoy', key: '1', name: 'CLOCKWORK DECOY', short: 'DECOY', cost: 25000, charges: 2, color: '#f2c14e', radius: 245, tip: 'Lures guards off patrol toward chime' },
  { id: 'emp', key: '2', name: 'EMP PULSE', short: 'EMP PULSE', cost: 40000, charges: 2, color: '#38d8f5', radius: 215, tip: 'Disables nearby cameras & laser gates (5.5s)' },
  { id: 'smoke', key: '3', name: 'SMOKE VIAL', short: 'SMOKE VIAL', cost: 30000, charges: 2, color: '#9bc4d8', radius: 88, tip: 'Severs vision cones & breaks lock-on' },
  { id: 'camloop', key: '4', name: 'CAM LOOP', short: 'CAM LOOP', cost: 35000, charges: 2, color: '#42e098', radius: 280, tip: 'Freezes nearest CCTV feed for 8s (-15% alarm)' },
];

export function createGadgetLoadout() {
  return GADGET_DEFS.map((g) => ({ ...g, remaining: g.charges, used: 0 }));
}

function clampClear(x, y, solidRects) {
  let cx = Math.max(MAP.x + 28, Math.min(MAP.x + MAP.w - 28, x));
  let cy = Math.max(MAP.y + 28, Math.min(MAP.y + MAP.h - 28, y));
  for (const r of solidRects) {
    if (cx >= r.x - 10 && cx <= r.x + r.w + 10 && cy >= r.y - 10 && cy <= r.y + r.h + 10) {
      const dL = Math.abs(cx - (r.x - 12));
      const dR = Math.abs(cx - (r.x + r.w + 12));
      const dT = Math.abs(cy - (r.y - 12));
      const dB = Math.abs(cy - (r.y + r.h + 12));
      const m = Math.min(dL, dR, dT, dB);
      if (m === dL) cx = r.x - 12;
      else if (m === dR) cx = r.x + r.w + 12;
      else if (m === dT) cy = r.y - 12;
      else cy = r.y + r.h + 12;
    }
  }
  return { x: cx, y: cy };
}

function throwPos(state, maxDist, solidRects) {
  const { player, pointer } = state;
  let tx;
  let ty;
  if (pointer.active && pointer.x < MAP.w) {
    const dx = pointer.x - player.x;
    const dy = pointer.y - player.y;
    const d = Math.hypot(dx, dy);
    const len = Math.min(maxDist, Math.max(54, d));
    tx = player.x + (d > 1 ? (dx / d) * len : Math.cos(player.angle) * len);
    ty = player.y + (d > 1 ? (dy / d) * len : Math.sin(player.angle) * len);
  } else {
    tx = player.x + Math.cos(player.angle) * Math.min(maxDist, 132);
    ty = player.y + Math.sin(player.angle) * Math.min(maxDist, 132);
  }
  return clampClear(tx, ty, solidRects);
}

export function triggerGadget(state, gadgetId, solidRects, audio) {
  if (state.status !== 'PLAYING') return false;
  const g = state.gadgets.find((x) => x.id === gadgetId);
  if (!g || g.remaining <= 0) {
    state.flashBanner = { text: `${g ? g.short : 'TOOL'} DEPLETED`, color: '#ff7866', timer: 1.0 };
    return false;
  }

  g.remaining -= 1;
  g.used += 1;
  state.toolSpent += g.cost;
  state.activeGadgetId = g.id;
  const { player } = state;

  if (g.id === 'decoy') {
    const pos = throwPos(state, 200, solidRects);
    state.decoys.push({ x: pos.x, y: pos.y, lureRadius: g.radius, timer: 6.5, maxTimer: 6.5, phase: 0 });
    for (const guard of state.guards) {
      if (Math.hypot(guard.x - pos.x, guard.y - pos.y) <= g.radius && guard.state !== 'ALERT') {
        guard.state = 'INVESTIGATING';
        guard.suspicion = Math.max(guard.suspicion, 0.56);
        guard.investigatePos = { x: pos.x, y: pos.y };
        guard.alertTimer = 4.4;
        setGuardBark(guard, "What's ticking?", 3.0);
      }
    }
    state.flashBanner = { text: 'CLOCKWORK DECOY TOSSED · LURING PATROL (-$25K)', color: '#f2c14e', timer: 1.6 };
    audio?.playDecoy();
    return true;
  }

  if (g.id === 'emp') {
    const targets = [];
    for (const cam of state.cameras) {
      if (Math.hypot(cam.x - player.x, cam.y - player.y) <= g.radius + 40) {
        cam.empTimer = 5.5;
        cam.seeingPlayer = false;
        targets.push({ x: cam.x, y: cam.y });
      }
    }
    for (const laser of state.lasers) {
      const mx = (laser.x1 + laser.x2) * 0.5;
      const my = (laser.y1 + laser.y2) * 0.5;
      if (Math.hypot(mx - player.x, my - player.y) <= g.radius + 50) {
        laser.empTimer = 5.5;
        targets.push({ x: mx, y: my });
      }
    }
    state.empPulses.push({ x: player.x, y: player.y, radius: 18, maxRadius: g.radius, timer: 1.4, maxTimer: 1.4, targets });
    for (const guard of state.guards) {
      if (Math.hypot(guard.x - player.x, guard.y - player.y) <= g.radius + 70) {
        setGuardBark(guard, 'Power surge!', 2.4);
      }
    }
    state.flashBanner = {
      text: targets.length > 0 ? `EMP PULSE · ${targets.length} SECURITY NODE${targets.length > 1 ? 'S' : ''} STUNNED (-$40K)` : 'EMP DISCHARGED (-$40K)',
      color: '#46e8ff',
      timer: 1.7,
    };
    audio?.playEmp();
    return true;
  }

  if (g.id === 'smoke') {
    const emergency = state.exposure > 0.1 || !state.pointer.active || state.pointer.x >= MAP.w;
    const pos = emergency ? { x: player.x, y: player.y } : throwPos(state, 165, solidRects);
    state.smokes.push({ x: pos.x, y: pos.y, radius: g.radius, timer: 7.0, maxTimer: 7.0, alpha: 0.95 });
    const broke = state.exposure > 0.1;
    state.exposure = 0;
    state.spottedBy = null;
    for (const guard of state.guards) {
      if (Math.hypot(guard.x - pos.x, guard.y - pos.y) <= 240) {
        if (guard.state === 'ALERT') guard.state = 'SEARCHING';
        setGuardBark(guard, 'Smoke — lost visual!', 2.6);
      }
    }
    state.flashBanner = {
      text: broke ? 'SMOKE VIAL · LINE OF SIGHT BROKEN (-$30K)' : 'SMOKE SCREEN DEPLOYED (-$30K)',
      color: '#b4e0f0',
      timer: 1.7,
    };
    audio?.playSmoke();
    return true;
  }

  if (g.id === 'camloop') {
    let best = null;
    let bestD = Infinity;
    for (const cam of state.cameras) {
      const d = Math.hypot(cam.x - player.x, cam.y - player.y);
      if (d <= g.radius + 90 && d < bestD) {
        best = cam;
        bestD = d;
      }
    }
    if (best) {
      best.loopTimer = 8.0;
      best.seeingPlayer = false;
      state.loopArcs.push({ x1: player.x, y1: player.y, x2: best.x, y2: best.y, timer: 1.1, maxTimer: 1.1 });
    }
    state.alarm = Math.max(0, state.alarm - 15);
    state.flashBanner = {
      text: best ? `CAM LOOP · ${best.label} FEED FROZEN 8s (-$35K)` : 'CAM LOOP · ALARM SCRUBBED -15% (-$35K)',
      color: '#42e098',
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
    p.radius = 20 + (p.maxRadius - 20) * Math.min(1, prog * 1.45);
    if (p.timer <= 0) state.empPulses.splice(i, 1);
  }
  for (let i = state.decoys.length - 1; i >= 0; i--) {
    const d = state.decoys[i];
    d.timer -= dt;
    d.phase += dt * 4.2;
    if (d.timer <= 0) state.decoys.splice(i, 1);
  }
  for (let i = state.smokes.length - 1; i >= 0; i--) {
    const s = state.smokes[i];
    s.timer -= dt;
    s.alpha = s.timer < 1.3 ? Math.max(0, (s.timer / 1.3) * 0.95) : 0.95;
    if (s.timer <= 0) state.smokes.splice(i, 1);
  }
  for (let i = state.loopArcs.length - 1; i >= 0; i--) {
    state.loopArcs[i].timer -= dt;
    if (state.loopArcs[i].timer <= 0) state.loopArcs.splice(i, 1);
  }
}
