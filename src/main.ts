import * as THREE from 'three';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import { createVector3Smoother } from './utils/smoother';
import { initializeTargets } from './components/targets';
import { initializeWalls } from './components/walls';
import { ShootScene } from './scenes/shootScene';
import { VideoDetector } from './detectors/video';
import { FaceDetector } from './detectors/faceDetector';
import { Flashlight } from './components/flashlight';

const mainScene = new ShootScene();
const videoController = new VideoDetector();
const faceController = new FaceDetector();
const flashLight = new Flashlight();

const { video } = videoController;
const { scene } = mainScene;

// Globals
let camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer;

let aimMesh: THREE.Mesh;
let indexFingerTip;

let cameraPos = new THREE.Vector3(0, 0, 5);

const aimDiv = document.getElementById('aim');
const aimDiv2 = document.getElementById('aim2');

// === Utility Functions ===

const smoothWristPos = createVector3Smoother();
const smoothIndexPos = createVector3Smoother(0.8);

// === THREE.js Setup ===
const initThree = () => {
  // Camera Setup
  camera = new THREE.PerspectiveCamera(
    0,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  camera.position.z = 5;

  scene.add(flashLight.light);
  scene.add(camera);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Lighting

  // Finger Sphere
  aimMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.5, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xff0000 })
  );
  aimMesh.castShadow = true;
  scene.add(aimMesh);

  window.addEventListener('resize', onWindowResize);
};

const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

// === Animation Loop ===
const animate = () => {
  requestAnimationFrame(animate);

  flashLight.update();
  camera.position.lerp(cameraPos, 0.1);
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
};

// === Hand Detection ===
const initHandDetection = async () => {
  const detector = await handPoseDetection.createDetector(
    handPoseDetection.SupportedModels.MediaPipeHands,
    {
      runtime: 'mediapipe',
      solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
      modelType: 'lite',
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

    if (aimDiv && aimDiv2) {
      aimDiv.style.left = `${wristPos.x}px`;
      aimDiv.style.top = `${wristPos.y}px`;

      aimDiv2.style.left = `${indexPos.x}px`;
      aimDiv2.style.top = `${indexPos.y}px`;
    }

    const normX = -((indexFinger.x / video.videoWidth) * 2 - 1);
    const normY = -(indexFinger.y / video.videoHeight) * 2 + 1;

    //const vector = new THREE.Vector3(normX, normY, 0.5).unproject(camera);
    //const dir = vector.sub(camera.position).normalize();
    //const a = camera.position.clone().add(dir.multiplyScalar(5));

    //aimMesh.position.lerp(a, 0.4);
    flashLight.setPosition(
      new THREE.Vector3(normX * 5, normY * 3, camera.position.z)
    );

    if (hand.keypoints3D) {
      scene.children = scene.children.filter(
        (child) =>
          !(
            child instanceof THREE.Mesh &&
            child.geometry instanceof THREE.SphereGeometry
          )
      );

      console.log('hand.keypoints3D', hand.keypoints3D);

      hand.keypoints3D.forEach((keypoint) => {
        const sphereGeometry = new THREE.SphereGeometry(0.1, 16, 16);
        const sphereMaterial = new THREE.MeshStandardMaterial({
          color: 0x00ff00,
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

        const scale = 10;
        keypoint.x = -keypoint.x * scale + wristPos.x * 0.001;
        keypoint.y = -keypoint.y * scale - wristPos.y * 0.001;
        keypoint.z = (keypoint.z ?? 0) * scale + wristPos.z * 0.001;

        sphere.position.set(keypoint.x, keypoint.y, keypoint.z);
        sphere.position.set(keypoint.x, keypoint.y, keypoint.z ?? 0);

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

  const targets = initializeTargets();
  targets.forEach((target) => scene.add(target.mesh));

  const walls = initializeWalls();
  walls.forEach((wall) => scene.add(wall.mesh));

  animate();

  await videoController.initialize();
  await faceController.init();
  await initHandDetection();

  faceController.detectFaces(
    {
      video: videoController.video,
      camera: camera,
    },
    (facePosition) => {
      cameraPos = facePosition;
    }
  );

  mainScene.animateIntroCamera();
};

init();
