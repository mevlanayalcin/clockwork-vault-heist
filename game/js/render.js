// Bespoke Art-Deco Brass & Prussian Blueprint 2D Canvas renderer.

import { ARENA, WORLD_H, WORLD_W } from './blueprints.js';
import { CAUGHT_GRACE_SECONDS, getAlarmTier } from './security.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const hatchPattern = buildHatchPattern();
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = window.innerWidth || WORLD_W;
    const cssH = window.innerHeight || WORLD_H;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    scale = Math.min(cssW / WORLD_W, cssH / WORLD_H);
    offsetX = (cssW - WORLD_W * scale) * 0.5;
    offsetY = (cssH - WORLD_H * scale) * 0.5;
    return { dpr, cssW, cssH };
  }

  function screenToWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    return {
      x: (sx - offsetX) / scale,
      y: (sy - offsetY) / scale,
    };
  }

  function render(state, audioMuted = false) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#060f1c';
    ctx.fillRect(0, 0, cssW, cssH);

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    drawBlueprintFloor(ctx, state);
    drawSchematicsAndRoutes(ctx, state);
    drawSafeCoverZones(ctx, state, hatchPattern);
    drawPatrolTracks(ctx, state);
    drawVisionCones(ctx, state);
    drawWallsAndPlinths(ctx, state);
    drawLasersRelaysVents(ctx, state);
    drawLootAndExit(ctx, state);
    drawTrail(ctx, state);
    drawToolsEffects(ctx, state);
    drawGuardsAndCameras(ctx, state);
    drawPlayerAndLockOn(ctx, state);
    drawGuardBarks(ctx, state);
    drawPromptAndBanner(ctx, state);
    drawHud(ctx, state, audioMuted);

    if (state.status === 'EXTRACTED') drawGetawayCard(ctx, state);
    if (state.status === 'CAUGHT') drawCaughtCard(ctx, state);

    ctx.restore();
  }

  resize();
  return { resize, screenToWorld, render };
}

function buildHatchPattern() {
  const c = document.createElement('canvas');
  c.width = 14;
  c.height = 14;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(14, 78, 92, 0.52)';
  g.fillRect(0, 0, 14, 14);
  g.strokeStyle = 'rgba(54, 240, 224, 0.42)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-2, 14);
  g.lineTo(14, -2);
  g.moveTo(5, 21);
  g.lineTo(21, 5);
  g.stroke();
  return g.createPattern(c, 'repeat');
}

function money(val) {
  if (val >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
  return `$${Math.round(val / 1000)}K`;
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawBlueprintFloor(ctx, state) {
  const { x, y, w, h } = ARENA;
  const bg = ctx.createRadialGradient(state.loot.x, state.loot.y, 40, WORLD_W * 0.5, WORLD_H * 0.5, 680);
  bg.addColorStop(0, '#122947');
  bg.addColorStop(0.55, '#0b1b32');
  bg.addColorStop(1, '#081324');
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);

  // Drafting blueprint grid (minor + major)
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 14, y + 14, w - 28, h - 28);
  ctx.clip();

  ctx.strokeStyle = 'rgba(84, 178, 228, 0.075)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let gx = x + 20; gx < x + w; gx += 20) {
    ctx.moveTo(gx + 0.5, y);
    ctx.lineTo(gx + 0.5, y + h);
  }
  for (let gy = y + 20; gy < y + h; gy += 20) {
    ctx.moveTo(x, gy + 0.5);
    ctx.lineTo(x + w, gy + 0.5);
  }
  ctx.stroke();

  ctx.strokeStyle = 'rgba(104, 198, 245, 0.16)';
  ctx.beginPath();
  for (let gx = x + 80; gx < x + w; gx += 80) {
    ctx.moveTo(gx + 0.5, y);
    ctx.lineTo(gx + 0.5, y + h);
  }
  for (let gy = y + 80; gy < y + h; gy += 80) {
    ctx.moveTo(x, gy + 0.5);
    ctx.lineTo(x + w, gy + 0.5);
  }
  ctx.stroke();

  // Art-Deco sunburst floor inlay under primary vault loot
  const lx = state.loot.x;
  const ly = state.loot.y;
  ctx.strokeStyle = 'rgba(218, 170, 74, 0.18)';
  ctx.lineWidth = 1.2;
  for (const r of [64, 96, 128]) {
    ctx.beginPath();
    ctx.arc(lx, ly, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(lx + Math.cos(a) * 34, ly + Math.sin(a) * 34);
    ctx.lineTo(lx + Math.cos(a) * 124, ly + Math.sin(a) * 124);
    ctx.stroke();
  }

  // Architectural blueprint sector callouts
  ctx.fillStyle = 'rgba(130, 204, 242, 0.34)';
  ctx.font = '700 11px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  for (const c of state.blueprint.callouts || []) {
    ctx.fillText(c.text, c.x, c.y);
  }

  // Bottom-right blueprint drafting stamp inside floor margin
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(214, 174, 92, 0.36)';
  ctx.font = '700 10px "Trebuchet MS", sans-serif';
  ctx.fillText(`${state.blueprint.sector} · ARCHIVE PLATE 0${state.vaultIndex + 1}`, x + w - 24, y + h - 22);

  ctx.restore();
}

function drawSchematicsAndRoutes(ctx, state) {
  // Underground Vent Bypass schematic conduit
  const drawnPairs = new Set();
  for (const v of state.vents) {
    const key = [v.id, v.pairId].sort().join(':');
    if (drawnPairs.has(key)) continue;
    drawnPairs.add(key);
    const o = state.vents.find((x) => x.id === v.pairId);
    if (!o) continue;
    ctx.save();
    ctx.strokeStyle = 'rgba(54, 232, 214, 0.45)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    const midY = Math.min(v.y, o.y) - 24;
    ctx.beginPath();
    ctx.moveTo(v.x, v.y);
    ctx.lineTo(v.x, Math.max(ARENA.y + 22, midY));
    ctx.lineTo(o.x, Math.max(ARENA.y + 22, midY));
    ctx.lineTo(o.x, o.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label positioned in unobstructed open corridor space along the vent conduit
    let mx = (v.x + o.x) * 0.5;
    const my = Math.max(ARENA.y + 21, midY);
    for (const p of state.plinths) {
      const pad = (p.pad ?? 22) + 8;
      if (mx + 62 > p.x - pad && mx - 62 < p.x + p.w + pad && my + 12 > p.y - pad && my - 12 < p.y + p.h + pad) {
        mx = p.x + p.w + pad + 64;
      }
    }
    mx = Math.min(Math.max(v.x, o.x) - 70, mx);
    ctx.fillStyle = 'rgba(8, 25, 39, 0.92)';
    roundRectPath(ctx, mx - 58, my - 9, 116, 18, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(54, 232, 214, 0.62)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#7efbf0';
    ctx.font = '800 9.5px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VENT BYPASS DUCT', mx, my + 0.5);
    ctx.restore();
  }

  // Relay-to-Laser power wire
  for (const r of state.relays) {
    for (const lid of r.targetLaserIds) {
      const l = state.lasers.find((x) => x.id === lid);
      if (!l) continue;
      const lx = (l.x1 + l.x2) * 0.5;
      const ly = l.y1;
      ctx.save();
      ctx.strokeStyle = r.hacked ? 'rgba(56, 229, 157, 0.48)' : 'rgba(255, 76, 102, 0.42)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(lx - 18, r.y);
      ctx.lineTo(lx - 18, ly);
      ctx.lineTo(lx, ly);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawSafeCoverZones(ctx, state, hatchPattern) {
  ctx.save();
  // Walkable shadow alcoves (hatched teal)
  for (const a of state.alcoves) {
    ctx.fillStyle = hatchPattern;
    roundRectPath(ctx, a.x, a.y, a.w, a.h, 6);
    ctx.fill();
    ctx.strokeStyle = '#36f0dc';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Hatched teal SAFE COVER aprons around display plinths
  for (const p of state.plinths) {
    const pad = p.pad ?? 22;
    const ax = p.x - pad;
    const ay = p.y - pad;
    const aw = p.w + pad * 2;
    const ah = p.h + pad * 2;
    ctx.fillStyle = hatchPattern;
    roundRectPath(ctx, ax, ay, aw, ah, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(54, 240, 220, 0.72)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  ctx.restore();
}

function drawPatrolTracks(ctx, state) {
  ctx.save();
  for (const g of state.guards) {
    const wps = g.waypoints;
    if (!wps || wps.length < 2) continue;
    ctx.strokeStyle = 'rgba(255, 200, 92, 0.34)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(wps[0].x, wps[0].y);
    for (let i = 1; i < wps.length; i++) ctx.lineTo(wps[i].x, wps[i].y);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Timing pips (1s / 2s) at corners so patrol rhythm is readable at a glance
    for (let i = 0; i < wps.length; i++) {
      const wp = wps[i];
      const next = wps[(i + 1) % wps.length];
      const mx = (wp.x + next.x) * 0.5;
      const my = (wp.y + next.y) * 0.5;
      const ang = Math.atan2(next.y - wp.y, next.x - wp.x);
      ctx.fillStyle = 'rgba(255, 202, 92, 0.55)';
      ctx.beginPath();
      ctx.moveTo(mx + Math.cos(ang) * 6, my + Math.sin(ang) * 6);
      ctx.lineTo(mx + Math.cos(ang + 2.4) * 5, my + Math.sin(ang + 2.4) * 5);
      ctx.lineTo(mx + Math.cos(ang - 2.4) * 5, my + Math.sin(ang - 2.4) * 5);
      ctx.closePath();
      ctx.fill();

      const waitSec = Math.round(wp.wait ?? 1);
      ctx.fillStyle = '#112238';
      ctx.beginPath();
      ctx.arc(wp.x, wp.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 202, 92, 0.72)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = '#ffe29c';
      ctx.font = '700 9px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${waitSec}s`, wp.x, wp.y + 0.5);
    }
  }
  ctx.restore();
}

function drawVisionCones(ctx, state) {
  // CCTV sweeping cones first
  for (const cam of state.cameras) {
    // Dotted sweep-limit envelope arc so player reads full camera range before moving
    ctx.save();
    ctx.strokeStyle = cam.offlineTimer > 0 ? 'rgba(56, 232, 255, 0.25)' : 'rgba(66, 210, 255, 0.24)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, cam.range * 0.92, cam.baseAngle - cam.sweep - cam.halfFov, cam.baseAngle + cam.sweep + cam.halfFov);
    ctx.stroke();
    ctx.setLineDash([]);

    if (cam.offlineTimer <= 0 && cam.conePoly.length > 2) {
      const grad = ctx.createRadialGradient(cam.x, cam.y, 8, cam.x, cam.y, cam.range);
      if (cam.seeingPlayer || cam.alertLevel > 0.35) {
        grad.addColorStop(0, 'rgba(255, 56, 86, 0.58)');
        grad.addColorStop(1, 'rgba(255, 42, 74, 0.14)');
      } else {
        grad.addColorStop(0, 'rgba(54, 224, 255, 0.44)');
        grad.addColorStop(1, 'rgba(42, 178, 235, 0.10)');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(cam.conePoly[0].x, cam.conePoly[0].y);
      for (let i = 1; i < cam.conePoly.length; i++) ctx.lineTo(cam.conePoly[i].x, cam.conePoly[i].y);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = cam.seeingPlayer ? 'rgba(255, 92, 114, 0.92)' : 'rgba(98, 238, 255, 0.72)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Guard raycast cones
  for (const g of state.guards) {
    if (!g.conePoly || g.conePoly.length < 3) continue;
    ctx.save();
    const grad = ctx.createRadialGradient(g.x, g.y, 10, g.x, g.y, g.range);
    let stroke;
    if (g.state === 'ALERT') {
      grad.addColorStop(0, 'rgba(255, 46, 72, 0.62)');
      grad.addColorStop(0.65, 'rgba(255, 62, 82, 0.34)');
      grad.addColorStop(1, 'rgba(255, 46, 72, 0.10)');
      stroke = 'rgba(255, 98, 116, 0.95)';
    } else if (g.state === 'SUSPICIOUS' || g.state === 'DISTRACTED' || g.state === 'SEARCH') {
      grad.addColorStop(0, 'rgba(255, 134, 44, 0.56)');
      grad.addColorStop(0.65, 'rgba(255, 148, 52, 0.30)');
      grad.addColorStop(1, 'rgba(255, 134, 44, 0.09)');
      stroke = 'rgba(255, 174, 86, 0.92)';
    } else {
      grad.addColorStop(0, 'rgba(255, 192, 62, 0.52)');
      grad.addColorStop(0.65, 'rgba(255, 174, 46, 0.28)');
      grad.addColorStop(1, 'rgba(255, 158, 36, 0.08)');
      stroke = 'rgba(255, 214, 106, 0.85)';
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(g.conePoly[0].x, g.conePoly[0].y);
    for (let i = 1; i < g.conePoly.length; i++) ctx.lineTo(g.conePoly[i].x, g.conePoly[i].y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();
  }
}

function drawWallsAndPlinths(ctx, state) {
  ctx.save();
  // Drop shadows
  ctx.fillStyle = 'rgba(2, 7, 15, 0.56)';
  for (const w of state.walls) {
    if (!w.perimeter) ctx.fillRect(w.x + 5, w.y + 6, w.w, w.h);
  }
  for (const p of state.plinths) {
    ctx.fillRect(p.x + 4, p.y + 5, p.w, p.h);
  }

  // Obsidian + Brass Art-Deco walls
  for (const w of state.walls) {
    ctx.fillStyle = '#111d2e';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = '#d4a348';
    ctx.lineWidth = w.perimeter ? 2.4 : 2;
    ctx.strokeRect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
    if (!w.perimeter && w.w >= 14 && w.h >= 14) {
      ctx.strokeStyle = 'rgba(255, 224, 148, 0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(w.x + 4, w.y + 4, w.w - 8, w.h - 8);
    }
  }

  // Art-Deco brass corner filigree brackets on perimeter blueprint frame
  ctx.strokeStyle = '#f2cc74';
  ctx.lineWidth = 2.6;
  const corners = [
    [ARENA.x - 4, ARENA.y - 4, 1, 1],
    [ARENA.x + ARENA.w + 4, ARENA.y - 4, -1, 1],
    [ARENA.x - 4, ARENA.y + ARENA.h + 4, 1, -1],
    [ARENA.x + ARENA.w + 4, ARENA.y + ARENA.h + 4, -1, -1],
  ];
  for (const [cx, cy, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx + sx * 22, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + sy * 22);
    ctx.stroke();
  }

  // Display Cover Plinths (obsidian + brass + crisp SAFE COVER label)
  for (const p of state.plinths) {
    ctx.fillStyle = '#15273d';
    roundRectPath(ctx, p.x, p.y, p.w, p.h, 4);
    ctx.fill();
    ctx.strokeStyle = '#d8aa50';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(54, 240, 220, 0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(p.x + 4, p.y + 4, p.w - 8, p.h - 8);

    ctx.fillStyle = '#7cf7ea';
    ctx.font = '800 9px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.w >= 72 ? 'SAFE COVER' : 'COVER', p.x + p.w * 0.5, p.y + p.h * 0.5 + 0.5);
  }
  ctx.restore();
}

function drawLasersRelaysVents(ctx, state) {
  ctx.save();

  // Vent grates
  for (const v of state.vents) {
    ctx.fillStyle = '#102938';
    roundRectPath(ctx, v.x - 18, v.y - 18, 36, 36, 5);
    ctx.fill();
    ctx.strokeStyle = '#3ef0de';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = '#d4a348';
    ctx.lineWidth = 2;
    for (let bar = -10; bar <= 10; bar += 5) {
      ctx.beginPath();
      ctx.moveTo(v.x - 11, v.y + bar);
      ctx.lineTo(v.x + 11, v.y + bar);
      ctx.stroke();
    }
    ctx.fillStyle = '#8efbf0';
    ctx.font = '800 10px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(v.label, v.x, v.y + 29);
  }

  // Relays
  for (const r of state.relays) {
    const col = r.hacked ? '#38e59d' : '#ff687c';
    ctx.fillStyle = '#132134';
    roundRectPath(ctx, r.x - 18, r.y - 12, 36, 24, 4);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(r.x - 7, r.y, 3.5, 0, Math.PI * 2);
    ctx.arc(r.x + 7, r.y, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = r.hacked ? '#7dffbe' : '#ffd2d9';
    ctx.font = '800 10px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(r.hacked ? 'RELAY CUT' : r.label, r.x, r.y + 24);
  }

  // Laser gates
  for (const l of state.lasers) {
    const off = l.disabled || l.empTimer > 0;
    const mx = (l.x1 + l.x2) * 0.5;
    const my = (l.y1 + l.y2) * 0.5;

    if (!off) {
      const flick = 0.8 + 0.2 * Math.sin(state.time * 24);
      ctx.strokeStyle = `rgba(255, 38, 72, ${0.32 * flick})`;
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();

      ctx.strokeStyle = '#ff3858';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(l.x1 - 3, l.y1);
      ctx.lineTo(l.x2 - 3, l.y2);
      ctx.moveTo(l.x1 + 3, l.y1);
      ctx.lineTo(l.x2 + 3, l.y2);
      ctx.stroke();

      ctx.strokeStyle = '#ffd9df';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = l.empTimer > 0 ? 'rgba(56, 232, 255, 0.55)' : 'rgba(56, 229, 157, 0.45)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Clear status pill on cut/EMP'd laser
      const tag = l.empTimer > 0 ? `LASER EMP ${l.empTimer.toFixed(1)}s` : 'LASER CUT';
      ctx.fillStyle = 'rgba(8, 22, 36, 0.92)';
      roundRectPath(ctx, mx - 48, my - 10, 96, 20, 4);
      ctx.fill();
      ctx.strokeStyle = l.empTimer > 0 ? '#38e8ff' : '#38e59d';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = l.empTimer > 0 ? '#8ef5ff' : '#7effc4';
      ctx.font = '800 10px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tag, mx, my + 0.5);
    }

    // Brass emitter caps
    for (const [ex, ey] of [[l.x1, l.y1], [l.x2, l.y2]]) {
      ctx.fillStyle = '#d4a348';
      ctx.beginPath();
      ctx.arc(ex, ey, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = off ? '#38e8ff' : '#ff2f52';
      ctx.beginPath();
      ctx.arc(ex, ey, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawLootAndExit(ctx, state) {
  ctx.save();
  // Primary Vault Loot Centerpiece
  const loot = state.loot;
  const pulse = 0.5 + 0.5 * Math.sin(state.time * 4.2);

  if (!loot.taken) {
    const glow = ctx.createRadialGradient(loot.x, loot.y, 6, loot.x, loot.y, 64 + pulse * 10);
    glow.addColorStop(0, 'rgba(255, 214, 72, 0.56)');
    glow.addColorStop(0.55, 'rgba(255, 174, 34, 0.22)');
    glow.addColorStop(1, 'rgba(255, 160, 24, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(loot.x, loot.y, 74, 0, Math.PI * 2);
    ctx.fill();

    // Rotating Art-Deco clockwork ring
    ctx.save();
    ctx.translate(loot.x, loot.y);
    ctx.rotate(state.time * 0.7);
    ctx.strokeStyle = '#ffd65c';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, 31, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Gilded octagonal podium
    ctx.fillStyle = '#2b2009';
    ctx.beginPath();
    ctx.arc(loot.x, loot.y, 23, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffda66';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Diamond chronometer jewel
    ctx.fillStyle = '#ffe580';
    ctx.beginPath();
    ctx.moveTo(loot.x, loot.y - 13);
    ctx.lineTo(loot.x + 12, loot.y);
    ctx.lineTo(loot.x, loot.y + 13);
    ctx.lineTo(loot.x - 12, loot.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff9d6';
    ctx.beginPath();
    ctx.arc(loot.x, loot.y, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Crack progress ring
    if (loot.progress > 0) {
      ctx.strokeStyle = '#fff5c2';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.arc(loot.x, loot.y, 38, -Math.PI * 0.5, -Math.PI * 0.5 + (loot.progress / loot.crackTime) * Math.PI * 2);
      ctx.stroke();
    }

    // Crisp Loot Callout Banner (high contrast, readable at 256px!)
    const pillW = 212;
    ctx.fillStyle = 'rgba(18, 16, 8, 0.90)';
    roundRectPath(ctx, loot.x - pillW * 0.5, loot.y + 34, pillW, 24, 5);
    ctx.fill();
    ctx.strokeStyle = '#ffd557';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = '#ffe68c';
    ctx.font = '800 11px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${loot.name} · ${money(loot.value)}`, loot.x, loot.y + 46.5);
  } else {
    ctx.fillStyle = 'rgba(20, 32, 46, 0.8)';
    ctx.beginPath();
    ctx.arc(loot.x, loot.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 214, 92, 0.45)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffd86b';
    ctx.font = '800 11px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LOOT SECURED ✓', loot.x, loot.y + 36);
  }

  // Optional bonus loot stashes
  for (const b of state.bonuses) {
    if (b.taken) continue;
    ctx.fillStyle = 'rgba(255, 208, 72, 0.24)';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd257';
    ctx.beginPath();
    ctx.moveTo(b.x, b.y - 10);
    ctx.lineTo(b.x + 10, b.y);
    ctx.lineTo(b.x, b.y + 10);
    ctx.lineTo(b.x - 10, b.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffea9e';
    ctx.font = '800 10px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`+${money(b.value)}`, b.x, b.y + 23);
  }

  // Extraction Lift Chute
  const ex = state.exit;
  const open = state.lootSecured;
  const glowR = open ? 56 + pulse * 14 : 36;
  const eGlow = ctx.createRadialGradient(ex.x, ex.y, 8, ex.x, ex.y, glowR);
  eGlow.addColorStop(0, open ? 'rgba(34, 232, 146, 0.62)' : 'rgba(34, 210, 140, 0.18)');
  eGlow.addColorStop(1, 'rgba(34, 232, 146, 0)');
  ctx.fillStyle = eGlow;
  ctx.beginPath();
  ctx.arc(ex.x, ex.y, glowR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = open ? '#0d3b2b' : '#0f2329';
  roundRectPath(ctx, ex.x - 28, ex.y - 24, 56, 48, 8);
  ctx.fill();
  ctx.strokeStyle = open ? '#32ff9e' : 'rgba(52, 214, 146, 0.45)';
  ctx.lineWidth = open ? 3 : 2;
  ctx.stroke();

  // Animated extraction chevrons
  ctx.strokeStyle = open ? '#82ffc4' : 'rgba(92, 216, 162, 0.42)';
  ctx.lineWidth = 2.6;
  for (let i = -1; i <= 1; i++) {
    const cy = ex.y + i * 9 - (open ? (state.time * 14) % 9 : 0) + 4;
    ctx.beginPath();
    ctx.moveTo(ex.x - 10, cy + 4);
    ctx.lineTo(ex.x, cy - 3);
    ctx.lineTo(ex.x + 10, cy + 4);
    ctx.stroke();
  }

  // Oversized glowing GETAWAY OPEN banner when loot secured!
  if (open) {
    const bw = 158;
    ctx.fillStyle = 'rgba(7, 36, 25, 0.94)';
    roundRectPath(ctx, ex.x - bw * 0.5 - 12, ex.y + 30, bw, 25, 5);
    ctx.fill();
    ctx.strokeStyle = '#38ff9f';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#92ffca';
    ctx.font = '900 11.5px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GETAWAY OPEN → LIFT', ex.x - 12, ex.y + 43);
  } else {
    ctx.fillStyle = '#77e2b2';
    ctx.font = '800 10px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT LIFT', ex.x, ex.y + 39);
  }

  ctx.restore();
}

function drawTrail(ctx, state) {
  if (!state.trail || state.trail.length < 2) return;
  const highlight = state.status === 'EXTRACTED';
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 1; i < state.trail.length; i++) {
    const a = state.trail[i - 1];
    const b = state.trail[i];
    if (b.ventJump) {
      ctx.strokeStyle = highlight ? 'rgba(64, 245, 224, 0.92)' : 'rgba(64, 245, 224, 0.36)';
      ctx.lineWidth = highlight ? 4 : 2;
      ctx.setLineDash([7, 6]);
    } else {
      ctx.setLineDash([]);
      if (highlight) {
        ctx.strokeStyle = b.secured ? '#ffd95e' : '#3eeeff';
        ctx.lineWidth = 4.6;
      } else {
        ctx.strokeStyle = b.secured ? 'rgba(255, 217, 94, 0.34)' : 'rgba(62, 238, 255, 0.24)';
        ctx.lineWidth = 2.4;
      }
    }
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // Glowing halo pass for getaway replay route
  if (highlight) {
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(84, 244, 255, 0.22)';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(state.trail[0].x, state.trail[0].y);
    for (let i = 1; i < state.trail.length; i++) {
      if (state.trail[i].ventJump) ctx.moveTo(state.trail[i].x, state.trail[i].y);
      else ctx.lineTo(state.trail[i].x, state.trail[i].y);
    }
    ctx.stroke();

    // Start marker badge
    const s0 = state.trail[0];
    ctx.fillStyle = '#0d2638';
    ctx.beginPath();
    ctx.arc(s0.x, s0.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3eeeff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = '#9ef7ff';
    ctx.font = '800 9px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ENTRY', s0.x, s0.y + 21);
  }
  ctx.restore();
}

function drawToolsEffects(ctx, state) {
  ctx.save();

  // Footstep acoustic rings
  for (const n of state.noiseRings) {
    ctx.strokeStyle = n.loud ? `rgba(255, 160, 74, ${n.alpha})` : `rgba(110, 214, 248, ${n.alpha})`;
    ctx.lineWidth = n.loud ? 2.4 : 1.4;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // EMP Shockwaves + crackling electric arcs
  for (const e of state.empPulses) {
    const a = Math.max(0, e.timer / e.maxTimer);
    const g = ctx.createRadialGradient(e.x, e.y, Math.max(4, e.radius - 42), e.x, e.y, e.radius + 10);
    g.addColorStop(0, 'rgba(56, 232, 255, 0)');
    g.addColorStop(0.74, `rgba(56, 232, 255, ${0.48 * a})`);
    g.addColorStop(1, 'rgba(180, 252, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius + 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(130, 248, 255, ${0.98 * a})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Electric arcs along EMP ring
    ctx.strokeStyle = `rgba(195, 252, 255, ${0.9 * a})`;
    ctx.lineWidth = 2;
    for (let k = 0; k < 6; k++) {
      const base = (k / 6) * Math.PI * 2 + state.time * 1.4;
      ctx.beginPath();
      for (let s = 0; s <= 4; s++) {
        const ang = base + s * 0.12;
        const rad = e.radius + (s % 2 === 0 ? -5 : 6);
        const px = e.x + Math.cos(ang) * rad;
        const py = e.y + Math.sin(ang) * rad;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    ctx.strokeStyle = `rgba(56, 232, 255, ${0.58 * a})`;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Bold EMP PULSE callout badge along lower-left quadrant of shockwave
    const bx = e.x - e.radius * 0.68 - 42;
    const by = e.y + e.radius * 0.52;
    ctx.fillStyle = 'rgba(6, 28, 42, 0.94)';
    roundRectPath(ctx, bx, by, 84, 19, 4);
    ctx.fill();
    ctx.strokeStyle = '#48ecff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#a8fbff';
    ctx.font = '900 10px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EMP PULSE', bx + 42, by + 10);
  }

  // Clockwork Decoys
  for (const d of state.decoys) {
    const ring1 = 18 + ((d.pulsePhase * 28) % 68);
    const ring2 = 18 + (((d.pulsePhase + 1.5) * 28) % 68);
    for (const r of [ring1, ring2]) {
      const al = Math.max(0, 1 - r / 86) * 0.78;
      ctx.strokeStyle = `rgba(255, 210, 88, ${al})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#2b220c';
    ctx.beginPath();
    ctx.arc(d.x, d.y, 11.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd55c';
    ctx.lineWidth = 2.6;
    ctx.stroke();
    ctx.fillStyle = '#131d2e';
    roundRectPath(ctx, d.x - 40, d.y + 15, 80, 17, 4);
    ctx.fill();
    ctx.strokeStyle = '#ffd55c';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.fillStyle = '#ffea9a';
    ctx.font = '800 9.5px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`DECOY ${d.timer.toFixed(1)}s`, d.x, d.y + 23.5);
  }

  // Painterly Volumetric Smoke Clouds (physically sever cones!)
  for (const s of state.smokes) {
    // Deep opaque core shadow
    const core = ctx.createRadialGradient(s.x, s.y, s.radius * 0.1, s.x, s.y, s.radius * 0.96);
    core.addColorStop(0, `rgba(28, 52, 68, ${0.9 * s.alpha})`);
    core.addColorStop(0.62, `rgba(48, 86, 108, ${0.76 * s.alpha})`);
    core.addColorStop(1, 'rgba(20, 40, 54, 0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius * 0.96, 0, Math.PI * 2);
    ctx.fill();

    // Swirling billow plumes
    const puffs = [
      [-0.42, -0.24, 0.56, 0.72],
      [0.44, -0.22, 0.52, 0.68],
      [-0.36, 0.34, 0.54, 0.66],
      [0.36, 0.34, 0.56, 0.70],
      [0.02, -0.42, 0.48, 0.62],
      [-0.08, 0.08, 0.62, 0.76],
    ];
    for (const [ox, oy, sc, op] of puffs) {
      const drift = Math.sin(state.time * 1.3 + ox * 6) * 3;
      const px = s.x + ox * s.radius + drift;
      const py = s.y + oy * s.radius - drift * 0.5;
      const pr = s.radius * sc;
      const g = ctx.createRadialGradient(px - pr * 0.2, py - pr * 0.2, pr * 0.1, px, py, pr);
      g.addColorStop(0, `rgba(176, 222, 238, ${op * 0.72 * s.alpha})`);
      g.addColorStop(0.55, `rgba(82, 132, 156, ${op * 0.66 * s.alpha})`);
      g.addColorStop(1, 'rgba(30, 56, 72, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Crisp tactical occlusion perimeter
    ctx.strokeStyle = `rgba(178, 234, 250, ${0.78 * s.alpha})`;
    ctx.lineWidth = 2.2;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius * 0.88, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(11, 28, 40, 0.92)';
    roundRectPath(ctx, s.x - 54, s.y - 10, 108, 20, 5);
    ctx.fill();
    ctx.strokeStyle = '#9fe2f7';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = '#e6f9ff';
    ctx.font = '900 10px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`SMOKE ${s.timer.toFixed(1)}s`, s.x, s.y + 0.5);
  }

  // Tactile spark particles
  for (const pt of state.particles) {
    const al = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.globalAlpha = al;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Circuit Tap arcs
  for (const arc of state.tapArcs) {
    const a = arc.timer / arc.maxTimer;
    ctx.strokeStyle = `rgba(56, 242, 166, ${a})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(arc.x1, arc.y1);
    ctx.lineTo((arc.x1 + arc.x2) * 0.5, (arc.y1 + arc.y2) * 0.5 - 14);
    ctx.lineTo(arc.x2, arc.y2);
    ctx.stroke();
  }

  // LAST SEEN ghost marker
  if (state.lastSeen) {
    const ls = state.lastSeen;
    ctx.strokeStyle = 'rgba(255, 114, 128, 0.85)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(ls.x, ls.y, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(34, 12, 18, 0.88)';
    roundRectPath(ctx, ls.x - 36, ls.y + 18, 72, 17, 4);
    ctx.fill();
    ctx.strokeStyle = '#ff6b7d';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#ffb5be';
    ctx.font = '800 9.5px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LAST SEEN', ls.x, ls.y + 26.5);
  }

  ctx.restore();
}

function drawGuardsAndCameras(ctx, state) {
  ctx.save();

  // CCTV wall domes
  for (const cam of state.cameras) {
    const off = cam.offlineTimer > 0;
    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.rotate(cam.angle);
    ctx.fillStyle = '#1b2b40';
    ctx.strokeStyle = off ? '#38e8ff' : '#d8aa50';
    ctx.lineWidth = 2;
    roundRectPath(ctx, -10, -8, 18, 16, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = off ? '#38e8ff' : cam.seeingPlayer ? '#ff3352' : '#45e6ff';
    ctx.fillRect(6, -4, 6, 8);
    ctx.restore();

    // Camera label / offline countdown pill
    const tag = off ? `CAM OFFLINE ${cam.offlineTimer.toFixed(1)}s` : cam.label;
    const tw = off ? 112 : 54;
    const bx = Math.min(ARENA.x + ARENA.w - tw - 18, Math.max(ARENA.x + 18, cam.x - tw * 0.5));
    const by = cam.y - 28;
    ctx.fillStyle = off ? 'rgba(6, 28, 40, 0.94)' : 'rgba(10, 20, 34, 0.90)';
    roundRectPath(ctx, bx, by, tw, 18, 4);
    ctx.fill();
    ctx.strokeStyle = off ? '#38e8ff' : cam.seeingPlayer ? '#ff465e' : '#58d6f5';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = off ? '#92f8ff' : cam.seeingPlayer ? '#ff9eaa' : '#a8efff';
    ctx.font = '800 9.5px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, bx + tw * 0.5, by + 9.5);
  }

  // Guards
  for (const g of state.guards) {
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.angle);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.ellipse(2, 3, 15, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shoulders
    const bodyCol = g.state === 'ALERT' ? '#a82235' : g.state === 'SUSPICIOUS' || g.state === 'DISTRACTED' ? '#a85a1c' : '#2c3d58';
    ctx.fillStyle = bodyCol;
    roundRectPath(ctx, -10, -13, 18, 26, 7);
    ctx.fill();
    ctx.strokeStyle = g.state === 'ALERT' ? '#ff6c80' : '#e0b458';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Brass helmet / visor
    ctx.fillStyle = '#141e2e';
    ctx.beginPath();
    ctx.arc(2, 0, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f2cc74';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Flashlight emitter nose
    ctx.fillStyle = g.state === 'ALERT' ? '#ff5c72' : '#ffe18a';
    ctx.beginPath();
    ctx.arc(10, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // State indicator glyph
    if (g.state !== 'PATROL') {
      const sym = g.state === 'ALERT' ? '!' : g.state === 'DISTRACTED' ? '?' : '?';
      const col = g.state === 'ALERT' ? '#ff3b52' : '#ffb838';
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(g.x + 15, g.y - 14, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#09111e';
      ctx.font = '900 12px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sym, g.x + 15, g.y - 13.5);
    }
  }
  ctx.restore();
}

function drawPlayerAndLockOn(ctx, state) {
  const { player } = state;
  ctx.save();

  // Safe Cover shield aura when crouched in cover
  if (player.inCover) {
    ctx.strokeStyle = player.crouched ? '#36f5e0' : 'rgba(54, 245, 224, 0.5)';
    ctx.lineWidth = player.crouched ? 2.6 : 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Thief visibility halo so thief reads instantly at 256px
  const halo = ctx.createRadialGradient(player.x, player.y, 4, player.x, player.y, 26);
  halo.addColorStop(0, player.crouched && player.inCover ? 'rgba(56, 245, 224, 0.36)' : 'rgba(130, 240, 255, 0.34)');
  halo.addColorStop(1, 'rgba(56, 232, 255, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 26, 0, Math.PI * 2);
  ctx.fill();

  // Thief figure
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  const r = player.crouched ? 12 : 14;

  // Ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.arc(2, 3, r + 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Cloak silhouette
  ctx.fillStyle = player.crouched ? '#0e3c4c' : '#183454';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = player.crouched && player.inCover ? '#48ffea' : '#fff7e0';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Loot satchel gold glint when carrying vault treasure
  if (state.lootSecured) {
    ctx.fillStyle = '#ffd557';
    ctx.beginPath();
    ctx.arc(-6, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Dual Art-Deco brass goggles facing forward
  ctx.fillStyle = '#5df2ff';
  ctx.beginPath();
  ctx.arc(6.5, -3.5, 2.8, 0, Math.PI * 2);
  ctx.arc(6.5, 3.5, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // In-cover pill tag
  if (player.crouched && player.inCover && state.caughtGrace <= 0.04) {
    ctx.fillStyle = 'rgba(8, 36, 44, 0.92)';
    roundRectPath(ctx, player.x - 35, player.y + 18, 70, 17, 4);
    ctx.fill();
    ctx.strokeStyle = '#38f5e0';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = '#8efcf0';
    ctx.font = '800 9.5px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('IN COVER', player.x, player.y + 26.5);
  }

  // FAIR 1.2s CAUGHT-GRACE LOCK-ON RING (highly legible at 256px!)
  if (state.caughtGrace > 0.04 && state.status === 'PLAYING') {
    const frac = Math.min(1, state.caughtGrace / CAUGHT_GRACE_SECONDS);
    const rem = Math.max(0.1, CAUGHT_GRACE_SECONDS - state.caughtGrace);

    // Spotter laser sightline
    if (state.spottedBy) {
      ctx.strokeStyle = 'rgba(255, 58, 86, 0.78)';
      ctx.lineWidth = 2.2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(state.spottedBy.x, state.spottedBy.y);
      ctx.lineTo(player.x, player.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Outer crimson warning halo
    ctx.fillStyle = 'rgba(255, 38, 68, 0.24)';
    ctx.beginPath();
    ctx.arc(player.x, player.y, 44, 0, Math.PI * 2);
    ctx.fill();

    // Track ring
    ctx.strokeStyle = 'rgba(255, 214, 102, 0.35)';
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 34, 0, Math.PI * 2);
    ctx.stroke();

    // Filling crimson-gold grace arc
    ctx.strokeStyle = frac > 0.65 ? '#ff2c48' : '#ffb038';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(player.x, player.y, 34, -Math.PI * 0.5, -Math.PI * 0.5 + frac * Math.PI * 2);
    ctx.stroke();

    // Unmistakable telegraph badge readable at 256px
    const msg = `CAUGHT IN ${rem.toFixed(1)}s · [3] SMOKE!`;
    const bw = 224;
    const bx = Math.max(ARENA.x + 20, Math.min(ARENA.x + ARENA.w - bw - 20, player.x - bw * 0.5));
    const by = Math.max(ARENA.y + 20, player.y - 68);
    ctx.fillStyle = 'rgba(42, 8, 16, 0.96)';
    roundRectPath(ctx, bx, by, bw, 28, 6);
    ctx.fill();
    ctx.strokeStyle = '#ff445e';
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.fillStyle = '#ffe8b8';
    ctx.font = '900 12.5px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(msg, bx + bw * 0.5, by + 14.5);
  }

  ctx.restore();
}

function drawGuardBarks(ctx, state) {
  ctx.save();
  ctx.font = '700 11px "Trebuchet MS", sans-serif';
  for (const g of state.guards) {
    if (!g.bark || g.barkTimer <= 0) continue;
    const text = `"${g.bark}"`;
    const tw = Math.ceil(ctx.measureText(text).width) + 20;
    const bx = Math.max(ARENA.x + 20, Math.min(ARENA.x + ARENA.w - tw - 20, g.x - tw * 0.5));
    const by = Math.max(ARENA.y + 18, g.y - 40);

    ctx.fillStyle = 'rgba(13, 24, 38, 0.92)';
    roundRectPath(ctx, bx, by, tw, 22, 6);
    ctx.fill();
    ctx.strokeStyle = g.state === 'ALERT' ? '#ff6278' : g.state === 'DISTRACTED' ? '#ffd25c' : '#e8dcc0';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.fillStyle = '#fbf4df';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + tw * 0.5, by + 11.5);
  }
  ctx.restore();
}

function drawPromptAndBanner(ctx, state) {
  ctx.save();
  if (state.nearPrompt && state.status === 'PLAYING') {
    const p = state.nearPrompt;
    ctx.font = '800 11px "Trebuchet MS", sans-serif';
    const w = Math.ceil(ctx.measureText(p.text).width) + 22;
    const x = Math.max(ARENA.x + 20, Math.min(ARENA.x + ARENA.w - w - 20, p.x - w * 0.5));
    const y = Math.max(ARENA.y + 20, p.y - 10);
    ctx.fillStyle = 'rgba(8, 24, 38, 0.94)';
    roundRectPath(ctx, x, y, w, 22, 5);
    ctx.fill();
    ctx.strokeStyle = '#ffd65c';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = '#fff0bc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.text, x + w * 0.5, y + 11.5);
  }

  if (state.flashBanner && state.status === 'PLAYING') {
    const b = state.flashBanner;
    ctx.font = '800 12px "Trebuchet MS", sans-serif';
    const w = Math.ceil(ctx.measureText(b.text).width) + 30;
    const x = (WORLD_W - w) * 0.5;
    const y = ARENA.y + 18;
    ctx.fillStyle = 'rgba(8, 18, 32, 0.92)';
    roundRectPath(ctx, x, y, w, 26, 6);
    ctx.fill();
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = b.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.text, WORLD_W * 0.5, y + 13.5);
  }
  ctx.restore();
}

function drawHud(ctx, state, audioMuted) {
  ctx.save();

  // Top-left Vault Plate
  ctx.fillStyle = '#0c1a2e';
  roundRectPath(ctx, 16, 10, 366, 52, 7);
  ctx.fill();
  ctx.strokeStyle = '#cfa049';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.fillStyle = '#f2cc74';
  ctx.font = '800 10.5px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`VAULT ${state.vaultIndex + 1}/${state.vaultCount} · ${state.blueprint.title}`, 28, 17);

  const lootLine = state.lootSecured
    ? `LOOT ${money(state.collectedValue)} SECURED ✓`
    : `TARGET ${money(state.blueprint.loot.value)} · NET ${money(Math.max(0, state.blueprint.loot.value - state.toolSpent))}`;
  ctx.fillStyle = state.lootSecured ? '#ffd85e' : '#cbe8f8';
  ctx.font = '800 13px "Trebuchet MS", sans-serif';
  ctx.fillText(lootLine, 28, 35);

  if (state.toolSpent > 0) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ff9882';
    ctx.font = '800 11px "Trebuchet MS", sans-serif';
    ctx.fillText(`TOOLS -${money(state.toolSpent)}`, 370, 38);
  }

  // Top-Center PROMINENT ALARM METER (readable at 256px!)
  const tier = getAlarmTier(state.alarm);
  const ax = 410;
  const ay = 8;
  const aw = 460;
  const ah = 56;
  ctx.fillStyle = '#0b1829';
  roundRectPath(ctx, ax, ay, aw, ah, 8);
  ctx.fill();
  ctx.strokeStyle = tier.color;
  ctx.lineWidth = 2.4;
  ctx.stroke();

  ctx.fillStyle = '#fbf4df';
  ctx.font = '900 15.5px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`ALARM ${Math.round(state.alarm)}%`, ax + 16, ay + 7);

  ctx.textAlign = 'right';
  ctx.fillStyle = tier.color;
  ctx.font = '900 14.5px "Trebuchet MS", sans-serif';
  ctx.fillText(tier.code, ax + aw - 16, ay + 7);

  // Segmented bar
  const bx = ax + 16;
  const by = ay + 31;
  const bw = aw - 32;
  const bh = 15;
  ctx.fillStyle = '#14263d';
  roundRectPath(ctx, bx, by, bw, bh, 4);
  ctx.fill();

  const fillW = Math.max(0, Math.min(1, state.alarm / 100)) * bw;
  if (fillW > 2) {
    const barGrad = ctx.createLinearGradient(bx, by, bx + bw, by);
    barGrad.addColorStop(0, '#39d9b6');
    barGrad.addColorStop(0.42, '#f7be42');
    barGrad.addColorStop(0.75, '#ff6d32');
    barGrad.addColorStop(1, '#ff2d49');
    ctx.fillStyle = barGrad;
    roundRectPath(ctx, bx, by, fillW, bh, 4);
    ctx.fill();
  }
  // Tick marks on alarm bar
  ctx.strokeStyle = 'rgba(7, 16, 28, 0.72)';
  ctx.lineWidth = 1.5;
  for (let i = 1; i < 10; i++) {
    const tx = bx + (bw * i) / 10;
    ctx.beginPath();
    ctx.moveTo(tx, by);
    ctx.lineTo(tx, by + bh);
    ctx.stroke();
  }

  // Top-right Controls + Timer
  ctx.fillStyle = '#0c1a2e';
  roundRectPath(ctx, 898, 10, 366, 52, 7);
  ctx.fill();
  ctx.strokeStyle = '#cfa049';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#b4d8ee';
  ctx.font = '700 10.5px "Trebuchet MS", sans-serif';
  ctx.fillText('WASD MOVE · SPACE COVER · SHIFT DASH', 910, 17);
  ctx.fillStyle = '#f2cc74';
  ctx.font = '700 10.5px "Trebuchet MS", sans-serif';
  ctx.fillText(`E VENT/RELAY · 1-4 TOOLS · R RETRY · ${audioMuted ? 'MUTE' : 'SFX ON'}`, 910, 37);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#f6eed7';
  ctx.font = '900 14px "Trebuchet MS", sans-serif';
  ctx.fillText(`${state.elapsed.toFixed(1)}s`, 1252, 16);

  // Bottom-Left COSTLY TOOL BELT
  let tx = 16;
  const ty = 650;
  const cardW = 166;
  const cardH = 58;
  for (const t of state.tools) {
    const empty = t.remaining <= 0;
    ctx.fillStyle = empty ? '#0a1421' : '#0e2036';
    roundRectPath(ctx, tx, ty, cardW, cardH, 7);
    ctx.fill();
    ctx.strokeStyle = empty ? 'rgba(130, 150, 170, 0.32)' : t.color;
    ctx.lineWidth = state.activeToolId === t.id && !empty ? 2.4 : 1.5;
    ctx.stroke();

    // Key badge
    ctx.fillStyle = empty ? '#243448' : t.color;
    roundRectPath(ctx, tx + 8, ty + 8, 22, 22, 4);
    ctx.fill();
    ctx.fillStyle = '#071320';
    ctx.font = '900 13px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.key, tx + 19, ty + 19.5);

    // Tool name & real dollar cost
    ctx.textAlign = 'left';
    ctx.fillStyle = empty ? '#6a7d92' : '#f7efd8';
    ctx.font = '800 12.5px "Trebuchet MS", sans-serif';
    ctx.fillText(t.name, tx + 38, ty + 18);

    ctx.fillStyle = empty ? '#5a6b7d' : '#ffab88';
    ctx.font = '800 11px "Trebuchet MS", sans-serif';
    ctx.fillText(`-${money(t.cost)}`, tx + 38, ty + 39);

    // Charge pips
    for (let c = 0; c < t.charges; c++) {
      ctx.fillStyle = c < t.remaining ? t.color : 'rgba(255,255,255,0.14)';
      ctx.beginPath();
      ctx.arc(tx + cardW - 14 - c * 14, ty + 39, 4.8, 0, Math.PI * 2);
      ctx.fill();
    }

    tx += cardW + 10;
  }

  // Bottom-Right Compact Visual LEGEND (readable even in thumbnails!)
  const lx = 736;
  const ly = 650;
  const lw = 528;
  const lh = 58;
  ctx.fillStyle = '#0c1a2e';
  roundRectPath(ctx, lx, ly, lw, lh, 7);
  ctx.fill();
  ctx.strokeStyle = '#cfa049';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  const items = [
    { label: 'SAFE COVER', color: '#34f0dc', hatch: true },
    { label: 'GUARD CONE', color: '#ffbe48', hatch: false },
    { label: 'CCTV / LASER', color: '#ff425c', hatch: false },
    { label: 'VAULT LOOT', color: '#ffd857', hatch: false },
    { label: 'EXIT LIFT', color: '#32f29b', hatch: false },
  ];
  let ix = lx + 14;
  for (const it of items) {
    ctx.fillStyle = it.hatch ? '#145866' : it.color;
    roundRectPath(ctx, ix, ly + 17, 16, 24, 3);
    ctx.fill();
    ctx.strokeStyle = it.color;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    if (it.hatch) {
      ctx.beginPath();
      ctx.moveTo(ix + 2, ly + 39);
      ctx.lineTo(ix + 14, ly + 19);
      ctx.stroke();
    }
    ctx.fillStyle = '#e7f2fa';
    ctx.font = '800 10.5px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(it.label, ix + 22, ly + 29.5);
    ix += 102;
  }

  ctx.restore();
}

function drawGetawayCard(ctx, state) {
  const s = state.summary;
  if (!s) return;
  ctx.save();

  // Subtle dark veil keeping the glowing real getaway trail richly visible around the card
  ctx.fillStyle = 'rgba(4, 11, 20, 0.34)';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  const w = 472;
  const h = 342;
  const x = (WORLD_W - w) * 0.5;
  const y = (WORLD_H - h) * 0.5 + 4;

  ctx.fillStyle = 'rgba(9, 21, 37, 0.91)';
  roundRectPath(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = '#e8ba58';
  ctx.lineWidth = 3.2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(245, 214, 130, 0.34)';
  ctx.lineWidth = 1.2;
  roundRectPath(ctx, x + 7, y + 7, w - 14, h - 14, 8);
  ctx.stroke();

  // Header + S-Rank Brass Stamp
  ctx.fillStyle = '#38f5a4';
  ctx.font = '900 12.5px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('GETAWAY COMPLETE · REAL ROUTE LOGGED', x + 24, y + 18);

  ctx.fillStyle = '#fbf2d6';
  ctx.font = '900 22px "Trebuchet MS", sans-serif';
  ctx.fillText(s.title, x + 24, y + 38);

  // Brass Rank Seal
  const sx = x + w - 58;
  const sy = y + 52;
  ctx.fillStyle = '#2d2108';
  ctx.beginPath();
  ctx.arc(sx, sy, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd85e';
  ctx.lineWidth = 3.2;
  ctx.stroke();
  ctx.fillStyle = '#ffe588';
  ctx.font = '900 28px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(s.rank, sx, sy - 4);
  ctx.font = '800 9px "Trebuchet MS", sans-serif';
  ctx.fillText(s.rankTitle, sx, sy + 17);

  // Ledger breakdown rows
  const rows = [
    ['LOOT SECURED', `+${money(s.grossLoot)}`, '#ffe17a'],
    ['TOOL EXPENSES', s.toolCost > 0 ? `-${money(s.toolCost)}` : '$0', s.toolCost > 0 ? '#ff947c' : '#7effc4'],
    ['STEALTH & CLOCKWORK BONUS', `+${money(s.ghostBonus + s.speedBonus)}`, '#68f0ff'],
    ['PEAK ALARM · RUN TIME', `${s.peakAlarm}% · ${s.elapsed.toFixed(1)}s`, '#d4e8f8'],
  ];
  let ry = y + 96;
  for (const [k, v, col] of rows) {
    ctx.fillStyle = 'rgba(20, 40, 64, 0.72)';
    roundRectPath(ctx, x + 22, ry, w - 44, 26, 5);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#b4d0e6';
    ctx.font = '700 11.5px "Trebuchet MS", sans-serif';
    ctx.fillText(k, x + 34, ry + 13.5);
    ctx.textAlign = 'right';
    ctx.fillStyle = col;
    ctx.font = '900 12.5px "Trebuchet MS", sans-serif';
    ctx.fillText(v, x + w - 34, ry + 13.5);
    ry += 31;
  }

  // Net Payout highlight
  ctx.fillStyle = '#ffd85e';
  ctx.textAlign = 'left';
  ctx.font = '900 14px "Trebuchet MS", sans-serif';
  ctx.fillText('NET HEIST PAYOUT', x + 26, ry + 13);
  ctx.textAlign = 'right';
  ctx.font = '900 23px "Trebuchet MS", sans-serif';
  ctx.fillText(money(s.netPayout), x + w - 26, ry + 13);

  // 3 Gold Medals
  const my = ry + 36;
  const mw = 136;
  for (let i = 0; i < s.medals.length; i++) {
    const m = s.medals[i];
    const mx = x + 22 + i * (mw + 10);
    ctx.fillStyle = m.earned ? 'rgba(68, 50, 12, 0.94)' : 'rgba(18, 30, 46, 0.85)';
    roundRectPath(ctx, mx, my, mw, 40, 6);
    ctx.fill();
    ctx.strokeStyle = m.earned ? '#ffd85e' : 'rgba(130, 154, 178, 0.35)';
    ctx.lineWidth = 1.9;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = m.earned ? '#ffe588' : '#7992ab';
    ctx.font = '900 10.5px "Trebuchet MS", sans-serif';
    ctx.fillText(m.earned ? `★ ${m.label}` : m.label, mx + mw * 0.5, my + 13);
    ctx.font = '700 10px "Trebuchet MS", sans-serif';
    ctx.fillStyle = m.earned ? '#f8eed2' : '#657c94';
    ctx.fillText(m.detail, mx + mw * 0.5, my + 28);
  }

  // Action hints
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8efce0';
  ctx.font = '900 12.5px "Trebuchet MS", sans-serif';
  ctx.fillText('[N] NEXT VAULT     ·     [R] REPLAY VAULT', x + w * 0.5, y + h - 19);

  ctx.restore();
}

function drawCaughtCard(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(12, 4, 8, 0.56)';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  const w = 440;
  const h = 196;
  const x = (WORLD_W - w) * 0.5;
  const y = (WORLD_H - h) * 0.5;

  ctx.fillStyle = 'rgba(26, 10, 18, 0.95)';
  roundRectPath(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = '#ff445e';
  ctx.lineWidth = 2.8;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ff6b80';
  ctx.font = '900 24px "Trebuchet MS", sans-serif';
  ctx.fillText('HEIST COMPROMISED', x + w * 0.5, y + 46);

  ctx.fillStyle = '#fcecd4';
  ctx.font = '800 13px "Trebuchet MS", sans-serif';
  ctx.fillText(state.caughtReason || 'SECURITY LOCK-ON COMPLETED', x + w * 0.5, y + 84);

  ctx.fillStyle = '#9ce8f8';
  ctx.font = '700 12px "Trebuchet MS", sans-serif';
  ctx.fillText('TIP: POP [3] SMOKE OR DUCK BEHIND TEAL COVER DURING LOCK-ON', x + w * 0.5, y + 118);

  ctx.fillStyle = '#ffe285';
  ctx.font = '900 14px "Trebuchet MS", sans-serif';
  ctx.fillText('PRESS [R] TO RETRY VAULT', x + w * 0.5, y + 158);
  ctx.restore();
}
