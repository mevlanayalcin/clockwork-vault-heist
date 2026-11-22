// Painterly 2D Art-Deco architectural museum renderer filling 100% of the 984x604 floorplan.

import { MAP, SCREEN_H, SCREEN_W } from './vaults.js';
import { CAUGHT_GRACE_SEC } from './stealth.js';
import { drawChromeAndOverlays, formatMoney, roundRect } from './hud.js';

const floorCache = new Map();

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const shadowHatch = buildShadowHatch();
  let scale = 1;
  let offX = 0;
  let offY = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = window.innerWidth || SCREEN_W;
    const ch = window.innerHeight || SCREEN_H;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    scale = Math.min(cw / SCREEN_W, ch / SCREEN_H);
    offX = (cw - SCREEN_W * scale) * 0.5;
    offY = (ch - SCREEN_H * scale) * 0.5;
  }

  function screenToLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - offX) / scale,
      y: (clientY - rect.top - offY) / scale,
    };
  }

  function render(state, audioMuted = false) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = canvas.width / dpr;
    const ch = canvas.height / dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#14100d';
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();
    ctx.translate(offX, offY);
    ctx.scale(scale, scale);

    // Clip lush architectural museum world strictly to MAP (x:0..984, y:52..656)
    ctx.save();
    ctx.beginPath();
    ctx.rect(MAP.x, MAP.y, MAP.w, MAP.h);
    ctx.clip();

    ctx.drawImage(getFloorCanvas(state.vault), MAP.x, MAP.y);
    if (state.vault.theme === 'archive') drawArchiveDials(ctx, state.vault, state.time);
    drawShadowAlcoves(ctx, state, shadowHatch);
    drawConduitsAndVents(ctx, state);
    drawNumberedPatrolLoops(ctx, state);
    drawVisionCones(ctx, state);
    drawMasonryWalls(ctx, state);
    drawMuseumProps(ctx, state);
    drawLasersAndBreakers(ctx, state);
    drawExitLift(ctx, state);
    drawVaultLoot(ctx, state);
    drawRouteTrail(ctx, state);
    drawGadgetEffects(ctx, state);
    drawWallCameras(ctx, state);
    drawGuards(ctx, state);
    drawThief(ctx, state);
    drawDetectionAndCaughtSightline(ctx, state);
    drawGuardBarks(ctx, state);
    drawWorldPrompt(ctx, state);

    ctx.restore();

    // Edge-to-edge Top Bar, Right Tactical Dossier Sidebar, Bottom Priced Tool Belt & Overlays
    drawChromeAndOverlays(ctx, state, audioMuted);

    ctx.restore();
  }

  resize();
  return { resize, screenToLogical, render };
}

function hash2d(x, y, seed = 1) {
  let n = Math.imul(x * 374761393 + y * 668265263 + seed * 1442695041, 1274126177);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}

function buildShadowHatch() {
  const c = document.createElement('canvas');
  c.width = 12;
  c.height = 12;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(14, 24, 52, 0.72)';
  g.fillRect(0, 0, 12, 12);
  g.strokeStyle = 'rgba(72, 196, 214, 0.24)';
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(-2, 12);
  g.lineTo(12, -2);
  g.moveTo(4, 18);
  g.lineTo(18, 4);
  g.stroke();
  return g.createPattern(c, 'repeat');
}

function getFloorCanvas(vault) {
  if (floorCache.has(vault.id)) return floorCache.get(vault.id);
  const c = document.createElement('canvas');
  c.width = MAP.w;
  c.height = MAP.h;
  const ctx = c.getContext('2d');
  const ox = MAP.x;
  const oy = MAP.y;

  if (vault.theme === 'conservatory') paintConservatory(ctx, MAP.w, MAP.h);
  else if (vault.theme === 'treasury') paintTreasury(ctx, MAP.w, MAP.h, vault.loot.x - ox, vault.loot.y - oy);
  else if (vault.theme === 'crown') paintCrownGallery(ctx, MAP.w, MAP.h, vault.loot.x - ox, vault.loot.y - oy);
  else if (vault.theme === 'archive') paintArchive(ctx, MAP.w, MAP.h, vault.loot.x - ox, vault.loot.y - oy);
  else paintAtrium(ctx, MAP.w, MAP.h, vault.loot.x - ox, vault.loot.y - oy);

  // Plush carpets with braided antique brass trim
  for (const cp of vault.carpets || []) {
    const cx = cp.x - ox;
    const cy = cp.y - oy;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(cx + 3, cy + 4, cp.w, cp.h);
    ctx.fillStyle = cp.color;
    ctx.fillRect(cx, cy, cp.w, cp.h);
    ctx.strokeStyle = cp.trim;
    ctx.lineWidth = 2.4;
    ctx.strokeRect(cx + 3, cy + 3, cp.w - 6, cp.h - 6);
    ctx.strokeStyle = 'rgba(255, 236, 178, 0.36)';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx + 7, cy + 7, cp.w - 14, cp.h - 14);
  }

  // Warm flickering golden sconce / chandelier pools contrasting cool indigo shadow alcoves
  for (const s of vault.sconces || []) {
    const sx = s.x - ox;
    const sy = s.y - oy;
    const g = ctx.createRadialGradient(sx, sy, 8, sx, sy, s.r);
    g.addColorStop(0, 'rgba(255, 214, 128, 0.22)');
    g.addColorStop(0.55, 'rgba(240, 176, 82, 0.08)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  if (vault.theme === 'conservatory') {
    for (const bx of [130, 390, 650]) {
      const grad = ctx.createLinearGradient(bx, 0, bx + 180, MAP.h);
      grad.addColorStop(0, 'rgba(255, 248, 210, 0.14)');
      grad.addColorStop(0.55, 'rgba(190, 246, 206, 0.08)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(bx, 0);
      ctx.lineTo(bx + 110, 0);
      ctx.lineTo(bx + 290, MAP.h);
      ctx.lineTo(bx + 180, MAP.h);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Grounded perimeter ambient occlusion
  const ao = 30;
  const tG = ctx.createLinearGradient(0, 16, 0, 16 + ao);
  tG.addColorStop(0, 'rgba(12, 8, 5, 0.54)');
  tG.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = tG;
  ctx.fillRect(16, 16, MAP.w - 32, ao);
  const bG = ctx.createLinearGradient(0, MAP.h - 16, 0, MAP.h - 16 - ao);
  bG.addColorStop(0, 'rgba(12, 8, 5, 0.48)');
  bG.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = bG;
  ctx.fillRect(16, MAP.h - 16 - ao, MAP.w - 32, ao);

  floorCache.set(vault.id, c);
  return c;
}

function paintAtrium(ctx, w, h, lx, ly) {
  // Warm sandstone & espresso-walnut inlaid museum marble tiles
  const t = 48;
  for (let y = 0; y < h; y += t) {
    for (let x = 0; x < w; x += t) {
      const ix = Math.floor(x / t);
      const iy = Math.floor(y / t);
      const v = hash2d(ix, iy, 11);
      const alt = (ix + iy) % 2 === 0;
      ctx.fillStyle = alt
        ? `rgb(${48 + Math.floor(v * 10)}, ${39 + Math.floor(v * 9)}, ${32 + Math.floor(v * 7)})`
        : `rgb(${62 + Math.floor(v * 12)}, ${51 + Math.floor(v * 10)}, ${41 + Math.floor(v * 8)})`;
      ctx.fillRect(x, y, t, t);

      ctx.strokeStyle = alt ? 'rgba(244, 216, 162, 0.08)' : 'rgba(255, 234, 188, 0.09)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(x + v * 14, y + hash2d(ix, iy, 23) * t);
      ctx.quadraticCurveTo(x + t * 0.5, y + t * 0.45, x + t - v * 12, y + (1 - v) * t);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(20, 14, 10, 0.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, t - 1, t - 1);

      ctx.fillStyle = 'rgba(222, 178, 88, 0.36)';
      ctx.beginPath();
      ctx.moveTo(x, y - 3);
      ctx.lineTo(x + 3, y);
      ctx.lineTo(x, y + 3);
      ctx.lineTo(x - 3, y);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Gilded Art-Deco compass rose centerpiece
  ctx.save();
  ctx.translate(lx, ly);
  for (const r of [52, 92, 134]) {
    ctx.strokeStyle = r === 134 ? 'rgba(232, 184, 86, 0.42)' : 'rgba(224, 178, 82, 0.24)';
    ctx.lineWidth = r === 134 ? 2 : 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const maj = i % 2 === 0;
    ctx.fillStyle = maj ? 'rgba(236, 192, 96, 0.22)' : 'rgba(182, 152, 104, 0.12)';
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (maj ? 130 : 94), Math.sin(a) * (maj ? 130 : 94));
    ctx.lineTo(Math.cos(a + 0.1) * 38, Math.sin(a + 0.1) * 38);
    ctx.lineTo(Math.cos(a - 0.1) * 38, Math.sin(a - 0.1) * 38);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function paintConservatory(ctx, w, h) {
  // Jade-travertine stone border
  const t = 44;
  for (let y = 0; y < h; y += t) {
    for (let x = 0; x < w; x += t) {
      const v = hash2d(Math.floor(x / t), Math.floor(y / t), 31);
      ctx.fillStyle = (Math.floor(x / t) + Math.floor(y / t)) % 2 === 0
        ? `rgb(${28 + Math.floor(v * 8)}, ${52 + Math.floor(v * 10)}, ${42 + Math.floor(v * 8)})`
        : `rgb(${34 + Math.floor(v * 9)}, ${62 + Math.floor(v * 10)}, ${50 + Math.floor(v * 9)})`;
      ctx.fillRect(x, y, t, t);
      ctx.strokeStyle = 'rgba(12, 24, 18, 0.42)';
      ctx.strokeRect(x + 0.5, y + 0.5, t - 1, t - 1);
    }
  }
  // Warm honey-walnut herringbone parquet center court
  const px = 256;
  const py = 36;
  const pw = 478;
  const ph = 532;
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();
  const plankW = 34;
  const plankH = 13;
  for (let gy = py - 14; gy < py + ph + 14; gy += plankH) {
    const row = Math.floor((gy - py) / plankH);
    const sh = (row % 2) * (plankW * 0.5);
    for (let gx = px - plankW; gx < px + pw + plankW; gx += plankW) {
      const v = hash2d(Math.floor((gx - px) / plankW), row, 47);
      ctx.fillStyle = `rgb(${78 + Math.floor(v * 24)}, ${52 + Math.floor(v * 16)}, ${32 + Math.floor(v * 10)})`;
      ctx.fillRect(gx + sh, gy, plankW - 1.5, plankH - 1.5);
      ctx.fillStyle = 'rgba(246, 206, 134, 0.08)';
      ctx.fillRect(gx + sh + 2, gy + 2, plankW - 6, 3);
    }
  }
  ctx.restore();
  ctx.strokeStyle = '#dfba60';
  ctx.lineWidth = 3;
  ctx.strokeRect(px, py, pw, ph);
}

function paintTreasury(ctx, w, h, lx, ly) {
  ctx.fillStyle = '#2a1c1a';
  ctx.fillRect(0, 0, w, h);
  const d = 40;
  for (let row = -2; row < Math.ceil(h / d) + 3; row++) {
    for (let col = -2; col < Math.ceil(w / d) + 3; col++) {
      const cx = col * d + (row % 2 === 0 ? 0 : d * 0.5);
      const cy = row * d;
      const v = hash2d(col, row, 71);
      const warmStone = (col + row) % 2 === 0;
      ctx.fillStyle = warmStone
        ? `rgb(${64 + Math.floor(v * 12)}, ${48 + Math.floor(v * 10)}, ${42 + Math.floor(v * 8)})`
        : `rgb(${54 + Math.floor(v * 12)}, ${26 + Math.floor(v * 8)}, ${30 + Math.floor(v * 8)})`;
      ctx.beginPath();
      ctx.moveTo(cx, cy - d * 0.5);
      ctx.lineTo(cx + d * 0.5, cy);
      ctx.lineTo(cx, cy + d * 0.5);
      ctx.lineTo(cx - d * 0.5, cy);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(226, 174, 84, 0.16)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  ctx.strokeStyle = 'rgba(242, 188, 84, 0.34)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(lx, ly, 84, 0, Math.PI * 2);
  ctx.stroke();
}

function paintCrownGallery(ctx, w, h, lx, ly) {
  const t = 46;
  for (let y = 0; y < h; y += t) {
    for (let x = 0; x < w; x += t) {
      const ix = Math.floor(x / t);
      const iy = Math.floor(y / t);
      const v = hash2d(ix, iy, 91);
      ctx.fillStyle = (ix + iy) % 2 === 0
        ? `rgb(${58 + Math.floor(v * 12)}, ${50 + Math.floor(v * 10)}, ${40 + Math.floor(v * 8)})`
        : `rgb(${44 + Math.floor(v * 10)}, ${38 + Math.floor(v * 9)}, ${34 + Math.floor(v * 8)})`;
      ctx.fillRect(x, y, t, t);
      ctx.strokeStyle = 'rgba(24, 18, 12, 0.42)';
      ctx.strokeRect(x + 0.5, y + 0.5, t - 1, t - 1);
    }
  }
  ctx.strokeStyle = 'rgba(234, 190, 94, 0.35)';
  ctx.lineWidth = 2;
  for (const r of [64, 118]) {
    ctx.beginPath();
    ctx.arc(lx, ly, r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function paintArchive(ctx, w, h, lx, ly) {
  const t = 50;
  for (let y = 0; y < h; y += t) {
    for (let x = 0; x < w; x += t) {
      const v = hash2d(Math.floor(x / t), Math.floor(y / t), 107);
      ctx.fillStyle = (Math.floor(x / t) + Math.floor(y / t)) % 2 === 0
        ? `rgb(${38 + Math.floor(v * 8)}, ${34 + Math.floor(v * 7)}, ${32 + Math.floor(v * 7)})`
        : `rgb(${48 + Math.floor(v * 9)}, ${42 + Math.floor(v * 8)}, ${37 + Math.floor(v * 7)})`;
      ctx.fillRect(x, y, t, t);
      ctx.strokeStyle = 'rgba(218, 174, 88, 0.14)';
      ctx.strokeRect(x + 0.5, y + 0.5, t - 1, t - 1);
    }
  }
  ctx.strokeStyle = 'rgba(232, 186, 86, 0.34)';
  ctx.lineWidth = 1.6;
  for (const r of [90, 165, 240]) {
    ctx.beginPath();
    ctx.arc(lx, ly, r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawArchiveDials(ctx, vault, time) {
  ctx.save();
  ctx.translate(vault.loot.x, vault.loot.y);
  ctx.rotate(time * 0.16);
  ctx.strokeStyle = 'rgba(238, 194, 98, 0.24)';
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 8]);
  ctx.beginPath();
  ctx.arc(0, 0, 130, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawShadowAlcoves(ctx, state, shadowHatch) {
  ctx.save();
  // Deep indigo-slate SAFE SHADOW ALCOVES (cool contrast against warm lit gallery!)
  for (const a of state.alcoves) {
    ctx.fillStyle = shadowHatch;
    roundRect(ctx, a.x, a.y, a.w, a.h, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(84, 214, 224, 0.62)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Soft cool-indigo shadow pockets around display cover furniture (NO text stamps!)
  for (const p of state.props) {
    const active = state.player.inCover && state.player.coverProp === p;
    const pad = 20;
    ctx.fillStyle = active ? 'rgba(18, 42, 72, 0.56)' : 'rgba(14, 24, 48, 0.34)';
    roundRect(ctx, p.x - pad, p.y - pad, p.w + pad * 2, p.h + pad * 2, 8);
    ctx.fill();
    ctx.strokeStyle = active
      ? state.player.crouched ? 'rgba(72, 246, 226, 0.88)' : 'rgba(72, 230, 220, 0.5)'
      : 'rgba(84, 178, 206, 0.28)';
    ctx.lineWidth = active ? 2 : 1.1;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawConduitsAndVents(ctx, state) {
  ctx.save();
  // Glowing copper/crimson floor-embedded breaker conduits visibly wiring Breaker -> Laser Gate
  for (const b of state.breakers) {
    const pts = b.conduit || [];
    if (pts.length < 2) continue;
    const anyEmp = b.targetLaserIds.some((id) => (state.lasers.find((l) => l.id === id)?.empTimer ?? 0) > 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(14, 10, 8, 0.68)';
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();

    ctx.strokeStyle = b.cut ? 'rgba(66, 232, 156, 0.65)' : anyEmp ? 'rgba(64, 228, 255, 0.82)' : 'rgba(255, 76, 98, 0.82)';
    ctx.lineWidth = 2.6;
    ctx.stroke();

    if (!b.cut && !anyEmp) {
      ctx.strokeStyle = '#ffcb98';
      ctx.lineWidth = 2.2;
      ctx.setLineDash([9, 24]);
      ctx.lineDashOffset = -state.time * 46;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Paired brass ventilation grates & subtle inlaid duct trace (NO ugly floating text boxes!)
  const seen = new Set();
  for (const v of state.vents) {
    const key = [v.id, v.pairId].sort().join(':');
    if (!seen.has(key)) {
      seen.add(key);
      const o = state.vents.find((x) => x.id === v.pairId);
      if (o) {
        const ductY = v.y < 300 ? MAP.y + 30 : MAP.y + MAP.h - 30;
        ctx.strokeStyle = 'rgba(78, 226, 214, 0.32)';
        ctx.lineWidth = 2.2;
        ctx.setLineDash([6, 7]);
        ctx.beginPath();
        ctx.moveTo(v.x, v.y);
        ctx.lineTo(v.x, ductY);
        ctx.lineTo(o.x, ductY);
        ctx.lineTo(o.x, o.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    ctx.fillStyle = '#181e24';
    roundRect(ctx, v.x - 16, v.y - 16, 32, 32, 4);
    ctx.fill();
    ctx.strokeStyle = '#5eeae0';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = '#dca94e';
    ctx.lineWidth = 2;
    for (let bar = -9; bar <= 9; bar += 4.5) {
      ctx.beginPath();
      ctx.moveTo(v.x - 10, v.y + bar);
      ctx.lineTo(v.x + 10, v.y + bar);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawNumberedPatrolLoops(ctx, state) {
  ctx.save();
  for (const g of state.guards) {
    const wps = g.waypoints;
    if (!wps || wps.length < 2) continue;

    ctx.strokeStyle = 'rgba(246, 204, 110, 0.28)';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([6, 7]);
    ctx.beginPath();
    ctx.moveTo(wps[0].x, wps[0].y);
    for (let i = 1; i < wps.length; i++) ctx.lineTo(wps[i].x, wps[i].y);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Numbered antique-brass waypoint medallions (1 -> 2 -> 3 -> 4) & subtle direction chevrons
    for (let i = 0; i < wps.length; i++) {
      const a = wps[i];
      const b = wps[(i + 1) % wps.length];
      const mx = (a.x + b.x) * 0.5;
      const my = (a.y + b.y) * 0.5;
      const ang = Math.atan2(b.y - a.y, b.x - a.x);

      ctx.fillStyle = 'rgba(248, 206, 114, 0.52)';
      ctx.beginPath();
      ctx.moveTo(mx + Math.cos(ang) * 5.5, my + Math.sin(ang) * 5.5);
      ctx.lineTo(mx + Math.cos(ang + 2.4) * 4.5, my + Math.sin(ang + 2.4) * 4.5);
      ctx.lineTo(mx + Math.cos(ang - 2.4) * 4.5, my + Math.sin(ang - 2.4) * 4.5);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(26, 20, 14, 0.85)';
      ctx.beginPath();
      ctx.arc(a.x, a.y, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(242, 198, 102, 0.72)';
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.fillStyle = '#fae19e';
      ctx.font = '800 9px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), a.x, a.y + 0.5);
    }
  }
  ctx.restore();
}

function drawConePoly(ctx, ox, oy, range, poly, stops, rimCol) {
  if (!poly || poly.length < 3) return;
  ctx.save();
  const grad = ctx.createRadialGradient(ox, oy, 8, ox, oy, range);
  grad.addColorStop(0, stops[0]);
  grad.addColorStop(0.58, stops[1]);
  grad.addColorStop(1, stops[2]);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rimCol;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();
}

function drawVisionCones(ctx, state) {
  // CCTV sweeping cones + blind-spot sweep-limit arcs with end ticks
  for (const cam of state.cameras) {
    const aMin = cam.baseAngle - cam.sweep - cam.halfFov;
    const aMax = cam.baseAngle + cam.sweep + cam.halfFov;
    ctx.save();
    ctx.strokeStyle = cam.empTimer > 0 ? 'rgba(66, 224, 255, 0.25)' : cam.loopTimer > 0 ? 'rgba(66, 224, 152, 0.35)' : 'rgba(66, 220, 255, 0.28)';
    ctx.lineWidth = 1.3;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, cam.range * 0.94, aMin, aMax);
    ctx.stroke();
    ctx.setLineDash([]);
    // Sweep limit end ticks showing blind spots clearly
    for (const edge of [aMin, aMax]) {
      ctx.beginPath();
      ctx.moveTo(cam.x + Math.cos(edge) * (cam.range * 0.88), cam.y + Math.sin(edge) * (cam.range * 0.88));
      ctx.lineTo(cam.x + Math.cos(edge) * (cam.range * 0.98), cam.y + Math.sin(edge) * (cam.range * 0.98));
      ctx.stroke();
    }
    ctx.restore();

    if (cam.empTimer <= 0 && cam.conePoly.length > 2) {
      if (cam.loopTimer > 0) {
        drawConePoly(ctx, cam.x, cam.y, cam.range, cam.conePoly,
          ['rgba(66, 228, 156, 0.34)', 'rgba(56, 206, 138, 0.16)', 'rgba(42, 180, 118, 0.04)'],
          'rgba(104, 248, 184, 0.72)');
      } else if (cam.seeingPlayer || cam.alertLevel > 0.3) {
        drawConePoly(ctx, cam.x, cam.y, cam.range, cam.conePoly,
          ['rgba(255, 48, 76, 0.58)', 'rgba(255, 40, 68, 0.28)', 'rgba(255, 36, 60, 0.08)'],
          'rgba(255, 102, 120, 0.94)');
      } else {
        drawConePoly(ctx, cam.x, cam.y, cam.range, cam.conePoly,
          ['rgba(54, 224, 255, 0.44)', 'rgba(44, 188, 236, 0.20)', 'rgba(34, 158, 214, 0.05)'],
          'rgba(108, 238, 255, 0.82)');
      }
    }
  }

  // Guard raycasted volumetric amber / orange / crimson lantern cones
  for (const g of state.guards) {
    if (!g.conePoly || g.conePoly.length < 3) continue;
    const ox = g.x + Math.cos(g.angle) * 12;
    const oy = g.y + Math.sin(g.angle) * 12;
    if (g.state === 'ALERT') {
      drawConePoly(ctx, ox, oy, g.range, g.conePoly,
        ['rgba(255, 44, 68, 0.64)', 'rgba(255, 58, 78, 0.34)', 'rgba(255, 42, 64, 0.09)'],
        'rgba(255, 104, 120, 0.96)');
    } else if (g.state === 'INVESTIGATING' || g.state === 'SEARCHING') {
      drawConePoly(ctx, ox, oy, g.range, g.conePoly,
        ['rgba(255, 146, 44, 0.58)', 'rgba(255, 156, 56, 0.30)', 'rgba(255, 134, 38, 0.08)'],
        'rgba(255, 188, 92, 0.94)');
    } else {
      drawConePoly(ctx, ox, oy, g.range, g.conePoly,
        ['rgba(255, 206, 78, 0.54)', 'rgba(255, 184, 52, 0.26)', 'rgba(255, 166, 36, 0.07)'],
        'rgba(255, 222, 118, 0.86)');
    }
  }
}

function drawMasonryWalls(ctx, state) {
  ctx.save();
  // Deep directional drop shadows cast by interior walls
  ctx.fillStyle = 'rgba(8, 5, 3, 0.54)';
  for (const w of state.walls) {
    if (!w.perimeter) ctx.fillRect(w.x + 5, w.y + 7, w.w, w.h + 2);
  }
  for (const w of state.walls) {
    // Bevelled stone masonry body
    const g = ctx.createLinearGradient(w.x, w.y, w.x + w.w, w.y + w.h);
    g.addColorStop(0, '#3a3029');
    g.addColorStop(1, '#221b17');
    ctx.fillStyle = g;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    // Antique brass cornice outline
    ctx.strokeStyle = '#d8a94e';
    ctx.lineWidth = w.perimeter ? 2.4 : 2;
    ctx.strokeRect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
    // Inner warm specular bevel
    ctx.strokeStyle = 'rgba(255, 236, 186, 0.26)';
    ctx.lineWidth = 1;
    ctx.strokeRect(w.x + 3.5, w.y + 3.5, Math.max(0, w.w - 7), Math.max(0, w.h - 7));
  }
  ctx.restore();
}

function drawMuseumProps(ctx, state) {
  ctx.save();
  for (const p of state.props) {
    if (p.kind === 'column') {
      const cx = p.x + p.w * 0.5;
      const cy = p.y + p.h * 0.5;
      const r = Math.min(p.w, p.h) * 0.5;
      ctx.fillStyle = 'rgba(8, 5, 3, 0.52)';
      ctx.beginPath();
      ctx.ellipse(cx + 5, cy + 7, r + 1.5, r + 1, 0, 0, Math.PI * 2);
      ctx.fill();
      const cap = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 2, cx, cy, r);
      cap.addColorStop(0, '#f2e6cf');
      cap.addColorStop(0.6, '#b5a284');
      cap.addColorStop(1, '#63533e');
      ctx.fillStyle = cap;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#dfa94c';
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(42, 30, 18, 0.45)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * (r * 0.42), cy + Math.sin(a) * (r * 0.42));
        ctx.lineTo(cx + Math.cos(a) * (r * 0.9), cy + Math.sin(a) * (r * 0.9));
        ctx.stroke();
      }
      ctx.fillStyle = '#e4b65c';
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'planter') {
      ctx.fillStyle = 'rgba(6, 10, 6, 0.48)';
      roundRect(ctx, p.x + 4, p.y + 6, p.w, p.h, 5);
      ctx.fill();
      ctx.fillStyle = '#2d4e3e';
      roundRect(ctx, p.x, p.y, p.w, p.h, 5);
      ctx.fill();
      ctx.strokeStyle = '#dfb85c';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#1b2619';
      roundRect(ctx, p.x + 5, p.y + 5, p.w - 10, p.h - 10, 3);
      ctx.fill();
      const pts = p.w > p.h
        ? [[p.x + p.w * 0.3, p.y + p.h * 0.5], [p.x + p.w * 0.7, p.y + p.h * 0.5]]
        : [[p.x + p.w * 0.5, p.y + p.h * 0.3], [p.x + p.w * 0.5, p.y + p.h * 0.7]];
      for (const [fx, fy] of pts) {
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2 + 0.3;
          ctx.save();
          ctx.translate(fx, fy);
          ctx.rotate(a);
          ctx.fillStyle = i % 2 === 0 ? '#32b070' : '#208052';
          ctx.beginPath();
          ctx.ellipse(8.5, 0, 10, 3.8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.fillStyle = '#f8d876';
        ctx.beginPath();
        ctx.arc(fx, fy, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (p.kind === 'desk') {
      ctx.fillStyle = 'rgba(8, 5, 3, 0.5)';
      roundRect(ctx, p.x + 4, p.y + 6, p.w, p.h, 4);
      ctx.fill();
      ctx.fillStyle = '#5c2a1e';
      roundRect(ctx, p.x, p.y, p.w, p.h, 4);
      ctx.fill();
      ctx.strokeStyle = '#dfb054';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#19543c';
      ctx.fillRect(p.x + 10, p.y + 6, p.w * 0.48, p.h - 12);
      ctx.strokeStyle = '#d9b25a';
      ctx.lineWidth = 1;
      ctx.strokeRect(p.x + 10, p.y + 6, p.w * 0.48, p.h - 12);
      const lx = p.x + p.w - 15;
      const ly = p.y + p.h * 0.5;
      const g = ctx.createRadialGradient(lx, ly, 2, lx, ly, 20);
      g.addColorStop(0, 'rgba(255, 224, 128, 0.55)');
      g.addColorStop(1, 'rgba(255, 200, 90, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(lx, ly, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38d88a';
      roundRect(ctx, lx - 7, ly - 4, 12, 8, 2);
      ctx.fill();
      ctx.strokeStyle = '#f4ce70';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else if (p.kind === 'plinth') {
      ctx.fillStyle = 'rgba(8, 5, 3, 0.5)';
      roundRect(ctx, p.x + 4, p.y + 6, p.w, p.h, 4);
      ctx.fill();
      ctx.fillStyle = '#382230';
      roundRect(ctx, p.x, p.y, p.w, p.h, 4);
      ctx.fill();
      ctx.strokeStyle = '#dfb054';
      ctx.lineWidth = 2;
      ctx.stroke();
      const cx = p.x + p.w * 0.5;
      const cy = p.y + p.h * 0.5;
      const r = Math.min(p.w, p.h) * 0.3;
      ctx.strokeStyle = '#f2cc70';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.42, 0.6, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Ornate Mahogany & Glass Display Case with illuminated museum artifact inside
      ctx.fillStyle = 'rgba(8, 5, 3, 0.5)';
      roundRect(ctx, p.x + 4, p.y + 6, p.w, p.h, 4);
      ctx.fill();
      const wood = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
      wood.addColorStop(0, '#723522');
      wood.addColorStop(1, '#441c12');
      ctx.fillStyle = wood;
      roundRect(ctx, p.x, p.y, p.w, p.h, 4);
      ctx.fill();
      ctx.strokeStyle = '#e0b256';
      ctx.lineWidth = 2;
      ctx.stroke();

      const ix = p.x + 6;
      const iy = p.y + 5;
      const iw = p.w - 12;
      const ih = p.h - 10;
      ctx.fillStyle = '#221426';
      ctx.fillRect(ix, iy, iw, ih);

      const cx = ix + iw * 0.5;
      const cy = iy + ih * 0.5;
      if (p.artifact === 'gem') {
        ctx.fillStyle = '#5ef4dc';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 7);
        ctx.lineTo(cx + 8, cy);
        ctx.lineTo(cx, cy + 7);
        ctx.lineTo(cx - 8, cy);
        ctx.closePath();
        ctx.fill();
      } else if (p.artifact === 'scroll') {
        ctx.fillStyle = '#ecd8a6';
        ctx.fillRect(cx - 12, cy - 4, 24, 8);
        ctx.fillStyle = '#c89238';
        ctx.fillRect(cx - 14, cy - 5, 3, 10);
        ctx.fillRect(cx + 11, cy - 5, 3, 10);
      } else {
        ctx.strokeStyle = '#ffd96a';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(cx, cy, 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#fff2be';
        ctx.beginPath();
        ctx.arc(cx, cy, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      // Diagonal glass reflection streak
      ctx.fillStyle = 'rgba(220, 244, 255, 0.16)';
      ctx.beginPath();
      ctx.moveTo(ix + 10, iy);
      ctx.lineTo(ix + 22, iy);
      ctx.lineTo(ix + 8, iy + ih);
      ctx.lineTo(ix - 4, iy + ih);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(196, 236, 255, 0.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(ix, iy, iw, ih);
    }
  }
  ctx.restore();
}

function drawLasersAndBreakers(ctx, state) {
  ctx.save();
  // Brass breaker boxes (iconic lever lights — zero floating text clutter!)
  for (const b of state.breakers) {
    const col = b.cut ? '#42e89d' : '#ff445e';
    ctx.fillStyle = '#201a16';
    roundRect(ctx, b.x - 16, b.y - 11, 32, 22, 4);
    ctx.fill();
    ctx.strokeStyle = '#dca94e';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(b.x - 6, b.y, 3.8, 0, Math.PI * 2);
    ctx.arc(b.x + 6, b.y, 3.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ruby laser tripwire gates
  for (const l of state.lasers) {
    const off = l.disabled || l.empTimer > 0;
    if (!off) {
      const f = 0.82 + 0.18 * Math.sin(state.time * 24);
      ctx.strokeStyle = `rgba(255, 36, 68, ${0.38 * f})`;
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();

      ctx.strokeStyle = '#ff3054';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(l.x1 - 3, l.y1);
      ctx.lineTo(l.x2 - 3, l.y2);
      ctx.moveTo(l.x1 + 3, l.y1);
      ctx.lineTo(l.x2 + 3, l.y2);
      ctx.stroke();

      ctx.strokeStyle = '#ffe5ea';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = l.empTimer > 0 ? 'rgba(64, 232, 255, 0.56)' : 'rgba(66, 232, 156, 0.42)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const [ex, ey] of [[l.x1, l.y1], [l.x2, l.y2]]) {
      ctx.fillStyle = '#dfa94e';
      ctx.beginPath();
      ctx.arc(ex, ey, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = off ? '#46e8ff' : '#ff2a4c';
      ctx.beginPath();
      ctx.arc(ex, ey, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawVaultLoot(ctx, state) {
  ctx.save();
  const loot = state.loot;
  const pulse = 0.5 + 0.5 * Math.sin(state.time * 4.0);

  if (!loot.taken) {
    const glow = ctx.createRadialGradient(loot.x, loot.y, 6, loot.x, loot.y, 74 + pulse * 10);
    glow.addColorStop(0, 'rgba(255, 224, 96, 0.62)');
    glow.addColorStop(0.55, 'rgba(255, 178, 42, 0.22)');
    glow.addColorStop(1, 'rgba(255, 160, 24, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(loot.x, loot.y, 84, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(loot.x, loot.y);
    ctx.rotate(state.time * 0.65);
    ctx.strokeStyle = 'rgba(255, 222, 108, 0.88)';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([8, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, 31, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    ctx.fillStyle = '#281d0a';
    ctx.beginPath();
    ctx.arc(loot.x, loot.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffdf70';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Jewel centerpiece
    ctx.fillStyle = loot.kind === 'crown' ? '#36f49e' : loot.kind === 'scepter' ? '#ff3a60' : '#ffe682';
    ctx.beginPath();
    ctx.moveTo(loot.x, loot.y - 12);
    ctx.lineTo(loot.x + 11, loot.y);
    ctx.lineTo(loot.x, loot.y + 12);
    ctx.lineTo(loot.x - 11, loot.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff9de';
    ctx.beginPath();
    ctx.arc(loot.x, loot.y, 4, 0, Math.PI * 2);
    ctx.fill();

    if (loot.progress > 0) {
      ctx.strokeStyle = '#fff5c8';
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(loot.x, loot.y, 38, -Math.PI * 0.5, -Math.PI * 0.5 + (loot.progress / loot.crackTime) * Math.PI * 2);
      ctx.stroke();
    }

    // Single tasteful gilded plaque under centerpiece relic
    const tag = `${loot.name} · ${formatMoney(loot.value)}`;
    ctx.font = '800 10.5px "Trebuchet MS", sans-serif';
    const pw = Math.ceil(ctx.measureText(tag).width) + 20;
    ctx.fillStyle = 'rgba(22, 16, 8, 0.90)';
    roundRect(ctx, loot.x - pw * 0.5, loot.y + 34, pw, 21, 5);
    ctx.fill();
    ctx.strokeStyle = '#ffd960';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = '#ffec9e';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, loot.x, loot.y + 45);
  } else {
    ctx.fillStyle = 'rgba(26, 20, 14, 0.8)';
    ctx.beginPath();
    ctx.arc(loot.x, loot.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 218, 102, 0.55)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffe078';
    ctx.font = '800 9.5px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VAULT CLEARED', loot.x, loot.y + 34);
  }

  for (const b of state.bonuses) {
    if (b.taken) continue;
    ctx.fillStyle = 'rgba(255, 214, 82, 0.26)';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 21, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd65c';
    ctx.beginPath();
    ctx.moveTo(b.x, b.y - 9);
    ctx.lineTo(b.x + 9, b.y);
    ctx.lineTo(b.x, b.y + 9);
    ctx.lineTo(b.x - 9, b.y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawExitLift(ctx, state) {
  ctx.save();
  const ex = state.exit;
  const open = state.lootSecured;
  const pulse = 0.5 + 0.5 * Math.sin(state.time * 4.4);
  const gr = open ? 54 + pulse * 12 : 34;

  const g = ctx.createRadialGradient(ex.x, ex.y, 6, ex.x, ex.y, gr);
  g.addColorStop(0, open ? 'rgba(42, 245, 158, 0.65)' : 'rgba(42, 214, 144, 0.2)');
  g.addColorStop(1, 'rgba(42, 245, 158, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(ex.x, ex.y, gr, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = open ? '#104430' : '#182b26';
  roundRect(ctx, ex.x - 26, ex.y - 22, 52, 44, 7);
  ctx.fill();
  ctx.strokeStyle = open ? '#42ffaa' : '#cfa24e';
  ctx.lineWidth = open ? 3 : 2;
  ctx.stroke();

  ctx.strokeStyle = open ? '#a0ffd2' : 'rgba(116, 224, 174, 0.45)';
  ctx.lineWidth = 2.5;
  for (let i = -1; i <= 1; i++) {
    const cy = ex.y + i * 8 - (open ? (state.time * 14) % 8 : 0) + 3;
    ctx.beginPath();
    ctx.moveTo(ex.x - 10, cy + 4);
    ctx.lineTo(ex.x, cy - 3);
    ctx.lineTo(ex.x + 10, cy + 4);
    ctx.stroke();
  }

  ctx.fillStyle = open ? '#a8ffd6' : '#8fdcb8';
  ctx.font = '900 9.5px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  const labelY = state.status === 'EXTRACTED' ? ex.y - 30 : ex.y + 34;
  ctx.fillText(state.status === 'EXTRACTED' ? 'EXTRACTED' : open ? 'EXIT READY' : 'EXIT', ex.x, labelY);
  ctx.restore();
}

function drawRouteTrail(ctx, state) {
  if (!state.trail || state.trail.length < 2) return;
  const hi = state.status === 'EXTRACTED';
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 1; i < state.trail.length; i++) {
    const a = state.trail[i - 1];
    const b = state.trail[i];
    if (b.ventJump) {
      ctx.strokeStyle = hi ? 'rgba(84, 248, 228, 0.94)' : 'rgba(84, 248, 228, 0.34)';
      ctx.lineWidth = hi ? 4 : 1.8;
      ctx.setLineDash([6, 6]);
    } else {
      ctx.setLineDash([]);
      ctx.strokeStyle = hi
        ? b.secured ? '#ffe066' : '#4ceeff'
        : b.secured ? 'rgba(255, 220, 102, 0.34)' : 'rgba(92, 232, 246, 0.24)';
      ctx.lineWidth = hi ? 4.6 : 2;
    }
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawGadgetEffects(ctx, state) {
  ctx.save();

  for (const n of state.noiseRings) {
    ctx.strokeStyle = `rgba(248, 214, 138, ${n.alpha})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const e of state.empPulses) {
    const a = Math.max(0, e.timer / e.maxTimer);
    const g = ctx.createRadialGradient(e.x, e.y, Math.max(6, e.radius - 44), e.x, e.y, e.radius + 10);
    g.addColorStop(0, 'rgba(56, 224, 255, 0)');
    g.addColorStop(0.75, `rgba(56, 224, 255, ${0.46 * a})`);
    g.addColorStop(1, 'rgba(180, 252, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius + 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(116, 246, 255, ${0.95 * a})`;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.stroke();
    for (const tgt of e.targets || []) drawSparkBolt(ctx, e.x, e.y, tgt.x, tgt.y, a, state.time, '#8cf8ff');
  }

  for (const d of state.decoys) {
    const r1 = 16 + ((d.phase * 28) % 68);
    const r2 = 16 + (((d.phase + 1.5) * 28) % 68);
    for (const r of [r1, r2]) {
      const al = Math.max(0, 1 - r / 84) * 0.85;
      ctx.strokeStyle = `rgba(255, 214, 92, ${al})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(state.time * 3.6);
    ctx.fillStyle = '#33240a';
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd962';
    ctx.lineWidth = 2.4;
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 9, Math.sin(a) * 9);
      ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14);
      ctx.stroke();
    }
    ctx.restore();
  }

  for (const s of state.smokes) {
    const core = ctx.createRadialGradient(s.x, s.y, s.radius * 0.1, s.x, s.y, s.radius);
    core.addColorStop(0, `rgba(38, 52, 66, ${0.9 * s.alpha})`);
    core.addColorStop(0.62, `rgba(74, 98, 116, ${0.78 * s.alpha})`);
    core.addColorStop(1, 'rgba(32, 46, 58, 0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx.fill();
    const puffs = [[-0.4, -0.24, 0.56], [0.42, -0.2, 0.52], [-0.34, 0.34, 0.54], [0.34, 0.32, 0.56], [0.02, -0.05, 0.62]];
    for (const [ox, oy, sc] of puffs) {
      const px = s.x + ox * s.radius;
      const py = s.y + oy * s.radius;
      const pr = s.radius * sc;
      const g = ctx.createRadialGradient(px - pr * 0.2, py - pr * 0.2, pr * 0.1, px, py, pr);
      g.addColorStop(0, `rgba(218, 234, 244, ${0.65 * s.alpha})`);
      g.addColorStop(0.55, `rgba(114, 146, 166, ${0.6 * s.alpha})`);
      g.addColorStop(1, 'rgba(38, 54, 68, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = `rgba(196, 230, 246, ${0.58 * s.alpha})`;
    ctx.lineWidth = 1.8;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius * 0.88, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const arc of state.loopArcs) {
    drawSparkBolt(ctx, arc.x1, arc.y1, arc.x2, arc.y2, arc.timer / arc.maxTimer, state.time, '#56ffb4');
  }

  if (state.lastSeen) {
    const ls = state.lastSeen;
    ctx.strokeStyle = 'rgba(255, 110, 124, 0.85)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(ls.x, ls.y, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const pt of state.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawSparkBolt(ctx, x1, y1, x2, y2, alpha, time, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = Math.min(1, alpha * 1.1);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  const steps = 6;
  const dist = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = -(y2 - y1) / dist;
  const ny = (x2 - x1) / dist;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const j = Math.sin(time * 24 + i * 3.7) * 10;
    ctx.lineTo(x1 + (x2 - x1) * t + nx * j, y1 + (y2 - y1) * t + ny * j);
  }
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawWallCameras(ctx, state) {
  ctx.save();
  for (const cam of state.cameras) {
    const emp = cam.empTimer > 0;
    const looped = cam.loopTimer > 0;
    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.rotate(cam.angle);
    ctx.fillStyle = '#1b222e';
    ctx.strokeStyle = emp ? '#46e8ff' : looped ? '#42e89d' : '#e2b658';
    ctx.lineWidth = 2;
    roundRect(ctx, -10, -8, 19, 16, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#2d3a4e';
    ctx.fillRect(7, -4.5, 7, 9);
    ctx.fillStyle = emp ? '#46e8ff' : looped ? '#42ffaa' : cam.seeingPlayer ? '#ff2644' : '#ff465e';
    ctx.beginPath();
    ctx.arc(12, 0, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Compact status chip ONLY when actively EMP-stunned or LOOPED!
    if (emp || looped) {
      const txt = emp ? `EMP ${cam.empTimer.toFixed(1)}s` : `LOOP ${cam.loopTimer.toFixed(1)}s`;
      const col = emp ? '#46e8ff' : '#42ffaa';
      ctx.font = '800 9px "Trebuchet MS", sans-serif';
      const w = Math.ceil(ctx.measureText(txt).width) + 12;
      const bx = Math.max(MAP.x + 22, Math.min(MAP.x + MAP.w - w - 22, cam.x - w * 0.5));
      const by = cam.y < MAP.y + 48 ? cam.y + 16 : cam.y - 24;
      ctx.fillStyle = 'rgba(10, 18, 28, 0.92)';
      roundRect(ctx, bx, by, w, 16, 4);
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, bx + w * 0.5, by + 8.5);
    }
  }
  ctx.restore();
}

function drawGuards(ctx, state) {
  ctx.save();
  for (const g of state.guards) {
    const sway = Math.sin(g.stride) * 2;
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.angle);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.46)';
    ctx.beginPath();
    ctx.ellipse(2, 4, 17, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Arms + extended brass lantern hand
    ctx.fillStyle = '#1b222e';
    roundRect(ctx, -2 + sway * 0.5, -16, 13, 6, 3);
    ctx.fill();
    roundRect(ctx, 2, 9, 14, 6, 3);
    ctx.fill();
    ctx.fillStyle = '#e8bf62';
    ctx.fillRect(13, 9.5, 6, 5);
    ctx.fillStyle = g.state === 'ALERT' ? '#ff6278' : '#fff2b0';
    ctx.beginPath();
    ctx.arc(19.5, 12, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // Broad uniformed coat & brass epaulets
    const coat = g.state === 'ALERT' ? '#9e1c30' : g.state === 'INVESTIGATING' || g.state === 'SEARCHING' ? '#a65418' : '#2a3a54';
    ctx.fillStyle = coat;
    roundRect(ctx, -11, -15, 20, 30, 8);
    ctx.fill();
    ctx.strokeStyle = g.state === 'ALERT' ? '#ff7c90' : '#e6be64';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#f2cc6e';
    ctx.fillRect(-4, -14, 7, 4);
    ctx.fillRect(-4, 10, 7, 4);

    // Peaked officer cap
    ctx.fillStyle = '#141a24';
    ctx.beginPath();
    ctx.arc(1, 0, 9.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f2cc70';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = '#ffe07d';
    ctx.beginPath();
    ctx.arc(4.5, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Crisp ! or ? suspicion badge with live % ring when investigating/alerted
    if (g.state !== 'PATROL') {
      const sym = g.state === 'ALERT' ? '!' : '?';
      const col = g.state === 'ALERT' ? '#ff3650' : '#ffb838';
      const bx = g.x + 17;
      const by = g.y - 17;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(bx, by, 9.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff4d6';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#0d0c0a';
      ctx.font = '900 12.5px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sym, bx, by + 0.5);
    }
  }
  ctx.restore();
}

function drawThief(ctx, state) {
  const { player } = state;
  ctx.save();

  // Dynamic footstep sound radius preview when walking openly
  if (player.soundRadius > 10 && state.status === 'PLAYING') {
    ctx.strokeStyle = 'rgba(248, 214, 138, 0.28)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.soundRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Crisp IN COVER shadow ring when tucked in cover
  if (player.inCover) {
    ctx.strokeStyle = player.crouched ? '#48ffe8' : 'rgba(72, 240, 224, 0.45)';
    ctx.lineWidth = player.crouched ? 2.6 : 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Soft contrast glow so thief silhouette is unmistakable at 256px
  const halo = ctx.createRadialGradient(player.x, player.y, 4, player.x, player.y, 28);
  halo.addColorStop(0, player.crouched && player.inCover ? 'rgba(64, 248, 228, 0.34)' : 'rgba(248, 232, 186, 0.32)');
  halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 28, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  const sc = player.crouched ? 0.92 : 1.04;
  ctx.scale(sc, sc);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.ellipse(2, 4, 16, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Flowing dark hooded trenchcoat
  ctx.fillStyle = '#121c30';
  ctx.beginPath();
  ctx.moveTo(-5, -11);
  ctx.lineTo(-17, -8);
  ctx.lineTo(-17, 8);
  ctx.lineTo(-5, 11);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = player.crouched && player.inCover ? '#123e4c' : '#1b2d4d';
  roundRect(ctx, -10, -14, 19, 28, 8);
  ctx.fill();
  ctx.strokeStyle = player.crouched && player.inCover ? '#54ffec' : '#fbf2d8';
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // Golden loot satchel once stolen!
  if (state.lootSecured) {
    ctx.fillStyle = '#ffd95e';
    roundRect(ctx, -12, 7, 11, 8, 2);
    ctx.fill();
    ctx.strokeStyle = '#fff5cc';
    ctx.lineWidth = 1.3;
    ctx.stroke();
  }

  // Hood / wide-brim fedora + luminous cyan goggles
  ctx.fillStyle = '#0d1422';
  ctx.beginPath();
  ctx.ellipse(1, 0, 10.5, 9.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e8bf66';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = '#62f5ff';
  ctx.beginPath();
  ctx.arc(8.5, -3.2, 2.5, 0, Math.PI * 2);
  ctx.arc(8.5, 3.2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (player.crouched && player.inCover && state.exposure < 0.08 && state.status === 'PLAYING') {
    ctx.fillStyle = 'rgba(10, 32, 40, 0.92)';
    roundRect(ctx, player.x - 32, player.y + 19, 64, 16, 4);
    ctx.fill();
    ctx.strokeStyle = '#48ffe8';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.fillStyle = '#9efffa';
    ctx.font = '800 9px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('IN COVER', player.x, player.y + 27.5);
  }
  ctx.restore();
}

function drawDetectionAndCaughtSightline(ctx, state) {
  const { player } = state;
  const spotter = state.status === 'CAUGHT' ? state.caughtSpotter : state.spottedBy;

  if (state.status === 'CAUGHT' && spotter) {
    // FAIR CAUGHT CRIMSON SIGHTLINE TRACE directly from spotter -> thief!
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 38, 68, 0.34)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(spotter.x, spotter.y);
    ctx.lineTo(player.x, player.y);
    ctx.stroke();

    ctx.strokeStyle = '#ff3856';
    ctx.lineWidth = 3;
    ctx.setLineDash([9, 5]);
    ctx.beginPath();
    ctx.moveTo(spotter.x, spotter.y);
    ctx.lineTo(player.x, player.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Crimson lock-on reticle around thief
    ctx.strokeStyle = '#ff3856';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 29, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ffe29a';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) * 0.5;
      ctx.beginPath();
      ctx.moveTo(player.x + Math.cos(a) * 22, player.y + Math.sin(a) * 22);
      ctx.lineTo(player.x + Math.cos(a) * 36, player.y + Math.sin(a) * 36);
      ctx.stroke();
    }

    // Spotter origin pulse
    ctx.strokeStyle = '#ff445e';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(spotter.x, spotter.y, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (state.exposure > 0.05 && state.status === 'PLAYING') {
    const rem = Math.max(0.1, (1 - state.exposure) * CAUGHT_GRACE_SEC);
    ctx.save();
    if (spotter) {
      ctx.strokeStyle = 'rgba(255, 68, 92, 0.85)';
      ctx.lineWidth = 2.2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(spotter.x, spotter.y);
      ctx.lineTo(player.x, player.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.strokeStyle = 'rgba(255, 214, 102, 0.34)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 32, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = state.exposure > 0.65 ? '#ff2c48' : '#ffb438';
    ctx.lineWidth = 6.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(player.x, player.y, 32, -Math.PI * 0.5, -Math.PI * 0.5 + state.exposure * Math.PI * 2);
    ctx.stroke();

    const msg = `SPOTTED ${rem.toFixed(1)}s · [3] SMOKE!`;
    ctx.font = '900 11.5px "Trebuchet MS", sans-serif';
    const bw = Math.ceil(ctx.measureText(msg).width) + 22;
    const bx = Math.max(MAP.x + 24, Math.min(MAP.x + MAP.w - bw - 24, player.x - bw * 0.5));
    const by = Math.max(MAP.y + 24, player.y - 62);
    ctx.fillStyle = 'rgba(42, 10, 16, 0.96)';
    roundRect(ctx, bx, by, bw, 25, 5);
    ctx.fill();
    ctx.strokeStyle = '#ff445e';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffedc2';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(msg, bx + bw * 0.5, by + 13);
    ctx.restore();
  }
}

function drawGuardBarks(ctx, state) {
  if (state.status === 'EXTRACTED') return;
  ctx.save();
  ctx.font = '700 10.5px "Trebuchet MS", sans-serif';
  for (const g of state.guards) {
    if (!g.bark || g.barkTimer <= 0) continue;
    const text = `"${g.bark}"`;
    const tw = Math.ceil(ctx.measureText(text).width) + 18;
    const bx = Math.max(MAP.x + 22, Math.min(MAP.x + MAP.w - tw - 22, g.x - tw * 0.5));
    const by = Math.max(MAP.y + 22, g.y - 42);
    ctx.fillStyle = 'rgba(20, 15, 12, 0.92)';
    roundRect(ctx, bx, by, tw, 20, 5);
    ctx.fill();
    ctx.strokeStyle = g.state === 'ALERT' ? '#ff5e74' : g.state === 'INVESTIGATING' ? '#f6c44e' : '#e4d2ad';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = '#fbf3de';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + tw * 0.5, by + 10.5);
  }
  ctx.restore();
}

function drawWorldPrompt(ctx, state) {
  ctx.save();
  if (state.nearPrompt && state.status === 'PLAYING') {
    const p = state.nearPrompt;
    ctx.font = '800 10.5px "Trebuchet MS", sans-serif';
    const w = Math.ceil(ctx.measureText(p.text).width) + 20;
    const x = Math.max(MAP.x + 22, Math.min(MAP.x + MAP.w - w - 22, p.x - w * 0.5));
    const y = Math.max(MAP.y + 22, p.y - 10);
    ctx.fillStyle = 'rgba(22, 16, 10, 0.94)';
    roundRect(ctx, x, y, w, 21, 5);
    ctx.fill();
    ctx.strokeStyle = '#ffd85e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#fff2c2';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.text, x + w * 0.5, y + 11);
  }
  if (state.flashBanner && state.status === 'PLAYING') {
    const b = state.flashBanner;
    ctx.font = '800 11.5px "Trebuchet MS", sans-serif';
    const w = Math.ceil(ctx.measureText(b.text).width) + 26;
    const x = MAP.x + (MAP.w - w) * 0.5;
    const y = MAP.y + 24;
    ctx.fillStyle = 'rgba(20, 14, 10, 0.92)';
    roundRect(ctx, x, y, w, 24, 5);
    ctx.fill();
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = b.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.text, MAP.x + MAP.w * 0.5, y + 12.5);
  }
  ctx.restore();
}
