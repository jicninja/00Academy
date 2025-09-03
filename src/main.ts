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
import { renderer } from './core/renderer';

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

const intro = new IntroScene(renderer.getRenderer());

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
  sceneManager.render(renderer.getRenderer());
  flashLight.update();
  handObject.update();
  requestAnimationFrame(animate);
}
// Global cleanup manager
const cleanupFunctions: (() => void)[] = [];

const initialize = async () => {

  sceneManager.setCurrentScene(isDebugging ? mainScene : intro);

  if (isDebugging) await handObject.initialize();

  mainScene.scene.add(flashLight.light);
  mainScene.scene.add(handObject.meshGroup);

  document.body.appendChild(renderer.getDomElement());
  window.addEventListener('resize', onWindowResize);
  cleanupFunctions.push(() => window.removeEventListener('resize', onWindowResize));

  try {
    await videoController.initialize();
    await faceController.initialize();
    await handsController.initialize();
  } catch (error) {
    console.error('Failed to initialize detectors:', error);
    // Continue running even if detectors fail
  }

  intro.onAnimationComplete(() => {
    sceneManager.fade(renderer.getRenderer(), intro, mainScene, async () => {
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
  renderer.resize();
};

// Cleanup function for when the page unloads
const cleanup = () => {
  console.log('Cleaning up resources...');
  
  // Dispose detectors
  videoController.dispose();
  faceController.dispose();
  handsController.dispose();
  
  // Dispose Three.js objects
  mainScene.dispose();
  intro.dispose();
  flashLight.dispose();
  handObject.dispose();
  
  // Dispose renderer
  renderer.dispose();
  
  // Run all cleanup functions
  cleanupFunctions.forEach(fn => fn());
};

// Handle page unload
window.addEventListener('beforeunload', cleanup);
window.addEventListener('unload', cleanup);

// Handle visibility change to pause/resume
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Pause detection when page is hidden
    console.log('Page hidden, pausing detectors');
  } else {
    // Resume when visible again
    console.log('Page visible, resuming detectors');
  }
});

initialize().catch(error => {
  console.error('Failed to initialize application:', error);
});
