// Cached procedural offscreen-canvas floor & architectural material generator (60fps, deterministic).

import { ARENA, WORLD_H, WORLD_W } from './vaults.js';

const floorCache = new Map();

export function getThemePalette(theme) {
  if (theme === 'conservatory') {
    return {
      bg: '#061511',
      wallSide: '#112a22',
      wallTop: '#24493c',
      wallTrim: '#dfba62',
      wallHighlight: '#f8e09b',
      guardCoat: '#1e4a38',
      guardTrim: '#e3c064',
      ambientVignette: 'rgba(2, 14, 10, 0.44)',
      conduitIdle: '#3cf0c8',
    };
  }
  if (theme === 'treasury') {
    return {
      bg: '#14080c',
      wallSide: '#2c1319',
      wallTop: '#4a212b',
      wallTrim: '#e5b254',
      wallHighlight: '#ffdf9a',
      guardCoat: '#5c1d28',
      guardTrim: '#edc068',
      ambientVignette: 'rgba(16, 3, 6, 0.46)',
      conduitIdle: '#ff9052',
    };
  }
  if (theme === 'spire') {
    return {
      bg: '#050b1a',
      wallSide: '#111e38',
      wallTop: '#243a63',
      wallTrim: '#b8dcf6',
      wallHighlight: '#e8f6ff',
      guardCoat: '#223862',
      guardTrim: '#c8e4fb',
      ambientVignette: 'rgba(2, 6, 18, 0.46)',
      conduitIdle: '#6ce2ff',
    };
  }
  return {
    bg: '#070b14',
    wallSide: '#161f33',
    wallTop: '#293754',
    wallTrim: '#dfb054',
    wallHighlight: '#fce29e',
    guardCoat: '#243554',
    guardTrim: '#e8be66',
    ambientVignette: 'rgba(4, 7, 15, 0.44)',
    conduitIdle: '#4ee6ff',
  };
}

function hash2d(x, y, seed = 1) {
  let n = Math.imul(x * 374761393 + y * 668265263 + seed * 1442695041, 1274126177);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}

export function getVaultFloorCanvas(vault) {
  if (floorCache.has(vault.id)) return floorCache.get(vault.id);
  const canvas = document.createElement('canvas');
  canvas.width = WORLD_W;
  canvas.height = WORLD_H;
  const ctx = canvas.getContext('2d');

  ctx.save();
  ctx.beginPath();
  ctx.rect(ARENA.x + 12, ARENA.y + 12, ARENA.w - 24, ARENA.h - 24);
  ctx.clip();

  if (vault.theme === 'conservatory') paintConservatoryFloor(ctx, vault);
  else if (vault.theme === 'treasury') paintTreasuryFloor(ctx, vault);
  else if (vault.theme === 'spire') paintSpireFloor(ctx, vault);
  else paintAtriumFloor(ctx, vault);

  paintCarpets(ctx, vault.carpets || []);
  paintLightPools(ctx, vault.chandeliers || []);
  if (vault.theme === 'conservatory') paintSkylightBeams(ctx);
  paintPerimeterAO(ctx);

  ctx.restore();
  floorCache.set(vault.id, canvas);
  return canvas;
}

function paintAtriumFloor(ctx, vault) {
  const { x, y, w, h } = ARENA;
  const tile = 54;
  for (let ty = y; ty < y + h; ty += tile) {
    for (let tx = x; tx < x + w; tx += tile) {
      const ix = Math.floor((tx - x) / tile);
      const iy = Math.floor((ty - y) / tile);
      const alt = (ix + iy) % 2 === 0;
      const v = hash2d(ix, iy, 11);
      ctx.fillStyle = alt
        ? `rgb(${16 + Math.floor(v * 7)}, ${24 + Math.floor(v * 9)}, ${41 + Math.floor(v * 11)})`
        : `rgb(${23 + Math.floor(v * 8)}, ${34 + Math.floor(v * 10)}, ${56 + Math.floor(v * 12)})`;
      ctx.fillRect(tx, ty, tile, tile);

      // Subtle polished marble mineral vein
      ctx.strokeStyle = alt ? 'rgba(186, 206, 238, 0.06)' : 'rgba(232, 198, 126, 0.065)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const vx1 = tx + v * 22;
      const vy1 = ty + hash2d(ix, iy, 23) * tile;
      ctx.moveTo(vx1, vy1);
      ctx.quadraticCurveTo(tx + tile * 0.55, ty + tile * 0.45, tx + tile - v * 14, ty + (1 - v) * tile);
      ctx.stroke();

      // Grout seam & gilded corner diamond pin
      ctx.strokeStyle = 'rgba(7, 11, 20, 0.55)';
      ctx.lineWidth = 1;
      ctx.strokeRect(tx + 0.5, ty + 0.5, tile - 1, tile - 1);

      ctx.fillStyle = 'rgba(222, 178, 86, 0.34)';
      ctx.beginPath();
      ctx.moveTo(tx, ty - 3);
      ctx.lineTo(tx + 3, ty);
      ctx.lineTo(tx, ty + 3);
      ctx.lineTo(tx - 3, ty);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Grand golden Art-Deco compass rose floor inlay under the Chronometer
  const cx = vault.loot.x;
  const cy = vault.loot.y;
  ctx.save();
  ctx.translate(cx, cy);
  const grad = ctx.createRadialGradient(0, 0, 18, 0, 0, 184);
  grad.addColorStop(0, 'rgba(248, 200, 88, 0.28)');
  grad.addColorStop(0.6, 'rgba(182, 134, 48, 0.11)');
  grad.addColorStop(1, 'rgba(20, 30, 50, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, 184, 0, Math.PI * 2);
  ctx.fill();

  for (const r of [56, 98, 146, 162]) {
    ctx.strokeStyle = r === 146 ? 'rgba(244, 198, 98, 0.46)' : 'rgba(226, 180, 84, 0.28)';
    ctx.lineWidth = r === 146 ? 2.4 : 1.3;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const major = i % 2 === 0;
    ctx.fillStyle = major ? 'rgba(236, 194, 98, 0.22)' : 'rgba(162, 198, 240, 0.12)';
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (major ? 144 : 108), Math.sin(a) * (major ? 144 : 108));
    ctx.lineTo(Math.cos(a + 0.11) * 44, Math.sin(a + 0.11) * 44);
    ctx.lineTo(Math.cos(a - 0.11) * 44, Math.sin(a - 0.11) * 44);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function paintConservatoryFloor(ctx, vault) {
  const { x, y, w, h } = ARENA;
  // Deep jade stone terrace base
  const tile = 48;
  for (let ty = y; ty < y + h; ty += tile) {
    for (let tx = x; tx < x + w; tx += tile) {
      const ix = Math.floor((tx - x) / tile);
      const iy = Math.floor((ty - y) / tile);
      const v = hash2d(ix, iy, 31);
      ctx.fillStyle = (ix + iy) % 2 === 0
        ? `rgb(${15 + Math.floor(v * 7)}, ${42 + Math.floor(v * 11)}, ${36 + Math.floor(v * 9)})`
        : `rgb(${19 + Math.floor(v * 8)}, ${50 + Math.floor(v * 11)}, ${42 + Math.floor(v * 9)})`;
      ctx.fillRect(tx, ty, tile, tile);
      ctx.strokeStyle = 'rgba(7, 20, 16, 0.45)';
      ctx.strokeRect(tx + 0.5, ty + 0.5, tile - 1, tile - 1);
    }
  }

  // Warm walnut herringbone parquet center court
  const px = 330;
  const py = 92;
  const pw = 620;
  const ph = 532;
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();
  ctx.fillStyle = '#332319';
  ctx.fillRect(px, py, pw, ph);

  const plankW = 36;
  const plankH = 14;
  for (let gy = py - 20; gy < py + ph + 20; gy += plankH) {
    const row = Math.floor((gy - py) / plankH);
    const shift = (row % 2) * (plankW * 0.5);
    for (let gx = px - plankW; gx < px + pw + plankW; gx += plankW) {
      const col = Math.floor((gx - px) / plankW);
      const v = hash2d(col, row, 47);
      const r = 56 + Math.floor(v * 20);
      const g = 38 + Math.floor(v * 14);
      const b = 25 + Math.floor(v * 10);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(gx + shift, gy, plankW - 1.5, plankH - 1.5);
      // Warm wood sheen streak
      ctx.fillStyle = 'rgba(232, 188, 120, 0.06)';
      ctx.fillRect(gx + shift + 2, gy + 2, plankW - 6, 3);
    }
  }
  ctx.restore();

  // Gilded brass border framing the parquet court
  ctx.strokeStyle = '#d9b55c';
  ctx.lineWidth = 3;
  ctx.strokeRect(px, py, pw, ph);
  ctx.strokeStyle = 'rgba(236, 208, 128, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 6, py + 6, pw - 12, ph - 12);

  // Botanical mosaic medallion under loot
  const cx = vault.loot.x;
  const cy = vault.loot.y;
  ctx.strokeStyle = 'rgba(92, 232, 178, 0.28)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 62, 0, Math.PI * 2);
  ctx.stroke();
}

function paintSkylightBeams(ctx) {
  ctx.save();
  const beams = [
    { x: 180, w: 120, a: 0.085 },
    { x: 470, w: 145, a: 0.10 },
    { x: 785, w: 130, a: 0.085 },
  ];
  for (const b of beams) {
    const grad = ctx.createLinearGradient(b.x, ARENA.y, b.x + 210, ARENA.y + ARENA.h);
    grad.addColorStop(0, `rgba(218, 255, 224, ${b.a * 1.4})`);
    grad.addColorStop(0.55, `rgba(176, 248, 204, ${b.a})`);
    grad.addColorStop(1, 'rgba(130, 230, 182, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(b.x, ARENA.y);
    ctx.lineTo(b.x + b.w, ARENA.y);
    ctx.lineTo(b.x + b.w + 220, ARENA.y + ARENA.h);
    ctx.lineTo(b.x + 220, ARENA.y + ARENA.h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function paintTreasuryFloor(ctx, vault) {
  const { x, y, w, h } = ARENA;
  ctx.fillStyle = '#1b1116';
  ctx.fillRect(x, y, w, h);

  // Dark slate & burnished crimson diamond mosaic
  const d = 44;
  for (let row = -2; row < Math.ceil(h / d) + 3; row++) {
    for (let col = -2; col < Math.ceil(w / d) + 3; col++) {
      const cx = x + col * d + (row % 2 === 0 ? 0 : d * 0.5);
      const cy = y + row * d;
      const v = hash2d(col, row, 71);
      const redTone = (col + row) % 3 === 0;
      ctx.fillStyle = redTone
        ? `rgb(${44 + Math.floor(v * 14)}, ${20 + Math.floor(v * 8)}, ${26 + Math.floor(v * 9)})`
        : `rgb(${29 + Math.floor(v * 10)}, ${24 + Math.floor(v * 8)}, ${32 + Math.floor(v * 10)})`;
      ctx.beginPath();
      ctx.moveTo(cx, cy - d * 0.5);
      ctx.lineTo(cx + d * 0.5, cy);
      ctx.lineTo(cx, cy + d * 0.5);
      ctx.lineTo(cx - d * 0.5, cy);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(214, 162, 74, 0.14)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // Reinforced steel vault corridor ribbing
  ctx.strokeStyle = 'rgba(136, 118, 128, 0.24)';
  ctx.lineWidth = 2;
  for (let rx = x + 64; rx < x + w - 40; rx += 128) {
    ctx.beginPath();
    ctx.moveTo(rx, y + 16);
    ctx.lineTo(rx, y + h - 16);
    ctx.stroke();
  }

  // Imperial sunburst ring around central vault
  const cx = vault.loot.x;
  const cy = vault.loot.y;
  ctx.strokeStyle = 'rgba(235, 178, 72, 0.34)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(cx, cy, 86, 0, Math.PI * 2);
  ctx.stroke();
}

function paintSpireFloor(ctx, vault) {
  const { x, y, w, h } = ARENA;
  const bg = ctx.createRadialGradient(vault.loot.x, vault.loot.y, 40, WORLD_W * 0.5, WORLD_H * 0.5, 760);
  bg.addColorStop(0, '#12264d');
  bg.addColorStop(0.6, '#0b1834');
  bg.addColorStop(1, '#070f24');
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);

  // Brushed sapphire glass deck tiles
  const tile = 60;
  for (let ty = y; ty < y + h; ty += tile) {
    for (let tx = x; tx < x + w; tx += tile) {
      ctx.strokeStyle = 'rgba(138, 206, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(tx + 0.5, ty + 0.5, tile - 1, tile - 1);
    }
  }

  // Astronomical meridian arcs
  ctx.strokeStyle = 'rgba(182, 224, 255, 0.2)';
  ctx.lineWidth = 1.4;
  for (const r of [110, 210, 320, 440]) {
    ctx.beginPath();
    ctx.arc(vault.loot.x, vault.loot.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function paintCarpets(ctx, carpets) {
  for (const c of carpets) {
    ctx.save();
    // Grounded carpet shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.fillRect(c.x + 3, c.y + 4, c.w, c.h);

    // Velvet body
    const g = ctx.createLinearGradient(c.x, c.y, c.x + c.w, c.y + c.h);
    g.addColorStop(0, c.color);
    g.addColorStop(0.5, shadeHex(c.color, 14));
    g.addColorStop(1, c.color);
    ctx.fillStyle = g;
    ctx.fillRect(c.x, c.y, c.w, c.h);

    // Double gold Art-Deco runner borders
    ctx.strokeStyle = c.trim;
    ctx.lineWidth = 2.4;
    ctx.strokeRect(c.x + 3, c.y + 3, c.w - 6, c.h - 6);
    ctx.strokeStyle = 'rgba(255, 232, 168, 0.42)';
    ctx.lineWidth = 1;
    ctx.strokeRect(c.x + 8, c.y + 8, c.w - 16, c.h - 16);
    ctx.restore();
  }
}

function paintLightPools(ctx, pools) {
  for (const p of pools) {
    const g = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, p.r);
    g.addColorStop(0, p.color);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintPerimeterAO(ctx) {
  const { x, y, w, h } = ARENA;
  const depth = 36;
  const top = ctx.createLinearGradient(0, y + 14, 0, y + 14 + depth);
  top.addColorStop(0, 'rgba(0, 0, 0, 0.56)');
  top.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = top;
  ctx.fillRect(x + 14, y + 14, w - 28, depth);

  const bot = ctx.createLinearGradient(0, y + h - 14, 0, y + h - 14 - depth);
  bot.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
  bot.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = bot;
  ctx.fillRect(x + 14, y + h - 14 - depth, w - 28, depth);

  const lft = ctx.createLinearGradient(x + 14, 0, x + 14 + depth, 0);
  lft.addColorStop(0, 'rgba(0, 0, 0, 0.48)');
  lft.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = lft;
  ctx.fillRect(x + 14, y + 14, depth, h - 28);

  const rgt = ctx.createLinearGradient(x + w - 14, 0, x + w - 14 - depth, 0);
  rgt.addColorStop(0, 'rgba(0, 0, 0, 0.48)');
  rgt.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = rgt;
  ctx.fillRect(x + w - 14 - depth, y + 14, depth, h - 28);
}

function shadeHex(hex, delta) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, ((n >> 16) & 255) + delta));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 255) + delta));
  const b = Math.min(255, Math.max(0, (n & 255) + delta));
  return `rgb(${r},${g},${b})`;
}
