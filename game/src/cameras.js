// Sweeping wall CCTV domes, Camera Loop frozen-feed hacks, EMP stun timers, and laser tripwires.

import { canSeePoint, castVisionCone, pointToSegmentDist } from './raycast.js';

export function createCameras(blueprints) {
  return blueprints.map((bp) => ({
    ...bp,
    angle: bp.baseAngle,
    empTimer: 0,
    loopTimer: 0,
    alertLevel: 0,
    seeingPlayer: false,
    conePoly: [],
  }));
}

export function createLasers(blueprints) {
  return blueprints.map((l) => ({ ...l, disabled: false, empTimer: 0 }));
}

export function recomputeCameraCones(cameras, segments, smokes) {
  for (const cam of cameras) {
    if (cam.empTimer > 0) {
      cam.conePoly = [];
    } else {
      cam.conePoly = castVisionCone(cam.x, cam.y, cam.angle, cam.halfFov, cam.range, segments, smokes);
    }
  }
}

export function stepCamerasAndLasers(state, dt, segments, audio) {
  const { player, cameras, lasers, smokes } = state;
  const concealed = player.crouched && player.inCover;
  let spotter = null;

  for (const cam of cameras) {
    if (cam.empTimer > 0) {
      cam.empTimer = Math.max(0, cam.empTimer - dt);
      cam.seeingPlayer = false;
      cam.alertLevel = Math.max(0, cam.alertLevel - dt * 1.4);
      cam.conePoly = [];
      continue;
    }

    if (cam.loopTimer > 0) {
      cam.loopTimer = Math.max(0, cam.loopTimer - dt);
      cam.seeingPlayer = false;
      cam.alertLevel = 0;
      cam.conePoly = castVisionCone(cam.x, cam.y, cam.angle, cam.halfFov, cam.range, segments, smokes);
      continue;
    }

    const boost = 1 + (state.alarm / 100) * 0.38;
    const wave = Math.sin(state.time * boost * ((Math.PI * 2) / cam.period) + cam.phase);
    cam.angle = cam.baseAngle + wave * cam.sweep;
    cam.conePoly = castVisionCone(cam.x, cam.y, cam.angle, cam.halfFov, cam.range, segments, smokes);

    const sees = canSeePoint(cam, player.x, player.y, concealed, segments, smokes);
    cam.seeingPlayer = sees;
    if (sees) {
      cam.alertLevel = Math.min(1, cam.alertLevel + dt * 1.5);
      state.alarm = Math.min(100, state.alarm + dt * 22);
      state.lastSeen = { x: player.x, y: player.y, timer: 6.0 };
      spotter = {
        kind: 'camera',
        x: cam.x,
        y: cam.y,
        label: cam.label,
        reason: `CAPTURED ON LIVE ${cam.label} FEED — USE [4] CAM LOOP OR [2] EMP`,
      };
    } else {
      cam.alertLevel = Math.max(0, cam.alertLevel - dt * 0.7);
    }
  }

  for (const laser of lasers) {
    if (laser.disabled || laser.empTimer > 0) {
      if (laser.empTimer > 0) laser.empTimer = Math.max(0, laser.empTimer - dt);
      continue;
    }
    const hit = pointToSegmentDist(player.x, player.y, laser.x1, laser.y1, laser.x2, laser.y2);
    if (hit.dist < player.radius + 3) {
      state.alarm = Math.min(100, state.alarm + dt * 68);
      state.lastSeen = { x: player.x, y: player.y, timer: 6.0 };
      spotter = {
        kind: 'laser',
        x: hit.cx,
        y: hit.cy,
        label: laser.label,
        reason: `TRIPPED ${laser.label} LASER — CUT BREAKER OR USE [2] EMP PULSE`,
      };
      audio?.playAlarmPing();
    }
  }

  return spotter;
}
