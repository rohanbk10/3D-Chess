'use strict';
/*************************************************************************
 * CAMERA ORBIT CONTROLS, PRESETS & RAYCAST POINTER INTERACTION
 *************************************************************************/
const CAMERA_PRESETS = {
  white: { theta: 0, phi: 0.92, radius: 15.8 },
  black: { theta: Math.PI, phi: 0.92, radius: 15.8 },
  top: { theta: 0, phi: 0.18, radius: 16.5 }
};
let camSpherical = { ...CAMERA_PRESETS.white };
let targetSpherical = { ...CAMERA_PRESETS.white };
let autoOrbit = false;

function markCameraChip(preset) {
  ['white', 'black', 'top', 'orbit'].forEach(id => {
    const btn = document.getElementById('cam-' + id);
    btn.classList.toggle('m3-chip-active', id === preset);
    btn.setAttribute('aria-pressed', id === preset);
  });
}

function setCameraPreset(preset) {
  markCameraChip(preset);

  autoOrbit = preset === 'orbit';
  if (CAMERA_PRESETS[preset]) {
    targetSpherical = { ...CAMERA_PRESETS[preset] };
    // In Pass & Play the top-down view also faces the side that is about to move.
    if (preset === 'top' && settings.mode === 'pass' && game.turn() === 'b') targetSpherical.theta = Math.PI;
    // take the shortest way round when swinging between Marble and Obsidian
    const turns = Math.round((camSpherical.theta - targetSpherical.theta) / (Math.PI * 2));
    targetSpherical.theta += turns * Math.PI * 2;
  } else if (preset === 'orbit') {
    targetSpherical.phi = 0.85;
    targetSpherical.radius = 18.2;
  }
}

// Pass & Play: swing the camera round to whoever is about to move (keeping the
// current tilt and zoom). In vs AI mode the player is always Marble, so the
// camera only returns to the Marble side when switching into that mode.
let cameraFollowKey = '';
function followTurnCamera() {
  const key = settings.mode === 'pass' ? `pass:${game.turn()}:${game.history().length}` : 'ai';
  if (key === cameraFollowKey) return;
  cameraFollowKey = key;
  if (autoOrbit) return;

  const faceBlack = settings.mode === 'pass' && game.turn() === 'b';
  const base = faceBlack ? Math.PI : 0;
  // choose the equivalent angle closest to where the camera is now (shortest swing)
  const turns = Math.round((targetSpherical.theta - base) / (Math.PI * 2));
  targetSpherical.theta = base + turns * Math.PI * 2;
  markCameraChip(targetSpherical.phi < 0.4 ? 'top' : (faceBlack ? 'black' : 'white'));
}

function clampRadius(r) {
  return Math.max(9.5, Math.min(28, r));
}

// Pointer handling: one pointer = orbit (or click), two pointers = pinch zoom
const pointers = new Map();
let pointerDownPos = { x: 0, y: 0 };
let wasDragged = false;
let pinchStartDist = 0;
let pinchStartRadius = 0;

const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2();

function pointerDistance() {
  const [a, b] = [...pointers.values()];
  return Math.hypot(a.x - b.x, a.y - b.y);
}

renderer.domElement.addEventListener('pointerdown', e => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) {
    wasDragged = false;
    pointerDownPos = { x: e.clientX, y: e.clientY };
  } else if (pointers.size === 2) {
    wasDragged = true;
    pinchStartDist = pointerDistance();
    pinchStartRadius = targetSpherical.radius;
  }
  initAudio(); // browsers only allow audio after a user gesture
});

window.addEventListener('pointermove', e => {
  const prev = pointers.get(e.pointerId);
  if (!prev) return;
  const dx = e.clientX - prev.x;
  const dy = e.clientY - prev.y;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (pointers.size >= 2) {
    if (pinchStartDist > 0) targetSpherical.radius = clampRadius(pinchStartRadius * pinchStartDist / pointerDistance());
    return;
  }

  const totalMove = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
  if (totalMove > 6) {
    wasDragged = true;
    if (autoOrbit) setCameraPreset('white');
    targetSpherical.theta -= dx * 0.0075;
    targetSpherical.phi = Math.max(0.15, Math.min(1.42, targetSpherical.phi - dy * 0.0065));
  }
});

function endPointer(e) {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  if (pointers.size === 0 && !wasDragged && e.type === 'pointerup') {
    handleCanvasClick(e.clientX, e.clientY);
  }
}
window.addEventListener('pointerup', endPointer);
window.addEventListener('pointercancel', endPointer);

renderer.domElement.addEventListener('wheel', e => {
  e.preventDefault();
  targetSpherical.radius = clampRadius(targetSpherical.radius + e.deltaY * 0.012);
}, { passive: false });

function handleCanvasClick(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouseNDC, camera);

  const pieceTargets = [];
  piecesGroup.traverse(obj => { if (obj.isMesh) pieceTargets.push(obj); });

  const hits = raycaster.intersectObjects([...pieceTargets, ...tileMeshes], false);
  if (hits.length === 0) return;
  const hitObj = hits[0].object;
  if (hitObj.userData.pieceRoot) selectSquare(hitObj.userData.pieceRoot.userData.square);
  else if (hitObj.userData.isTile) selectSquare(hitObj.userData.square);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  // keep the whole board in view on tall/narrow (portrait) screens
  camera.fov = camera.aspect < 1
    ? Math.min(84, Math.max(42, 2 * Math.atan(0.46 / camera.aspect) * 180 / Math.PI))
    : 42;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);
