// Guard patrol routes, suspicion/investigation AI, acoustic response, and speech barks.

import { canSeePoint, castVisionCone, normalizeAngle } from './raycast.js';

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
      radius: 15,
      angle: initAngle,
      targetAngle: initAngle,
      speed: bp.speed,
      range: bp.range,
      halfFov: bp.halfFov,
      waypoints: bp.waypoints.map((w) => ({ ...w })),
      wpIndex: 0,
      waitTimer: (idx * 0.5) % 1.3,
      state: 'PATROL',
      suspicion: 0,
      alertTimer: 0,
      investigatePos: null,
      stuckTimer: 0,
      stride: idx * 1.4,
      bark: '',
      barkTimer: 0,
      conePoly: [],
    };
  });
}

export function setGuardBark(guard, text, duration = 2.6) {
  guard.bark = text;
  guard.barkTimer = duration;
}

function turnToward(cur, target, maxStep) {
  const diff = normalizeAngle(target - cur);
  if (Math.abs(diff) <= maxStep) return target;
  return normalizeAngle(cur + Math.sign(diff) * maxStep);
}

function moveWithSlide(entity, tx, ty, speed, dt, solidRects) {
  const dx = tx - entity.x;
  const dy = ty - entity.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return { arrived: true, moved: 0 };
  const step = Math.min(dist, speed * dt);
  const px = entity.x;
  const py = entity.y;
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
  return { arrived: Math.hypot(tx - entity.x, ty - entity.y) < 8, moved: Math.hypot(entity.x - px, entity.y - py) };
}

export function alertGuardsBySound(guards, ox, oy, radius) {
  for (const g of guards) {
    if (Math.hypot(g.x - ox, g.y - oy) <= radius && g.state !== 'ALERT') {
      g.state = 'INVESTIGATING';
      g.suspicion = Math.max(g.suspicion, 0.38);
      g.investigatePos = { x: ox, y: oy };
      g.alertTimer = 3.2;
      setGuardBark(g, 'Footsteps nearby!', 2.2);
    }
  }
}

export function recomputeGuardCones(guards, segments, smokes) {
  for (const g of guards) {
    const ox = g.x + Math.cos(g.angle) * 12;
    const oy = g.y + Math.sin(g.angle) * 12;
    g.conePoly = castVisionCone(ox, oy, g.angle, g.halfFov, g.range, segments, smokes);
  }
}

export function stepGuards(state, dt, segments, solidRects, audio) {
  const { player, guards, smokes, decoys } = state;
  const concealed = player.crouched && player.inCover;
  const speedBoost = state.alarm >= 48 ? 1.15 : 1.0;
  let spotter = null;

  for (const g of guards) {
    if (g.barkTimer > 0) g.barkTimer = Math.max(0, g.barkTimer - dt);

    let luredBy = null;
    for (const d of decoys) {
      if (d.timer > 0 && Math.hypot(g.x - d.x, g.y - d.y) <= d.lureRadius) {
        luredBy = d;
        break;
      }
    }

    const sees = canSeePoint(g, player.x, player.y, concealed, segments, smokes);
    if (sees) {
      const dist = Math.hypot(player.x - g.x, player.y - g.y);
      const fillRate = dist < 110 ? 1.85 : 1.15;
      g.suspicion = Math.min(1, g.suspicion + dt * fillRate);
      g.targetAngle = Math.atan2(player.y - g.y, player.x - g.x);
      g.investigatePos = { x: player.x, y: player.y };
      state.lastSeen = { x: player.x, y: player.y, timer: 6.5 };
      spotter = {
        kind: 'guard',
        x: g.x,
        y: g.y,
        label: `WARDEN ${g.name}`,
        reason: concealed
          ? `SPOTTED AT CLOSE RANGE BY WARDEN ${g.name}`
          : `CROSSED WARDEN ${g.name}'S LANTERN CONE IN OPEN LIGHT`,
      };

      if (g.suspicion >= 0.44) {
        if (g.state !== 'ALERT') {
          g.state = 'ALERT';
          setGuardBark(g, 'Intruder — freeze!', 2.6);
          audio?.playSpotSting();
        }
      } else {
        g.state = 'INVESTIGATING';
        if (g.barkTimer <= 0.1) setGuardBark(g, 'Movement ahead!', 2.0);
      }
      g.alertTimer = 4.2;
      state.alarm = Math.min(100, state.alarm + dt * (g.state === 'ALERT' ? 28 : 16));
    } else {
      g.suspicion = Math.max(0, g.suspicion - dt * 0.28);
      if (luredBy && g.state !== 'ALERT') {
        if (g.state !== 'INVESTIGATING') {
          g.state = 'INVESTIGATING';
          g.suspicion = Math.max(g.suspicion, 0.54);
          setGuardBark(g, "What's ticking?", 3.0);
        }
        g.investigatePos = { x: luredBy.x, y: luredBy.y };
        g.alertTimer = 3.0;
      } else if (g.state === 'ALERT' || g.state === 'INVESTIGATING') {
        g.alertTimer -= dt;
        if (g.alertTimer <= 0) {
          g.state = 'SEARCHING';
          g.alertTimer = 3.0;
        }
      } else if (g.state === 'SEARCHING') {
        g.alertTimer -= dt;
        if (g.alertTimer <= 0) {
          g.state = 'PATROL';
          g.investigatePos = null;
        }
      }
    }

    if (g.state === 'PATROL') {
      const wp = g.waypoints[g.wpIndex];
      if (Math.hypot(wp.x - g.x, wp.y - g.y) < 7) {
        if (g.waitTimer > 0) {
          g.waitTimer -= dt;
          g.targetAngle = (wp.look ?? g.angle) + Math.sin(state.time * 1.9 + g.wpIndex) * 0.25;
        } else {
          g.wpIndex = (g.wpIndex + 1) % g.waypoints.length;
          const nxt = g.waypoints[g.wpIndex];
          g.waitTimer = nxt.wait ?? 1.0;
          g.targetAngle = Math.atan2(nxt.y - g.y, nxt.x - g.x);
        }
      } else {
        g.targetAngle = Math.atan2(wp.y - g.y, wp.x - g.x);
        const res = moveWithSlide(g, wp.x, wp.y, g.speed * speedBoost, dt, solidRects);
        g.stride += res.moved * 0.14;
      }
      g.angle = turnToward(g.angle, g.targetAngle, dt * 3.4);
    } else if (g.investigatePos) {
      const aim = Math.atan2(g.investigatePos.y - g.y, g.investigatePos.x - g.x);
      g.angle = turnToward(g.angle, aim, dt * 5.2);
      const sp = g.state === 'ALERT' ? g.speed * 1.24 : g.speed * 0.92;
      if (Math.hypot(g.investigatePos.x - g.x, g.investigatePos.y - g.y) > 36) {
        const res = moveWithSlide(g, g.investigatePos.x, g.investigatePos.y, sp, dt, solidRects);
        g.stride += res.moved * 0.15;
        g.stuckTimer = res.moved < 0.4 ? g.stuckTimer + dt : 0;
        if (g.stuckTimer > 1.2) {
          g.state = 'SEARCHING';
          g.investigatePos = null;
          g.stuckTimer = 0;
        }
      } else {
        g.angle = normalizeAngle(g.angle + Math.sin(state.time * 4.2) * dt * 2.1);
      }
    }

    const ox = g.x + Math.cos(g.angle) * 12;
    const oy = g.y + Math.sin(g.angle) * 12;
    g.conePoly = castVisionCone(ox, oy, g.angle, g.halfFov, g.range, segments, smokes);
  }

  return spotter;
}
