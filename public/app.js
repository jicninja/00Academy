import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.153.0/build/three.module.js';

let camera, scene, renderer, directionalLight;
let cubes = [];

function initThree() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 5;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
  scene.add(ambientLight);

  directionalLight = new THREE.SpotLight(0xffffff, 1);
  directionalLight.angle = Math.PI / 6;
  directionalLight.penumbra = 0.2;
  directionalLight.distance = 1000;
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 1000;
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  const planeGeometry = new THREE.PlaneGeometry(100, 100);
  const textureLoader = new THREE.TextureLoader();
  const checkerboardTexture = textureLoader.load(
    'https://threejs.org/examples/textures/checker.png'
  );
  checkerboardTexture.wrapS = THREE.RepeatWrapping;
  checkerboardTexture.wrapT = THREE.RepeatWrapping;
  checkerboardTexture.repeat.set(40, 40);

  const planeMaterial = new THREE.MeshStandardMaterial({
    map: checkerboardTexture,
  });

  const floor = new THREE.Mesh(planeGeometry, planeMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Add roof
  const roof = new THREE.Mesh(planeGeometry, planeMaterial);
  roof.rotation.x = Math.PI / 2; // Flip upside down
  roof.position.y = 10; // height above scene
  roof.receiveShadow = true;
  scene.add(roof);

  // Add left wall
  const leftWall = new THREE.Mesh(planeGeometry, planeMaterial);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.x = -10; // move left
  leftWall.position.y = 4; // lift up from floor
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  // Add right wall
  const rightWall = new THREE.Mesh(planeGeometry, planeMaterial);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.x = 10; // move right
  rightWall.position.y = 4; // lift up from floor
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  const backWall = new THREE.Mesh(planeGeometry, planeMaterial);
  backWall.position.z = -100; // move back
  backWall.position.y = 4; // lift up from floor
  backWall.receiveShadow = true;
  scene.add(backWall);

  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
  const positions = [
    { x: -2, y: 0, z: 0 },
    { x: 2, y: 1, z: -1 },
    { x: 0, y: -1, z: 2 },
    { x: 1, y: 2, z: -2 },
  ];

  positions.forEach((pos) => {
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(pos.x, pos.y, pos.z);
    cube.castShadow = true;
    cube.receiveShadow = true;
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
  document.body.appendChild(video);

  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;

  video.addEventListener('playing', () => {
    detectLoop(video, detector);
  });
}

async function detectLoop(video, detector) {
  const detectionRate = 0; // ms between detections

  while (true) {
    const faces = await detector.estimateFaces(video);

    if (faces.length > 0) {
      const face = faces[0];
      const box = face.box;

      const boxWidth = box.xMax - box.xMin;
      const boxHeight = box.yMax - box.yMin;
      const faceSize = Math.max(boxWidth, boxHeight);

      // Estimate Z by inversely scaling face size (closer face = larger box = smaller Z)
      const depth = THREE.MathUtils.clamp(10 - faceSize / 60, 2, 10); // tweak these numbers

      const faceCenterX = box.xMin + (box.xMax - box.xMin) / 2;
      const faceCenterY = box.yMin + (box.yMax - box.yMin) / 2;

      const normX = (faceCenterX / video.videoWidth) * 2 - 1;
      const normY = -(faceCenterY / video.videoHeight) * 2 + 1;

      const targetPosition = new THREE.Vector3(-normX * 5, normY * 3, depth);

      camera.position.lerp(targetPosition, 0.05);
      directionalLight.position.lerp(
        new THREE.Vector3(
          targetPosition.x,
          targetPosition.y + 0.5,
          targetPosition.z
        ),
        0.05
      );
      //directionalLight.target.position.set(0, 0, 0);
      camera.lookAt(0, 0, 0);
    }

    await new Promise((resolve) => setTimeout(resolve, detectionRate));
  }
}

// Run everything
initThree();
animate();
initFaceDetection();
