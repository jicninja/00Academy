import * as THREE from 'three';

import { ShootScene } from './scenes/shootScene';

import { initializeTargets } from './components/targets';
import { initializeWalls } from './components/walls';
import { Flashlight } from './components/flashlight';
import { HandHelper } from './components/hand';

import { VideoDetector } from './detectors/video';
import { FaceDetector } from './detectors/faceDetector';
import {
  HandsDetector,
  type HandCallbackOptions,
} from './detectors/handsDetector';

const mainScene = new ShootScene();
const flashLight = new Flashlight();

const handObject = new HandHelper();

const videoController = new VideoDetector();
const faceController = new FaceDetector();
const handsController = new HandsDetector();

const { video } = videoController;
const { scene } = mainScene;

// Globals
const renderer = new THREE.WebGLRenderer({ antialias: true });
const cameraPos = new THREE.Vector3(0, 0, 5);

const camera = new THREE.PerspectiveCamera(
  0,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// === THREE.js Setup ===
const initializeThree = () => {
  // Camera Setup
  camera.position.copy(cameraPos);
  // Renderer
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  const targets = initializeTargets();
  const walls = initializeWalls();
  targets.forEach((target) => scene.add(target.mesh));
  walls.forEach((wall) => scene.add(wall.mesh));
  scene.add(handObject.meshGroup);
  scene.add(flashLight.light);
  scene.add(camera);

  window.addEventListener('resize', onWindowResize);
};

// === Animation Loop ===
const animate = () => {
  requestAnimationFrame(animate);

  flashLight.update();
  handObject.update();

  camera.position.lerp(cameraPos, 0.1);
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
};

const handleDetectHands = (handData: HandCallbackOptions) => {
  const { indexPos, wristPos, normalizedIndexPos, hand } = handData;

  handObject.update2DAim(wristPos, indexPos);
  handObject.update3DAim(hand);

  flashLight.setPosition(
    new THREE.Vector3(
      -normalizedIndexPos.x * 5,
      normalizedIndexPos.y * 3,
      camera.position.z
    )
  );
};

const handleDetectFace = (facePosition: THREE.Vector3) => {
  cameraPos.copy(facePosition);
};

// === Init Everything ===
const initialize = async () => {
  initializeThree();

  await handObject.initialize();
  await videoController.initialize();
  await faceController.initialize();
  await handsController.initialize();

  animate();

  mainScene.animateIntroCamera();

  handsController.detectHands({ video }, handleDetectHands);
  faceController.detectFaces({ video, camera }, handleDetectFace);
};

const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

initialize();
