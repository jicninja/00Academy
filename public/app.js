import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.153.0/build/three.module.js';

let camera, scene, renderer, flashLight, video;
let indexFingerSphere;
const aimDiv = document.getElementById('aim');

let indexFingerTip;

const cubes = [];

function createWall(geometry, material, rotation, position) {
  const wall = new THREE.Mesh(geometry, material);
  wall.rotation.copy(rotation);
  wall.position.set(position.x, position.y, position.z);
  wall.receiveShadow = true;
  scene.add(wall);
}

function createCubes(positions, geometry, material) {
  positions.forEach((pos) => {
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(pos.x, pos.y, pos.z);
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

function initThree() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 5;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.1));
  flashLight = new THREE.SpotLight(0xffffff, 1, 1000, Math.PI / 3.2, 0.2);
  flashLight.castShadow = true;
  flashLight.shadow.mapSize.set(1024, 1024);
  scene.add(flashLight);

  const sphereGeometry = new THREE.SphereGeometry(0.1, 16, 16);
  const sphereMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  indexFingerSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  indexFingerSphere.castShadow = true;
  scene.add(indexFingerSphere);

  const texture = new THREE.TextureLoader().load(
    'https://threejs.org/examples/textures/checker.png'
  );
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(40, 40);
  const wallMat = new THREE.MeshStandardMaterial({ map: texture });
  const wallGeo = new THREE.PlaneGeometry(100, 100);

  createWall(wallGeo, wallMat, new THREE.Euler(-Math.PI / 2, 0, 0), {
    x: 0,
    y: -2,
    z: 0,
  });
  createWall(wallGeo, wallMat, new THREE.Euler(Math.PI / 2, 0, 0), {
    x: 0,
    y: 10,
    z: 0,
  });
  createWall(wallGeo, wallMat, new THREE.Euler(0, Math.PI / 2, 0), {
    x: -10,
    y: 4,
    z: 0,
  });
  createWall(wallGeo, wallMat, new THREE.Euler(0, -Math.PI / 2, 0), {
    x: 10,
    y: 4,
    z: 0,
  });
  createWall(wallGeo, wallMat, new THREE.Euler(0, 0, 0), {
    x: 0,
    y: 4,
    z: -100,
  });

  const cubeGeo = new THREE.BoxGeometry();
  const cubeMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });

  createCubes(
    [
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
    ],
    cubeGeo,
    cubeMat
  );

  const randomPositions = Array.from({ length: 100 }, () => ({
    x: THREE.MathUtils.randFloat(-9.5, 9.5),
    y: THREE.MathUtils.randFloat(-0.5, 9.5),
    z: THREE.MathUtils.randFloat(-99.5, -0.5),
  }));
  createCubes(randomPositions, cubeGeo, cubeMat);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

async function setupVideo() {
  video = document.createElement('video');
  Object.assign(video, {
    autoplay: true,
    playsInline: true,
  });
  document.body.appendChild(video);
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  await video.play();
}

async function initHandDetection() {
  const detector = await handPoseDetection.createDetector(
    handPoseDetection.SupportedModels.MediaPipeHands,
    {
      runtime: 'mediapipe',
      solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands', // Correct URL for Hand Detection
      modelSelection: 1,
    }
  );

  document.addEventListener(
    'mousedown',
    () => {
      console.log('indexFingerTip', indexFingerTip);
    },
    false
  );

  async function detectHands() {
    const hands = await detector.estimateHands(video);
    const hand = hands[0];

    console.log('hand', hands);
    if (!hand || !hand.keypoints) {
      requestAnimationFrame(detectHands);
      return;
    }

    console.log('hand', hand);

    const wrist = hand.keypoints3D[0];
    const indexTip = hand.keypoints3D[8];

    // Calculate direction vector (wrist -> index tip)
    const dx = indexTip.x - wrist.x;
    const dy = indexTip.y - wrist.y;

    // Normalize the direction
    const norm = Math.sqrt(dx * dx + dy * dy);
    const vx = dx / norm;
    const vy = dy / norm;

    const aimLength = 0.4; // Fraction of width/height
    const aimX = wrist.x + vx * aimLength;
    const aimY = wrist.y + vy * aimLength;

    // Project the normalized coordinates to 2D (screen space)
    const vector = new THREE.Vector3(aimX * 2 - 1, -(aimY * 2 - 1), 0.5); // z=0.5 means mid-depth
    vector.unproject(camera);

    // Use the direction to get the screen position
    const dir = vector.sub(camera.position).normalize();
    const distance = 5; // Distance from the camera to the "aiming" point

    const aimPosition = camera.position
      .clone()
      .add(dir.multiplyScalar(distance));

    // Map the 3D position to the 2D screen coordinates
    const screenPosition = aimPosition.clone().project(camera);
    const screenX = ((screenPosition.x + 1) / 2) * window.innerWidth; // Normalize to screen width
    const screenY = (-(screenPosition.y - 1) / 2) * window.innerHeight; // Normalize to screen height

    // Constrain the reticle position to be within the screen bounds
    aimDiv.style.left = `${Math.min(
      Math.max(screenX, 0),
      window.innerWidth
    )}px`;
    aimDiv.style.top = `${Math.min(
      Math.max(screenY, 0),
      window.innerHeight
    )}px`;

    // Move reticle div

    console.log('screenX', screenX);

    aimDiv.style.left = `${screenX}px`;
    aimDiv.style.top = `${screenY}px`;

    const index = hand.keypoints[8];
    const thumb = hand.keypoints[4];

    indexFingerTip = index;

    if (index && thumb && !isNaN(index.x) && !isNaN(thumb.x)) {
      // Distancia 2D entre pulgar e índice
      const dx = index.x - thumb.x;
      const dy = index.y - thumb.y;
      const dz = (index.z || 0) - (thumb.z || 0); // por si está disponible
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance > 50) {
        // Ajusta este umbral según necesidad y precisión
        console.log('Pulgar lejos del índice: gesto detectado');
        // Aquí puedes activar alguna acción
      }
    }

    if (index && !isNaN(index.x)) {
      // update
      const normX = -((index.x / video.videoWidth) * 2 - 1);
      const normY = -(index.y / video.videoHeight) * 2 + 1;
      const handTarget = new THREE.Vector3(
        normX * 5,
        normY * 3,
        camera.position.z
      );

      // Project into 3D space relative to the camera
      const vector = new THREE.Vector3(normX, normY, 0.5); // z=0.5 means mid-depth
      vector.unproject(camera);

      // Optional: use ray from camera to project at specific depth
      const dir = vector.sub(camera.position).normalize();
      const distance = 5; // how far in front of the camera to place the sphere
      const a = camera.position.clone().add(dir.multiplyScalar(distance));

      indexFingerSphere.position.lerp(a, 0.4);
      flashLight.position.lerp(handTarget, 0.1);
    }
    requestAnimationFrame(detectHands);
  }

  detectHands();
}

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

(async () => {
  initThree();
  animate();
  await setupVideo();
  await initFaceDetection();
  await initHandDetection();
})();
