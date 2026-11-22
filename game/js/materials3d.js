// Procedural PBR CanvasTexture & material library for all four 3D Three.js vaults.

import * as THREE from '../vendor/three.module.min.js';
import { ARENA } from './vaults.js';

export const WORLD_SCALE = 0.04;
export const ORIGIN_X = 640;
export const ORIGIN_Y = 358;

export function to3D(x, y, elev = 0) {
  return new THREE.Vector3((x - ORIGIN_X) * WORLD_SCALE, elev, (y - ORIGIN_Y) * WORLD_SCALE);
}

export function from3D(wx, wz) {
  return { x: wx / WORLD_SCALE + ORIGIN_X, y: wz / WORLD_SCALE + ORIGIN_Y };
}

export function get3DTheme(theme) {
  if (theme === 'conservatory') {
    return {
      bg: 0x05140f,
      fog: 0x061a14,
      wallHex: 0x1e4033,
      wallTopHex: 0x2c5948,
      trimHex: 0xe2bc62,
      guardCoat: 0x23684b,
      hemiSky: 0xbef5dd,
      hemiGround: 0x172b20,
      dirColor: 0xfff0cc,
      dirInt: 1.55,
      rimColor: 0x52ebb0,
      lootSpot: 0xffe48a,
      floorRough: 0.34,
      floorMetal: 0.16,
      transparentFloor: false,
    };
  }
  if (theme === 'treasury') {
    return {
      bg: 0x12060a,
      fog: 0x16080d,
      wallHex: 0x3b1821,
      wallTopHex: 0x54232f,
      trimHex: 0xe8b654,
      guardCoat: 0x822234,
      hemiSky: 0xffd2c4,
      hemiGround: 0x261015,
      dirColor: 0xffdcb0,
      dirInt: 1.5,
      rimColor: 0xff6258,
      lootSpot: 0xffc66e,
      floorRough: 0.28,
      floorMetal: 0.24,
      transparentFloor: false,
    };
  }
  if (theme === 'spire') {
    return {
      bg: 0x040917,
      fog: 0x050d21,
      wallHex: 0x172a4d,
      wallTopHex: 0x274372,
      trimHex: 0xbde0fa,
      guardCoat: 0x284e8c,
      hemiSky: 0xc2e6ff,
      hemiGround: 0x0d1936,
      dirColor: 0xdff0ff,
      dirInt: 1.65,
      rimColor: 0x4ee6ff,
      lootSpot: 0x9ceeff,
      floorRough: 0.18,
      floorMetal: 0.32,
      transparentFloor: true,
    };
  }
  return {
    bg: 0x060a14,
    fog: 0x070d1a,
    wallHex: 0x1d2942,
    wallTopHex: 0x2f4063,
    trimHex: 0xe6b858,
    guardCoat: 0x2e4e82,
    hemiSky: 0xd6e6ff,
    hemiGround: 0x1a1e30,
    dirColor: 0xffe8c2,
    dirInt: 1.6,
    rimColor: 0x58c4ff,
    lootSpot: 0xffdf7e,
    floorRough: 0.22,
    floorMetal: 0.22,
    transparentFloor: false,
  };
}

let beamAlphaTex = null;

export function getBeamAlphaTexture() {
  if (beamAlphaTex) return beamAlphaTex;
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0.0, 'rgba(0,0,0,0)');
  g.addColorStop(0.28, 'rgba(255,255,255,0.62)');
  g.addColorStop(0.75, 'rgba(255,255,255,1)');
  g.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 128);
  beamAlphaTex = new THREE.CanvasTexture(c);
  return beamAlphaTex;
}

function hash2d(x, y, seed = 1) {
  let n = Math.imul(x * 374761393 + y * 668265263 + seed * 1442695041, 1274126177);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}

const floorMatCache = new Map();
let wallTexCache = null;

export function getWallTexture() {
  if (wallTexCache) return wallTexCache;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#d4dae6';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle vertical Art-Deco fluted marble panels & subtle horizontal brass band
  for (let x = 0; x < 256; x += 32) {
    const g = ctx.createLinearGradient(x, 0, x + 32, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.16)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.12)');
    g.addColorStop(1, 'rgba(0,0,0,0.16)');
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, 32, 256);
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.fillRect(0, 212, 256, 44);
  ctx.fillStyle = 'rgba(255, 224, 146, 0.55)';
  ctx.fillRect(0, 206, 256, 6);
  ctx.fillRect(0, 24, 256, 5);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  wallTexCache = tex;
  return tex;
}

export function getFloorMaterials(vault) {
  if (floorMatCache.has(vault.id)) return floorMatCache.get(vault.id);
  const spec = get3DTheme(vault.theme);

  const cw = 1024;
  const ch = 512;
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = cw;
  diffCanvas.height = ch;
  const ctx = diffCanvas.getContext('2d');

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = 512;
  roughCanvas.height = 256;
  const rctx = roughCanvas.getContext('2d');
  rctx.fillStyle = '#525252';
  rctx.fillRect(0, 0, 512, 256);

  const sx = cw / ARENA.w;
  const sy = ch / ARENA.h;
  const toU = (x) => (x - ARENA.x) * sx;
  const toV = (y) => (y - ARENA.y) * sy;

  if (vault.theme === 'conservatory') paintConservatoryTex(ctx, rctx, cw, ch, toU, toV, sx, sy);
  else if (vault.theme === 'treasury') paintTreasuryTex(ctx, rctx, cw, ch, toU, toV, vault);
  else if (vault.theme === 'spire') paintSpireTex(ctx, rctx, cw, ch, toU, toV, vault);
  else paintAtriumTex(ctx, rctx, cw, ch, toU, toV, vault);

  // Luxury velvet carpets with braided gold borders (higher roughness = matte plush velvet!)
  for (const cp of vault.carpets || []) {
    const cx = toU(cp.x);
    const cy = toV(cp.y);
    const w = cp.w * sx;
    const h = cp.h * sy;
    ctx.fillStyle = cp.color;
    ctx.fillRect(cx, cy, w, h);
    ctx.strokeStyle = cp.trim;
    ctx.lineWidth = 3;
    ctx.strokeRect(cx + 3, cy + 3, w - 6, h - 6);
    ctx.strokeStyle = 'rgba(255, 236, 178, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(cx + 8, cy + 8, w - 16, h - 16);

    rctx.fillStyle = '#d4d4d4';
    rctx.fillRect(cx * 0.5, cy * 0.5, w * 0.5, h * 0.5);
  }

  // Crisp gold-dashed patrol loop guide arrows cleanly inlaid on the floor
  ctx.save();
  ctx.strokeStyle = 'rgba(248, 206, 108, 0.28)';
  ctx.lineWidth = 2.2;
  ctx.setLineDash([8, 10]);
  for (const g of vault.guards) {
    const wps = g.waypoints;
    if (!wps || wps.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(toU(wps[0].x), toV(wps[0].y));
    for (let i = 1; i < wps.length; i++) ctx.lineTo(toU(wps[i].x), toV(wps[i].y));
    ctx.closePath();
    ctx.stroke();

    // Crisp directional arrowheads on segment midpoints
    ctx.fillStyle = 'rgba(255, 214, 118, 0.55)';
    for (let i = 0; i < wps.length; i++) {
      const a = wps[i];
      const b = wps[(i + 1) % wps.length];
      const mx = toU((a.x + b.x) * 0.5);
      const my = toV((a.y + b.y) * 0.5);
      const ang = Math.atan2((b.y - a.y) * sy, (b.x - a.x) * sx);
      ctx.beginPath();
      ctx.moveTo(mx + Math.cos(ang) * 7, my + Math.sin(ang) * 7);
      ctx.lineTo(mx + Math.cos(ang + 2.4) * 5.5, my + Math.sin(ang + 2.4) * 5.5);
      ctx.lineTo(mx + Math.cos(ang - 2.4) * 5.5, my + Math.sin(ang - 2.4) * 5.5);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();

  const map = new THREE.CanvasTexture(diffCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;

  const roughMap = new THREE.CanvasTexture(roughCanvas);
  roughMap.anisotropy = 4;

  const mat = new THREE.MeshStandardMaterial({
    map,
    roughnessMap: roughMap,
    bumpMap: roughMap,
    bumpScale: 0.04,
    roughness: spec.floorRough,
    metalness: spec.floorMetal,
    transparent: spec.transparentFloor,
    opacity: spec.transparentFloor ? 0.78 : 1.0,
  });

  floorMatCache.set(vault.id, mat);
  return mat;
}

function paintAtriumTex(ctx, rctx, cw, ch, toU, toV, vault) {
  const cols = 22;
  const rows = 11;
  const tw = cw / cols;
  const th = ch / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = hash2d(c, r, 11);
      const alt = (c + r) % 2 === 0;
      ctx.fillStyle = alt
        ? `rgb(${24 + Math.floor(v * 10)}, ${34 + Math.floor(v * 12)}, ${56 + Math.floor(v * 14)})`
        : `rgb(${36 + Math.floor(v * 12)}, ${50 + Math.floor(v * 14)}, ${78 + Math.floor(v * 16)})`;
      ctx.fillRect(c * tw, r * th, tw, th);

      // Marble mineral vein
      ctx.strokeStyle = alt ? 'rgba(210, 226, 255, 0.11)' : 'rgba(248, 214, 134, 0.12)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(c * tw + v * 16, r * th + hash2d(c, r, 23) * th);
      ctx.quadraticCurveTo(c * tw + tw * 0.55, r * th + th * 0.4, c * tw + tw - v * 10, r * th + (1 - v) * th);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(8, 12, 22, 0.55)';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(c * tw, r * th, tw, th);

      // Gold diamond tile pin
      ctx.fillStyle = 'rgba(238, 194, 96, 0.45)';
      ctx.beginPath();
      ctx.moveTo(c * tw, r * th - 3.5);
      ctx.lineTo(c * tw + 3.5, r * th);
      ctx.lineTo(c * tw, r * th + 3.5);
      ctx.lineTo(c * tw - 3.5, r * th);
      ctx.closePath();
      ctx.fill();

      rctx.fillStyle = alt ? '#363636' : '#4a4a4a';
      rctx.fillRect(c * tw * 0.5, r * th * 0.5, tw * 0.5, th * 0.5);
    }
  }

  // Grand golden Art-Deco compass rose centerpiece
  const cx = toU(vault.loot.x);
  const cy = toV(vault.loot.y);
  ctx.save();
  ctx.translate(cx, cy);
  const grad = ctx.createRadialGradient(0, 0, 12, 0, 0, 152);
  grad.addColorStop(0, 'rgba(252, 206, 94, 0.34)');
  grad.addColorStop(0.6, 'rgba(182, 136, 48, 0.12)');
  grad.addColorStop(1, 'rgba(20, 30, 50, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, 152, 0, Math.PI * 2);
  ctx.fill();

  for (const rad of [48, 86, 128, 142]) {
    ctx.strokeStyle = rad === 128 ? 'rgba(248, 202, 98, 0.58)' : 'rgba(232, 184, 84, 0.32)';
    ctx.lineWidth = rad === 128 ? 2.6 : 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, rad, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const major = i % 2 === 0;
    ctx.fillStyle = major ? 'rgba(248, 204, 102, 0.32)' : 'rgba(166, 206, 250, 0.16)';
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (major ? 124 : 92), Math.sin(a) * (major ? 124 : 92));
    ctx.lineTo(Math.cos(a + 0.11) * 38, Math.sin(a + 0.11) * 38);
    ctx.lineTo(Math.cos(a - 0.11) * 38, Math.sin(a - 0.11) * 38);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function paintConservatoryTex(ctx, rctx, cw, ch, toU, toV, sx, sy) {
  // Emerald jade terrace stone
  const cols = 24;
  const rows = 12;
  const tw = cw / cols;
  const th = ch / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = hash2d(c, r, 31);
      ctx.fillStyle = (c + r) % 2 === 0
        ? `rgb(${22 + Math.floor(v * 10)}, ${62 + Math.floor(v * 14)}, ${50 + Math.floor(v * 12)})`
        : `rgb(${28 + Math.floor(v * 10)}, ${74 + Math.floor(v * 14)}, ${60 + Math.floor(v * 12)})`;
      ctx.fillRect(c * tw, r * th, tw, th);
      ctx.strokeStyle = 'rgba(8, 26, 20, 0.45)';
      ctx.strokeRect(c * tw, r * th, tw, th);
    }
  }

  // Warm walnut herringbone parquet court
  const px = toU(328);
  const py = toV(88);
  const pw = 624 * sx;
  const ph = 540 * sy;
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();
  const plankW = 34;
  const plankH = 14;
  for (let gy = py; gy < py + ph + plankH; gy += plankH) {
    const row = Math.floor((gy - py) / plankH);
    const shift = (row % 2) * (plankW * 0.5);
    for (let gx = px - plankW; gx < px + pw + plankW; gx += plankW) {
      const col = Math.floor((gx - px) / plankW);
      const v = hash2d(col, row, 47);
      ctx.fillStyle = `rgb(${84 + Math.floor(v * 28)}, ${56 + Math.floor(v * 18)}, ${34 + Math.floor(v * 12)})`;
      ctx.fillRect(gx + shift, gy, plankW - 1.5, plankH - 1.5);
      ctx.fillStyle = 'rgba(245, 204, 134, 0.1)';
      ctx.fillRect(gx + shift + 2, gy + 2, plankW - 6, 3);
    }
  }
  ctx.restore();
  ctx.strokeStyle = '#e4c064';
  ctx.lineWidth = 3.5;
  ctx.strokeRect(px, py, pw, ph);
  rctx.fillStyle = '#6e6e6e';
  rctx.fillRect(px * 0.5, py * 0.5, pw * 0.5, ph * 0.5);
}

function paintTreasuryTex(ctx, rctx, cw, ch, toU, toV, vault) {
  ctx.fillStyle = '#24141a';
  ctx.fillRect(0, 0, cw, ch);

  const d = 38;
  for (let row = -2; row < Math.ceil(ch / d) + 3; row++) {
    for (let col = -2; col < Math.ceil(cw / d) + 3; col++) {
      const cx = col * d + (row % 2 === 0 ? 0 : d * 0.5);
      const cy = row * d;
      const v = hash2d(col, row, 71);
      const red = (col + row) % 3 === 0;
      ctx.fillStyle = red
        ? `rgb(${64 + Math.floor(v * 18)}, ${28 + Math.floor(v * 10)}, ${36 + Math.floor(v * 12)})`
        : `rgb(${40 + Math.floor(v * 14)}, ${34 + Math.floor(v * 10)}, ${46 + Math.floor(v * 12)})`;
      ctx.beginPath();
      ctx.moveTo(cx, cy - d * 0.5);
      ctx.lineTo(cx + d * 0.5, cy);
      ctx.lineTo(cx, cy + d * 0.5);
      ctx.lineTo(cx - d * 0.5, cy);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(232, 176, 82, 0.22)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  // Steel vault floor ribs
  ctx.strokeStyle = 'rgba(176, 152, 164, 0.34)';
  ctx.lineWidth = 2.4;
  for (let x = 64; x < cw; x += 112) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ch);
    ctx.stroke();
  }
  const cx = toU(vault.loot.x);
  const cy = toV(vault.loot.y);
  ctx.strokeStyle = 'rgba(250, 194, 82, 0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 78, 0, Math.PI * 2);
  ctx.stroke();
  rctx.fillStyle = '#404040';
  rctx.fillRect(0, 0, 512, 256);
}

function paintSpireTex(ctx, rctx, cw, ch, toU, toV, vault) {
  const g = ctx.createRadialGradient(toU(vault.loot.x), toV(vault.loot.y), 24, cw * 0.5, ch * 0.5, cw * 0.72);
  g.addColorStop(0, '#1c3a74');
  g.addColorStop(0.6, '#0f2249');
  g.addColorStop(1, '#091430');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cw, ch);

  const step = 48;
  ctx.strokeStyle = 'rgba(154, 218, 255, 0.22)';
  ctx.lineWidth = 1.2;
  for (let x = 0; x <= cw; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ch);
    ctx.stroke();
  }
  for (let y = 0; y <= ch; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(cw, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(210, 238, 255, 0.35)';
  ctx.lineWidth = 2;
  for (const r of [90, 175, 270]) {
    ctx.beginPath();
    ctx.arc(toU(vault.loot.x), toV(vault.loot.y), r, 0, Math.PI * 2);
    ctx.stroke();
  }
  rctx.fillStyle = '#282828';
  rctx.fillRect(0, 0, 512, 256);
}
