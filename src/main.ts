import * as THREE from 'three';

import { ShootScene } from './scenes/shootScene';
import { DrivingScene } from './scenes/drivingScene';

import { bulletManager } from './components/bullet';
import { physicsWorld } from './physics/physics';

import { VideoDetector } from './detectors/video';
import { FaceDetector } from './detectors/faceDetector';
import {
  HandsDetector,
  type BothHandsCallbackOptions,
} from './detectors/handsDetector';

import { SceneTransition } from './core/sceneTransitions';
import { IntroScene } from './scenes/introScene';
import { renderer } from './core/renderer';
import { SceneSelector } from './ui/sceneSelector';

const shootScene = new ShootScene();
const drivingScene = new DrivingScene();
let currentScene: ShootScene | DrivingScene = shootScene;

const sceneSelector = new SceneSelector();

const videoController = new VideoDetector();
const faceController = new FaceDetector();
const handsController = new HandsDetector();
const sceneManager = new SceneTransition();

const { video } = videoController;

const isDebugging = true;

const intro = new IntroScene(renderer.getRenderer());

const cameraPos = new THREE.Vector3(0, 0, 5);

const handleDetectHands = (handsData: BothHandsCallbackOptions) => {
  if (currentScene === drivingScene) {
    drivingScene.handleBothHands(handsData);
  } else if (currentScene === shootScene) {
    if (handsData.leftHand) {
      shootScene.handleSingleHand({
        indexPos: handsData.leftHand.indexPos,
        normalizedIndexPos: handsData.leftHand.normalizedIndexPos,
        wristPos: handsData.leftHand.wristPos,
        hand: handsData.leftHand.hand
      });
    }
  }
};

const handleDetectFace = (facePosition: THREE.Vector3) => {
  cameraPos.copy(facePosition);
};

let lastTime = 0;

function animate(currentTime: number = 0) {
  const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
  lastTime = currentTime;
  
  if (!isDebugging) {
    intro.update();
  }

  currentScene.update(cameraPos);
  sceneManager.render(renderer.getRenderer());
  if (currentScene === shootScene) {
    shootScene.updateComponents(deltaTime);
  }
  if (physicsWorld.isInitialized()) {
    physicsWorld.update(deltaTime);
  }
  
  requestAnimationFrame(animate);
}
// Global cleanup manager
const cleanupFunctions: (() => void)[] = [];

const initialize = async () => {
  try {
    await physicsWorld.initialize();
  } catch (error) {
    console.error('Failed to initialize physics:', error);
  }
  
  sceneManager.setCurrentScene(isDebugging ? currentScene : intro);

  if (isDebugging) await shootScene.initializeComponents();
  sceneSelector.onSceneChangeCallback((sceneName) => {
    switchToScene(sceneName);
  });

  document.body.appendChild(renderer.getDomElement());
  window.addEventListener('resize', onWindowResize);
  cleanupFunctions.push(() => window.removeEventListener('resize', onWindowResize));
  
  window.addEventListener('keydown', handleKeyDown);
  cleanupFunctions.push(() => window.removeEventListener('keydown', handleKeyDown));

  try {
    await videoController.initialize();
    await faceController.initialize();
    await handsController.initialize();
  } catch (error) {
    console.error('Failed to initialize detectors:', error);
  }

  intro.onAnimationComplete(() => {
    sceneManager.fade(renderer.getRenderer(), intro, currentScene, async () => {
      await shootScene.initializeComponents();
    });
  });

  handsController.detectBothHands({ video }, handleDetectHands);
  faceController.detectFaces(
    { video, camera: shootScene.camera },
    handleDetectFace
  );

  animate();
};

const switchToScene = async (sceneName: 'shoot' | 'driving') => {
  const newScene = sceneName === 'shoot' ? shootScene : drivingScene;
  
  if (newScene === currentScene) return;
  
  currentScene = newScene;
  sceneManager.setCurrentScene(currentScene);
  
  if (sceneName === 'driving') {
    try {
      await drivingScene.initializeHandComponents();
    } catch (error) {
      console.error('Failed to initialize driving scene components:', error);
    }
  }
  
  handsController.detectBothHands({ video }, handleDetectHands);
  const sceneCamera = sceneName === 'shoot' ? shootScene.camera : drivingScene.camera;
  faceController.detectFaces({ video, camera: sceneCamera }, handleDetectFace);
  
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (currentScene === shootScene) {
    shootScene.handleKeyInput(event);
  }
};

const onWindowResize = () => {
  sceneManager.currentScene?.updateCamera();
  sceneManager.resize();
  renderer.resize();
};

const cleanup = () => {
  videoController.dispose();
  faceController.dispose();
  handsController.dispose();
  
  shootScene.dispose();
  drivingScene.dispose();
  intro.dispose();
  bulletManager.dispose();
  physicsWorld.dispose();
  sceneSelector.dispose();
  
  renderer.dispose();
  
  cleanupFunctions.forEach(fn => fn());
};

window.addEventListener('beforeunload', cleanup);
window.addEventListener('unload', cleanup);

initialize().catch(error => {
  console.error('Failed to initialize application:', error);
});
