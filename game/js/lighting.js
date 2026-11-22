// Exact 2D raycast vision cones, smoke occlusion, cover shadows, and volumetric lighting shaders.

export function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function collectOpaqueSegments(walls, props) {
  const segs = [];
  const pushRect = (r) => {
    const x1 = r.x;
    const y1 = r.y;
    const x2 = r.x + r.w;
    const y2 = r.y + r.h;
    segs.push({ x1, y1, x2, y2: y1 });
    segs.push({ x1: x2, y1, x2, y2 });
    segs.push({ x1: x2, y1: y2, x2: x1, y2 });
    segs.push({ x1, y1: y2, x2: x1, y2: y1 });
  };
  for (const w of walls) pushRect(w);
  for (const p of props) pushRect(p);
  return segs;
}

export function castRay(ox, oy, dx, dy, maxDist, segments, smokes) {
  let bestT = maxDist;
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const sx = s.x2 - s.x1;
    const sy = s.y2 - s.y1;
    const denom = dx * sy - dy * sx;
    if (Math.abs(denom) < 1e-7) continue;
    const qpx = s.x1 - ox;
    const qpy = s.y1 - oy;
    const t = (qpx * sy - qpy * sx) / denom;
    if (t <= 0 || t >= bestT) continue;
    const u = (qpx * dy - qpy * dx) / denom;
    if (u >= -1e-6 && u <= 1 + 1e-6) bestT = t;
  }

  if (smokes && smokes.length > 0) {
    for (let i = 0; i < smokes.length; i++) {
      const c = smokes[i];
      if (c.alpha <= 0.15) continue;
      const r = c.radius * 0.88;
      const fx = ox - c.x;
      const fy = oy - c.y;
      const b = 2 * (fx * dx + fy * dy);
      const q = fx * fx + fy * fy - r * r;
      if (q <= 0) {
        bestT = Math.min(bestT, 12);
        continue;
      }
      const disc = b * b - 4 * q;
      if (disc < 0) continue;
      const t = (-b - Math.sqrt(disc)) * 0.5;
      if (t > 0 && t < bestT) bestT = t;
    }
  }
  return bestT;
}

export function castVisionCone(ox, oy, angle, halfFov, range, segments, smokes) {
  const offsets = [];
  const steps = 42;
  for (let i = 0; i <= steps; i++) {
    offsets.push(-halfFov + (i / steps) * (halfFov * 2));
  }

  const rSq = (range + 20) * (range + 20);
  const tryVertex = (vx, vy) => {
    const dx = vx - ox;
    const dy = vy - oy;
    if (dx * dx + dy * dy > rSq) return;
    const rel = normalizeAngle(Math.atan2(dy, dx) - angle);
    if (rel >= -halfFov - 0.01 && rel <= halfFov + 0.01) {
      offsets.push(Math.max(-halfFov, rel - 0.0008));
      offsets.push(Math.max(-halfFov, Math.min(halfFov, rel)));
      offsets.push(Math.min(halfFov, rel + 0.0008));
    }
  };

  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    tryVertex(s.x1, s.y1);
    tryVertex(s.x2, s.y2);
  }
  offsets.sort((a, b) => a - b);

  const pts = [{ x: ox, y: oy }];
  let last = -999;
  for (let i = 0; i < offsets.length; i++) {
    const off = offsets[i];
    if (off - last < 0.0003) continue;
    last = off;
    const a = angle + off;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const d = castRay(ox, oy, dx, dy, range, segments, smokes);
    pts.push({ x: ox + dx * d, y: oy + dy * d });
  }
  return pts;
}

export function hasLineOfSight(ax, ay, bx, by, segments, smokes) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-4) return true;
  const hit = castRay(ax, ay, dx / dist, dy / dist, dist, segments, smokes);
  return hit >= dist - 2.5;
}

export function findAdjacentCover(px, py, props, smokes) {
  if (smokes) {
    for (const s of smokes) {
      if (s.alpha > 0.2 && Math.hypot(px - s.x, py - s.y) <= s.radius * 0.94) {
        return { inCover: true, kind: 'smoke', prop: null };
      }
    }
  }
  const pad = 28;
  for (const p of props) {
    if (px >= p.x - pad && px <= p.x + p.w + pad && py >= p.y - pad && py <= p.y + p.h + pad) {
      return { inCover: true, kind: p.kind, prop: p };
    }
  }
  return { inCover: false, kind: null, prop: null };
}

export function canObserverSeeTarget(obs, tx, ty, concealed, segments, smokes) {
  const dx = tx - obs.x;
  const dy = ty - obs.y;
  const dist = Math.hypot(dx, dy);
  const effectiveRange = concealed ? Math.min(76, obs.range * 0.34) : obs.range;
  if (dist > effectiveRange) return false;
  const rel = Math.abs(normalizeAngle(Math.atan2(dy, dx) - obs.angle));
  if (rel > obs.halfFov) return false;
  return hasLineOfSight(obs.x, obs.y, tx, ty, segments, smokes);
}

export function propagateAcousticAlert(originX, originY, radius, guards) {
  const alerted = [];
  for (const g of guards) {
    const d = Math.hypot(g.x - originX, g.y - originY);
    if (d <= radius) alerted.push({ guard: g, distance: d });
  }
  return alerted;
}

export function drawVolumetricCone(ctx, originX, originY, angle, range, poly, palette, time) {
  if (!poly || poly.length < 3) return;
  ctx.save();

  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();

  // Multi-stop volumetric flashlight beam fill
  const grad = ctx.createRadialGradient(originX, originY, 8, originX, originY, range);
  grad.addColorStop(0, palette.near);
  grad.addColorStop(0.45, palette.mid);
  grad.addColorStop(0.82, palette.far);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fill();

  // Subtle scan-arc wave + central volumetric beam flare clipped inside the cone
  ctx.clip();
  const beamEndX = originX + Math.cos(angle) * range;
  const beamEndY = originY + Math.sin(angle) * range;
  const core = ctx.createLinearGradient(originX, originY, beamEndX, beamEndY);
  core.addColorStop(0, palette.core);
  core.addColorStop(0.65, 'rgba(255, 255, 255, 0.05)');
  core.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.strokeStyle = core;
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.lineTo(beamEndX, beamEndY);
  ctx.stroke();

  // Subtle sweeping pulse arc
  const waveR = ((time * 78) % range);
  ctx.strokeStyle = palette.pulse;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(originX, originY, waveR, angle - 0.8, angle + 0.8);
  ctx.stroke();

  ctx.restore();

  // Crisp luminous rim edge so vision boundary is crystal-clear for tactical play
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
  ctx.strokeStyle = palette.rim;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}
