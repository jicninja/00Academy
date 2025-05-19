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

const mainScene = new ShootScene();
const flashLight = new Flashlight();

const handObject = new HandHelper();

const videoController = new VideoDetector();
const faceController = new FaceDetector();
const handsController = new HandsDetector();
const sceneManager = new SceneTransition();

const { video } = videoController;

const isDebugging = false;

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
  if (!isDebugging) {
    intro.update();
  }

  mainScene.update(cameraPos);
  sceneManager.render(renderer);
  flashLight.update();
  handObject.update();
  requestAnimationFrame(animate);
}
const initialize = async () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  sceneManager.setCurrentScene(isDebugging ? mainScene : intro);

  if (isDebugging) await handObject.initialize();

  mainScene.scene.add(flashLight.light);
  mainScene.scene.add(handObject.meshGroup);

  document.body.appendChild(renderer.domElement);
  window.addEventListener('resize', onWindowResize);

  await videoController.initialize();
  await faceController.initialize();
  await handsController.initialize();

  intro.onAnimationComplete(() => {
    sceneManager.fade(renderer, intro, mainScene, async () => {
      await handObject.initialize();
    });
  });

  handsController.detectHands({ video }, handleDetectHands);
  faceController.detectFaces(
    { video, camera: mainScene.camera },
    handleDetectFace
  );

  animate();
};

const onWindowResize = () => {
  sceneManager.currentScene?.updateCamera();
  sceneManager.resize();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

initialize();
