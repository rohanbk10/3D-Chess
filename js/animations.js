/*************************************************************************
 * 5. CUSTOM WIZARD'S CHESS ANIMATIONS (IDLE, GLIDE, LUNGE ATTACK, SHATTER)
 *************************************************************************/
const activeFragments = []; // 3D Voronoi-like stone shards flying & fading on capture
let activeMoveAnimation = null; // Currently executing move/attack sequence

// Spawns 26 jagged 3D stone shards that explode outward, bounce on the board, and dissolve
function spawnShatterExplosion(worldPos, victimColor, impactDir) {
  const isWhite = victimColor === 'w';
  const shardCount = 28;

  for (let i = 0; i < shardCount; i++) {
    const radius = 0.09 + Math.random() * 0.16;
    const geo = i % 2 === 0
      ? new THREE.DodecahedronGeometry(radius, 0)
      : new THREE.TetrahedronGeometry(radius * 1.25, 0);

    // Clone material to allow individual opacity fade-out
    const mat = (i % 5 === 0)
      ? (isWhite ? marbleTrimMat.clone() : obsidianTrimMat.clone())
      : (isWhite ? marbleMat.clone() : obsidianMat.clone());
    mat.transparent = true;
    mat.opacity = 1.0;

    const shard = new THREE.Mesh(geo, mat);
    shard.castShadow = true;

    shard.position.set(
      worldPos.x + (Math.random() - 0.5) * 0.45,
      0.25 + Math.random() * 1.1,
      worldPos.z + (Math.random() - 0.5) * 0.45
    );

    // Explosive impulse biased along the attacker's strike direction
    const spreadX = (Math.random() - 0.5) * 4.5 + impactDir.x * (2.2 + Math.random() * 2.5);
    const spreadZ = (Math.random() - 0.5) * 4.5 + impactDir.z * (2.2 + Math.random() * 2.5);
    const upVel = 2.4 + Math.random() * 4.2;

    shard.userData = {
      vel: new THREE.Vector3(spreadX, upVel, spreadZ),
      rotVel: new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12
      ),
      age: 0,
      maxAge: 2.2 + Math.random() * 1.0
    };

    scene.add(shard);
    activeFragments.push(shard);
  }
}

// Queue a smooth 3D move or Wizard's Chess Lunge + Shatter sequence
function animatePieceAction({ fromSq, toSq, capturedPieceRoot, rookGlide, onComplete }) {
  const mover = boardPieces[fromSq];
  if (!mover) {
    if (onComplete) onComplete();
    return;
  }

  const startPos = squareToWorld(fromSq);
  const targetPos = squareToWorld(toSq);
  const delta = new THREE.Vector3().subVectors(targetPos, startPos);
  const dist = delta.length();
  const dir = delta.clone().normalize();

  const isKnight = mover.userData.type === 'n';
  const isCapture = Boolean(capturedPieceRoot);

  playSound(isCapture ? 'attack' : 'move');

  activeMoveAnimation = {
    mover,
    capturedPieceRoot,
    startPos,
    targetPos,
    dir,
    dist,
    isKnight,
    isCapture,
    shattered: false,
    elapsed: 0,
    duration: isCapture ? 0.68 : 0.44,
    toSq,
    rookGlide,
    onComplete
  };
}

