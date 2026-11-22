// Costly limited-charge heist tools: EMP Pulse, Clockwork Decoy, Smoke Canister, Circuit Tap.

import { setGuardBark } from './security.js';
import { ARENA } from './blueprints.js';

export const TOOL_DEFS = [
  { id: 'emp', key: '1', name: 'EMP', label: 'EMP PULSE', cost: 40000, charges: 2, color: '#38e8ff', radius: 225 },
  { id: 'decoy', key: '2', name: 'DECOY', label: 'CLOCKWORK DECOY', cost: 25000, charges: 2, color: '#f7c95c', radius: 265 },
  { id: 'smoke', key: '3', name: 'SMOKE', label: 'SMOKE CANISTER', cost: 30000, charges: 2, color: '#84b8cc', radius: 96 },
  { id: 'tap', key: '4', name: 'TAP', label: 'CIRCUIT TAP', cost: 20000, charges: 2, color: '#38e59d', radius: 220 },
];

export function createToolLoadout() {
  return TOOL_DEFS.map((t) => ({ ...t, remaining: t.charges, used: 0 }));
}

function clampToArenaClear(x, y, solidRects) {
  let cx = Math.max(ARENA.x + 28, Math.min(ARENA.x + ARENA.w - 28, x));
  let cy = Math.max(ARENA.y + 28, Math.min(ARENA.y + ARENA.h - 28, y));
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

function throwTarget(state, maxDist, solidRects) {
  const { player, pointer } = state;
  let tx;
  let ty;
  if (pointer.active) {
    const dx = pointer.x - player.x;
    const dy = pointer.y - player.y;
    const dist = Math.hypot(dx, dy);
    const d = Math.min(maxDist, Math.max(58, dist));
    tx = player.x + (dist > 1 ? (dx / dist) * d : Math.cos(player.angle) * d);
    ty = player.y + (dist > 1 ? (dy / dist) * d : Math.sin(player.angle) * d);
  } else {
    tx = player.x + Math.cos(player.angle) * Math.min(maxDist, 145);
    ty = player.y + Math.sin(player.angle) * Math.min(maxDist, 145);
  }
  return clampToArenaClear(tx, ty, solidRects);
}

export function triggerTool(state, toolId, solidRects, audio) {
  if (state.status !== 'PLAYING') return false;
  const tool = state.tools.find((t) => t.id === toolId);
  if (!tool || tool.remaining <= 0) {
    state.flashBanner = { text: `${tool ? tool.name : 'TOOL'} DEPLETED`, color: '#ff7060', timer: 1.0 };
    return false;
  }

  tool.remaining -= 1;
  tool.used += 1;
  state.toolSpent += tool.cost;
  state.activeToolId = tool.id;
  const { player } = state;

  if (tool.id === 'emp') {
    const origin = { x: player.x, y: player.y };
    state.empPulses.push({ x: origin.x, y: origin.y, radius: 18, maxRadius: tool.radius, timer: 1.35, maxTimer: 1.35 });
    let hitCount = 0;
    for (const cam of state.cameras) {
      if (Math.hypot(cam.x - origin.x, cam.y - origin.y) <= tool.radius + 35) {
        cam.offlineTimer = 5.5;
        cam.seeingPlayer = false;
        hitCount++;
      }
    }
    for (const laser of state.lasers) {
      const mx = (laser.x1 + laser.x2) * 0.5;
      const my = (laser.y1 + laser.y2) * 0.5;
      if (Math.hypot(mx - origin.x, my - origin.y) <= tool.radius + 55) {
        laser.empTimer = 5.5;
        hitCount++;
      }
    }
    for (const g of state.guards) {
      if (Math.hypot(g.x - origin.x, g.y - origin.y) <= tool.radius + 60) {
        setGuardBark(g, 'Camera feed dropped!', 3.0);
      }
    }
    state.flashBanner = {
      text: hitCount > 0 ? `EMP PULSE · ${hitCount} SECURITY NODE${hitCount > 1 ? 'S' : ''} OFFLINE (-$40K)` : 'EMP PULSE DISCHARGED (-$40K)',
      color: '#38e8ff',
      timer: 1.8,
    };
    audio?.playEmp();
    return true;
  }

  if (tool.id === 'decoy') {
    const pos = throwTarget(state, 225, solidRects);
    state.decoys.push({
      x: pos.x,
      y: pos.y,
      lureRadius: tool.radius,
      timer: 6.5,
      maxTimer: 6.5,
      pulsePhase: 0,
    });
    for (const g of state.guards) {
      if (Math.hypot(g.x - pos.x, g.y - pos.y) <= tool.radius && g.state !== 'ALERT') {
        g.state = 'DISTRACTED';
        g.investigatePos = { x: pos.x, y: pos.y };
        g.alertTimer = 4.2;
        setGuardBark(g, "What's ticking?", 3.4);
      }
    }
    state.flashBanner = { text: 'CLOCKWORK DECOY ACTIVE · LURING PATROL (-$25K)', color: '#f7c95c', timer: 1.8 };
    audio?.playDecoy();
    return true;
  }

  if (tool.id === 'smoke') {
    const panicDrop = state.caughtGrace > 0.05 || !state.pointer.active;
    const pos = panicDrop ? { x: player.x, y: player.y } : throwTarget(state, 180, solidRects);
    state.smokes.push({
      x: pos.x,
      y: pos.y,
      radius: tool.radius,
      timer: 7.0,
      maxTimer: 7.0,
      alpha: 0.94,
    });
    const brokeLock = state.caughtGrace > 0.05;
    state.caughtGrace = 0;
    state.spottedBy = null;
    for (const g of state.guards) {
      if (Math.hypot(g.x - pos.x, g.y - pos.y) <= 270) {
        if (g.state === 'ALERT') g.state = 'SEARCH';
        setGuardBark(g, 'Smoke! Blind in sector!', 3.0);
      }
    }
    state.flashBanner = {
      text: brokeLock ? 'SMOKE BREAK · LOCK-ON SEVERED (-$30K)' : 'SMOKE SCREEN DEPLOYED (-$30K)',
      color: '#93d4e8',
      timer: 1.8,
    };
    audio?.playSmoke();
    return true;
  }

  if (tool.id === 'tap') {
    let tapped = false;
    for (const relay of state.relays) {
      if (!relay.hacked && Math.hypot(relay.x - player.x, relay.y - player.y) <= tool.radius) {
        relay.hacked = true;
        for (const lid of relay.targetLaserIds) {
          const laser = state.lasers.find((l) => l.id === lid);
          if (laser) laser.disabled = true;
        }
        state.tapArcs.push({ x1: player.x, y1: player.y, x2: relay.x, y2: relay.y, timer: 1.0, maxTimer: 1.0 });
        tapped = true;
        break;
      }
    }
    if (!tapped && !state.lootSecured && Math.hypot(state.loot.x - player.x, state.loot.y - player.y) <= 135) {
      state.loot.progress = state.loot.crackTime;
      state.lootSecured = true;
      state.collectedValue += state.loot.value;
      state.tapArcs.push({ x1: player.x, y1: player.y, x2: state.loot.x, y2: state.loot.y, timer: 1.0, maxTimer: 1.0 });
      tapped = true;
      audio?.playLootSecured();
    }
    state.alarm = Math.max(0, state.alarm - 18);
    state.flashBanner = {
      text: tapped ? 'CIRCUIT TAP · LOCK BYPASSED & ALARM -18% (-$20K)' : 'CIRCUIT TAP · ALARM SCRUBBED -18% (-$20K)',
      color: '#38e59d',
      timer: 1.8,
    };
    audio?.playTap();
    return true;
  }

  return false;
}

export function stepTools(state, dt) {
  for (let i = state.empPulses.length - 1; i >= 0; i--) {
    const p = state.empPulses[i];
    p.timer -= dt;
    const progress = 1 - Math.max(0, p.timer) / p.maxTimer;
    p.radius = 20 + (p.maxRadius - 20) * Math.min(1, progress * 1.45);
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
    s.alpha = s.timer < 1.3 ? Math.max(0, (s.timer / 1.3) * 0.94) : 0.94;
    if (s.timer <= 0) state.smokes.splice(i, 1);
  }

  for (let i = state.tapArcs.length - 1; i >= 0; i--) {
    state.tapArcs[i].timer -= dt;
    if (state.tapArcs[i].timer <= 0) state.tapArcs.splice(i, 1);
  }
}
