// 4 hand-crafted Art-Deco multi-route heist blueprints (1280x720 logical space).

export const WORLD_W = 1280;
export const WORLD_H = 720;
export const ARENA = { x: 48, y: 74, w: 1184, h: 562, wall: 14 };

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

export function getVaultBlueprint(index) {
  const src = VAULTS[((index % VAULTS.length) + VAULTS.length) % VAULTS.length];
  return structuredClone(src);
}

const VAULTS = [
  {
    id: 'vault-1',
    index: 0,
    sector: 'SECTOR A · SCALE 1:40',
    title: 'THE HOROLOGY ATRIUM',
    parTime: 42,
    spawn: { x: 112, y: 564, angle: -0.42 },
    exit: { x: 1152, y: 146, radius: 30, label: 'EXIT LIFT' },
    loot: {
      id: 'loot-1',
      x: 640,
      y: 355,
      radius: 24,
      name: 'ASTRAL CHRONOMETER',
      value: 420000,
      crackTime: 1.25,
    },
    bonuses: [
      { id: 'bonus-1', x: 1152, y: 564, radius: 16, name: 'GOLD LEDGER', value: 95000, crackTime: 0.65 },
    ],
    walls: [
      { x: 294, y: 88, w: 16, h: 170 },
      { x: 294, y: 430, w: 16, h: 112 },
      // Central octagonal clock gallery piers
      { x: 520, y: 244, w: 62, h: 18 },
      { x: 520, y: 244, w: 18, h: 52 },
      { x: 698, y: 244, w: 62, h: 18 },
      { x: 742, y: 244, w: 18, h: 52 },
      { x: 520, y: 448, w: 62, h: 18 },
      { x: 520, y: 414, w: 18, h: 52 },
      { x: 698, y: 448, w: 62, h: 18 },
      { x: 742, y: 414, w: 18, h: 52 },
      // East security wing partition
      { x: 924, y: 88, w: 16, h: 200 },
      { x: 924, y: 424, w: 16, h: 118 },
    ],
    plinths: [
      { x: 158, y: 468, w: 82, h: 36, pad: 24, label: 'SAFE COVER' },
      { x: 356, y: 518, w: 96, h: 36, pad: 24, label: 'SAFE COVER' },
      { x: 590, y: 536, w: 96, h: 36, pad: 24, label: 'SAFE COVER' },
      { x: 160, y: 274, w: 80, h: 38, pad: 24, label: 'SAFE COVER' },
      { x: 590, y: 124, w: 100, h: 36, pad: 24, label: 'SAFE COVER' },
      { x: 822, y: 470, w: 46, h: 72, pad: 24, label: 'SAFE COVER' },
      { x: 1044, y: 254, w: 54, h: 78, pad: 24, label: 'SAFE COVER' },
      { x: 1036, y: 484, w: 76, h: 36, pad: 24, label: 'SAFE COVER' },
    ],
    alcoves: [
      { x: 64, y: 358, w: 54, h: 86, label: 'SHADOW ALCOVE' },
      { x: 312, y: 90, w: 82, h: 48, label: 'SHADOW ALCOVE' },
      { x: 856, y: 90, w: 66, h: 52, label: 'SHADOW ALCOVE' },
      { x: 942, y: 204, w: 56, h: 68, label: 'SHADOW ALCOVE' },
    ],
    vents: [
      { id: 'v1a', pairId: 'v1b', x: 124, y: 140, label: 'VENT A' },
      { id: 'v1b', pairId: 'v1a', x: 988, y: 142, label: 'VENT B' },
    ],
    relays: [
      { id: 'r1', x: 444, y: 110, targetLaserIds: ['l1'], label: 'RELAY · LASER' },
    ],
    lasers: [
      { id: 'l1', x1: 932, y1: 288, x2: 932, y2: 424, relayId: 'r1', label: 'LASER GATE' },
    ],
    cameras: [
      { id: 'cam-1', label: 'CAM-01', x: 922, y: 246, baseAngle: 2.66, sweep: 0.56, period: 7.4, phase: 0.25, range: 245, halfFov: 0.34 },
      { id: 'cam-2', label: 'CAM-02', x: 1216, y: 398, baseAngle: 3.44, sweep: 0.60, period: 6.8, phase: 1.55, range: 248, halfFov: 0.34 },
    ],
    guards: [
      {
        id: 'g1',
        name: 'WARDEN VANCE',
        speed: 74,
        range: 222,
        halfFov: 0.47,
        bark: 'West gallery clear',
        waypoints: [
          { x: 394, y: 274, wait: 1.0, look: 0.15 },
          { x: 394, y: 454, wait: 2.0, look: 1.52 },
          { x: 472, y: 454, wait: 1.0, look: -0.15 },
          { x: 472, y: 274, wait: 2.0, look: -0.45 },
        ],
      },
      {
        id: 'g2',
        name: 'SENTRY HALE',
        speed: 78,
        range: 228,
        halfFov: 0.45,
        bark: 'East corridor clear',
        waypoints: [
          { x: 462, y: 196, wait: 1.0, look: 0.05 },
          { x: 842, y: 196, wait: 2.0, look: 1.57 },
          { x: 842, y: 320, wait: 1.0, look: 3.14 },
          { x: 800, y: 320, wait: 1.0, look: 2.35 },
        ],
      },
      {
        id: 'g3',
        name: 'WATCHER KNOX',
        speed: 74,
        range: 220,
        halfFov: 0.46,
        bark: 'Vault ring nominal',
        waypoints: [
          { x: 784, y: 400, wait: 1.0, look: 1.57 },
          { x: 784, y: 586, wait: 2.0, look: 3.14 },
          { x: 718, y: 586, wait: 1.0, look: -1.57 },
          { x: 718, y: 498, wait: 1.5, look: 0.25 },
        ],
      },
    ],
    callouts: [
      { x: 172, y: 108, text: 'SERVICE DUCT A' },
      { x: 640, y: 226, text: 'CHRONOMETER SANCTUM' },
      { x: 1080, y: 108, text: 'EAST LIFT FOYER' },
    ],
  },

  {
    id: 'vault-2',
    index: 1,
    sector: 'SECTOR B · SCALE 1:40',
    title: 'MINT SWITCHING FLOOR',
    parTime: 48,
    spawn: { x: 110, y: 356, angle: 0 },
    exit: { x: 1156, y: 356, radius: 30, label: 'EXIT LIFT' },
    loot: {
      id: 'loot-2',
      x: 642,
      y: 162,
      radius: 24,
      name: 'SOVEREIGN BULLION DIE',
      value: 580000,
      crackTime: 1.35,
    },
    bonuses: [
      { id: 'bonus-2', x: 642, y: 556, radius: 16, name: 'PROOF PLATE', value: 120000, crackTime: 0.7 },
    ],
    walls: [
      { x: 322, y: 88, w: 16, h: 170 },
      { x: 322, y: 452, w: 16, h: 170 },
      { x: 520, y: 274, w: 244, h: 16 },
      { x: 520, y: 422, w: 244, h: 16 },
      { x: 940, y: 88, w: 16, h: 176 },
      { x: 940, y: 446, w: 16, h: 176 },
    ],
    plinths: [
      { x: 184, y: 214, w: 72, h: 42, pad: 24, label: 'SAFE COVER' },
      { x: 184, y: 456, w: 72, h: 42, pad: 24, label: 'SAFE COVER' },
      { x: 404, y: 150, w: 54, h: 74, pad: 24, label: 'SAFE COVER' },
      { x: 404, y: 486, w: 54, h: 74, pad: 24, label: 'SAFE COVER' },
      { x: 604, y: 334, w: 76, h: 44, pad: 24, label: 'SAFE COVER' },
      { x: 824, y: 150, w: 54, h: 74, pad: 24, label: 'SAFE COVER' },
      { x: 824, y: 486, w: 54, h: 74, pad: 24, label: 'SAFE COVER' },
      { x: 1034, y: 224, w: 66, h: 40, pad: 24, label: 'SAFE COVER' },
      { x: 1034, y: 446, w: 66, h: 40, pad: 24, label: 'SAFE COVER' },
    ],
    alcoves: [
      { x: 64, y: 132, w: 58, h: 82, label: 'SHADOW ALCOVE' },
      { x: 64, y: 496, w: 58, h: 82, label: 'SHADOW ALCOVE' },
      { x: 958, y: 92, w: 76, h: 48, label: 'SHADOW ALCOVE' },
    ],
    vents: [
      { id: 'v2a', pairId: 'v2b', x: 122, y: 566, label: 'VENT A' },
      { id: 'v2b', pairId: 'v2a', x: 1144, y: 566, label: 'VENT B' },
    ],
    relays: [
      { id: 'r2a', x: 242, y: 112, targetLaserIds: ['l2a'], label: 'RELAY · NORTH' },
      { id: 'r2b', x: 882, y: 598, targetLaserIds: ['l2b'], label: 'RELAY · EXIT' },
    ],
    lasers: [
      { id: 'l2a', x1: 330, y1: 258, x2: 330, y2: 452, relayId: 'r2a', label: 'WEST LASER' },
      { id: 'l2b', x1: 948, y1: 264, x2: 948, y2: 446, relayId: 'r2b', label: 'EXIT LASER' },
    ],
    cameras: [
      { id: 'cam-21', label: 'CAM-01', x: 522, y: 92, baseAngle: 1.57, sweep: 0.72, period: 7.0, phase: 0.1, range: 235, halfFov: 0.34 },
      { id: 'cam-22', label: 'CAM-02', x: 762, y: 618, baseAngle: -1.57, sweep: 0.72, period: 6.4, phase: 1.8, range: 235, halfFov: 0.34 },
      { id: 'cam-23', label: 'CAM-03', x: 1214, y: 160, baseAngle: 2.74, sweep: 0.56, period: 6.8, phase: 0.9, range: 250, halfFov: 0.34 },
    ],
    guards: [
      {
        id: 'g21',
        name: 'INSPECTOR COLE',
        speed: 78,
        range: 225,
        halfFov: 0.45,
        bark: 'Press floor sealed',
        waypoints: [
          { x: 492, y: 220, wait: 1.0, look: 0 },
          { x: 790, y: 220, wait: 2.0, look: 1.57 },
          { x: 790, y: 124, wait: 1.0, look: 3.14 },
          { x: 492, y: 124, wait: 1.5, look: 0.4 },
        ],
      },
      {
        id: 'g22',
        name: 'WARDEN DALE',
        speed: 76,
        range: 220,
        halfFov: 0.46,
        bark: 'Central conduit clear',
        waypoints: [
          { x: 392, y: 356, wait: 1.0, look: 0 },
          { x: 544, y: 356, wait: 1.5, look: -0.4 },
          { x: 544, y: 356, wait: 1.0, look: 3.14 },
          { x: 392, y: 294, wait: 1.5, look: 1.57 },
        ],
      },
      {
        id: 'g23',
        name: 'SENTRY BRIGGS',
        speed: 80,
        range: 226,
        halfFov: 0.45,
        bark: 'South vault quiet',
        waypoints: [
          { x: 492, y: 478, wait: 1.0, look: 0 },
          { x: 790, y: 478, wait: 2.0, look: -1.57 },
          { x: 790, y: 586, wait: 1.0, look: 3.14 },
          { x: 492, y: 586, wait: 1.5, look: -0.35 },
        ],
      },
      {
        id: 'g24',
        name: 'WATCHER REID',
        speed: 74,
        range: 218,
        halfFov: 0.45,
        bark: 'East lift locked',
        waypoints: [
          { x: 996, y: 162, wait: 1.5, look: 1.57 },
          { x: 996, y: 548, wait: 2.0, look: 0 },
          { x: 1138, y: 516, wait: 1.0, look: -1.57 },
          { x: 1138, y: 204, wait: 1.5, look: 3.14 },
        ],
      },
    ],
    callouts: [
      { x: 642, y: 108, text: 'DIE STAMPING CHAMBER' },
      { x: 642, y: 314, text: 'CENTRAL SWITCHING GALLERY' },
      { x: 1094, y: 316, text: 'SERVICE EXTRACTION' },
    ],
  },

  {
    id: 'vault-3',
    index: 2,
    sector: 'SECTOR C · SCALE 1:40',
    title: 'THE AMBER ROTUNDA',
    parTime: 54,
    spawn: { x: 116, y: 146, angle: 0.4 },
    exit: { x: 1152, y: 560, radius: 30, label: 'EXIT LIFT' },
    loot: {
      id: 'loot-3',
      x: 640,
      y: 355,
      radius: 24,
      name: 'IMPERIAL PENDULUM',
      value: 740000,
      crackTime: 1.45,
    },
    bonuses: [
      { id: 'bonus-3', x: 1152, y: 144, radius: 16, name: 'AMBER PRISM', value: 150000, crackTime: 0.7 },
    ],
    walls: [
      // Inner rotunda walls with 4 narrow security gates
      { x: 460, y: 204, w: 120, h: 16 },
      { x: 700, y: 204, w: 120, h: 16 },
      { x: 460, y: 490, w: 120, h: 16 },
      { x: 700, y: 490, w: 120, h: 16 },
      { x: 460, y: 204, w: 16, h: 98 },
      { x: 460, y: 408, w: 16, h: 98 },
      { x: 804, y: 204, w: 16, h: 98 },
      { x: 804, y: 408, w: 16, h: 98 },
      // Wing baffles
      { x: 246, y: 280, w: 16, h: 150 },
      { x: 1018, y: 280, w: 16, h: 150 },
    ],
    plinths: [
      { x: 160, y: 220, w: 66, h: 36, pad: 24, label: 'SAFE COVER' },
      { x: 320, y: 132, w: 86, h: 36, pad: 24, label: 'SAFE COVER' },
      { x: 320, y: 540, w: 86, h: 36, pad: 24, label: 'SAFE COVER' },
      { x: 520, y: 268, w: 46, h: 46, pad: 22, label: 'SAFE COVER' },
      { x: 714, y: 394, w: 46, h: 46, pad: 22, label: 'SAFE COVER' },
      { x: 874, y: 132, w: 86, h: 36, pad: 24, label: 'SAFE COVER' },
      { x: 874, y: 540, w: 86, h: 36, pad: 24, label: 'SAFE COVER' },
      { x: 1068, y: 448, w: 68, h: 36, pad: 24, label: 'SAFE COVER' },
    ],
    alcoves: [
      { x: 64, y: 496, w: 66, h: 86, label: 'SHADOW ALCOVE' },
      { x: 604, y: 90, w: 72, h: 46, label: 'SHADOW ALCOVE' },
      { x: 604, y: 574, w: 72, h: 46, label: 'SHADOW ALCOVE' },
      { x: 1152, y: 296, w: 62, h: 88, label: 'SHADOW ALCOVE' },
    ],
    vents: [
      { id: 'v3a', pairId: 'v3b', x: 134, y: 562, label: 'VENT A' },
      { id: 'v3b', pairId: 'v3a', x: 548, y: 422, label: 'VENT B' },
    ],
    relays: [
      { id: 'r3a', x: 186, y: 598, targetLaserIds: ['l3a', 'l3b'], label: 'RELAY · RING' },
    ],
    lasers: [
      { id: 'l3a', x1: 468, y1: 302, x2: 468, y2: 408, relayId: 'r3a', label: 'WEST GATE' },
      { id: 'l3b', x1: 812, y1: 302, x2: 812, y2: 408, relayId: 'r3a', label: 'EAST GATE' },
    ],
    cameras: [
      { id: 'cam-31', label: 'CAM-01', x: 478, y: 222, baseAngle: 0.78, sweep: 0.56, period: 6.4, phase: 0.0, range: 238, halfFov: 0.34 },
      { id: 'cam-32', label: 'CAM-02', x: 800, y: 486, baseAngle: -2.35, sweep: 0.56, period: 6.4, phase: 3.1, range: 238, halfFov: 0.34 },
      { id: 'cam-33', label: 'CAM-03', x: 1214, y: 240, baseAngle: 2.9, sweep: 0.65, period: 6.0, phase: 1.4, range: 250, halfFov: 0.34 },
    ],
    guards: [
      {
        id: 'g31',
        name: 'WARDEN MARLOW',
        speed: 82,
        range: 230,
        halfFov: 0.46,
        bark: 'Outer ring sweep',
        waypoints: [
          { x: 350, y: 222, wait: 1.0, look: 0 },
          { x: 930, y: 222, wait: 1.5, look: 1.57 },
          { x: 930, y: 488, wait: 1.5, look: 3.14 },
          { x: 350, y: 488, wait: 1.5, look: -1.57 },
        ],
      },
      {
        id: 'g32',
        name: 'SENTRY QUINN',
        speed: 82,
        range: 230,
        halfFov: 0.46,
        bark: 'Counter-sweep active',
        waypoints: [
          { x: 930, y: 488, wait: 1.5, look: 3.14 },
          { x: 350, y: 488, wait: 1.0, look: -1.57 },
          { x: 350, y: 222, wait: 1.5, look: 0 },
          { x: 930, y: 222, wait: 1.5, look: 1.57 },
        ],
      },
      {
        id: 'g33',
        name: 'WATCHER FROST',
        speed: 74,
        range: 215,
        halfFov: 0.46,
        bark: 'Pendulum chamber locked',
        waypoints: [
          { x: 640, y: 258, wait: 1.5, look: 1.57 },
          { x: 760, y: 355, wait: 1.5, look: 3.14 },
          { x: 640, y: 452, wait: 1.5, look: -1.57 },
          { x: 520, y: 355, wait: 1.5, look: 0 },
        ],
      },
      {
        id: 'g34',
        name: 'GUARD SUTTON',
        speed: 78,
        range: 225,
        halfFov: 0.44,
        bark: 'East lift wing clear',
        waypoints: [
          { x: 1076, y: 176, wait: 1.2, look: 1.57 },
          { x: 1076, y: 386, wait: 1.8, look: 0.4 },
          { x: 988, y: 386, wait: 1.0, look: -1.57 },
          { x: 988, y: 176, wait: 1.5, look: 0.2 },
        ],
      },
    ],
    callouts: [
      { x: 640, y: 186, text: 'AMBER PENDULUM CORE' },
      { x: 158, y: 108, text: 'NORTH ENTRY FOYER' },
      { x: 1096, y: 598, text: 'SOUTH EXIT CHUTE' },
    ],
  },

  {
    id: 'vault-4',
    index: 3,
    sector: 'SECTOR D · SCALE 1:40',
    title: 'GRAND CROWN VAULT',
    parTime: 62,
    spawn: { x: 112, y: 562, angle: -0.3 },
    exit: { x: 112, y: 146, radius: 30, label: 'EXIT LIFT' },
    loot: {
      id: 'loot-4',
      x: 1094,
      y: 356,
      radius: 26,
      name: 'CELESTIAL DIADEM',
      value: 1100000,
      crackTime: 1.6,
    },
    bonuses: [
      { id: 'bonus-4', x: 640, y: 136, radius: 16, name: 'CROWN CIPHER', value: 210000, crackTime: 0.75 },
    ],
    walls: [
      { x: 256, y: 296, w: 16, h: 120 },
      { x: 256, y: 88, w: 16, h: 128 },
      { x: 256, y: 496, w: 16, h: 126 },
      { x: 540, y: 88, w: 16, h: 176 },
      { x: 540, y: 446, w: 16, h: 176 },
      { x: 860, y: 88, w: 16, h: 176 },
      { x: 860, y: 446, w: 16, h: 176 },
      { x: 648, y: 274, w: 104, h: 16 },
      { x: 648, y: 422, w: 104, h: 16 },
    ],
    plinths: [
      { x: 132, y: 422, w: 72, h: 36, pad: 24, label: 'SAFE COVER' },
      { x: 132, y: 242, w: 72, h: 36, pad: 24, label: 'SAFE COVER' },
      { x: 352, y: 158, w: 84, h: 38, pad: 24, label: 'SAFE COVER' },
      { x: 352, y: 514, w: 84, h: 38, pad: 24, label: 'SAFE COVER' },
      { x: 374, y: 336, w: 62, h: 40, pad: 24, label: 'SAFE COVER' },
      { x: 668, y: 336, w: 64, h: 40, pad: 24, label: 'SAFE COVER' },
      { x: 944, y: 172, w: 76, h: 38, pad: 24, label: 'SAFE COVER' },
      { x: 944, y: 500, w: 76, h: 38, pad: 24, label: 'SAFE COVER' },
    ],
    alcoves: [
      { x: 64, y: 312, w: 54, h: 86, label: 'SHADOW ALCOVE' },
      { x: 558, y: 90, w: 54, h: 52, label: 'SHADOW ALCOVE' },
      { x: 558, y: 568, w: 54, h: 52, label: 'SHADOW ALCOVE' },
      { x: 1152, y: 116, w: 62, h: 86, label: 'SHADOW ALCOVE' },
    ],
    vents: [
      { id: 'v4a', pairId: 'v4b', x: 480, y: 136, label: 'VENT A' },
      { id: 'v4b', pairId: 'v4a', x: 982, y: 584, label: 'VENT B' },
    ],
    relays: [
      { id: 'r4a', x: 484, y: 598, targetLaserIds: ['l4a'], label: 'RELAY · INNER' },
      { id: 'r4b', x: 786, y: 112, targetLaserIds: ['l4b'], label: 'RELAY · CROWN' },
    ],
    lasers: [
      { id: 'l4a', x1: 548, y1: 264, x2: 548, y2: 446, relayId: 'r4a', label: 'INNER LASER' },
      { id: 'l4b', x1: 868, y1: 264, x2: 868, y2: 446, relayId: 'r4b', label: 'CROWN LASER' },
    ],
    cameras: [
      { id: 'cam-41', label: 'CAM-01', x: 274, y: 298, baseAngle: 0.0, sweep: 0.68, period: 6.4, phase: 0.2, range: 240, halfFov: 0.34 },
      { id: 'cam-42', label: 'CAM-02', x: 856, y: 240, baseAngle: 2.85, sweep: 0.62, period: 6.0, phase: 1.9, range: 240, halfFov: 0.34 },
      { id: 'cam-43', label: 'CAM-03', x: 1214, y: 224, baseAngle: 2.55, sweep: 0.58, period: 5.8, phase: 0.7, range: 255, halfFov: 0.34 },
      { id: 'cam-44', label: 'CAM-04', x: 1214, y: 492, baseAngle: -2.55, sweep: 0.58, period: 5.8, phase: 3.1, range: 255, halfFov: 0.34 },
    ],
    guards: [
      {
        id: 'g41',
        name: 'WARDEN MERCER',
        speed: 82,
        range: 230,
        halfFov: 0.46,
        bark: 'Antechamber sweep',
        waypoints: [
          { x: 312, y: 244, wait: 1.0, look: 0 },
          { x: 486, y: 244, wait: 1.5, look: 1.57 },
          { x: 486, y: 466, wait: 1.5, look: 3.14 },
          { x: 312, y: 466, wait: 1.5, look: -1.57 },
        ],
      },
      {
        id: 'g42',
        name: 'SENTRY DRAKE',
        speed: 84,
        range: 232,
        halfFov: 0.45,
        bark: 'North gallery secure',
        waypoints: [
          { x: 604, y: 220, wait: 1.0, look: 0 },
          { x: 806, y: 220, wait: 2.0, look: 1.57 },
          { x: 806, y: 355, wait: 1.0, look: 3.14 },
          { x: 604, y: 220, wait: 1.2, look: 0.5 },
        ],
      },
      {
        id: 'g43',
        name: 'WATCHER SHAW',
        speed: 84,
        range: 232,
        halfFov: 0.45,
        bark: 'South laser active',
        waypoints: [
          { x: 604, y: 488, wait: 1.0, look: 0 },
          { x: 806, y: 488, wait: 2.0, look: -1.57 },
          { x: 806, y: 586, wait: 1.0, look: 3.14 },
          { x: 604, y: 586, wait: 1.5, look: -0.4 },
        ],
      },
      {
        id: 'g44',
        name: 'CAPTAIN STERLING',
        speed: 82,
        range: 235,
        halfFov: 0.47,
        bark: 'Crown sanctum armed',
        waypoints: [
          { x: 926, y: 274, wait: 1.2, look: 0 },
          { x: 1122, y: 256, wait: 1.8, look: 1.57 },
          { x: 1122, y: 454, wait: 1.8, look: 3.14 },
          { x: 926, y: 438, wait: 1.2, look: -1.57 },
        ],
      },
    ],
    callouts: [
      { x: 162, y: 108, text: 'EXTRACTION LIFT' },
      { x: 700, y: 252, text: 'INNER VAULT LOCK' },
      { x: 1084, y: 108, text: 'GRAND CROWN SANCTUM' },
    ],
  },
];
