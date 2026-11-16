/*************************************************************************
 * 2. THREE.JS SCENE, MINIMALIST GOTHIC CATHEDRAL & LIGHTING
 *************************************************************************/
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x100f16);
scene.fog = new THREE.FogExp2(0x100f16, 0.016);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 160);
const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches;
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
} catch (err) {
  showFatalError('Your browser or device could not start WebGL, which this 3D game needs. Try a recent version of Chrome, Edge, Firefox or Safari with hardware acceleration enabled.');
  throw err;
}
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_TOUCH ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
container.appendChild(renderer.domElement);

// Cathedral Lighting Setup
const ambientLight = new THREE.AmbientLight(0xd8d0f8, 0.55);
scene.add(ambientLight);

// Main High Vault Spotlight casting crisp shadows across the 64-square altar
const mainSpot = new THREE.SpotLight(0xfff7e8, 1.9);
mainSpot.position.set(8, 24, 10);
mainSpot.angle = Math.PI / 3.2;
mainSpot.penumbra = 0.65;
mainSpot.castShadow = true;
mainSpot.shadow.mapSize.width = IS_TOUCH ? 1024 : 2048;
mainSpot.shadow.mapSize.height = IS_TOUCH ? 1024 : 2048;
mainSpot.shadow.camera.near = 6;
mainSpot.shadow.camera.far = 45;
mainSpot.shadow.bias = -0.0005;
scene.add(mainSpot);

// Stained Glass Coloured Rim Lights (Amethyst & Rose Cathedral Accents)
const purpleStainedLight = new THREE.PointLight(0x9d6bff, 1.6, 38);
purpleStainedLight.position.set(-14, 10, -10);
scene.add(purpleStainedLight);

const amberStainedLight = new THREE.PointLight(0xff9e5e, 1.25, 38);
amberStainedLight.position.set(14, 10, 10);
scene.add(amberStainedLight);

const cyanRoseLight = new THREE.PointLight(0x5ec2ff, 1.1, 45);
cyanRoseLight.position.set(0, 16, -22);
scene.add(cyanRoseLight);

// Materials for Cathedral & Pieces
const cathedralStoneMat = new THREE.MeshStandardMaterial({
  color: 0x1e1c26,
  roughness: 0.82,
  metalness: 0.12
});
const darkRibMat = new THREE.MeshStandardMaterial({
  color: 0x15131b,
  roughness: 0.7,
  metalness: 0.25
});

// Polished White Marble Material
const marbleMat = new THREE.MeshPhysicalMaterial({
  color: 0xf5f2eb,
  roughness: 0.14,
  metalness: 0.05,
  clearcoat: 0.85,
  clearcoatRoughness: 0.12,
  reflectivity: 0.9
});

// Glossy Dark Obsidian Material with subtle violet edge sheen
const obsidianMat = new THREE.MeshPhysicalMaterial({
  color: 0x181522,
  emissive: 0x0b0716,
  roughness: 0.08,
  metalness: 0.35,
  clearcoat: 1.0,
  clearcoatRoughness: 0.06,
  reflectivity: 1.0
});

// Gold & Amethyst Accent Trim on Royal Pieces
const marbleTrimMat = new THREE.MeshStandardMaterial({
  color: 0xd4af37,
  roughness: 0.25,
  metalness: 0.85
});
const obsidianTrimMat = new THREE.MeshStandardMaterial({
  color: 0xb784ff,
  emissive: 0x3b1d70,
  roughness: 0.2,
  metalness: 0.8
});

// Build Minimalist Gothic Cathedral Architecture
const cathedralGroup = new THREE.Group();
scene.add(cathedralGroup);

function buildGothicCathedral() {
  // Expansive Sanctuary Nave Floor
  const naveFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(36, 36, 0.6, 64),
    new THREE.MeshStandardMaterial({ color: 0x131118, roughness: 0.6, metalness: 0.2 })
  );
  naveFloor.position.y = -1.2;
  naveFloor.receiveShadow = true;
  cathedralGroup.add(naveFloor);

  // Stepped Octagonal Dais under the Chess Board
  for (let i = 0; i < 3; i++) {
    const radius = 8.4 - i * 0.65;
    const step = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius + 0.15, 0.3, 8),
      cathedralStoneMat
    );
    step.position.y = -0.8 + i * 0.28;
    step.rotation.y = Math.PI / 8;
    step.receiveShadow = true;
    step.castShadow = true;
    cathedralGroup.add(step);
  }

  // 8 Pairs of Clustered Gothic Columns & Pointed Lancet Arches forming the Nave
  const columnPositions = [
    [-13, -15], [13, -15],
    [-13, -5],  [13, -5],
    [-13, 5],   [13, 5],
    [-13, 15],  [13, 15]
  ];

  columnPositions.forEach(([x, z], idx) => {
    const pillarGroup = new THREE.Group();
    pillarGroup.position.set(x, -0.9, z);

    // Plinth Base
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 2.2), darkRibMat);
    plinth.position.y = 0.6;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    pillarGroup.add(plinth);

    // Central Pier + 4 Clustered Shafts
    const mainShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.78, 18, 16), cathedralStoneMat);
    mainShaft.position.y = 9.6;
    mainShaft.castShadow = true;
    mainShaft.receiveShadow = true;
    pillarGroup.add(mainShaft);

    const offsets = [[0.65, 0], [-0.65, 0], [0, 0.65], [0, -0.65]];
    offsets.forEach(([ox, oz]) => {
      const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 18, 12), darkRibMat);
      rib.position.set(ox, 9.6, oz);
      pillarGroup.add(rib);
    });

    // Capital
    const capital = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.75, 1.0, 8), darkRibMat);
    capital.position.y = 18.8;
    pillarGroup.add(capital);

    // Floating Magical Brazier Sconce on inner side of each pillar
    const sconceDir = x < 0 ? 1.2 : -1.2;
    const sconceColor = idx % 2 === 0 ? 0xd0bcff : 0xffb784;
    const orb = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.28, 1),
      new THREE.MeshBasicMaterial({ color: sconceColor })
    );
    orb.position.set(sconceDir, 5.2, 0);
    orb.userData = { baseY: 5.2, phase: idx * 0.9 };
    floatingOrbs.push(orb);
    pillarGroup.add(orb);

    cathedralGroup.add(pillarGroup);
  });

  // Transverse Pointed Gothic Vault Ribs spanning across X (-13 to +13)
  [-15, -5, 5, 15].forEach(z => {
    const archGroup = new THREE.Group();
    archGroup.position.set(0, 18.2, z);

    // Left & Right curved vault ribs meeting at a pointed apex
    const leftRib = new THREE.Mesh(
      new THREE.TorusGeometry(14.5, 0.28, 10, 32, Math.PI / 2.65),
      darkRibMat
    );
    leftRib.position.set(-1.5, -2.2, 0);
    leftRib.rotation.z = Math.PI / 10;
    archGroup.add(leftRib);

    const rightRib = new THREE.Mesh(
      new THREE.TorusGeometry(14.5, 0.28, 10, 32, Math.PI / 2.65),
      darkRibMat
    );
    rightRib.position.set(1.5, -2.2, 0);
    rightRib.rotation.y = Math.PI;
    rightRib.rotation.z = Math.PI / 10;
    archGroup.add(rightRib);

    // Boss Keystone at the pointed crown
    const keystone = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.65, 0),
      new THREE.MeshStandardMaterial({ color: 0xd0bcff, emissive: 0x381e72, roughness: 0.3 })
    );
    keystone.position.set(0, 11.4, 0);
    archGroup.add(keystone);

    cathedralGroup.add(archGroup);
  });

  // Grand Stained-Glass Rose Window at the North Apse (Z = -24)
  const roseGroup = new THREE.Group();
  roseGroup.position.set(0, 11, -24);

  const outerRing = new THREE.Mesh(
    new THREE.TorusGeometry(6.8, 0.5, 16, 48),
    darkRibMat
  );
  roseGroup.add(outerRing);

  const stainedColors = [0x9d6bff, 0x5ec2ff, 0xff7eb6, 0xffb86c];
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    // Spoke tracery
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 13, 8), darkRibMat);
    spoke.rotation.z = angle;
    roseGroup.add(spoke);

    // Glowing Stained Glass Petal
    const petalMat = new THREE.MeshBasicMaterial({
      color: stainedColors[i % stainedColors.length],
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide
    });
    const petal = new THREE.Mesh(new THREE.CircleGeometry(1.15, 6), petalMat);
    petal.position.set(Math.cos(angle) * 4.3, Math.sin(angle) * 4.3, -0.1);
    roseGroup.add(petal);
  }

  const centerRosette = new THREE.Mesh(
    new THREE.CircleGeometry(2.1, 12),
    new THREE.MeshBasicMaterial({ color: 0xeaddff, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
  );
  centerRosette.position.z = -0.15;
  roseGroup.add(centerRosette);

  cathedralGroup.add(roseGroup);
}

const floatingOrbs = [];
buildGothicCathedral();

/*************************************************************************
 * 3. 64-SQUARE BOARD & INTERACTIVE TILE HIGHLIGHTS
 *************************************************************************/
const BOARD_SIZE = 8;
const TILE_SIZE = 1.25;
const BOARD_OFFSET = ((BOARD_SIZE - 1) * TILE_SIZE) / 2;

const boardGroup = new THREE.Group();
scene.add(boardGroup);

const tileMeshes = []; // 64 squares for raycasting
const highlightMeshes = {}; // keyed by algebraic square ('e4')

function squareToWorld(sq) {
  const file = sq.charCodeAt(0) - 97; // 'a' -> 0 .. 'h' -> 7
  const rank = parseInt(sq[1], 10) - 1; // '1' -> 0 .. '8' -> 7
  const x = file * TILE_SIZE - BOARD_OFFSET;
  const z = (7 - rank) * TILE_SIZE - BOARD_OFFSET;
  return new THREE.Vector3(x, 0, z);
}

function buildChessBoard() {
  // Heavy Carved Obsidian-Marble Frame
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(BOARD_SIZE * TILE_SIZE + 1.8, 0.42, BOARD_SIZE * TILE_SIZE + 1.8),
    darkRibMat
  );
  frame.position.y = -0.22;
  frame.receiveShadow = true;
  frame.castShadow = true;
  boardGroup.add(frame);

  // Raised metallic border around the squares (four bars, so the squares stay visible)
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x9b82d8, roughness: 0.3, metalness: 0.8 });
  const side = BOARD_SIZE * TILE_SIZE;
  const bar = 0.14;
  [[0, side / 2 + bar / 2, side + bar * 2, bar], [0, -(side / 2 + bar / 2), side + bar * 2, bar],
   [side / 2 + bar / 2, 0, bar, side], [-(side / 2 + bar / 2), 0, bar, side]].forEach(([x, z, w, d]) => {
    const piece = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), rimMat);
    piece.position.set(x, 0.0, z);
    piece.castShadow = true;
    boardGroup.add(piece);
  });

  const lightSquareMat = new THREE.MeshPhysicalMaterial({
    color: 0xf2ead9,
    roughness: 0.55,
    metalness: 0,
    clearcoat: 0.1
  });
  const darkSquareMat = new THREE.MeshPhysicalMaterial({
    color: 0x0d0b14,
    roughness: 0.4,
    metalness: 0.1,
    clearcoat: 0.2
  });

  const tileGeo = new THREE.BoxGeometry(TILE_SIZE * 0.98, 0.18, TILE_SIZE * 0.98);

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const isLight = (r + f) % 2 === 1;
      const sqName = String.fromCharCode(97 + f) + (r + 1);
      const tile = new THREE.Mesh(tileGeo, isLight ? lightSquareMat : darkSquareMat);
      const pos = squareToWorld(sqName);
      tile.position.set(pos.x, -0.09, pos.z);
      tile.receiveShadow = true;
      tile.userData = { square: sqName, isTile: true };
      boardGroup.add(tile);
      tileMeshes.push(tile);

      // Create M3 Tactical Ring / Highlight Overlay per square
      const hlGroup = new THREE.Group();
      hlGroup.position.set(pos.x, 0.02, pos.z);
      hlGroup.visible = false;

      // Disc for valid quiet move, Ring for valid shatter capture, Selected halo
      const dotMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.03, 24),
        new THREE.MeshBasicMaterial({ color: 0xd0bcff, transparent: true, opacity: 0.85 })
      );
      hlGroup.add(dotMesh);

      const captureRing = new THREE.Mesh(
        new THREE.RingGeometry(0.42, 0.55, 32),
        new THREE.MeshBasicMaterial({ color: 0xff6b8b, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
      );
      captureRing.rotation.x = -Math.PI / 2;
      captureRing.visible = false;
      hlGroup.add(captureRing);

      const selectPad = new THREE.Mesh(
        new THREE.PlaneGeometry(TILE_SIZE * 0.92, TILE_SIZE * 0.92),
        new THREE.MeshBasicMaterial({ color: 0xb69df8, side: THREE.DoubleSide, transparent: true, opacity: 0.38 })
      );
      selectPad.rotation.x = -Math.PI / 2;
      selectPad.visible = false;
      hlGroup.add(selectPad);

      const makePad = (color, opacity, y) => {
        const pad = new THREE.Mesh(
          new THREE.PlaneGeometry(TILE_SIZE * 0.96, TILE_SIZE * 0.96),
          new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity, depthWrite: false })
        );
        pad.rotation.x = -Math.PI / 2;
        pad.position.y = y;
        pad.visible = false;
        hlGroup.add(pad);
        return pad;
      };
      const lastPad = makePad(0xffc857, 0.28, -0.006);   // last move
      const hintPad = makePad(0x6dffb0, 0.4, -0.003);    // spell hint
      const checkPad = makePad(0xff3b5c, 0.6, 0.004);    // king in check
      selectPad.position.y = 0.002;

      boardGroup.add(hlGroup);
      highlightMeshes[sqName] = { group: hlGroup, dot: dotMesh, ring: captureRing, pad: selectPad, last: lastPad, hint: hintPad, check: checkPad };
    }
  }
}

buildChessBoard();

// a-h / 1-8 coordinate labels engraved on the board frame
function buildBoardLabels() {
  const makeLabel = text => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.font = 'bold 92px Cinzel, Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 8;
    g.strokeStyle = '#000';
    g.strokeText(text, 64, 68);
    g.fillStyle = '#f0d27a';
    g.fillText(text, 64, 68);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.62),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
    );
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  };
  // Labels on all four sides of the frame; the far sides are flipped so they
  // read upright from the Obsidian camera too.
  const edge = (BOARD_SIZE * TILE_SIZE) / 2 + 0.52;
  for (let i = 0; i < 8; i++) {
    const fileCh = 'abcdefgh'[i].toUpperCase();
    const fp = squareToWorld('abcdefgh'[i] + '1');
    const rp = squareToWorld('a' + (i + 1));
    [[fp.x, edge, 0], [fp.x, -edge, Math.PI]].forEach(([x, z, rot]) => {
      const m = makeLabel(fileCh);
      m.position.set(x, 0.012, z);
      m.rotation.z = rot;
      boardGroup.add(m);
    });
    [[-edge, rp.z, 0], [edge, rp.z, Math.PI]].forEach(([x, z, rot]) => {
      const m = makeLabel(String(i + 1));
      m.position.set(x, 0.012, z);
      m.rotation.z = rot;
      boardGroup.add(m);
    });
  }
}
buildBoardLabels();

