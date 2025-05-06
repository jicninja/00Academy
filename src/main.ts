import * as THREE from 'three';

import { ShootScene } from './scenes/shootScene';

import { initializeTargets } from './components/targets';
import { initializeWalls } from './components/walls';
import { Flashlight } from './components/flashlight';

import { VideoDetector } from './detectors/video';
import { FaceDetector } from './detectors/faceDetector';
import { HandsDetector } from './detectors/handsDetector';

const mainScene = new ShootScene();
const flashLight = new Flashlight();

const videoController = new VideoDetector();
const faceController = new FaceDetector();
const handsController = new HandsDetector();

const { video } = videoController;
const { scene } = mainScene;

// Globals
let camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer;

let aimMesh: THREE.Mesh;
let indexFingerTip;

let cameraPos = new THREE.Vector3(0, 0, 5);

const aimDiv = document.getElementById('aim');
const aimDiv2 = document.getElementById('aim2');

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
  await handsController.init();

  handsController.detectHands(
    {
      video,
    },
    (handData) => {
      console.log('Hand Data:', handData);

      const { indexPos, wristPos, normalizedIndexPos } = handData;
      indexFingerTip = indexPos;

      aimMesh.position.set(
        indexFingerTip.x,
        indexFingerTip.y,
        indexFingerTip.z
      );

      if (aimDiv && aimDiv2) {
        aimDiv.style.left = `${wristPos.x}px`;
        aimDiv.style.top = `${wristPos.y}px`;

        aimDiv2.style.left = `${indexPos.x}px`;
        aimDiv2.style.top = `${indexPos.y}px`;
      }

      flashLight.setPosition(
        new THREE.Vector3(
          -normalizedIndexPos.x * 5,
          normalizedIndexPos.y * 3,
          camera.position.z
        )
      );
    }
  );

  faceController.detectFaces(
    {
      video,
      camera,
    },
    (facePosition) => {
      cameraPos = facePosition;
    }
  );

  mainScene.animateIntroCamera();
};

init();
