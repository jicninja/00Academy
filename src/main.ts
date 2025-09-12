import * as THREE from 'three';

import { ShootScene } from './scenes/shootScene';

import { Flashlight } from './components/flashlight';
import { HandHelper } from './components/hand';
import { bulletManager } from './components/bullet';
import { physicsWorld } from './physics/physics';

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

const isDebugging = true;

// Globals

const intro = new IntroScene(renderer.getRenderer());

const cameraPos = new THREE.Vector3(0, 0, 5);

// Store current hand positions for bullet spawning
let currentWristPos: THREE.Vector3 | null = null;
let currentIndexPos: THREE.Vector3 | null = null;
let currentHand: any = null;

const handleDetectHands = (handData: HandCallbackOptions) => {
  const { indexPos, wristPos, normalizedIndexPos, hand } = handData;

  handObject.update2DAim(wristPos, indexPos, mainScene.camera);
  handObject.update3DAim(hand);
  
  // Store positions for bullet spawning
  currentWristPos = wristPos.clone();
  currentIndexPos = indexPos.clone();
  currentHand = hand;

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

let lastTime = 0;

function animate(currentTime: number = 0) {
  const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
  lastTime = currentTime;
  
  if (!isDebugging) {
    intro.update();
  }

  mainScene.update(cameraPos);
  sceneManager.render(renderer.getRenderer());
  flashLight.update();
  handObject.update();
  bulletManager.update(deltaTime);
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
  
  // Set bullet manager scene
  bulletManager.setScene(mainScene.scene);

  sceneManager.setCurrentScene(isDebugging ? mainScene : intro);

  if (isDebugging) await handObject.initialize();

  mainScene.scene.add(flashLight.light);
  mainScene.scene.add(handObject.meshGroup);

  document.body.appendChild(renderer.getDomElement());
  window.addEventListener('resize', onWindowResize);
  cleanupFunctions.push(() => window.removeEventListener('resize', onWindowResize));
  
  // Add spacebar listener for shooting
  window.addEventListener('keydown', handleKeyDown);
  cleanupFunctions.push(() => window.removeEventListener('keydown', handleKeyDown));

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

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.code === 'Space' && currentWristPos && currentIndexPos && currentHand) {
    event.preventDefault();
    
    // Key hand points (for future use if needed)
    
    // Get spawn position from index finger tip of the meshGroup
    const spawnPosition = handObject.getIndexFingerWorldPosition();
    
    // Get shooting direction from index and thumb positions in meshGroup
    const shootDirection = handObject.getHandAimDirection();
    
    
    bulletManager.spawnBullet(spawnPosition, shootDirection, 30);
  }
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
  bulletManager.dispose();
  physicsWorld.dispose();
  
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
