import * as THREE from 'three';

import { ShootScene } from './scenes/shootScene';

import { Flashlight } from './components/flashlight';
import { HandHelper } from './components/hand';

import { VideoDetector } from './detectors/video';
import { FaceDetector } from './detectors/faceDetector';
import {
  HandsDetector,
  type HandCallbackOptions,
} from './detectors/handsDetector';

import { SceneTransition } from './core/sceneTransitions';
import { IntroScene } from './scenes/introScene';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;

const mainScene = new ShootScene();
const flashLight = new Flashlight();

const handObject = new HandHelper();

const videoController = new VideoDetector();
const faceController = new FaceDetector();
const handsController = new HandsDetector();
const sceneManager = new SceneTransition();

const { video } = videoController;

// Globals

const intro = new IntroScene(renderer);

const cameraPos = new THREE.Vector3(0, 0, 5);

const handleDetectHands = (handData: HandCallbackOptions) => {
  const { indexPos, wristPos, normalizedIndexPos, hand } = handData;

  handObject.update2DAim(wristPos, indexPos);
  handObject.update3DAim(hand);

  flashLight.setPosition(
    new THREE.Vector3(
      -normalizedIndexPos.x * 5,
      normalizedIndexPos.y * 3,
      mainScene.camera.position.z
    )
  );
};

const handleDetectFace = (facePosition: THREE.Vector3) => {
  cameraPos.copy(facePosition);
};

function animate() {
  intro.update();
  mainScene.update(cameraPos);
  sceneManager.render(renderer);
  flashLight.update();
  handObject.update();
  requestAnimationFrame(animate);
}
const initialize = async () => {
  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.shadowMap.enabled = true;

  sceneManager.setCurrentScene(intro);

  mainScene.scene.add(flashLight.light);
  mainScene.scene.add(handObject.meshGroup);

  intro.onAnimationComplete(() => {
    console.log('entro aca');
    sceneManager.fade(renderer, intro, mainScene, () => {});
  });

  // Renderer
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  renderer.setClearColor(0x000000);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  document.body.appendChild(renderer.domElement);
  window.addEventListener('resize', onWindowResize);

  await handObject.initialize();
  await videoController.initialize();
  await faceController.initialize();
  await handsController.initialize();

  animate();

  handsController.detectHands({ video }, handleDetectHands);
  faceController.detectFaces(
    { video, camera: mainScene.camera },
    handleDetectFace
  );
};

const onWindowResize = () => {
  sceneManager.currentScene?.updateCamera();
  sceneManager.resize();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

initialize();
