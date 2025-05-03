import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.153.0/build/three.module.js';

let camera, scene, renderer, directionalLight;
const cubes = [];

function createWall(geometry, material, rotation, position) {
  const wall = new THREE.Mesh(geometry, material);
  wall.rotation.set(rotation.x, rotation.y, rotation.z);
  wall.position.set(position.x, position.y, position.z);
  wall.receiveShadow = true;
  scene.add(wall);
  return wall;
}

function initThree() {
  // Scene and Camera
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 5;

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.1));

  directionalLight = new THREE.SpotLight(0xffffff, 1);
  directionalLight.angle = Math.PI / 3.2;
  directionalLight.penumbra = 0.2;
  directionalLight.distance = 1000;
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.set(1024, 1024);
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 1000;
  scene.add(directionalLight);

  // Ground and Walls
  const planeGeometry = new THREE.PlaneGeometry(100, 100);
  const texture = new THREE.TextureLoader().load(
    'https://threejs.org/examples/textures/checker.png'
  );
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(40, 40);

  const planeMaterial = new THREE.MeshStandardMaterial({ map: texture });

  createWall(
    planeGeometry,
    planeMaterial,
    new THREE.Euler(-Math.PI / 2, 0, 0),
    { x: 0, y: -2, z: 0 }
  ); // Floor
  createWall(planeGeometry, planeMaterial, new THREE.Euler(Math.PI / 2, 0, 0), {
    x: 0,
    y: 10,
    z: 0,
  }); // Roof
  createWall(planeGeometry, planeMaterial, new THREE.Euler(0, Math.PI / 2, 0), {
    x: -10,
    y: 4,
    z: 0,
  }); // Left Wall
  createWall(
    planeGeometry,
    planeMaterial,
    new THREE.Euler(0, -Math.PI / 2, 0),
    { x: 10, y: 4, z: 0 }
  ); // Right Wall
  createWall(planeGeometry, planeMaterial, new THREE.Euler(0, 0, 0), {
    x: 0,
    y: 4,
    z: -100,
  }); // Back Wall

  // Cubes
  const cubeGeo = new THREE.BoxGeometry();
  const cubeMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });

  const positions = [
    { x: -2, y: 0, z: 0 },
    { x: 2, y: 1, z: -1 },
    { x: 0, y: -1, z: 2 },
    { x: 1, y: 2, z: -2 },
    { x: -3, y: 0, z: -10 },
    { x: 3, y: 1, z: -20 },
    { x: 0, y: -2, z: -30 },
    { x: 2, y: 2, z: -40 },
    { x: -4, y: 1, z: -50 },
    { x: 4, y: -1, z: -60 },
    { x: -1, y: 3, z: -70 },
    { x: 1, y: -3, z: -80 },
    { x: -5, y: 0, z: -90 },
  ];

  positions.forEach((pos) => {
    const cube = new THREE.Mesh(cubeGeo, cubeMat);
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

  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

async function initFaceDetection() {
  const detector = await faceDetection.createDetector(
    faceDetection.SupportedModels.MediaPipeFaceDetector,
    {
      runtime: 'mediapipe',
      solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection',
    }
  );

  const video = document.createElement('video');
  video.setAttribute('autoplay', true);
  video.setAttribute('playsinline', true);
  video.style.display = 'none';
  document.body.appendChild(video);

  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;

  video.addEventListener('playing', () => {
    detectLoop(video, detector);
  });
}

async function detectLoop(video, detector) {
  const detectionRate = 0;

  while (true) {
    const faces = await detector.estimateFaces(video);

    if (faces.length > 0) {
      const { box } = faces[0];
      const boxWidth = box.xMax - box.xMin;
      const boxHeight = box.yMax - box.yMin;
      const faceSize = Math.max(boxWidth, boxHeight);

      const depth = THREE.MathUtils.clamp(10 - faceSize / 60, 2, 10);

      const centerX = box.xMin + boxWidth / 2;
      const centerY = box.yMin + boxHeight / 2;

      const normX = (centerX / video.videoWidth) * 2 - 1;
      const normY = -(centerY / video.videoHeight) * 2 + 1;

      const target = new THREE.Vector3(-normX * 5, normY * 3, depth);

      camera.position.lerp(target, 0.05);
      directionalLight.position.lerp(
        new THREE.Vector3(target.x, target.y + 0.5, target.z),
        0.05
      );
      camera.lookAt(0, 0, 0);
    }

    await new Promise((resolve) => setTimeout(resolve, detectionRate));
  }
}

// Initialize
initThree();
animate();
initFaceDetection();
