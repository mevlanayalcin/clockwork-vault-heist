// Edge-to-edge 1280x720 Art-Deco chrome: Top Alarm Bar, Right Tactical Dossier, Bottom Tool Belt.

import { BOT_H, getVaultMetaList, MAP, SCREEN_H, SCREEN_W, SIDE_W, TOP_H } from './vaults.js';
import { getAlarmStatus } from './stealth.js';

export const TOOL_BAR = { x: 16, y: SCREEN_H - BOT_H + 7, cardW: 196, gap: 10, h: 50 };

export function hitTestToolBelt(lx, ly) {
  if (ly < TOOL_BAR.y || ly > TOOL_BAR.y + TOOL_BAR.h) return -1;
  const rel = lx - TOOL_BAR.x;
  if (rel < 0) return -1;
  const stride = TOOL_BAR.cardW + TOOL_BAR.gap;
  const idx = Math.floor(rel / stride);
  if (idx >= 0 && idx < 4 && rel - idx * stride <= TOOL_BAR.cardW) return idx;
  return -1;
}

export function roundRect(ctx, x, y, w, h, r) {
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

export function drawChromeAndOverlays(ctx, state, audioMuted) {
  drawTopBar(ctx, state, audioMuted);
  drawRightSidebar(ctx, state);
  drawBottomToolBelt(ctx, state);
  if (state.status === 'CAUGHT') drawFairCaughtBanner(ctx, state);
  if (state.status === 'EXTRACTED') drawGetawayLedger(ctx, state);
}

function drawTopBar(ctx, state, audioMuted) {
  ctx.save();
  const bg = ctx.createLinearGradient(0, 0, 0, TOP_H);
  bg.addColorStop(0, '#221a14');
  bg.addColorStop(1, '#16110d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SCREEN_W, TOP_H);

  ctx.strokeStyle = '#d4a44a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, TOP_H - 1);
  ctx.lineTo(SCREEN_W, TOP_H - 1);
  ctx.stroke();

  // Left: Vault identity & live objective
  ctx.fillStyle = '#f3cc72';
  ctx.font = '900 12px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`VAULT ${state.vault.numeral} / V  ·  ${state.vault.title}`, 18, 9);

  const obj = state.status === 'EXTRACTED'
    ? 'GETAWAY COMPLETE · VAULT CLEARED'
    : state.status === 'CAUGHT'
      ? 'ALARM TRIGGERED · PRESS [R] FOR INSTANT RETRY'
      : state.lootSecured
        ? `LOOT SECURED (${formatMoney(state.collectedValue)}) · EXTRACT AT LIFT`
        : `OBJECTIVE: STEAL ${state.vault.loot.name} (${formatMoney(state.vault.loot.value)})`;
  ctx.fillStyle = state.status === 'CAUGHT' ? '#ff7c8e' : state.lootSecured ? '#7effbe' : '#dfd2b8';
  ctx.font = '700 11px "Trebuchet MS", sans-serif';
  ctx.fillText(obj, 18, 28);

  // Center: HUGE crystal-clear Segmented ALARM METER
  const st = getAlarmStatus(state.alarm, state.status);
  const ax = 416;
  const ay = 5;
  const aw = 452;
  const ah = 42;
  ctx.fillStyle = '#120d0a';
  roundRect(ctx, ax, ay, aw, ah, 7);
  ctx.fill();
  ctx.strokeStyle = st.color;
  ctx.lineWidth = 2.2;
  ctx.stroke();

  ctx.fillStyle = '#fbf2db';
  ctx.font = '900 14px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`ALARM ${Math.round(state.alarm)}%`, ax + 14, ay + 5);

  ctx.textAlign = 'right';
  ctx.fillStyle = st.color;
  ctx.font = '900 13.5px "Trebuchet MS", sans-serif';
  ctx.fillText(st.code, ax + aw - 14, ay + 5);

  const bx = ax + 14;
  const by = ay + 24;
  const bw = aw - 28;
  const bh = 12;
  const segs = 14;
  const gap = 3;
  const sw = (bw - gap * (segs - 1)) / segs;
  const lit = Math.round((state.alarm / 100) * segs);
  for (let i = 0; i < segs; i++) {
    const r = i / (segs - 1);
    let c = '#42e2b2';
    if (r >= 0.72) c = '#ff3852';
    else if (r >= 0.45) c = '#ff8a34';
    else if (r >= 0.22) c = '#f4c446';
    ctx.fillStyle = i < lit ? c : 'rgba(255, 240, 204, 0.09)';
    roundRect(ctx, bx + i * (sw + gap), by, sw, bh, 2);
    ctx.fill();
  }

  // Right: Net Take, Expenses, Timer & Mute
  const net = state.lootSecured
    ? Math.max(0, state.collectedValue - state.toolSpent)
    : Math.max(0, state.vault.loot.value - state.toolSpent);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffe078';
  ctx.font = '900 15px "Trebuchet MS", sans-serif';
  ctx.fillText(`NET ${formatMoney(net)}`, SCREEN_W - 116, 8);

  ctx.fillStyle = state.toolSpent > 0 ? '#ff9c86' : '#a8d8c2';
  ctx.font = '700 10.5px "Trebuchet MS", sans-serif';
  ctx.fillText(state.toolSpent > 0 ? `TOOLS -${formatMoney(state.toolSpent)}` : 'TOOLS $0', SCREEN_W - 116, 28);

  ctx.fillStyle = '#f8eed8';
  ctx.font = '900 15px "Trebuchet MS", sans-serif';
  ctx.fillText(`${state.elapsed.toFixed(1)}s`, SCREEN_W - 18, 8);

  ctx.fillStyle = '#c8b48e';
  ctx.font = '700 10px "Trebuchet MS", sans-serif';
  ctx.fillText(audioMuted ? '[M] MUTED' : '[M] SFX ON', SCREEN_W - 18, 28);
  ctx.restore();
}

function drawRightSidebar(ctx, state) {
  ctx.save();
  const sx = MAP.w;
  const sy = TOP_H;
  const sw = SIDE_W;
  const sh = MAP.h;

  const bg = ctx.createLinearGradient(sx, sy, sx + sw, sy + sh);
  bg.addColorStop(0, '#1e1712');
  bg.addColorStop(1, '#140f0c');
  ctx.fillStyle = bg;
  ctx.fillRect(sx, sy, sw, sh);

  ctx.strokeStyle = '#d4a44a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx + 1, sy);
  ctx.lineTo(sx + 1, sy + sh);
  ctx.stroke();

  const pad = 14;
  const ix = sx + pad;
  const iw = sw - pad * 2;
  let y = sy + 12;

  // 1. Live Status Card + Exposure & Footstep Noise bars
  const st = getAlarmStatus(state.alarm, state.status);
  ctx.fillStyle = '#120d0a';
  roundRect(ctx, ix, y, iw, 96, 7);
  ctx.fill();
  ctx.strokeStyle = st.color;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  const prefix = state.status === 'CAUGHT' ? '!' : state.status === 'EXTRACTED' ? '✓' : state.alarm >= 30 ? '?' : '●';
  ctx.fillStyle = st.color;
  ctx.font = '900 14px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`${prefix}  ${st.code}`, ix + 12, y + 9);

  ctx.textAlign = 'right';
  ctx.fillStyle = state.player.crouched && state.player.inCover ? '#54ffec' : '#c6b492';
  ctx.font = '800 10px "Trebuchet MS", sans-serif';
  ctx.fillText(state.player.crouched && state.player.inCover ? 'SHADOW COVER' : state.player.crouched ? 'SILENT WALK' : 'EXPOSED STEP', ix + iw - 12, y + 11);

  drawSidebarGauge(ctx, ix + 12, y + 36, iw - 24, 'EXPOSURE', Math.round(state.exposure * 100), '#ff5268');
  drawSidebarGauge(ctx, ix + 12, y + 66, iw - 24, 'NOISE', Math.round(state.noiseLevel), '#f4c24e');
  y += 108;

  // 2. Named Guard Roster
  drawSectionHeader(ctx, ix, y, iw, 'GUARD ROSTER');
  y += 20;
  for (const g of state.guards) {
    const rowH = 27;
    const isAlert = g.state === 'ALERT';
    const isInv = g.state === 'INVESTIGATING' || g.state === 'SEARCHING';
    ctx.fillStyle = isAlert ? 'rgba(130, 22, 36, 0.42)' : isInv ? 'rgba(128, 74, 18, 0.36)' : 'rgba(42, 33, 25, 0.65)';
    roundRect(ctx, ix, y, iw, rowH, 5);
    ctx.fill();
    ctx.strokeStyle = isAlert ? '#ff4a62' : isInv ? '#f6b444' : 'rgba(212, 164, 74, 0.25)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#f5e8cc';
    ctx.font = '800 11px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(g.name, ix + 10, y + rowH * 0.5 + 0.5);

    const pct = Math.round(g.suspicion * 100);
    const label = isAlert
      ? '! SPOTTED'
      : g.state === 'INVESTIGATING'
        ? `? INVESTIGATING ${Math.max(pct, 35)}%`
        : g.state === 'SEARCHING'
          ? '? SEARCHING'
          : 'ON PATROL';
    ctx.textAlign = 'right';
    ctx.fillStyle = isAlert ? '#ff7688' : isInv ? '#ffd268' : '#96ccb4';
    ctx.font = '800 10px "Trebuchet MS", sans-serif';
    ctx.fillText(label, ix + iw - 10, y + rowH * 0.5 + 0.5);
    y += rowH + 5;
  }
  y += 5;

  // 3. Camera & Laser Grid Roster
  drawSectionHeader(ctx, ix, y, iw, 'SECURITY GRID');
  y += 20;
  const colW = (iw - 8) * 0.5;
  for (let i = 0; i < state.cameras.length; i++) {
    const c = state.cameras[i];
    const cx = ix + (i % 2) * (colW + 8);
    const cy = y + Math.floor(i / 2) * 26;
    const emp = c.empTimer > 0;
    const loop = c.loopTimer > 0;
    ctx.fillStyle = 'rgba(34, 27, 21, 0.8)';
    roundRect(ctx, cx, cy, colW, 22, 4);
    ctx.fill();
    ctx.strokeStyle = emp ? '#46e8ff' : loop ? '#42e89d' : c.seeingPlayer ? '#ff445e' : 'rgba(104, 214, 238, 0.35)';
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e5dac2';
    ctx.font = '800 9.5px "Trebuchet MS", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(c.label, cx + 7, cy + 11.5);
    ctx.textAlign = 'right';
    ctx.fillStyle = emp ? '#6cf2ff' : loop ? '#7affc4' : c.seeingPlayer ? '#ff7c8e' : '#7adcf2';
    ctx.fillText(emp ? `EMP ${c.empTimer.toFixed(1)}s` : loop ? `LOOP ${c.loopTimer.toFixed(1)}s` : 'SWEEP', cx + colW - 7, cy + 11.5);
  }
  y += Math.ceil(state.cameras.length / 2) * 26 + 8;

  // 4. Iconic Visual Map Key (replaces ugly floating floor text labels!)
  drawSectionHeader(ctx, ix, y, iw, 'FLOORPLAN KEY');
  y += 20;
  const keyItems = [
    ['shadow', 'Shadow Cover'],
    ['cone', 'Guard Cone'],
    ['cctv', 'CCTV Sweep'],
    ['laser', 'Laser & Breaker'],
    ['vent', 'Vent Bypass'],
    ['loot', 'Vault Loot'],
    ['exit', 'Exit Lift'],
    ['patrol', 'Patrol Loop ①②'],
  ];
  for (let i = 0; i < keyItems.length; i++) {
    const [kind, lbl] = keyItems[i];
    const kx = ix + (i % 2) * (colW + 8);
    const ky = y + Math.floor(i / 2) * 23;
    drawMiniKeyIcon(ctx, kind, kx + 9, ky + 9);
    ctx.fillStyle = '#ddd0b6';
    ctx.font = '700 10px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(lbl, kx + 22, ky + 9.5);
  }

  // 5. 5-Vault Campaign Strip pinned cleanly at bottom of sidebar
  const campY = sy + sh - 60;
  drawSectionHeader(ctx, ix, campY, iw, '5-VAULT CAMPAIGN');
  const vaults = getVaultMetaList();
  const pw = (iw - 16) / 5;
  for (let i = 0; i < vaults.length; i++) {
    const v = vaults[i];
    const vx = ix + i * (pw + 4);
    const vy = campY + 18;
    const cur = i === state.vaultIndex;
    const done = state.completedVaults.has(i);
    ctx.fillStyle = cur ? '#3d2c14' : done ? '#163626' : '#16110d';
    roundRect(ctx, vx, vy, pw, 32, 5);
    ctx.fill();
    ctx.strokeStyle = cur ? '#f4c85e' : done ? '#42e89d' : 'rgba(212, 164, 74, 0.3)';
    ctx.lineWidth = cur ? 2 : 1.1;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = cur ? '#ffe79a' : done ? '#88ffc8' : '#b8a684';
    ctx.font = '900 11px "Trebuchet MS", sans-serif';
    ctx.fillText(done ? '✓' : v.numeral, vx + pw * 0.5, vy + 12);
    ctx.font = '700 7.5px "Trebuchet MS", sans-serif';
    ctx.fillStyle = cur ? '#f8e6bd' : '#8e7d62';
    ctx.fillText(v.short.slice(0, 6), vx + pw * 0.5, vy + 24);
  }
  ctx.restore();
}

function drawSidebarGauge(ctx, x, y, w, label, pct, color) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#c8b89a';
  ctx.font = '800 9.5px "Trebuchet MS", sans-serif';
  ctx.fillText(label, x, y);
  ctx.textAlign = 'right';
  ctx.fillStyle = pct > 50 ? color : '#e8dcc2';
  ctx.fillText(`${pct}%`, x + w, y);

  ctx.fillStyle = 'rgba(255, 240, 206, 0.1)';
  roundRect(ctx, x, y + 13, w, 7, 3);
  ctx.fill();
  const fw = Math.max(0, Math.min(1, pct / 100)) * w;
  if (fw > 1) {
    ctx.fillStyle = color;
    roundRect(ctx, x, y + 13, fw, 7, 3);
    ctx.fill();
  }
}

function drawSectionHeader(ctx, x, y, w, title) {
  ctx.fillStyle = '#dfaf54';
  ctx.font = '900 10px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(title, x, y);
  ctx.strokeStyle = 'rgba(212, 164, 74, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + 14);
  ctx.lineTo(x + w, y + 14);
  ctx.stroke();
}

function drawMiniKeyIcon(ctx, kind, cx, cy) {
  ctx.save();
  if (kind === 'shadow') {
    ctx.fillStyle = '#152448';
    ctx.fillRect(cx - 7, cy - 6, 14, 12);
    ctx.strokeStyle = '#52e4dc';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(cx - 7, cy - 6, 14, 12);
  } else if (kind === 'cone') {
    ctx.fillStyle = 'rgba(255, 198, 72, 0.72)';
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy);
    ctx.lineTo(cx + 7, cy - 6);
    ctx.lineTo(cx + 7, cy + 6);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'cctv') {
    ctx.fillStyle = 'rgba(66, 224, 255, 0.72)';
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy);
    ctx.lineTo(cx + 7, cy - 6);
    ctx.lineTo(cx + 7, cy + 6);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'laser') {
    ctx.strokeStyle = '#ff3656';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy);
    ctx.lineTo(cx + 7, cy);
    ctx.stroke();
    ctx.fillStyle = '#e4b254';
    ctx.beginPath();
    ctx.arc(cx - 7, cy, 2.5, 0, Math.PI * 2);
    ctx.arc(cx + 7, cy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'vent') {
    ctx.fillStyle = '#1a242c';
    ctx.fillRect(cx - 6, cy - 6, 12, 12);
    ctx.strokeStyle = '#5ceae0';
    ctx.lineWidth = 1.3;
    ctx.strokeRect(cx - 6, cy - 6, 12, 12);
    ctx.strokeStyle = '#dfa94e';
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - 2);
    ctx.lineTo(cx + 4, cy - 2);
    ctx.moveTo(cx - 4, cy + 2);
    ctx.lineTo(cx + 4, cy + 2);
    ctx.stroke();
  } else if (kind === 'loot') {
    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx + 6, cy);
    ctx.lineTo(cx, cy + 6);
    ctx.lineTo(cx - 6, cy);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'exit') {
    ctx.fillStyle = '#124a34';
    ctx.fillRect(cx - 6, cy - 6, 12, 12);
    ctx.strokeStyle = '#42ffaa';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(cx - 6, cy - 6, 12, 12);
  } else {
    ctx.strokeStyle = '#f2c866';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#f2c866';
    ctx.font = '800 7.5px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('1', cx, cy + 0.5);
  }
  ctx.restore();
}

function drawBottomToolBelt(ctx, state) {
  ctx.save();
  const by = SCREEN_H - BOT_H;
  const bg = ctx.createLinearGradient(0, by, 0, SCREEN_H);
  bg.addColorStop(0, '#1e1712');
  bg.addColorStop(1, '#120d0a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, by, SCREEN_W, BOT_H);

  ctx.strokeStyle = '#d4a44a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, by + 1);
  ctx.lineTo(SCREEN_W, by + 1);
  ctx.stroke();

  const { x: startX, y, cardW, gap, h } = TOOL_BAR;
  let activeTool = state.gadgets[0];

  for (let i = 0; i < state.gadgets.length; i++) {
    const t = state.gadgets[i];
    const cx = startX + i * (cardW + gap);
    const empty = t.remaining <= 0;
    const active = state.activeGadgetId === t.id && !empty;
    if (active) activeTool = t;

    ctx.fillStyle = empty ? '#14100d' : active ? '#2b2218' : '#1b1510';
    roundRect(ctx, cx, y, cardW, h, 7);
    ctx.fill();
    ctx.strokeStyle = empty ? 'rgba(150, 134, 110, 0.25)' : active ? t.color : 'rgba(212, 164, 74, 0.48)';
    ctx.lineWidth = active ? 2.2 : 1.3;
    ctx.stroke();

    // Key badge
    ctx.fillStyle = empty ? '#362d24' : t.color;
    roundRect(ctx, cx + 8, y + 8, 20, 20, 4);
    ctx.fill();
    ctx.fillStyle = '#120d09';
    ctx.font = '900 12px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.key, cx + 18, y + 18.5);

    drawToolIcon(ctx, t.id, cx + 42, y + 25, empty ? '#6a5d4e' : t.color);

    ctx.textAlign = 'left';
    ctx.fillStyle = empty ? '#6e6254' : '#faf0d8';
    ctx.font = '800 11px "Trebuchet MS", sans-serif';
    ctx.fillText(t.name, cx + 58, y + 16);

    ctx.fillStyle = empty ? '#5a5046' : '#ffa588';
    ctx.font = '800 10.5px "Trebuchet MS", sans-serif';
    ctx.fillText(`-${formatMoney(t.cost)}`, cx + 58, y + 35);

    for (let c = 0; c < t.charges; c++) {
      ctx.fillStyle = c < t.remaining ? t.color : 'rgba(255, 240, 210, 0.14)';
      ctx.beginPath();
      ctx.arc(cx + cardW - 14 - c * 13, y + 35, 4.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Contextual tool tip & crisp control legend on right side of bottom bar
  const tx = startX + 4 * (cardW + gap) + 12;
  const tw = SCREEN_W - tx - 16;
  ctx.fillStyle = '#140f0c';
  roundRect(ctx, tx, y, tw, h, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(212, 164, 74, 0.42)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = activeTool ? activeTool.color : '#f2cc74';
  ctx.font = '800 10.5px "Trebuchet MS", sans-serif';
  ctx.fillText(`${activeTool ? activeTool.name : 'TOOL'}: ${activeTool ? activeTool.tip : ''}`, tx + 12, y + 9);

  ctx.fillStyle = '#cbbfa4';
  ctx.font = '700 9.5px "Trebuchet MS", sans-serif';
  ctx.fillText('WASD MOVE · SHIFT SNEAK · SPACE COVER · E ACT · 1-4 TOOLS · R RETRY', tx + 12, y + 29);
  ctx.restore();
}

function drawToolIcon(ctx, id, x, y, color) {
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
    ctx.arc(x, y, 6.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * 6.2, y + Math.sin(a) * 6.2);
      ctx.lineTo(x + Math.cos(a) * 9.2, y + Math.sin(a) * 9.2);
      ctx.stroke();
    }
  } else if (id === 'smoke') {
    ctx.beginPath();
    ctx.arc(x - 4, y + 2, 4.4, 0, Math.PI * 2);
    ctx.arc(x + 4, y + 2, 4.1, 0, Math.PI * 2);
    ctx.arc(x, y - 3, 4.8, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(x, y, 6.5, -Math.PI * 0.8, Math.PI * 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 4, y - 6);
    ctx.lineTo(x + 8, y - 3);
    ctx.lineTo(x + 3, y - 1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawFairCaughtBanner(ctx, state) {
  // Non-obstructive lower-edge fair-cause banner leaving 85% of floorplan + crimson sightline 100% visible!
  ctx.save();
  const w = 884;
  const h = 80;
  const x = MAP.x + (MAP.w - w) * 0.5;
  const y = MAP.y + MAP.h - h - 22;

  ctx.fillStyle = 'rgba(28, 10, 14, 0.95)';
  roundRect(ctx, x, y, w, h, 9);
  ctx.fill();
  ctx.strokeStyle = '#ff3e5a';
  ctx.lineWidth = 2.6;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ff5c74';
  ctx.font = '900 17px "Trebuchet MS", sans-serif';
  ctx.fillText('COMPROMISED  ·  ALARM 100%', x + 20, y + 12);

  ctx.fillStyle = '#fdf0d8';
  ctx.font = '800 12.5px "Trebuchet MS", sans-serif';
  ctx.fillText(state.caughtCause || 'SPOTTED BY SECURITY IN OPEN LIGHT', x + 20, y + 36);

  ctx.fillStyle = '#a4dce8';
  ctx.font = '700 10.5px "Trebuchet MS", sans-serif';
  ctx.fillText('CRIMSON SIGHTLINE TRACE ABOVE · USE SHADOW ALCOVES, [1] DECOY OR [3] SMOKE', x + 20, y + 57);

  // Instant Retry brass button
  const bx = x + w - 186;
  const by = y + 18;
  ctx.fillStyle = '#3a2710';
  roundRect(ctx, bx, by, 168, 44, 7);
  ctx.fill();
  ctx.strokeStyle = '#f6c85e';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe89c';
  ctx.font = '900 13.5px "Trebuchet MS", sans-serif';
  ctx.fillText('[R] INSTANT RETRY', bx + 84, by + 22.5);
  ctx.restore();
}

function drawGetawayLedger(ctx, state) {
  const s = state.summary;
  if (!s) return;
  ctx.save();

  // Compact brass ledger placed cleanly between Exit Lift and Stolen Vault so both stay visible!
  const w = 412;
  const h = 312;
  const x = state.loot.x > 640 && state.exit.x < 300 ? MAP.x + 216 : state.exit.x < 450 ? MAP.x + MAP.w - w - 34 : MAP.x + 38;
  const y = MAP.y + (MAP.h - h) * 0.5 + 10;

  ctx.fillStyle = 'rgba(20, 15, 11, 0.94)';
  roundRect(ctx, x, y, w, h, 11);
  ctx.fill();
  ctx.strokeStyle = '#e6b856';
  ctx.lineWidth = 2.8;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 226, 150, 0.34)';
  ctx.lineWidth = 1.1;
  roundRect(ctx, x + 7, y + 7, w - 14, h - 14, 7);
  ctx.stroke();

  ctx.fillStyle = '#48f2a4';
  ctx.font = '900 11px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('GETAWAY PAYOFF · VAULT CLEARED', x + 22, y + 18);

  ctx.fillStyle = '#fcf2da';
  ctx.font = '900 19px "Trebuchet MS", sans-serif';
  ctx.fillText(s.title, x + 22, y + 36);

  // Brass S-Rank Seal
  const sx = x + w - 50;
  const sy = y + 48;
  ctx.fillStyle = '#332309';
  ctx.beginPath();
  ctx.arc(sx, sy, 29, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd962';
  ctx.lineWidth = 2.8;
  ctx.stroke();
  ctx.fillStyle = '#ffe994';
  ctx.font = '900 25px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(s.rank, sx, sy - 3);
  ctx.font = '800 8px "Trebuchet MS", sans-serif';
  ctx.fillText(`RANK ${s.rank}`, sx, sy + 14);

  const rows = [
    ['LOOT SECURED', `+${formatMoney(s.grossLoot)}`, '#ffe17a'],
    ['TOOL EXPENSES', s.toolCost > 0 ? `-${formatMoney(s.toolCost)}` : '$0', s.toolCost > 0 ? '#ff987e' : '#82ffc4'],
    ['GHOST & SPEED BONUS', `+${formatMoney(s.ghostBonus + s.speedBonus)}`, '#6cf0ff'],
    ['PEAK ALARM · TIME', `${s.peakAlarm}% · ${s.elapsed.toFixed(1)}s`, '#e2d6be'],
  ];
  let ry = y + 86;
  for (const [k, v, col] of rows) {
    ctx.fillStyle = 'rgba(42, 33, 24, 0.72)';
    roundRect(ctx, x + 20, ry, w - 40, 24, 5);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#cfc1a6';
    ctx.font = '700 10.5px "Trebuchet MS", sans-serif';
    ctx.fillText(k, x + 30, ry + 12.5);
    ctx.textAlign = 'right';
    ctx.fillStyle = col;
    ctx.font = '900 11.5px "Trebuchet MS", sans-serif';
    ctx.fillText(v, x + w - 30, ry + 12.5);
    ry += 28;
  }

  ctx.fillStyle = '#ffd962';
  ctx.textAlign = 'left';
  ctx.font = '900 13px "Trebuchet MS", sans-serif';
  ctx.fillText('NET TAKE', x + 24, ry + 12);
  ctx.textAlign = 'right';
  ctx.font = '900 22px "Trebuchet MS", sans-serif';
  ctx.fillText(formatMoney(s.netPayout), x + w - 24, ry + 12);

  const my = ry + 34;
  const mw = 122;
  for (let i = 0; i < s.medals.length; i++) {
    const m = s.medals[i];
    const mx = x + 20 + i * (mw + 9);
    ctx.fillStyle = m.earned ? 'rgba(72, 52, 14, 0.94)' : 'rgba(28, 22, 16, 0.85)';
    roundRect(ctx, mx, my, mw, 36, 5);
    ctx.fill();
    ctx.strokeStyle = m.earned ? '#ffd962' : 'rgba(150, 134, 110, 0.32)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = m.earned ? '#ffe892' : '#857766';
    ctx.font = '900 10px "Trebuchet MS", sans-serif';
    ctx.fillText(m.earned ? `★ ${m.label}` : m.label, mx + mw * 0.5, my + 11.5);
    ctx.font = '700 9px "Trebuchet MS", sans-serif';
    ctx.fillStyle = m.earned ? '#fbf0d4' : '#6c6052';
    ctx.fillText(m.detail, mx + mw * 0.5, my + 25.5);
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#92fce0';
  ctx.font = '900 11.5px "Trebuchet MS", sans-serif';
  ctx.fillText('[N] NEXT VAULT     ·     [R] REPLAY', x + w * 0.5, y + h - 18);
  ctx.restore();
}
