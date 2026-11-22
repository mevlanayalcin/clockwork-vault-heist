// Four distinct architectural heist vaults with bespoke material palettes, props, and routes.

export const WORLD_W = 1280;
export const WORLD_H = 720;
export const ARENA = { x: 28, y: 60, w: 1224, h: 596, wall: 16 };

export function getVaultCount() {
  return VAULTS.length;
}

export function buildPerimeterWalls() {
  const { x, y, w, h, wall: t } = ARENA;
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
    id: 'vault-1',
    index: 0,
    theme: 'atrium',
    title: 'THE HOROLOGY ATRIUM',
    subtitle: 'WING I · OBSIDIAN MARBLE GALLERY',
    parTime: 40,
    spawn: { x: 96, y: 582, angle: -0.45 },
    exit: { x: 1172, y: 136, radius: 32, label: 'EXIT LIFT' },
    loot: {
      id: 'loot-1',
      x: 640,
      y: 358,
      radius: 26,
      kind: 'chronometer',
      name: 'ASTRAL CHRONOMETER',
      value: 420000,
      crackTime: 0.85,
    },
    bonuses: [
      { id: 'b1', x: 1164, y: 582, radius: 16, name: 'GILDED LEDGER', value: 95000, crackTime: 0.5 },
    ],
    carpets: [
      { x: 320, y: 326, w: 600, h: 64, color: '#4d1424', trim: '#d7a94e' },
      { x: 608, y: 108, w: 64, h: 500, color: '#4d1424', trim: '#d7a94e' },
      { x: 964, y: 118, w: 238, h: 52, color: '#143c32', trim: '#52e0aa' },
    ],
    chandeliers: [
      { x: 640, y: 358, r: 220, color: 'rgba(255, 206, 112, 0.16)' },
      { x: 180, y: 358, r: 155, color: 'rgba(130, 178, 255, 0.10)' },
      { x: 1090, y: 358, r: 165, color: 'rgba(116, 224, 198, 0.10)' },
    ],
    walls: [
      { x: 282, y: 76, w: 18, h: 176 },
      { x: 282, y: 444, w: 18, h: 114 },
      // Central octagonal sanctum piers
      { x: 516, y: 242, w: 62, h: 18 },
      { x: 516, y: 242, w: 18, h: 50 },
      { x: 702, y: 242, w: 62, h: 18 },
      { x: 746, y: 242, w: 18, h: 50 },
      { x: 516, y: 456, w: 62, h: 18 },
      { x: 516, y: 424, w: 18, h: 50 },
      { x: 702, y: 456, w: 62, h: 18 },
      { x: 746, y: 424, w: 18, h: 50 },
      // East security wing divider
      { x: 938, y: 76, w: 18, h: 208 },
      { x: 938, y: 432, w: 18, h: 122 },
    ],
    props: [
      { kind: 'case', x: 138, y: 474, w: 94, h: 42, artifact: 'watch' },
      { kind: 'case', x: 354, y: 534, w: 104, h: 40, artifact: 'gem' },
      { kind: 'case', x: 588, y: 552, w: 104, h: 40, artifact: 'scroll' },
      { kind: 'case', x: 142, y: 268, w: 92, h: 44, artifact: 'watch' },
      { kind: 'case', x: 588, y: 122, w: 104, h: 40, artifact: 'gem' },
      { kind: 'column', x: 438, y: 214, w: 38, h: 38 },
      { kind: 'column', x: 836, y: 492, w: 42, h: 42 },
      { kind: 'plinth', x: 1054, y: 256, w: 62, h: 82 },
      { kind: 'desk', x: 1038, y: 496, w: 92, h: 44 },
    ],
    vents: [
      { id: 'v1a', pairId: 'v1b', x: 110, y: 132, label: 'VENT A' },
      { id: 'v1b', pairId: 'v1a', x: 1004, y: 136, label: 'VENT B' },
    ],
    relays: [
      {
        id: 'r1',
        x: 428,
        y: 104,
        targetLaserIds: ['l1'],
        label: 'RELAY',
        conduit: [[428, 104], [902, 104], [902, 286], [947, 286]],
      },
    ],
    lasers: [
      { id: 'l1', x1: 947, y1: 284, x2: 947, y2: 432, relayId: 'r1', label: 'LASER GATE' },
    ],
    cameras: [
      { id: 'cam-1', label: 'CAM-01', x: 936, y: 238, baseAngle: 2.64, sweep: 0.56, period: 7.4, phase: 0.25, range: 268, halfFov: 0.34 },
      { id: 'cam-2', label: 'CAM-02', x: 1232, y: 404, baseAngle: 3.42, sweep: 0.58, period: 6.8, phase: 1.5, range: 260, halfFov: 0.34 },
    ],
    guards: [
      {
        id: 'g1',
        name: 'WARDEN VANCE',
        speed: 74,
        range: 245,
        halfFov: 0.46,
        bark: 'West wing clear',
        waypoints: [
          { x: 378, y: 288, wait: 1.0, look: 0.2 },
          { x: 378, y: 468, wait: 1.8, look: 1.52 },
          { x: 468, y: 468, wait: 1.0, look: -0.1 },
          { x: 468, y: 288, wait: 1.6, look: -0.4 },
        ],
      },
      {
        id: 'g2',
        name: 'SENTRY HALE',
        speed: 78,
        range: 250,
        halfFov: 0.45,
        bark: 'Sanctum perimeter quiet',
        waypoints: [
          { x: 516, y: 196, wait: 1.0, look: 0.05 },
          { x: 856, y: 196, wait: 1.8, look: 1.57 },
          { x: 856, y: 326, wait: 1.0, look: 3.14 },
          { x: 814, y: 326, wait: 1.0, look: 2.35 },
        ],
      },
      {
        id: 'g3',
        name: 'WATCHER KNOX',
        speed: 74,
        range: 240,
        halfFov: 0.46,
        bark: 'South hall nominal',
        waypoints: [
          { x: 784, y: 404, wait: 1.0, look: 1.57 },
          { x: 784, y: 598, wait: 1.8, look: 3.14 },
          { x: 724, y: 598, wait: 1.0, look: -1.57 },
          { x: 724, y: 506, wait: 1.4, look: 0.25 },
        ],
      },
    ],
  },

  {
    id: 'vault-2',
    index: 1,
    theme: 'conservatory',
    title: 'THE EMERALD CONSERVATORY',
    subtitle: 'WING II · BOTANICAL GLASS PAVILION',
    parTime: 46,
    spawn: { x: 98, y: 358, angle: 0 },
    exit: { x: 1172, y: 358, radius: 32, label: 'EXIT LIFT' },
    loot: {
      id: 'loot-2',
      x: 640,
      y: 168,
      radius: 26,
      kind: 'crown',
      name: 'EMERALD BOTANICAL CROWN',
      value: 580000,
      crackTime: 0.9,
    },
    bonuses: [
      { id: 'b2', x: 640, y: 564, radius: 16, name: 'JADE CAMEO', value: 120000, crackTime: 0.5 },
    ],
    carpets: [
      { x: 108, y: 324, w: 1064, h: 68, color: '#144234', trim: '#d7b45a' },
      { x: 604, y: 120, w: 72, h: 478, color: '#184b3b', trim: '#e0bd64' },
    ],
    chandeliers: [
      { x: 350, y: 220, r: 210, color: 'rgba(130, 255, 200, 0.13)' },
      { x: 640, y: 358, r: 250, color: 'rgba(255, 232, 148, 0.14)' },
      { x: 960, y: 470, r: 210, color: 'rgba(120, 245, 192, 0.12)' },
    ],
    walls: [
      { x: 312, y: 76, w: 18, h: 184 },
      { x: 312, y: 458, w: 18, h: 182 },
      { x: 510, y: 274, w: 260, h: 18 },
      { x: 510, y: 426, w: 260, h: 18 },
      { x: 948, y: 76, w: 18, h: 184 },
      { x: 948, y: 458, w: 18, h: 182 },
    ],
    props: [
      { kind: 'planter', x: 158, y: 194, w: 88, h: 48 },
      { kind: 'planter', x: 158, y: 474, w: 88, h: 48 },
      { kind: 'planter', x: 386, y: 146, w: 60, h: 86 },
      { kind: 'planter', x: 386, y: 486, w: 60, h: 86 },
      { kind: 'case', x: 590, y: 336, w: 100, h: 46, artifact: 'gem' },
      { kind: 'planter', x: 834, y: 146, w: 60, h: 86 },
      { kind: 'planter', x: 834, y: 486, w: 60, h: 86 },
      { kind: 'column', x: 1054, y: 216, w: 46, h: 46 },
      { kind: 'column', x: 1054, y: 456, w: 46, h: 46 },
    ],
    vents: [
      { id: 'v2a', pairId: 'v2b', x: 112, y: 576, label: 'VENT A' },
      { id: 'v2b', pairId: 'v2a', x: 1164, y: 576, label: 'VENT B' },
    ],
    relays: [
      {
        id: 'r2a',
        x: 236,
        y: 104,
        targetLaserIds: ['l2a'],
        label: 'RELAY',
        conduit: [[236, 104], [286, 104], [286, 260], [321, 260]],
      },
      {
        id: 'r2b',
        x: 882,
        y: 612,
        targetLaserIds: ['l2b'],
        label: 'RELAY',
        conduit: [[882, 612], [916, 612], [916, 458], [957, 458]],
      },
    ],
    lasers: [
      { id: 'l2a', x1: 321, y1: 260, x2: 321, y2: 458, relayId: 'r2a', label: 'WEST LASER' },
      { id: 'l2b', x1: 957, y1: 260, x2: 957, y2: 458, relayId: 'r2b', label: 'EAST LASER' },
    ],
    cameras: [
      { id: 'cam-21', label: 'CAM-01', x: 516, y: 86, baseAngle: 1.57, sweep: 0.72, period: 7.0, phase: 0.1, range: 255, halfFov: 0.34 },
      { id: 'cam-22', label: 'CAM-02', x: 766, y: 632, baseAngle: -1.57, sweep: 0.72, period: 6.4, phase: 1.8, range: 255, halfFov: 0.34 },
      { id: 'cam-23', label: 'CAM-03', x: 944, y: 244, baseAngle: 2.55, sweep: 0.56, period: 6.6, phase: 0.8, range: 262, halfFov: 0.34 },
    ],
    guards: [
      {
        id: 'g21',
        name: 'WARDEN MOSS',
        speed: 78,
        range: 242,
        halfFov: 0.45,
        bark: 'Glasshouse quiet',
        waypoints: [
          { x: 486, y: 222, wait: 1.0, look: 0 },
          { x: 794, y: 222, wait: 1.8, look: 1.57 },
          { x: 794, y: 122, wait: 1.0, look: 3.14 },
          { x: 486, y: 122, wait: 1.4, look: 0.4 },
        ],
      },
      {
        id: 'g22',
        name: 'SENTRY COLE',
        speed: 76,
        range: 238,
        halfFov: 0.46,
        bark: 'Central gallery locked',
        waypoints: [
          { x: 390, y: 358, wait: 1.0, look: 0 },
          { x: 526, y: 358, wait: 1.5, look: -0.35 },
          { x: 526, y: 358, wait: 1.0, look: 3.14 },
          { x: 390, y: 300, wait: 1.4, look: 1.57 },
        ],
      },
      {
        id: 'g23',
        name: 'WATCHER BRIGGS',
        speed: 80,
        range: 244,
        halfFov: 0.45,
        bark: 'South terrace clear',
        waypoints: [
          { x: 486, y: 492, wait: 1.0, look: 0 },
          { x: 794, y: 492, wait: 1.8, look: -1.57 },
          { x: 794, y: 598, wait: 1.0, look: 3.14 },
          { x: 486, y: 598, wait: 1.4, look: -0.35 },
        ],
      },
      {
        id: 'g24',
        name: 'GUARD REID',
        speed: 76,
        range: 235,
        halfFov: 0.45,
        bark: 'East lift armed',
        waypoints: [
          { x: 1006, y: 158, wait: 1.4, look: 1.57 },
          { x: 1006, y: 558, wait: 1.8, look: 0 },
          { x: 1146, y: 522, wait: 1.0, look: -1.57 },
          { x: 1146, y: 194, wait: 1.4, look: 3.14 },
        ],
      },
    ],
  },

  {
    id: 'vault-3',
    index: 2,
    theme: 'treasury',
    title: 'THE IMPERIAL TREASURY',
    subtitle: 'WING III · CRIMSON BULLION SANCTUM',
    parTime: 52,
    spawn: { x: 102, y: 136, angle: 0.35 },
    exit: { x: 1170, y: 576, radius: 32, label: 'EXIT LIFT' },
    loot: {
      id: 'loot-3',
      x: 640,
      y: 358,
      radius: 26,
      kind: 'scepter',
      name: 'IMPERIAL RUBY SCEPTER',
      value: 740000,
      crackTime: 0.95,
    },
    bonuses: [
      { id: 'b3', x: 1164, y: 136, radius: 16, name: 'BULLION SEAL', value: 150000, crackTime: 0.55 },
    ],
    carpets: [
      { x: 486, y: 224, w: 308, h: 268, color: '#56131c', trim: '#e0b04e' },
      { x: 96, y: 328, w: 1088, h: 60, color: '#451018', trim: '#cf9b42' },
    ],
    chandeliers: [
      { x: 640, y: 358, r: 235, color: 'rgba(255, 168, 86, 0.16)' },
      { x: 220, y: 180, r: 160, color: 'rgba(255, 108, 92, 0.10)' },
      { x: 1060, y: 520, r: 170, color: 'rgba(255, 188, 96, 0.11)' },
    ],
    walls: [
      // Inner armored treasury vault walls with 4 gates
      { x: 454, y: 196, w: 124, h: 18 },
      { x: 702, y: 196, w: 124, h: 18 },
      { x: 454, y: 502, w: 124, h: 18 },
      { x: 702, y: 502, w: 124, h: 18 },
      { x: 454, y: 196, w: 18, h: 104 },
      { x: 454, y: 416, w: 18, h: 104 },
      { x: 808, y: 196, w: 18, h: 104 },
      { x: 808, y: 416, w: 18, h: 104 },
      // Wing security baffles
      { x: 242, y: 274, w: 18, h: 168 },
      { x: 1020, y: 274, w: 18, h: 168 },
    ],
    props: [
      { kind: 'desk', x: 130, y: 214, w: 86, h: 42 },
      { kind: 'desk', x: 306, y: 118, w: 98, h: 42 },
      { kind: 'desk', x: 306, y: 556, w: 98, h: 42 },
      { kind: 'column', x: 518, y: 262, w: 42, h: 42 },
      { kind: 'column', x: 720, y: 412, w: 42, h: 42 },
      { kind: 'case', x: 878, y: 118, w: 98, h: 42, artifact: 'gem' },
      { kind: 'case', x: 878, y: 556, w: 98, h: 42, artifact: 'watch' },
      { kind: 'plinth', x: 1076, y: 446, w: 72, h: 42 },
    ],
    vents: [
      { id: 'v3a', pairId: 'v3b', x: 118, y: 576, label: 'VENT A' },
      { id: 'v3b', pairId: 'v3a', x: 544, y: 442, label: 'VENT B' },
    ],
    relays: [
      {
        id: 'r3a',
        x: 194,
        y: 614,
        targetLaserIds: ['l3a', 'l3b'],
        label: 'RELAY',
        conduit: [[194, 614], [430, 614], [430, 416], [463, 416]],
      },
    ],
    lasers: [
      { id: 'l3a', x1: 463, y1: 300, x2: 463, y2: 416, relayId: 'r3a', label: 'WEST GATE' },
      { id: 'l3b', x1: 817, y1: 300, x2: 817, y2: 416, relayId: 'r3a', label: 'EAST GATE' },
    ],
    cameras: [
      { id: 'cam-31', label: 'CAM-01', x: 478, y: 218, baseAngle: 0.78, sweep: 0.56, period: 6.4, phase: 0.0, range: 250, halfFov: 0.34 },
      { id: 'cam-32', label: 'CAM-02', x: 804, y: 496, baseAngle: -2.35, sweep: 0.56, period: 6.4, phase: 3.1, range: 250, halfFov: 0.34 },
      { id: 'cam-33', label: 'CAM-03', x: 1230, y: 242, baseAngle: 2.9, sweep: 0.62, period: 6.0, phase: 1.4, range: 265, halfFov: 0.34 },
    ],
    guards: [
      {
        id: 'g31',
        name: 'WARDEN MARLOW',
        speed: 82,
        range: 248,
        halfFov: 0.46,
        bark: 'Outer ring sweep',
        waypoints: [
          { x: 344, y: 222, wait: 1.0, look: 0 },
          { x: 936, y: 222, wait: 1.5, look: 1.57 },
          { x: 936, y: 496, wait: 1.5, look: 3.14 },
          { x: 344, y: 496, wait: 1.5, look: -1.57 },
        ],
      },
      {
        id: 'g32',
        name: 'SENTRY QUINN',
        speed: 82,
        range: 248,
        halfFov: 0.46,
        bark: 'Treasury lock tight',
        waypoints: [
          { x: 936, y: 496, wait: 1.5, look: 3.14 },
          { x: 344, y: 496, wait: 1.0, look: -1.57 },
          { x: 344, y: 222, wait: 1.5, look: 0 },
          { x: 936, y: 222, wait: 1.5, look: 1.57 },
        ],
      },
      {
        id: 'g33',
        name: 'WATCHER FROST',
        speed: 74,
        range: 230,
        halfFov: 0.46,
        bark: 'Scepter vault clear',
        waypoints: [
          { x: 640, y: 254, wait: 1.5, look: 1.57 },
          { x: 764, y: 358, wait: 1.5, look: 3.14 },
          { x: 640, y: 462, wait: 1.5, look: -1.57 },
          { x: 516, y: 358, wait: 1.5, look: 0 },
        ],
      },
      {
        id: 'g34',
        name: 'GUARD SUTTON',
        speed: 78,
        range: 238,
        halfFov: 0.44,
        bark: 'South lift armed',
        waypoints: [
          { x: 1084, y: 174, wait: 1.2, look: 1.57 },
          { x: 1084, y: 386, wait: 1.8, look: 0.4 },
          { x: 988, y: 386, wait: 1.0, look: -1.57 },
          { x: 988, y: 174, wait: 1.5, look: 0.2 },
        ],
      },
    ],
  },

  {
    id: 'vault-4',
    index: 3,
    theme: 'spire',
    title: 'THE MERIDIAN SPIRE',
    subtitle: 'WING IV · SAPPHIRE CLOCKWORK DECK',
    parTime: 60,
    spawn: { x: 98, y: 580, angle: -0.35 },
    exit: { x: 102, y: 136, radius: 32, label: 'EXIT LIFT' },
    loot: {
      id: 'loot-4',
      x: 1112,
      y: 358,
      radius: 28,
      kind: 'orrery',
      name: 'CELESTIAL ORRERY',
      value: 1100000,
      crackTime: 1.05,
    },
    bonuses: [
      { id: 'b4', x: 694, y: 128, radius: 16, name: 'PLATINUM CIPHER', value: 210000, crackTime: 0.55 },
    ],
    carpets: [
      { x: 274, y: 326, w: 800, h: 64, color: '#14264e', trim: '#9cd6f8' },
    ],
    chandeliers: [
      { x: 1112, y: 358, r: 230, color: 'rgba(130, 212, 255, 0.18)' },
      { x: 694, y: 358, r: 210, color: 'rgba(220, 200, 140, 0.12)' },
    ],
    walls: [
      { x: 254, y: 294, w: 18, h: 128 },
      { x: 254, y: 76, w: 18, h: 134 },
      { x: 254, y: 506, w: 18, h: 134 },
      { x: 540, y: 76, w: 18, h: 186 },
      { x: 540, y: 454, w: 18, h: 186 },
      { x: 866, y: 76, w: 18, h: 186 },
      { x: 866, y: 454, w: 18, h: 186 },
      { x: 648, y: 270, w: 108, h: 18 },
      { x: 648, y: 428, w: 108, h: 18 },
    ],
    props: [
      { kind: 'column', x: 140, y: 424, w: 46, h: 46 },
      { kind: 'column', x: 140, y: 242, w: 46, h: 46 },
      { kind: 'case', x: 348, y: 150, w: 94, h: 42, artifact: 'watch' },
      { kind: 'case', x: 348, y: 524, w: 94, h: 42, artifact: 'gem' },
      { kind: 'plinth', x: 374, y: 336, w: 62, h: 44 },
      { kind: 'plinth', x: 668, y: 336, w: 66, h: 44 },
      { kind: 'column', x: 954, y: 170, w: 48, h: 48 },
      { kind: 'column', x: 954, y: 498, w: 48, h: 48 },
    ],
    vents: [
      { id: 'v4a', pairId: 'v4b', x: 480, y: 128, label: 'VENT A' },
      { id: 'v4b', pairId: 'v4a', x: 992, y: 590, label: 'VENT B' },
    ],
    relays: [
      {
        id: 'r4a',
        x: 484,
        y: 612,
        targetLaserIds: ['l4a'],
        label: 'RELAY',
        conduit: [[484, 612], [516, 612], [516, 454], [549, 454]],
      },
      {
        id: 'r4b',
        x: 794,
        y: 104,
        targetLaserIds: ['l4b'],
        label: 'RELAY',
        conduit: [[794, 104], [838, 104], [838, 262], [875, 262]],
      },
    ],
    lasers: [
      { id: 'l4a', x1: 549, y1: 262, x2: 549, y2: 454, relayId: 'r4a', label: 'INNER LASER' },
      { id: 'l4b', x1: 875, y1: 262, x2: 875, y2: 454, relayId: 'r4b', label: 'SPIRE LASER' },
    ],
    cameras: [
      { id: 'cam-41', label: 'CAM-01', x: 274, y: 298, baseAngle: 0.0, sweep: 0.68, period: 6.4, phase: 0.2, range: 255, halfFov: 0.34 },
      { id: 'cam-42', label: 'CAM-02', x: 862, y: 238, baseAngle: 2.85, sweep: 0.62, period: 6.0, phase: 1.9, range: 255, halfFov: 0.34 },
      { id: 'cam-43', label: 'CAM-03', x: 1232, y: 218, baseAngle: 2.55, sweep: 0.58, period: 5.8, phase: 0.7, range: 270, halfFov: 0.34 },
      { id: 'cam-44', label: 'CAM-04', x: 1232, y: 498, baseAngle: -2.55, sweep: 0.58, period: 5.8, phase: 3.1, range: 270, halfFov: 0.34 },
    ],
    guards: [
      {
        id: 'g41',
        name: 'WARDEN MERCER',
        speed: 82,
        range: 245,
        halfFov: 0.46,
        bark: 'Antechamber sweep',
        waypoints: [
          { x: 312, y: 242, wait: 1.0, look: 0 },
          { x: 486, y: 242, wait: 1.5, look: 1.57 },
          { x: 486, y: 474, wait: 1.5, look: 3.14 },
          { x: 312, y: 474, wait: 1.5, look: -1.57 },
        ],
      },
      {
        id: 'g42',
        name: 'SENTRY DRAKE',
        speed: 84,
        range: 248,
        halfFov: 0.45,
        bark: 'North gallery secure',
        waypoints: [
          { x: 606, y: 216, wait: 1.0, look: 0 },
          { x: 810, y: 216, wait: 1.8, look: 1.57 },
          { x: 810, y: 358, wait: 1.0, look: 3.14 },
          { x: 606, y: 216, wait: 1.2, look: 0.5 },
        ],
      },
      {
        id: 'g43',
        name: 'WATCHER SHAW',
        speed: 84,
        range: 248,
        halfFov: 0.45,
        bark: 'South floor nominal',
        waypoints: [
          { x: 606, y: 498, wait: 1.0, look: 0 },
          { x: 810, y: 498, wait: 1.8, look: -1.57 },
          { x: 810, y: 598, wait: 1.0, look: 3.14 },
          { x: 606, y: 598, wait: 1.5, look: -0.4 },
        ],
      },
      {
        id: 'g44',
        name: 'CAPTAIN STERLING',
        speed: 82,
        range: 250,
        halfFov: 0.47,
        bark: 'Orrery deck armed',
        waypoints: [
          { x: 932, y: 274, wait: 1.2, look: 0 },
          { x: 1138, y: 256, wait: 1.8, look: 1.57 },
          { x: 1138, y: 460, wait: 1.8, look: 3.14 },
          { x: 932, y: 444, wait: 1.2, look: -1.57 },
        ],
      },
    ],
  },
];
