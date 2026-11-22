// Lush 2.5D extruded architectural renderer with articulated characters, props, and atmospheric FX.

import { ARENA, WORLD_H, WORLD_W } from './vaults.js';
import { getThemePalette, getVaultFloorCanvas } from './textures.js';
import { drawVolumetricCone } from './lighting.js';
import { CAUGHT_GRACE_SECONDS } from './guards.js';
import { drawCaughtCard, drawGetawayCard, drawHud, formatMoney, roundRectPath } from './hud.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
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
  }

  function screenToWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - offsetX) / scale,
      y: (clientY - rect.top - offsetY) / scale,
    };
  }

  function render(state, audioMuted = false) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;
    const palette = getThemePalette(state.vault.theme);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, cssW, cssH);

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // 1. Cached rich architectural floor + optional animated Spire recessed clockwork cogs
    ctx.drawImage(getVaultFloorCanvas(state.vault), 0, 0);
    if (state.vault.theme === 'spire') drawSpireClockworkCogs(ctx, state.time);

    // 2. Embedded floor conduits (Relay -> Laser) + vent duct inlay + subtle guard patrol inlay
    drawFloorConduitsAndVents(ctx, state, palette);
    drawSubtlePatrolInlay(ctx, state);

    // 3. Volumetric raycast vision cones (under 2.5D walls & props so walls cleanly occlude!)
    drawAllVisionCones(ctx, state);

    // 4. Real 2.5D extruded architectural walls & luxury museum/vault furniture
    draw25DWalls(ctx, state, palette);
    draw25DProps(ctx, state, palette);

    // 5. Laser gates, brass relays, extraction lift, and centerpiece loot vault
    drawLasersAndRelays(ctx, state);
    drawExitLift(ctx, state);
    drawVaultLoot(ctx, state);

    // 6. Real getaway route trail
    drawTrail(ctx, state);

    // 7. Articulated 2x characters (guards, wall CCTV turrets, thief)
    drawWallCameras(ctx, state);
    drawArticulatedGuards(ctx, state, palette);
    drawArticulatedThief(ctx, state);

    // 8. Volumetric smoke, EMP shockwaves + lightning arcs, decoys, particles, lock-on ring
    drawGadgetEffects(ctx, state);
    drawCaughtLockOn(ctx, state);
    drawGuardBarks(ctx, state);
    drawPromptAndBanner(ctx, state);

    // 9. Atmospheric gallery vignette
    drawAtmosphereVignette(ctx, palette);

    // 10. Sleek compact HUD + debrief overlays
    drawHud(ctx, state, audioMuted);
    if (state.status === 'EXTRACTED') drawGetawayCard(ctx, state);
    if (state.status === 'CAUGHT') drawCaughtCard(ctx, state);

    ctx.restore();
  }

  resize();
  return { resize, screenToWorld, render };
}

function drawSpireClockworkCogs(ctx, time) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(ARENA.x + 16, ARENA.y + 16, ARENA.w - 32, ARENA.h - 32);
  ctx.clip();
  const cogs = [
    { x: 400, y: 358, r: 148, teeth: 18, speed: 0.14, col: 'rgba(148, 214, 255, 0.24)' },
    { x: 696, y: 358, r: 178, teeth: 22, speed: -0.11, col: 'rgba(236, 198, 108, 0.22)' },
    { x: 1096, y: 358, r: 158, teeth: 20, speed: 0.13, col: 'rgba(154, 224, 255, 0.25)' },
  ];
  for (const c of cogs) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(time * c.speed);
    ctx.strokeStyle = c.col;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, c.r, 0, Math.PI * 2);
    ctx.arc(0, 0, c.r * 0.56, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < c.teeth; i++) {
      const a = (i / c.teeth) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * c.r, Math.sin(a) * c.r);
      ctx.lineTo(Math.cos(a) * (c.r + 14), Math.sin(a) * (c.r + 14));
      ctx.stroke();
      if (i % 3 === 0) {
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (c.r * 0.18), Math.sin(a) * (c.r * 0.18));
        ctx.lineTo(Math.cos(a) * (c.r * 0.56), Math.sin(a) * (c.r * 0.56));
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawFloorConduitsAndVents(ctx, state, palette) {
  ctx.save();

  // Floor-embedded glowing copper/crimson power conduits visibly wiring each Relay -> Laser Gate
  for (const r of state.relays) {
    const pts = r.conduit;
    if (!pts || pts.length < 2) continue;
    const anyEmp = r.targetLaserIds.some((id) => (state.lasers.find((l) => l.id === id)?.empTimer ?? 0) > 0);
    const active = !r.hacked && !anyEmp;

    // Carved floor channel groove
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(4, 8, 14, 0.72)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();

    // Glowing embedded power wire
    ctx.strokeStyle = r.hacked ? 'rgba(60, 240, 162, 0.65)' : anyEmp ? 'rgba(56, 235, 255, 0.78)' : 'rgba(255, 76, 98, 0.76)';
    ctx.lineWidth = 2.6;
    ctx.stroke();

    // Animated energy pulse traveling from Relay -> Laser
    if (active) {
      ctx.strokeStyle = '#ffbf96';
      ctx.lineWidth = 2.4;
      ctx.setLineDash([10, 26]);
      ctx.lineDashOffset = -state.time * 48;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Paired brass ventilation grates & subtle under-floor duct dashed guide
  const drawn = new Set();
  for (const v of state.vents) {
    const key = [v.id, v.pairId].sort().join(':');
    if (!drawn.has(key)) {
      drawn.add(key);
      const o = state.vents.find((x) => x.id === v.pairId);
      if (o) {
        const ductY = v.y < 300 ? ARENA.y + 26 : ARENA.y + ARENA.h - 26;
        ctx.strokeStyle = 'rgba(72, 224, 214, 0.28)';
        ctx.lineWidth = 2.2;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.moveTo(v.x, v.y);
        ctx.lineTo(v.x, ductY);
        ctx.lineTo(o.x, ductY);
        ctx.lineTo(o.x, o.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Recessed brushed-brass floor vent grate
    ctx.fillStyle = '#0c151c';
    roundRectPath(ctx, v.x - 19, v.y - 19, 38, 38, 5);
    ctx.fill();
    ctx.strokeStyle = palette.wallTrim;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.strokeStyle = '#6fe6dd';
    ctx.lineWidth = 2;
    for (let bar = -10; bar <= 10; bar += 5) {
      ctx.beginPath();
      ctx.moveTo(v.x - 11, v.y + bar);
      ctx.lineTo(v.x + 11, v.y + bar);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawSubtlePatrolInlay(ctx, state) {
  ctx.save();
  ctx.strokeStyle = 'rgba(240, 198, 108, 0.14)';
  ctx.lineWidth = 1.6;
  ctx.setLineDash([5, 9]);
  for (const g of state.guards) {
    if (!g.waypoints || g.waypoints.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(g.waypoints[0].x, g.waypoints[0].y);
    for (let i = 1; i < g.waypoints.length; i++) ctx.lineTo(g.waypoints[i].x, g.waypoints[i].y);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
}

function drawAllVisionCones(ctx, state) {
  // Wall CCTV cyan/crimson volumetric cones
  for (const cam of state.cameras) {
    ctx.save();
    ctx.strokeStyle = cam.offlineTimer > 0 ? 'rgba(56, 235, 255, 0.18)' : 'rgba(72, 224, 255, 0.18)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, cam.range * 0.94, cam.baseAngle - cam.sweep - cam.halfFov, cam.baseAngle + cam.sweep + cam.halfFov);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    if (cam.offlineTimer <= 0 && cam.conePoly.length > 2) {
      const alert = cam.seeingPlayer || cam.alertLevel > 0.35;
      drawVolumetricCone(
        ctx,
        cam.x,
        cam.y,
        cam.angle,
        cam.range,
        cam.conePoly,
        alert
          ? {
              near: 'rgba(255, 52, 78, 0.56)',
              mid: 'rgba(255, 42, 72, 0.30)',
              far: 'rgba(255, 42, 72, 0.08)',
              core: 'rgba(255, 190, 200, 0.26)',
              pulse: 'rgba(255, 120, 140, 0.35)',
              rim: 'rgba(255, 102, 122, 0.92)',
            }
          : {
              near: 'rgba(48, 228, 255, 0.44)',
              mid: 'rgba(38, 192, 240, 0.22)',
              far: 'rgba(32, 162, 224, 0.06)',
              core: 'rgba(190, 250, 255, 0.24)',
              pulse: 'rgba(110, 242, 255, 0.28)',
              rim: 'rgba(92, 238, 255, 0.78)',
            },
        state.time,
      );
    }
  }

  // Guard volumetric flashlight cones
  for (const g of state.guards) {
    if (!g.conePoly || g.conePoly.length < 3) continue;
    const ox = g.x + Math.cos(g.angle) * 14;
    const oy = g.y + Math.sin(g.angle) * 14;
    let pal;
    if (g.state === 'ALERT') {
      pal = {
        near: 'rgba(255, 42, 68, 0.64)',
        mid: 'rgba(255, 56, 76, 0.36)',
        far: 'rgba(255, 42, 68, 0.10)',
        core: 'rgba(255, 200, 204, 0.32)',
        pulse: 'rgba(255, 110, 124, 0.36)',
        rim: 'rgba(255, 96, 114, 0.95)',
      };
    } else if (g.state === 'SUSPICIOUS' || g.state === 'DISTRACTED' || g.state === 'SEARCH') {
      pal = {
        near: 'rgba(255, 134, 38, 0.58)',
        mid: 'rgba(255, 148, 48, 0.32)',
        far: 'rgba(255, 126, 36, 0.09)',
        core: 'rgba(255, 228, 172, 0.28)',
        pulse: 'rgba(255, 184, 92, 0.30)',
        rim: 'rgba(255, 182, 82, 0.92)',
      };
    } else {
      pal = {
        near: 'rgba(255, 204, 78, 0.56)',
        mid: 'rgba(255, 184, 54, 0.28)',
        far: 'rgba(255, 168, 38, 0.08)',
        core: 'rgba(255, 246, 204, 0.28)',
        pulse: 'rgba(255, 224, 130, 0.24)',
        rim: 'rgba(255, 218, 112, 0.86)',
      };
    }
    drawVolumetricCone(ctx, ox, oy, g.angle, g.range, g.conePoly, pal, state.time);
  }
}

function draw25DWalls(ctx, state, palette) {
  ctx.save();
  const depth = 11;

  // Soft floor drop shadows cast by interior walls
  ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
  for (const w of state.walls) {
    if (!w.perimeter) ctx.fillRect(w.x + 6, w.y + 10, w.w, w.h + 4);
  }

  // 2.5D vertical architectural facade + beveled stone/brass cornice top
  for (const w of state.walls) {
    if (!w.perimeter) {
      // Extruded vertical wall front face
      ctx.fillStyle = palette.wallSide;
      ctx.fillRect(w.x, w.y + 4, w.w, w.h + depth - 4);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.lineWidth = 1;
      ctx.strokeRect(w.x, w.y + 4, w.w, w.h + depth - 4);
    }

    // Beveled top cap shifted up for crisp 2.5D depth
    const topY = w.perimeter ? w.y : w.y - 3;
    const topH = w.perimeter ? w.h : w.h;
    const grad = ctx.createLinearGradient(w.x, topY, w.x + w.w, topY + topH);
    grad.addColorStop(0, palette.wallTop);
    grad.addColorStop(1, palette.wallSide);
    ctx.fillStyle = grad;
    ctx.fillRect(w.x, topY, w.w, topH);

    // Antique brass cornice trim
    ctx.strokeStyle = palette.wallTrim;
    ctx.lineWidth = w.perimeter ? 2.4 : 1.9;
    ctx.strokeRect(w.x + 1, topY + 1, w.w - 2, topH - 2);

    // Subtle specular top lip
    ctx.strokeStyle = 'rgba(255, 240, 198, 0.34)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w.x + 2, topY + 2.5);
    ctx.lineTo(w.x + w.w - 2, topY + 2.5);
    ctx.stroke();
  }

  // Art-Deco corner brass finials on outer frame
  ctx.strokeStyle = palette.wallHighlight;
  ctx.lineWidth = 2.6;
  const corners = [
    [ARENA.x - 3, ARENA.y - 3, 1, 1],
    [ARENA.x + ARENA.w + 3, ARENA.y - 3, -1, 1],
    [ARENA.x - 3, ARENA.y + ARENA.h + 3, 1, -1],
    [ARENA.x + ARENA.w + 3, ARENA.y + ARENA.h + 3, -1, -1],
  ];
  for (const [cx, cy, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx + sx * 24, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + sy * 24);
    ctx.stroke();
  }
  ctx.restore();
}

function draw25DProps(ctx, state, palette) {
  ctx.save();
  for (const p of state.props) {
    const isActiveCover = state.player.coverProp === p && state.player.inCover;

    // Subtle stealth cover halo ONLY on the single prop the thief is hugging right now!
    if (isActiveCover) {
      ctx.save();
      ctx.strokeStyle = state.player.crouched ? 'rgba(64, 248, 224, 0.85)' : 'rgba(64, 248, 224, 0.38)';
      ctx.lineWidth = state.player.crouched ? 2.4 : 1.4;
      ctx.setLineDash([6, 5]);
      roundRectPath(ctx, p.x - 14, p.y - 14, p.w + 28, p.h + 28, 10);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    if (p.kind === 'column') drawFlutedColumn(ctx, p, palette);
    else if (p.kind === 'planter') drawBotanicalPlanter(ctx, p, palette);
    else if (p.kind === 'desk') drawTreasuryDesk(ctx, p, palette);
    else if (p.kind === 'plinth') drawSculpturePlinth(ctx, p, palette);
    else drawDisplayCase(ctx, p, palette, state.time);
  }
  ctx.restore();
}

function drawDisplayCase(ctx, p, palette, time) {
  // Soft floor drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  roundRectPath(ctx, p.x + 5, p.y + 9, p.w, p.h + 4, 5);
  ctx.fill();

  // 2.5D Mahogany wood base extrusion
  ctx.fillStyle = '#331710';
  roundRectPath(ctx, p.x, p.y + 4, p.w, p.h + 4, 4);
  ctx.fill();

  // Mahogany frame top
  const wood = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
  wood.addColorStop(0, '#6a3020');
  wood.addColorStop(1, '#3e1a12');
  ctx.fillStyle = wood;
  roundRectPath(ctx, p.x, p.y - 2, p.w, p.h, 4);
  ctx.fill();
  ctx.strokeStyle = palette.wallTrim;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Recessed illuminated museum velvet interior
  const ix = p.x + 7;
  const iy = p.y + 4;
  const iw = p.w - 14;
  const ih = p.h - 12;
  ctx.fillStyle = '#1d1226';
  ctx.fillRect(ix, iy, iw, ih);

  // Illuminated miniature museum relic under glass
  const cx = ix + iw * 0.5;
  const cy = iy + ih * 0.5;
  const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, Math.min(iw, ih) * 0.72);
  glow.addColorStop(0, 'rgba(255, 224, 126, 0.36)');
  glow.addColorStop(1, 'rgba(255, 200, 90, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(ix, iy, iw, ih);

  if (p.artifact === 'gem') {
    ctx.fillStyle = '#5cf0d8';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx + 9, cy);
    ctx.lineTo(cx, cy + 8);
    ctx.lineTo(cx - 9, cy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d4fffa';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else if (p.artifact === 'scroll') {
    ctx.fillStyle = '#e8d5a2';
    ctx.fillRect(cx - 14, cy - 5, 28, 10);
    ctx.fillStyle = '#c89238';
    ctx.fillRect(cx - 16, cy - 6, 4, 12);
    ctx.fillRect(cx + 12, cy - 6, 4, 12);
  } else {
    ctx.strokeStyle = '#ffd96a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fff0b2';
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Diagonal specular glass sheen across display canopy
  ctx.save();
  ctx.beginPath();
  ctx.rect(ix, iy, iw, ih);
  ctx.clip();
  const shimmer = Math.sin(time * 0.8 + p.x * 0.02) * 4;
  ctx.fillStyle = 'rgba(205, 238, 255, 0.16)';
  ctx.beginPath();
  ctx.moveTo(ix + 10 + shimmer, iy);
  ctx.lineTo(ix + 24 + shimmer, iy);
  ctx.lineTo(ix + 8 + shimmer, iy + ih);
  ctx.lineTo(ix - 6 + shimmer, iy + ih);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = 'rgba(180, 232, 255, 0.45)';
  ctx.lineWidth = 1;
  ctx.strokeRect(ix, iy, iw, ih);
}

function drawFlutedColumn(ctx, p, palette) {
  const cx = p.x + p.w * 0.5;
  const cy = p.y + p.h * 0.5;
  const r = Math.min(p.w, p.h) * 0.5;

  // Cast shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.54)';
  ctx.beginPath();
  ctx.ellipse(cx + 7, cy + 10, r + 2, r + 1, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2.5D cylindrical shaft
  ctx.fillStyle = palette.wallSide;
  ctx.beginPath();
  ctx.arc(cx, cy + 5, r, 0, Math.PI * 2);
  ctx.fill();

  // Marble fluted capital top
  const cap = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, 3, cx, cy - 2, r);
  cap.addColorStop(0, '#dfe6f2');
  cap.addColorStop(0.55, '#8a99b2');
  cap.addColorStop(1, '#3d4c66');
  ctx.fillStyle = cap;
  ctx.beginPath();
  ctx.arc(cx, cy - 2, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = palette.wallTrim;
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // Fluted ribs
  ctx.strokeStyle = 'rgba(20, 30, 46, 0.45)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r * 0.45), cy - 2 + Math.sin(a) * (r * 0.45));
    ctx.lineTo(cx + Math.cos(a) * (r * 0.92), cy - 2 + Math.sin(a) * (r * 0.92));
    ctx.stroke();
  }
  ctx.fillStyle = palette.wallTrim;
  ctx.beginPath();
  ctx.arc(cx, cy - 2, r * 0.34, 0, Math.PI * 2);
  ctx.fill();
}

function drawBotanicalPlanter(ctx, p, palette) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
  roundRectPath(ctx, p.x + 5, p.y + 9, p.w, p.h + 4, 6);
  ctx.fill();

  // Carved marble planter trough
  ctx.fillStyle = '#18342b';
  roundRectPath(ctx, p.x, p.y + 3, p.w, p.h + 4, 5);
  ctx.fill();
  ctx.fillStyle = '#2b5546';
  roundRectPath(ctx, p.x, p.y - 2, p.w, p.h, 5);
  ctx.fill();
  ctx.strokeStyle = palette.wallTrim;
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Rich soil interior
  ctx.fillStyle = '#172318';
  roundRectPath(ctx, p.x + 6, p.y + 4, p.w - 12, p.h - 12, 3);
  ctx.fill();

  // Layered botanical fern fronds & golden blossoms
  const clusters = p.w > p.h
    ? [[p.x + p.w * 0.3, p.y + p.h * 0.45], [p.x + p.w * 0.7, p.y + p.h * 0.48]]
    : [[p.x + p.w * 0.5, p.y + p.h * 0.3], [p.x + p.w * 0.5, p.y + p.h * 0.68]];
  for (const [fx, fy] of clusters) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.3;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(a);
      ctx.fillStyle = i % 2 === 0 ? '#2fa86e' : '#1d7e52';
      ctx.beginPath();
      ctx.ellipse(10, 0, 12, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#f8d876';
    ctx.beginPath();
    ctx.arc(fx, fy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTreasuryDesk(ctx, p, palette) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  roundRectPath(ctx, p.x + 5, p.y + 9, p.w, p.h + 4, 4);
  ctx.fill();

  ctx.fillStyle = '#2c1512';
  roundRectPath(ctx, p.x, p.y + 4, p.w, p.h + 4, 4);
  ctx.fill();
  ctx.fillStyle = '#5c2a1e';
  roundRectPath(ctx, p.x, p.y - 2, p.w, p.h, 4);
  ctx.fill();
  ctx.strokeStyle = palette.wallTrim;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Emerald banker blotter
  ctx.fillStyle = '#154d38';
  ctx.fillRect(p.x + 12, p.y + 5, p.w * 0.48, p.h - 14);
  ctx.strokeStyle = '#d9b25a';
  ctx.lineWidth = 1;
  ctx.strokeRect(p.x + 12, p.y + 5, p.w * 0.48, p.h - 14);

  // Stacked gold ingots + miniature banker lamp glow
  const lx = p.x + p.w - 18;
  const ly = p.y + p.h * 0.45;
  const g = ctx.createRadialGradient(lx, ly, 2, lx, ly, 22);
  g.addColorStop(0, 'rgba(255, 222, 122, 0.55)');
  g.addColorStop(1, 'rgba(255, 200, 90, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(lx, ly, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#38d288';
  roundRectPath(ctx, lx - 8, ly - 5, 14, 9, 2);
  ctx.fill();
  ctx.strokeStyle = '#f2cc6c';
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

function drawSculpturePlinth(ctx, p, palette) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
  roundRectPath(ctx, p.x + 5, p.y + 9, p.w, p.h + 4, 5);
  ctx.fill();
  ctx.fillStyle = palette.wallSide;
  roundRectPath(ctx, p.x, p.y + 4, p.w, p.h + 4, 5);
  ctx.fill();
  ctx.fillStyle = '#2d1c2e';
  roundRectPath(ctx, p.x, p.y - 2, p.w, p.h, 5);
  ctx.fill();
  ctx.strokeStyle = palette.wallTrim;
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Gilded astrolabe sculpture top
  const cx = p.x + p.w * 0.5;
  const cy = p.y + p.h * 0.5 - 2;
  const r = Math.min(p.w, p.h) * 0.3;
  ctx.strokeStyle = '#f2cc70';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, cy, r, r * 0.42, 0.6, 0, Math.PI * 2);
  ctx.stroke();
}

function drawLasersAndRelays(ctx, state) {
  ctx.save();

  // Relays (brass switchboard boxes)
  for (const r of state.relays) {
    const col = r.hacked ? '#3cf0a2' : '#ff4d6a';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    roundRectPath(ctx, r.x - 20, r.y - 10, 44, 28, 5);
    ctx.fill();
    ctx.fillStyle = '#182230';
    roundRectPath(ctx, r.x - 21, r.y - 14, 42, 28, 5);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Glowing dual indicator bulbs
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(r.x - 8, r.y, 4, 0, Math.PI * 2);
    ctx.arc(r.x + 8, r.y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(8, 16, 26, 0.9)';
    roundRectPath(ctx, r.x - 32, r.y + 18, 64, 16, 4);
    ctx.fill();
    ctx.fillStyle = r.hacked ? '#7effc4' : '#ffd2d9';
    ctx.font = '800 9.5px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(r.hacked ? 'RELAY CUT' : 'RELAY', r.x, r.y + 26.5);
  }

  // Crackling Crimson Laser Gates
  for (const l of state.lasers) {
    const off = l.disabled || l.empTimer > 0;
    const mx = (l.x1 + l.x2) * 0.5;
    const my = (l.y1 + l.y2) * 0.5;

    if (!off) {
      const flick = 0.82 + 0.18 * Math.sin(state.time * 26);
      ctx.strokeStyle = `rgba(255, 36, 70, ${0.38 * flick})`;
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();

      ctx.strokeStyle = '#ff3254';
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.moveTo(l.x1 - 3.5, l.y1);
      ctx.lineTo(l.x2 - 3.5, l.y2);
      ctx.moveTo(l.x1 + 3.5, l.y1);
      ctx.lineTo(l.x2 + 3.5, l.y2);
      ctx.stroke();

      ctx.strokeStyle = '#ffe5e9';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = l.empTimer > 0 ? 'rgba(64, 236, 255, 0.55)' : 'rgba(60, 240, 162, 0.42)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 7]);
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
      ctx.setLineDash([]);

      const tag = l.empTimer > 0 ? `EMP ${l.empTimer.toFixed(1)}s` : 'LASER CUT';
      ctx.fillStyle = 'rgba(7, 22, 34, 0.92)';
      roundRectPath(ctx, mx - 42, my - 10, 84, 20, 5);
      ctx.fill();
      ctx.strokeStyle = l.empTimer > 0 ? '#46ecff' : '#3cf0a2';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = l.empTimer > 0 ? '#9ef8ff' : '#8affca';
      ctx.font = '800 10px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tag, mx, my + 0.5);
    }

    for (const [ex, ey] of [[l.x1, l.y1], [l.x2, l.y2]]) {
      ctx.fillStyle = '#d8aa4e';
      ctx.beginPath();
      ctx.arc(ex, ey, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = off ? '#46ecff' : '#ff2e50';
      ctx.beginPath();
      ctx.arc(ex, ey, 3.6, 0, Math.PI * 2);
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
    // Pulsing radial golden floor spotlight
    const glow = ctx.createRadialGradient(loot.x, loot.y, 8, loot.x, loot.y, 82 + pulse * 12);
    glow.addColorStop(0, 'rgba(255, 224, 96, 0.62)');
    glow.addColorStop(0.5, 'rgba(255, 178, 42, 0.24)');
    glow.addColorStop(1, 'rgba(255, 160, 24, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(loot.x, loot.y, 92, 0, Math.PI * 2);
    ctx.fill();

    // Rotating multi-ring gilded glass display showcase
    ctx.save();
    ctx.translate(loot.x, loot.y);
    ctx.rotate(state.time * 0.65);
    ctx.strokeStyle = 'rgba(255, 222, 108, 0.85)';
    ctx.lineWidth = 2.4;
    ctx.setLineDash([9, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.rotate(-state.time * 1.15);
    ctx.strokeStyle = 'rgba(130, 238, 255, 0.52)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 7]);
    ctx.beginPath();
    ctx.arc(0, 0, 29, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Pedestal base
    ctx.fillStyle = '#251a08';
    ctx.beginPath();
    ctx.arc(loot.x, loot.y, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffdf70';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Bespoke centerpiece relic per vault
    drawRelicArt(ctx, loot.kind, loot.x, loot.y, state.time);

    // Interactive rotary safe-lock breach progress ring
    if (loot.progress > 0) {
      ctx.strokeStyle = '#fff5c8';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(loot.x, loot.y, 42, -Math.PI * 0.5, -Math.PI * 0.5 + (loot.progress / loot.crackTime) * Math.PI * 2);
      ctx.stroke();
    }

    // Crisp gilded nameplate
    const tag = `${loot.name} · ${formatMoney(loot.value)}`;
    ctx.font = '800 11px "Trebuchet MS", sans-serif';
    const pw = Math.ceil(ctx.measureText(tag).width) + 24;
    ctx.fillStyle = 'rgba(18, 14, 7, 0.90)';
    roundRectPath(ctx, loot.x - pw * 0.5, loot.y + 39, pw, 22, 5);
    ctx.fill();
    ctx.strokeStyle = '#ffd960';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = '#ffeb9e';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, loot.x, loot.y + 50.5);
  } else {
    ctx.fillStyle = 'rgba(18, 26, 38, 0.78)';
    ctx.beginPath();
    ctx.arc(loot.x, loot.y, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 218, 102, 0.5)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffe078';
    ctx.font = '800 10.5px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STOLEN ✓', loot.x, loot.y + 36);
  }

  // Optional bonus relics
  for (const b of state.bonuses) {
    if (b.taken) continue;
    ctx.fillStyle = 'rgba(255, 214, 82, 0.25)';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd65c';
    ctx.beginPath();
    ctx.moveTo(b.x, b.y - 10);
    ctx.lineTo(b.x + 10, b.y);
    ctx.lineTo(b.x, b.y + 10);
    ctx.lineTo(b.x - 10, b.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffefa8';
    ctx.font = '800 10px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`+${formatMoney(b.value)}`, b.x, b.y + 23);
  }
  ctx.restore();
}

function drawRelicArt(ctx, kind, x, y, time) {
  ctx.save();
  ctx.translate(x, y);
  if (kind === 'crown') {
    ctx.fillStyle = '#2cf09b';
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(10, -2);
    ctx.lineTo(0, 11);
    ctx.lineTo(-10, -2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffe278';
    ctx.lineWidth = 2.4;
    ctx.stroke();
  } else if (kind === 'scepter') {
    ctx.fillStyle = '#ff385e';
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffe078';
    ctx.lineWidth = 2.6;
    ctx.stroke();
    ctx.fillStyle = '#ffd2dc';
    ctx.beginPath();
    ctx.arc(-3, -3, 3.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'orrery') {
    ctx.strokeStyle = '#92e8ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffe588';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    const ox = Math.cos(time * 2.2) * 14;
    const oy = Math.sin(time * 2.2) * 14;
    ctx.fillStyle = '#62e8ff';
    ctx.beginPath();
    ctx.arc(ox, oy, 3.6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Astral Chronometer
    ctx.fillStyle = '#ffe480';
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(13, 0);
    ctx.lineTo(0, 14);
    ctx.lineTo(-13, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff9da';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawExitLift(ctx, state) {
  ctx.save();
  const ex = state.exit;
  const open = state.lootSecured;
  const pulse = 0.5 + 0.5 * Math.sin(state.time * 4.4);
  const glowR = open ? 64 + pulse * 14 : 38;

  const g = ctx.createRadialGradient(ex.x, ex.y, 6, ex.x, ex.y, glowR);
  g.addColorStop(0, open ? 'rgba(42, 245, 158, 0.65)' : 'rgba(42, 214, 144, 0.22)');
  g.addColorStop(1, 'rgba(42, 245, 158, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(ex.x, ex.y, glowR, 0, Math.PI * 2);
  ctx.fill();

  // Art-Deco recessed brass elevator platform
  ctx.fillStyle = open ? '#0c3e2c' : '#122328';
  roundRectPath(ctx, ex.x - 30, ex.y - 26, 60, 52, 8);
  ctx.fill();
  ctx.strokeStyle = open ? '#3aff9f' : '#c9a050';
  ctx.lineWidth = open ? 3 : 2;
  ctx.stroke();

  ctx.strokeStyle = open ? '#98ffce' : 'rgba(104, 218, 168, 0.45)';
  ctx.lineWidth = 2.8;
  for (let i = -1; i <= 1; i++) {
    const cy = ex.y + i * 9 - (open ? (state.time * 15) % 9 : 0) + 4;
    ctx.beginPath();
    ctx.moveTo(ex.x - 11, cy + 4);
    ctx.lineTo(ex.x, cy - 3);
    ctx.lineTo(ex.x + 11, cy + 4);
    ctx.stroke();
  }

  const label = open ? 'EXIT LIFT · READY' : 'EXIT LIFT';
  const bw = open ? 124 : 74;
  const bx = Math.max(ARENA.x + 22, Math.min(ARENA.x + ARENA.w - bw - 22, ex.x - bw * 0.5));
  ctx.fillStyle = open ? 'rgba(7, 36, 25, 0.94)' : 'rgba(10, 18, 28, 0.86)';
  roundRectPath(ctx, bx, ex.y + 30, bw, 22, 5);
  ctx.fill();
  ctx.strokeStyle = open ? '#3aff9f' : 'rgba(92, 220, 164, 0.5)';
  ctx.lineWidth = open ? 2 : 1.2;
  ctx.stroke();
  ctx.fillStyle = open ? '#9cffd0' : '#8de8bf';
  ctx.font = '900 10.5px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, bx + bw * 0.5, ex.y + 41.5);
  ctx.restore();
}

function drawTrail(ctx, state) {
  if (!state.trail || state.trail.length < 2) return;
  const hi = state.status === 'EXTRACTED';
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 1; i < state.trail.length; i++) {
    const a = state.trail[i - 1];
    const b = state.trail[i];
    if (b.ventJump) {
      ctx.strokeStyle = hi ? 'rgba(72, 248, 228, 0.94)' : 'rgba(72, 248, 228, 0.34)';
      ctx.lineWidth = hi ? 4.4 : 2;
      ctx.setLineDash([7, 6]);
    } else {
      ctx.setLineDash([]);
      ctx.strokeStyle = hi
        ? b.secured ? '#ffe066' : '#46f0ff'
        : b.secured ? 'rgba(255, 220, 102, 0.32)' : 'rgba(70, 236, 255, 0.22)';
      ctx.lineWidth = hi ? 5 : 2.2;
    }
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  if (hi) {
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(84, 244, 255, 0.24)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(state.trail[0].x, state.trail[0].y);
    for (let i = 1; i < state.trail.length; i++) {
      if (state.trail[i].ventJump) ctx.moveTo(state.trail[i].x, state.trail[i].y);
      else ctx.lineTo(state.trail[i].x, state.trail[i].y);
    }
    ctx.stroke();

    const s0 = state.trail[0];
    ctx.fillStyle = '#0c2438';
    ctx.beginPath();
    ctx.arc(s0.x, s0.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#46f0ff';
    ctx.lineWidth = 2.6;
    ctx.stroke();
    ctx.fillStyle = '#a8f8ff';
    ctx.font = '800 9.5px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ENTRY', s0.x, s0.y + 22);
  }
  ctx.restore();
}

function drawWallCameras(ctx, state) {
  ctx.save();
  for (const cam of state.cameras) {
    const off = cam.offlineTimer > 0;
    const blink = Math.floor(state.time * 3) % 2 === 0;

    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.rotate(cam.angle);

    // Articulated brass wall mount + camera body
    ctx.fillStyle = '#151f2e';
    ctx.strokeStyle = off ? '#46ecff' : '#e2b85e';
    ctx.lineWidth = 2.2;
    roundRectPath(ctx, -12, -9, 22, 18, 5);
    ctx.fill();
    ctx.stroke();

    // Extended optics barrel
    ctx.fillStyle = '#25364d';
    ctx.fillRect(8, -5.5, 9, 11);
    ctx.strokeRect(8, -5.5, 9, 11);

    // Blinking red/cyan recording lens LED
    ctx.fillStyle = off ? '#46ecff' : cam.seeingPlayer ? '#ff2a48' : blink ? '#ff3c56' : '#58ecff';
    ctx.beginPath();
    ctx.arc(14, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Compact badge cleanly clamped inside arena walls
    const tag = off ? `OFFLINE ${cam.offlineTimer.toFixed(1)}s` : cam.label;
    const tw = off ? 84 : 50;
    const bx = Math.min(ARENA.x + ARENA.w - tw - 22, Math.max(ARENA.x + 22, cam.x - tw * 0.5));
    const by = cam.y < ARENA.y + 52 ? cam.y + 18 : Math.min(ARENA.y + ARENA.h - 38, cam.y - 29);
    ctx.fillStyle = off ? 'rgba(6, 26, 38, 0.94)' : 'rgba(10, 17, 28, 0.86)';
    roundRectPath(ctx, bx, by, tw, 17, 4);
    ctx.fill();
    ctx.strokeStyle = off ? '#46ecff' : cam.seeingPlayer ? '#ff465e' : 'rgba(102, 224, 250, 0.7)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = off ? '#9ef8ff' : cam.seeingPlayer ? '#ffa2ae' : '#b4f0ff';
    ctx.font = '800 9px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, bx + tw * 0.5, by + 9);
  }
  ctx.restore();
}

function drawArticulatedGuards(ctx, state, palette) {
  ctx.save();
  for (const g of state.guards) {
    const sway = Math.sin(g.stride) * 2.2;
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.angle);

    // Soft grounded character shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
    ctx.beginPath();
    ctx.ellipse(2, 5, 20, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Left baton arm + right extended flashlight arm
    ctx.fillStyle = '#182334';
    roundRectPath(ctx, -3 + sway * 0.6, -18, 15, 7, 3);
    ctx.fill();
    // Extended right flashlight arm
    roundRectPath(ctx, 2, 10, 16, 7, 3);
    ctx.fill();
    // Brass flashlight barrel & glowing beam tip
    ctx.fillStyle = '#e6be64';
    ctx.fillRect(15, 11, 7, 5);
    ctx.fillStyle = g.state === 'ALERT' ? '#ff6278' : '#fff2b0';
    ctx.beginPath();
    ctx.arc(22, 13.5, 3.6, 0, Math.PI * 2);
    ctx.fill();

    // Broad-shouldered uniformed trenchcoat torso (~38px wide!)
    const coat = g.state === 'ALERT' ? '#9e1c30' : g.state === 'SUSPICIOUS' || g.state === 'DISTRACTED' ? '#a65418' : palette.guardCoat;
    ctx.fillStyle = coat;
    roundRectPath(ctx, -12, -17, 23, 34, 9);
    ctx.fill();
    ctx.strokeStyle = g.state === 'ALERT' ? '#ff7c90' : palette.guardTrim;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Brass officer epaulets on both shoulders
    ctx.fillStyle = '#f2cc6e';
    ctx.fillRect(-5, -16, 8, 4.5);
    ctx.fillRect(-5, 11.5, 8, 4.5);

    // Peaked officer cap + brass visor brim
    ctx.fillStyle = '#121a28';
    ctx.beginPath();
    ctx.arc(1, 0, 10.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f5d178';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Cap peak visor pointing forward
    ctx.fillStyle = '#090e18';
    ctx.beginPath();
    ctx.arc(8, 0, 6.5, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.fill();
    // Gold cap crest badge
    ctx.fillStyle = '#ffe07d';
    ctx.beginPath();
    ctx.arc(5, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Crisp floating ! / ? alert badge ONLY when suspicious/alerted
    if (g.state !== 'PATROL') {
      const sym = g.state === 'ALERT' ? '!' : '?';
      const col = g.state === 'ALERT' ? '#ff3650' : '#ffb838';
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(g.x + 19, g.y - 19, 10.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff3d2';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = '#0a0f18';
      ctx.font = '900 13.5px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sym, g.x + 19, g.y - 18.5);
    }
  }
  ctx.restore();
}

function drawArticulatedThief(ctx, state) {
  const { player } = state;
  ctx.save();

  // Subtle contrast spotlight around thief so silhouette pops effortlessly at 768x480
  const halo = ctx.createRadialGradient(player.x, player.y, 4, player.x, player.y, 34);
  halo.addColorStop(0, player.crouched && player.inCover ? 'rgba(56, 248, 224, 0.34)' : 'rgba(130, 236, 255, 0.28)');
  halo.addColorStop(1, 'rgba(56, 232, 255, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 34, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  const scaleCrouch = player.crouched ? 0.9 : 1.04;
  ctx.scale(scaleCrouch, scaleCrouch);
  const sway = Math.sin(player.stride) * 2.5;

  // Ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.56)';
  ctx.beginPath();
  ctx.ellipse(2, 5, 19, 17, 0, 0, Math.PI * 2);
  ctx.fill();

  // Flowing tailored trenchcoat tail trailing behind
  ctx.fillStyle = '#111d30';
  ctx.beginPath();
  ctx.moveTo(-6, -12);
  ctx.lineTo(-19, -9 + sway * 0.5);
  ctx.lineTo(-19, 9 + sway * 0.5);
  ctx.lineTo(-6, 12);
  ctx.closePath();
  ctx.fill();

  // Articulated gloved arms
  ctx.fillStyle = '#1a2d4a';
  roundRectPath(ctx, 2 + sway * 0.6, -16, 13, 6.5, 3);
  ctx.fill();
  roundRectPath(ctx, 2 - sway * 0.6, 9.5, 13, 6.5, 3);
  ctx.fill();

  // Tailored midnight Art-Deco shoulders + ivory lapel trim
  ctx.fillStyle = player.crouched && player.inCover ? '#123e4d' : '#1b2f4f';
  roundRectPath(ctx, -11, -16, 21, 32, 9);
  ctx.fill();
  ctx.strokeStyle = player.crouched && player.inCover ? '#48ffea' : '#f8f0d8';
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // Brass gadget satchel + glowing stolen golden loot case when secured!
  if (state.lootSecured) {
    ctx.fillStyle = '#ffd95e';
    roundRectPath(ctx, -13, 8, 12, 9, 2);
    ctx.fill();
    ctx.strokeStyle = '#fff5cc';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  } else {
    ctx.fillStyle = '#c89640';
    ctx.fillRect(-10, 9, 8, 5);
  }

  // Stylish dark Art-Deco fedora brim + gold hatband
  ctx.fillStyle = '#0d1522';
  ctx.beginPath();
  ctx.ellipse(1, 0, 12, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e8bf66';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Crown + luminous cyan night-visor goggles peeking forward
  ctx.fillStyle = '#182438';
  ctx.beginPath();
  ctx.ellipse(0, 0, 7.5, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#62f5ff';
  ctx.beginPath();
  ctx.arc(9.5, -3.5, 2.8, 0, Math.PI * 2);
  ctx.arc(9.5, 3.5, 2.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  ctx.restore();
}

function drawGadgetEffects(ctx, state) {
  ctx.save();

  // Footstep acoustic rings
  for (const n of state.noiseRings) {
    ctx.strokeStyle = n.loud ? `rgba(255, 162, 74, ${n.alpha})` : `rgba(128, 224, 255, ${n.alpha})`;
    ctx.lineWidth = n.loud ? 2.4 : 1.4;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // EMP Shockwave + jagged lightning bolts arcing to disabled CCTV & Lasers!
  for (const e of state.empPulses) {
    const a = Math.max(0, e.timer / e.maxTimer);
    const g = ctx.createRadialGradient(e.x, e.y, Math.max(8, e.radius - 52), e.x, e.y, e.radius + 14);
    g.addColorStop(0, 'rgba(56, 235, 255, 0)');
    g.addColorStop(0.75, `rgba(56, 235, 255, ${0.52 * a})`);
    g.addColorStop(1, 'rgba(186, 252, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius + 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(136, 250, 255, ${0.98 * a})`;
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Jagged electric arcs along perimeter
    ctx.strokeStyle = `rgba(210, 254, 255, ${0.92 * a})`;
    ctx.lineWidth = 2.2;
    for (let k = 0; k < 7; k++) {
      const base = (k / 7) * Math.PI * 2 + state.time * 1.6;
      ctx.beginPath();
      for (let s = 0; s <= 4; s++) {
        const ang = base + s * 0.12;
        const rad = e.radius + (s % 2 === 0 ? -6 : 7);
        const px = e.x + Math.cos(ang) * rad;
        const py = e.y + Math.sin(ang) * rad;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Lightning bolts snapping directly onto disabled security nodes
    for (const tgt of e.targets || []) {
      drawLightningBolt(ctx, e.x, e.y, tgt.x, tgt.y, a, state.time);
    }
  }

  // Spinning brass Clockwork Decoys
  for (const d of state.decoys) {
    const r1 = 18 + ((d.pulsePhase * 30) % 74);
    const r2 = 18 + (((d.pulsePhase + 1.5) * 30) % 74);
    for (const r of [r1, r2]) {
      const al = Math.max(0, 1 - r / 92) * 0.82;
      ctx.strokeStyle = `rgba(255, 214, 92, ${al})`;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(state.time * 3.4);
    ctx.fillStyle = '#33240a';
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd962';
    ctx.lineWidth = 2.8;
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
      ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Lush Painterly Volumetric Billowing Smoke Clouds (physically sever cones!)
  for (const s of state.smokes) {
    const base = ctx.createRadialGradient(s.x, s.y, s.radius * 0.08, s.x, s.y, s.radius * 1.02);
    base.addColorStop(0, `rgba(24, 42, 54, ${0.92 * s.alpha})`);
    base.addColorStop(0.6, `rgba(54, 84, 102, ${0.80 * s.alpha})`);
    base.addColorStop(1, 'rgba(22, 38, 48, 0)');
    ctx.fillStyle = base;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius * 1.02, 0, Math.PI * 2);
    ctx.fill();

    const puffs = [
      [-0.44, -0.26, 0.58, 0.78],
      [0.45, -0.24, 0.54, 0.74],
      [-0.38, 0.36, 0.56, 0.72],
      [0.38, 0.34, 0.58, 0.76],
      [0.02, -0.44, 0.50, 0.68],
      [-0.08, 0.06, 0.64, 0.82],
      [0.24, -0.02, 0.48, 0.70],
    ];
    for (const [ox, oy, sc, op] of puffs) {
      const drift = Math.sin(state.time * 1.4 + ox * 7) * 3.5;
      const px = s.x + ox * s.radius + drift;
      const py = s.y + oy * s.radius - drift * 0.5;
      const pr = s.radius * sc;
      const g = ctx.createRadialGradient(px - pr * 0.22, py - pr * 0.22, pr * 0.08, px, py, pr);
      g.addColorStop(0, `rgba(208, 236, 248, ${op * 0.76 * s.alpha})`);
      g.addColorStop(0.55, `rgba(98, 140, 162, ${op * 0.68 * s.alpha})`);
      g.addColorStop(1, 'rgba(30, 52, 66, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = `rgba(196, 238, 252, ${0.64 * s.alpha})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 6]);
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius * 0.88, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Circuit Tap arcs
  for (const arc of state.tapArcs) {
    const a = arc.timer / arc.maxTimer;
    drawLightningBolt(ctx, arc.x1, arc.y1, arc.x2, arc.y2, a, state.time, '#52ffb2');
  }

  // LAST SEEN ghost marker
  if (state.lastSeen) {
    const ls = state.lastSeen;
    ctx.strokeStyle = 'rgba(255, 114, 128, 0.85)';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(ls.x, ls.y, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(34, 12, 18, 0.9)';
    roundRectPath(ctx, ls.x - 35, ls.y + 20, 70, 17, 4);
    ctx.fill();
    ctx.strokeStyle = '#ff6b7d';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#ffc0c8';
    ctx.font = '800 9px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LAST SEEN', ls.x, ls.y + 28.5);
  }

  // Tactile spark particles
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

function drawLightningBolt(ctx, x1, y1, x2, y2, alpha, time, color = '#94f8ff') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = Math.min(1, alpha * 1.1);
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  const steps = 6;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const j = Math.sin(time * 24 + i * 3.7) * 12;
    const nx = -(y2 - y1) / (Math.hypot(x2 - x1, y2 - y1) || 1);
    const ny = (x2 - x1) / (Math.hypot(x2 - x1, y2 - y1) || 1);
    ctx.lineTo(x1 + (x2 - x1) * t + nx * j, y1 + (y2 - y1) * t + ny * j);
  }
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawCaughtLockOn(ctx, state) {
  if (state.caughtGrace <= 0.04 || state.status !== 'PLAYING') return;
  const { player } = state;
  const frac = Math.min(1, state.caughtGrace / CAUGHT_GRACE_SECONDS);
  const rem = Math.max(0.1, CAUGHT_GRACE_SECONDS - state.caughtGrace);
  ctx.save();

  if (state.spottedBy) {
    ctx.strokeStyle = 'rgba(255, 62, 88, 0.84)';
    ctx.lineWidth = 2.4;
    ctx.setLineDash([7, 4]);
    ctx.beginPath();
    ctx.moveTo(state.spottedBy.x, state.spottedBy.y);
    ctx.lineTo(player.x, player.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.fillStyle = 'rgba(255, 36, 66, 0.24)';
  ctx.beginPath();
  ctx.arc(player.x, player.y, 48, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 214, 102, 0.36)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 38, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = frac > 0.65 ? '#ff2a48' : '#ffb438';
  ctx.lineWidth = 7.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(player.x, player.y, 38, -Math.PI * 0.5, -Math.PI * 0.5 + frac * Math.PI * 2);
  ctx.stroke();

  const msg = `CAUGHT IN ${rem.toFixed(1)}s · [3] SMOKE!`;
  const bw = 228;
  const bx = Math.max(ARENA.x + 22, Math.min(ARENA.x + ARENA.w - bw - 22, player.x - bw * 0.5));
  const by = Math.max(ARENA.y + 22, player.y - 72);
  ctx.fillStyle = 'rgba(42, 8, 16, 0.96)';
  roundRectPath(ctx, bx, by, bw, 28, 6);
  ctx.fill();
  ctx.strokeStyle = '#ff445e';
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.fillStyle = '#ffecc4';
  ctx.font = '900 12.5px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(msg, bx + bw * 0.5, by + 14.5);
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
    const by = Math.max(ARENA.y + 18, g.y - 46);
    ctx.fillStyle = 'rgba(12, 19, 32, 0.92)';
    roundRectPath(ctx, bx, by, tw, 22, 6);
    ctx.fill();
    ctx.strokeStyle = g.state === 'ALERT' ? '#ff6278' : g.state === 'DISTRACTED' ? '#ffd65e' : '#ebdcb9';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#fcf4df';
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
    const x = Math.max(ARENA.x + 22, Math.min(ARENA.x + ARENA.w - w - 22, p.x - w * 0.5));
    const y = Math.max(ARENA.y + 22, p.y - 10);
    ctx.fillStyle = 'rgba(10, 20, 34, 0.94)';
    roundRectPath(ctx, x, y, w, 22, 5);
    ctx.fill();
    ctx.strokeStyle = '#ffd85e';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = '#fff2c2';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.text, x + w * 0.5, y + 11.5);
  }

  if (state.flashBanner && state.status === 'PLAYING') {
    const b = state.flashBanner;
    ctx.font = '800 12px "Trebuchet MS", sans-serif';
    const w = Math.ceil(ctx.measureText(b.text).width) + 28;
    const x = (WORLD_W - w) * 0.5;
    const y = ARENA.y + 18;
    ctx.fillStyle = 'rgba(9, 17, 30, 0.92)';
    roundRectPath(ctx, x, y, w, 25, 6);
    ctx.fill();
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = b.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.text, WORLD_W * 0.5, y + 13);
  }
  ctx.restore();
}

function drawAtmosphereVignette(ctx, palette) {
  ctx.save();
  const v = ctx.createRadialGradient(WORLD_W * 0.5, WORLD_H * 0.5, 390, WORLD_W * 0.5, WORLD_H * 0.5, 760);
  v.addColorStop(0, 'rgba(0, 0, 0, 0)');
  v.addColorStop(1, palette.ambientVignette);
  ctx.fillStyle = v;
  ctx.fillRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
  ctx.restore();
}
