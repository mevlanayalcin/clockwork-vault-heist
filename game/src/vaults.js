// Five hand-crafted multi-route Art-Deco museum vaults inside the full-bleed 984x604 floorplan.

export const SCREEN_W = 1280;
export const SCREEN_H = 720;
export const TOP_H = 52;
export const BOT_H = 64;
export const SIDE_W = 296;
export const MAP = { x: 0, y: TOP_H, w: SCREEN_W - SIDE_W, h: SCREEN_H - TOP_H - BOT_H, wall: 18 };
// Walkable interior: x 18..966 (948px), y 70..638 (568px)

export function getVaultCount() {
  return VAULTS.length;
}

export function getVaultMetaList() {
  return VAULTS.map((v, i) => ({ index: i, numeral: v.numeral, short: v.short, title: v.title, value: v.loot.value }));
}

export function buildPerimeterWalls() {
  const { x, y, w, h, wall: t } = MAP;
  return [
    { x, y, w, h: t, perimeter: true },
    { x, y: y + h - t, w, h: t, perimeter: true },
    { x, y, w: t, h, perimeter: true },
    { x: x + w - t, y, w: t, h, perimeter: true },
  ];
}

export function getVault(index) {
  const src = VAULTS[((index % VAULTS.length) + VAULTS.length) % VAULTS.length];
  return structuredClone(src);
}

const VAULTS = [
  {
    id: 'v1', index: 0, numeral: 'I', short: 'ATRIUM', theme: 'atrium',
    title: 'THE HOROLOGY ATRIUM', parTime: 42,
    spawn: { x: 64, y: 586, angle: -0.45 },
    exit: { x: 912, y: 122, radius: 28 },
    loot: { id: 'l1', x: 492, y: 354, radius: 24, kind: 'chronometer', name: 'ASTRAL CHRONOMETER', value: 420000, crackTime: 0.9 },
    bonuses: [{ id: 'b1', x: 912, y: 584, radius: 15, name: 'GOLD LEDGER', value: 95000, crackTime: 0.5 }],
    carpets: [
      { x: 242, y: 324, w: 500, h: 60, color: '#6b1c2a', trim: '#dfaf54' },
      { x: 462, y: 112, w: 60, h: 484, color: '#6b1c2a', trim: '#dfaf54' },
      { x: 760, y: 98, w: 186, h: 48, color: '#1b4a3a', trim: '#6ae0b2' },
    ],
    sconces: [
      { x: 492, y: 354, r: 195 }, { x: 145, y: 354, r: 145 }, { x: 850, y: 354, r: 155 },
      { x: 350, y: 140, r: 120 }, { x: 650, y: 560, r: 130 },
    ],
    walls: [
      { x: 214, y: 70, w: 18, h: 170 }, { x: 214, y: 446, w: 18, h: 114 },
      { x: 386, y: 248, w: 54, h: 16 }, { x: 386, y: 248, w: 16, h: 46 },
      { x: 544, y: 248, w: 54, h: 16 }, { x: 582, y: 248, w: 16, h: 46 },
      { x: 386, y: 444, w: 54, h: 16 }, { x: 386, y: 414, w: 16, h: 46 },
      { x: 544, y: 444, w: 54, h: 16 }, { x: 582, y: 414, w: 16, h: 46 },
      { x: 740, y: 70, w: 18, h: 204 }, { x: 740, y: 430, w: 18, h: 122 },
    ],
    alcoves: [
      { x: 20, y: 354, w: 52, h: 90 },
      { x: 234, y: 72, w: 72, h: 46 },
      { x: 670, y: 72, w: 68, h: 48 },
      { x: 760, y: 184, w: 54, h: 70 },
    ],
    props: [
      { kind: 'case', x: 96, y: 478, w: 80, h: 36, artifact: 'watch' },
      { kind: 'case', x: 274, y: 534, w: 86, h: 36, artifact: 'gem' },
      { kind: 'case', x: 448, y: 546, w: 88, h: 36, artifact: 'scroll' },
      { kind: 'case', x: 100, y: 256, w: 78, h: 38, artifact: 'watch' },
      { kind: 'case', x: 448, y: 112, w: 88, h: 36, artifact: 'gem' },
      { kind: 'column', x: 320, y: 204, w: 36, h: 36 },
      { kind: 'column', x: 656, y: 488, w: 38, h: 38 },
      { kind: 'plinth', x: 824, y: 256, w: 52, h: 74 },
      { kind: 'desk', x: 816, y: 492, w: 76, h: 38 },
    ],
    vents: [
      { id: 'v1a', pairId: 'v1b', x: 74, y: 124 },
      { id: 'v1b', pairId: 'v1a', x: 794, y: 122 },
    ],
    breakers: [
      { id: 'r1', x: 356, y: 94, targetLaserIds: ['l1'], conduit: [[356, 94], [712, 94], [712, 276], [749, 276]] },
    ],
    lasers: [{ id: 'l1', x1: 749, y1: 274, x2: 749, y2: 430, breakerId: 'r1', label: 'EAST GATE' }],
    cameras: [
      { id: 'c1', label: 'CAM-01', x: 738, y: 228, baseAngle: 2.66, sweep: 0.56, period: 7.4, phase: 0.2, range: 225, halfFov: 0.34 },
      { id: 'c2', label: 'CAM-02', x: 964, y: 396, baseAngle: 3.44, sweep: 0.56, period: 6.8, phase: 1.5, range: 215, halfFov: 0.34 },
    ],
    guards: [
      { id: 'g1', name: 'VANCE', speed: 68, range: 210, halfFov: 0.45, waypoints: [{ x: 288, y: 282, wait: 1.0, look: 0.2 }, { x: 288, y: 468, wait: 1.8, look: 1.55 }, { x: 352, y: 468, wait: 1.0, look: -0.1 }, { x: 352, y: 282, wait: 1.6, look: -0.4 }] },
      { id: 'g2', name: 'HALE', speed: 72, range: 215, halfFov: 0.44, waypoints: [{ x: 404, y: 186, wait: 1.0, look: 0.05 }, { x: 672, y: 186, wait: 1.8, look: 1.57 }, { x: 672, y: 320, wait: 1.0, look: 3.14 }, { x: 632, y: 320, wait: 1.0, look: 2.35 }] },
      { id: 'g3', name: 'KNOX', speed: 68, range: 205, halfFov: 0.45, waypoints: [{ x: 620, y: 402, wait: 1.0, look: 1.57 }, { x: 620, y: 594, wait: 1.8, look: 3.14 }, { x: 564, y: 594, wait: 1.0, look: -1.57 }, { x: 564, y: 498, wait: 1.4, look: 0.25 }] },
    ],
  },

  {
    id: 'v2', index: 1, numeral: 'II', short: 'GARDEN', theme: 'conservatory',
    title: 'THE BOTANICAL CONSERVATORY', parTime: 46,
    spawn: { x: 68, y: 354, angle: 0 },
    exit: { x: 912, y: 354, radius: 28 },
    loot: { id: 'l2', x: 492, y: 158, radius: 24, kind: 'crown', name: 'EMERALD ASTROLABE', value: 540000, crackTime: 0.95 },
    bonuses: [{ id: 'b2', x: 492, y: 564, radius: 15, name: 'JADE CAMEO', value: 120000, crackTime: 0.5 }],
    carpets: [
      { x: 76, y: 322, w: 832, h: 64, color: '#1b503e', trim: '#e0bc64' },
      { x: 460, y: 112, w: 64, h: 484, color: '#1f5a46', trim: '#e6c46c' },
    ],
    sconces: [
      { x: 265, y: 215, r: 170 }, { x: 492, y: 354, r: 210 }, { x: 745, y: 470, r: 175 },
    ],
    walls: [
      { x: 238, y: 70, w: 18, h: 184 }, { x: 238, y: 454, w: 18, h: 184 },
      { x: 386, y: 272, w: 212, h: 18 }, { x: 386, y: 422, w: 212, h: 18 },
      { x: 734, y: 70, w: 18, h: 184 }, { x: 734, y: 454, w: 18, h: 184 },
    ],
    alcoves: [
      { x: 20, y: 118, w: 54, h: 80 },
      { x: 20, y: 506, w: 54, h: 80 },
      { x: 754, y: 74, w: 72, h: 46 },
    ],
    props: [
      { kind: 'planter', x: 114, y: 188, w: 74, h: 44 }, { kind: 'planter', x: 114, y: 474, w: 74, h: 44 },
      { kind: 'planter', x: 292, y: 138, w: 52, h: 82 }, { kind: 'planter', x: 292, y: 486, w: 52, h: 82 },
      { kind: 'case', x: 450, y: 334, w: 84, h: 42, artifact: 'gem' },
      { kind: 'planter', x: 640, y: 138, w: 52, h: 82 }, { kind: 'planter', x: 640, y: 486, w: 52, h: 82 },
      { kind: 'column', x: 824, y: 210, w: 40, h: 40 }, { kind: 'column', x: 824, y: 456, w: 40, h: 40 },
    ],
    vents: [
      { id: 'v2a', pairId: 'v2b', x: 78, y: 598 },
      { id: 'v2b', pairId: 'v2a', x: 912, y: 598 },
    ],
    breakers: [
      { id: 'r2a', x: 180, y: 96, targetLaserIds: ['l2a'], conduit: [[180, 96], [218, 96], [218, 254], [247, 254]] },
      { id: 'r2b', x: 676, y: 614, targetLaserIds: ['l2b'], conduit: [[676, 614], [712, 614], [712, 454], [743, 454]] },
    ],
    lasers: [
      { id: 'l2a', x1: 247, y1: 254, x2: 247, y2: 454, breakerId: 'r2a', label: 'WEST GATE' },
      { id: 'l2b', x1: 743, y1: 254, x2: 743, y2: 454, breakerId: 'r2b', label: 'EAST GATE' },
    ],
    cameras: [
      { id: 'c21', label: 'CAM-01', x: 392, y: 76, baseAngle: 1.57, sweep: 0.7, period: 7.0, phase: 0.1, range: 215, halfFov: 0.34 },
      { id: 'c22', label: 'CAM-02', x: 592, y: 632, baseAngle: -1.57, sweep: 0.7, period: 6.4, phase: 1.8, range: 215, halfFov: 0.34 },
      { id: 'c23', label: 'CAM-03', x: 730, y: 238, baseAngle: 2.55, sweep: 0.56, period: 6.6, phase: 0.8, range: 220, halfFov: 0.34 },
    ],
    guards: [
      { id: 'g21', name: 'MOSS', speed: 70, range: 205, halfFov: 0.44, waypoints: [{ x: 374, y: 218, wait: 1.0, look: 0 }, { x: 610, y: 218, wait: 1.8, look: 1.57 }, { x: 610, y: 116, wait: 1.0, look: 3.14 }, { x: 374, y: 116, wait: 1.4, look: 0.4 }] },
      { id: 'g22', name: 'COLE', speed: 68, range: 200, halfFov: 0.45, waypoints: [{ x: 298, y: 354, wait: 1.0, look: 0 }, { x: 404, y: 354, wait: 1.5, look: -0.3 }, { x: 404, y: 354, wait: 1.0, look: 3.14 }, { x: 298, y: 298, wait: 1.4, look: 1.57 }] },
      { id: 'g23', name: 'BRIGGS', speed: 72, range: 208, halfFov: 0.44, waypoints: [{ x: 374, y: 492, wait: 1.0, look: 0 }, { x: 610, y: 492, wait: 1.8, look: -1.57 }, { x: 610, y: 598, wait: 1.0, look: 3.14 }, { x: 374, y: 598, wait: 1.4, look: -0.35 }] },
      { id: 'g24', name: 'REID', speed: 68, range: 200, halfFov: 0.44, waypoints: [{ x: 786, y: 150, wait: 1.4, look: 1.57 }, { x: 786, y: 558, wait: 1.8, look: 0 }, { x: 896, y: 522, wait: 1.0, look: -1.57 }, { x: 896, y: 186, wait: 1.4, look: 3.14 }] },
    ],
  },

  {
    id: 'v3', index: 2, numeral: 'III', short: 'VAULT', theme: 'treasury',
    title: 'THE ROYAL BULLION TREASURY', parTime: 50,
    spawn: { x: 72, y: 126, angle: 0.35 },
    exit: { x: 912, y: 584, radius: 28 },
    loot: { id: 'l3', x: 492, y: 354, radius: 24, kind: 'scepter', name: 'SOVEREIGN RUBY SCEPTER', value: 680000, crackTime: 1.0 },
    bonuses: [{ id: 'b3', x: 912, y: 124, radius: 15, name: 'BULLION SEAL', value: 150000, crackTime: 0.55 }],
    carpets: [
      { x: 370, y: 214, w: 244, h: 280, color: '#691824', trim: '#e5b554' },
      { x: 64, y: 326, w: 856, h: 56, color: '#56131d', trim: '#d2a046' },
    ],
    sconces: [
      { x: 492, y: 354, r: 200 }, { x: 165, y: 185, r: 145 }, { x: 825, y: 515, r: 155 },
    ],
    walls: [
      { x: 344, y: 190, w: 98, h: 16 }, { x: 542, y: 190, w: 98, h: 16 },
      { x: 344, y: 502, w: 98, h: 16 }, { x: 542, y: 502, w: 98, h: 16 },
      { x: 344, y: 190, w: 16, h: 106 }, { x: 344, y: 412, w: 16, h: 106 },
      { x: 624, y: 190, w: 16, h: 106 }, { x: 624, y: 412, w: 16, h: 106 },
      { x: 182, y: 268, w: 16, h: 172 }, { x: 786, y: 268, w: 16, h: 172 },
    ],
    alcoves: [
      { x: 20, y: 472, w: 56, h: 80 },
      { x: 454, y: 74, w: 76, h: 46 },
      { x: 454, y: 588, w: 76, h: 46 },
      { x: 912, y: 288, w: 52, h: 86 },
    ],
    props: [
      { kind: 'desk', x: 90, y: 204, w: 74, h: 38 }, { kind: 'desk', x: 228, y: 112, w: 82, h: 38 },
      { kind: 'desk', x: 228, y: 558, w: 82, h: 38 }, { kind: 'column', x: 394, y: 254, w: 36, h: 36 },
      { kind: 'column', x: 554, y: 414, w: 36, h: 36 }, { kind: 'case', x: 676, y: 112, w: 82, h: 38, artifact: 'gem' },
      { kind: 'case', x: 676, y: 558, w: 82, h: 38, artifact: 'watch' }, { kind: 'plinth', x: 826, y: 452, w: 62, h: 38 },
    ],
    vents: [
      { id: 'v3a', pairId: 'v3b', x: 80, y: 590 },
      { id: 'v3b', pairId: 'v3a', x: 416, y: 444 },
    ],
    breakers: [
      { id: 'r3a', x: 148, y: 614, targetLaserIds: ['l3a', 'l3b'], conduit: [[148, 614], [326, 614], [326, 412], [352, 412]] },
    ],
    lasers: [
      { id: 'l3a', x1: 352, y1: 296, x2: 352, y2: 412, breakerId: 'r3a', label: 'WEST GATE' },
      { id: 'l3b', x1: 632, y1: 296, x2: 632, y2: 412, breakerId: 'r3a', label: 'EAST GATE' },
    ],
    cameras: [
      { id: 'c31', label: 'CAM-01', x: 364, y: 210, baseAngle: 0.78, sweep: 0.56, period: 6.4, phase: 0.0, range: 215, halfFov: 0.34 },
      { id: 'c32', label: 'CAM-02', x: 620, y: 496, baseAngle: -2.35, sweep: 0.56, period: 6.4, phase: 3.1, range: 215, halfFov: 0.34 },
      { id: 'c33', label: 'CAM-03', x: 962, y: 226, baseAngle: 2.9, sweep: 0.62, period: 6.0, phase: 1.4, range: 225, halfFov: 0.34 },
    ],
    guards: [
      { id: 'g31', name: 'MARLOW', speed: 74, range: 215, halfFov: 0.45, waypoints: [{ x: 256, y: 218, wait: 1.0, look: 0 }, { x: 726, y: 218, wait: 1.5, look: 1.57 }, { x: 726, y: 494, wait: 1.5, look: 3.14 }, { x: 256, y: 494, wait: 1.5, look: -1.57 }] },
      { id: 'g32', name: 'QUINN', speed: 74, range: 215, halfFov: 0.45, waypoints: [{ x: 726, y: 494, wait: 1.5, look: 3.14 }, { x: 256, y: 494, wait: 1.0, look: -1.57 }, { x: 256, y: 218, wait: 1.5, look: 0 }, { x: 726, y: 218, wait: 1.5, look: 1.57 }] },
      { id: 'g33', name: 'FROST', speed: 68, range: 200, halfFov: 0.45, waypoints: [{ x: 492, y: 248, wait: 1.5, look: 1.57 }, { x: 586, y: 354, wait: 1.5, look: 3.14 }, { x: 492, y: 460, wait: 1.5, look: -1.57 }, { x: 398, y: 354, wait: 1.5, look: 0 }] },
      { id: 'g34', name: 'SUTTON', speed: 70, range: 205, halfFov: 0.44, waypoints: [{ x: 848, y: 170, wait: 1.2, look: 1.57 }, { x: 848, y: 386, wait: 1.8, look: 0.4 }, { x: 760, y: 386, wait: 1.0, look: -1.57 }, { x: 760, y: 170, wait: 1.5, look: 0.2 }] },
    ],
  },

  {
    id: 'v4', index: 3, numeral: 'IV', short: 'CROWN', theme: 'crown',
    title: 'THE GRAND CROWN GALLERY', parTime: 56,
    spawn: { x: 68, y: 586, angle: -0.35 },
    exit: { x: 72, y: 124, radius: 28 },
    loot: { id: 'l4', x: 868, y: 354, radius: 26, kind: 'crown', name: 'IMPERIAL CROWN DIADEM', value: 850000, crackTime: 1.0 },
    bonuses: [{ id: 'b4', x: 536, y: 124, radius: 15, name: 'ROYAL SIGNET', value: 180000, crackTime: 0.55 }],
    carpets: [
      { x: 208, y: 322, w: 636, h: 64, color: '#21355c', trim: '#e6ba5c' },
      { x: 44, y: 100, w: 68, h: 508, color: '#21355c', trim: '#e6ba5c' },
    ],
    sconces: [
      { x: 868, y: 354, r: 205 }, { x: 536, y: 354, r: 185 }, { x: 180, y: 354, r: 150 },
    ],
    walls: [
      { x: 194, y: 292, w: 16, h: 124 }, { x: 194, y: 70, w: 16, h: 132 }, { x: 194, y: 506, w: 16, h: 132 },
      { x: 416, y: 70, w: 16, h: 184 }, { x: 416, y: 454, w: 16, h: 184 },
      { x: 676, y: 70, w: 16, h: 184 }, { x: 676, y: 454, w: 16, h: 184 },
      { x: 498, y: 268, w: 92, h: 16 }, { x: 498, y: 424, w: 92, h: 16 },
    ],
    alcoves: [
      { x: 20, y: 306, w: 50, h: 96 },
      { x: 436, y: 74, w: 56, h: 48 },
      { x: 436, y: 586, w: 56, h: 48 },
      { x: 904, y: 92, w: 58, h: 76 },
    ],
    props: [
      { kind: 'column', x: 106, y: 424, w: 40, h: 40 }, { kind: 'column', x: 106, y: 244, w: 40, h: 40 },
      { kind: 'case', x: 266, y: 146, w: 80, h: 38, artifact: 'watch' }, { kind: 'case', x: 266, y: 524, w: 80, h: 38, artifact: 'gem' },
      { kind: 'plinth', x: 288, y: 334, w: 54, h: 40 }, { kind: 'plinth', x: 518, y: 334, w: 56, h: 40 },
      { kind: 'column', x: 748, y: 168, w: 42, h: 42 }, { kind: 'column', x: 748, y: 498, w: 42, h: 42 },
    ],
    vents: [
      { id: 'v4a', pairId: 'v4b', x: 374, y: 120 },
      { id: 'v4b', pairId: 'v4a', x: 778, y: 590 },
    ],
    breakers: [
      { id: 'r4a', x: 374, y: 614, targetLaserIds: ['l4a'], conduit: [[374, 614], [400, 614], [400, 454], [424, 454]] },
      { id: 'r4b', x: 620, y: 96, targetLaserIds: ['l4b'], conduit: [[620, 96], [654, 96], [654, 254], [684, 254]] },
    ],
    lasers: [
      { id: 'l4a', x1: 424, y1: 254, x2: 424, y2: 454, breakerId: 'r4a', label: 'INNER LASER' },
      { id: 'l4b', x1: 684, y1: 254, x2: 684, y2: 454, breakerId: 'r4b', label: 'CROWN LASER' },
    ],
    cameras: [
      { id: 'c41', label: 'CAM-01', x: 212, y: 294, baseAngle: 0.0, sweep: 0.66, period: 6.4, phase: 0.2, range: 215, halfFov: 0.34 },
      { id: 'c42', label: 'CAM-02', x: 672, y: 234, baseAngle: 2.85, sweep: 0.6, period: 6.0, phase: 1.9, range: 215, halfFov: 0.34 },
      { id: 'c43', label: 'CAM-03', x: 962, y: 216, baseAngle: 2.55, sweep: 0.56, period: 5.8, phase: 0.7, range: 225, halfFov: 0.34 },
      { id: 'c44', label: 'CAM-04', x: 962, y: 496, baseAngle: -2.55, sweep: 0.56, period: 5.8, phase: 3.1, range: 225, halfFov: 0.34 },
    ],
    guards: [
      { id: 'g41', name: 'MERCER', speed: 74, range: 210, halfFov: 0.45, waypoints: [{ x: 242, y: 238, wait: 1.0, look: 0 }, { x: 378, y: 238, wait: 1.5, look: 1.57 }, { x: 378, y: 472, wait: 1.5, look: 3.14 }, { x: 242, y: 472, wait: 1.5, look: -1.57 }] },
      { id: 'g42', name: 'DRAKE', speed: 76, range: 212, halfFov: 0.44, waypoints: [{ x: 468, y: 214, wait: 1.0, look: 0 }, { x: 632, y: 214, wait: 1.8, look: 1.57 }, { x: 632, y: 354, wait: 1.0, look: 3.14 }, { x: 468, y: 214, wait: 1.2, look: 0.5 }] },
      { id: 'g43', name: 'SHAW', speed: 76, range: 212, halfFov: 0.44, waypoints: [{ x: 468, y: 494, wait: 1.0, look: 0 }, { x: 632, y: 494, wait: 1.8, look: -1.57 }, { x: 632, y: 598, wait: 1.0, look: 3.14 }, { x: 468, y: 598, wait: 1.5, look: -0.4 }] },
      { id: 'g44', name: 'STERLING', speed: 74, range: 215, halfFov: 0.45, waypoints: [{ x: 730, y: 272, wait: 1.2, look: 0 }, { x: 896, y: 254, wait: 1.8, look: 1.57 }, { x: 896, y: 456, wait: 1.8, look: 3.14 }, { x: 730, y: 440, wait: 1.2, look: -1.57 }] },
    ],
  },

  {
    id: 'v5', index: 4, numeral: 'V', short: 'SPIRE', theme: 'archive',
    title: 'THE MERIDIAN ARCHIVE', parTime: 64,
    spawn: { x: 68, y: 354, angle: 0 },
    exit: { x: 912, y: 122, radius: 28 },
    loot: { id: 'l5', x: 642, y: 354, radius: 26, kind: 'orrery', name: 'CELESTIAL ORRERY', value: 1100000, crackTime: 1.1 },
    bonuses: [{ id: 'b5', x: 912, y: 586, radius: 15, name: 'MASTER CIPHER', value: 240000, crackTime: 0.6 }],
    carpets: [
      { x: 100, y: 326, w: 720, h: 56, color: '#3b2416', trim: '#e6bd64' },
      { x: 614, y: 112, w: 56, h: 484, color: '#3b2416', trim: '#e6bd64' },
    ],
    sconces: [
      { x: 642, y: 354, r: 225 }, { x: 280, y: 354, r: 175 }, { x: 880, y: 150, r: 145 },
    ],
    walls: [
      { x: 236, y: 70, w: 16, h: 170 }, { x: 236, y: 468, w: 16, h: 170 },
      { x: 472, y: 186, w: 16, h: 110 }, { x: 472, y: 412, w: 16, h: 110 },
      { x: 778, y: 70, w: 16, h: 204 }, { x: 778, y: 434, w: 16, h: 122 },
      { x: 472, y: 186, w: 112, h: 16 }, { x: 472, y: 506, w: 112, h: 16 },
    ],
    alcoves: [
      { x: 20, y: 124, w: 54, h: 86 },
      { x: 20, y: 500, w: 54, h: 86 },
      { x: 720, y: 74, w: 54, h: 52 },
      { x: 798, y: 196, w: 54, h: 66 },
    ],
    props: [
      { kind: 'case', x: 112, y: 210, w: 78, h: 38, artifact: 'scroll' },
      { kind: 'case', x: 112, y: 462, w: 78, h: 38, artifact: 'watch' },
      { kind: 'column', x: 332, y: 210, w: 40, h: 40 }, { kind: 'column', x: 332, y: 458, w: 40, h: 40 },
      { kind: 'desk', x: 312, y: 334, w: 78, h: 40 },
      { kind: 'column', x: 540, y: 266, w: 38, h: 38 }, { kind: 'column', x: 540, y: 404, w: 38, h: 38 },
      { kind: 'plinth', x: 846, y: 314, w: 54, h: 78 },
      { kind: 'case', x: 640, y: 552, w: 94, h: 38, artifact: 'gem' },
    ],
    vents: [
      { id: 'v5a', pairId: 'v5b', x: 146, y: 116 },
      { id: 'v5b', pairId: 'v5a', x: 834, y: 122 },
    ],
    breakers: [
      { id: 'r5a', x: 356, y: 94, targetLaserIds: ['l5a'], conduit: [[356, 94], [452, 94], [452, 296], [480, 296]] },
      { id: 'r5b', x: 604, y: 614, targetLaserIds: ['l5b'], conduit: [[604, 614], [758, 614], [758, 434], [786, 434]] },
    ],
    lasers: [
      { id: 'l5a', x1: 480, y1: 296, x2: 480, y2: 412, breakerId: 'r5a', label: 'VAULT GATE' },
      { id: 'l5b', x1: 786, y1: 274, x2: 786, y2: 434, breakerId: 'r5b', label: 'LIFT GATE' },
    ],
    cameras: [
      { id: 'c51', label: 'CAM-01', x: 254, y: 238, baseAngle: 0.48, sweep: 0.65, period: 6.2, phase: 0.0, range: 215, halfFov: 0.34 },
      { id: 'c52', label: 'CAM-02', x: 774, y: 248, baseAngle: 2.75, sweep: 0.6, period: 5.8, phase: 1.7, range: 225, halfFov: 0.34 },
      { id: 'c53', label: 'CAM-03', x: 962, y: 412, baseAngle: 3.45, sweep: 0.58, period: 6.0, phase: 2.8, range: 220, halfFov: 0.34 },
    ],
    guards: [
      { id: 'g51', name: 'WARDEN', speed: 76, range: 215, halfFov: 0.45, waypoints: [{ x: 280, y: 150, wait: 1.0, look: 0 }, { x: 422, y: 150, wait: 1.5, look: 1.57 }, { x: 422, y: 558, wait: 1.5, look: 3.14 }, { x: 280, y: 558, wait: 1.5, look: -1.57 }] },
      { id: 'g52', name: 'THORNE', speed: 78, range: 218, halfFov: 0.45, waypoints: [{ x: 642, y: 140, wait: 1.2, look: 1.57 }, { x: 726, y: 240, wait: 1.5, look: 3.14 }, { x: 726, y: 468, wait: 1.5, look: 3.14 }, { x: 642, y: 518, wait: 1.2, look: -1.57 }] },
      { id: 'g53', name: 'CROSS', speed: 74, range: 210, halfFov: 0.45, waypoints: [{ x: 822, y: 268, wait: 1.2, look: 1.57 }, { x: 822, y: 586, wait: 1.8, look: 0 }, { x: 924, y: 520, wait: 1.0, look: -1.57 }, { x: 924, y: 246, wait: 1.4, look: 3.14 }] },
    ],
  },
];
