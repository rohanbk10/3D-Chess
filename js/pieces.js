/*************************************************************************
 * 4. MINIMALIST GEOMETRIC 3D WIZARD'S CHESS PIECES (MARBLE VS. OBSIDIAN)
 *************************************************************************/
const piecesGroup = new THREE.Group();
scene.add(piecesGroup);

// Map of active 3D piece objects keyed by square name ('e2')
const boardPieces = {};

function createPieceMesh(type, color) {
  const isWhite = color === 'w';
  const primaryMat = isWhite ? marbleMat : obsidianMat;
  const trimMat = isWhite ? marbleTrimMat : obsidianTrimMat;

  const root = new THREE.Group();
  // Inner animatable sub-group so idle bobbing/breathing doesn't conflict with board glide coordinates
  const body = new THREE.Group();
  root.add(body);

  // Common chamfered octagonal pedestal base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.16, 16), primaryMat);
  base.position.y = 0.08;
  base.castShadow = true;
  base.receiveShadow = true;
  body.add(base);

  const collarRing = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.035, 10, 24), trimMat);
  collarRing.rotation.x = Math.PI / 2;
  collarRing.position.y = 0.17;
  body.add(collarRing);

  if (type === 'p') {
    // PAWN: Tapered Obelisk Pillar + Levitating Crystalline Sphere
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 0.62, 12), primaryMat);
    column.position.y = 0.47;
    column.castShadow = true;
    column.receiveShadow = true;
    body.add(column);

    const headOrb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.23, 1), primaryMat);
    headOrb.position.y = 0.98;
    headOrb.castShadow = true;
    body.add(headOrb);
    root.userData.floatingCrown = headOrb;

  } else if (type === 'r') {
    // ROOK: Brutalist Gothic Bastion Tower with 4 Floating Crenellations
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.88, 0.56), primaryMat);
    tower.position.y = 0.6;
    tower.castShadow = true;
    tower.receiveShadow = true;
    body.add(tower);

    const battlementGroup = new THREE.Group();
    battlementGroup.position.y = 1.15;
    const corners = [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]];
    corners.forEach(([cx, cz]) => {
      const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.18), primaryMat);
      merlon.position.set(cx, 0, cz);
      merlon.castShadow = true;
      battlementGroup.add(merlon);
    });
    const coreGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), trimMat);
    coreGem.position.y = 0.08;
    battlementGroup.add(coreGem);
    body.add(battlementGroup);
    root.userData.floatingCrown = battlementGroup;

  } else if (type === 'n') {
    // KNIGHT: Angular Geometric Warhorse Bust with Armored Crest
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.38, 0.55, 8), primaryMat);
    torso.position.y = 0.44;
    torso.castShadow = true;
    body.add(torso);

    const headGroup = new THREE.Group();
    headGroup.position.y = 0.92;

    // Tilted angular neck & snout
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.62, 0.44), primaryMat);
    neck.rotation.x = isWhite ? -0.35 : 0.35;
    neck.castShadow = true;
    headGroup.add(neck);

    const muzzle = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.5, 4), primaryMat);
    muzzle.rotation.x = isWhite ? -Math.PI / 2.2 : Math.PI / 2.2;
    muzzle.rotation.y = Math.PI / 4;
    muzzle.position.set(0, 0.15, isWhite ? -0.28 : 0.28);
    muzzle.castShadow = true;
    headGroup.add(muzzle);

    const maneBlade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.18), trimMat);
    maneBlade.position.set(0, 0.12, isWhite ? 0.2 : -0.2);
    maneBlade.rotation.x = isWhite ? -0.25 : 0.25;
    headGroup.add(maneBlade);

    body.add(headGroup);
    root.userData.floatingCrown = headGroup;

  } else if (type === 'b') {
    // BISHOP: Tall Faceted Mitre Spire + Orbiting Halo Ring
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.05, 8), primaryMat);
    spire.position.y = 0.68;
    spire.castShadow = true;
    body.add(spire);

    const mitreCrown = new THREE.Group();
    mitreCrown.position.y = 1.32;
    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), primaryMat);
    mitreCrown.add(orb);

    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.03, 8, 24), trimMat);
    halo.rotation.x = Math.PI / 3;
    mitreCrown.add(halo);
    body.add(mitreCrown);
    root.userData.floatingCrown = mitreCrown;

  } else if (type === 'q') {
    // QUEEN: Hourglass Sovereign Column + Levitating 6-Pointed Coronet
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.4, 0.72, 16), primaryMat);
    lower.position.y = 0.52;
    lower.castShadow = true;
    body.add(lower);

    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.2, 0.55, 16), primaryMat);
    upper.position.y = 1.08;
    upper.castShadow = true;
    body.add(upper);

    const coronet = new THREE.Group();
    coronet.position.y = 1.52;
    const crownRing = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.04, 10, 24), trimMat);
    crownRing.rotation.x = Math.PI / 2;
    coronet.add(crownRing);

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 4), trimMat);
      spike.position.set(Math.cos(a) * 0.25, 0.12, Math.sin(a) * 0.25);
      coronet.add(spike);
    }
    const pearl = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 1), primaryMat);
    pearl.position.y = 0.12;
    coronet.add(pearl);
    body.add(coronet);
    root.userData.floatingCrown = coronet;

  } else if (type === 'k') {
    // KING: Grand Stepped Cathedral Monarch Pillar + Levitating Gothic Cross
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 1.15, 8), primaryMat);
    pillar.position.y = 0.73;
    pillar.castShadow = true;
    body.add(pillar);

    const mantle = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.28, 0.3, 8), trimMat);
    mantle.position.y = 1.38;
    mantle.castShadow = true;
    body.add(mantle);

    const crossGroup = new THREE.Group();
    crossGroup.position.y = 1.78;
    const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.12), trimMat);
    const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.12), trimMat);
    hBar.position.y = 0.06;
    crossGroup.add(vBar, hBar);
    body.add(crossGroup);
    root.userData.floatingCrown = crossGroup;
  }

  root.userData.body = body;
  root.userData.type = type;
  root.userData.color = color;
  root.userData.phase = Math.random() * Math.PI * 2;
  root.userData.baseCrownY = root.userData.floatingCrown ? root.userData.floatingCrown.position.y : 1.0;

  // Tag all child meshes so raycaster clicks resolve to this piece
  root.traverse(child => {
    if (child.isMesh) {
      child.userData.pieceRoot = root;
    }
  });

  return root;
}

