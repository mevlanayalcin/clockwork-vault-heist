// Exact 2D raycast visibility cones, smoke occlusion, shadow-cover checks, and segment math.

export function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function collectOpaqueSegments(walls, props) {
  const segs = [];
  const addRect = (r) => {
    const x1 = r.x;
    const y1 = r.y;
    const x2 = r.x + r.w;
    const y2 = r.y + r.h;
    segs.push({ x1, y1, x2, y2: y1 });
    segs.push({ x1: x2, y1, x2, y2 });
    segs.push({ x1: x2, y1: y2, x2: x1, y2 });
    segs.push({ x1, y1: y2, x2: x1, y2: y1 });
  };
  for (const w of walls) addRect(w);
  for (const p of props) addRect(p);
  return segs;
}

export function castRay(ox, oy, dx, dy, maxDist, segments, smokes) {
  let best = maxDist;
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const sx = s.x2 - s.x1;
    const sy = s.y2 - s.y1;
    const denom = dx * sy - dy * sx;
    if (Math.abs(denom) < 1e-7) continue;
    const qpx = s.x1 - ox;
    const qpy = s.y1 - oy;
    const t = (qpx * sy - qpy * sx) / denom;
    if (t <= 0 || t >= best) continue;
    const u = (qpx * dy - qpy * dx) / denom;
    if (u >= -1e-6 && u <= 1 + 1e-6) best = t;
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
        best = Math.min(best, 10);
        continue;
      }
      const disc = b * b - 4 * q;
      if (disc < 0) continue;
      const t = (-b - Math.sqrt(disc)) * 0.5;
      if (t > 0 && t < best) best = t;
    }
  }
  return best;
}

export function castVisionCone(ox, oy, angle, halfFov, range, segments, smokes) {
  const offsets = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) offsets.push(-halfFov + (i / steps) * (halfFov * 2));

  const rSq = (range + 18) * (range + 18);
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
    tryVertex(segments[i].x1, segments[i].y1);
    tryVertex(segments[i].x2, segments[i].y2);
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
  return castRay(ax, ay, dx / dist, dy / dist, dist, segments, smokes) >= dist - 2.5;
}

export function findShadowCover(px, py, alcoves, props, smokes) {
  if (smokes) {
    for (const s of smokes) {
      if (s.alpha > 0.2 && Math.hypot(px - s.x, py - s.y) <= s.radius * 0.92) {
        return { inCover: true, kind: 'smoke', prop: null };
      }
    }
  }
  for (const a of alcoves) {
    if (px >= a.x - 4 && px <= a.x + a.w + 4 && py >= a.y - 4 && py <= a.y + a.h + 4) {
      return { inCover: true, kind: 'alcove', prop: null };
    }
  }
  const pad = 26;
  for (const p of props) {
    if (px >= p.x - pad && px <= p.x + p.w + pad && py >= p.y - pad && py <= p.y + p.h + pad) {
      return { inCover: true, kind: p.kind, prop: p };
    }
  }
  return { inCover: false, kind: null, prop: null };
}

export function canSeePoint(obs, tx, ty, concealed, segments, smokes) {
  const dx = tx - obs.x;
  const dy = ty - obs.y;
  const dist = Math.hypot(dx, dy);
  const maxR = concealed ? Math.min(68, obs.range * 0.34) : obs.range;
  if (dist > maxR) return false;
  if (Math.abs(normalizeAngle(Math.atan2(dy, dx) - obs.angle)) > obs.halfFov) return false;
  return hasLineOfSight(obs.x, obs.y, tx, ty, segments, smokes);
}

export function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  const cx = x1 + dx * t;
  const cy = y1 + dy * t;
  return { dist: Math.hypot(px - cx, py - cy), cx, cy };
}
