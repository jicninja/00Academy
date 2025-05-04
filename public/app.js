import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.153.0/build/three.module.js';

// Globals
let camera, scene, renderer, flashLight, video;
let indexFingerSphere;
let indexFingerTip;
let previousScreenX = 0;
let previousScreenY = 0;
const cubes = [];
const aimDiv = document.getElementById('aim');

// === Utility Functions ===
function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// === THREE.js Setup ===
function initThree() {
  scene = new THREE.Scene();

  // Camera Setup
  camera = new THREE.PerspectiveCamera(
    0,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 5;
  animateFOVTransition(camera, 10, 50, 2000);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Lighting
  scene.add(new THREE.AmbientLight(0x00ffff, 0.02));
  flashLight = new THREE.SpotLight(0xffffff, 1, 100, Math.PI / 3.2, 0.2);
  flashLight.position.set(-1.5, -0.5, 6);
  flashLight.castShadow = true;
  flashLight.shadow.mapSize.set(1024, 1024);
  scene.add(flashLight);

  // Finger Sphere
  indexFingerSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xff0000 })
  );
  indexFingerSphere.castShadow = true;
  scene.add(indexFingerSphere);

  // Room Walls
  const wallMat = createWallMaterial('./assets/grid.jpg');
  const wallGeo = new THREE.PlaneGeometry(100, 100);
  const wallConfigs = [
    { rot: [-Math.PI / 2, 0, 0], pos: [0, -2, 0] }, // Floor
    { rot: [Math.PI / 2, 0, 0], pos: [0, 10, 0] }, // Ceiling
    { rot: [0, Math.PI / 2, 0], pos: [-10, 4, 0] }, // Left
    { rot: [0, -Math.PI / 2, 0], pos: [10, 4, 0] }, // Right
    { rot: [0, 0, 0], pos: [0, 4, -100] }, // Back
  ];
  wallConfigs.forEach(({ rot, pos }) =>
    createWall(
      wallGeo,
      wallMat,
      new THREE.Euler(...rot),
      new THREE.Vector3(...pos)
    )
  );

  // Cubes
  const cubeGeo = new THREE.BoxGeometry();
  const cubeMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
  createCubes(getStaticCubePositions(), cubeGeo, cubeMat);
  createCubes(getRandomCubePositions(100), cubeGeo, cubeMat);

  window.addEventListener('resize', onWindowResize);
}

function animateFOVTransition(camera, startFOV, endFOV, duration) {
  const startTime = performance.now();
  function animate() {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    camera.fov = startFOV + (endFOV - startFOV) * easeInOutQuad(progress);
    camera.updateProjectionMatrix();
    if (progress < 1) requestAnimationFrame(animate);
  }
  animate();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function createWallMaterial(texturePath) {
  const texture = new THREE.TextureLoader().load(texturePath);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 5);
  return new THREE.MeshStandardMaterial({
    map: texture,
    emissiveMap: texture,
    emissive: new THREE.Color(0x00ff00),
    emissiveIntensity: 0.1,
  });
}

function createWall(geometry, material, rotation, position) {
  const wall = new THREE.Mesh(geometry, material);
  wall.rotation.copy(rotation);
  wall.position.copy(position);
  wall.receiveShadow = true;
  scene.add(wall);
}

function createCubes(positions, geometry, material) {
  positions.forEach((pos) => {
    const cube = new THREE.Mesh(geometry, material);
    cube.position.copy(pos);
    cube.castShadow = cube.receiveShadow = true;
    cube.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );
    scene.add(cube);
    cubes.push(cube);
  });
}

function getStaticCubePositions() {
  return [
    { x: -2, y: 2, z: 0 },
    { x: 2, y: 1, z: -1 },
    { x: 0, y: -1, z: 2 },
    { x: 1, y: 2, z: -2 },
    { x: -3, y: 0, z: -10 },
    { x: 3, y: 1, z: -20 },
    { x: 0, y: 0, z: -30 },
    { x: 2, y: 2, z: -40 },
    { x: -2, y: 1, z: -50 },
    { x: 4, y: -1, z: -60 },
    { x: -1, y: 3, z: -70 },
    { x: 1, y: 0, z: -80 },
    { x: -1, y: 3, z: -90 },
  ].map((pos) => new THREE.Vector3(pos.x, pos.y, pos.z));
}

function getRandomCubePositions(count) {
  return Array.from(
    { length: count },
    () =>
      new THREE.Vector3(
        THREE.MathUtils.randFloat(-9.5, 9.5),
        THREE.MathUtils.randFloat(-0.5, 9.5),
        THREE.MathUtils.randFloat(-99.5, -0.5)
      )
  );
}

// === Animation Loop ===
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

// === Video Setup ===
async function setupVideo() {
  video = Object.assign(document.createElement('video'), {
    autoplay: true,
    playsInline: true,
  });
  document.body.appendChild(video);
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  await video.play();
}

// === Face Detection ===
async function initFaceDetection() {
  const detector = await faceDetection.createDetector(
    faceDetection.SupportedModels.MediaPipeFaceDetector,
    {
      runtime: 'mediapipe',
      solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection',
      modelSelection: 1,
    }
  );

  async function detectFaces() {
    const faces = await detector.estimateFaces(video);
    const face = faces[0];
    if (face) {
      const { box } = face;
      const faceSize = Math.max(box.xMax - box.xMin, box.yMax - box.yMin);
      const depth = THREE.MathUtils.clamp(10 - faceSize / 50, 2, 10);
      const centerX = box.xMin + (box.xMax - box.xMin) / 2;
      const centerY = box.yMin + (box.yMax - box.yMin) / 2;
      const normX = (centerX / video.videoWidth) * 2 - 1;
      const normY = -(centerY / video.videoHeight) * 2 + 1;
      const targetZ = camera.position.z + (depth - camera.position.z) * 0.5;
      const target = new THREE.Vector3(-normX * 5, normY * 3, targetZ);
      camera.position.lerp(target, 0.075);
      flashLight.position.lerp(
        target.clone().add(new THREE.Vector3(0, 0.5, 0)),
        0.01
      );
      camera.lookAt(0, 0, -targetZ);
    }
    requestAnimationFrame(detectFaces);
  }

  detectFaces();
}

// === Hand Detection ===
async function initHandDetection() {
  const detector = await handPoseDetection.createDetector(
    handPoseDetection.SupportedModels.MediaPipeHands,
    {
      runtime: 'mediapipe',
      solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
      modelSelection: 1,
    }
  );

  document.addEventListener('mousedown', () => {
    console.log('indexFingerTip', indexFingerTip);
  });

  async function detectHands() {
    const hands = await detector.estimateHands(video);
    const hand = hands[0];
    if (!hand || !hand.keypoints) {
      requestAnimationFrame(detectHands);
      return;
    }

    const wrist = hand.keypoints[0];
    const rawScreenX = window.innerWidth * (1 - wrist.x / video.videoWidth);
    const rawScreenY = window.innerHeight * (wrist.y / video.videoHeight);

    const smoothing = 0.8;
    const screenX = previousScreenX * smoothing + rawScreenX * (1 - smoothing);
    const screenY =
      previousScreenY * smoothing + rawScreenY * (1 - smoothing) - 50;
    previousScreenX = screenX;
    previousScreenY = screenY;

    const index = hand.keypoints[8];
    const thumb = hand.keypoints[4];
    indexFingerTip = index;

    if (index && thumb) {
      const dx = index.x - thumb.x;
      const dy = index.y - thumb.y;
      const dz = (index.z || 0) - (thumb.z || 0);
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (distance > 50)
        console.log('Pulgar lejos del índice: gesto detectado');
    }

    if (index) {
      const normX = -((index.x / video.videoWidth) * 2 - 1);
      const normY = -(index.y / video.videoHeight) * 2 + 1;

      const vector = new THREE.Vector3(normX, normY, 0.5).unproject(camera);
      const dir = vector.sub(camera.position).normalize();
      const a = camera.position.clone().add(dir.multiplyScalar(5));

      indexFingerSphere.position.lerp(a, 0.4);
      flashLight.position.lerp(
        new THREE.Vector3(normX * 5, normY * 3, camera.position.z),
        0.1
      );

      aimDiv.style.left = `${screenX}px`;
      aimDiv.style.top = `${screenY}px`;
    }

    requestAnimationFrame(detectHands);
  }

  detectHands();
}

// === Init Everything ===
(async () => {
  initThree();
  animate();
  await setupVideo();
  await initFaceDetection();
  await initHandDetection();
})();
