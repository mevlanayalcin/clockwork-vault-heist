// Articulated guard patrol AI, wall CCTV camera sweeps, laser tripwires, and 1.2s caught grace.

import { canObserverSeeTarget, castVisionCone, normalizeAngle } from './lighting.js';

export const CAUGHT_GRACE_SECONDS = 1.2;

export function getAlarmTier(alarm) {
  if (alarm >= 85) return { code: 'LOCKDOWN', color: '#ff384f' };
  if (alarm >= 68) return { code: 'HUNTING', color: '#ff4f46' };
  if (alarm >= 45) return { code: 'SWEEPING', color: '#ff9036' };
  if (alarm >= 22) return { code: 'CAUTIOUS', color: '#f6c445' };
  return { code: 'UNDETECTED', color: '#39e5b6' };
}

export function createGuards(blueprints) {
  return blueprints.map((bp, idx) => {
    const start = bp.waypoints[0];
    const next = bp.waypoints[1] ?? start;
    const initAngle = start.look ?? Math.atan2(next.y - start.y, next.x - start.x);
    return {
      id: bp.id,
      name: bp.name,
      x: start.x,
      y: start.y,
      radius: 17,
      angle: initAngle,
      targetAngle: initAngle,
      speed: bp.speed,
      range: bp.range,
      halfFov: bp.halfFov,
      waypoints: bp.waypoints.map((w) => ({ ...w })),
      wpIndex: 0,
      waitTimer: (idx * 0.55) % 1.4,
      state: 'PATROL',
      suspicion: 0,
      alertTimer: 0,
      investigatePos: null,
      stuckTimer: 0,
      stride: idx * 1.3,
      bark: '',
      barkTimer: 0,
      conePoly: [],
    };
  });
}

export function createCameras(blueprints) {
  return blueprints.map((bp) => ({
    ...bp,
    angle: bp.baseAngle,
    offlineTimer: 0,
    alertLevel: 0,
    seeingPlayer: false,
    conePoly: [],
  }));
}

export function setGuardBark(guard, text, duration = 2.8) {
  guard.bark = text;
  guard.barkTimer = duration;
}

function turnToward(current, target, maxStep) {
  const diff = normalizeAngle(target - current);
  if (Math.abs(diff) <= maxStep) return target;
  return normalizeAngle(current + Math.sign(diff) * maxStep);
}

function moveWithSlide(entity, tx, ty, speed, dt, solidRects) {
  const dx = tx - entity.x;
  const dy = ty - entity.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return { arrived: true, moved: 0 };
  const step = Math.min(dist, speed * dt);
  const prevX = entity.x;
  const prevY = entity.y;

  entity.x += (dx / dist) * step;
  entity.y += (dy / dist) * step;
  for (const r of solidRects) {
    const cx = Math.max(r.x, Math.min(entity.x, r.x + r.w));
    const cy = Math.max(r.y, Math.min(entity.y, r.y + r.h));
    const ox = entity.x - cx;
    const oy = entity.y - cy;
    const dSq = ox * ox + oy * oy;
    if (dSq < entity.radius * entity.radius) {
      const d = Math.sqrt(dSq) || 0.001;
      const push = entity.radius - d;
      entity.x += (ox / d) * push;
      entity.y += (oy / d) * push;
    }
  }
  const moved = Math.hypot(entity.x - prevX, entity.y - prevY);
  return { arrived: Math.hypot(tx - entity.x, ty - entity.y) < 8, moved };
}

export function recomputeSecurityCones(state) {
  for (const cam of state.cameras) {
    cam.conePoly =
      cam.offlineTimer > 0
        ? []
        : castVisionCone(cam.x, cam.y, cam.angle, cam.halfFov, cam.range, state.opaqueSegments, state.smokes);
  }
  for (const g of state.guards) {
    const ox = g.x + Math.cos(g.angle) * 14;
    const oy = g.y + Math.sin(g.angle) * 14;
    g.conePoly = castVisionCone(ox, oy, g.angle, g.halfFov, g.range, state.opaqueSegments, state.smokes);
  }
}

export function stepSecurity(state, dt, segments, solidRects, audio) {
  const { player, guards, cameras, smokes, decoys, lasers } = state;
  const concealed = player.crouched && player.inCover;
  let anyObserverSees = false;
  let primarySpotter = null;

  // 1. Update sweeping CCTV cameras
  for (const cam of cameras) {
    if (cam.offlineTimer > 0) {
      cam.offlineTimer = Math.max(0, cam.offlineTimer - dt);
      cam.seeingPlayer = false;
      cam.alertLevel = Math.max(0, cam.alertLevel - dt * 1.4);
      cam.conePoly = [];
      continue;
    }
    const alarmSpeedBoost = 1 + (state.alarm / 100) * 0.4;
    const wave = Math.sin(state.time * alarmSpeedBoost * ((Math.PI * 2) / cam.period) + cam.phase);
    cam.angle = cam.baseAngle + wave * cam.sweep;
    cam.conePoly = castVisionCone(cam.x, cam.y, cam.angle, cam.halfFov, cam.range, segments, smokes);

    const sees = canObserverSeeTarget(cam, player.x, player.y, concealed, segments, smokes);
    cam.seeingPlayer = sees;
    if (sees) {
      anyObserverSees = true;
      if (!primarySpotter) primarySpotter = { kind: 'camera', x: cam.x, y: cam.y, label: cam.label };
      cam.alertLevel = Math.min(1, cam.alertLevel + dt * 1.45);
      state.alarm = Math.min(100, state.alarm + dt * 21);
      state.lastSeen = { x: player.x, y: player.y, timer: 6.0 };
    } else {
      cam.alertLevel = Math.max(0, cam.alertLevel - dt * 0.75);
    }
  }

  // 2. Check active laser gates
  for (const laser of lasers) {
    if (laser.disabled || laser.empTimer > 0) {
      if (laser.empTimer > 0) laser.empTimer = Math.max(0, laser.empTimer - dt);
      continue;
    }
    const ldx = laser.x2 - laser.x1;
    const ldy = laser.y2 - laser.y1;
    const lenSq = ldx * ldx + ldy * ldy || 1;
    const t = Math.max(0, Math.min(1, ((player.x - laser.x1) * ldx + (player.y - laser.y1) * ldy) / lenSq));
    const px = laser.x1 + ldx * t;
    const py = laser.y1 + ldy * t;
    if (Math.hypot(player.x - px, player.y - py) < player.radius + 3) {
      state.alarm = Math.min(100, state.alarm + dt * 65);
      state.caughtGrace = Math.min(CAUGHT_GRACE_SECONDS, state.caughtGrace + dt * 1.75);
      state.lastSeen = { x: player.x, y: player.y, timer: 6.0 };
      anyObserverSees = true;
      primarySpotter = { kind: 'laser', x: px, y: py, label: laser.label };
      state.flashBanner = { text: 'LASER TRIPPED! PULL BACK OR [3] SMOKE!', color: '#ff4860', timer: 1.1 };
      audio?.playAlarmPing();
    }
  }

  // 3. Update articulated guards
  const speedScale = 1 + (state.alarm >= 45 ? 0.16 : 0);
  for (const g of guards) {
    if (g.barkTimer > 0) g.barkTimer = Math.max(0, g.barkTimer - dt);

    let activeDecoy = null;
    for (const d of decoys) {
      if (d.timer > 0 && Math.hypot(g.x - d.x, g.y - d.y) <= d.lureRadius) {
        activeDecoy = d;
        break;
      }
    }

    const sees = canObserverSeeTarget(g, player.x, player.y, concealed, segments, smokes);
    if (sees) {
      anyObserverSees = true;
      primarySpotter = { kind: 'guard', x: g.x, y: g.y, label: g.name };
      const dist = Math.hypot(player.x - g.x, player.y - g.y);
      const rate = dist < 120 ? 1.85 : 1.18;
      g.suspicion = Math.min(1, g.suspicion + dt * rate);
      g.targetAngle = Math.atan2(player.y - g.y, player.x - g.x);
      g.investigatePos = { x: player.x, y: player.y };
      state.lastSeen = { x: player.x, y: player.y, timer: 6.5 };

      if (g.state !== 'ALERT') {
        g.state = g.suspicion > 0.4 ? 'ALERT' : 'SUSPICIOUS';
        if (g.state === 'ALERT') {
          setGuardBark(g, 'Intruder spotted!', 2.6);
          audio?.playSpotSting();
        } else if (g.barkTimer <= 0.1) {
          setGuardBark(g, 'Hold—movement!', 2.0);
        }
      }
      g.alertTimer = 4.2;
      state.alarm = Math.min(100, state.alarm + dt * (g.state === 'ALERT' ? 24 : 13));
    } else {
      g.suspicion = Math.max(0, g.suspicion - dt * 0.42);
      if (activeDecoy && g.state !== 'ALERT') {
        if (g.state !== 'DISTRACTED') {
          g.state = 'DISTRACTED';
          setGuardBark(g, "What's ticking?", 3.0);
        }
        g.investigatePos = { x: activeDecoy.x, y: activeDecoy.y };
        g.alertTimer = 2.8;
      } else if (g.state === 'ALERT' || g.state === 'SUSPICIOUS') {
        g.alertTimer -= dt;
        if (g.alertTimer <= 0) {
          g.state = 'SEARCH';
          g.alertTimer = 3.0;
        }
      } else if (g.state === 'SEARCH' || g.state === 'DISTRACTED') {
        g.alertTimer -= dt;
        if (g.alertTimer <= 0) {
          g.state = 'PATROL';
          g.investigatePos = null;
        }
      }
    }

    if (g.state === 'PATROL') {
      const wp = g.waypoints[g.wpIndex];
      const dist = Math.hypot(wp.x - g.x, wp.y - g.y);
      if (dist < 8) {
        if (g.waitTimer > 0) {
          g.waitTimer -= dt;
          g.targetAngle = (wp.look ?? g.angle) + Math.sin(state.time * 1.9 + g.wpIndex) * 0.28;
        } else {
          g.wpIndex = (g.wpIndex + 1) % g.waypoints.length;
          const nextWp = g.waypoints[g.wpIndex];
          g.waitTimer = nextWp.wait ?? 1.0;
          g.targetAngle = Math.atan2(nextWp.y - g.y, nextWp.x - g.x);
        }
      } else {
        g.targetAngle = Math.atan2(wp.y - g.y, wp.x - g.x);
        const res = moveWithSlide(g, wp.x, wp.y, g.speed * speedScale, dt, solidRects);
        g.stride += res.moved * 0.14;
      }
      g.angle = turnToward(g.angle, g.targetAngle, dt * 3.4);
    } else if (g.investigatePos) {
      const aim = Math.atan2(g.investigatePos.y - g.y, g.investigatePos.x - g.x);
      g.angle = turnToward(g.angle, aim, dt * 5.2);
      const chaseSpeed = g.state === 'ALERT' ? g.speed * 1.24 : g.speed * 0.92;
      const stopDist = g.state === 'DISTRACTED' ? 44 : 30;
      if (Math.hypot(g.investigatePos.x - g.x, g.investigatePos.y - g.y) > stopDist) {
        const res = moveWithSlide(g, g.investigatePos.x, g.investigatePos.y, chaseSpeed, dt, solidRects);
        g.stride += res.moved * 0.15;
        g.stuckTimer = res.moved < 0.4 ? g.stuckTimer + dt : 0;
        if (g.stuckTimer > 1.2) {
          g.state = 'SEARCH';
          g.investigatePos = null;
          g.stuckTimer = 0;
        }
      } else {
        g.angle = normalizeAngle(g.angle + Math.sin(state.time * 4.4) * dt * 2.2);
      }
    }

    const ox = g.x + Math.cos(g.angle) * 14;
    const oy = g.y + Math.sin(g.angle) * 14;
    g.conePoly = castVisionCone(ox, oy, g.angle, g.halfFov, g.range, segments, smokes);
  }

  // 4. Fair 1.2s caught-grace lock-on
  if (anyObserverSees) {
    state.spottedBy = primarySpotter;
    state.caughtGrace = Math.min(CAUGHT_GRACE_SECONDS, state.caughtGrace + dt);
    if (state.caughtGrace >= CAUGHT_GRACE_SECONDS) {
      state.status = 'CAUGHT';
      state.caughtReason = primarySpotter ? `LOCKED BY ${primarySpotter.label}` : 'SECURITY LOCK-ON';
      audio?.playCaughtFail();
    }
  } else {
    state.spottedBy = null;
    state.caughtGrace = Math.max(0, state.caughtGrace - dt * 1.45);
    if (state.alarm > 0 && state.alarm < 95) {
      state.alarm = Math.max(0, state.alarm - dt * (state.lootSecured ? 1.8 : 3.2));
    }
  }

  state.peakAlarm = Math.max(state.peakAlarm, state.alarm);
  if (state.lastSeen) {
    state.lastSeen.timer -= dt;
    if (state.lastSeen.timer <= 0) state.lastSeen = null;
  }
}
