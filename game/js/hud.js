// Crisp 2D Canvas HUD & 3D-projected world callouts over the Three.js WebGL diorama.

import { WORLD_H, WORLD_W } from './vaults.js';
import { CAUGHT_GRACE_SECONDS, getAlarmTier } from './guards.js';

export const DOCK_BOUNDS = { x: 28, y: 660, cardW: 146, gap: 8, h: 52 };

export function hitTestGadgetDock(wx, wy) {
  if (wy < DOCK_BOUNDS.y || wy > DOCK_BOUNDS.y + DOCK_BOUNDS.h) return -1;
  const rel = wx - DOCK_BOUNDS.x;
  if (rel < 0) return -1;
  const stride = DOCK_BOUNDS.cardW + DOCK_BOUNDS.gap;
  const idx = Math.floor(rel / stride);
  if (idx >= 0 && idx < 4 && rel - idx * stride <= DOCK_BOUNDS.cardW) return idx;
  return -1;
}

export function roundRectPath(ctx, x, y, w, h, r) {
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

export function formatMoney(val) {
  if (val >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
  return `$${Math.round(val / 1000)}K`;
}

function drawTag(ctx, x, y, text, borderCol, textCol, bgCol = 'rgba(8, 14, 24, 0.88)', fontSize = 10) {
  ctx.font = `800 ${fontSize}px "Trebuchet MS", sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width) + 16;
  const h = fontSize + 9;
  const bx = Math.max(18, Math.min(WORLD_W - w - 18, x - w * 0.5));
  const by = Math.max(60, Math.min(646 - h, y - h * 0.5));
  ctx.fillStyle = bgCol;
  roundRectPath(ctx, bx, by, w, h, 4.5);
  ctx.fill();
  ctx.strokeStyle = borderCol;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = textCol;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + w * 0.5, by + h * 0.5 + 0.5);
}

export function drawHudOverlay(ctx, state, project, audioMuted = false, cameraMode = 'tactical') {
  ctx.save();

  // 1. 3D-Projected World Tactical Plaques (Vents, Relays, Cut/EMP Lasers, Loot, Exit, Cameras)
  drawProjectedWorldLabels(ctx, state, project);

  // 2. Fair 1.2s Caught-Grace Lock-On Ring projected onto 3D thief
  drawProjectedLockOn(ctx, state, project);

  // 3. Guard Alert Badges (! / ?) & Crisp Ivory Speech Barks
  drawProjectedGuardsUI(ctx, state, project);

  // 4. Contextual Prompts & Flash Action Banner
  drawPromptsAndBanner(ctx, state, project);

  // 5. Sleek Art-Deco Top HUD Bar & Bottom Vector Gadget Dock + Compact Micro-Key
  drawChromeHud(ctx, state, audioMuted, cameraMode);

  // 6. Getaway Debrief / Caught Modal
  if (state.status === 'EXTRACTED') drawGetawayCard(ctx, state);
  if (state.status === 'CAUGHT') drawCaughtCard(ctx, state);

  ctx.restore();
}

function drawProjectedWorldLabels(ctx, state, project) {
  // Vents
  for (const v of state.vents) {
    const p = project(v.x, v.y, 0.1);
    if (p.visible) drawTag(ctx, p.x, p.y + 18, v.label, 'rgba(72, 240, 224, 0.72)', '#96fff4', 'rgba(7, 20, 28, 0.85)', 9.5);
  }

  // Relays
  for (const r of state.relays) {
    const p = project(r.x, r.y, 1.5);
    if (p.visible) {
      drawTag(
        ctx,
        p.x,
        p.y - 16,
        r.hacked ? 'RELAY CUT' : 'RELAY',
        r.hacked ? '#3cf0a2' : '#ff4d68',
        r.hacked ? '#8affca' : '#ffd2d9',
        'rgba(10, 16, 26, 0.9)',
        9.5,
      );
    }
  }

  // Disabled / EMP'd Laser Gates
  for (const l of state.lasers) {
    if (!l.disabled && l.empTimer <= 0) continue;
    const p = project((l.x1 + l.x2) * 0.5, (l.y1 + l.y2) * 0.5, 1.0);
    if (p.visible) {
      const txt = l.empTimer > 0 ? `EMP ${l.empTimer.toFixed(1)}s` : 'LASER CUT';
      drawTag(ctx, p.x, p.y, txt, l.empTimer > 0 ? '#46ecff' : '#3cf0a2', l.empTimer > 0 ? '#a8fbff' : '#8effca', 'rgba(6, 22, 34, 0.92)', 10);
    }
  }

  // Wall CCTV Camera badges (cleanly offset from nearby wall vents)
  for (const cam of state.cameras) {
    const off = cam.offlineTimer > 0;
    const p = project(cam.x, cam.y, 1.7);
    if (p.visible) {
      const shiftX = cam.x > 880 && cam.x < 980 ? -24 : 0;
      drawTag(
        ctx,
        p.x + shiftX,
        p.y - 16,
        off ? `OFFLINE ${cam.offlineTimer.toFixed(1)}s` : cam.label,
        off ? '#46ecff' : cam.seeingPlayer ? '#ff465e' : 'rgba(98, 228, 255, 0.75)',
        off ? '#a4faff' : cam.seeingPlayer ? '#ffa2ae' : '#baf2ff',
        off ? 'rgba(6, 28, 40, 0.94)' : 'rgba(8, 16, 28, 0.86)',
        9.5,
      );
    }
  }

  // Primary Vault Loot Nameplate
  const lp = project(state.loot.x, state.loot.y, 0.2);
  if (lp.visible) {
    if (!state.loot.taken) {
      const tag = `${state.loot.name} · ${formatMoney(state.loot.value)}`;
      drawTag(ctx, lp.x, lp.y + 32, tag, '#ffd95e', '#ffec9e', 'rgba(18, 14, 6, 0.92)', 11);
    } else {
      drawTag(ctx, lp.x, lp.y + 22, 'STOLEN ✓', 'rgba(255, 218, 98, 0.65)', '#ffe588', 'rgba(14, 22, 34, 0.85)', 10);
    }
  }

  // Optional Bonus Stashes
  for (const b of state.bonuses) {
    if (b.taken) continue;
    const bp = project(b.x, b.y, 0.2);
    if (bp.visible) drawTag(ctx, bp.x, bp.y + 18, `+${formatMoney(b.value)}`, 'rgba(255, 216, 94, 0.7)', '#ffefa6', 'rgba(16, 14, 8, 0.84)', 9.5);
  }

  // Extraction Lift Beacon Tag
  const ep = project(state.exit.x, state.exit.y, 0.2);
  if (ep.visible) {
    const open = state.lootSecured;
    drawTag(
      ctx,
      ep.x,
      ep.y + 26,
      open ? 'EXIT LIFT · READY' : 'EXIT LIFT',
      open ? '#3aff9f' : 'rgba(90, 224, 168, 0.55)',
      open ? '#a0ffd2' : '#8ceac0',
      open ? 'rgba(7, 36, 25, 0.94)' : 'rgba(10, 18, 28, 0.86)',
      open ? 11 : 10,
    );
  }

  // LAST SEEN marker
  if (state.lastSeen) {
    const sp = project(state.lastSeen.x, state.lastSeen.y, 0.1);
    if (sp.visible) drawTag(ctx, sp.x, sp.y + 16, 'LAST SEEN', '#ff647a', '#ffc2ca', 'rgba(34, 10, 16, 0.9)', 9.5);
  }

  // ENTRY marker on Getaway debrief
  if (state.status === 'EXTRACTED' && state.trail.length > 0) {
    const s0 = state.trail[0];
    const p0 = project(s0.x, s0.y, 0.2);
    if (p0.visible) drawTag(ctx, p0.x, p0.y + 18, 'ENTRY', '#46f0ff', '#a8f9ff', 'rgba(8, 24, 38, 0.9)', 9.5);
  }

  // IN COVER tag on thief when crouched in cover shadow
  if (state.player.crouched && state.player.inCover && state.caughtGrace <= 0.04 && state.status === 'PLAYING') {
    const pp = project(state.player.x, state.player.y, 0.1);
    if (pp.visible) drawTag(ctx, pp.x, pp.y + 22, 'IN COVER', '#48ffe8', '#9efffa', 'rgba(6, 30, 38, 0.9)', 9.5);
  }
}

function drawProjectedGuardsUI(ctx, state, project) {
  for (const g of state.guards) {
    const head = project(g.x, g.y, 2.55);
    if (!head.visible) continue;

    if (g.state !== 'PATROL') {
      const sym = g.state === 'ALERT' ? '!' : '?';
      const col = g.state === 'ALERT' ? '#ff3650' : '#ffb838';
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(head.x + 16, head.y - 6, 10.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff5d8';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = '#090f18';
      ctx.font = '900 13.5px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sym, head.x + 16, head.y - 5.5);
    }

    if (g.bark && g.barkTimer > 0) {
      const bCol = g.state === 'ALERT' ? '#ff5e74' : g.state === 'DISTRACTED' ? '#ffd65e' : '#eee0bd';
      drawTag(ctx, head.x, head.y - 26, `"${g.bark}"`, bCol, '#fdf6e2', 'rgba(11, 18, 30, 0.92)', 10.5);
    }
  }
}

function drawProjectedLockOn(ctx, state, project) {
  if (state.caughtGrace <= 0.04 || state.status !== 'PLAYING') return;
  const pp = project(state.player.x, state.player.y, 1.15);
  if (!pp.visible) return;

  const frac = Math.min(1, state.caughtGrace / CAUGHT_GRACE_SECONDS);
  const rem = Math.max(0.1, CAUGHT_GRACE_SECONDS - state.caughtGrace);

  if (state.spottedBy) {
    const sp = project(state.spottedBy.x, state.spottedBy.y, 1.35);
    if (sp.visible) {
      ctx.strokeStyle = 'rgba(255, 64, 92, 0.88)';
      ctx.lineWidth = 2.4;
      ctx.setLineDash([7, 4]);
      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y);
      ctx.lineTo(pp.x, pp.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  ctx.fillStyle = 'rgba(255, 34, 66, 0.24)';
  ctx.beginPath();
  ctx.arc(pp.x, pp.y, 44, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 214, 102, 0.38)';
  ctx.lineWidth = 6.5;
  ctx.beginPath();
  ctx.arc(pp.x, pp.y, 34, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = frac > 0.65 ? '#ff2a48' : '#ffb438';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(pp.x, pp.y, 34, -Math.PI * 0.5, -Math.PI * 0.5 + frac * Math.PI * 2);
  ctx.stroke();

  drawTag(ctx, pp.x, pp.y - 52, `CAUGHT IN ${rem.toFixed(1)}s · [3] SMOKE!`, '#ff445e', '#fff0c8', 'rgba(42, 8, 16, 0.96)', 12.5);
}

function drawPromptsAndBanner(ctx, state, project) {
  if (state.nearPrompt && state.status === 'PLAYING') {
    const pp = project(state.nearPrompt.x, state.nearPrompt.y, 1.6);
    if (pp.visible) drawTag(ctx, pp.x, pp.y - 22, state.nearPrompt.text, '#ffd85e', '#fff2c2', 'rgba(10, 20, 34, 0.94)', 11);
  }
  if (state.flashBanner && state.status === 'PLAYING') {
    drawTag(ctx, WORLD_W * 0.5, 76, state.flashBanner.text, state.flashBanner.color, state.flashBanner.color, 'rgba(9, 17, 30, 0.92)', 12);
  }
}

function drawChromeHud(ctx, state, audioMuted, cameraMode) {
  // Top-left Vault & Loot badge
  ctx.fillStyle = 'rgba(8, 14, 24, 0.88)';
  roundRectPath(ctx, 24, 7, 368, 46, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(232, 184, 88, 0.85)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.fillStyle = '#f5d480';
  ctx.font = '800 10.5px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`VAULT ${state.vaultIndex + 1}/${state.vaultCount} · ${state.vault.title}`, 36, 13);

  const lootLine = state.lootSecured
    ? `LOOT ${formatMoney(state.collectedValue)} SECURED ✓`
    : `TARGET ${formatMoney(state.vault.loot.value)} · NET ${formatMoney(Math.max(0, state.vault.loot.value - state.toolSpent))}`;
  ctx.fillStyle = state.lootSecured ? '#ffe06e' : '#edf4fb';
  ctx.font = '800 13px "Trebuchet MS", sans-serif';
  ctx.fillText(lootLine, 36, 29);

  if (state.toolSpent > 0) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ff9882';
    ctx.font = '800 10.5px "Trebuchet MS", sans-serif';
    ctx.fillText(`-${formatMoney(state.toolSpent)}`, 380, 31);
  }

  // Top-center HUGE crystal-clear Segmented ALARM METER
  const tier = getAlarmTier(state.alarm);
  const ax = 414;
  const ay = 5;
  const aw = 452;
  const ah = 50;
  ctx.fillStyle = 'rgba(8, 14, 24, 0.94)';
  roundRectPath(ctx, ax, ay, aw, ah, 8);
  ctx.fill();
  ctx.strokeStyle = tier.color;
  ctx.lineWidth = 2.4;
  ctx.stroke();

  ctx.fillStyle = '#fdf5df';
  ctx.font = '900 15px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`ALARM ${Math.round(state.alarm)}%`, ax + 14, ay + 6);

  ctx.textAlign = 'right';
  ctx.fillStyle = tier.color;
  ctx.font = '900 14.5px "Trebuchet MS", sans-serif';
  ctx.fillText(tier.code, ax + aw - 14, ay + 6);

  const bx = ax + 14;
  const by = ay + 27;
  const bw = aw - 28;
  const bh = 15;
  const segs = 12;
  const gap = 3;
  const segW = (bw - gap * (segs - 1)) / segs;
  const lit = Math.round((state.alarm / 100) * segs);
  for (let i = 0; i < segs; i++) {
    const sx = bx + i * (segW + gap);
    const active = i < lit;
    const ratio = i / (segs - 1);
    let col = '#35e4b4';
    if (ratio >= 0.72) col = '#ff364f';
    else if (ratio >= 0.45) col = '#ff8834';
    else if (ratio >= 0.22) col = '#f6c444';
    ctx.fillStyle = active ? col : 'rgba(255, 255, 255, 0.1)';
    roundRectPath(ctx, sx, by, segW, bh, 2.5);
    ctx.fill();
  }

  // Top-right Timer & Controls
  ctx.fillStyle = 'rgba(8, 14, 24, 0.88)';
  roundRectPath(ctx, 888, 7, 368, 46, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(232, 184, 88, 0.85)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#cde2f5';
  ctx.font = '700 10px "Trebuchet MS", sans-serif';
  ctx.fillText('WASD MOVE · SPACE COVER · E BREACH/VENT', 900, 13);
  ctx.fillStyle = '#f2cc74';
  ctx.fillText(`1-4 GADGETS · [C] ${cameraMode === 'chase' ? 'CHASE' : '3/4'} CAM · R RETRY · ${audioMuted ? 'MUTE' : 'SFX'}`, 900, 30);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#fdf4dc';
  ctx.font = '900 15px "Trebuchet MS", sans-serif';
  ctx.fillText(`${state.elapsed.toFixed(1)}s`, 1244, 13);

  // Bottom-left Vector Gadget Dock
  const { x: startX, y, cardW, gap: dGap, h } = DOCK_BOUNDS;
  const dockW = cardW * 4 + dGap * 3 + 12;
  ctx.fillStyle = 'rgba(7, 12, 22, 0.88)';
  roundRectPath(ctx, startX - 6, y - 4, dockW, h + 8, 9);
  ctx.fill();
  ctx.strokeStyle = 'rgba(226, 178, 86, 0.6)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  for (let i = 0; i < state.gadgets.length; i++) {
    const t = state.gadgets[i];
    const cx = startX + i * (cardW + dGap);
    const empty = t.remaining <= 0;
    const active = state.activeGadgetId === t.id && !empty;

    ctx.fillStyle = empty ? 'rgba(12, 18, 28, 0.72)' : active ? 'rgba(22, 38, 60, 0.95)' : 'rgba(13, 22, 36, 0.92)';
    roundRectPath(ctx, cx, y, cardW, h, 7);
    ctx.fill();
    ctx.strokeStyle = empty ? 'rgba(120, 136, 154, 0.25)' : active ? t.color : 'rgba(218, 174, 86, 0.45)';
    ctx.lineWidth = active ? 2 : 1.3;
    ctx.stroke();

    ctx.fillStyle = empty ? '#243245' : t.color;
    roundRectPath(ctx, cx + 6, y + 6, 18, 18, 4);
    ctx.fill();
    ctx.fillStyle = '#07121e';
    ctx.font = '900 11px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.key, cx + 15, y + 15.5);

    drawGadgetIcon(ctx, t.id, cx + 38, y + 26, empty ? '#5a6a7d' : t.color);

    ctx.textAlign = 'left';
    ctx.fillStyle = empty ? '#637487' : '#f8f0da';
    ctx.font = '800 12px "Trebuchet MS", sans-serif';
    ctx.fillText(t.name, cx + 54, y + 17);

    ctx.fillStyle = empty ? '#516072' : '#ffa788';
    ctx.font = '800 10px "Trebuchet MS", sans-serif';
    ctx.fillText(`-${formatMoney(t.cost)}`, cx + 54, y + 36);

    for (let c = 0; c < t.charges; c++) {
      ctx.fillStyle = c < t.remaining ? t.color : 'rgba(255, 255, 255, 0.14)';
      ctx.beginPath();
      ctx.arc(cx + cardW - 12 - c * 12, y + 36, 4.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Bottom-right sleek compact 1-line tactical micro-key
  const kx = 772;
  const ky = 674;
  const kw = 484;
  const kh = 34;
  ctx.fillStyle = 'rgba(7, 12, 22, 0.86)';
  roundRectPath(ctx, kx, ky, kw, kh, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(226, 178, 86, 0.55)';
  ctx.lineWidth = 1.3;
  ctx.stroke();

  const keys = [
    ['GUARD', '#ffbe48'],
    ['CCTV', '#44e6ff'],
    ['LASER', '#ff3b5c'],
    ['LOOT', '#ffe066'],
    ['EXIT', '#38f59f'],
  ];
  let ix = kx + 16;
  for (const [label, col] of keys) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(ix + 5, ky + 17, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8f1fa';
    ctx.font = '800 10.5px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, ix + 15, ky + 17.5);
    ix += 93;
  }
}

function drawGadgetIcon(ctx, id, x, y, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.8;
  ctx.lineJoin = 'round';
  if (id === 'emp') {
    ctx.beginPath();
    ctx.moveTo(x + 2, y - 9);
    ctx.lineTo(x - 5, y + 1);
    ctx.lineTo(x, y + 1);
    ctx.lineTo(x - 2, y + 9);
    ctx.lineTo(x + 6, y - 1);
    ctx.lineTo(x + 1, y - 1);
    ctx.closePath();
    ctx.fill();
  } else if (id === 'decoy') {
    ctx.beginPath();
    ctx.arc(x, y, 6.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * 6.5, y + Math.sin(a) * 6.5);
      ctx.lineTo(x + Math.cos(a) * 9.5, y + Math.sin(a) * 9.5);
      ctx.stroke();
    }
  } else if (id === 'smoke') {
    ctx.beginPath();
    ctx.arc(x - 4, y + 2, 4.5, 0, Math.PI * 2);
    ctx.arc(x + 4, y + 2, 4.2, 0, Math.PI * 2);
    ctx.arc(x, y - 3, 5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(x - 7, y + 5);
    ctx.lineTo(x - 1, y - 5);
    ctx.lineTo(x + 2, y + 2);
    ctx.lineTo(x + 7, y - 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 7, y - 6, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawGetawayCard(ctx, state) {
  const s = state.summary;
  if (!s) return;
  ctx.save();

  ctx.fillStyle = 'rgba(4, 8, 16, 0.26)';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  const w = 516;
  const h = 324;
  const x = (WORLD_W - w) * 0.5;
  const y = (WORLD_H - h) * 0.5 + 8;

  ctx.fillStyle = 'rgba(9, 17, 30, 0.90)';
  roundRectPath(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = '#ecc060';
  ctx.lineWidth = 2.8;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 224, 148, 0.34)';
  ctx.lineWidth = 1.1;
  roundRectPath(ctx, x + 7, y + 7, w - 14, h - 14, 8);
  ctx.stroke();

  ctx.fillStyle = '#40f6aa';
  ctx.font = '900 11.5px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('GETAWAY COMPLETE · 3D LIVE ROUTE LOGGED', x + 24, y + 18);

  ctx.fillStyle = '#fdf4da';
  ctx.font = '900 22px "Trebuchet MS", sans-serif';
  ctx.fillText(s.title, x + 24, y + 36);

  const sx = x + w - 58;
  const sy = y + 48;
  ctx.fillStyle = '#2d2008';
  ctx.beginPath();
  ctx.arc(sx, sy, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd962';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#ffe994';
  ctx.font = '900 26px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(s.rank, sx, sy - 4);
  ctx.font = '800 8.5px "Trebuchet MS", sans-serif';
  ctx.fillText(s.rankTitle, sx, sy + 15);

  const rows = [
    ['LOOT SECURED', `+${formatMoney(s.grossLoot)}`, '#ffe17a'],
    ['GADGET EXPENSES', s.toolCost > 0 ? `-${formatMoney(s.toolCost)}` : '$0', s.toolCost > 0 ? '#ff967d' : '#7effc4'],
    ['STEALTH & CLOCKWORK BONUS', `+${formatMoney(s.ghostBonus + s.speedBonus)}`, '#6cf0ff'],
    ['PEAK ALARM · RUN TIME', `${s.peakAlarm}% · ${s.elapsed.toFixed(1)}s`, '#dcebf8'],
  ];
  let ry = y + 90;
  for (const [k, v, col] of rows) {
    ctx.fillStyle = 'rgba(22, 38, 62, 0.74)';
    roundRectPath(ctx, x + 22, ry, w - 44, 25, 5);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#bed5ea';
    ctx.font = '700 11px "Trebuchet MS", sans-serif';
    ctx.fillText(k, x + 34, ry + 13);
    ctx.textAlign = 'right';
    ctx.fillStyle = col;
    ctx.font = '900 12px "Trebuchet MS", sans-serif';
    ctx.fillText(v, x + w - 34, ry + 13);
    ry += 29;
  }

  ctx.fillStyle = '#ffd962';
  ctx.textAlign = 'left';
  ctx.font = '900 13.5px "Trebuchet MS", sans-serif';
  ctx.fillText('NET HEIST PAYOUT', x + 26, ry + 12);
  ctx.textAlign = 'right';
  ctx.font = '900 22px "Trebuchet MS", sans-serif';
  ctx.fillText(formatMoney(s.netPayout), x + w - 26, ry + 12);

  const my = ry + 34;
  const mw = 150;
  for (let i = 0; i < s.medals.length; i++) {
    const m = s.medals[i];
    const mx = x + 22 + i * (mw + 11);
    ctx.fillStyle = m.earned ? 'rgba(70, 52, 12, 0.94)' : 'rgba(18, 28, 44, 0.85)';
    roundRectPath(ctx, mx, my, mw, 38, 6);
    ctx.fill();
    ctx.strokeStyle = m.earned ? '#ffd962' : 'rgba(130, 152, 176, 0.35)';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = m.earned ? '#ffe892' : '#7992ab';
    ctx.font = '900 10.5px "Trebuchet MS", sans-serif';
    ctx.fillText(m.earned ? `★ ${m.label}` : m.label, mx + mw * 0.5, my + 12);
    ctx.font = '700 9.5px "Trebuchet MS", sans-serif';
    ctx.fillStyle = m.earned ? '#fbf0d4' : '#657c94';
    ctx.fillText(m.detail, mx + mw * 0.5, my + 27);
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#92fce0';
  ctx.font = '900 12px "Trebuchet MS", sans-serif';
  ctx.fillText('[N] NEXT VAULT     ·     [R] REPLAY VAULT', x + w * 0.5, y + h - 18);
  ctx.restore();
}

export function drawCaughtCard(ctx, state) {
  ctx.save();
  ctx.fillStyle = 'rgba(12, 4, 8, 0.52)';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  const w = 440;
  const h = 192;
  const x = (WORLD_W - w) * 0.5;
  const y = (WORLD_H - h) * 0.5;

  ctx.fillStyle = 'rgba(26, 10, 18, 0.94)';
  roundRectPath(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = '#ff445e';
  ctx.lineWidth = 2.8;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ff6b80';
  ctx.font = '900 24px "Trebuchet MS", sans-serif';
  ctx.fillText('HEIST COMPROMISED', x + w * 0.5, y + 44);

  ctx.fillStyle = '#fcecd4';
  ctx.font = '800 13px "Trebuchet MS", sans-serif';
  ctx.fillText(state.caughtReason || 'SECURITY LOCK-ON COMPLETED', x + w * 0.5, y + 80);

  ctx.fillStyle = '#9ce8f8';
  ctx.font = '700 11.5px "Trebuchet MS", sans-serif';
  ctx.fillText('TIP: POP [3] SMOKE OR DUCK BEHIND COVER DURING LOCK-ON', x + w * 0.5, y + 114);

  ctx.fillStyle = '#ffe285';
  ctx.font = '900 14px "Trebuchet MS", sans-serif';
  ctx.fillText('PRESS [R] TO RETRY VAULT', x + w * 0.5, y + 154);
  ctx.restore();
}
