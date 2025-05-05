import * as THREE from 'three';
import * as faceDetection from '@tensorflow-models/face-detection';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';

// Globals
let camera, scene, renderer, flashLight, video;
let aimMesh;
let indexFingerTip;

let cameraPos = new THREE.Vector3(0, 0, 5);

const cubes = [];
const aimDiv = document.getElementById('aim');
const aimDiv2 = document.getElementById('aim2');

const defaultHand = [
  {
    x: 1.6427661699799072,
    y: -0.19020156944192756,
    z: -0.166473388671875,
    name: 'wrist',
  },
  {
    x: 1.2769354542342197,
    y: -0.056832973007334364,
    z: 0.019464492797851562,
    name: 'thumb_cmc',
  },
  {
    x: 0.9790010599044334,
    y: 0.0640668532808889,
    z: 0.06191253662109375,
    name: 'thumb_mcp',
  },
  {
    x: 0.6995394674685966,
    y: 0.22287843739591728,
    z: 0.1546478271484375,
    name: 'thumb_ip',
  },
  {
    x: 0.4942132008818161,
    y: 0.35976225500904213,
    z: 0.105438232421875,
    name: 'thumb_tip',
  },
  {
    x: 1.0322854144123566,
    y: 0.5787921323438753,
    z: -0.022125244140625,
    name: 'index_finger_mcp',
  },
  {
    x: 0.8652211946991455,
    y: 0.8155020325442423,
    z: 0.06641387939453125,
    name: 'index_finger_pip',
  },
  {
    x: 0.7593564165380966,
    y: 0.9811897388657201,
    z: 0.1454925537109375,
    name: 'index_finger_dip',
  },
  {
    x: 0.6847436947372925,
    y: 1.0891758835872283,
    z: 0.44097900390625,
    name: 'index_finger_tip',
  },
  {
    x: 1.2619141314734887,
    y: 0.6958332656880487,
    z: -0.05092620849609375,
    name: 'middle_finger_mcp',
  },
  {
    x: 1.1265928333250057,
    y: 1.0351704991420378,
    z: 0.07373809814453125,
    name: 'middle_finger_pip',
  },
  {
    x: 1.0836947185543548,
    y: 1.1879691294392218,
    z: 0.2935791015625,
    name: 'middle_finger_dip',
  },
  {
    x: 1.007411520704366,
    y: 1.3581665418108573,
    z: 0.5145263671875,
    name: 'middle_finger_tip',
  },
  {
    x: 1.4809902606156837,
    y: 0.7202776194547881,
    z: 0.003964900970458984,
    name: 'ring_finger_mcp',
  },
  {
    x: 1.4291265362498533,
    y: 0.9971688128074278,
    z: 0.1325225830078125,
    name: 'ring_finger_pip',
  },
  {
    x: 1.353815052434541,
    y: 1.1752258799036612,
    z: 0.31402587890625,
    name: 'ring_finger_dip',
  },
  {
    x: 1.2822640163448822,
    y: 1.342780273314344,
    z: 0.535888671875,
    name: 'ring_finger_tip',
  },
  {
    x: 1.6949337569621574,
    y: 0.627803308795916,
    z: 0.0618743896484375,
    name: 'pinky_finger_mcp',
  },
  {
    x: 1.763933695628978,
    y: 0.8358869700690378,
    z: 0.07541656494140625,
    name: 'pinky_finger_pip',
  },
  {
    x: 1.8207584542778503,
    y: 1.032779831345903,
    z: 0.15960693359375,
    name: 'pinky_finger_dip',
  },
  {
    x: 1.8166963977364075,
    y: 1.1729585564693084,
    z: 0.36590576171875,
    name: 'pinky_finger_tip',
  },
];

// === Utility Functions ===
const easeInOutQuad = (t) => {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
};

const createSmoother = (smoothing = 0.9) => {
  let previousValue = null;
  return (currentValue) => {
    if (previousValue === null) previousValue = currentValue;
    const smoothedValue =
      previousValue * smoothing + currentValue * (1 - smoothing);
    previousValue = smoothedValue;
    return smoothedValue;
  };
};

const createVector3Smoother = (smoothing = 0.9) => {
  const smoothX = createSmoother(smoothing);
  const smoothY = createSmoother(smoothing);
  const smoothZ = createSmoother(smoothing);
  return (currentVector) => {
    return new THREE.Vector3(
      smoothX(currentVector.x),
      smoothY(currentVector.y),
      smoothZ(currentVector.z)
    );
  };
};

const smoothWristPos = createVector3Smoother();
const smoothIndexPos = createVector3Smoother(0.8);

const createCubes = (positions, geometry, material) => {
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
};

// === THREE.js Setup ===
const initThree = () => {
  scene = new THREE.Scene();

  // Camera Setup
  camera = new THREE.PerspectiveCamera(
    0,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 5;

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Lighting
  scene.add(new THREE.AmbientLight(0x00ffff, 0.2));
  flashLight = new THREE.SpotLight(0xffffff, 200, 100, Math.PI / 3.2, 0.2);
  flashLight.position.set(-1.5, -0.5, 6);
  flashLight.castShadow = true;
  flashLight.shadow.mapSize.set(1024, 1024);
  scene.add(flashLight);

  // Finger Sphere
  aimMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.5, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xff0000 })
  );
  aimMesh.castShadow = true;
  scene.add(aimMesh);

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
};

const animateFOVTransition = (camera, startFOV, endFOV, duration) => {
  const startTime = performance.now();
  const animate = () => {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    camera.fov = startFOV + (endFOV - startFOV) * easeInOutQuad(progress);
    camera.updateProjectionMatrix();
    if (progress < 1) requestAnimationFrame(animate);
  };
  animate();
};

const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

const createWallMaterial = (texturePath) => {
  const texture = new THREE.TextureLoader().load(texturePath);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 5);
  return new THREE.MeshStandardMaterial({
    map: texture,
    emissiveMap: texture,
    emissive: new THREE.Color(0x00ff00),
    emissiveIntensity: 0.1,
  });
};

const createWall = (geometry, material, rotation, position) => {
  const wall = new THREE.Mesh(geometry, material);
  wall.rotation.copy(rotation);
  wall.position.copy(position);
  wall.receiveShadow = true;
  scene.add(wall);
};

const getStaticCubePositions = () => {
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
};

const getRandomCubePositions = (count) => {
  return Array.from(
    { length: count },
    () =>
      new THREE.Vector3(
        THREE.MathUtils.randFloat(-9.5, 9.5),
        THREE.MathUtils.randFloat(-0.5, 9.5),
        THREE.MathUtils.randFloat(-99.5, -0.5)
      )
  );
};

// === Animation Loop ===
const animate = () => {
  requestAnimationFrame(animate);

  camera.position.lerp(cameraPos, 0.1);
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
};

// === Video Setup ===
const setupVideo = async () => {
  video = Object.assign(document.createElement('video'), {
    autoplay: true,
    playsInline: true,
  });
  document.body.appendChild(video);
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  await video.play();
};

// === Face Detection ===
const initFaceDetection = async () => {
  const detector = await faceDetection.createDetector(
    faceDetection.SupportedModels.MediaPipeFaceDetector,
    {
      runtime: 'mediapipe',
      solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection',
      modelSelection: 1,
    }
  );

  const detectFaces = async () => {
    const faces = await detector.estimateFaces(video);
    const face = faces[0];
    if (face) {
      const { box } = face;

      const faceSize = Math.max(box.xMax - box.xMin, box.yMax - box.yMin);

      const depth = THREE.MathUtils.clamp(10 - faceSize / 50, 2, 20);

      const centerX = box.xMin + (box.xMax - box.xMin) / 2;
      const centerY = box.yMin + (box.yMax - box.yMin) / 2;

      const normX = (centerX / video.videoWidth) * 2 - 1;
      const normY = Math.max(-(centerY / video.videoHeight) * 2 + 1, -0.5);
      const targetZ = camera.position.z + (depth - camera.position.z) * 0.9;

      cameraPos.set(-normX * 5, normY * 3, targetZ);
    }
    requestAnimationFrame(detectFaces);
  };

  detectFaces();
};

// === Hand Detection ===
const initHandDetection = async () => {
  const detector = await handPoseDetection.createDetector(
    handPoseDetection.SupportedModels.MediaPipeHands,
    {
      runtime: 'mediapipe',
      solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
      modelSelection: 'lite',
    }
  );

  document.addEventListener('mousedown', () => {
    console.log('indexFingerTip', indexFingerTip);
  });

  const detectHands = async () => {
    const hands = await detector.estimateHands(video);

    const hand =
      hands.find((itemHand) => itemHand.handedness === 'Left') || hands[0];

    if (!hand || !hand.keypoints) {
      requestAnimationFrame(detectHands);
      return;
    }

    const wrist = hand.keypoints[0];

    const indexFinger = hand.keypoints[8];

    const rawScreenWrist = new THREE.Vector3(
      window.innerWidth * (1 - wrist.x / video.videoWidth),
      window.innerHeight * (wrist.y / video.videoHeight),
      0
    );

    const rawScreenIndexFinger = new THREE.Vector3(
      window.innerWidth * (1 - indexFinger.x / video.videoWidth),
      window.innerHeight * (indexFinger.y / video.videoHeight),
      0
    );

    const indexPos = smoothIndexPos(rawScreenIndexFinger);
    const wristPos = smoothWristPos(rawScreenWrist);

    aimDiv.style.left = `${wristPos.x}px`;
    aimDiv.style.top = `${wristPos.y}px`;

    aimDiv2.style.left = `${indexPos.x}px`;
    aimDiv2.style.top = `${indexPos.y}px`;

    const normX = -((indexFinger.x / video.videoWidth) * 2 - 1);
    const normY = -(indexFinger.y / video.videoHeight) * 2 + 1;

    const vector = new THREE.Vector3(normX, normY, 0.5).unproject(camera);
    const dir = vector.sub(camera.position).normalize();
    const a = camera.position.clone().add(dir.multiplyScalar(5));

    //aimMesh.position.lerp(a, 0.4);
    flashLight.position.lerp(
      new THREE.Vector3(normX * 5, normY * 3, camera.position.z),
      0.1
    );

    if (hand.keypoints3D && false) {
      scene.children = scene.children.filter(
        (child) => !(child.geometry instanceof THREE.SphereGeometry)
      );

      console.log('hand.keypoints3D', hand.keypoints3D);

      hand.keypoints3D.forEach((keypoint) => {
        const sphereGeometry = new THREE.SphereGeometry(0.1, 16, 16);
        const sphereMaterial = new THREE.MeshStandardMaterial({
          color: 0x00ff00,
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

        keypoint.x *= 10;
        keypoint.y *= 10;
        keypoint.z *= 10;

        keypoint.x = -keypoint.x;
        keypoint.y = -keypoint.y;
        keypoint.z = -keypoint.z;

        keypoint.x += wristPos.x * 0.001;
        keypoint.y += wristPos.y * 0.001;
        keypoint.z += wristPos.z * 0.001;
        sphere.position.set(keypoint.x, keypoint.y, keypoint.z);

        scene.add(sphere);
      });
    }

    requestAnimationFrame(detectHands);
  };

  detectHands();
};

// === Init Everything ===
const init = async () => {
  initThree();
  animate();

  await setupVideo();
  await initFaceDetection();
  await initHandDetection();

  animateFOVTransition(camera, 0, 55, 2000);
};

init();
