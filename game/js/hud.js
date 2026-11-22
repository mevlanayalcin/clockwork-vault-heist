// Sleek compact Art-Deco glassmorphic HUD, vector gadget dock, and S-rank debrief card.

import { WORLD_H, WORLD_W } from './vaults.js';
import { getAlarmTier } from './guards.js';

export const DOCK_BOUNDS = { x: 332, y: 662, cardW: 148, gap: 8, h: 52 };

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

export function drawHud(ctx, state, audioMuted) {
  ctx.save();

  // Top-left compact Vault & Loot plate
  ctx.fillStyle = 'rgba(10, 16, 28, 0.88)';
  roundRectPath(ctx, 28, 7, 360, 46, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(224, 178, 86, 0.82)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.fillStyle = '#f4d27e';
  ctx.font = '800 10.5px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`VAULT ${state.vaultIndex + 1}/${state.vaultCount} · ${state.vault.title}`, 40, 13);

  const lootLine = state.lootSecured
    ? `LOOT ${formatMoney(state.collectedValue)} SECURED ✓`
    : `TARGET ${formatMoney(state.vault.loot.value)} · NET ${formatMoney(Math.max(0, state.vault.loot.value - state.toolSpent))}`;
  ctx.fillStyle = state.lootSecured ? '#ffe06e' : '#e6eff8';
  ctx.font = '800 13px "Trebuchet MS", sans-serif';
  ctx.fillText(lootLine, 40, 29);

  if (state.toolSpent > 0) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ff9882';
    ctx.font = '800 10.5px "Trebuchet MS", sans-serif';
    ctx.fillText(`-${formatMoney(state.toolSpent)}`, 376, 31);
  }

  // Top-center HUGE crystal-clear Segmented ALARM METER
  const tier = getAlarmTier(state.alarm);
  const ax = 414;
  const ay = 5;
  const aw = 452;
  const ah = 50;
  ctx.fillStyle = 'rgba(9, 15, 26, 0.94)';
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
    ctx.fillStyle = active ? col : 'rgba(255, 255, 255, 0.09)';
    roundRectPath(ctx, sx, by, segW, bh, 2.5);
    ctx.fill();
  }

  // Top-right compact Timer & Controls strip
  ctx.fillStyle = 'rgba(10, 16, 28, 0.88)';
  roundRectPath(ctx, 892, 7, 360, 46, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(224, 178, 86, 0.82)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#cde2f5';
  ctx.font = '700 10px "Trebuchet MS", sans-serif';
  ctx.fillText('WASD MOVE · SPACE COVER · SHIFT DASH', 904, 13);
  ctx.fillStyle = '#f2cc74';
  ctx.fillText(`E BREACH/VENT · 1-4 GADGETS · R RETRY · ${audioMuted ? 'MUTE' : 'SFX'}`, 904, 30);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#fdf4dc';
  ctx.font = '900 15px "Trebuchet MS", sans-serif';
  ctx.fillText(`${state.elapsed.toFixed(1)}s`, 1240, 13);

  // Bottom-center slim floating Glassmorphic Gadget Dock (no oversized legend clutter!)
  drawGadgetDock(ctx, state);
  ctx.restore();
}

function drawGadgetDock(ctx, state) {
  const { x: startX, y, cardW, gap, h } = DOCK_BOUNDS;
  const totalW = cardW * 4 + gap * 3 + 16;

  // Slim translucent dock backing
  ctx.fillStyle = 'rgba(8, 13, 24, 0.86)';
  roundRectPath(ctx, startX - 8, y - 4, totalW, h + 8, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(218, 174, 86, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  for (let i = 0; i < state.gadgets.length; i++) {
    const t = state.gadgets[i];
    const cx = startX + i * (cardW + gap);
    const empty = t.remaining <= 0;
    const active = state.activeGadgetId === t.id && !empty;

    ctx.fillStyle = empty ? 'rgba(14, 20, 32, 0.72)' : active ? 'rgba(24, 40, 62, 0.95)' : 'rgba(15, 25, 40, 0.92)';
    roundRectPath(ctx, cx, y, cardW, h, 7);
    ctx.fill();
    ctx.strokeStyle = empty ? 'rgba(120, 136, 154, 0.25)' : active ? t.color : 'rgba(218, 174, 86, 0.45)';
    ctx.lineWidth = active ? 2 : 1.3;
    ctx.stroke();

    // Key badge
    ctx.fillStyle = empty ? '#243245' : t.color;
    roundRectPath(ctx, cx + 6, y + 6, 18, 18, 4);
    ctx.fill();
    ctx.fillStyle = '#08121f';
    ctx.font = '900 11px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t.key, cx + 15, y + 15.5);

    // Vector gadget icon
    drawGadgetIcon(ctx, t.id, cx + 38, y + 26, empty ? '#5a6a7d' : t.color);

    // Label & cost
    ctx.textAlign = 'left';
    ctx.fillStyle = empty ? '#637487' : '#f8f0da';
    ctx.font = '800 12px "Trebuchet MS", sans-serif';
    ctx.fillText(t.name, cx + 54, y + 17);

    ctx.fillStyle = empty ? '#516072' : '#ffa788';
    ctx.font = '800 10px "Trebuchet MS", sans-serif';
    ctx.fillText(`-${formatMoney(t.cost)}`, cx + 54, y + 36);

    // Charge pips
    for (let c = 0; c < t.charges; c++) {
      ctx.fillStyle = c < t.remaining ? t.color : 'rgba(255, 255, 255, 0.14)';
      ctx.beginPath();
      ctx.arc(cx + cardW - 12 - c * 12, y + 36, 4.2, 0, Math.PI * 2);
      ctx.fill();
    }
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

  // Soft minimal veil so lush floor, cyan-gold route trace, guards, and lift stay dramatically visible!
  ctx.fillStyle = 'rgba(5, 10, 19, 0.28)';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  // Compact ~41% width glassmorphic Art-Deco debrief card
  const w = 516;
  const h = 326;
  const x = (WORLD_W - w) * 0.5;
  const y = (WORLD_H - h) * 0.5 + 8;

  ctx.fillStyle = 'rgba(10, 18, 32, 0.90)';
  roundRectPath(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = '#e8ba58';
  ctx.lineWidth = 2.8;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 224, 148, 0.32)';
  ctx.lineWidth = 1.1;
  roundRectPath(ctx, x + 7, y + 7, w - 14, h - 14, 8);
  ctx.stroke();

  ctx.fillStyle = '#40f6aa';
  ctx.font = '900 11.5px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('GETAWAY COMPLETE · LIVE ROUTE LOGGED', x + 24, y + 18);

  ctx.fillStyle = '#fdf4da';
  ctx.font = '900 22px "Trebuchet MS", sans-serif';
  ctx.fillText(s.title, x + 24, y + 36);

  // Gilded Rank Seal
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
    ctx.fillStyle = 'rgba(22, 38, 62, 0.72)';
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

  // 3 Gold Medals
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
